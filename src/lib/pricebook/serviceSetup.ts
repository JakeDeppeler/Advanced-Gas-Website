import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { HEATER_EVAP_DISCOUNTS, MULTI_SPLIT, SERVICE_PRICES, sameName } from "./servicePricing";

/**
 * Jake's 16 Nov service prices into ServiceTitan's pricebook (servicePricing.ts):
 * each service to its price, the $180 multi-split service, and the two
 * heater-and-evap discount lines the new templates are built from. Runs before
 * the templates in api/pricebook/quote-templates, a call's worth at a time,
 * every write read back.
 *
 * Once, ever: when everything is in, `done` is set and later runs do nothing,
 * so a price the office changes in ServiceTitan afterwards is theirs and is
 * never put back. Three refusals of a kind stop that kind, left for a person.
 */
const KEY = "service_prices";
type Raw = Record<string, unknown>;
type Progress = {
  /** Code → id of each item this made. */
  made?: Record<string, number>;
  /** skuId → what it was and what it charges now, once it charges Jake's price. */
  priced?: Record<string, string>;
  fails?: Record<string, number>;
  notes?: Record<string, string>;
  done?: string;
};

const at = () => new Date().toISOString();
const ids = (v: unknown) => (Array.isArray(v) ? v : []).map((c) => Number((c as Raw)?.id ?? c)).filter((n) => Number.isFinite(n) && n > 0);

/** The items this has made, by code, for the templates built on them. */
export async function madeServiceItems(): Promise<Record<string, number>> {
  return ((await getSettings<Progress>(KEY).catch(() => null))?.made) ?? {};
}

/** What a service charges a customer: on Dynamic Pricing its calculated price, not the stored one. */
const charges = (s: Raw) => Number(s.useStaticPrices === false && s.calculatedPrice != null ? s.calculatedPrice : s.price);

async function readService(id: number): Promise<Raw | null> {
  const r = await stFetch<{ data?: Raw[] }>(stTenantPath("pricebook", "services"), { ids: String(id), calculatePrices: "true" });
  return r.data?.[0] ?? null;
}

/**
 * One service to a price. A static price is written and read back; only
 * `price`, so a member or add-on price the office set stays theirs.
 *
 * On Dynamic Pricing the price is ServiceTitan's, from the hours (rounded to
 * the $10), and the API can't switch a service to a static price. So, as the
 * labour run does (labourSync.ts), the hours move until it charges the price,
 * aimed at the dollar here rather than "at least": each try scales the hours
 * by how far off the last one landed, a few tries at most.
 */
async function priceService(id: number, target: number): Promise<{ ok: boolean; before: number; after: number; error?: string }> {
  let s = await readService(id);
  if (!s) return { ok: false, before: 0, after: 0, error: "not active in the pricebook" };
  const before = charges(s);
  if (Math.abs(before - target) < 0.005) return { ok: true, before, after: before };
  const path = stTenantPath("pricebook", `services/${id}`);
  if (s.useStaticPrices !== false) {
    await stSend("PATCH", path, { price: target });
    s = await readService(id);
    const after = s ? charges(s) : NaN;
    if (Math.abs(after - target) < 0.005) return { ok: true, before, after };
    const locked = s?.isPriceLocked === true ? " (its price is locked in ServiceTitan)" : "";
    return { ok: false, before, after, error: `sent $${target}, ServiceTitan charges $${after}${locked}` };
  }
  let hours = Number(s.hours) || 0;
  let now = before;
  if (!(hours > 0) || !(now > 0)) return { ok: false, before, after: now, error: "on Dynamic Pricing with no hours to price from" };
  const tried = new Set<number>();
  for (let i = 0; i < 6; i++) {
    let next = Math.round(hours * (target / now) * 100) / 100;
    // ServiceTitan's $10 rounding can leave the same hours landing the same price: step past it.
    while (tried.has(next) || next === hours) next = Math.round((next + (now < target ? 0.01 : -0.01)) * 100) / 100;
    tried.add(next);
    await stSend("PATCH", path, { hours: next });
    s = await readService(id);
    if (!s) break;
    hours = Number(s.hours) || next;
    now = charges(s);
    if (Math.abs(now - target) < 0.005) return { ok: true, before, after: now };
  }
  return { ok: false, before, after: now, error: `on Dynamic Pricing: ${hours} h charges $${now}, not $${target}; set a static price on it in ServiceTitan` };
}

