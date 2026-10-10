import "server-only";
import { getSettings } from "./db";
import { normaliseGrowth, type Growth } from "./growthTypes";

/** The new van and the markups, as saved on Our numbers. */
export async function getGrowth(): Promise<Growth> {
  return normaliseGrowth(await getSettings<unknown>("growth").catch(() => null));
}
