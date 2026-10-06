"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { alertRecipients, isEmail, saveAlertRecipients } from "@/lib/journals/alerts";

export type RecipientResult = { ok: boolean; error?: string; emails?: string[] };

/** Add someone to the journal alert emails, or take them off. */
export async function changeRecipient(input: { email: string; add: boolean }): Promise<RecipientResult> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Not allowed." };
  const email = input.email.trim().toLowerCase();
  if (input.add && !isEmail(email)) return { ok: false, error: "That isn't an email address." };
  const now = await alertRecipients();
  if (input.add && now.includes(email)) return { ok: false, error: "They're already on the list." };
  const next = input.add ? [...now, email].slice(0, 20) : now.filter((e) => e !== email);
  const res = await saveAlertRecipients(next);
  if (!res.ok) return { ok: false, error: "Couldn't save the list." };
  revalidatePath("/portal/journals");
  return { ok: true, emails: next };
}
