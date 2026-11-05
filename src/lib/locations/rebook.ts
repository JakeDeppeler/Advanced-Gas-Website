import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";

// A village's visits rebooked to match a list: each unit onto the day, time
// and crew its line on the office's sheet gives it. The plan is worked out
// beforehand (which unit goes in which of the day's existing slots) and saved
// against the site, so it can be looked over on the site's page before
// anything moves, and applied a batch at a time: a fortnight of a village is
// ~190 visits and three ServiceTitan calls each, far more than one function's
// minute. Each visit's outcome is recorded as it lands, so a second press
// carries on from where the first stopped rather than doing any twice.

export type Move = {
  appt: number; unit: string; job: string | null;
  /** Where it is now, for the page to show. */
  fromStart: string; fromCrew: string;
  /** Where it goes: the slot's times, arrival window and techs. */
  start: string; end: string; aws: string; awe: string; techs: number[]; crew: string;
  change: "none" | "time" | "crew" | "both";
};
export type MoveDone = { at: string; ok: boolean; detail?: string };
export type RebookPlan = { title: string; made: string; moves: Move[]; done: Record<string, MoveDone> };

const key = (customerId: number) => `visit_plan_${customerId}`;

export async function loadPlan(customerId: number): Promise<RebookPlan | null> {
  const p = await getSettings<RebookPlan>(key(customerId)).catch(() => null);
  return p && Array.isArray(p.moves) ? { ...p, done: p.done ?? {} } : null;
}

type Live = { appointmentId: number; technicianId: number; active?: boolean };

const plain = (e: unknown) => {
  const m = (e as Error).message;
  if (/: 403\b/.test(m)) return "ServiceTitan refused: the API app needs write access to Job Planning › Appointments and Dispatch › Appointment assignments";
  return m.replace(/^ServiceTitan \S+ \S+ failed: /, "").slice(0, 200);
};

/**
 * Move these visits as the plan says: the new time and arrival window, then
 * the crew, adding before taking off so a failure halfway leaves a visit with
 * too many techs (which shows) rather than none. Who's on each is read live
 * first: the synced copy can be minutes behind.
 */
export async function applyMoves(customerId: number, appts: number[]): Promise<{ ok: boolean; error?: string; results: { appt: number; ok: boolean; detail?: string }[] }> {
  const plan = await loadPlan(customerId);
  if (!plan) return { ok: false, error: "There's no rebooking planned for this site.", results: [] };
  const want = new Set(appts);
  const moves = plan.moves.filter((m) => want.has(m.appt) && !plan.done[String(m.appt)]?.ok);
  if (!moves.length) return { ok: true, results: [] };

  const live = await stList<Live>("dispatch", "appointment-assignments", { appointmentIds: moves.map((m) => m.appt).join(","), active: "True" });
  const on = new Map<number, Set<number>>();
  for (const a of live) {
    if (a.active === false) continue;
    (on.get(a.appointmentId) ?? on.set(a.appointmentId, new Set()).get(a.appointmentId)!).add(a.technicianId);
  }

  const results: { appt: number; ok: boolean; detail?: string }[] = [];
  for (const m of moves) {
    try {
      if (m.change === "time" || m.change === "both") {
        await stSend("PATCH", stTenantPath("jpm", `appointments/${m.appt}/reschedule`), {
          start: m.start, end: m.end, arrivalWindowStart: m.aws, arrivalWindowEnd: m.awe,
        });
      }
      const now = on.get(m.appt) ?? new Set<number>();
      const add = m.techs.filter((t) => !now.has(t));
      const drop = [...now].filter((t) => !m.techs.includes(t));
      if (add.length) await stSend("POST", stTenantPath("dispatch", "appointment-assignments/assign-technicians"), { jobAppointmentId: m.appt, technicianIds: add });
      if (drop.length) await stSend("POST", stTenantPath("dispatch", "appointment-assignments/unassign-technicians"), { jobAppointmentId: m.appt, technicianIds: drop });
      results.push({ appt: m.appt, ok: true });
    } catch (e) {
      results.push({ appt: m.appt, ok: false, detail: plain(e) });
    }
  }

  // Read again before writing: another batch may have finished meanwhile.
  const fresh = (await loadPlan(customerId)) ?? plan;
  const at = new Date().toISOString();
  for (const r of results) fresh.done[String(r.appt)] = { at, ok: r.ok, ...(r.detail ? { detail: r.detail } : {}) };
  await saveSettings(key(customerId), fresh);
  return { ok: true, results };
}
