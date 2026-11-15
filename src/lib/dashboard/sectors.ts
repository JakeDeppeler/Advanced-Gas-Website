import { q, sbSelect } from "./db";
import { isoDateMelbourne } from "./dates";
import { jobProfits, type JobProfit } from "./jobProfit";
import { ST_LEDGER_FROM } from "./stOwed";

/**
 * The four kinds of work side by side, and what a maintenance visit or a
 * breakdown call leads to (Jake, 15 Nov: "are we making more money on
 * installation and maintenance because it leads to install, so do we push
 * more for breakdowns or maintenance").
 *
 * Sectors come from ServiceTitan's job type:
 *   - maintenance: Service -, Commercial – Maintenance / Service, Gas Safety Check
 *   - breakdown:   Diagnostics - (the call-out when something has stopped)
 *   - repair:      Repair -, Commercial – Repair
 *   - install:     Installation -, Commercial – Installation
 * Quote visits, warranty, return visits and the odd commissioning job are
 * none of these and are left out, rather than padding a sector.
 *
 * Revenue, profit and margin are the per-job figures from jobProfit.ts: price
 * before GST, less equipment and materials at cost, less the hours at the
 * crew's fully loaded rate. Only costed jobs carry a profit, and the count of
 * them goes on the wall beside it.
 *
 * "Led to" follows the address, not the quote. Of 76 breakdowns finished in
 * the first two months on ServiceTitan, 37 were quoted on the visit and only
 * 7 of those quotes were sold through a job made from them, but 22 of the
 * addresses had an install booked within 60 days. The office books the
 * install as a new job at the same site as often as it converts the quote, so
 * the quote alone misses most of it. Each follow-on install or repair is
 * credited to the most recent maintenance or breakdown visit at that address
 * in the 60 days before it was booked, once, so one install is never counted
 * as the fruit of two visits.
 */

export type SectorKey = "maintenance" | "breakdown" | "repair" | "install";

export function sectorOf(jobType: string | null | undefined): SectorKey | null {
  const t = String(jobType ?? "").trim();
  if (/^(service\b|commercial\s*[–-]\s*(maintenance|service)|gas safety)/i.test(t)) return "maintenance";
  if (/^diagnostic/i.test(t)) return "breakdown";
  if (/^(repair\b|commercial\s*[–-]\s*repair)/i.test(t)) return "repair";
  if (/^(install|commercial\s*[–-]\s*install)/i.test(t)) return "install";
  return null;
}

export type SectorFigures = {
  /** Jobs billed with a price, in the window. */
  jobs: number;
  /** Price before GST over those jobs. */
  revenue: number;
  /** Of those, the ones with every cost known; profit and margin are over these. */
  costed: number;
  profit: number;
  margin: number | null;
};

export type VisitOutcomes = {
  /** Visits finished in the window and at least SETTLE_DAYS old. */
  visits: number;
  /** An install booked at the address within FOLLOW_DAYS. */
  install: number;
  /** A repair job booked at the address within FOLLOW_DAYS (and no install). */
  repair: number;
  /** Quoted on the visit and nothing booked since. */
  quoted: number;
  /** Nothing quoted, nothing booked: the visit was the job. */
  only: number;
  /** What those visits billed themselves, before GST. */
  ownRevenue: number;
  ownProfit: number;
  /** What the installs and repairs they led to have billed so far, before GST. */
  ledRevenue: number;
  ledProfit: number;
  /** Follow-on installs and repairs booked but not billed yet. */
  ledUnbilled: number;
};

export type Sectors = {
  from: string;
  to: string;
  /** How long a visit is given to turn into something before it is counted. */
  settleDays: number;
  followDays: number;
  bySector: Record<SectorKey, SectorFigures>;
  maintenance: VisitOutcomes;
  breakdown: VisitOutcomes;
};

/** A visit gets two weeks to turn into a booking before it counts as "just a service". */
export const SETTLE_DAYS = 14;
/** How long after a visit a booked install or repair is still credited to it. */
export const FOLLOW_DAYS = 60;
/** The longest look back: past this, prices and the crew have moved on. */
const WINDOW_DAYS = 90;

const empty = (): SectorFigures => ({ jobs: 0, revenue: 0, costed: 0, profit: 0, margin: null });
const emptyOut = (): VisitOutcomes => ({ visits: 0, install: 0, repair: 0, quoted: 0, only: 0, ownRevenue: 0, ownProfit: 0, ledRevenue: 0, ledProfit: 0, ledUnbilled: 0 });
const DAY = 86_400_000;

type JobRow = { id: number; job_type: string | null; location_id: number | null; status: string | null; created_on: string | null; completed_on: string | null };

