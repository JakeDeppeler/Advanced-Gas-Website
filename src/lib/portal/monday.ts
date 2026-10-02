import "server-only";
import {
  listVanChecks, listVehicleLogs, listVanPhotos, photoCounts,
  vehicleFor, type Vehicle,
} from "./db";
import { localToday } from "./xero";
import {
  WALKAROUND_GROUP, angleKey, doneCount, nextStep, thisWeek, weekSteps,
  type Step, type StepKey,
} from "@/components/portal/mondayJobs";
import { PHOTO_ANGLES, itemKey, type CheckItems } from "./vanChecks";

export type MondayWeek = {
  van: Vehicle | null;
  steps: Step[];
  done: number;
  next: StepKey;
  /** This week's weekly check, so the forms can open on what's already there. */
  weekly: { id: string; items: CheckItems; notes: string } | null;
  /** Which walk-around angles are already photographed. */
  shot: string[];
  stockItems: CheckItems | null;
  lastKm: { odometer: number; on: string } | null;
};

/**
 * Where this person's van is at this week.
 *
 * Reads the same three records the office fleet page reads, so the Monday
 * screen and the fleet table can never disagree about whether a van was
 * checked.
 */
export async function mondayWeek(userId: string | undefined): Promise<MondayWeek> {
  const today = localToday();
  const empty = (van: Vehicle | null): MondayWeek => {
    const steps = weekSteps({ weekly: null, photos: 0, stock: null, km: null, today });
    return { van, steps, done: doneCount(steps), next: nextStep(steps), weekly: null, shot: [], stockItems: null, lastKm: null };
  };

  if (!userId) return empty(null);
  const van = await vehicleFor(userId);
  if (!van) return empty(null);

  const [checks, logs] = await Promise.all([listVanChecks(van.id, undefined, 60), listVehicleLogs(van.id)]);
  const weekly = checks.find((c) => c.kind === "weekly") ?? null;
  const stock = checks.find((c) => c.kind === "stock") ?? null;
  const readings = logs.filter((l) => l.kind === "reading");
  const km = readings[0] ?? null;

  const weeklyThis = weekly && thisWeek(weekly.checkedOn, today) ? weekly : null;
  const counts = weeklyThis ? await photoCounts([weeklyThis.id]) : null;
  const photos = counts?.get(weeklyThis?.id ?? "") ?? 0;

  // Which angles specifically, so the grid can show five ticks and one camera
  // rather than "5 of 6" with no clue which one is missing.
  let shot: string[] = [];
  if (weeklyThis && photos > 0) {
    const rows = await listVanPhotos(weeklyThis.id);
    const keys = new Set(rows.map((r) => r.itemKey).filter(Boolean) as string[]);
    shot = PHOTO_ANGLES.filter((a) => keys.has(angleKey(a)));
  }

  const steps = weekSteps({
    weekly: weeklyThis ? { checkedOn: weeklyThis.checkedOn, items: weeklyThis.items } : null,
    photos,
    stock: stock && thisWeek(stock.checkedOn, today) ? { checkedOn: stock.checkedOn } : null,
    km: km ? { logDate: km.logDate, odometer: km.odometer } : null,
    today,
  });

  return {
    van,
    steps,
    done: doneCount(steps),
    next: nextStep(steps),
    weekly: weeklyThis ? { id: weeklyThis.id, items: weeklyThis.items, notes: weeklyThis.notes ?? "" } : null,
    shot,
    stockItems: stock && thisWeek(stock.checkedOn, today) ? stock.items : null,
    // The reading to compare today's against — last week's, not this week's.
    lastKm: (() => {
      const prior = readings.find((l) => !thisWeek(l.logDate, today) && l.odometer != null);
      return prior && prior.odometer != null ? { odometer: prior.odometer, on: prior.logDate } : null;
    })(),
  };
}

/** The tidy lines a tech ticked on the walk-around, for the van's own page. */
export const walkaroundTidy = (items: CheckItems, tidy: string[]) =>
  tidy.filter((t) => items[itemKey(WALKAROUND_GROUP, t)]?.state === "ok");
