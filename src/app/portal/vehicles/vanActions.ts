"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { addTool, deleteTool, getTool, replyTool, setOrderStatus, setReportStatus, updateTool, type ToolInput } from "@/lib/portal/van";
import { answerLeave, markTake5Seen } from "@/lib/portal/people";
import { TOOL_KINDS, type PartStatus, type ReportStatus } from "@/lib/portal/vanParts";

export type OfficeResult = { ok: boolean; error?: string };

const uuid = /^[0-9a-f-]{36}$/i;
const day = /^\d{4}-\d{2}-\d{2}$/;

async function fleetUser() {
  const me = await getPortalUser();
  return me && can(me, "vehicles") ? me : null;
}

function reval(vehicleId?: string | null) {
  for (const p of ["/portal", "/portal/vehicles", "/portal/requests", "/portal/stock", "/trade", "/trade/van", "/trade/van/report", "/trade/van/parts", "/trade/van/tools"]) revalidatePath(p);
  if (vehicleId) revalidatePath(`/portal/vehicles/${vehicleId}`);
}

/** The office's answer on a damage or service report: with us, booked, quoting, fixed. */
export async function answerReport(input: { id: string; vehicleId: string; status: Exclude<ReportStatus, null>; note: string }): Promise<OfficeResult> {
  const me = await fleetUser();
  if (!me) return { ok: false, error: "Only the fleet manager can answer this." };
  if (!uuid.test(input.id) || !["open", "booked", "quote", "fixed"].includes(input.status)) return { ok: false, error: "Unknown report." };
  try {
    await setReportStatus(input.id, input.status, input.note.trim().slice(0, 60) || null);
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  reval(input.vehicleId);
  return { ok: true };
}

export async function answerOrder(input: { id: string; vehicleId: string | null; status: PartStatus; note: string }): Promise<OfficeResult> {
  const me = await fleetUser();
  if (!me) return { ok: false, error: "Only the fleet manager can answer this." };
  if (!uuid.test(input.id) || !["requested", "ordered", "ready", "done", "cancelled"].includes(input.status)) return { ok: false, error: "Unknown order." };
  try {
    await setOrderStatus(input.id, input.status, input.note.trim().slice(0, 60) || null);
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  reval(input.vehicleId);
  return { ok: true };
}

function cleanTool(t: Partial<ToolInput>): ToolInput | string {
  const name = (t.name ?? "").trim().slice(0, 80);
  if (!name) return "Give the tool a name.";
  const d = (v: string | null | undefined) => (v && day.test(v) ? v : null);
  const life = t.lifeYears == null ? null : Number(t.lifeYears);
  return {
    name, model: (t.model ?? "").trim().slice(0, 80) || null,
    kind: TOOL_KINDS.some((k) => k.k === t.kind) ? t.kind! : "other",
    boughtOn: d(t.boughtOn), lifeYears: life != null && Number.isFinite(life) && life > 0 ? Math.min(life, 50) : null,
    lastDoneOn: d(t.lastDoneOn), lastDone: (t.lastDone ?? "").trim().slice(0, 40) || null,
    nextDueOn: d(t.nextDueOn), nextDue: (t.nextDue ?? "").trim().slice(0, 40) || null,
  };
}

export async function saveTool(input: { vehicleId: string; id?: string; tool: Partial<ToolInput> }): Promise<OfficeResult> {
  const me = await fleetUser();
  if (!me) return { ok: false, error: "Only the fleet manager can change the register." };
  if (!uuid.test(input.vehicleId)) return { ok: false, error: "Unknown van." };
  const t = cleanTool(input.tool);
  if (typeof t === "string") return { ok: false, error: t };
  try {
    if (input.id) {
      const existing = await getTool(input.id);
      if (!existing || existing.vehicleId !== input.vehicleId) return { ok: false, error: "That tool isn't on this van." };
      await updateTool(input.id, t);
    } else {
      await addTool(input.vehicleId, t);
    }
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  reval(input.vehicleId);
  return { ok: true };
}

export async function removeTool(input: { id: string; vehicleId: string }): Promise<OfficeResult> {
  const me = await fleetUser();
  if (!me) return { ok: false, error: "Only the fleet manager can change the register." };
  const existing = uuid.test(input.id) ? await getTool(input.id) : null;
  if (!existing || existing.vehicleId !== input.vehicleId) return { ok: false, error: "That tool isn't on this van." };
  try { await deleteTool(input.id); } catch { return { ok: false, error: "Couldn't remove it." }; }
  reval(input.vehicleId);
  return { ok: true };
}

/** Answer a tech's ask about a tool. "Done" closes it; a service or tag done stamps today as the last one. */
export async function answerTool(input: { id: string; vehicleId: string; reply: string; done: boolean }): Promise<OfficeResult> {
  const me = await fleetUser();
  if (!me) return { ok: false, error: "Only the fleet manager can answer this." };
  const existing = uuid.test(input.id) ? await getTool(input.id) : null;
  if (!existing || existing.vehicleId !== input.vehicleId) return { ok: false, error: "That tool isn't on this van." };
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
  try {
    await replyTool(input.id, input.reply.trim().slice(0, 60) || null,
      input.done ? { on: today, what: existing.request === "service" ? "Serviced" : null } : null);
  } catch {
    return { ok: false, error: "Couldn't save." };
  }
  reval(input.vehicleId);
  return { ok: true };
}

/* ---------------------------------------------------------------- people */

async function managerUser() {
  const me = await getPortalUser();
  return me && (can(me, "manage_users") || can(me, "overhead")) ? me : null;
}

export async function decideLeave(input: { id: string; status: "approved" | "declined" }): Promise<OfficeResult> {
  const me = await managerUser();
  if (!me) return { ok: false, error: "Only a manager can answer leave." };
  if (!uuid.test(input.id) || !["approved", "declined"].includes(input.status)) return { ok: false, error: "Unknown request." };
  try { await answerLeave(input.id, input.status, me.name); } catch { return { ok: false, error: "Couldn't save." }; }
  revalidatePath("/portal"); revalidatePath("/portal/requests"); revalidatePath("/trade"); revalidatePath("/trade/me");
  return { ok: true };
}

export async function readIncident(input: { id: string }): Promise<OfficeResult> {
  const me = await managerUser();
  if (!me) return { ok: false, error: "Only a manager can mark this read." };
  if (!uuid.test(input.id)) return { ok: false, error: "Unknown report." };
  try { await markTake5Seen(input.id, me.name); } catch { return { ok: false, error: "Couldn't save." }; }
  revalidatePath("/portal"); revalidatePath("/portal/requests"); revalidatePath("/trade/take5");
  return { ok: true };
}
