"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import {
  createVanCheck, createVanPhoto, createVehicleLog, listVanChecks, updateVanCheck, vehicleFor,
} from "@/lib/portal/db";
import { uploadPhoto, deletePhoto } from "@/lib/portal/storage";
import { VEHICLE_ITEMS, shortfalls, vehicleKey, type CheckItems, type CheckKind } from "@/lib/portal/vanChecks";
import { FUEL_LEVELS, SENT_KEY, isoDay, thisWeek } from "@/components/portal/mondayJobs";
import { localToday } from "@/lib/portal/xero";
import { addReportPhoto, createOrder, createReport, getTool, requestTool } from "@/lib/portal/van";
import { listStock, moveStock } from "@/lib/portal/stock";
import { VAN_AREAS, type PartLine, type ToolRequest } from "@/lib/portal/vanParts";

export type VanResult = { ok: boolean; error?: string; flagged?: number };

/** The van signed to whoever is asking. Nobody writes against a van that
 *  isn't theirs from here — the office's fleet page is where that happens. */
async function myVan() {
  const me = await getPortalUser();
  if (!me?.id) return null;
  const van = await vehicleFor(me.id);
  return van ? { me, van } : null;
}

const NO_VAN = { ok: false, error: "No van is signed to you yet. Ask the office." };

function reval(vehicleId: string) {
  for (const p of ["/trade", "/trade/van", "/trade/van/check", "/trade/van/report", "/trade/van/parts", "/trade/van/tools", "/portal", "/portal/vehicles"]) {
    revalidatePath(p);
  }
  revalidatePath(`/portal/vehicles/${vehicleId}`);
}

/**
 * Find this week's sheet of a kind, or start one.
 *
 * Each step commits as it is finished, so a tech who takes the photos and then
 * gets called to a job keeps them. Steps that belong to the same sheet merge
 * into the one row — and only while it is still this week's, so nothing older
 * is ever reopened.
 */
async function sheet(vehicleId: string, kind: CheckKind, checkedBy: string): Promise<{ id: string; items: CheckItems } | null> {
  const today = localToday();
  const existing = (await listVanChecks(vehicleId, kind, 10)).find((c) => thisWeek(c.checkedOn, today));
  if (existing) return { id: existing.id, items: existing.items };
  const made = await createVanCheck({ vehicleId, kind, checkedOn: isoDay(today), checkedBy, notes: "", items: {} });
  return made.ok && made.id ? { id: made.id, items: {} } : null;
}

/** Photos, clean & tidy and the vehicle check all write to the weekly sheet. */
export async function saveWeekly(input: { items: CheckItems }): Promise<VanResult> {
  const mine = await myVan();
  if (!mine) return NO_VAN;
  const s = await sheet(mine.van.id, "weekly", mine.me.name);
  if (!s) return { ok: false, error: "Couldn't start this week's check." };
  // A line already sent to the office keeps its report id however it's re-saved.
  const items: CheckItems = { ...s.items };
  for (const [k, v] of Object.entries(input.items)) items[k] = { ...v, reported: s.items[k]?.reported ?? v.reported };
  delete items[SENT_KEY];
  if (s.items[SENT_KEY]) items[SENT_KEY] = s.items[SENT_KEY];
  const res = await updateVanCheck(s.id, { items });
  if (!res.ok) return { ok: false, error: "Couldn't save the check." };
  reval(mine.van.id);
  return { ok: true };
}

export async function saveStock(input: { items: CheckItems }): Promise<VanResult> {
  const mine = await myVan();
  if (!mine) return NO_VAN;
  const s = await sheet(mine.van.id, "stock", mine.me.name);
  if (!s) return { ok: false, error: "Couldn't start this week's count." };
  const items = { ...s.items, ...input.items };
  const res = await updateVanCheck(s.id, { items });
  if (!res.ok) return { ok: false, error: "Couldn't save the count." };
  reval(mine.van.id);
  return { ok: true, flagged: shortfalls("stock", items).length };
}

