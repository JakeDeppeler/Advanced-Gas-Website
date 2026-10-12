import "server-only";
import { cache } from "react";
import { getSettings, saveSettings } from "./db";
import { normaliseGoals, type Goals } from "./goalsTypes";

/** The KPI goals, once per request. A failed read is the defaults, never no goals at all. */
export const getGoals = cache(async (): Promise<Goals> => normaliseGoals(await getSettings<unknown>("goals").catch(() => null)));

export async function saveGoals(g: Goals) {
  return saveSettings("goals", normaliseGoals(g));
}
