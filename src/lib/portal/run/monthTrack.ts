import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { melbourneInstant } from "@/lib/ordering/workOrders";
import { listUsers } from "@/lib/portal/db";
import { getCostSettings } from "@/lib/portal/costSettings";
import { theHour } from "@/lib/portal/cover/load";
import { readYearGoal, revenueGoalFor } from "@/lib/portal/yearGoal";
import { getSettings } from "@/lib/portal/db";
import { billable, classOf } from "@/lib/portal/stuckTypes";
import { ST_LEDGER_FROM } from "@/lib/dashboard/stOwed";
import { isRebateLine } from "@/lib/dashboard/soldMarginTypes";

/**
 * How the month is going, read off the jobs as they're sold rather than off
 * Xero.
 *
 * Xero's month can't be read until the Reece statement lands, weeks after the
 * gear went in, and a job done this month and invoiced next puts its gear in
 * one month and its sale in the other. A sold estimate carries both halves at
 * once: what the customer pays, and what every unit and fitting on it costs
 * us (ServiceTitan's pricebook cost on each line). Price less gear is what the
 * job leaves to pay the wages and the overheads, and those are known for the
 * month in advance — so the month can be read the day each job is sold.
 *
 * ServiceTitan's own estimates only carry costs from mid-September 2026, when
 * invoicing moved into it; before that the lines were imported with none, and
 * a month with no costs says so rather than reading as pure profit.
 */

type EstRow = {
  id: number; job_id: number | null; sold_on: string | null; subtotal: number | null; total: number | null;
  sold_by: string | null; items: Array<{ total?: number | null; totalCost?: number | null; qty?: number | null; skuName?: string | null; sku?: { type?: string | null; name?: string | null; soldHours?: number | null } | null }> | null;
};
type JobRow = { id: number; job_number: string | null; job_type: string | null; customer_name: string | null; status: string | null; completed_on: string | null; no_charge: unknown; project_id?: string | null };

export type SoldJob = {
  jobId: number | null; jobNumber: string | null; customer: string | null; jobType: string | null; soldBy: string | null; soldOn: string;
  /** Before GST. */
  price: number;
  /** Units and materials at cost, from the estimate's lines. Rebate lines aren't gear. */
  gear: number;
  /** What the job's rebate lines bring back from the certificate trader. Income, not a discount on the gear. */
  rebate: number;
  /** Gear lines that carry a price but no cost: the gear is in the job, its cost isn't. */
  uncosted: number;
  state: "billed" | "done" | "booked";
};

export type UnbilledJob = { jobId: number; jobNumber: string | null; customer: string | null; jobType: string | null; doneOn: string; price: number | null; gear: number | null };

