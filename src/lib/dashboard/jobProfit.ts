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
  labour: number | null;
  profit: number | null;
  /** 0–1 of price. Null when the job couldn't be costed. */
  margin: number | null;
  /** Why it couldn't be costed. */
  missing: string | null;
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
};

/** A day on site, at most. Anything longer is a timesheet nobody clocked off. */
const MAX_SHIFT_HOURS = 12;

export async function jobProfits(
  from: string,
  to: string,
  costPerHr: number | null,
  targetPct: number | null,
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
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150).join(",");
    const [js, ts] = await Promise.all([
      sbSelect<{ id: number; job_number: string | null; customer_name: string | null; job_type: string | null }>(
        "st_jobs",
        [q.select("id,job_number,customer_name,job_type"), `id=in.(${chunk})`].join("&"),
      ).catch(() => []),
      sbSelect<{ job_id: number; arrived_on: string | null; done_on: string | null; canceled_on: string | null; active: boolean | null }>(
        "st_timesheets",
        [q.select("job_id,arrived_on,done_on,canceled_on,active"), `job_id=in.(${chunk})`].join("&"),
      ).catch(() => []),
    ]);
    for (const j of js) jobs.set(Number(j.id), j);
    for (const t of ts) {
      if (t.active === false || t.canceled_on || !t.arrived_on || !t.done_on) continue;
      const h = (Date.parse(t.done_on) - Date.parse(t.arrived_on)) / 3_600_000;
      if (!(h > 0)) continue;
      hours.set(Number(t.job_id), (hours.get(Number(t.job_id)) ?? 0) + Math.min(MAX_SHIFT_HOURS, h));
    }
  }

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

    const labour = h != null && costPerHr != null ? h * costPerHr : null;
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
      labour,
      profit,
      margin: profit != null && j.price > 0 ? profit / j.price : null,
      missing,
    };
  });

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
    },
  };
}
