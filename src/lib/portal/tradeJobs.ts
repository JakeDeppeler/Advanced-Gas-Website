import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { sameSeller } from "@/lib/portal/tradeHome";

/**
 * One tech's visits, read from ServiceTitan's appointments and who was put on
 * them, for the trade portal's My jobs: today's, the ones left open after the
 * visit, and what's coming up.
 *
 * "Left open" is the trade side of the office's close-the-job sweep: a job
 * still In Progress or Scheduled with every visit in the past. The tech is the
 * one who knows whether the work's done, so they can say so from here rather
 * than the office ringing round.
 */

export type MyJob = {
  jobId: number;
  jobNumber: string | null;
  customer: string | null;
  suburb: string | null;
  jobType: string | null;
  status: string;
  /** This tech's visit on it: the next one ahead, else the latest one. */
  visitAt: string;
  /** Marked done from the trade portal and waiting on the office to complete it. */
  doneBy: { by: string; at: string } | null;
};

export type MyJobs = { today: MyJob[]; open: MyJob[]; coming: MyJob[] };

/** Jobs a tech has said are done, waiting on the office: portal_settings, by job id. */
export const TRADE_DONE = "trade_done";
export type TradeDone = Record<string, { by: string; at: string; note?: string }>;

export const loadTradeDone = async (): Promise<TradeDone> => (await getSettings<TradeDone>(TRADE_DONE).catch(() => null)) ?? {};
export const saveTradeDone = (v: TradeDone) => saveSettings(TRADE_DONE, v);

const OPEN = new Set(["InProgress", "Scheduled", "Hold"]);

/** The job ids this person is on, with their own visits. Null when the name can't be matched. */
async function myVisits(name: string, fromIso: string, toIso: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return null;
  // A prefix match on first name, then checked properly with sameSeller, the
  // same as quotes: the portal and ServiceTitan spell some surnames differently.
  const crew = (await sbSelect<{ job_id: number; appointment_id: number | null; technician_name: string | null }>(
    "st_appointment_assignments",
    [q.select("job_id,appointment_id,technician_name"), `technician_name=ilike.${encodeURIComponent(parts[0])}*`, "active=not.is.false", "limit=5000"].join("&"),
  )).filter((c) => c.technician_name && sameSeller(name, c.technician_name));
  const apptIds = [...new Set(crew.map((c) => c.appointment_id).filter((v): v is number => v != null))];
  const visits: { id: number; job_id: number; start_at: string }[] = [];
  for (let i = 0; i < apptIds.length; i += 200) {
    visits.push(...await sbSelect<{ id: number; job_id: number; start_at: string }>(
      "st_appointments",
      [q.select("id,job_id,start_at"), `id=in.(${apptIds.slice(i, i + 200).join(",")})`, "active=not.is.false", "status=neq.Canceled", q.gte("start_at", fromIso), q.lt("start_at", toIso)].join("&"),
    ));
  }
  return visits;
}

export async function myJobs(name: string, now = new Date()): Promise<MyJobs | null> {
  const from = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const to = new Date(now.getTime() + 8 * 86_400_000).toISOString();
  const visits = await myVisits(name, from, to);
  if (!visits) return null;
  const today = isoDateMelbourne(now);
  const jobIds = [...new Set(visits.map((v) => Number(v.job_id)))];
  const jobs: { id: number; job_number: string | null; customer_name: string | null; suburb: string | null; job_type: string | null; status: string }[] = [];
  for (let i = 0; i < jobIds.length; i += 200) {
    jobs.push(...await sbSelect<(typeof jobs)[number]>("st_jobs", [q.select("id,job_number,customer_name,suburb,job_type,status"), `id=in.(${jobIds.slice(i, i + 200).join(",")})`].join("&")));
  }
  // Every visit on these jobs, anyone's: a job with a visit still to come
  // isn't left open, even when the next visit is somebody else's.
  const ahead = new Set<number>();
  for (let i = 0; i < jobIds.length; i += 200) {
    const rows = await sbSelect<{ job_id: number; start_at: string }>("st_appointments",
      [q.select("job_id,start_at"), `job_id=in.(${jobIds.slice(i, i + 200).join(",")})`, "active=not.is.false", "status=neq.Canceled"].join("&"));
    for (const r of rows) if (isoDateMelbourne(new Date(r.start_at)) >= today) ahead.add(Number(r.job_id));
  }
  const done = await loadTradeDone();
  const out: MyJobs = { today: [], open: [], coming: [] };
  for (const j of jobs) {
    const mine = visits.filter((v) => Number(v.job_id) === Number(j.id)).sort((a, b) => a.start_at.localeCompare(b.start_at));
    if (!mine.length) continue;
    const next = mine.find((v) => isoDateMelbourne(new Date(v.start_at)) >= today);
    const pick = next ?? mine[mine.length - 1];
    const day = isoDateMelbourne(new Date(pick.start_at));
    const row: MyJob = {
      jobId: j.id, jobNumber: j.job_number, customer: j.customer_name, suburb: j.suburb, jobType: j.job_type, status: j.status,
      visitAt: pick.start_at, doneBy: done[String(j.id)] ?? null,
    };
    if (day === today) out.today.push(row);
    else if (day > today) out.coming.push(row);
    // Hold is parked on purpose, so it isn't "left open".
    else if (OPEN.has(j.status) && j.status !== "Hold" && !ahead.has(Number(j.id))) out.open.push(row);
  }
  out.today.sort((a, b) => a.visitAt.localeCompare(b.visitAt));
  out.coming.sort((a, b) => a.visitAt.localeCompare(b.visitAt));
  out.open.sort((a, b) => b.visitAt.localeCompare(a.visitAt));
  return out;
}

/** Is this person on this job? The check behind every action on it. */
export async function onJob(name: string, jobId: number): Promise<boolean> {
  const rows = await sbSelect<{ technician_name: string | null }>("st_appointment_assignments",
    [q.select("technician_name"), q.eq("job_id", String(jobId)), "active=not.is.false"].join("&"));
  return rows.some((r) => r.technician_name && sameSeller(name, r.technician_name));
}
