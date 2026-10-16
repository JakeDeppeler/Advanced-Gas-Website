import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { getSettings } from "@/lib/portal/db";
import { jobClass } from "@/lib/dashboard/pace";
import { STANDARD_HOURS_KEY, normaliseStandardHours } from "@/lib/dashboard/dailyPaceTypes";

/**
 * Each person's day over a stretch: of the hours they were paid for, how many
 * they spent on site, and how many hours of billed work came out of it.
 *
 * "Billed work" is the time the finished, invoiced jobs were sold for — the
 * labour on the invoice, or on the sold estimate behind an install, or the
 * standard time for that kind of job set on Daily pace. Seven hours of sold
 * work done in five on site reads as 140%; three hours of it across an
 * eight-hour day reads as three.
 *
 * Two things it is careful about:
 *
 *  - A job's sold time is the crew's time. Five hours sold for a tech and an
 *    apprentice is five hours for each of them, the way the $300 crew rate
 *    prices it, so each person on the job is credited the five. Splitting it
 *    would make every two-man job look half as productive as it was.
 *  - Most service work is invoiced with no labour hours at all, and the median
 *    of past jobs isn't used to fill the gap: measuring people against their
 *    own average says nothing. Time on jobs with no sold time is counted as
 *    time on site and kept apart, and the share that could be measured is
 *    shown beside every figure.
 */

export type PersonDays = {
  tech: string;
  days: number;
  /** Paid hours, at a full day for each day they clocked on. */
  paidHrs: number;
  onSite: number;
  /** Sold hours on their finished, billed jobs. */
  workHrs: number;
  /** Their hours on site on those same jobs: the other half of the speed. */
  onSiteTimed: number;
  /** Hours on site on billed jobs that carry no sold time — can't be scored. */
  onSiteUntimed: number;
  /** Hours on jobs not finished and billed yet. */
  onSiteOpen: number;
  /** Billed ex GST, split between the people on each job by their time there. */
  billed: number;
  jobs: number;
  jobsBilled: number;
};

type Sheet = { technician_id: number | null; job_id: number | null; arrived_on: string | null; done_on: string | null };

const H = 3_600_000;
// A span left open overnight isn't a fourteen-hour day; cap it like Daily pace's typical times.
const MAX_SPAN = 12 * H;
const melDay = (iso: string) => new Date(Date.parse(iso) + 10 * H).toISOString().slice(0, 10);

/** Spans merged so two timesheets overlapping on one job aren't counted twice. */
function merged(spans: Array<[number, number]>): number {
  if (!spans.length) return 0;
  const s = [...spans].sort((a, b) => a[0] - b[0]);
  let total = 0, [a0, b0] = s[0];
  for (const [a1, b1] of s.slice(1)) {
    if (a1 <= b0) b0 = Math.max(b0, b1);
    else { total += b0 - a0; [a0, b0] = [a1, b1]; }
  }
  return (total + b0 - a0) / H;
}

