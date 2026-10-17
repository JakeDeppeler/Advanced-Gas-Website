import "server-only";
import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { getSettings, saveSettings } from "./db";
import { normaliseBusiness, type Business } from "./businessTypes";

/**
 * The business's settings, once per request: the side bar, Home and the page
 * guard in the shell all ask, and one read answers them all. A failed read is
 * the defaults — everything on — never a portal with its sections missing.
 */
// Held between requests too: it's read before anything else on every page and
// changes only when someone saves Settings, which clears it. Without this it
// was a round trip every page waited on before it could start on its own data.
const stored = unstable_cache(async () => getSettings<unknown>("business").catch(() => null), ["portal-business"], { tags: ["portal-business"], revalidate: 300 });

export const getBusiness = cache(async (): Promise<Business> => {
  return normaliseBusiness(await stored().catch(() => null));
});

export async function saveBusiness(b: Business): Promise<{ ok: boolean; error?: string }> {
  const r = await saveSettings("business", normaliseBusiness(b));
  if (r.ok) revalidateTag("portal-business");
  return r;
}