export async function setUpServices(until: number): Promise<{ priced: string[]; made: string[]; failed: string[]; skipped?: string }> {
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  if (p.done) return { priced: [], made: [], failed: [], skipped: "all done" };
  const made = (p.made ??= {}), priced = (p.priced ??= {}), fails = (p.fails ??= {}), notes = (p.notes ??= {});
  const log: AutoEntry[] = [], done: string[] = [], madeNow: string[] = [], failed: string[] = [];
  const save = () => saveSettings(KEY, p);
  const timeLeft = () => Date.now() < until;

  // --- 1. Each service to Jake's price ---------------------------------------------
  if ((fails.price ?? 0) < 3) {
    for (const t of SERVICE_PRICES) {
      if (priced[t.skuId] || !timeLeft()) continue;
      try {
        const s = await readService(t.skuId);
        // Matched by id, checked by name: an id that now names something else is never repriced.
        if (!s) { notes[t.skuId] = "not active in the pricebook"; continue; }
        if (!sameName(String(s.displayName ?? ""), t.name)) { notes[t.skuId] = `is now "${s.displayName}", left alone`; continue; }
        const r = await priceService(t.skuId, t.price);
        if (!r.ok) throw new Error(r.error);
        priced[t.skuId] = `$${r.before} → $${r.after}`;
        delete notes[t.skuId];
        if (r.before !== r.after) done.push(`${t.name}: $${r.before} → $${r.after}`);
        await save();
      } catch (e) {
        fails.price = (fails.price ?? 0) + 1;
        notes[t.skuId] = (e as Error).message.slice(0, 300);
        failed.push(t.name);
        log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `${t.name} couldn't be set to $${t.price}`, detail: notes[t.skuId] });
        break;
      }
    }
  }

  // --- 2. The $180 service for two or more splits ----------------------------------
  if (!made[MULTI_SPLIT.code] && (fails.service ?? 0) < 3 && timeLeft()) {
    try {
      // Made by hand meanwhile? Then it's that one.
      const there = (await stList<Raw>("pricebook", "services", { active: "True" }, 10))
        .find((s) => String(s.code ?? "").trim().toUpperCase() === MULTI_SPLIT.code);
      if (there) made[MULTI_SPLIT.code] = Number(there.id);
      else {
        const base = await readService(MULTI_SPLIT.from);
        if (!base) throw new Error("the single-split service it's made from isn't in the pricebook");
        const created = await stSend<Raw | null>("POST", stTenantPath("pricebook", "services"), {
          code: MULTI_SPLIT.code, displayName: MULTI_SPLIT.name,
          description: [MULTI_SPLIT.lead, String(base.description ?? "").trim()].filter(Boolean).join("\n\n"),
          price: MULTI_SPLIT.price, memberPrice: MULTI_SPLIT.price, addOnPrice: MULTI_SPLIT.price, addOnMemberPrice: MULTI_SPLIT.price,
          hours: Number(base.hours) || 1, cost: base.cost ?? null, taxable: base.taxable ?? true, account: base.account ?? null,
          categories: ids(base.categories), isLabor: base.isLabor ?? null, active: true,
        });
        const id = Number(created?.id);
        if (!id) throw new Error("ServiceTitan answered without the new service's id");
        // Recorded before anything else can fail, so it is never made twice.
        made[MULTI_SPLIT.code] = id;
        madeNow.push(MULTI_SPLIT.name);
        await save();
      }
    } catch (e) {
      fails.service = (fails.service ?? 0) + 1;
      failed.push(MULTI_SPLIT.name);
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `${MULTI_SPLIT.name} couldn't be added to the pricebook`, detail: (e as Error).message.slice(0, 300) });
    }
  }
  // Read back for its price: a new service can come in on Dynamic Pricing.
  const multiId = made[MULTI_SPLIT.code];
  if (multiId && !priced[multiId] && (fails.price ?? 0) < 3 && timeLeft()) {
    const r = await priceService(multiId, MULTI_SPLIT.price).catch((e: Error) => ({ ok: false, before: 0, after: 0, error: e.message }));
    if (r.ok) { priced[multiId] = `made at $${r.after}`; delete notes[multiId]; }
    else { fails.price = (fails.price ?? 0) + 1; notes[multiId] = r.error ?? "price not kept"; failed.push(MULTI_SPLIT.name); }
    await save();
  }

  // --- 3. The heater-and-evap discount lines ---------------------------------------
  const discountsLeft = HEATER_EVAP_DISCOUNTS.filter((d) => !made[d.code]);
  if (discountsLeft.length && (fails.material ?? 0) < 3 && timeLeft()) {
    // Laid out as the VEU discount is (its category), on the heater service's
    // account and GST: a discount on a service comes off the same income.
    const [veec, heater] = await Promise.all([
      stFetch<Raw>(stTenantPath("pricebook", "materials/301034820")).catch(() => null),
      readService(148186656).catch(() => null),
    ]);
    for (const d of discountsLeft) {
      if (!timeLeft()) break;
      try {
        const [synced] = await sbSelect<{ id: number }>("st_pricebook_materials", [q.select("id"), `code=eq.${encodeURIComponent(d.code)}`, "active=is.true"].join("&")).catch(() => []);
        if (synced) { made[d.code] = Number(synced.id); await save(); continue; }
        const created = await stSend<Raw | null>("POST", stTenantPath("pricebook", "materials"), {
          code: d.code, displayName: d.name, description: d.description,
          price: d.price, memberPrice: d.price, addOnPrice: d.price, addOnMemberPrice: d.price, cost: 0,
          active: true, taxable: heater?.taxable ?? true, account: heater?.account ?? veec?.account ?? null,
          categories: ids(veec?.categories), isInventory: false, hours: 0,
        });
        const id = Number(created?.id);
        if (!id) throw new Error("ServiceTitan answered without the new item's id");
        made[d.code] = id;
        madeNow.push(d.name);
        await save();
        const back = await stFetch<Raw>(stTenantPath("pricebook", `materials/${id}`)).catch(() => null);
        if (!back || Math.abs(Number(back.price) - d.price) >= 0.005) notes[d.code] = back ? `made, but reads back at $${back.price}, not $${d.price}` : "made, couldn't be read back";
      } catch (e) {
        fails.material = (fails.material ?? 0) + 1;
        failed.push(d.name);
        log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `${d.name} couldn't be added to the pricebook`, detail: (e as Error).message.slice(0, 300) });
        break;
      }
    }
  }

  const allPriced = SERVICE_PRICES.every((t) => priced[t.skuId]) && !!multiId && !!priced[multiId];
  const allMade = HEATER_EVAP_DISCOUNTS.every((d) => made[d.code] && !notes[d.code]);
  if (allPriced && allMade) p.done = at();
  if (done.length) log.push({ at: at(), kind: "quoteTemplates", ok: true, title: `Service prices set in ServiceTitan (Jake, 16 Nov)`, detail: done.join("; ").slice(0, 400) });
  if (madeNow.length) log.push({ at: at(), kind: "quoteTemplates", ok: true, title: `${madeNow.length} item${madeNow.length === 1 ? "" : "s"} added to the pricebook for the service templates`, detail: madeNow.join(", ").slice(0, 400) });
  await save();
  await logAuto(log).catch(() => undefined);
  return { priced: done, made: madeNow, failed };
}
