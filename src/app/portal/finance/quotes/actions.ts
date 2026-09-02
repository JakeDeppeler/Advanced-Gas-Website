"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { createQuote, updateQuoteStatus, deleteQuote, type QuoteStatus } from "@/lib/portal/db";

export type ActionResult = { ok: boolean; error?: string };

const STATUSES = ["quoted", "won", "lost"];

async function req() {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return null;
  return me;
}

export async function addQuote(input: { amount: number; status: string; customer: string; quotedOn: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const me = await req();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!(input.amount > 0)) return { ok: false, error: "Enter an amount." };
  const status = (STATUSES.includes(input.status) ? input.status : "quoted") as QuoteStatus;
  const res = await createQuote({ amount: input.amount, status, customer: input.customer, quotedOn: input.quotedOn || undefined, createdBy: me.name });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "Database not connected." : "Couldn't add it." };
  revalidatePath("/portal/finance/quotes");
  return { ok: true, id: res.id };
}

export async function setStatus(input: { id: string; status: string }): Promise<ActionResult> {
  const me = await req();
  if (!me) return { ok: false, error: "Not allowed." };
  const status = (STATUSES.includes(input.status) ? input.status : "quoted") as QuoteStatus;
  const res = await updateQuoteStatus(input.id, status);
  if (!res.ok) return { ok: false, error: "Couldn't update." };
  revalidatePath("/portal/finance/quotes");
  return { ok: true };
}

export async function removeQuote(input: { id: string }): Promise<ActionResult> {
  const me = await req();
  if (!me) return { ok: false, error: "Not allowed." };
  const res = await deleteQuote(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove." };
  revalidatePath("/portal/finance/quotes");
  return { ok: true };
}
