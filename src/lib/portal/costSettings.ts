import "server-only";
import { getCapSettings, listVehicles, type Vehicle } from "./db";
import { vehicleFinance } from "@/components/portal/vehicleMath";
import { DEFAULT_SETTINGS, type CapSettings } from "./crew";

/** What the vans still on the road lose in value a year, from the Vehicles tab. */
export function fleetDepreciation(vehicles: Vehicle[]): number {
  return vehicles.filter((v) => v.status !== "off").reduce((a, v) => a + (vehicleFinance(v).annualDep ?? 0), 0);
}

export function withFleet(stored: CapSettings | null, vehicles: Vehicle[]): CapSettings {
  return { ...(stored ?? DEFAULT_SETTINGS), fleetDep: fleetDepreciation(vehicles) };
}

/**
 * The costing settings every screen should price from: what was saved on
 * Costs & capacity, with the vans' depreciation read fresh from the Vehicles
 * tab. One loader, so the hourly rate, the job calculator, targets and planning
 * can't end up carrying different overheads.
 */
export async function getCostSettings(): Promise<CapSettings> {
  const [stored, vehicles] = await Promise.all([getCapSettings(), listVehicles()]);
  return withFleet(stored, vehicles);
}
