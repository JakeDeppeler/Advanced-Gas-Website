"use server";

import { refreshBoard } from "@/lib/dashboard/refresh";
import { autoDraft } from "@/lib/ordering/autoDraft";
import { loadFromStock, loadStocked, saveFromStock, saveStocked } from "@/lib/ordering/stocked";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { can } from "@/lib/portal/caps";
import { addStockLine, cancelDraft, listWeekOrders, mergeDrafts, draftFor, draftWeek, holdLines, markLinesOrdered, markUnbookedOrdered, orderAhead, orderLater, getOrder, releaseHold, removeStockLine, searchStock, setDelivery, setOrderCc, setPickup, type StockItem } from "@/lib/ordering/db";
import { nextWeek, parseEmails, thisWeek } from "@/lib/ordering/plan";
import { approveAllDrafts, approveAndSend, emailReeceList, markOrderedManually, sendTest } from "@/lib/ordering/send";
import { pushOrderToServiceTitan } from "@/lib/ordering/stPurchaseOrders";
import { noteOnJob, updateJobs, updateJobsFor } from "@/lib/ordering/stJobNotes";
import { placeReece, previewReece, type Preview } from "@/lib/ordering/reeceSend";

export type ActionResult = { ok: boolean; error?: string; note?: string };

async function tagStocked(items: Array<{ key: string; name: string }>, by: string) {
  const cur = await loadStocked();
  const have = new Set(cur.map((x) => x.key));
  await saveStocked([...cur, ...items.filter((x) => !have.has(x.key)).map((x) => ({ ...x, by, at: new Date().toISOString() }))]);
}

async function office() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

const done = () => revalidatePath("/portal/supply/next-week");
const isId = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;

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