export async function computeSectors(
  now: Date,
  costPerHr: number | null,
  targetPct: number | null,
  crew: Array<{ name: string; cost: number | null }> = [],
): Promise<Sectors> {
  const to = isoDateMelbourne(now);
  const back = isoDateMelbourne(new Date(now.getTime() - WINDOW_DAYS * DAY));
  const from = back > ST_LEDGER_FROM ? back : ST_LEDGER_FROM;

  const { rows } = await jobProfits(from, to, costPerHr, targetPct, crew);
  const byJob = new Map<number, JobProfit>();
  for (const r of rows) if (r.jobId != null) byJob.set(r.jobId, r);

  // Each sector's own figures: the jobs billed in the window.
  const bySector: Record<SectorKey, SectorFigures> = { maintenance: empty(), breakdown: empty(), repair: empty(), install: empty() };
  for (const r of rows) {
    const s = sectorOf(r.jobType);
    if (!s) continue;
    const f = bySector[s];
    f.jobs++;
    f.revenue += r.price;
    if (r.profit != null) { f.costed++; f.profit += r.profit; }
  }
  // Margin over the costed jobs' own revenue, so an uncosted job's price can't dilute it.
  const costedRev: Record<SectorKey, number> = { maintenance: 0, breakdown: 0, repair: 0, install: 0 };
  for (const r of rows) {
    const s = sectorOf(r.jobType);
    if (s && r.profit != null) costedRev[s] += r.price;
  }
  for (const s of Object.keys(bySector) as SectorKey[]) {
    const f = bySector[s];
    f.margin = f.costed >= 5 && costedRev[s] > 0 ? f.profit / costedRev[s] : null;
  }

  // The visits: maintenance and breakdowns finished in the window, old enough
  // to have had the chance to become something.
  const settled = new Date(now.getTime() - SETTLE_DAYS * DAY).toISOString();
  const jobs = await sbSelect<JobRow>(
    "st_jobs",
    [q.select("id,job_type,location_id,status,created_on,completed_on"), q.gte("created_on", `${from}T00:00:00`), "limit=20000"].join("&"),
  );
  const visits = jobs.filter((j) => {
    const s = sectorOf(j.job_type);
    return (s === "maintenance" || s === "breakdown") && j.status === "Completed" && j.completed_on && j.completed_on.slice(0, 10) >= from && j.completed_on <= settled && j.location_id != null;
  });
  const followOns = jobs.filter((j) => {
    const s = sectorOf(j.job_type);
    return (s === "install" || s === "repair") && j.status !== "Canceled" && j.location_id != null && j.created_on;
  });

  // Each install or repair to the latest visit at its address before it was booked.
  const visitsAt = new Map<number, JobRow[]>();
  for (const v of visits) {
    const list = visitsAt.get(v.location_id as number) ?? [];
    list.push(v);
    visitsAt.set(v.location_id as number, list);
  }
  const led = new Map<number, JobRow[]>();
  for (const f of followOns) {
    const booked = Date.parse(f.created_on as string);
    const before = (visitsAt.get(f.location_id as number) ?? [])
      .filter((v) => {
        const done = Date.parse(v.completed_on as string);
        // A day's grace: the install is often booked the morning the tech rings it in.
        return booked >= done - DAY && booked <= done + FOLLOW_DAYS * DAY;
      })
      .sort((a, b) => Date.parse(b.completed_on as string) - Date.parse(a.completed_on as string))[0];
    if (!before) continue;
    const list = led.get(before.id) ?? [];
    list.push(f);
    led.set(before.id, list);
  }

  // Quoted on the visit: any quote written on the visit's own job.
  const quotedJobs = new Set<number>();
  const ids = visits.map((v) => v.id);
  for (let i = 0; i < ids.length; i += 150) {
    const ests = await sbSelect<{ job_id: number | null }>("st_estimates", [q.select("job_id"), `job_id=in.(${ids.slice(i, i + 150).join(",")})`].join("&")).catch(() => []);
    for (const e of ests) if (e.job_id != null) quotedJobs.add(Number(e.job_id));
  }

  const maintenance = emptyOut();
  const breakdown = emptyOut();
  for (const v of visits) {
    const out = sectorOf(v.job_type) === "maintenance" ? maintenance : breakdown;
    out.visits++;
    const own = byJob.get(v.id);
    if (own) { out.ownRevenue += own.price; out.ownProfit += own.profit ?? 0; }
    const next = led.get(v.id) ?? [];
    if (next.some((f) => sectorOf(f.job_type) === "install")) out.install++;
    else if (next.length) out.repair++;
    else if (quotedJobs.has(v.id)) out.quoted++;
    else out.only++;
    for (const f of next) {
      const billed = byJob.get(f.id);
      if (billed) { out.ledRevenue += billed.price; out.ledProfit += billed.profit ?? 0; }
      else out.ledUnbilled++;
    }
  }

  return { from, to, settleDays: SETTLE_DAYS, followDays: FOLLOW_DAYS, bySector, maintenance, breakdown };
}