/** The odometer goes in the van's log like any other reading; the tank rides along in its note. */
export async function saveKm(input: { odometer: number; fuel: string | null }): Promise<VanResult> {
  const mine = await myVan();
  if (!mine) return NO_VAN;
  if (!Number.isFinite(input.odometer) || input.odometer <= 0) return { ok: false, error: "Put the number off the dash in." };
  const fuel = input.fuel && FUEL_LEVELS.includes(input.fuel) ? input.fuel : null;
  const res = await createVehicleLog({
    vehicleId: mine.van.id, kind: "reading", logDate: isoDay(localToday()),
    odometer: Math.round(input.odometer), cost: null, litres: null,
    detail: ["Monday reading", fuel].filter(Boolean).join(" · "), createdBy: mine.me.name,
  });
  if (!res.ok) return { ok: false, error: "Couldn't save the reading." };
  reval(mine.van.id);
  return { ok: true };
}

/** A walk-around photo, or a photo of a flagged line, on this week's weekly check. */
export async function saveCheckPhoto(form: FormData): Promise<VanResult> {
  const mine = await myVan();
  if (!mine) return NO_VAN;
  const label = String(form.get("label") || "").slice(0, 80);
  const key = String(form.get("itemKey") || "").slice(0, 160);
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
    await deletePhoto(path);
    return { ok: false, error: "Couldn't save the photo." };
  }
  reval(mine.van.id);
  return { ok: true };
}

/**
 * Send the week's check to the office.
 *
 * Every vehicle-check line marked as needing a look becomes a service request
 * on the van — the list the office already works from — carrying the tech's
 * note and whether it can still be driven. Sending twice doesn't raise a line
 * twice: the request's id is written back onto the line.
 */
export async function sendWeekly(): Promise<VanResult> {
  const mine = await myVan();
  if (!mine) return NO_VAN;
  const s = await sheet(mine.van.id, "weekly", mine.me.name);
  if (!s) return { ok: false, error: "Couldn't find this week's check." };
  const items: CheckItems = { ...s.items };
  const today = isoDay(localToday());
  let raised = 0;
  try {
    for (const item of VEHICLE_ITEMS) {
      const k = vehicleKey(item);
      const e = items[k];
      if (e?.state !== "action" || e.reported) continue;
      const id = await createReport({
        vehicleId: mine.van.id, kind: "service", on: today, title: item,
        detail: e.note?.trim() || "", drivable: e.drive ?? null, source: "weekly", createdBy: mine.me.name,
      });
      items[k] = { ...e, reported: id };
      raised += 1;
    }
  } catch {
    return { ok: false, error: "Couldn't send the flagged lines to the office." };
  }
  items[SENT_KEY] = { state: "ok", note: new Date().toISOString() };
  const res = await updateVanCheck(s.id, { items });
  if (!res.ok) return { ok: false, error: "Couldn't send it." };
  reval(mine.van.id);
  return { ok: true, flagged: raised };
}

/* ---------------------------------------------------------------- reports */

/**
 * Damage, or a service or fault, from the driveway. The photos go up with it
 * and land on the same report the office reads.
 */
export async function sendReport(form: FormData): Promise<VanResult> {
  const mine = await myVan();
  if (!mine) return NO_VAN;
  const kind = form.get("kind") === "damage" ? "damage" : "service";
  const what = String(form.get("what") || "").trim().slice(0, 1000);
  const title = String(form.get("title") || "").trim().slice(0, 120);
  const area = String(form.get("area") || "");
  const yn = (k: string) => (form.get(k) === "yes" ? true : form.get(k) === "no" ? false : null);
  if (!what && !title) return { ok: false, error: kind === "damage" ? "Say what happened." : "Say what needs doing." };

  const head = title || what.split(/[.\n]/)[0].slice(0, 80);
  let id: string;
  try {
    id = await createReport({
      vehicleId: mine.van.id, kind, on: isoDay(localToday()), title: head, detail: what,
      area: VAN_AREAS.includes(area) ? area : null, drivable: yn("drivable"), thirdParty: kind === "damage" ? yn("third") : null,
      createdBy: mine.me.name,
    });
  } catch {
    return { ok: false, error: "Couldn't send it." };
  }

  const photos = form.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 4);
  let failed = 0;
  for (const [i, file] of photos.entries()) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) { failed += 1; continue; }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${mine.van.id}/log-${id}/${crypto.randomUUID()}.${ext}`;
    const up = await uploadPhoto(path, await file.arrayBuffer(), file.type);
    if (!up.ok) { failed += 1; continue; }
    try {
      await addReportPhoto({ logId: id, vehicleId: mine.van.id, path, label: `Photo ${i + 1}` });
    } catch {
      await deletePhoto(path);
      failed += 1;
    }
  }
  reval(mine.van.id);
  // The report itself is in either way; say so rather than calling it a failure.
  return failed ? { ok: true, error: `Sent, but ${failed === 1 ? "one photo" : `${failed} photos`} didn't upload.` } : { ok: true };
}

