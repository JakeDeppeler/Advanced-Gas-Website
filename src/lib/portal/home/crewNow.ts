import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

/**
 * Where each tech is right now, from today's ServiceTitan appointments and who
 * is assigned to them: on a job (Working), on the way (Dispatched), or not on a
 * job, with what's next if anything is booked. Only as fresh as the last sync,
 * which the page says.
 */
export type CrewState = "working" | "dispatched" | "free";
export type CrewNow = {
  name: string;
  state: CrewState;
  /** The job they're on or heading to, or the next one booked today. */
  job: { number: string | null; customer: string | null; suburb: string | null; type: string | null } | null;
  /** Free: when the next booking today starts, if there is one. */
  nextAt: string | null;
  doneToday: number;
  bookedToday: number;
};

type Assign = { appointment_id: number; job_id: number; technician_name: string | null; status: string | null; active: boolean | null };
type Appt = { id: number; job_id: number; start_at: string | null; status: string | null };
type Job = { id: number; job_number: string | null; customer_name: string | null; suburb: string | null; job_type: string | null };

export async function crewNow(): Promise<CrewNow[]> {
  const today = isoDateMelbourne(new Date());
  // Melbourne's day as a UTC window, wide enough for daylight saving either way.
  const from = new Date(Date.parse(`${today}T00:00:00+11:00`)).toISOString();
  const to = new Date(Date.parse(`${today}T23:59:59+10:00`)).toISOString();
  const [techs, appts] = await Promise.all([
    sbSelect<{ name: string }>("st_technicians", [q.select("name"), "active=is.true"].join("&")).catch(() => []),
    sbSelect<Appt>("st_appointments", [q.select("id,job_id,start_at,status"), `start_at=gte.${from}`, `start_at=lte.${to}`, "status=neq.Canceled", "limit=500"].join("&")),
  ]);
  const apptIds = appts.map((a) => a.id);
  const [assigns, jobs] = apptIds.length ? await Promise.all([
    sbSelect<Assign>("st_appointment_assignments", [q.select("appointment_id,job_id,technician_name,status:raw->>status,active"), `appointment_id=in.(${apptIds.join(",")})`].join("&")),
    sbSelect<Job>("st_jobs", [q.select("id,job_number,customer_name,suburb,job_type"), `id=in.(${[...new Set(appts.map((a) => a.job_id))].join(",")})`].join("&")),
  ]) : [[], []];
  const apptBy = new Map(appts.map((a) => [a.id, a]));
  const jobBy = new Map(jobs.map((j) => [j.id, j]));
  const jobOf = (id: number) => { const j = jobBy.get(id); return j ? { number: j.job_number, customer: j.customer_name, suburb: j.suburb, type: j.job_type } : null; };
  const now = new Date().toISOString();

  const names = new Set([...techs.map((t) => t.name), ...assigns.filter((a) => a.active !== false).map((a) => a.technician_name ?? "")].filter(Boolean));
  const out: CrewNow[] = [];
  for (const name of names) {
    const mine = assigns.filter((a) => a.technician_name === name && a.active !== false);
    const working = mine.find((a) => a.status === "Working");
    const dispatched = mine.find((a) => a.status === "Dispatched");
    const upcoming = mine.map((a) => ({ a, at: apptBy.get(a.appointment_id)?.start_at ?? null }))
      .filter((x) => x.a.status !== "Done" && x.at && x.at >= now).sort((x, y) => String(x.at).localeCompare(String(y.at)))[0];
    const pick = working ?? dispatched;
    out.push({
      name,
      state: working ? "working" : dispatched ? "dispatched" : "free",
      job: pick ? jobOf(pick.job_id) : upcoming ? jobOf(upcoming.a.job_id) : null,
      nextAt: !pick && upcoming ? upcoming.at : null,
      doneToday: mine.filter((a) => a.status === "Done").length,
      bookedToday: mine.length,
    });
  }
  const order: Record<CrewState, number> = { working: 0, dispatched: 1, free: 2 };
  return out.sort((a, b) => order[a.state] - order[b.state] || a.name.localeCompare(b.name));
}
