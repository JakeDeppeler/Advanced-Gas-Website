"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { isEmail, reportRecipients, saveReportRecipients } from "@/lib/reports/store";
import { resendReport, sendReportNow } from "@/lib/reports/run";
import type { ReportKind } from "@/lib/reports/types";

export type ReportActionResult = { ok: boolean; error?: string; emails?: string[]; note?: string };

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

/** Add someone to the reports, or take them off. */
export async function changeReportRecipient(input: { email: string; add: boolean }): Promise<ReportActionResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const email = input.email.trim().toLowerCase();
  if (input.add && !isEmail(email)) return { ok: false, error: "That isn't an email address." };
  const now = await reportRecipients();
  if (input.add && now.includes(email)) return { ok: false, error: "They're already on the list." };
  const next = input.add ? [...now, email].slice(0, 20) : now.filter((e) => e !== email);
  const res = await saveReportRecipients(next);
  if (!res.ok) return { ok: false, error: "Couldn't save the list." };
  revalidatePath("/portal/board/reports");
  return { ok: true, emails: next };
}

/** This period's report, from the figures as they are now, sent to the list. */
export async function sendNow(kind: ReportKind): Promise<ReportActionResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  if (!["daily", "weekly", "monthly"].includes(kind)) return { ok: false, error: "No such report." };
  try {
    const r = await sendReportNow(kind);
    revalidatePath("/portal/board/reports");
    return r.status === "sent" ? { ok: true, note: `Sent to ${r.sentTo.length} ${r.sentTo.length === 1 ? "person" : "people"}.` } : { ok: false, error: r.error ?? "Couldn't send." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** A kept report, sent again as it was. */
export async function sendAgain(key: string): Promise<ReportActionResult> {
  if (!(await office())) return { ok: false, error: "Not allowed." };
  const r = await resendReport(key).catch(() => null);
  if (!r) return { ok: false, error: "No such report." };
  revalidatePath("/portal/board/reports");
  return r.status === "sent" ? { ok: true, note: "Sent again." } : { ok: false, error: r.error ?? "Couldn't send." };
}
