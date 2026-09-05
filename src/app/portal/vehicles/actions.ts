"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import {
  createVehicle, updateVehicle, deleteVehicle,
  createVehicleLog, deleteVehicleLog, type VehicleLogKind, type VehicleStatus, type VehicleCondition,
  createVanCheck, createVanPhoto, deleteVanCheck, getVanPhoto, deleteVanPhotoRow,
} from "@/lib/portal/db";
import { uploadPhoto, deletePhoto } from "@/lib/portal/storage";
import type { CheckItems, CheckKind } from "@/lib/portal/vanChecks";

export type ActionResult = { ok: boolean; error?: string };

async function requireFleet() {
  const me = await getPortalUser();
  if (!me || !can(me, "vehicles")) return null;
  return me;
}

function reval(id?: string) {
  revalidatePath("/portal/vehicles");
  if (id) revalidatePath(`/portal/vehicles/${id}`);
}

export async function addVehicle(input: {
  name: string; rego: string; details: string;
  odometer: number | null; serviceIntervalKm: number | null;
  nextServiceKm: number | null; nextServiceDate: string;
  purchasePrice: number | null; resaleValue: number | null; lifespanYears: number | null; fuelPer100: number | null;
  amountOwing: number | null; status: VehicleStatus;
  purchasedOn: string; condition: VehicleCondition | null;
  serviceCost: number | null; kmYear: number | null; assignedTo: string;
}): Promise<ActionResult> {
  const me = await requireFleet();
  if (!me) return { ok: false, error: "Only a manager can add a vehicle." };
  if (!input.name.trim()) return { ok: false, error: "Give the vehicle a name." };
  // Next service defaults to one interval past the current reading, which is
  // what you'd work out by hand anyway.
  const nextServiceKm = input.nextServiceKm ?? (
    input.serviceIntervalKm !== null ? (input.odometer ?? 0) + input.serviceIntervalKm : null
  );
  const res = await createVehicle({
    name: input.name, rego: input.rego, details: input.details,
    odometer: input.odometer, serviceIntervalKm: input.serviceIntervalKm,
    nextServiceKm, nextServiceDate: input.nextServiceDate,
    purchasePrice: input.purchasePrice, resaleValue: input.resaleValue,
    lifespanYears: input.lifespanYears, fuelPer100: input.fuelPer100,
    amountOwing: input.amountOwing, status: input.status,
    purchasedOn: input.purchasedOn, condition: input.condition,
    serviceCost: input.serviceCost, kmYear: input.kmYear, assignedTo: input.assignedTo,
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "The database isn't connected yet." : "Couldn't add it." };
  reval();
  return { ok: true };
}

export async function saveVehicle(input: {
  id: string; name: string; rego: string; details: string;
  odometer: number | null; serviceIntervalKm: number | null;
  nextServiceKm: number | null; nextServiceDate: string; status: VehicleStatus;
  purchasePrice: number | null; resaleValue: number | null; lifespanYears: number | null; fuelPer100: number | null;
  amountOwing: number | null; purchasedOn: string; condition: VehicleCondition | null;
  serviceCost: number | null; kmYear: number | null; assignedTo: string;
}): Promise<ActionResult> {
  const me = await requireFleet();
  if (!me) return { ok: false, error: "Only a manager can edit a vehicle." };
  const res = await updateVehicle(input.id, {
    name: input.name, rego: input.rego, details: input.details,
    odometer: input.odometer, serviceIntervalKm: input.serviceIntervalKm,
    nextServiceKm: input.nextServiceKm, nextServiceDate: input.nextServiceDate, status: input.status,
    purchasePrice: input.purchasePrice, resaleValue: input.resaleValue, lifespanYears: input.lifespanYears, fuelPer100: input.fuelPer100,
    amountOwing: input.amountOwing, purchasedOn: input.purchasedOn, condition: input.condition,
    serviceCost: input.serviceCost, kmYear: input.kmYear, assignedTo: input.assignedTo,
  });
  if (!res.ok) return { ok: false, error: "Couldn't save." };
  reval(input.id);
  return { ok: true };
}

export async function removeVehicle(input: { id: string }): Promise<ActionResult> {
  const me = await requireFleet();
  if (!me) return { ok: false, error: "Only a manager can remove a vehicle." };
  const res = await deleteVehicle(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove it." };
  reval();
  return { ok: true };
}

export async function addLog(input: {
  vehicleId: string; kind: VehicleLogKind; logDate: string;
  odometer: number | null; cost: number | null; litres: number | null; detail: string;
}): Promise<ActionResult> {
  // Anyone signed in can log fuel, a km reading, damage or a service.
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Not signed in." };
  if (!input.detail.trim() && input.odometer === null && input.cost === null && input.litres === null) {
    return { ok: false, error: "Add a note or a number." };
  }
  const res = await createVehicleLog({
    vehicleId: input.vehicleId, kind: input.kind, logDate: input.logDate || undefined,
    odometer: input.odometer, cost: input.cost, litres: input.litres, detail: input.detail, createdBy: me.name,
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "The database isn't connected yet." : "Couldn't save the entry." };
  reval(input.vehicleId);
  return { ok: true };
}

export async function removeLog(input: { id: string; vehicleId: string }): Promise<ActionResult> {
  const me = await requireFleet();
  if (!me) return { ok: false, error: "Only a manager can delete a log entry." };
  const res = await deleteVehicleLog(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't delete it." };
  reval(input.vehicleId);
  return { ok: true };
}


/* ---------------- van stock & check sheets ---------------- */

/**
 * Anyone signed in can complete a check — that's the point of it being the
 * tech's own ten minutes before they leave. Only a fleet manager deletes one,
 * so a bad morning can't be quietly erased.
 */
export async function saveVanCheck(input: {
  vehicleId: string; kind: CheckKind; checkedOn: string; notes: string; items: CheckItems;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Not signed in." };
  const res = await createVanCheck({
    vehicleId: input.vehicleId, kind: input.kind, checkedOn: input.checkedOn,
    checkedBy: me.name, notes: input.notes, items: input.items,
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "The database isn't connected yet." : "Couldn't save the check." };
  reval(input.vehicleId);
  revalidatePath(`/portal/vehicles/${input.vehicleId}/checks`);
  return { ok: true, id: res.id };
}

export async function removeVanCheck(input: { id: string; vehicleId: string }): Promise<ActionResult> {
  const me = await requireFleet();
  if (!me) return { ok: false, error: "Only a manager can delete a check." };
  const res = await deleteVanCheck(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't delete it." };
  reval(input.vehicleId);
  revalidatePath(`/portal/vehicles/${input.vehicleId}/checks`);
  return { ok: true };
}

/** Photos arrive already resized in the browser, so this only stores them. */
export async function uploadVanPhoto(form: FormData): Promise<ActionResult> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Not signed in." };

  const checkId = String(form.get("checkId") || "");
  const vehicleId = String(form.get("vehicleId") || "");
  const label = String(form.get("label") || "");
  const itemKey = String(form.get("itemKey") || "");
  const file = form.get("photo");
  if (!checkId || !vehicleId || !(file instanceof File)) return { ok: false, error: "Nothing to upload." };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { ok: false, error: "Photos only." };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "That photo is too big." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${vehicleId}/${checkId}/${crypto.randomUUID()}.${ext}`;
  const up = await uploadPhoto(path, await file.arrayBuffer(), file.type);
  if (!up.ok) return { ok: false, error: up.error === "not-configured" ? "Photo storage isn't set up." : "Couldn't upload it." };

  const row = await createVanPhoto({ checkId, vehicleId, path, label, itemKey });
  if (!row.ok) {
    // Don't leave the file orphaned in the bucket if the row didn't land.
    await deletePhoto(path);
    return { ok: false, error: "Couldn't save the photo." };
  }
  revalidatePath(`/portal/vehicles/${vehicleId}/checks`);
  return { ok: true };
}

export async function removeVanPhoto(input: { id: string; vehicleId: string }): Promise<ActionResult> {
  const me = await requireFleet();
  if (!me) return { ok: false, error: "Only a manager can delete a photo." };
  const photo = await getVanPhoto(input.id);
  if (!photo) return { ok: false, error: "Already gone." };
  await deletePhoto(photo.path);
  const res = await deleteVanPhotoRow(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't delete it." };
  revalidatePath(`/portal/vehicles/${input.vehicleId}/checks`);
  return { ok: true };
}
