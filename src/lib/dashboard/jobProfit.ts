import { q, sbSelect } from "./db";
import { GST_RATE, jobClass, type JobClass } from "./pace";

/**
 * What each job made: the price before GST, less what the invoice's equipment
 * and materials cost us, less the hours on it at what an hour of the crew
 * costs. The same "20% profit" the year goal is set at, one job at a time.
 *
 * Three sources, each honest about where it stops:
 *
 * - Price: the invoice before GST. GST is collected for the ATO and was never
 *   ours to keep, so a margin worked on the GST-inclusive price reads about
 *   nine points high.
 * - Equipment and materials: the cost ServiceTitan's pricebook puts on each
 *   invoice line. Installs carry it; a labour-only service call has none, and
 *   that is a real zero.
 * - Hours: Payroll's job timesheets (arrived to done, per tech) where that
 *   scope is granted; otherwise the hours the invoice's labour lines were sold
 *   at. Sold hours are what the job was priced to take, so a job that ran long
 *   looks better here than it was — the page says which one it used.
 *
 * The hour is costed at the fully loaded rate from Costs & capacity — wages
 * and on-costs plus each billable hour's share of every overhead — so what's
 * left is profit after overheads, the same thing the goal's percentage means.
 *
 * A job is only counted when all three are known. An install with no
 * equipment cost on its invoice would otherwise show as 70% margin, and that
 * is the job somebody would hold up as the example.
 */

export type JobProfit = {
  jobId: number | null;
  jobNumber: string | null;
  customer: string | null;
  jobType: string | null;
  cls: JobClass;
  date: string;
  /** Before GST. */
  price: number;
  materials: number;
  hours: number | null;
  hoursFrom: "timesheets" | "sold" | null;
  /** What the quote allowed, and what the crew actually clocked. */
  allowedHours: number | null;
  actualHours: number | null;
  labour: number | null;
  profit: number | null;
  /** 0–1 of price. Null when the job couldn't be costed. */
  margin: number | null;
  /** Why it couldn't be costed. */
  missing: string | null;
  /** Who clocked on to it, from the timesheets. Empty when nobody did. */
  techs: string[];
};

export type ProfitSummary = {
  from: string;
  to: string;
  costPerHr: number | null;
  /** Jobs invoiced with a price. */
  jobs: number;
  /** Of those, the ones with every cost known. */
  costed: number;
  /** Price before GST, over the costed jobs. */
  revenue: number;
  profit: number;
  margin: number | null;
  /** Costed jobs under the goal's percentage, and under nothing. */
  under: number;
  losing: number;
  /** Price before GST of the jobs that couldn't be costed. */
  uncostedRevenue: number;
  /** Where the hours came from on the costed jobs. */
  fromTimesheets: number;
  /**
   * Time allowed against time taken, over the jobs that carry both.
   *
   * A separate population from the costed one, and deliberately so: a job needs
   * sold hours *and* a timesheet to be in it, where costing needs hours from
   * either. `timeJobs` is the count, and it is small — it goes on the wall with
   * the count beside it or not at all.
   */
  timeJobs: number;
  timeAllowed: number;
  timeActual: number;
  /** Of those, how many took longer than the quote allowed. */
  timeOver: number;
};

/** A day on site, at most. Anything longer is a timesheet nobody clocked off. */
const MAX_SHIFT_HOURS = 12;

