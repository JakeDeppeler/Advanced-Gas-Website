"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { markSorted } from "@/lib/email/read";

export type SortedResult = { ok: boolean; error?: string };

/**
 * Mark one undelivered email as dealt with.
 *
 * This is the only thing that takes the wall board's email alert down, which
 * is deliberate: a bounce has no state of its own that comes good later, so
 * either a person says they have handled it or the light stays on for ever.
 * It does not claim the email was re-sent or the customer was rung — only
 * that somebody looked. That is the most a button can honestly mean.
 */
export async function sorted(id: string): Promise<SortedResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Managers only." };
  try {
    await markSorted(id, me.name);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/portal/email");
  return { ok: true };
}
