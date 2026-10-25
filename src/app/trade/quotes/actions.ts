"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { logTouch, setFollow } from "@/lib/pipeline/store";
import { noteFollowUp } from "@/lib/pipeline/stLost";
import { HOW_LABEL, isHow } from "@/lib/pipeline/types";
import { myPipeQuotes } from "@/lib/portal/tradeQuotes";

const goodDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/**
 * A follow-up on one of your own quotes, from the trade portal. The same
 * record the office's Pipeline writes (the call, then the next one), but only
 * on a quote you wrote or were put on: the Pipeline itself stays the office's.
 */
export async function logMyQuoteCall(input: { key: string; how: string; note?: string; nextOn?: string | null }): Promise<{ ok: boolean; error?: string; said?: string }> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  if (!isHow(input.how)) return { ok: false, error: "Pick what happened." };
  const note = String(input.note ?? "").trim().slice(0, 500);
  if (input.how === "note" && !note) return { ok: false, error: "Write the note first." };
  if (input.nextOn && !goodDay(input.nextOn)) return { ok: false, error: "That date doesn't look right." };
  const mine = await myPipeQuotes(me.name).catch(() => null);
  if (!mine) return { ok: false, error: "Your quotes couldn't be read just now. Try again." };
  if (!mine.some((x) => x.key === input.key)) return { ok: false, error: "That isn't one of your open quotes." };
  try {
    await logTouch(input.key, input.how, note || null, me.name);
    if (input.nextOn !== undefined) await setFollow(input.key, { nextOn: input.nextOn || null }, me.name);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/trade/quotes");
  revalidatePath("/portal/pipeline");
  const next = input.nextOn ? ` Next call ${new Date(`${input.nextOn}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}.` : "";
  const st = await noteFollowUp(input.key, `Quote follow-up: ${HOW_LABEL[input.how]}${note ? `. ${note}` : ""}.${next} Logged by ${me.name} in the trade portal.`).catch(() => false);
  return { ok: true, said: st === false ? "Logged, but the note didn't go on the job in ServiceTitan." : "Logged. The office sees it on the Pipeline." };
}