export async function saveDelivery(input: { id: number; toSite: boolean; address: string; instructions: string; deliverBy?: string; note?: string; pickup?: boolean }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which order?" };
  const address = input.address.trim().slice(0, 200);
  // A pick-up has nowhere to go; the date and the note still apply to it.
  if (!address && !input.pickup) return { ok: false, error: "Where should it go?" };
  const by = (input.deliverBy ?? "").trim();
  if (by && !/^\d{4}-\d{2}-\d{2}$/.test(by)) return { ok: false, error: "That date doesn't read as a date." };
  const ok = await setDelivery(input.id, {
    toSite: !!input.toSite, address, instructions: input.instructions.trim().slice(0, 300),
    deliverBy: by || null, note: (input.note ?? "").trim().slice(0, 600),
  });
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

/** Reece, until maX can take an order from us: the list, emailed to whoever enters it. */
export async function emailList(input: { id: number; to: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.id)) return { ok: false, error: "Which order?" };
  const to = input.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "That isn't an email address." };
  try {
    const r = await emailReeceList(input.id, me.name, to);
    done();
    return r;
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
  if (cc.ok.length > 10) return { ok: false, error: "That's a lot of people, ten at most." };
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

/**
 * These lines were ordered some other way: they come off the draft and count
 * as ordered. Bought online from a third party (`online`, with where if said),
 * each job also gets a note in ServiceTitan, so the tech knows the part is
 * coming and that it isn't on the supplier's order.
 */
export async function linesOrdered(input: { id: number; lineIds: number[]; how?: string; online?: boolean; where?: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const ids = lineIds(input.lineIds);
  if (!isId(input.id) || !ids.length) return { ok: false, error: "Which lines?" };
  try {
    const where = String(input.where ?? "").trim().slice(0, 80);
    const how = input.online ? `ordered online${where ? ` from ${where}` : ""}` : String(input.how ?? "").trim().slice(0, 120);
    // The lines, read before they move, for the note.
    const before = input.online ? await getOrder(input.id) : null;
    const r = await markLinesOrdered(input.id, ids, me.name || me.email, how);
    if (r.ok && r.id) {
      let noteErr = "";
      if (input.online && before) {
        const want = new Set(ids);
        const byJob = new Map<number, string[]>();
        for (const l of before.lines) if (want.has(l.id) && l.job_id != null)
          byJob.set(l.job_id, [...(byJob.get(l.job_id) ?? []), `${Number.isInteger(l.qty) ? l.qty : l.qty.toFixed(2)} × ${l.supplier_model || l.sku_name || l.description || "item"}`]);
        for (const [job, items] of byJob) {
          await noteOnJob(job, `Parts ordered online by the office${where ? ` from ${where}` : ""}: ${items.join("; ")}. They won't be on the supplier's order.`)
            .catch((e) => { noteErr = (e as Error).message; });
        }
      }
      // The job's tags follow (materials ordered), as they do for a sent order.
      await updateJobsFor(r.id, { notes: false }).catch(() => undefined);
      if (noteErr) r.note = `${r.note} The note on the job in ServiceTitan didn't go: ${/\b403\b/.test(noteErr) ? "the portal isn't allowed to add notes to jobs." : "try again from Sent."}`;
    }
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

/** Tags, and for the ticked suppliers the note and the order PDF, on each of the order's jobs in ServiceTitan; only what's missing is added. */
export async function noteOnJobs(id: number): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(id)) return { ok: false, error: "Which order?" };
  try {
    const r = await updateJobs(id);
    done();
    return r.ok ? { ok: true, note: `Up to date on ${r.done.length} job${r.done.length === 1 ? "" : "s"} in ServiceTitan.` } : { ok: false, error: r.error };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Clear a job off "Needs a look" when it's been dealt with outside the portal
 * (ordered by hand, or not needed). Kept by the job and what was wrong, so a
 * different problem on the same job still shows.
 */
export async function dismissProblem(key: string): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const k = String(key).slice(0, 400);
  const saved = await getSettings<{ keys?: string[] }>("order-problems-dismissed").catch(() => null);
  const keys = [...new Set([...(saved?.keys ?? []), k])].slice(-500);
  const r = await saveSettings("order-problems-dismissed", { keys });
  if (!r.ok) return { ok: false, error: "Couldn't save that." };
  done();
  return { ok: true };
}

/**
 * While To order is open: pull the latest from ServiceTitan (if the last pull
 * is more than a couple of minutes old) and redraft from it if the bookings
 * changed. The scheduled sync is meant to do this every ten minutes, but
 * GitHub runs that schedule every few hours on a quiet repository, so the page
 * that needs it fresh asks for itself.
 */
export async function pullLatest(which?: "next" | "this"): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  try {
    await refreshBoard();
    await autoDraft({ anyHour: true });
    // Pressed by hand: also draft the week on screen. This is what Redraft
    // used to do, and it is the only way next week drafts on a Monday or
    // Tuesday, before the automatic run starts covering it on Wednesday.
    let note: string | undefined;
    if (which === "this" || which === "next") {
      const r = await draftWeek(which === "this" ? thisWeek(new Date()) : nextWeek(new Date()));
      const parts = [r.created && `${r.created} new`, r.updated && `${r.updated} updated`, r.removed && `${r.removed} no longer needed`].filter(Boolean);
      note = parts.length ? `Drafts: ${parts.join(", ")}.` : "Up to date.";
    }
    done();
    return { ok: true, note };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * We keep it in the factory: the lines come off the draft as taken from the
 * shelf (recorded, nothing emailed), and the item is tagged Factory stock so
 * the next order shows it as one we hold.
 */
export async function fromStock(input: { id: number; lineIds: number[]; items: Array<{ key: string; name: string }> }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  const ids = lineIds(input.lineIds);
  if (!isId(input.id) || !ids.length) return { ok: false, error: "Which lines?" };
  try {
    const r = await markLinesOrdered(input.id, ids, me.name || me.email, "From factory stock");
    const items = (Array.isArray(input.items) ? input.items : []).map((x) => ({ key: String(x.key ?? "").slice(0, 80), name: String(x.name ?? "").slice(0, 160) })).filter((x) => x.key);
    if (items.length) await tagStocked(items, me.name || me.email);
    done();
    return { ...r, note: `${ids.length === 1 ? "Taken" : `${ids.length} lines taken`} from factory stock. Tagged Factory stock for next time.` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * One line of a sold, not-booked sale: we'll take it from the factory rather
 * than order it, or changed our minds. Kept against the sale, so it holds once
 * the job is booked and drafted.
 */
export async function shelfLine(input: { estimateId: number; skuId: number | null; name: string; on: boolean }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.estimateId) || (input.skuId != null && !isId(input.skuId))) return { ok: false, error: "Which line?" };
  const key = `est:${input.estimateId}:${input.skuId ?? "-"}`;
  const cur = (await loadFromStock()).filter((x) => x.key !== key);
  await saveFromStock(input.on ? [...cur, { key, name: String(input.name ?? "").slice(0, 160), by: me.name || me.email, at: new Date().toISOString() }] : cur);
  done();
  return { ok: true, note: input.on ? "From the factory: it won't be ordered." : "Back on the list to order." };
}

/**
 * Lines of a sold, not-booked sale, several at once: from the factory, or
 * bought another way (already ordered, or online). What's left is what still
 * needs ordering.
 */
export async function unbookedLines(input: { estimateId: number; supplierId: string; items: { skuId: number | null; name: string }[]; mark: "stock" | "ordered" | "online"; where?: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.estimateId) || !/^[a-z0-9_]{1,40}$/.test(input.supplierId)) return { ok: false, error: "Which sale?" };
  const items = (Array.isArray(input.items) ? input.items : []).filter((i) => i.skuId == null || isId(i.skuId)).slice(0, 100);
  if (!items.length) return { ok: false, error: "Tick the lines first." };
  const who = me.name || me.email;
  try {
    if (input.mark === "stock") {
      const keys = new Set(items.map((i) => `est:${input.estimateId}:${i.skuId ?? "-"}`));
      const cur = (await loadFromStock()).filter((x) => !keys.has(x.key));
      await saveFromStock([...cur, ...items.map((i) => ({ key: `est:${input.estimateId}:${i.skuId ?? "-"}`, name: String(i.name ?? "").slice(0, 160), by: who, at: new Date().toISOString() }))]);
      done();
      return { ok: true, note: `${items.length === 1 ? "It's" : `${items.length} lines are`} coming from the factory, so won't be ordered.` };
    }
    const where = String(input.where ?? "").trim().slice(0, 80);
    const r = await markUnbookedOrdered(input.estimateId, input.supplierId, items.map((i) => i.skuId), who, input.mark === "online" ? `ordered online${where ? ` from ${where}` : ""}` : "");
    done();
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Take the Factory stock tag off an item: we don't keep it on the shelf any more. */
export async function untagStocked(key: string): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  await saveStocked((await loadStocked()).filter((x) => x.key !== key));
  done();
  return { ok: true };
}

/** Every draft for this supplier made into one bulk order: one delivery, until it goes. */
export async function mergeIntoBulk(id: number): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(id)) return { ok: false, error: "Which order?" };
  const r = await mergeDrafts(id);
  done();
  return r.ok ? { ok: true, note: `Added ${r.merged?.join(", ")} to this one. It stays one bulk order until it's sent.` } : { ok: false, error: r.error };
}

/** A sold quote's gear for one supplier onto that supplier's draft, before the install is booked (db.orderAhead). */
/**
 * Reece's "Order in maX", step one: the order put together exactly as the
 * send button does (held lines released, sold jobs added, both weeks' drafts
 * merged), then every job's maX order checked and priced by Reece. Nothing is
 * bought and nothing is held yet: unticked lines are only left out of the
 * preview, and held when the order is placed.
 */
export async function reecePreview(input: { supplierId: string; ahead: number[]; leave: number[]; release?: number[] }): Promise<Preview> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!/^[a-z0-9_]{1,40}$/.test(input.supplierId)) return { ok: false, error: "Which supplier?" };
  try {
    const release = (Array.isArray(input.release) ? input.release : []).filter(isId).slice(0, 60);
    if (release.length) {
      for (const id of release) await releaseHold(id);
      await draftWeek(thisWeek(new Date()));
      await draftWeek(nextWeek(new Date()));
    }
    for (const est of (Array.isArray(input.ahead) ? input.ahead : []).filter(isId).slice(0, 40)) {
      const r = await orderAhead(est, input.supplierId);
      if (!r.ok) return { ok: false, error: r.error ?? "A sold job couldn't go on the order." };
    }
    const drafts = (await Promise.all([listWeekOrders(thisWeek(new Date())), listWeekOrders(nextWeek(new Date()))])).flat()
      .filter((p) => p.supplier_id === input.supplierId && p.kind === "order" && p.status === "draft");
    if (!drafts.length) return { ok: false, error: "There's nothing on this supplier's order to send." };
    const keep = drafts[0];
    if (drafts.length > 1) {
      const m = await mergeDrafts(keep.id);
      if (!m.ok) return { ok: false, error: m.error ?? "Couldn't put the drafts together." };
    }
    done();
    return await previewReece(keep.id, lineIds(input.leave), me.name || me.email);
  } catch (e) {
    done();
    return { ok: false, error: (e as Error).message };
  }
}

/** Step two: the unticked lines held for later, then each job's order placed in maX. */
export async function reecePlace(input: { poId: number; leave: number[]; fingerprint: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.poId) || typeof input.fingerprint !== "string" || !input.fingerprint) return { ok: false, error: "Which order?" };
  const who = me.name || me.email;
  try {
    const leave = lineIds(input.leave);
    if (leave.length) {
      const h = await holdLines(input.poId, leave, who);
      if (!h.ok) return { ok: false, error: `Couldn't leave the unticked lines for later: ${h.error ?? "try again"}` };
    }
    const r = await placeReece(input.poId, input.fingerprint, who);
    done();
    return r;
  } catch (e) {
    done();
    return { ok: false, error: (e as Error).message };
  }
}

