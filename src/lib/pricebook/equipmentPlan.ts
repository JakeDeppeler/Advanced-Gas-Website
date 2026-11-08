import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { sbSelect } from "@/lib/dashboard/db";
import { brandOf, categoryOf, roundPrice, ruleFor, type MarkupRules } from "./markupRules";

// A set of equipment price changes worked out beforehand (each brand's markup
// on its cost ex GST) and saved, so it can be looked over on Our prices before
// anything moves, then written to the ServiceTitan pricebook a slice at a time.
// Each item is read back after the write and its outcome kept, so a second
// press carries on rather than doing any twice.

export type PriceChange = {
  id: number; name: string; group: string; target: number;
  /** Cost ex GST the price is worked from. */
  cost: number;
  /** Set only where the pricebook's cost is wrong (one was the inc-GST price). */
  setCost?: number;
  was: number; price: number;
};
export type ChangeDone = { at: string; ok: boolean; detail?: string };
export type PricePlan = { title: string; made: string; changes: PriceChange[]; done: Record<string, ChangeDone> };

export const PLAN_KEY = "equipment_price_plan";

export async function loadPricePlan(): Promise<PricePlan | null> {
  const p = await getSettings<PricePlan>(PLAN_KEY).catch(() => null);
  return p && Array.isArray(p.changes) ? { ...p, done: p.done ?? {} } : null;
}

type Raw = Record<string, unknown>;
const near = (a: unknown, b: number) => Math.abs(Number(a) - b) < 0.005;

/**
 * Write these items' new prices (and costs, where the plan corrects one).
 *
 * The live price is read first: if somebody changed it in ServiceTitan since
 * the plan was made, the item is left alone and says so, rather than a stale
 * plan overwriting a newer decision. Cost goes on the primary vendor as well
 * as the item, because the Reece sync found ServiceTitan only keeps a cost
 * that comes through a supplier.
 */
export async function applyPriceChanges(ids: number[]): Promise<{ ok: boolean; error?: string; results: { id: number; ok: boolean; detail?: string }[] }> {
  const plan = await loadPricePlan();
  if (!plan) return { ok: false, error: "There are no price changes waiting.", results: [] };
  const want = new Set(ids);
  const todo = plan.changes.filter((c) => want.has(c.id) && !plan.done[String(c.id)]?.ok);

  const results: { id: number; ok: boolean; detail?: string }[] = [];
  for (const c of todo) {
    const path = stTenantPath("pricebook", `equipment/${c.id}`);
    try {
      const now = await stFetch<Raw>(path);
      if (near(now.price, c.price) && (c.setCost == null || near((now.primaryVendor as Raw | null)?.cost ?? now.cost, c.setCost))) {
        results.push({ id: c.id, ok: true, detail: "Already at the new price" });
        continue;
      }
      if (!near(now.price, c.was)) {
        results.push({ id: c.id, ok: false, detail: `Price is now $${now.price} in ServiceTitan, not the $${c.was} this was worked from, so it was left alone` });
        continue;
      }
      const body: Raw = { price: c.price };
      if (c.setCost != null) {
        body.cost = c.setCost;
        const pv = now.primaryVendor as Raw | null | undefined;
        if (pv && pv.vendorId != null) body.primaryVendor = { ...pv, cost: c.setCost };
      }
      await stSend("PATCH", path, body);
      const back = await stFetch<Raw>(path);
      if (!near(back.price, c.price)) results.push({ id: c.id, ok: false, detail: `Sent $${c.price}; ServiceTitan kept $${back.price}` });
      else if (c.setCost != null && !near((back.primaryVendor as Raw | null)?.cost ?? back.cost, c.setCost)) {
        results.push({ id: c.id, ok: true, detail: `Price set; the cost stayed $${(back.primaryVendor as Raw | null)?.cost ?? back.cost}: fix it on the item in ServiceTitan` });
      } else results.push({ id: c.id, ok: true });
    } catch (e) {
      const m = (e as Error).message;
      results.push({ id: c.id, ok: false, detail: /: 403\b/.test(m)
        ? "ServiceTitan refused: the portal's API app needs write access to Pricebook › Equipment"
        : m.replace(/^ServiceTitan \S+ \S+ failed: /, "").slice(0, 200) });
    }
  }

  // Read again before writing: another slice may have finished meanwhile.
  const fresh = (await loadPricePlan()) ?? plan;
  const at = new Date().toISOString();
  for (const r of results) fresh.done[String(r.id)] = { at, ok: r.ok, ...(r.detail ? { detail: r.detail } : {}) };
  await saveSettings(PLAN_KEY, fresh);
  return { ok: true, results };
}

/* ------------------------------------------------- working out a new plan */


type PbRow = { id: number; name: string | null; displayName: string | null; manufacturer: string | null; cost: string | null; price: string | null };

/**
 * Every active equipment item priced from the rules, against the synced copy
 * of the pricebook. Only rises are planned: a markup set lower than an item
 * already sells at leaves it where it is, the way every change so far has
 * worked, so a rounding or a lighter brand rate never cuts a price without
 * someone choosing to. A corrected cost is planned even where the price
 * stays, so the cost still gets fixed.
 */
export async function buildPricePlan(rules: MarkupRules): Promise<PricePlan> {
  const rows = await sbSelect<PbRow>("st_pricebook_equipment",
    "select=id,name,manufacturer,displayName:raw->>displayName,cost:raw->>cost,price:raw->>price&active=is.true&limit=2000");
  const changes: PriceChange[] = [];
  for (const r of rows) {
    const name = (r.displayName || r.name || "").replace(/\s+/g, " ").trim();
    const was = Number(r.price);
    const fix = rules.costFix[String(r.id)];
    const cost = fix ?? Number(r.cost);
    if (!name || !(cost > 0) || !Number.isFinite(was)) continue;
    const brand = brandOf(name, r.manufacturer);
    const { markup, from } = ruleFor(rules, brand, categoryOf(name));
    if (markup == null) continue;
    const price = Math.max(was, roundPrice(cost * (1 + markup / 100), rules.roundTo, rules.roundMode));
    const costChanges = fix != null && Math.abs(Number(r.cost) - fix) >= 0.005;
    if (price === was && !costChanges) continue;
    changes.push({ id: Number(r.id), name, group: from, target: markup, cost, was, price, ...(costChanges ? { setCost: fix } : {}) });
  }
  changes.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  const plan: PricePlan = { title: `markups on cost ex GST, to the ${rules.roundMode === "up" ? "next" : "nearest"} $${rules.roundTo}`, made: new Date().toISOString(), changes, done: {} };
  await saveSettings(PLAN_KEY, plan);
  return plan;
}
