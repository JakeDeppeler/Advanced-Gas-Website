import "server-only";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto } from "@/lib/automation/log";

/**
 * Changes to an open quote's lines in ServiceTitan, from requests queued in
 * the estimate_edit_queue setting, run by the sweep. The first: job 20867's
 * ducted quote laid out as Jake asked on 25 Nov ("the labour should be under
 * the installation not by it self and be a service"): the two-day labour
 * added under the installation at the price the installation line carried,
 * and the installation line itself to $0, so the line's dynamic price no longer
 * hides what the materials come to. "can you update thos 20867".
 *
 * Each request says what it expects to find (`expect` on a price change), and
 * a quote that has moved on since, or is sold, is left alone: the office edits
 * these quotes all day. Each step is read back. A line this run added is taken
 * off again if a later step fails, so a half-done edit never doubles the price.
 * What was there before is kept in estimate_edit_done.
 */
const QUEUE = "estimate_edit_queue";
const DONE = "estimate_edit_done";

type Op =
  /** A new line under an existing group head. */
  | { kind: "add"; skuId: number; skuType: "Service" | "Material" | "Equipment"; qty: number; unitRate: number; unitCost?: number; under: number }
  /** An existing line's price (and cost), if it's still at `expect`. */
  | { kind: "price"; itemId: number; unitRate: number; unitCost?: number; expect: number };
type Ask = { id: string; estimateId: number; why: string; ops: Op[] };
type Item = {
  id: number; sku?: { id?: number; name?: string; type?: string }; qty?: number; unitRate?: number; unitCost?: number;
  description?: string | null; itemGroupName?: string | null; itemGroupRootId?: number | null; chargeable?: boolean | null; skuAccount?: string | null;
};
type Estimate = { id: number; jobNumber?: string; status?: { name?: string }; subtotal?: number; active?: boolean; items?: Item[] };
type Done = { id: string; estimateId: number; at: string; ok: boolean; why: string; before?: { subtotal?: number; items: Item[] }; after?: number; added?: number[]; error?: string };

