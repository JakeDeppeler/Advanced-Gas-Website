import "server-only";
import { sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { templatePatchItems, type TemplateItem } from "./labour";
import { SERVICE_COPY } from "./wording";
import { DUCTED, DUPLICATES, INTERNAL_ON_EXTERNAL, ITC_SKU, RENAME_24, SKU, ZC10, planDucted25, planDuctedFixed, planFixes, planFixes24, planMitsubishiZoning, type Prices, type Tpl, type ZoningText } from "./templateFixPlan";

/**
 * Jake's 22 Nov template fixes (templateFixPlan.ts says what and why), written
 * by the quote-templates schedule a call's worth at a time. Each template is
 * read back after the write and the plan asked again: nothing left to do is
 * the check. A template that still wants a change after two goes is left
 * with a note, not tried every ten minutes.
 *
 * Three need ServiceTitan's answer first:
 *   - an internal heater swapped onto the internal install line: the old line
 *     is the root of its group, so the members are let go, the new line saved,
 *     and the members put back under the new line's id (as the labour run
 *     swaps them, labourSync.ts applyTemplatePrices);
 *   - the duplicates, switched off rather than deleted;
 *   - the ducted installation at a fixed $5,000 with its materials priced in
 *     the group, which waits until Dynamic Pricing is switched off on the
 *     service: the API can't switch it (no useStaticPrices on update), and
 *     while it's on, ServiceTitan folds the materials into the line's price.
 */

type Live = { id: number; name?: string; active?: boolean; totalPrice?: number; items?: TemplateItem[] };
type Progress = {
  /** template id → what was done, once nothing is left to do. */
  done?: Record<string, string>;
  /** template id → goes so far, while something is still left. */
  tries?: Record<string, number>;
  notes?: Record<string, string>;
  waiting?: string;
};
const KEY = "template_fixes_22nov";
const MAX_TRIES = 2;
type Raw = Record<string, unknown>;

const path = (id: number) => stTenantPath("sales", `estimate-templates/${id}`);
const tpl = (t: Live): Tpl => ({ id: t.id, name: (t.name ?? "").trim(), items: t.items ?? [] });

async function materialPrices(): Promise<Prices> {
  const rows = await sbSelect<{ id: number; price: string | null }>("st_pricebook_materials", "select=id,price:raw->>price&active=is.true&limit=2000").catch(() => []);
  return new Map(rows.filter((r) => r.price != null).map((r) => [Number(r.id), Number(r.price)]));
}

/** The Mitsubishi controller's and ITC's names, words and the controller's price, from the pricebook's synced copy. */
async function zoningText(): Promise<ZoningText | null> {
  const rows = await sbSelect<{ id: number; name: string; description: string | null; price: string | null }>("st_pricebook_equipment",
    `select=id,name,description:raw->>description,price:raw->>price&id=in.(${ZC10},${ITC_SKU})&active=is.true`);
  const zc = rows.find((r) => Number(r.id) === ZC10), itc = rows.find((r) => Number(r.id) === ITC_SKU);
  if (!zc || !itc || !(Number(zc.price) > 0)) return null;
  return { controllerPrice: Number(zc.price), controllerName: zc.name.trim(), controllerText: zc.description, itcName: itc.name.trim(), itcText: itc.description };
}

async function readService(id: number): Promise<Raw | null> {
  const r = await stFetch<{ data?: Raw[] }>(stTenantPath("pricebook", "services"), { ids: String(id), calculatePrices: "true" });
  return r.data?.[0] ?? null;
}

/** The external install line → the internal one, its group carried across. */
async function swapToInternal(t: Live): Promise<string> {
  const items = t.items ?? [];
  const ext = items.find((i) => i.skuId === SKU.gasExternal && !i.isAddOn);
  if (!ext || ext.id == null) return "already on the internal line";
  const svc = await readService(SKU.gasInternal);
  if (!svc) throw new Error("Gas Ducted Heater - Internal isn't active in the pricebook");
  const price = Number(svc.useStaticPrices === false && svc.calculatedPrice != null ? svc.calculatedPrice : svc.price) || Number(ext.unitPrice);
  const members = items.filter((i) => i.itemGroupParentId === ext.id && i.id != null).map((i) => i.id as number);
  const oldIds = new Set(items.map((i) => i.id).filter((x) => x != null));
  const groupName = (ext.itemGroupName ?? "Gas Ducted Heater - Internal").trim();
  const first = items.map((i) => (i === ext
    ? { id: null, skuId: SKU.gasInternal, skuType: "Service" as const, skuName: String(svc.displayName ?? "Gas Ducted Heater - Internal"), description: SERVICE_COPY["GAS-DUCT-INT"], quantity: 1, unitPrice: price, isAddOn: false, itemGroupName: groupName }
    : i.itemGroupParentId === ext.id ? { ...i, itemGroupParentId: null } : i));
  await stSend("PATCH", path(t.id), { items: templatePatchItems(first) });
  let back = await stFetch<Live>(path(t.id));
  const line = (back.items ?? []).find((i) => i.skuId === SKU.gasInternal && i.id != null && !oldIds.has(i.id));
  if (!line || (back.items ?? []).some((i) => i.skuId === SKU.gasExternal)) throw new Error("the external line wasn't swapped for the internal one");
  if (members.length) {
    const keep = new Set(members);
    const second = (back.items ?? []).map((i) => (i.id === line.id ? { ...i, itemGroupName: groupName } : i.id != null && keep.has(i.id) ? { ...i, itemGroupParentId: line.id } : i));
    await stSend("PATCH", path(t.id), { items: templatePatchItems(second) });
    back = await stFetch<Live>(path(t.id));
    const n = (back.items ?? []).filter((i) => i.itemGroupParentId === line.id).length;
    if (n !== members.length) throw new Error(`swapped, but ${n} of ${members.length} lines went back in its group`);
  }
  return `external install line ($${ext.unitPrice}) → internal ($${(back.items ?? []).find((i) => i.id === line.id)?.unitPrice ?? price}); total $${t.totalPrice} → $${back.totalPrice}`;
}

export async function fixTemplates22Nov(until: number, all: Live[]): Promise<{ fixed: string[]; failed: string[]; left: number; waiting?: string }> {
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  const done = (p.done ??= {}), tries = (p.tries ??= {}), notes = (p.notes ??= {});
  const fixed: string[] = [], failed: string[] = [], log: AutoEntry[] = [];
  const prices = await materialPrices();
  const byId = new Map(all.map((t) => [t.id, t]));
  const save = () => saveSettings(KEY, p);
  const open = (id: number) => !done[String(id)] && (tries[String(id)] ?? 0) < MAX_TRIES;
  const fail = (t: Live, e: unknown) => {
    tries[String(t.id)] = (tries[String(t.id)] ?? 0) + 1;
    notes[String(t.id)] = (e as Error).message.slice(0, 300);
    failed.push((t.name ?? String(t.id)).trim());
    log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Quote template "${(t.name ?? "").trim()}" couldn't be fixed`, detail: notes[String(t.id)] });
  };

  // 1. The duplicates, switched off.
  for (const d of DUPLICATES) {
    const t = byId.get(d.id);
    if (!t || !open(d.id) || Date.now() > until) continue;
    if ((t.name ?? "").trim() !== d.name) { done[String(d.id)] = `left alone: now "${(t.name ?? "").trim()}"`; continue; }
    try {
      await stSend("PATCH", path(d.id), { active: false });
      const back = await stFetch<Live>(path(d.id));
      if (back.active !== false) throw new Error("ServiceTitan answered OK but kept it switched on: switch it off in Pricebook › Estimate Templates");
      done[String(d.id)] = `switched off; "${d.keeps}" stays`;
      fixed.push(`${d.name}: switched off`);
    } catch (e) { fail(t, e); }
    await save();
  }

  // 2. Internal heaters onto the internal line.
  for (const id of INTERNAL_ON_EXTERNAL) {
    const t = byId.get(id);
    if (!t || !open(id) || Date.now() > until) continue;
    try {
      done[String(id)] = await swapToInternal(await stFetch<Live>(path(id)));
      fixed.push(`${(t.name ?? "").trim()}: ${done[String(id)]}`);
    } catch (e) { fail(t, e); }
    await save();
  }

  // 3. Every other change, one write per template.
  const swapIds = new Set<number>([...INTERNAL_ON_EXTERNAL, ...DUPLICATES.map((d) => d.id)]);
  let left = 0;
  for (const t of all) {
    if (swapIds.has(t.id) || done[String(t.id)]) continue;
    const plan = planFixes(tpl(t), prices);
    if (!plan) continue;
    if ((tries[String(t.id)] ?? 0) >= MAX_TRIES) continue;
    if (Date.now() > until) { left++; continue; }
    try {
      // Read again: an earlier step in this call may have written it since the list was read.
      const now = await stFetch<Live>(path(t.id));
      const fresh = planFixes(tpl({ ...now, id: t.id, name: now.name ?? t.name }), prices);
      if (!fresh) { done[String(t.id)] = "nothing left to do"; await save(); continue; }
      plan.items = fresh.items; plan.did = fresh.did;
      await stSend("PATCH", path(t.id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(t.id));
      const still = planFixes(tpl({ ...back, id: t.id, name: back.name ?? t.name }), prices);
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      done[String(t.id)] = `${plan.did.join("; ")}; total $${t.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { fail(t, e); }
    await save();
  }

  // 4. Ducted at a fixed price, once Dynamic Pricing is off on the installation.
  const svc = await readService(SKU.ductedInstall).catch(() => null);
  if (svc && svc.useStaticPrices === false) {
    p.waiting = `Dynamic Pricing is still on for "${String(svc.displayName ?? "Ducted Refrigerated System - Installation")}" (it charges $${svc.calculatedPrice ?? svc.price}). Switch it off on the service in ServiceTitan's pricebook and the four ducted templates follow.`;
  } else if (svc) {
    delete p.waiting;
    const fixedPrice = Number(svc.price);
    for (const id of DUCTED) {
      const t = byId.get(id);
      const key = `${id}:fixed`;
      if (!t || done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
      if (!planDuctedFixed(tpl(t), fixedPrice, prices)) { done[key] = "already at the fixed price"; continue; }
      try {
        const now = await stFetch<Live>(path(id));
        const plan = planDuctedFixed(tpl({ ...now, id, name: now.name ?? t.name }), fixedPrice, prices);
        if (!plan) { done[key] = "already at the fixed price"; await save(); continue; }
        await stSend("PATCH", path(id), { items: templatePatchItems(plan.items) });
        const back = await stFetch<Live>(path(id));
        const still = planDuctedFixed(tpl({ ...back, id, name: back.name ?? t.name }), fixedPrice, prices);
        if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
        done[key] = `${plan.did.join("; ")}; total $${t.totalPrice} → $${back.totalPrice}`;
        fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
      } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
      await save();
    }
  }

  // 5. Jake's 24 Nov answers (templateFixPlan.ts › planFixes24), keyed apart
  // from the 22 Nov ones so a template fixed then is still looked at.
  for (const t of all) {
    const key = `${t.id}:24nov`;
    if (done[key] || (tries[key] ?? 0) >= MAX_TRIES || !planFixes24(tpl(t))) continue;
    if (Date.now() > until) break;
    try {
      const now = await stFetch<Live>(path(t.id));
      const plan = planFixes24(tpl({ ...now, id: t.id, name: now.name ?? t.name }));
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(t.id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(t.id));
      const still = planFixes24(tpl({ ...back, id: t.id, name: back.name ?? t.name }));
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      done[key] = `${plan.did.join("; ")}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  // 6. The four ducted templates laid out as Jake laid out 20867 on 25 Nov
  // (templateFixPlan.ts › planDucted25): the installation at $0, the two-day
  // labour under it, the temperature controls at $0. Read back, and a line
  // ServiceTitan didn't take as sent is a failure, not a done.
  for (const id of DUCTED) {
    const t = byId.get(id);
    const key = `${id}:25nov`;
    if (!t || done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
    try {
      const now = await stFetch<Live>(path(id));
      const plan = planDucted25(tpl({ ...now, id, name: now.name ?? t.name }));
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(id));
      const still = planDucted25(tpl({ ...back, id, name: back.name ?? t.name }));
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      done[key] = `${plan.did.join("; ")}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  // 7. The four ducted templates on Mitsubishi Electric zoning (templateFixPlan.ts ›
  // planMitsubishiZoning), with the controller's and the ITC's own pricebook names,
  // words and price. Read back like the rest.
  const zoning = await zoningText().catch(() => null);
  for (const id of DUCTED) {
    const t = byId.get(id);
    const key = `${id}:zc10`;
    if (!zoning || !t || done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
    try {
      const now = await stFetch<Live>(path(id));
      const plan = planMitsubishiZoning(tpl({ ...now, id, name: now.name ?? t.name }), zoning);
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(id));
      const still = planMitsubishiZoning(tpl({ ...back, id, name: back.name ?? t.name }), zoning);
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      if (!(back.items ?? []).some((i) => i.skuId === ZC10 && !!i.itemGroupName)) throw new Error("the Mitsubishi controller didn't land in a group of its own");
      done[key] = `${plan.did.join("; ")}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  // The two Brivis coolers named as the price list has them.
  for (const r of RENAME_24) {
    const key = `equipment:${r.id}`;
    if (done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
    const ep = stTenantPath("pricebook", `equipment/${r.id}`);
    try {
      const now = await stFetch<Raw>(ep);
      const name = String(now.displayName ?? "").trim();
      if (name === r.to) { done[key] = "already named"; continue; }
      if (name !== r.from) { done[key] = `left alone: now "${name}"`; continue; }
      await stSend("PATCH", ep, { displayName: r.to });
      const back = await stFetch<Raw>(ep);
      if (String(back.displayName ?? "").trim() !== r.to) throw new Error(`ServiceTitan answered OK but kept "${String(back.displayName ?? "")}"`);
      done[key] = `renamed "${r.to}"`;
      fixed.push(`${r.from} → ${r.to}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push(r.from); }
    await save();
  }

  if (fixed.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${fixed.length} quote template${fixed.length === 1 ? "" : "s"} fixed (Jake's review)`, detail: fixed.join("; ").slice(0, 600) });
  await save();
  await logAuto(log).catch(() => undefined);
  return { fixed, failed, left, ...(p.waiting ? { waiting: p.waiting } : {}) };
}
