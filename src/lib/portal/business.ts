import "server-only";
import { cache } from "react";
import { getSettings, saveSettings } from "./db";
import { normaliseBusiness, type Business } from "./businessTypes";

/**
 * The business's settings, once per request: the side bar, Home and the page
 * guard in the shell all ask, and one read answers them all. A failed read is
 * the defaults — everything on — never a portal with its sections missing.
 */
export const getBusiness = cache(async (): Promise<Business> => {
  return normaliseBusiness(await getSettings<unknown>("business").catch(() => null));
});

export async function saveBusiness(b: Business): Promise<{ ok: boolean; error?: string }> {
  return saveSettings("business", normaliseBusiness(b));
}