const close = (a: number | undefined | null, b: number) => Math.abs(Number(a ?? NaN) - b) < 0.005;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function applyEstimateEdits(deadline: number): Promise<{ done: number }> {
  const asks = ((await getSettings<{ edits?: Ask[] }>(QUEUE).catch(() => null))?.edits ?? [])
    .filter((a) => a && typeof a.id === "string" && Number.isInteger(a.estimateId) && Array.isArray(a.ops) && a.ops.length);
  if (!asks.length) return { done: 0 };
  const done = (await getSettings<{ edits?: Done[] }>(DONE).catch(() => null))?.edits ?? [];
  const seen = new Set(done.map((d) => d.id));
  const left: Ask[] = [];
  let n = 0;

  for (const a of asks) {
    if (seen.has(a.id)) continue;
    if (Date.now() > deadline - 20_000) { left.push(a); continue; }
    const path = stTenantPath("sales", `estimates/${a.estimateId}`);
    const read = () => stFetch<Estimate>(path);
    const r: Done = { id: a.id, estimateId: a.estimateId, at: new Date().toISOString(), ok: false, why: a.why, added: [] };
    try {
      const est = await read();
      r.before = { subtotal: est.subtotal, items: est.items ?? [] };
      const items = est.items ?? [];
      const byId = new Map(items.map((i) => [i.id, i]));
      // Never a sold or dismissed quote, and never one that's moved on from what the request was written against.
      const status = est.status?.name ?? "";
      if (status && status !== "Open") throw new Error(`the quote is ${status}, not open`);
      for (const op of a.ops) {
        if (op.kind === "price") {
          const it = byId.get(op.itemId);
          if (!it) throw new Error(`line ${op.itemId} isn't on the quote any more`);
          if (!close(it.unitRate, op.expect)) throw new Error(`"${it.sku?.name ?? op.itemId}" is $${it.unitRate}, not the $${op.expect} this was asked against`);
        } else if (!byId.has(op.under)) throw new Error(`the group head ${op.under} isn't on the quote any more`);
      }

      for (const op of a.ops) {
        if (op.kind === "add") {
          const svc = op.skuType === "Service" ? await stFetch<{ description?: string; displayName?: string }>(stTenantPath("pricebook", `services/${op.skuId}`)).catch(() => null) : null;
          const ids = new Set(((await read()).items ?? []).map((i) => i.id));
          await stSend("PUT", `${path}/items`, {
            skuId: op.skuId, qty: op.qty, quantity: op.qty, unitRate: op.unitRate, unitPrice: op.unitRate,
            ...(op.unitCost != null ? { unitCost: op.unitCost } : {}),
            description: svc?.description ?? undefined, itemGroupRootId: op.under,
          });
          let hit: Item | undefined;
          for (let i = 0; i < 3 && !hit; i++) {
            if (i) await sleep(2000);
            hit = ((await read()).items ?? []).find((x) => !ids.has(x.id) && x.sku?.id === op.skuId);
          }
          if (!hit) throw new Error(`ServiceTitan answered OK but the new line (sku ${op.skuId}) isn't on the quote`);
          r.added!.push(hit.id);
          if (!close(hit.unitRate, op.unitRate) || hit.itemGroupRootId !== op.under) {
            throw new Error(`the new line went on at $${hit.unitRate}${hit.itemGroupRootId !== op.under ? ", outside the installation" : ""}, not $${op.unitRate} under it`);
          }
        } else {
          const cur = ((await read()).items ?? []).find((i) => i.id === op.itemId)!;
          const ids = new Set(((await read()).items ?? []).map((i) => i.id));
          await stSend("PUT", `${path}/items`, {
            id: cur.id, skuId: cur.sku?.id, qty: cur.qty, quantity: cur.qty, unitRate: op.unitRate, unitPrice: op.unitRate,
            unitCost: op.unitCost ?? cur.unitCost, description: cur.description ?? undefined, chargeable: cur.chargeable ?? undefined,
            itemGroupName: cur.itemGroupName ?? undefined, itemGroupRootId: cur.itemGroupRootId ?? undefined, skuAccount: cur.skuAccount ?? undefined,
          });
          let ok = false;
          let now: Item[] = [];
          for (let i = 0; i < 3 && !ok; i++) {
            if (i) await sleep(2000);
            now = (await read()).items ?? [];
            ok = close(now.find((x) => x.id === op.itemId)?.unitRate, op.unitRate);
          }
          // An update ServiceTitan took as a new line: that line comes off, and the step fails.
          const extra = now.filter((x) => !ids.has(x.id) && x.sku?.id === cur.sku?.id);
          r.added!.push(...extra.map((x) => x.id));
          if (!ok || extra.length) throw new Error(`"${cur.sku?.name}" didn't change to $${op.unitRate}${extra.length ? " (ServiceTitan added a second line instead)" : ""}`);
        }
      }
      r.ok = true;
      r.added = [];
    } catch (e) {
      r.error = (e as Error).message.slice(0, 400);
      // Undo what this run put on, so the quote is as the office left it.
      for (const id of r.added ?? []) await stSend("DELETE", `${path}/items/${id}`, null).catch(() => undefined);
    }
    const after = await read().catch(() => null);
    r.after = after?.subtotal;
    await logAuto([{
      at: r.at, kind: "estimateEdit", ok: r.ok, title: `Quote on job ${after?.jobNumber ?? a.estimateId}: ${r.ok ? a.why : "left as it was"}`,
      detail: r.ok ? `Subtotal $${r.before?.subtotal} → $${r.after}.` : `${r.error}. Subtotal $${r.after}.`,
    }]).catch(() => undefined);
    done.unshift(r);
    n++;
  }
  await saveSettings(QUEUE, { edits: left });
  await saveSettings(DONE, { edits: done.slice(0, 50) });
  return { done: n };
}