export async function personDays(days: number, dayHrs: number, now = new Date()): Promise<PersonDays[]> {
  const from = new Date(now.getTime() - days * 86_400_000).toISOString();
  const sheets = await sbSelect<Sheet>("st_timesheets", [
    q.select("technician_id,job_id,arrived_on,done_on"), q.gte("arrived_on", from), q.isNull("canceled_on"), "limit=20000",
  ].join("&"));
  const live = sheets.filter((s) => s.technician_id != null && s.job_id != null && s.arrived_on && s.done_on);
  if (!live.length) return [];

  const techIds = [...new Set(live.map((s) => Number(s.technician_id)))];
  const jobIds = [...new Set(live.map((s) => Number(s.job_id)))];

  type Job = { id: number; job_type: string | null; status: string | null; project_id: string | null };
  const jobs = new Map<number, Job>();
  const inv = new Map<number, { hrs: number; sub: number }>();
  for (let i = 0; i < jobIds.length; i += 200) {
    const ids = jobIds.slice(i, i + 200).join(",");
    const [js, is] = await Promise.all([
      sbSelect<Job>("st_jobs", [q.select("id,job_type,status,project_id:raw->>projectId"), `id=in.(${ids})`].join("&")),
      sbSelect<{ job_id: number | null; sold_hours: number | null; subtotal: number | null }>("st_invoices", [q.select("job_id,sold_hours,subtotal"), `job_id=in.(${ids})`].join("&")),
    ]);
    for (const j of js) jobs.set(Number(j.id), j);
    for (const r of is) {
      if (r.job_id == null) continue;
      const got = inv.get(Number(r.job_id)) ?? { hrs: 0, sub: 0 };
      got.hrs += Number(r.sold_hours ?? 0);
      got.sub += Number(r.subtotal ?? 0);
      inv.set(Number(r.job_id), got);
    }
  }
  const [techs, standardRaw, estHours] = await Promise.all([
    sbSelect<{ id: number; name: string | null }>("st_technicians", [q.select("id,name"), `id=in.(${techIds.join(",")})`].join("&")).catch(() => []),
    getSettings<unknown>(STANDARD_HOURS_KEY).catch(() => null),
    soldEstimateHours([...jobs.values()].map((j) => j.project_id).filter((v): v is string => !!v)).catch(() => new Map<string, number>()),
  ]);
  const standard = normaliseStandardHours(standardRaw);
  const name = new Map(techs.map((t) => [Number(t.id), t.name ?? "Unknown"]));

  const billedJob = (id: number) => jobs.get(id)?.status === "Completed" && (inv.get(id)?.sub ?? 0) > 0.5;
  const soldTime = (id: number): number | null => {
    const j = jobs.get(id);
    const i = inv.get(id);
    if (i && i.hrs > 0) return i.hrs;
    const est = j?.project_id && jobClass(j.job_type) !== "quote" ? estHours.get(j.project_id) : undefined;
    if (est && est > 0) return est;
    return j?.job_type ? standard[j.job_type] ?? null : null;
  };

  // person → job → spans, and person → days on.
  const spans = new Map<number, Map<number, Array<[number, number]>>>();
  const dayset = new Map<number, Set<string>>();
  for (const s of live) {
    const t = Number(s.technician_id), j = Number(s.job_id);
    const a = Date.parse(s.arrived_on!), b = Math.min(Date.parse(s.done_on!), a + MAX_SPAN);
    if (!(b > a)) continue;
    const m = spans.get(t) ?? new Map<number, Array<[number, number]>>();
    m.set(j, [...(m.get(j) ?? []), [a, b]]);
    spans.set(t, m);
    dayset.set(t, (dayset.get(t) ?? new Set()).add(melDay(s.arrived_on!)));
  }
  // Each job's total time on site, everyone together, to split what it billed.
  const jobTime = new Map<number, number>();
  for (const m of spans.values()) for (const [j, list] of m) jobTime.set(j, (jobTime.get(j) ?? 0) + merged(list));

  const out: PersonDays[] = [];
  for (const [t, m] of spans) {
    const p: PersonDays = {
      tech: name.get(t) ?? "Unknown", days: dayset.get(t)?.size ?? 0, paidHrs: 0, onSite: 0,
      workHrs: 0, onSiteTimed: 0, onSiteUntimed: 0, onSiteOpen: 0, billed: 0, jobs: m.size, jobsBilled: 0,
    };
    p.paidHrs = p.days * dayHrs;
    for (const [j, list] of m) {
      const hrs = merged(list);
      p.onSite += hrs;
      if (!billedJob(j)) { p.onSiteOpen += hrs; continue; }
      p.jobsBilled += 1;
      const all = jobTime.get(j) ?? hrs;
      p.billed += all > 0 ? (inv.get(j)!.sub * hrs) / all : 0;
      const sold = soldTime(j);
      if (sold != null) { p.workHrs += sold; p.onSiteTimed += hrs; } else p.onSiteUntimed += hrs;
    }
    out.push(p);
  }
  return out.filter((p) => p.onSite >= 1).sort((a, b) => b.onSite - a.onSite);
}

/** Labour hours on the sold estimates in each project, as Daily pace reads them. */
async function soldEstimateHours(projects: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const uniq = [...new Set(projects)];
  if (!uniq.length) return out;
  const projectOf = new Map<number, string>();
  for (let i = 0; i < uniq.length; i += 200) {
    const sib = await sbSelect<{ id: number; project_id: string | null }>("st_jobs", [q.select("id,project_id:raw->>projectId"), `raw->>projectId=in.(${uniq.slice(i, i + 200).join(",")})`].join("&"));
    for (const j of sib) if (j.project_id) projectOf.set(Number(j.id), j.project_id);
  }
  const ids = [...projectOf.keys()];
  for (let i = 0; i < ids.length; i += 200) {
    const ests = await sbSelect<{ job_id: number | null; items: Array<{ qty?: number | null; sku?: { soldHours?: number | null } | null }> | null }>(
      "st_estimates", [q.select("job_id,items:raw->items"), `job_id=in.(${ids.slice(i, i + 200).join(",")})`, "status=ilike.sold*"].join("&"),
    );
    for (const e of ests) {
      const p = e.job_id != null ? projectOf.get(Number(e.job_id)) : null;
      if (!p) continue;
      const h = (e.items ?? []).reduce((a, it) => a + Number(it.sku?.soldHours ?? 0) * Number(it.qty ?? 1), 0);
      if (h > 0) out.set(p, (out.get(p) ?? 0) + h);
    }
  }
  return out;
}
