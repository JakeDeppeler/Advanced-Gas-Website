"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { addStockLine, cancelDraft, draftFor, draftWeek, holdLines, markLinesOrdered, releaseHold, removeStockLine, searchStock, setDelivery, setOrderCc, setPickup, type StockItem } from "@/lib/ordering/db";
import { nextWeek, parseEmails, thisWeek } from "@/lib/ordering/plan";
import { approveAllDrafts, approveAndSend, markOrderedManually, sendTest } from "@/lib/ordering/send";
import { pushOrderToServiceTitan } from "@/lib/ordering/stPurchaseOrders";

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

export async function choosePickup(input: { id: number; pickup: boolean }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which order?" };
  const ok = await setPickup(input.id, !!input.pickup);
  done();
  return ok ? { ok: true } : { ok: false, error: "Only a draft order can be changed." };
}

export async function findStock(text: string): Promise<StockItem[]> {
  const me = await office();
  if (!me) return [];
  return searchStock(String(text ?? ""));
}

/**
 * Stock onto an order: onto the draft given, or — from the top of the page —
 * onto that supplier's draft for the week, made if there isn't one.
 */
export async function addStock(input: {
  id?: number; supplierId?: string; which?: "next" | "this";
  item: { sku_id: number | null; name: string; model: string | null; part: string | null; cost: number | null; kind: string | null };
  qty: number;
}): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const name = String(input.item?.name ?? "").trim().slice(0, 160);
  if (!name) return { ok: false, error: "What's the item?" };
  const qty = Number(input.qty);
  if (!(qty > 0 && qty <= 10000)) return { ok: false, error: "How many?" };
  const clip = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
  const sku = Number.isInteger(input.item.sku_id) && (input.item.sku_id as number) > 0 ? input.item.sku_id : null;
  const cost = input.item.cost == null || !Number.isFinite(Number(input.item.cost)) ? null : Math.max(0, Number(input.item.cost));
  try {
    let id = input.id;
    if (!id) {
      if (!input.supplierId || !/^[a-z0-9_]{1,40}$/.test(input.supplierId)) return { ok: false, error: "Which supplier?" };
      const week = input.which === "this" ? thisWeek(new Date()) : nextWeek(new Date());
      id = await draftFor(input.supplierId, week);
    }
    if (!isId(id)) return { ok: false, error: "Which order?" };
    const ok = await addStockLine(id, { sku_id: sku, name, model: clip(input.item.model, 80), part: clip(input.item.part, 40), cost, kind: clip(input.item.kind, 20), qty });
    done();
    return ok ? { ok: true, note: `Added ${qty} × ${name}.` } : { ok: false, error: "Stock can only go on a draft order." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeStock(lineId: number): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(lineId)) return { ok: false, error: "Which line?" };
  const ok = await removeStockLine(lineId);
  done();
  return ok ? { ok: true } : { ok: false, error: "Only stock on a draft can be taken off." };
}

const lineIds = (ids: unknown) => (Array.isArray(ids) ? ids.filter(isId).slice(0, 200) : []);

/** These lines were ordered some other way: they come off the draft and count as ordered. */
export async function linesOrdered(input: { id: number; lineIds: number[]; how?: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const ids = lineIds(input.lineIds);
  if (!isId(input.id) || !ids.length) return { ok: false, error: "Which lines?" };
  try {
    const r = await markLinesOrdered(input.id, ids, me.name || me.email, String(input.how ?? "").trim().slice(0, 120));
    done();
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Leave these lines for next week's order. */
export async function holdForNextWeek(input: { id: number; lineIds: number[] }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const ids = lineIds(input.lineIds);
  if (!isId(input.id) || !ids.length) return { ok: false, error: "Which lines?" };
  try {
    const r = await holdLines(input.id, ids, me.name || me.email);
    done();
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Changed our minds: order a held line now. It's drafted straight back onto this week's or next week's order. */
export async function orderHeldNow(input: { holdId: number; which: "next" | "this" }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.holdId)) return { ok: false, error: "Which one?" };
  const ok = await releaseHold(input.holdId);
  if (!ok) return { ok: false, error: "That isn't held any more." };
  try {
    await draftWeek(input.which === "this" ? thisWeek(new Date()) : nextWeek(new Date()));
  } catch { /* released either way; the next draft picks it up */ }
  done();
  return { ok: true, note: "Back on the order." };
}

/** Put a sent order into ServiceTitan as purchase orders on its jobs (see stPurchaseOrders). */
export async function pushToServiceTitan(id: number): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(id)) return { ok: false, error: "Which order?" };
  try {
    const r = await pushOrderToServiceTitan(id);
    done();
    revalidatePath("/portal/stock");
    return r.ok
      ? { ok: true, note: `In ServiceTitan: ${r.made.map((m) => (m.number ? (/^po\b/i.test(m.number) ? m.number : `PO ${m.number}`) : "a purchase order")).join(", ")}.` }
      : { ok: false, error: r.error };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
