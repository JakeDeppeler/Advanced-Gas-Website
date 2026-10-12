import "server-only";
import { cache } from "react";
import { q, sbSelect } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { listUsers, listVehicles } from "@/lib/portal/db";
import { matchName } from "@/lib/portal/crewFile/match";

export type VanRow = { techId: number; name: string; van: string | null; rev: number; jobs: number; days: number };
export type PerVan = {
  rows: VanRow[];
  /** Jobs finished this month. */
  done: number;
  /** Of those, the ones tied to a tech, by assignment or clock-in. */
  tied: number;
  /** Of those, the ones with an invoice yet. The rest are in at $0. */
  billed: number;
  /** False until the first appointment-assignments sync has landed. */
  assignments: boolean;
  from: string;
};

const chunks = <T,>(xs: T[], n = 150) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const inIds = (ids: number[]) => `in.(${ids.join(",")})`;

/**
 * What each tech's van brought in this month, a day.
 *
 * Counted by the jobs finished this month, with whatever has been invoiced
 * for them before GST, over the days the tech was out this month. Invoices
 * raised this month were tried first and didn't hold: October's invoicing was
 * carrying September's big installs, so the day rate came out at three times
 * the band over a month's worth of days. A job goes to the techs ServiceTitan
 * sent to it (appointment assignments), split evenly; clock-ins stand in where
 * nobody was assigned. Days out are the days they finished a job or clocked in.
 * A finished job not yet invoiced is in at $0 — the page says how many.
 */
export const perVanMonth = cache(async (): Promise<PerVan> => {
  const today = isoDateMelbourne(new Date());
  const from = `${today.slice(0, 7)}-01`;
  const jobs = await sbSelect<{ id: number; completed_on: string | null }>("st_jobs",
    [q.select("id,completed_on"), q.gte("completed_on", `${from}T00:00:00+10:00`), "limit=5000"].join("&")).catch(() => []);
  const doneDay = new Map(jobs.filter((j) => j.completed_on && isoDateMelbourne(new Date(j.completed_on)) >= from).map((j) => [j.id, isoDateMelbourne(new Date(j.completed_on!))]));
  const ids = [...doneDay.keys()];
  const byChunk = <T,>(table: string, cols: string, col: string) =>
    Promise.all(chunks(ids).map((c) => sbSelect<T>(table, [q.select(cols), `${col}=${inIds(c)}`].join("&")).catch(() => [] as T[]))).then((x) => x.flat());

  const [inv, assigned, clocked, monthSheets, techs, assignCount, users, vans] = await Promise.all([
    byChunk<{ job_id: number; subtotal: number | null; total: number | null }>("st_invoices", "job_id,subtotal,total", "job_id"),
    byChunk<{ job_id: number; technician_id: number | null; active: boolean | null }>("st_appointment_assignments", "job_id,technician_id,active", "job_id"),
    byChunk<{ job_id: number; technician_id: number | null; active: boolean | null }>("st_timesheets", "job_id,technician_id,active", "job_id"),
    sbSelect<{ technician_id: number | null; arrived_on: string | null; active: boolean | null }>("st_timesheets",
      [q.select("technician_id,arrived_on,active"), q.gte("arrived_on", `${from}T00:00:00+10:00`), "limit=5000"].join("&")).catch(() => []),
    sbSelect<{ id: number; name: string | null }>("st_technicians", q.select("id,name")).catch(() => []),
    sbSelect<{ id: number }>("st_appointment_assignments", [q.select("id"), "limit=1"].join("&")).catch(() => []),
    listUsers().catch(() => []),
    listVehicles().catch(() => []),
  ]);

  const revByJob = new Map<number, number>();
  for (const i of inv) {
    if (!(Number(i.total) > 0)) continue;
    revByJob.set(i.job_id, (revByJob.get(i.job_id) ?? 0) + (i.subtotal != null ? Number(i.subtotal) : Number(i.total) / 1.1));
  }

  const who = new Map<number, Set<number>>();
  const add = (job: number, tech: number | null, active: boolean | null) => {
    if (tech == null || active === false) return;
    (who.get(job) ?? who.set(job, new Set()).get(job)!).add(tech);
  };
  for (const a of assigned) add(a.job_id, a.technician_id, a.active);
  // Clock-ins only where nobody was assigned: the assignment is the record of
  // who was sent, and a helper who clocked in would split it differently.
  for (const c of clocked) if (!who.has(c.job_id)) add(c.job_id, c.technician_id, c.active);

  type Acc = { rev: number; jobs: number; days: Set<string> };
  const acc = new Map<number, Acc>();
  const get = (t: number) => acc.get(t) ?? acc.set(t, { rev: 0, jobs: 0, days: new Set() }).get(t)!;
  for (const [job, set] of who) {
    const share = 1 / set.size, rev = revByJob.get(job) ?? 0, d = doneDay.get(job)!;
    for (const t of set) { const a = get(t); a.rev += rev * share; a.jobs += share; a.days.add(d); }
  }
  for (const s of monthSheets) {
    if (s.technician_id == null || s.active === false || !s.arrived_on || !acc.has(s.technician_id)) continue;
    acc.get(s.technician_id)!.days.add(isoDateMelbourne(new Date(s.arrived_on)));
  }

  const techName = new Map(techs.map((t) => [t.id, t.name ?? `Tech ${t.id}`]));
  const vanFor = (name: string) => {
    const u = users.find((x) => x.active && x.id && matchName(x.name, [name]) === name);
    return u ? vans.find((v) => v.assignedTo === u.id)?.name ?? null : null;
  };
  const rows = [...acc.entries()].map(([techId, a]) => {
    const name = techName.get(techId) ?? `Tech ${techId}`;
    return { techId, name, van: vanFor(name), rev: a.rev, jobs: a.jobs, days: a.days.size };
  }).filter((r) => r.days > 0).sort((a, b) => b.rev / b.days - a.rev / a.days);

  return { rows, done: ids.length, tied: who.size, billed: ids.filter((j) => revByJob.has(j)).length, assignments: assignCount.length > 0, from };
});
