"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveHandbookBody } from "@/lib/portal/db";
import { HANDBOOK } from "@/lib/portal/content";

export type HandbookResult = { ok: boolean; error?: string };

/**
 * Write a handbook topic.
 *
 * Gated on managing users rather than on a capability of its own: the handbook
 * is company policy, and the people who can change what everyone else is told
 * are the people who can already change who everyone is.
 */
export async function saveTopic(input: {
  shelf: string; title: string; body: string;
}): Promise<HandbookResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "manage_users")) return { ok: false, error: "Only an admin can write the handbook." };

  // The contents list is the spine: a body only attaches to a topic that is
  // actually on a shelf, so a typo in the URL can't create a phantom entry.
  const shelf = HANDBOOK.find((s) => s.letter === input.shelf);
  if (!shelf || !shelf.items.some((i) => i.title === input.title)) {
    return { ok: false, error: "That topic isn't on the shelf." };
  }

  const res = await saveHandbookBody({
    shelf: input.shelf, title: input.title, body: input.body, updatedBy: me.name,
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "The database isn't connected." : "Couldn't save it." };

  revalidatePath(`/portal/handbook/${input.shelf.toLowerCase()}`);
  revalidatePath("/portal/handbook");
  revalidatePath("/trade/handbook");
  return { ok: true };
}
