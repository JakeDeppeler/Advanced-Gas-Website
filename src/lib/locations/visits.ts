import { q, sbSelect } from "@/lib/dashboard/db";
import { startOfDayMelbourne } from "@/lib/dashboard/dates";
import { stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";

// Who's on a site's booked visits, and swapping one tech for another across
// many of them at once. A village is booked as one job per unit, twenty a day,
// and ServiceTitan's dispatch board moves them one at a time (Jake, 29 Oct).
//
// The list comes from the synced tables, so the page loads without a call per
// visit. The swap itself reads each visit's assignments live from
// ServiceTitan first: the synced copy can be a few minutes behind, and acting
// on it could take somebody off a visit they'd already been moved off, or put
// a second copy of somebody on.

export type SiteVisit = {
  id: number;
  jobNumber: string | null;
  unit: string | null;
  start: string;
  end: string | null;
  techIds: number[];
};

export type Tech = { id: number; name: string };

/** When each tech is already booked, on any job, across the days the site's visits span. */
export type Busy = Record<number, { appt: number; start: string; end: string }[]>;

export async function siteVisits(customerId: number): Promise<{ visits: SiteVisit[]; techs: Tech[]; busy: Busy }> {
  const jobs = await sbSelect<{ id: number; job_number: string | null; customer_name: string | null }>(
    "st_jobs", [q.select("id,job_number,customer_name"), q.eq("customer_id", String(customerId))].join("&"));
  const techs = await sbSelect<Tech>("st_technicians", [q.select("id,name"), "active=is.true", q.order("name")].join("&"));
  if (!jobs.length) return { visits: [], techs, busy: {} };

  // From the start of today: a visit later today can still move.
  const since = startOfDayMelbourne().toISOString();

  const appts = await sbSelect<{ id: number; job_id: number; start_at: string; end_at: string | null }>(
    "st_appointments",
    [q.select("id,job_id,start_at,end_at"), `job_id=in.(${jobs.map((j) => j.id).join(",")})`, "active=is.true", q.gte("start_at", since), q.order("start_at")].join("&"),
  );
  if (!appts.length) return { visits: [], techs, busy: {} };

  const first = appts[0].start_at;
  const last = appts.reduce((m, a) => ((a.end_at ?? a.start_at) > m ? a.end_at ?? a.start_at : m), first);
  // Everything booked over those days, this site's or not, for the clash check.
  const around = await sbSelect<{ id: number; start_at: string; end_at: string | null }>(
    "st_appointments", [q.select("id,start_at,end_at"), "active=is.true", q.gte("start_at", first), q.lt("start_at", last)].join("&"));
  const ids = [...new Set([...appts.map((a) => a.id), ...around.map((a) => a.id)])];
  const assigned: { appointment_id: number; technician_id: number }[] = [];
  // In slices: a fortnight of bookings is a few hundred ids, too long for one URL.
  for (let i = 0; i < ids.length; i += 150) {
    assigned.push(...(await sbSelect<{ appointment_id: number; technician_id: number }>(
      "st_appointment_assignments",
      [q.select("appointment_id,technician_id"), `appointment_id=in.(${ids.slice(i, i + 150).join(",")})`, "active=is.true"].join("&"),
    )));
  }

  const onAppt = new Map<number, number[]>();
  for (const a of assigned) onAppt.set(a.appointment_id, [...(onAppt.get(a.appointment_id) ?? []), a.technician_id]);
  const jobOf = new Map(jobs.map((j) => [j.id, j]));
  const visits = appts.map((a) => ({
    id: a.id,
    jobNumber: jobOf.get(a.job_id)?.job_number ?? null,
    unit: jobOf.get(a.job_id)?.customer_name ?? null,
    start: a.start_at,
    end: a.end_at,
    techIds: onAppt.get(a.id) ?? [],
  }));

  const busy: Busy = {};
  for (const a of around) {
    for (const t of onAppt.get(a.id) ?? []) (busy[t] ??= []).push({ appt: a.id, start: a.start_at, end: a.end_at ?? a.start_at });
  }
  return { visits, techs, busy };
}

type LiveAssignment = { appointmentId: number; technicianId: number; active?: boolean };

export type SwapResult = { id: number; did: "swapped" | "taken off" | "skipped" | "failed"; detail?: string };

/**
 * Put `to` on each visit in place of `from`. On before off, so a visit whose
 * second call fails is left with both techs on it, which the office will see,
 * rather than with nobody. A visit `from` isn't on any more is left alone.
 */
export async function swapTech(appointmentIds: number[], from: number, to: number): Promise<SwapResult[]> {
  const live = await stList<LiveAssignment>("dispatch", "appointment-assignments", { appointmentIds: appointmentIds.join(","), active: "True" });
  const on = new Map<number, Set<number>>();
  for (const a of live) {
    if (a.active === false) continue;
    (on.get(a.appointmentId) ?? on.set(a.appointmentId, new Set()).get(a.appointmentId)!).add(a.technicianId);
  }

  const out: SwapResult[] = [];
  for (const id of appointmentIds) {
    const techs = on.get(id);
    if (!techs?.has(from)) {
      out.push({ id, did: "skipped", detail: "not on it in ServiceTitan any more" });
      continue;
    }
    try {
      const already = techs.has(to);
      if (!already) await stSend("POST", stTenantPath("dispatch", "appointment-assignments/assign-technicians"), { jobAppointmentId: id, technicianIds: [to] });
      await stSend("POST", stTenantPath("dispatch", "appointment-assignments/unassign-technicians"), { jobAppointmentId: id, technicianIds: [from] });
      out.push({ id, did: already ? "taken off" : "swapped" });
    } catch (e) {
      const msg = (e as Error).message;
      // The sync only ever reads assignments, so the API app may have been
      // granted read on Dispatch and not write; say so rather than "403".
      const detail = /: 403\b/.test(msg)
        ? "ServiceTitan refused the change: the API app needs write access to Dispatch › Appointment assignments"
        : msg.replace(/^ServiceTitan \S+ \S+ failed: /, "").slice(0, 200);
      out.push({ id, did: "failed", detail });
    }
  }
  return out;
}
