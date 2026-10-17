"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { logTouch, setFollow } from "@/lib/pipeline/store";
import { closeOffInServiceTitan, noteFollowUp } from "@/lib/pipeline/stLost";
import { HOW_LABEL, isHow, LOST_REASONS } from "@/lib/pipeline/types";

export type Result = { ok: boolean; error?: string; said?: string };

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
  // The follow-up onto the job in ServiceTitan too. Saved here either way;
  // only a note that should have gone on and didn't is worth saying.
  if (input.how && isHow(input.how)) {
    const next = input.nextOn ? ` Next call ${new Date(`${input.nextOn}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}.` : "";
    const text = `Quote follow-up: ${HOW_LABEL[input.how]}${input.note?.trim() ? `. ${input.note.trim()}` : ""}.${next} Logged by ${me.name} in the portal.`;
    const st = await noteFollowUp(input.key, text).catch(() => false);
    if (st === false) return { ok: true, said: "Saved here, but the note didn't go on the job in ServiceTitan." };
  }
  return { ok: true };
}

/**
 * Lost, with the reason: recorded here, the quote's open estimates dismissed in
 * ServiceTitan so it leaves the Follow Up list there, and a note on the job.
 */
export async function markLost(input: { key: string; reason: string; note?: string | null }): Promise<Result> {
  const me = await who();
  if (!me) return { ok: false, error: "The pipeline isn't open to you." };
  if (!goodKey(input.key)) return { ok: false, error: "That quote couldn't be found." };
  const reason = (LOST_REASONS as readonly string[]).includes(input.reason) ? input.reason : "Other";
  const note = input.note?.trim().slice(0, 300) || null;
  try {
    await setFollow(input.key, { lost: { reason }, nextOn: null }, me.name);
    await logTouch(input.key, "note", `Marked lost: ${reason}${note ? ` — ${note}` : ""}`, me.name);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  const st = await closeOffInServiceTitan(input.key, reason, note, me.name).catch(() => null);
  revalidatePath("/portal/pipeline");
  revalidatePath("/portal/pipeline/lost");
  if (!st) return { ok: true, said: "Marked lost here. ServiceTitan couldn't be reached, so dismiss it there by hand." };
  if (st.failed) return { ok: true, said: `Marked lost here; ${st.dismissed ? `${st.dismissed} option${st.dismissed === 1 ? "" : "s"} dismissed, ` : ""}${st.failed} didn't dismiss in ServiceTitan (${st.error}), so do ${st.failed === 1 ? "it" : "those"} by hand.` };
  return { ok: true, said: `Marked lost${st.dismissed ? ` and ${st.dismissed === 1 ? "dismissed" : `${st.dismissed} options dismissed`} in ServiceTitan` : ""}${st.noted ? ", with a note on the job" : ""}.` };
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