export type MonthTrack = {
  month: string; from: string; to: string; daysIn: number; dayOf: number;
  sold: SoldJob[];
  /** What it costs to open the doors for the month: every wage and overhead, nothing that goes into a job. */
  toCover: number | null;
  /** The month's sales goal, from the year goal. */
  salesGoal: number | null;
  /** The profit we want, as a share of the price. */
  margin: number;
  /** The most gear a job can carry, as a share of its price and rebate, and still pay its share of the month and the profit. Null without a sales goal. */
  maxGear: number | null;
  invoiced: { count: number; price: number; gear: number; rebate: number };
  unbilled: UnbilledJob[];
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const GEAR = /^(material|equipment)$/i;

function gearOf(items: EstRow["items"]): { gear: number; uncosted: number; rebate: number } {
  let gear = 0, uncosted = 0, rebate = 0;
  for (const i of items ?? []) {
    if (isRebateLine(i)) { rebate -= n(i.totalCost); continue; }
    if (!GEAR.test(i.sku?.type ?? "")) continue;
    const cost = n(i.totalCost);
    gear += cost;
    if (cost <= 0 && n(i.total) > 0) uncosted += 1;
  }
  return { gear, uncosted, rebate };
}

const priceOf = (e: { subtotal: number | null; total: number | null }) => (e.subtotal != null ? n(e.subtotal) : n(e.total) / 1.1);

export async function monthTrack(month: string): Promise<MonthTrack> {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(last).padStart(2, "0")}`;
  const nextFrom = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const start = melbourneInstant(from, "00:00"), end = melbourneInstant(nextFrom, "00:00");
  const today = new Date(Date.now() + 10 * 3_600_000).toISOString().slice(0, 10);
  const dayOf = today < from ? 0 : today > to ? last : Number(today.slice(8, 10));

  const [ests, invs, users, settings, goalRaw, done] = await Promise.all([
    sbSelect<EstRow>("st_estimates", [
      q.select("id,job_id,sold_on,subtotal,total,sold_by,items:raw->items"),
      `sold_on=gte.${encodeURIComponent(start)}`, `sold_on=lt.${encodeURIComponent(end)}`, "status=ilike.sold*", "limit=2000",
    ].join("&")),
    sbSelect<{ job_id: number | null; subtotal: number | null; total: number | null; items_cost: number | null; rebate_back: number | null; business_unit: string | null }>("st_invoices", [
      q.select("job_id,subtotal,total,items_cost,rebate_back,business_unit"), q.gte("invoice_date", from), `invoice_date=lte.${to}`, "limit=5000",
    ].join("&")),
    listUsers().catch(() => []),
    getCostSettings().catch(() => null),
    getSettings<unknown>("yeargoal").catch(() => null),
    // Finished and never billed, whenever it was finished: the gear for these
    // has been bought and paid for, and nothing has been charged. Only since
    // ServiceTitan took over invoicing: a job finished before then was billed
    // in Xero and would read here as never billed.
    sbSelect<JobRow>("st_jobs", [
      q.select("id,job_number,job_type,customer_name,status,completed_on,no_charge:raw->noCharge"),
      q.eq("status", "Completed"), q.gte("completed_on", ST_LEDGER_FROM), "limit=5000",
    ].join("&")),
  ]);

  // Every job any list touches, then every job in the same ServiceTitan
  // project. A quote visit is sold on one job and the install is booked as
  // another under the same project, so where a sale is up to — and what a
  // finished install was sold for — is read across the project, not the job.
  const JOB_COLS = "id,job_number,job_type,customer_name,status,completed_on,no_charge:raw->noCharge,project_id:raw->>projectId";
  const jobs = new Map<number, JobRow>();
  const fetchJobs = async (filter: (chunk: string) => string, keys: string[]) => {
    for (let i = 0; i < keys.length; i += 150) {
      const rows = await sbSelect<JobRow>("st_jobs", [q.select(JOB_COLS), filter(keys.slice(i, i + 150).join(","))].join("&"));
      for (const j of rows) jobs.set(Number(j.id), j);
    }
  };
  const firstIds = [...new Set([...ests.map((e) => e.job_id), ...done.map((j) => j.id), ...invs.map((i) => i.job_id)].filter((v): v is number => v != null))];
  await fetchJobs((c) => `id=in.(${c})`, firstIds.map(String));
  const projects = [...new Set([...jobs.values()].map((j) => j.project_id).filter((v): v is string => !!v))];
  await fetchJobs((c) => `raw->>projectId=in.(${c})`, projects);

  const groupKey = (j: JobRow) => (j.project_id ? `p${j.project_id}` : `j${j.id}`);
  const groups = new Map<string, JobRow[]>();
  for (const j of jobs.values()) groups.set(groupKey(j), [...(groups.get(groupKey(j)) ?? []), j]);

  const allIds = [...jobs.keys()];
  const invTotal = new Map<number, number>();
  const soldFor = new Map<string, { price: number; gear: number }>();
  for (let i = 0; i < allIds.length; i += 150) {
    const chunk = allIds.slice(i, i + 150).join(",");
    const [bs, es] = await Promise.all([
      sbSelect<{ job_id: number; total: number | null }>("st_invoices", [q.select("job_id,total"), `job_id=in.(${chunk})`].join("&")),
      sbSelect<EstRow>("st_estimates", [q.select("id,job_id,subtotal,total,items:raw->items"), `job_id=in.(${chunk})`, "status=ilike.sold*"].join("&")),
    ]);
    for (const b of bs) invTotal.set(Number(b.job_id), (invTotal.get(Number(b.job_id)) ?? 0) + n(b.total));
    for (const e of es) {
      const j = e.job_id != null ? jobs.get(Number(e.job_id)) : undefined;
      if (!j) continue;
      const k = groupKey(j);
      const got = soldFor.get(k) ?? { price: 0, gear: 0 };
      got.price += priceOf(e);
      got.gear += gearOf(e.items).gear;
      soldFor.set(k, got);
    }
  }

  // ServiceTitan opens an invoice on a job when it's booked, deposit and all;
  // it's billed when the job is finished with that invoice on it.
  const isBilled = (j: JobRow) => j.status === "Completed" && (invTotal.get(Number(j.id)) ?? 0) > 0.5;
  // A quote visit, or anything marked no charge, is never the billable work.
  const isVisit = (j: JobRow) => j.no_charge === true || classOf(j.job_type) === "quote";

  const sold: SoldJob[] = ests.map((e): SoldJob => {
    const j = e.job_id != null ? jobs.get(Number(e.job_id)) : undefined;
    const g = gearOf(e.items);
    const work = j ? (groups.get(groupKey(j)) ?? [j]).filter((x) => !isVisit(x) && x.status !== "Canceled") : [];
    const state: SoldJob["state"] = !work.length ? "booked"
      : work.every(isBilled) ? "billed"
        : work.some((x) => x.status === "Completed" && !isBilled(x)) ? "done" : "booked";
    return {
      jobId: e.job_id, jobNumber: j?.job_number ?? null, customer: j?.customer_name ?? null, jobType: j?.job_type ?? null,
      soldBy: e.sold_by, soldOn: String(e.sold_on ?? ""), price: priceOf(e), gear: g.gear, rebate: g.rebate, uncosted: g.uncosted, state,
    };
  }).sort((a, b) => b.soldOn.localeCompare(a.soldOn));

  const unbilled: UnbilledJob[] = done
    .map((d) => jobs.get(Number(d.id)) ?? d)
    // A quote visit that was sold is billable work like any install, so a sold
    // estimate counts whatever the job type says.
    .filter((j) => !isBilled(j) && !isVisit(j) && (billable(classOf(j.job_type)) || (soldFor.get(groupKey(j))?.price ?? 0) > 0))
    .map((j) => {
      const s = soldFor.get(groupKey(j));
      return { jobId: Number(j.id), jobNumber: j.job_number, customer: j.customer_name, jobType: j.job_type, doneOn: String(j.completed_on ?? ""), price: s ? s.price : null, gear: s ? s.gear : null };
    })
    .sort((a, b) => (b.price ?? -1) - (a.price ?? -1) || a.doneOn.localeCompare(b.doneOn));

  // Billed this month: finished jobs' invoices dated in it. Imported rows are
  // Xero's own history copied across, and an open job's invoice isn't billed yet.
  const realInv = invs.filter((i) => !/imported|default/i.test(i.business_unit ?? "") && i.job_id != null && jobs.get(Number(i.job_id))?.status === "Completed");
  const invoiced = {
    count: realInv.filter((i) => n(i.total) > 0.5).length,
    price: realInv.reduce((a, i) => a + priceOf(i), 0),
    // items_cost nets the rebate lines off; added back, it's the gear bought.
    gear: realInv.reduce((a, i) => a + n(i.items_cost) + n(i.rebate_back), 0),
    rebate: realInv.reduce((a, i) => a + n(i.rebate_back), 0),
  };

  let toCover: number | null = null;
  if (settings) {
    void users;
    // Everything but the gear: the crew's pay, the office and every overhead —
    // the year What an hour must cover and Running costs are built on.
    const year = (await theHour()).r.total;
    if (year > 0) toCover = (year * last) / 365;
  }
  const goal = goalRaw ? readYearGoal(goalRaw, new Date()) : null;
  const salesGoal = goal?.revenue ? revenueGoalFor(goal, from, to) : null;
  const margin = (goal?.profitPct ?? settings?.margin ?? 20) / 100;
  const maxGear = toCover != null && salesGoal ? Math.max(0, 1 - margin - toCover / salesGoal) : null;

  return { month, from, to, daysIn: last, dayOf, sold, toCover, salesGoal, margin, maxGear, invoiced, unbilled };
}