export async function orderAheadNow(input: { estimateId: number; supplierId: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.estimateId) || !/^[a-z0-9_]{1,40}$/.test(input.supplierId)) return { ok: false, error: "Which sale and supplier?" };
  try {
    const r = await orderAhead(input.estimateId, input.supplierId);
    done();
    return r.ok ? { ok: true, note: r.note } : { ok: false, error: r.error ?? "Couldn't put it on the order." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** A job booked past the two weeks, onto this supplier's order now (not sent). */
export async function orderLaterNow(input: { jobId: number; supplierId: string }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!isId(input.jobId) || !/^[a-z0-9_]{1,40}$/.test(input.supplierId)) return { ok: false, error: "Which job?" };
  try {
    const r = await orderLater([input.jobId], input.supplierId);
    done();
    return r;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * One supplier's order, as ticked on its card, sent in one go: the sold,
 * not-booked jobs ticked are put on the order first, every draft for the
 * supplier becomes one order, the lines left unticked wait for later (held,
 * drafted again next week, never lost), and what's left is sent, the same
 * send as the Send button always was. Nothing goes if the order would be
 * empty.
 */
export async function sendSupplier(input: { supplierId: string; ahead: number[]; leave: number[]; release?: number[]; later?: number[] }): Promise<ActionResult> {
  const me = await office();
  if (!me) return { ok: false, error: "Not allowed." };
  if (!/^[a-z0-9_]{1,40}$/.test(input.supplierId)) return { ok: false, error: "Which supplier?" };
  const who = me.name || me.email;
  try {
    // Held lines ticked back on: released and drafted again first, both weeks,
    // so they land on the drafts this send merges into one order.
    const release = (Array.isArray(input.release) ? input.release : []).filter(isId).slice(0, 60);
    if (release.length) {
      for (const id of release) await releaseHold(id);
      await draftWeek(thisWeek(new Date()));
      await draftWeek(nextWeek(new Date()));
    }
    // Jobs booked past the two weeks, ticked to go now.
    const later = (Array.isArray(input.later) ? input.later : []).filter(isId).slice(0, 60);
    if (later.length) {
      const r = await orderLater(later, input.supplierId);
      if (!r.ok) return { ok: false, error: r.error ?? "A later job couldn't go on the order." };
    }
    for (const est of (Array.isArray(input.ahead) ? input.ahead : []).filter(isId).slice(0, 40)) {
      const r = await orderAhead(est, input.supplierId);
      if (!r.ok) return { ok: false, error: r.error ?? "A sold job couldn't go on the order." };
    }
    const drafts = (await Promise.all([listWeekOrders(thisWeek(new Date())), listWeekOrders(nextWeek(new Date()))])).flat()
      .filter((p) => p.supplier_id === input.supplierId && p.kind === "order" && p.status === "draft");
    if (!drafts.length) return { ok: false, error: "There's nothing on this supplier's order to send." };
    const keep = drafts[0];
    if (drafts.length > 1) {
      const m = await mergeDrafts(keep.id);
      if (!m.ok) return { ok: false, error: m.error };
    }
    const leave = lineIds(input.leave);
    if (leave.length) {
      const h = await holdLines(keep.id, leave, who);
      if (!h.ok) return { ok: false, error: `Couldn't leave the unticked lines for later: ${h.error ?? "try again"}` };
    }
    const r = await approveAndSend(keep.id, who);
    done();
    return r;
  } catch (e) {
    done();
    return { ok: false, error: (e as Error).message };
  }
}
