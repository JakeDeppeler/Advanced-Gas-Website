"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { cancelDraft, draftWeek, setDelivery, setOrderCc } from "@/lib/ordering/db";
import { nextWeek, parseEmails, thisWeek } from "@/lib/ordering/plan";
import { approveAllDrafts, approveAndSend, markOrderedManually, sendTest } from "@/lib/ordering/send";

export type ActionResult = { ok: boolean; error?: string; note?: string };

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

const done = () => revalidatePath("/portal/supply/next-week");
const isId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;

export async function redraft(which: "next" | "this"): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  try {
    const week = which === "this" ? thisWeek(new Date()) : nextWeek(new Date());
    const r = await draftWeek(week);
    done();
    const parts = [r.created && `${r.created} new`, r.updated && `${r.updated} updated`, r.removed && `${r.removed} no longer needed`].filter(Boolean);
    return { ok: true, note: parts.length ? `Drafts: ${parts.join(", ")}.` : "Nothing to draft." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function approve(id: number): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(id)) return { ok: false, error: "Which order?" };
  try {
    const r = await approveAndSend(id, me.name || me.email);
    done();
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function cancel(id: number): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(id)) return { ok: false, error: "Which order?" };
  const ok = await cancelDraft(id);
  done();
  return ok ? { ok: true } : { ok: false, error: "Only a draft can be cancelled." };
}

export async function saveDelivery(input: { id: number; toSite: boolean; address: string; instructions: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which order?" };
  const address = input.address.trim().slice(0, 200);
  if (!address) return { ok: false, error: "Where should it go?" };
  const ok = await setDelivery(input.id, { toSite: !!input.toSite, address, instructions: input.instructions.trim().slice(0, 300) });
  done();
  return ok ? { ok: true } : { ok: false, error: "Only a draft order can be changed." };
}

export async function testSend(input: { id: number; to: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which order?" };
  const to = input.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "That isn't an email address." };
  try {
    return await sendTest(input.id, to);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** People copied in on this one order, on top of the supplier's usual copies. */
export async function saveCc(input: { id: number; cc: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which order?" };
  const cc = parseEmails(input.cc.slice(0, 1000));
  if (cc.bad.length) return { ok: false, error: `Not an email address: ${cc.bad.join(", ")}` };
  if (cc.ok.length > 10) return { ok: false, error: "That's a lot of people — ten at most." };
  const ok = await setOrderCc(input.id, cc.ok);
  done();
  return ok ? { ok: true } : { ok: false, error: "Only a draft order can be changed." };
}

export async function approveAll(ids: number[]): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const clean = Array.isArray(ids) ? ids.filter(isId).slice(0, 60) : [];
  if (!clean.length) return { ok: false, error: "Nothing to send." };
  try {
    const r = await approveAllDrafts(clean, me.name || me.email);
    done();
    return r;
  } catch (e) {
    done();
    return { ok: false, error: (e as Error).message };
  }
}

export async function orderedManually(input: { id: number; how: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which order?" };
  const r = await markOrderedManually(input.id, me.name || me.email, (input.how ?? "").trim().slice(0, 120));
  done();
  return r;
}
