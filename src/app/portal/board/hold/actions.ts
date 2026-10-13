"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { readHoldTags, saveHoldTags, type HoldSide } from "@/lib/board/holdTags";

export type HoldResult = { ok: boolean; error?: string };

/** The same people who run the wall board's remote. */
async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

/**
 * One tag's setting. `side` null means it is not a hold.
 *
 * Read, change one, write back, like the standard times: the whole list is one
 * settings row, and two people editing different tags in the same minute would
 * otherwise have the last save throw the other away.
 *
 * The first save writes the whole current list, defaults included — so turning
 * one tag on does not silently turn the other ten off.
 */
export async function setHoldTag(tag: string, side: HoldSide | null): Promise<HoldResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const name = String(tag ?? "").trim();
  if (!name) return { ok: false, error: "No tag." };
  if (side != null && side !== "us" && side !== "them") return { ok: false, error: "Ours or theirs." };

  const { rows } = await readHoldTags();
  const us: string[] = [];
  const them: string[] = [];
  for (const r of rows) {
    const s = r.name === name ? side : r.side;
    if (s === "us") us.push(r.name);
    else if (s === "them") them.push(r.name);
  }
  await saveHoldTags({ us, them });
  revalidatePath("/portal/board/hold");
  return { ok: true };
}

/** Back to the eleven the board picks out of the tag names by itself. */
export async function resetHoldTags(): Promise<HoldResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  await saveHoldTags(null);
  revalidatePath("/portal/board/hold");
  return { ok: true };
}
