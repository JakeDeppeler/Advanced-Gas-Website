import "server-only";
import { vehicleFor, checksBy, getVehicle, photoCounts } from "./db";
import { actions, shortfalls } from "./vanChecks";
import type { PersonVanView } from "@/components/portal/PersonVan";

const when = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

/**
 * The van someone is signed to, and the checks they've completed — gathered
 * once so their own file and the one a manager opens show the same thing.
 */
export async function personVan(userId: string, name: string): Promise<PersonVanView> {
  const [van, raw] = await Promise.all([vehicleFor(userId), checksBy(name, 12)]);

  const names = new Map<string, string>();
  if (van) names.set(van.id, van.name);
  for (const c of raw) {
    if (names.has(c.vehicleId)) continue;
    names.set(c.vehicleId, (await getVehicle(c.vehicleId))?.name ?? "A van");
  }
  const photos = await photoCounts(raw.map((c) => c.id));

  return {
    van: van ? { id: van.id, name: van.name, rego: van.rego } : null,
    checks: raw.map((c) => ({
      id: c.id, kind: c.kind, when: when(c.checkedOn),
      vehicleId: c.vehicleId, vehicleName: names.get(c.vehicleId) ?? "A van",
      flags: actions(c.kind, c.items).length + shortfalls(c.kind, c.items).length,
      photos: photos.get(c.id) ?? 0,
    })),
  };
}
