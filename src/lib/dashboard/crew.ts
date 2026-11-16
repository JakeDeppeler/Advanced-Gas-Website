/**
 * Each tech's last sixty days, from the timesheets: what kind of work they did,
 * how long they were on the tools, how much of that will never be billed, how
 * long they spent driving, whether the jobs came in inside the time sold, and
 * how much work they found.
 *
 * The Daily pace page is one day and the crew's own page; this is the window
 * behind it, and it answers Jake's question (15 Nov) of "who is standing out vs
 * who is not" with the figures the data can actually carry.
 *
 * **Where it all comes from.** `st_jobs` holds no technician: ServiceTitan's
 * job export sends none. `st_timesheets` does — one row per technician per
 * appointment, with `dispatched_on`, `arrived_on` and `done_on` — so every
 * figure here is built from timesheet rows and joined out to the job.
 *
 * **Three of those four stamps are often defaults, and each one is handled.**
 * Over the last sixty days, of 715 rows: 158 have done stamped within a minute
 * of arrived, 289 have arrived stamped at the dispatch moment to the second,
 * and 576 have arrived stamped at the scheduled start or the dispatch moment.
 * So a row counts as a job attended always (dispatch is not in doubt), as time
 * on the tools only when the two stamps are a real span apart, and as a drive
 * only when dispatch and arrival are. **Lateness to a job is left out
 * entirely** — a default arrival makes every such visit exactly on time, and
 * the figure would be a measurement of who taps the app. See DASHBOARD.md.
 */

import { q, sbSelect } from "./db";
import { isoDateMelbourne, melbourneDayStart } from "./dates";
import { getSettings } from "@/lib/portal/db";
import { GST_RATE } from "./pace";
import { sectorOf, FOLLOW_DAYS } from "./sectors";
import {
  CREW_DAYS,
  DAY_END_HOUR,
  DAY_START_HOUR,
  LONGEST_DRIVE_HOURS,
  LONGEST_SPAN_HOURS,
  MIN_IDLE_DAYS,
  MIN_SPAN_HOURS,
  VAN_TECHS,
  VAN_TECHS_KEY,
  crewTeam,
  isVanTech,
  jobTypeKpis,
  normaliseVans,
  techKpi,
  type Crew,
  type CrewDay,
  type CrewSector,
  type CrewVisit,
  type TechKpi,
  type TypedJob,
} from "./crewTypes";

export * from "./crewTypes";

const DAY = 86_400_000;
const HOUR = 3_600_000;

type Sheet = {
  job_id: number | null;
  technician_id: number | null;
  dispatched_on: string | null;
  arrived_on: string | null;
  done_on: string | null;
};

type Job = {
  id: number;
  job_type: string | null;
  job_type_id: number | null;
  status: string | null;
  location_id: number | null;
  completed_on: string | null;
};

/** The hours between arriving and finishing, or null when the stamps aren't a measurement. */
function span(s: Sheet): number | null {
  if (!s.arrived_on || !s.done_on) return null;
  const h = (Date.parse(s.done_on) - Date.parse(s.arrived_on)) / HOUR;
  return h >= MIN_SPAN_HOURS && h <= LONGEST_SPAN_HOURS ? h : null;
}

/** Dispatch to arrival, or null when it wasn't recorded. */
function drive(s: Sheet): number | null {
  if (!s.arrived_on || !s.dispatched_on) return null;
  const h = (Date.parse(s.arrived_on) - Date.parse(s.dispatched_on)) / HOUR;
  // A minute is the floor: arrival stamped at the dispatch moment is the app
  // filling both in at once, not a trip that took no time.
  return h > 1 / 60 && h <= LONGEST_DRIVE_HOURS ? h : null;
}

const chunk = <T,>(list: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
};

/**
 * `from` is the start of the window. The board asks for two: the year, which is
 * the Crew page, and today, which is Daily pace — the same arithmetic over a
 * different slice, so the two pages cannot disagree about what a figure means.
 */
