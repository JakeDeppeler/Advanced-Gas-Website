"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import {
  createVehicle, updateVehicle, deleteVehicle,
  createVehicleLog, deleteVehicleLog, type VehicleLogKind, type VehicleStatus,
} from "@/lib/portal/db";

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
  amountOwing: number | null;
}): Promise<ActionResult> {
  const me = await requireFleet();
  if (!me) return { ok: false, error: "Only a manager can edit a vehicle." };
  const res = await updateVehicle(input.id, {
    name: input.name, rego: input.rego, details: input.details,
    odometer: input.odometer, serviceIntervalKm: input.serviceIntervalKm,
    nextServiceKm: input.nextServiceKm, nextServiceDate: input.nextServiceDate, status: input.status,
    purchasePrice: input.purchasePrice, resaleValue: input.resaleValue, lifespanYears: input.lifespanYears, fuelPer100: input.fuelPer100,
    amountOwing: input.amountOwing,
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
