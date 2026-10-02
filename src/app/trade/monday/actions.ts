"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import {
  createVanCheck, createVanPhoto, createVehicleLog, listVanChecks,
  updateVanCheck, vehicleFor,
} from "@/lib/portal/db";
import { uploadPhoto, deletePhoto } from "@/lib/portal/storage";
import { actions as tickActions, shortfalls, type CheckItems, type CheckKind } from "@/lib/portal/vanChecks";
import { isoDay, thisWeek } from "@/components/portal/mondayJobs";
import { localToday } from "@/lib/portal/xero";

export type MondayResult = { ok: boolean; error?: string; flagged?: number };

/** The van signed to whoever is asking. Nobody writes a check against a van
 *  that isn't theirs from here — the fleet page is where that happens. */
async function myVan() {
  const me = await getPortalUser();
  if (!me?.id) return null;
  const van = await vehicleFor(me.id);
  return van ? { me, van } : null;
}

function reval(vehicleId: string) {
  revalidatePath("/trade");
  revalidatePath("/trade/monday");
  revalidatePath("/trade/van");
  revalidatePath("/portal/vehicles");
  revalidatePath(`/portal/vehicles/${vehicleId}`);
  revalidatePath(`/portal/vehicles/${vehicleId}/checks`);
}

/**
 * Find this week's sheet of a kind, or start one.
 *
 * Each of the four Monday steps commits as it is finished, so a tech who takes
 * the photos and then gets called to a job keeps them. The steps that belong to
 * the same sheet merge into the one row rather than writing a second — and only
 * while it is still this week's, so nothing older is ever reopened.
 */
async function sheet(vehicleId: string, kind: CheckKind, checkedBy: string): Promise<{ id: string; items: CheckItems } | null> {
  const today = localToday();
  const existing = (await listVanChecks(vehicleId, kind, 10)).find((c) => thisWeek(c.checkedOn, today));
  if (existing) return { id: existing.id, items: existing.items };
  const made = await createVanCheck({ vehicleId, kind, checkedOn: isoDay(today), checkedBy, notes: "", items: {} });
  return made.ok && made.id ? { id: made.id, items: {} } : null;
}

/** Step 1 and 2: the walk-around's tidy lines, and the weekly check's ticks. */
export async function saveWeekly(input: { items: CheckItems; notes: string }): Promise<MondayResult> {
  const mine = await myVan();
  if (!mine) return { ok: false, error: "No van is signed to you yet. Ask the office." };
  const s = await sheet(mine.van.id, "weekly", mine.me.name);
  if (!s) return { ok: false, error: "Couldn't start this week's check." };
  const items = { ...s.items, ...input.items };
  const res = await updateVanCheck(s.id, { items, notes: input.notes || null });
  if (!res.ok) return { ok: false, error: "Couldn't save the check." };
  reval(mine.van.id);
  return { ok: true, flagged: tickActions("weekly", items).length };
}

/** Step 3: the stock count, on its own sheet because it is its own list. */
export async function saveStock(input: { items: CheckItems }): Promise<MondayResult> {
  const mine = await myVan();
  if (!mine) return { ok: false, error: "No van is signed to you yet. Ask the office." };
  const s = await sheet(mine.van.id, "stock", mine.me.name);
  if (!s) return { ok: false, error: "Couldn't start this week's count." };
  const items = { ...s.items, ...input.items };
  const res = await updateVanCheck(s.id, { items });
  if (!res.ok) return { ok: false, error: "Couldn't save the count." };
  reval(mine.van.id);
  return { ok: true, flagged: shortfalls("stock", items).length };
}

/** Step 4: the odometer, which goes in the van's log like any other reading. */
export async function saveKm(input: { odometer: number }): Promise<MondayResult> {
  const mine = await myVan();
  if (!mine) return { ok: false, error: "No van is signed to you yet. Ask the office." };
  if (!Number.isFinite(input.odometer) || input.odometer <= 0) return { ok: false, error: "Put the number off the dash in." };
  const res = await createVehicleLog({
    vehicleId: mine.van.id, kind: "reading", logDate: isoDay(localToday()),
    odometer: Math.round(input.odometer), cost: null, litres: null,
    detail: "Monday reading", createdBy: mine.me.name,
  });
  if (!res.ok) return { ok: false, error: "Couldn't save the reading." };
  reval(mine.van.id);
  return { ok: true };
}

/** A walk-around photo, attached to this week's weekly check. */
export async function saveWalkaroundPhoto(form: FormData): Promise<MondayResult> {
  const mine = await myVan();
  if (!mine) return { ok: false, error: "No van is signed to you yet. Ask the office." };

  const label = String(form.get("label") || "");
  const key = String(form.get("itemKey") || "");
  const file = form.get("photo");
  if (!label || !key || !(file instanceof File)) return { ok: false, error: "Nothing to upload." };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { ok: false, error: "Photos only." };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "That photo is too big." };

  const s = await sheet(mine.van.id, "weekly", mine.me.name);
  if (!s) return { ok: false, error: "Couldn't start this week's check." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${mine.van.id}/${s.id}/${crypto.randomUUID()}.${ext}`;
  const up = await uploadPhoto(path, await file.arrayBuffer(), file.type);
  if (!up.ok) return { ok: false, error: up.error === "not-configured" ? "Photo storage isn't set up." : "Couldn't upload it." };

  const row = await createVanPhoto({ checkId: s.id, vehicleId: mine.van.id, path, label, itemKey: key });
  if (!row.ok) {
    // Don't leave the file orphaned in the bucket if the row didn't land.
    await deletePhoto(path);
    return { ok: false, error: "Couldn't save the photo." };
  }
  reval(mine.van.id);
  return { ok: true };
}

/** Raise a service request or report damage on your own van. */
export async function raiseVanIssue(input: {
  kind: "service" | "damage"; what: string; urgency: string; detail: string;
}): Promise<MondayResult> {
  const mine = await myVan();
  if (!mine) return { ok: false, error: "No van is signed to you yet. Ask the office." };
  if (!input.what.trim() && !input.detail.trim()) return { ok: false, error: "Say what's wrong." };
  const head = [input.what.trim(), input.urgency.trim()].filter(Boolean).join(" · ");
  const res = await createVehicleLog({
    vehicleId: mine.van.id, kind: input.kind, logDate: isoDay(localToday()),
    odometer: null, cost: null, litres: null,
    detail: [head, input.detail.trim()].filter(Boolean).join(" — "),
    createdBy: mine.me.name,
  });
  if (!res.ok) return { ok: false, error: "Couldn't send it." };
  reval(mine.van.id);
  return { ok: true };
}