export async function jobProfits(
  from: string,
  to: string,
  costPerHr: number | null,
  targetPct: number | null,
  /**
   * What an hour of each person costs, by name, from Costs & capacity. A tech
   * and an apprentice on one job are one van-hour, not two: the tradesman's
   * hour carries the van and the overhead, and the apprentice riding along
   * adds their own cost and no more. Costing every clocked hour at the van
   * rate charged a two-hander's job for two vans. Anyone not on Costs &
   * capacity is costed at the van rate, the cautious figure.
   */
  crew: Array<{ name: string; cost: number | null }> = [],
): Promise<{ rows: JobProfit[]; summary: ProfitSummary }> {
  const invoices = await sbSelect<{
    id: number;
    job_id: number | null;
    invoice_date: string | null;
    total: number | null;
    subtotal: number | null;
    items_cost: number | null;
    sold_hours: number | null;
    job_type: string | null;
  }>(
    "st_invoices_billed",
    [
      q.select("id,job_id,invoice_date,total,subtotal,items_cost,sold_hours,job_type"),
      q.gte("invoice_date", from),
      `invoice_date=lte.${to}`,
    ].join("&"),
  );

  // One row per job: a job billed on two invoices was still one job.
  const byJob = new Map<string, { jobId: number | null; date: string; price: number; materials: number; sold: number; jobType: string | null }>();
  for (const i of invoices) {
    const price = i.subtotal != null ? Number(i.subtotal) : Number(i.total ?? 0) / (1 + GST_RATE);
    const k = i.job_id != null ? `j${i.job_id}` : `i${i.id}`;
    const got = byJob.get(k) ?? { jobId: i.job_id, date: String(i.invoice_date), price: 0, materials: 0, sold: 0, jobType: i.job_type };
    got.price += price;
    got.materials += Number(i.items_cost ?? 0);
    got.sold += Number(i.sold_hours ?? 0);
    if (i.invoice_date && i.invoice_date > got.date) got.date = i.invoice_date;
    got.jobType = got.jobType ?? i.job_type;
    byJob.set(k, got);
  }
  // A $0 invoice is a warranty call or a quote visit, not a job that made nothing.
  const priced = [...byJob.values()].filter((j) => j.price > 0.5);

  const ids = priced.map((j) => j.jobId).filter((v): v is number => v != null);
  const jobs = new Map<number, { job_number: string | null; customer_name: string | null; job_type: string | null }>();
  const hours = new Map<number, number>();
  const byTech = new Map<number, Map<number | null, number>>();
  const crewOn = new Map<number, Set<number>>();
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150).join(",");
    const [js, ts] = await Promise.all([
      sbSelect<{ id: number; job_number: string | null; customer_name: string | null; job_type: string | null }>(
        "st_jobs",
        [q.select("id,job_number,customer_name,job_type"), `id=in.(${chunk})`].join("&"),
      ).catch(() => []),
      sbSelect<{ job_id: number; technician_id: number | null; arrived_on: string | null; done_on: string | null; canceled_on: string | null; active: boolean | null }>(
        "st_timesheets",
        [q.select("job_id,technician_id,arrived_on,done_on,canceled_on,active"), `job_id=in.(${chunk})`].join("&"),
      ).catch(() => []),
    ]);
    for (const j of js) jobs.set(Number(j.id), j);
    for (const t of ts) {
      if (t.active === false || t.canceled_on || !t.arrived_on || !t.done_on) continue;
      const h = (Date.parse(t.done_on) - Date.parse(t.arrived_on)) / 3_600_000;
      if (!(h > 0)) continue;
      hours.set(Number(t.job_id), (hours.get(Number(t.job_id)) ?? 0) + Math.min(MAX_SHIFT_HOURS, h));
      const per = byTech.get(Number(t.job_id)) ?? new Map<number | null, number>();
      const tid = t.technician_id != null ? Number(t.technician_id) : null;
      per.set(tid, (per.get(tid) ?? 0) + Math.min(MAX_SHIFT_HOURS, h));
      byTech.set(Number(t.job_id), per);
      if (t.technician_id != null) {
        const set = crewOn.get(Number(t.job_id)) ?? new Set<number>();
        set.add(Number(t.technician_id));
        crewOn.set(Number(t.job_id), set);
      }
    }
  }
  // Names for whoever clocked on, so the page can be cut by who did the work.
  const techIds = [...new Set([...crewOn.values()].flatMap((x) => [...x]))];
  const techName = new Map<number, string>();
  if (techIds.length) {
    const ts = await sbSelect<{ id: number; name: string | null }>("st_technicians", [q.select("id,name"), `id=in.(${techIds.join(",")})`].join("&")).catch(() => []);
    for (const t of ts) if (t.name) techName.set(Number(t.id), t.name);
  }

  // ServiceTitan's names and the portal's don't always match letter for
  // letter ("Winbanks" and "Winbank"), so a first name plus the start of the
  // surname is enough.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").trim().split(/\s+/);
  const costFor = (name: string | undefined): number | null => {
    if (!name) return null;
    const [f, ...rest] = norm(name);
    const l = rest.join("");
    for (const c of crew) {
      if (c.cost == null) continue;
      const [cf, ...cr] = norm(c.name);
      const cl = cr.join("");
      if (cf === f && (cl === l || (l.length >= 4 && cl.length >= 4 && (cl.startsWith(l.slice(0, 5)) || l.startsWith(cl.slice(0, 5)))))) return c.cost;
    }
    return null;
  };

  const rows: JobProfit[] = priced.map((j) => {
    const meta = j.jobId != null ? jobs.get(j.jobId) : undefined;
    const jobType = meta?.job_type ?? j.jobType;
    const cls = jobClass(jobType);
    const clocked = j.jobId != null ? hours.get(j.jobId) : undefined;
    const h = clocked != null ? clocked : j.sold > 0 ? j.sold : null;
    const hoursFrom = clocked != null ? "timesheets" : j.sold > 0 ? "sold" : null;

    // Sold work always has equipment or materials in it. None on the invoice
    // means the cost wasn't recorded, not that the system was free.
    const missing =
      costPerHr == null
        ? "Crew costs aren't set on Costs & capacity"
        : cls !== "service" && !(j.materials > 0)
          ? "No equipment or materials cost on the invoice"
          : h == null
            ? "No hours recorded"
            : null;

    // Clocked hours at what each person's hour costs; sold hours, with nobody
    // to cost them against, at the van rate.
    const per = clocked != null && j.jobId != null ? byTech.get(j.jobId) : undefined;
    const labour = costPerHr == null || h == null
      ? null
      : per
        ? [...per].reduce((a, [tid, hh]) => a + hh * (costFor(tid != null ? techName.get(tid) : undefined) ?? costPerHr), 0)
        : h * costPerHr;
    const profit = missing == null && labour != null ? j.price - j.materials - labour : null;
    return {
      jobId: j.jobId,
      jobNumber: meta?.job_number ?? null,
      customer: meta?.customer_name ?? null,
      jobType,
      cls,
      date: j.date,
      price: j.price,
      materials: j.materials,
      hours: h,
      hoursFrom,
      allowedHours: j.sold > 0 ? j.sold : null,
      actualHours: clocked ?? null,
      labour,
      profit,
      margin: profit != null && j.price > 0 ? profit / j.price : null,
      missing,
      techs: j.jobId != null ? [...(crewOn.get(j.jobId) ?? [])].map((id) => techName.get(id)).filter((n): n is string => !!n).sort() : [],
    };
  });

  // Both numbers, on the jobs that have both. A job quoted at four hours with no
  // timesheet says nothing about over-running, and nor does one with a timesheet
  // that was never quoted by the hour.
  const timed = rows.filter((r) => r.allowedHours != null && r.allowedHours > 0 && r.actualHours != null && r.actualHours > 0);

  const costed = rows.filter((r) => r.profit != null);
  const revenue = costed.reduce((t, r) => t + r.price, 0);
  const profit = costed.reduce((t, r) => t + (r.profit ?? 0), 0);
  const target = targetPct != null ? targetPct / 100 : null;
  return {
    rows: rows.sort((a, b) => (a.margin ?? 9) - (b.margin ?? 9) || b.price - a.price),
    summary: {
      from,
      to,
      costPerHr,
      jobs: rows.length,
      costed: costed.length,
      revenue,
      profit,
      // Three jobs is an anecdote. The margin waits for enough of them to mean something.
      margin: costed.length >= 5 && revenue > 0 ? profit / revenue : null,
      under: target == null ? 0 : costed.filter((r) => (r.margin ?? 0) < target).length,
      losing: costed.filter((r) => (r.profit ?? 0) < 0).length,
      uncostedRevenue: rows.filter((r) => r.profit == null).reduce((t, r) => t + r.price, 0),
      fromTimesheets: costed.filter((r) => r.hoursFrom === "timesheets").length,
      timeJobs: timed.length,
      timeAllowed: timed.reduce((t, r) => t + (r.allowedHours ?? 0), 0),
      timeActual: timed.reduce((t, r) => t + (r.actualHours ?? 0), 0),
      timeOver: timed.filter((r) => (r.actualHours ?? 0) > (r.allowedHours ?? 0)).length,
    },
  };
}
