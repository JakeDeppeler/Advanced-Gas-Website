import "server-only";
import { sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { templatePatchItems, type TemplateItem } from "./labour";
import { SERVICE_COPY } from "./wording";
import { LEAK_REGAS } from "./quoteTemplateSpecs";
import { ECOSTAR_18, HEATER_TEMPLATES } from "./reeceBuildSpecs";
import { reeceHeaterIds } from "./reeceBuild";
import { summaryHtml, templateSummary } from "./wording";

/** The one-size leak and regas template, R410A at 2.5kg. */
const OLD_LEAK_REGAS = 303258089;
import { DUCTED, DUCTED_HOURS, DUPLICATES, INTERNAL_ON_EXTERNAL, ITC_SKU, LAB_3P, RENAME_24, SKU, ZC10, ZONE_ADDONS, BDO, SUNDRY, GENERAL_SUNDRY, DOM18, cloneLines, regroup, planFixes28, planRepairParts, planDominator25, planDucted25, planDuctedFixed, planDuctedHourly, planFixes, planFixes24, planMitsubishiZoning, planZoneAddOn, planZoningB, type LabourLine, type Prices, type SkuLink, type Tpl, type ZoningText } from "./templateFixPlan";

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

  // 4. Ducted at a fixed price, once Dynamic Pricing was off on the installation
  // (24 Nov; all four done). Superseded on the evening of 25 Nov, when Jake put
  // the installation back on Dynamic Pricing to carry its materials (step 8):
  // so this no longer asks for it to be switched off, and on Dynamic Pricing it
  // does nothing.
  const svc = await readService(SKU.ductedInstall).catch(() => null);
  if (svc && svc.useStaticPrices !== false) {
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
  // 8. Ducted on Dynamic Pricing with the crew's hours as the labour (Jake, 25 Nov
  // evening; templateFixPlan.ts › planDuctedHourly). First the installation's
  // own hours to 0 in the pricebook, so its price is the materials at the
  // markup and nothing else. Only once it's on Dynamic Pricing: Jake switches
  // that himself (the API can't), and while it's static its hours price nothing.
  const install = await readService(SKU.ductedInstall).catch(() => null);
  const hoursKey = `service:${SKU.ductedInstall}:hours0`;
  if (install && install.useStaticPrices !== false) {
    p.waiting = `"${String(install.displayName ?? "Ducted Refrigerated System - Installation").trim()}" is on a static price: switch Dynamic Pricing on for it in ServiceTitan's pricebook so it carries the materials at the markup, and its hours go to 0 on the next run.`;
  } else if (install) {
    delete p.waiting;
    if (!done[hoursKey] && (tries[hoursKey] ?? 0) < MAX_TRIES && Date.now() <= until) {
      try {
        if (Number(install.hours) === 0) done[hoursKey] = "already 0 hours";
        else {
          await stSend("PATCH", stTenantPath("pricebook", `services/${SKU.ductedInstall}`), { hours: 0 });
          const back = await readService(SKU.ductedInstall);
          if (Number(back?.hours) !== 0) throw new Error(`ServiceTitan answered OK but kept ${String(back?.hours)} hours`);
          done[hoursKey] = `hours ${String(install.hours)} → 0 (it charged $${String(install.calculatedPrice ?? install.price)}, now $${String(back?.calculatedPrice ?? back?.price)} before materials)`;
          fixed.push(`Ducted installation: ${done[hoursKey]}`);
        }
      } catch (e) { tries[hoursKey] = (tries[hoursKey] ?? 0) + 1; notes[hoursKey] = (e as Error).message.slice(0, 300); failed.push("Ducted installation hours"); }
      await save();
    }
  }
  // Then the four templates: materials chargeable, the two-day labour off, the
  // crew line on at 16 hours, at the crew line's own pricebook name, words and rate.
  const crew = await readService(LAB_3P).catch(() => null);
  const lab: LabourLine | null = crew && crew.active !== false && Number(crew.price) > 0
    ? { name: String(crew.displayName ?? "Labour – Tech & 2 Apprentices").trim(), description: (crew.description as string | null) ?? null, price: Number(crew.price) }
    : null;
  for (const id of DUCTED) {
    const t = byId.get(id);
    const key = `${id}:hourly`;
    if (!lab || !t || done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
    try {
      const now = await stFetch<Live>(path(id));
      const plan = planDuctedHourly(tpl({ ...now, id, name: now.name ?? t.name }), lab);
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(id));
      const still = planDuctedHourly(tpl({ ...back, id, name: back.name ?? t.name }), lab);
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      const hourly = (back.items ?? []).find((i) => i.skuId === LAB_3P && !i.isAddOn);
      if (Number(hourly?.quantity) !== DUCTED_HOURS) throw new Error(`the crew line came back at ${String(hourly?.quantity)} hours, not ${DUCTED_HOURS}`);
      done[key] = `${plan.did.join("; ")}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  // 9. The two Dominator templates: the return air box off, the grille to 1200 x 400
  // (templateFixPlan.ts › planDominator25).
  for (const t of all) {
    const key = `${t.id}:dom25`;
    if (done[key] || (tries[key] ?? 0) >= MAX_TRIES || !planDominator25(tpl(t), prices)) continue;
    if (Date.now() > until) break;
    try {
      const now = await stFetch<Live>(path(t.id));
      const plan = planDominator25(tpl({ ...now, id: t.id, name: now.name ?? t.name }), prices);
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(t.id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(t.id));
      const still = planDominator25(tpl({ ...back, id: t.id, name: back.name ?? t.name }), prices);
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      done[key] = `${plan.did.join("; ")}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  // 10. Zoning option (b), Jake 28 Nov (templateFixPlan.ts › planZoneAddOn,
  // planZoningB): first the zone add-on services in the pricebook, then the
  // four templates, so a line ServiceTitan rebuilds from the add-on comes back
  // with the damper. Each read back.
  const links = (v: unknown): SkuLink[] => (Array.isArray(v) ? (v as Raw[]) : []).map((l) => ({ skuId: Number(l.skuId), quantity: Number(l.quantity) || 1 }));
  for (const [id, size] of ZONE_ADDONS) {
    const key = `service:${id}:zoneb`;
    if (done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
    try {
      const svc = await readService(id);
      if (!svc) throw new Error("not in the pricebook");
      const name = String(svc.displayName ?? `Zone ${size}mm Add-on`).trim();
      const plan = planZoneAddOn(size, links(svc.serviceMaterials), links(svc.serviceEquipment));
      if (!plan) { done[key] = "nothing to do"; await save(); continue; }
      await stSend("PATCH", stTenantPath("pricebook", `services/${id}`), {
        ...(plan.materials ? { serviceMaterials: plan.materials } : {}), ...(plan.equipment ? { serviceEquipment: plan.equipment } : {}),
      });
      const back = await readService(id);
      const still = back ? planZoneAddOn(size, links(back.serviceMaterials), links(back.serviceEquipment)) : null;
      if (!back || still) throw new Error(`ServiceTitan answered OK but still wants: ${still?.did.join("; ") ?? "it back"}`);
      done[key] = plan.did.join("; ");
      fixed.push(`${name}: ${done[key]}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push(`Zone ${size}mm add-on`); }
    await save();
  }
  for (const id of DUCTED) {
    const t = byId.get(id);
    const key = `${id}:zoneb`;
    if (!t || done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
    try {
      const now = await stFetch<Live>(path(id));
      const plan = planZoningB(tpl({ ...now, id, name: now.name ?? t.name }), prices);
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(id));
      const still = planZoningB(tpl({ ...back, id, name: back.name ?? t.name }), prices);
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      done[key] = `${plan.did.join("; ")}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  // 11. Jake's 28 Nov answers to the audit (templateFixPlan.ts › planFixes28):
  // the BDO and the sundry line off the templates, the Kaden heaters' parts on,
  // the certificate on the cooktops. Then, once no template carries them, the
  // BDO switched off and the heater sundry item made the general one.
  for (const t of all) {
    const key = `${t.id}:28nov`;
    if (done[key] || (tries[key] ?? 0) >= MAX_TRIES || !planFixes28(tpl(t))) continue;
    if (Date.now() > until) break;
    try {
      const now = await stFetch<Live>(path(t.id));
      const plan = planFixes28(tpl({ ...now, id: t.id, name: now.name ?? t.name }));
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(t.id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(t.id));
      const still = planFixes28(tpl({ ...back, id: t.id, name: back.name ?? t.name }));
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      done[key] = `${plan.did.join("; ")}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${plan.did.join("; ")}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  const stillOn = (sku: number) => all.some((t) => (t.items ?? []).some((i) => i.skuId === sku) && !done[`${t.id}:28nov`]);
  const items28: { key: string; id: number; body: Raw; check: (r: Raw) => boolean; what: string }[] = [
    ...BDO.map((id) => ({ key: `material:${id}:off`, id, body: { active: false }, check: (r: Raw) => r.active === false, what: "switched off" })),
    {
      key: `material:${SUNDRY.general}:general`, id: SUNDRY.general,
      // At $0 like the commercial one: the office prices sundries on the job.
      body: { displayName: GENERAL_SUNDRY.name, code: GENERAL_SUNDRY.code, description: GENERAL_SUNDRY.description, price: 0, cost: 0 },
      check: (r: Raw) => String(r.displayName ?? "").trim() === GENERAL_SUNDRY.name && Number(r.price) === 0,
      what: `renamed "${GENERAL_SUNDRY.name}", at $0 for the office to price`,
    },
  ];
  for (const m of items28) {
    if (done[m.key] || (tries[m.key] ?? 0) >= MAX_TRIES || Date.now() > until || stillOn(m.id)) continue;
    const ep = stTenantPath("pricebook", `materials/${m.id}`);
    try {
      const now = await stFetch<Raw>(ep);
      if (m.check(now)) { done[m.key] = `already ${m.what}`; await save(); continue; }
      await stSend("PATCH", ep, m.body);
      const back = await stFetch<Raw>(ep);
      if (!m.check(back)) throw new Error("ServiceTitan answered OK but kept it as it was");
      done[m.key] = `${String(now.displayName ?? m.id).trim()}: ${m.what}`;
      fixed.push(done[m.key]);
    } catch (e) { tries[m.key] = (tries[m.key] ?? 0) + 1; notes[m.key] = (e as Error).message.slice(0, 300); failed.push(`pricebook item ${m.id}`); }
    await save();
  }
  // 12. The repair templates: the repair line, then each part on its own line
  // (templateFixPlan.ts › planRepairParts). Read back like the rest.
  for (const t of all) {
    const key = `${t.id}:parts`;
    if (done[key] || (tries[key] ?? 0) >= MAX_TRIES || !planRepairParts(tpl(t), prices)) continue;
    if (Date.now() > until) break;
    try {
      const now = await stFetch<Live>(path(t.id));
      const plan = planRepairParts(tpl({ ...now, id: t.id, name: now.name ?? t.name }), prices);
      if (!plan) { done[key] = "nothing left to do"; await save(); continue; }
      await stSend("PATCH", path(t.id), { items: templatePatchItems(plan.items) });
      const back = await stFetch<Live>(path(t.id));
      const still = planRepairParts(tpl({ ...back, id: t.id, name: back.name ?? t.name }), prices);
      if (still) throw new Error(`ServiceTitan answered OK but still wants: ${still.did.join("; ")}`);
      const head = (back.items ?? []).find((i) => i.skuType === "Service" && !!i.itemGroupName && !i.itemGroupParentId);
      done[key] = `${plan.did.join("; ")}; repair line $${head?.unitPrice ?? "?"}; total $${now.totalPrice} → $${back.totalPrice}`;
      fixed.push(`${(t.name ?? "").trim()}: ${done[key]}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push((t.name ?? "").trim()); }
    await save();
  }
  // The one-size leak and regas (R410A, 2.5kg) switched off once a template for
  // each gas and size is in (Jake, 28 Nov: "should be off r32 and r410A").
  const retireKey = `${OLD_LEAK_REGAS}:retire`;
  const leakNames = LEAK_REGAS.map((t) => t.name.toLowerCase());
  if (!done[retireKey] && (tries[retireKey] ?? 0) < MAX_TRIES && Date.now() <= until
    && leakNames.every((n) => all.some((t) => (t.name ?? "").trim().toLowerCase() === n))) {
    try {
      await stSend("PATCH", path(OLD_LEAK_REGAS), { active: false });
      const back = await stFetch<Live>(path(OLD_LEAK_REGAS));
      if (back.active !== false) throw new Error("ServiceTitan answered OK but kept it switched on");
      done[retireKey] = `"${(back.name ?? "").trim()}" switched off: ${LEAK_REGAS.length} by gas and size replace it`;
      fixed.push(done[retireKey]);
    } catch (e) { tries[retireKey] = (tries[retireKey] ?? 0) + 1; notes[retireKey] = (e as Error).message.slice(0, 300); failed.push("Split System - Leak Detection & Regas"); }
    await save();
  }
  // 13. The Dominator 18kW external, made from the 12kW external (templateFixPlan.ts ›
  // DOM18), then the three named with their size. The new template's id is
  // recorded the moment it exists, so a run cut off part way never makes it twice.
  const domKey = "clone:dom18ext";
  if (!done[domKey] && (tries[domKey] ?? 0) < MAX_TRIES && Date.now() <= until) {
    try {
      const there = all.find((t) => (t.name ?? "").trim().toLowerCase() === DOM18.name.toLowerCase());
      let id = there?.id ?? (Number(notes[`${domKey}:id`]) || null);
      if (!id) {
        const src = await stFetch<Live & { summary?: string | null; mode?: string }>(path(DOM18.source));
        const unit = (await sbSelect<{ name: string; description: string | null; price: string | null }>("st_pricebook_equipment",
          `select=name,description:raw->>description,price:raw->>price&id=eq.${DOM18.unit}&active=is.true`))[0];
        if (!unit || !(Number(unit.price) > 0)) throw new Error("the Dominator 18kW external isn't active and priced in the pricebook");
        const { flat } = cloneLines(src.items ?? [], { from: DOM18.sourceUnit, to: DOM18.unit, name: unit.name.trim(), description: unit.description, price: Number(unit.price) });
        if (!flat.some((i) => i.skuId === DOM18.unit)) throw new Error("the 12kW external template no longer carries the 12kW unit");
        const made = await stSend<{ id?: number } | null>("POST", stTenantPath("sales", "estimate-templates"), {
          name: DOM18.name, internalName: DOM18.code, mode: src.mode ?? "Dynamic", summary: src.summary ?? null, active: true,
          items: templatePatchItems(flat).map((i) => ({ ...i, id: null })),
        });
        if (!made?.id) throw new Error("ServiceTitan answered without the new template's id");
        id = made.id;
        notes[`${domKey}:id`] = String(id);
        await save();
      }
      // Its groups, as the 12kW external has them.
      const src = await stFetch<Live>(path(DOM18.source));
      const unitName = (await sbSelect<{ name: string }>("st_pricebook_equipment", `select=name&id=eq.${DOM18.unit}`))[0]?.name.trim() ?? DOM18.name;
      const { flat, groups } = cloneLines(src.items ?? [], { from: DOM18.sourceUnit, to: DOM18.unit, name: unitName, price: 0 });
      const now = await stFetch<Live>(path(id));
      const grouped = regroup(now.items ?? [], flat, groups);
      if (!grouped) throw new Error(`made (${id}), but its lines don't match the 12kW external's to group them: ${(now.items ?? []).length} of ${flat.length}`);
      await stSend("PATCH", path(id), { items: templatePatchItems(grouped) });
      const back = await stFetch<Live>(path(id));
      const under = (back.items ?? []).filter((i) => i.itemGroupParentId != null).length;
      const want = groups.filter((g) => g.under >= 0).length;
      if (under !== want) throw new Error(`made (${id}), but ${under} of ${want} lines went into their groups`);
      done[domKey] = `made ${id}, ${(back.items ?? []).length} lines in the 12kW external's groups; total $${back.totalPrice}`;
      fixed.push(`${DOM18.name}: ${done[domKey]}`);
    } catch (e) { tries[domKey] = (tries[domKey] ?? 0) + 1; notes[domKey] = (e as Error).message.slice(0, 300); failed.push(DOM18.name); }
    await save();
  }
  for (const r of DOM18.renames) {
    const key = `${r.id}:rename28`;
    if (done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until || !done[domKey]) continue;
    try {
      const now = await stFetch<Live>(path(r.id));
      const name = (now.name ?? "").trim();
      if (name === r.to) { done[key] = "already named"; await save(); continue; }
      if (name !== r.from) { done[key] = `left alone: now "${name}"`; await save(); continue; }
      await stSend("PATCH", path(r.id), { name: r.to });
      const back = await stFetch<Live>(path(r.id));
      if ((back.name ?? "").trim() !== r.to) throw new Error(`ServiceTitan answered OK but kept "${back.name ?? ""}"`);
      done[key] = `renamed "${r.to}"`;
      fixed.push(`${r.from} → ${r.to}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push(r.from); }
    await save();
  }
  // 14. A template for each heater brought in from Reece (reeceBuildSpecs.ts ›
  // HEATER_TEMPLATES), made from the nearest the office quotes with the unit
  // swapped and its own summary, once the unit is in the pricebook.
  const heaterIds = await reeceHeaterIds().catch(() => ({} as Record<string, number>));
  for (const ht of HEATER_TEMPLATES) {
    const key = `clone:${ht.code}`;
    const unitId = heaterIds[ht.heater.code];
    if (!unitId || done[key] || (tries[key] ?? 0) >= MAX_TRIES || Date.now() > until) continue;
    try {
      const there = all.find((t) => (t.name ?? "").trim().toLowerCase() === ht.name.toLowerCase());
      let id = there?.id ?? (Number(notes[`${key}:id`]) || null);
      const src = await stFetch<Live & { mode?: string }>(path(ht.from.template));
      const unit = await stFetch<Raw>(stTenantPath("pricebook", `equipment/${unitId}`));
      const swap = { from: ht.from.unit, to: unitId, name: String(unit.displayName ?? ht.heater.name).trim(), description: (unit.description as string | null) ?? null, price: Number(unit.price) || 0 };
      const { flat, groups } = cloneLines(src.items ?? [], swap);
      if (!flat.some((i) => i.skuId === unitId)) throw new Error(`the template it's made from no longer carries its unit (${ht.from.unit})`);
      if (!id) {
        const summary = templateSummary({ name: ht.name, kind: "heater", brand: ht.brandLine, size: `${ht.heater.kw}kW`, heater: ht.from.template === ECOSTAR_18.template ? "external" : "internal" });
        const made = await stSend<{ id?: number } | null>("POST", stTenantPath("sales", "estimate-templates"), {
          name: ht.name, internalName: ht.code, mode: src.mode ?? "Dynamic", summary: summaryHtml(summary), active: true,
          items: templatePatchItems(flat).map((i) => ({ ...i, id: null })),
        });
        if (!made?.id) throw new Error("ServiceTitan answered without the new template's id");
        id = made.id;
        notes[`${key}:id`] = String(id);
        await save();
      }
      const now = await stFetch<Live>(path(id));
      const grouped = regroup(now.items ?? [], flat, groups);
      if (!grouped) throw new Error(`made (${id}), but its lines don't match the template it came from: ${(now.items ?? []).length} of ${flat.length}`);
      await stSend("PATCH", path(id), { items: templatePatchItems(grouped) });
      const back = await stFetch<Live>(path(id));
      const under = (back.items ?? []).filter((i) => i.itemGroupParentId != null).length;
      if (under !== groups.filter((g) => g.under >= 0).length) throw new Error(`made (${id}), but ${under} lines went into their groups`);
      done[key] = `made ${id} from ${ht.from.template}; total $${back.totalPrice}`;
      fixed.push(`${ht.name}: ${done[key]}`);
    } catch (e) { tries[key] = (tries[key] ?? 0) + 1; notes[key] = (e as Error).message.slice(0, 300); failed.push(ht.name); }
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
