import "server-only";
import { unstable_cache } from "next/cache";
import { stList } from "./servicetitan";

/**
 * ServiceTitan's marketing campaigns by id: what the office picks as "how did
 * you hear about us" when a job is booked. The job export carries only the
 * campaign's id, so the names are asked for here, and held for a day because
 * the list changes when someone adds a campaign, not by the hour. A failed
 * read throws, so it isn't held, and the next page asks again.
 */
const load = unstable_cache(async () => {
  const rows = await stList<{ id: number; name: string }>("marketing", "campaigns", {}, 5);
  return Object.fromEntries(rows.map((r) => [String(r.id), r.name]));
}, ["st-campaign-names"], { revalidate: 86_400 });

export async function campaignNames(): Promise<Record<string, string> | null> {
  try {
    return await load();
  } catch {
    return null;
  }
}
