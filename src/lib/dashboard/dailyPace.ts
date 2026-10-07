/**
 * Each tech's day on the tools: time against what the job was quoted to take,
 * how much of the list is done, and how much of it is billed.
 *
 * The board's other pages count money and jobs across weeks and months. This
 * one is the day, per person, and it is the only page the crew themselves are
 * the subject of — which is the reason for the care below about what it will
 * and will not claim.
 *
 * **Where the time comes from.** `st_jobs` carries no technician and no
 * appointment: ServiceTitan's job export sends neither. `st_timesheets` does —
 * one row per technician per appointment, with `arrived_on` and `done_on` — so
 * every figure here is built from timesheets and joined out to the job.
 *
 * **Where the quoted time comes from, and why it is often missing.** A job's
 * quoted hours come from the labour lines on its invoice (`sold_hours`), and
 * most service work is billed without one: over thirty days, only 76 of 268
 * timesheet spans had quoted hours at all. A gauge that blanked for three
 * techs in five would be worse than no gauge, so a second source sits behind
 * it — a standard time per job type, set in the portal. A job with neither
 * shows its hours taken and says plainly that nothing was quoted, rather than
 * being scored against a zero.
 */

import { q, sbSelect } from "./db";
import { startOfDayMelbourne } from "./dates";
import { getSettings } from "@/lib/portal/db";
import {
  STANDARD_HOURS_KEY,
  normaliseStandardHours,
  techDay,
  type DailyPace,
  type PaceJob,
  type StandardHours,
  type TechDay,
} from "./dailyPaceTypes";

export * from "./dailyPaceTypes";

type Sheet = {
  technician_id: number | null;
  job_id: number | null;
  arrived_on: string | null;
  done_on: string | null;
  canceled_on: string | null;
};

const hoursBetween = (from: string, to: Date) =>
  Math.max(0, (to.getTime() - Date.parse(from)) / 3_600_000);


/**
 * Build the day. Returns null when nothing has been clocked yet, which the
 * board shows as an empty page rather than five cards of zeroes.
 */
export async function dailyPace(now: Date = new Date()): Promise<DailyPace | null> {
  const from = startOfDayMelbourne(now).toISOString();

  const sheets = await sbSelect<Sheet>(
    "st_timesheets",
    [q.select("technician_id,job_id,arrived_on,done_on,canceled_on"), q.gte("arrived_on", from), q.isNull("canceled_on")].join("&"),
  ).catch(() => []);

  const live = sheets.filter((s) => s.arrived_on && s.technician_id != null && s.job_id != null);
  if (live.length === 0) return null;

  const techIds = [...new Set(live.map((s) => Number(s.technician_id)))];
  const jobIds = [...new Set(live.map((s) => Number(s.job_id)))];

  const [techs, jobs, invoices, standardRaw] = await Promise.all([
    sbSelect<{ id: number; name: string | null }>(
      "st_technicians",
      [q.select("id,name"), `id=in.(${techIds.join(",")})`].join("&"),
    ).catch(() => []),
    sbSelect<{ id: number; job_type: string | null; suburb: string | null; customer_name: string | null; status: string | null }>(
      "st_jobs",
      [q.select("id,job_type,suburb,customer_name,status"), `id=in.(${jobIds.join(",")})`].join("&"),
    ).catch(() => []),
    sbSelect<{ job_id: number | null; sold_hours: number | null; total: number | null }>(
      "st_invoices_billed",
      [q.select("job_id,sold_hours,total"), `job_id=in.(${jobIds.join(",")})`].join("&"),
    ).catch(() => []),
    getSettings<unknown>(STANDARD_HOURS_KEY).catch(() => null),
  ]);

  const standard = normaliseStandardHours(standardRaw);
  const techName = new Map(techs.map((t) => [Number(t.id), t.name ?? null]));
  const job = new Map(jobs.map((j) => [Number(j.id), j]));

  const invByJob = new Map<number, { soldHours: number; total: number }>();
  for (const i of invoices) {
    if (i.job_id == null) continue;
    const k = Number(i.job_id);
    const got = invByJob.get(k) ?? { soldHours: 0, total: 0 };
    got.soldHours += Number(i.sold_hours ?? 0);
    got.total += Number(i.total ?? 0);
    invByJob.set(k, got);
  }

  /*
   * One row per technician per appointment, so a tech who left a job and came
   * back has two. The hours add up; the job counts must not, or a return visit
   * would read as two jobs on the list.
   */
  const byTech = new Map<number, Map<number, PaceJob>>();
  for (const s of live) {
    const t = Number(s.technician_id);
    const jid = Number(s.job_id);
    const j = job.get(jid);
    const inv = invByJob.get(jid);
    const soldHours = inv && inv.soldHours > 0 ? inv.soldHours : null;
    const std = j?.job_type ? standard[j.job_type] ?? null : null;
    const onNow = !s.done_on;
    const taken = hoursBetween(s.arrived_on as string, s.done_on ? new Date(s.done_on) : now);

    const seen = byTech.get(t) ?? new Map<number, PaceJob>();
    const had = seen.get(jid);
    if (had) {
      had.taken += taken;
      had.onNow = had.onNow || onNow;
      had.done = had.done && !onNow;
    } else {
      seen.set(jid, {
        jobId: jid,
        what: j?.job_type ?? "Job",
        where: j?.suburb ?? null,
        taken,
        quoted: soldHours ?? std,
        quotedFrom: soldHours != null ? "invoice" : std != null ? "standard" : null,
        // Done means this visit finished, not that ServiceTitan has closed the
        // job: the board is read at 5pm, and a job finished at 4 is done for
        // the day whatever its status says in the morning.
        done: !onNow,
        billed: inv?.total ?? 0,
        onNow,
      });
    }
    byTech.set(t, seen);
  }

  const techDays: TechDay[] = [...byTech.entries()].map(([id, m]) => techDay(techName.get(id) ?? "Unknown", [...m.values()]));

  /*
   * Worst first.
   *
   * The point of the page is the person who needs a hand, not a leaderboard —
   * so the card the room should look at is the leftmost one. A tech with no
   * quoted time anywhere sorts last rather than first: no score is not a bad
   * score, and putting them at the front would read as the opposite.
   */
  const score = (t: TechDay) =>
    t.hoursQuoted == null || t.hoursTakenQuoted <= 0
      ? Number.POSITIVE_INFINITY
      : t.hoursQuoted / t.hoursTakenQuoted;
  techDays.sort((a, b) => score(a) - score(b) || b.hoursTaken - a.hoursTaken);

  const all = techDays.flatMap((t) => t.jobs);
  const quotedAll = all.filter((x) => x.quoted != null);
  const doneAll = all.filter((x) => x.done);

  return {
    day: startOfDayMelbourne(now).toISOString().slice(0, 10),
    techs: techDays,
    team: {
      hoursTaken: all.reduce((a, x) => a + x.taken, 0),
      hoursQuoted: quotedAll.length ? quotedAll.reduce((a, x) => a + (x.quoted as number), 0) : null,
      hoursTakenQuoted: quotedAll.reduce((a, x) => a + x.taken, 0),
      jobsDone: doneAll.length,
      jobsTotal: all.length,
      billedCount: doneAll.filter((x) => x.billed > 0).length,
      billableCount: doneAll.length,
      billedValue: all.reduce((a, x) => a + x.billed, 0),
      toBillValue: 0,
      toBillCount: doneAll.filter((x) => x.billed <= 0).length,
      quotedCover: { with: quotedAll.length, of: all.length },
    },
  };
}
