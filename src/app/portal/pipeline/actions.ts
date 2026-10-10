"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { logTouch, setFollow } from "@/lib/pipeline/store";
import { isHow, LOST_REASONS } from "@/lib/pipeline/types";

export type Result = { ok: boolean; error?: string };

/** The pipeline is the office's: anyone who can see it can work it. */
async function who() {
  const me = await getPortalUser();
  return me && (can(me, "quotes") || can(me, "overhead")) ? me : null;
}

// The shape quoteKey() makes: j<job>, c<customer>-<day>, e<estimate>.
const goodKey = (k: string) => /^(j\d{1,15}|c\d{1,15}-\d{4}-\d{2}-\d{2}|e\d{1,15})$/.test(k);
const goodDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/**
 * One follow-up: what happened (optional — booking a call or changing who's
 * on it needn't log one), and the next call. Done together so a call is never
 * logged without its next step, which is how quotes go quiet.
 */
export async function saveFollowUp(input: { key: string; how?: string | null; note?: string | null; nextOn?: string | null; owner?: string | null }): Promise<Result> {
  const me = await who();
  if (!me) return { ok: false, error: "The pipeline isn't open to you." };
  if (!goodKey(input.key)) return { ok: false, error: "That quote couldn't be found." };
  if (input.how && !isHow(input.how)) return { ok: false, error: "Pick what happened." };
  if (input.how === "note" && !input.note?.trim()) return { ok: false, error: "Write the note first." };
  if (input.nextOn && !goodDay(input.nextOn)) return { ok: false, error: "That date doesn't look right." };
  try {
    if (input.how && isHow(input.how)) await logTouch(input.key, input.how, input.note ?? null, me.name);
    const patch: Parameters<typeof setFollow>[1] = {};
    if (input.nextOn !== undefined) patch.nextOn = input.nextOn || null;
    if (input.owner !== undefined) patch.owner = input.owner?.trim().slice(0, 80) || null;
    if (Object.keys(patch).length) await setFollow(input.key, patch, me.name);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/pipeline");
  return { ok: true };
}

/** Closed off here. Dismiss it in ServiceTitan too, or it stays open there. */
export async function markLost(input: { key: string; reason: string }): Promise<Result> {
  const me = await who();
  if (!me) return { ok: false, error: "The pipeline isn't open to you." };
  if (!goodKey(input.key)) return { ok: false, error: "That quote couldn't be found." };
  const reason = (LOST_REASONS as readonly string[]).includes(input.reason) ? input.reason : "Other";
  try {
    await setFollow(input.key, { lost: { reason }, nextOn: null }, me.name);
    await logTouch(input.key, "note", `Marked lost: ${reason}`, me.name);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/pipeline");
  return { ok: true };
}

export async function reopen(input: { key: string }): Promise<Result> {
  const me = await who();
  if (!me) return { ok: false, error: "The pipeline isn't open to you." };
  if (!goodKey(input.key)) return { ok: false, error: "That quote couldn't be found." };
  try {
    await setFollow(input.key, { lost: null }, me.name);
    await logTouch(input.key, "note", "Back in the pipeline", me.name);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/pipeline");
  return { ok: true };
}