export async function computeCrew(
  now: Date = new Date(),
  from: Date = new Date(now.getTime() - CREW_DAYS * DAY),
): Promise<Crew | null> {
  const since = from;
  const sheets = await sbSelect<Sheet>(
    "st_timesheets",
    [
      q.select("job_id,technician_id,dispatched_on,arrived_on,done_on"),
      q.gte("arrived_on", since.toISOString()),
      q.isNull("canceled_on"),
      "limit=20000",
    ].join("&"),
  );
  const live = sheets.filter((s) => s.arrived_on && s.technician_id != null && s.job_id != null);
  if (live.length === 0) return null;

  const techIds = [...new Set(live.map((s) => Number(s.technician_id)))];
  const jobIds = [...new Set(live.map((s) => Number(s.job_id)))];

  const [names, jobRows, invoiceRows, booked, slots, vanSetting] = await Promise.all([
    sbSelect<{ id: number; name: string | null }>(
      "st_technicians",
      [q.select("id,name"), `id=in.(${techIds.join(",")})`].join("&"),
    ),
    Promise.all(
      chunk(jobIds, 200).map((ids) =>
        sbSelect<Job>(
          "st_jobs",
          [q.select("id,job_type,job_type_id,status,location_id,completed_on"), `id=in.(${ids.join(",")})`].join("&"),
        ),
      ),
    ).then((pages) => pages.flat()),
    Promise.all(
      chunk(jobIds, 200).map((ids) =>
        sbSelect<{ job_id: number | null; sold_hours: number | null; subtotal: number | null; total: number | null }>(
          "st_invoices",
          [q.select("job_id,sold_hours,subtotal,total"), `job_id=in.(${ids.join(",")})`].join("&"),
        ),
      ),
    ).then((pages) => pages.flat()),
    // Everything booked since the window opened, for the installs that followed
    // a visit. One read and filtered here, rather than a request per address.
    sbSelect<{ id: number; job_type: string | null; status: string | null; location_id: number | null; created_on: string | null }>(
      "st_jobs",
      [
        q.select("id,job_type,status,location_id,created_on"),
        q.gte("created_on", since.toISOString()),
        "limit=20000",
      ].join("&"),
    ),
    /*
     * How long each kind of job is booked for — the width of the block on the
     * dispatch board. ServiceTitan keeps it on the job type as `duration`, in
     * seconds, and sends nothing of it on the job itself, so it has to be
     * joined back through `job_type_id`. Small table, read whole.
     *
     * This is the half of "did it come in on time" that exists before the job
     * does. See the note on CrewVisit.allowed.
     */
    sbSelect<{ id: number; name: string | null; raw: { duration?: number | null } | null }>(
      "st_job_types",
      [q.select("id,name,raw"), "limit=1000"].join("&"),
    ).catch(() => []),
    getSettings<unknown>(VAN_TECHS_KEY).catch(() => null),
  ]);
  const vans = normaliseVans(vanSetting ?? VAN_TECHS);

  /** Job type id to the hours it is booked for. A zero duration is "not set". */
  const slotOf = new Map<number, number>();
  for (const t of slots) {
    const secs = Number(t.raw?.duration ?? 0);
    if (Number.isFinite(secs) && secs > 0) slotOf.set(Number(t.id), secs / 3600);
  }

  const techName = new Map(names.map((t) => [Number(t.id), t.name ?? null]));
  const job = new Map(jobRows.map((j) => [Number(j.id), j]));

  // Sold labour hours and the price before GST, the same way jobProfit reads
  // them: the subtotal when ServiceTitan sends one, else the total less GST.
  const invByJob = new Map<number, { sold: number; price: number }>();
  for (const i of invoiceRows) {
    if (i.job_id == null) continue;
    const k = Number(i.job_id);
    const got = invByJob.get(k) ?? { sold: 0, price: 0 };
    got.sold += Number(i.sold_hours ?? 0);
    got.price += i.subtotal != null ? Number(i.subtotal) : Number(i.total ?? 0) / (1 + GST_RATE);
    invByJob.set(k, got);
  }

  /*
   * The job's time on site: first arrival to last done, over the rows that
   * recorded a real span. Not the sum of the crew's hours — a service call is
   * sold at an hour and an install at three whether one man goes or two, so
   * man-hours against sold hours reads every two-man job as twice over. See
   * the note on CrewVisit.
   */
  const jobSpans = new Map<number, { first: number; last: number }>();
  for (const s of live) {
    if (span(s) == null) continue;
    const k = Number(s.job_id);
    const a = Date.parse(s.arrived_on as string);
    const b = Date.parse(s.done_on as string);
    const got = jobSpans.get(k);
    if (!got) jobSpans.set(k, { first: a, last: b });
    else {
      got.first = Math.min(got.first, a);
      got.last = Math.max(got.last, b);
    }
  }
  const elapsedOf = (jobId: number): number | null => {
    const got = jobSpans.get(jobId);
    if (!got) return null;
    const h = (got.last - got.first) / HOUR;
    return h >= MIN_SPAN_HOURS && h <= LONGEST_SPAN_HOURS ? h : null;
  };

  // Quotes written on a visit's own job, for the work-found column.
  const visitJobIds = jobIds.filter((id) => {
    const j = job.get(id);
    const s = j ? sectorOf(j.job_type) : null;
    return j?.status === "Completed" && (s === "maintenance" || s === "breakdown");
  });
  const quotedJobs = new Set<number>();
  for (const ids of chunk(visitJobIds, 150)) {
    const ests = await sbSelect<{ job_id: number | null }>(
      "st_estimates",
      [q.select("job_id"), `job_id=in.(${ids.join(",")})`].join("&"),
    ).catch(() => []);
    for (const e of ests) if (e.job_id != null) quotedJobs.add(Number(e.job_id));
  }

  // Installs booked at each address, for the same credit rule the Sectors page
  // uses: an install at the address inside the follow-on window after the visit.
  const installsAt = new Map<number, number[]>();
  for (const b of booked) {
    if (b.location_id == null || !b.created_on || b.status === "Canceled") continue;
    if (sectorOf(b.job_type) !== "install") continue;
    const k = Number(b.location_id);
    installsAt.set(k, [...(installsAt.get(k) ?? []), Date.parse(b.created_on)]);
  }
  const ledInstall = (j: Job): boolean => {
    if (j.location_id == null || !j.completed_on) return false;
    const done = Date.parse(j.completed_on);
    // A day's grace: the install is often booked the morning the tech rings it in.
    return (installsAt.get(Number(j.location_id)) ?? []).some(
      (at) => at >= done - DAY && at <= done + FOLLOW_DAYS * DAY,
    );
  };

  /*
   * One row per technician per appointment, so a tech who left a job and came
   * back has two. The hours and the trips add up; the job counts must not, or a
   * return visit reads as two jobs on the list.
   */
  const byTech = new Map<number, Map<number, CrewVisit>>();
  for (const s of live) {
    const t = Number(s.technician_id);
    const jid = Number(s.job_id);
    const j = job.get(jid);
    const h = span(s);
    const d = drive(s);

    const seen = byTech.get(t) ?? new Map<number, CrewVisit>();
    const had = seen.get(jid);
    if (had) {
      if (h != null) had.hours = (had.hours ?? 0) + h;
      // A second trip to the same job adds its drive to the job's; the job is
      // still one job, because the figure on the wall is per job, not per trip.
      if (d != null) {
        had.drive.hours += d;
        had.drive.recorded = true;
      }
      byTech.set(t, seen);
      continue;
    }

    const inv = invByJob.get(jid);
    const price = j?.status === "Completed" ? inv?.price ?? 0 : 0;
    const sector: CrewSector = (j ? sectorOf(j.job_type) : null) ?? "other";
    const canFind = j?.status === "Completed" && (sector === "maintenance" || sector === "breakdown");

    seen.set(jid, {
      jobId: jid,
      sector,
      hours: h,
      elapsed: elapsedOf(jid),
      sold: inv && inv.sold > 0 ? inv.sold : null,
      allowed: j?.job_type_id != null ? slotOf.get(Number(j.job_type_id)) ?? null : null,
      billed: price,
      share: 0, // filled in below, once every tech on the job is known
      canFind,
      quoted: canFind && quotedJobs.has(jid),
      ledInstall: canFind && !!j && ledInstall(j),
      drive: { hours: d ?? 0, recorded: d != null },
    });
    byTech.set(t, seen);
  }

  /*
   * Each job's money split between the **vans** on it, by their share of the
   * hours clocked, so a two-van install is not counted twice over and the
   * shares still add to the job. A passenger's hours do not take a cut: Ray
   * rode there in Jackson's van, so the job is that van's money. Where no van's
   * stamps gave a span it is split by heads, because crediting it to nobody
   * would quietly lose it out of the column.
   */
  const vanOn = new Map<number, { total: number; heads: number }>();
  for (const [id, visits] of byTech) {
    if (!isVanTech(techName.get(id) ?? "", vans)) continue;
    for (const [jid, v] of visits) {
      const got = vanOn.get(jid) ?? { total: 0, heads: 0 };
      got.total += v.hours ?? 0;
      got.heads += 1;
      vanOn.set(jid, got);
    }
  }
  for (const [id, visits] of byTech) {
    const van = isVanTech(techName.get(id) ?? "", vans);
    for (const [jid, v] of visits) {
      const got = van ? vanOn.get(jid) : null;
      v.share = got ? (got.total > 0 ? (v.hours ?? 0) / got.total : 1 / Math.max(1, got.heads)) : 0;
    }
  }

  /*
   * The days each tech worked, and what they spent inside the paid day.
   *
   * Jake's definition (15 Nov): non-billable is any time between 7:00 and 15:30
   * not on a job and not driving to one. So each timesheet row contributes the
   * interval from dispatch — when they set off — to done, those intervals are
   * unioned per day so two overlapping jobs are not counted twice, and the
   * union is clipped to the window: a job that ran to six o'clock fills the
   * rest of the day and no more, and one that started at six in the morning
   * counts from seven.
   *
   * Only days they clocked something are counted, so a day off is not eight and
   * a half hours of idleness. A visit with no finish stamped contributes its
   * drive and nothing after, which overstates the idle time — the page says how
   * many visits that is, in the column beside it.
   */
  type DayWork = { spans: Array<[number, number]>; full: boolean };
  const daysByTech = new Map<number, Map<string, DayWork>>();
  for (const s of live) {
    const t = Number(s.technician_id);
    const arrived = Date.parse(s.arrived_on as string);
    const from = s.dispatched_on ? Math.min(Date.parse(s.dispatched_on), arrived) : arrived;
    const to = s.done_on ? Date.parse(s.done_on) : arrived;
    const day = isoDateMelbourne(new Date(arrived));
    const start = melbourneDayStart(day).getTime();
    const open = start + DAY_START_HOUR * HOUR;
    const close = start + DAY_END_HOUR * HOUR;

    const have = daysByTech.get(t) ?? new Map<string, DayWork>();
    const got = have.get(day) ?? { spans: [], full: true };
    // A day can only answer "what was the rest of it" if every job on it was
    // stamped both ways. See MIN_IDLE_DAYS.
    if (span(s) == null || drive(s) == null) got.full = false;
    const lo = Math.max(from, open);
    const hi = Math.min(to, close);
    if (to >= from && hi > lo) got.spans.push([lo, hi]);
    have.set(day, got);
    daysByTech.set(t, have);
  }
  const crewDays = (id: number): CrewDay[] =>
    [...(daysByTech.get(id) ?? new Map<string, DayWork>()).entries()].map(([day, { spans, full }]) => {
      if (spans.length === 0) return { day, busy: 0, full };
      const sorted = [...spans].sort((a, b) => a[0] - b[0]);
      let busy = 0;
      let [s0, e0] = sorted[0];
      for (const [s1, e1] of sorted.slice(1)) {
        if (s1 <= e0) e0 = Math.max(e0, e1);
        else {
          busy += e0 - s0;
          [s0, e0] = [s1, e1];
        }
      }
      busy += e0 - s0;
      return { day, busy: busy / HOUR, full };
    });

  // Over a single day the five-day floor would blank the figure every time, so
  // the day page asks for one. Over the year it asks for five.
  const minDays = now.getTime() - since.getTime() <= 2 * DAY ? 1 : MIN_IDLE_DAYS;
  const all: TechKpi[] = [...byTech.entries()].map(([id, visits]) =>
    techKpi(techName.get(id) ?? "Unknown", [...visits.values()], crewDays(id), minDays),
  );
  /*
   * Most jobs first, and no rank number.
   *
   * The page is read across a room by the people on it. Ordering it by any one
   * of its own columns makes that column the score and the rest decoration —
   * and the columns measure different things on purpose. Volume is the one
   * ordering nobody reads as a judgement.
   */
  const techs = all.filter((t) => isVanTech(t.tech, vans)).sort((a, b) => b.jobs - a.jobs || b.hours - a.hours);
  const passengers = all.filter((t) => !isVanTech(t.tech, vans)).map((t) => t.tech);

  /*
   * The same jobs again, grouped by what kind of job they were rather than who
   * went — the Job types page (Jake, 16 Nov).
   *
   * Counted over every job somebody was sent to, vans and passengers alike:
   * this page is about the work, not about who did it, and dropping a job
   * because only a passenger was timesheeted on it would quietly shrink a job
   * type. One row per job, so a return visit does not count the type twice, and
   * the money is the job's whole price rather than anybody's share of it.
   */
  const typed = new Map<number, TypedJob>();
  for (const visits of byTech.values()) {
    for (const [jid, v] of visits) {
      if (typed.has(jid)) continue;
      const name = job.get(jid)?.job_type?.trim();
      if (!name) continue;
      typed.set(jid, {
        jobId: jid,
        type: name,
        sector: v.sector,
        allowed: v.allowed,
        elapsed: v.elapsed,
        billed: v.billed,
      });
    }
  }

  return {
    from: isoDateMelbourne(since),
    to: isoDateMelbourne(now),
    days: Math.max(1, Math.round((now.getTime() - since.getTime()) / DAY)),
    followDays: FOLLOW_DAYS,
    techs,
    passengers,
    team: crewTeam(techs),
    jobTypes: jobTypeKpis([...typed.values()]),
  };
}