/* ---------------------------------------------------------------- parts */

export async function sendOrder(input: {
  forWhat: "van" | "job"; job: string; lines: PartLine[]; deliver: "factory" | "pickup";
  neededBy: "today" | "tomorrow" | "week"; note: string;
}): Promise<VanResult> {
  const me = await getPortalUser();
  if (!me?.id) return { ok: false, error: "Sign in again." };
  const van = await vehicleFor(me.id).catch(() => null);
  const lines = input.lines
    .map((l) => ({ item: String(l.item).trim().slice(0, 120), qty: Math.max(1, Math.min(999, Math.round(Number(l.qty)))) }))
    .filter((l) => l.item && Number.isFinite(l.qty))
    .slice(0, 60);
  if (!lines.length) return { ok: false, error: "Nothing on the order yet." };
  if (input.forWhat === "job" && !input.job.trim()) return { ok: false, error: "Which job is it for?" };
  try {
    await createOrder({
      vehicleId: van?.id ?? null, requestedBy: me.name, requestedById: me.id,
      forWhat: input.forWhat === "job" ? "job" : "van", job: input.forWhat === "job" ? input.job.trim().slice(0, 120) : null,
      lines, deliver: input.deliver === "pickup" ? "pickup" : "factory",
      neededBy: (["today", "tomorrow", "week"] as const).includes(input.neededBy) ? input.neededBy : "week",
      note: input.note.trim().slice(0, 500) || null,
    });
  } catch {
    return { ok: false, error: "Couldn't send the order." };
  }
  if (van) reval(van.id);
  revalidatePath("/portal");
  return { ok: true };
}

/* ---------------------------------------------------------------- tools */

export async function askAboutTool(input: { toolId: string; request: ToolRequest; note: string }): Promise<VanResult> {
  const mine = await myVan();
  if (!mine) return NO_VAN;
  if (!/^[0-9a-f-]{36}$/i.test(input.toolId)) return { ok: false, error: "No such tool." };
  if (!["broken", "service", "replace"].includes(input.request)) return { ok: false, error: "Say what's up with it." };
  const tool = await getTool(input.toolId);
  // Only a tool on your own van.
  if (!tool || tool.vehicleId !== mine.van.id) return { ok: false, error: "That tool isn't on your van." };
  try {
    await requestTool(tool.id, input.request, input.note.trim().slice(0, 500) || null, mine.me.name);
  } catch {
    return { ok: false, error: "Couldn't send it." };
  }
  reval(mine.van.id);
  return { ok: true };
}

/* ---------------------------------------------------------------- factory */

/**
 * Take things off the factory shelf. Who took it is the signed-in person, and
 * where it went is what they picked — their van, or a job.
 */
export async function takeFromFactory(input: { lines: { itemId: string; qty: number }[]; forWhat: string }): Promise<VanResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  const shelf = await listStock();
  if (!shelf) return { ok: false, error: "The factory list can't be read right now." };
  const known = new Set(shelf.map((i) => i.id));
  const lines = input.lines.filter((l) => known.has(l.itemId) && Number.isFinite(l.qty) && l.qty > 0).slice(0, 40);
  if (!lines.length) return { ok: false, error: "Nothing picked yet." };
  const forWhat = input.forWhat.trim().slice(0, 120) || "Van";
  try {
    for (const l of lines) await moveStock({ itemId: l.itemId, change: -Math.round(l.qty), reason: "taken", who: me.name, forWhat });
  } catch {
    return { ok: false, error: "Couldn't log all of it. Check the list and try the rest." };
  }
  revalidatePath("/trade/stock");
  revalidatePath("/portal/stock");
  revalidatePath("/portal");
  return { ok: true };
}
