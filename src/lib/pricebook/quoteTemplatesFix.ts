import "server-only";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { templatePatchItems, type TemplateItem } from "./labour";
import { groupedItems, isGrouped, isTestTemplate, tidyCode, tidyName } from "./templateShape";
import { OTHER_TEMPLATES } from "./quoteTemplateSpecs";
import { plainText } from "./wording";

/** Templates kept as plain lines: the heater-and-evap discount has to show (quoteTemplateSpecs.ts › flat). */
const FLAT = new Set(OTHER_TEMPLATES.filter((t) => t.flat).map((t) => t.code));

/**
 * After the 15 Nov templates were made (quoteTemplatesAdd.ts), Jake on 16 Nov:
 * every quote laid out as the equipment in its own group, one header holding
 * the labour, electrical and materials at one price, then the BPC; and the
 * names the review found off the pattern put right. Run after each sync by
 * api/pricebook/quote-templates, a call's worth at a time, each template read
 * back. The one price change is templateShape's: an install's materials to $0
 * inside the group, as the office's own templates have them.
 */

type Live = { id: number; name?: string; internalName?: string | null; mode?: string; totalPrice?: number; summary?: string | null; items?: TemplateItem[] };
const KEY = "quote_templates_added";
const LOOK = "quote_templates_look";

type Progress = { templates?: Record<string, number>; grouped?: Record<string, string>; renamed?: Record<string, string>; fails?: Record<string, number>; notes?: Record<string, string> };

/**
 * Every active template as ServiceTitan has it now, lines and prices, saved
 * whole to portal_settings.quote_templates_look. Reads only: for seeing what
 * a template really charges (ServiceTitan prices a template's service lines
 * from the pricebook, whatever was sent) before anything is changed.
 */
export async function lookAtTemplates(): Promise<{ templates: number; proposals: number; saved: boolean }> {
  const all = await stList<Live>("sales", "estimate-templates", { active: "True" }, 5);
  // The proposals too, with the templates each offers: a proposal can't be read back by its id.
  const proposals = await stList<Record<string, unknown>>("sales", "proposal-templates", {}, 5).catch(() => [] as Record<string, unknown>[]);
  const look = {
    proposals: proposals.map((p) => ({
      id: p.id, name: p.name, active: p.active ?? null, type: p.proposalTypeName ?? null,
      // ServiceTitan's field is estimateAssignments, read and write alike.
      options: (Array.isArray(p.estimateAssignments) ? p.estimateAssignments : Array.isArray(p.options) ? p.options : []).map((o: Record<string, unknown>) => ({ order: o.order, templateId: o.estimateTemplateId, template: o.estimateTemplateName ?? null, optionId: o.proposalTypeOptionId })),
    })),
    at: new Date().toISOString(),
    templates: all.map((t) => ({
      id: t.id, name: t.name, code: t.internalName ?? null, mode: t.mode ?? null, total: t.totalPrice ?? null, summary: plainText(t.summary),
      items: (t.items ?? []).map((i) => ({
        id: i.id, skuId: i.skuId, type: i.skuType, name: (i.skuName ?? "").trim(), qty: i.quantity, price: i.unitPrice, cost: i.unitCost ?? null,
        addOn: i.isAddOn, group: i.itemGroupName ?? null, under: i.itemGroupParentId ?? null, parent: i.parentItemId ?? null,
        // The start of what the line says: enough to see the 17 Nov wording landed.
        desc: plainText(i.description).slice(0, 160),
      })),
    })),
  };
  const saved = await saveSettings(LOOK, look);
  return { templates: look.templates.length, proposals: look.proposals.length, saved: saved.ok };
}

/** The 15 Nov templates, grouped as Jake lays a quote out. */
export async function groupQuoteTemplates(until: number, all?: Live[]): Promise<{ grouped: string[]; failed: string[]; left: number }> {
  const p = ((await getSettings<Progress>(KEY).catch(() => null)) ?? {}) as Progress;
  const made = p.templates ?? {};
  const grouped = (p.grouped ??= {});
  const fails = (p.fails ??= {});
  const notes = (p.notes ??= {});
  const todo = Object.entries(made).filter(([code]) => !grouped[code]);
  if (!todo.length || (fails.group ?? 0) >= 3) return { grouped: [], failed: [], left: todo.length };
  const live = all ?? await stList<Live>("sales", "estimate-templates", { active: "True" }, 5);
  const byId = new Map(live.map((t) => [t.id, t]));
  const done: string[] = [], failed: string[] = [], log: AutoEntry[] = [];
  for (const [code, id] of todo) {
    if (Date.now() > until) break;
    if (FLAT.has(code)) { grouped[code] = "flat"; continue; }
    const t = byId.get(id);
    if (!t?.items) { notes[`group:${code}`] = "not in ServiceTitan's active templates"; continue; }
    const items = groupedItems(t.items);
    if (!items) { grouped[code] = new Date().toISOString(); continue; }
    const path = stTenantPath("sales", `estimate-templates/${id}`);
    try {
      await stSend("PATCH", path, { items: templatePatchItems(items) });
      const back = await stFetch<Live>(path);
      if (!back.items || !isGrouped(back.items)) throw new Error("ServiceTitan answered OK but kept the old layout");
      // A price ServiceTitan moved while regrouping is named, not hidden.
      if (back.totalPrice != null && t.totalPrice != null && Math.abs(Number(back.totalPrice) - Number(t.totalPrice)) >= 0.01) {
        notes[`group:${code}`] = `total was $${t.totalPrice}, now $${back.totalPrice}`;
      }
      grouped[code] = new Date().toISOString();
      done.push(t.name ?? code);
    } catch (e) {
      fails.group = (fails.group ?? 0) + 1;
      failed.push(t.name ?? code);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Quote template "${t.name}" couldn't be regrouped`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }
  const left = Object.keys(made).filter((c) => !grouped[c]).length;
  if (done.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${done.length} quote template${done.length === 1 ? "" : "s"} regrouped: equipment, then labour and materials at one price, then BPC`, detail: left ? `${left} to go` : undefined });
  await saveSettings(KEY, p);
  await logAuto(log).catch(() => undefined);
  return { grouped: done, failed, left };
}

/** The names and internal codes the review found off the pattern. */
export async function tidyTemplateNames(until: number, all?: Live[]): Promise<{ renamed: string[]; failed: string[] }> {
  const p = ((await getSettings<Progress>(KEY).catch(() => null)) ?? {}) as Progress;
  const fails = (p.fails ??= {});
  const renamed = (p.renamed ??= {});
  if ((fails.rename ?? 0) >= 3) return { renamed: [], failed: [] };
  const live = all ?? await stList<Live>("sales", "estimate-templates", { active: "True" }, 5);
  const ours = new Set(Object.values(p.templates ?? {}));
  const names = new Set(live.map((t) => (t.name ?? "").trim().toLowerCase()));
  const done: string[] = [], failed: string[] = [], log: AutoEntry[] = [];
  for (const t of live) {
    if (Date.now() > until) break;
    const name = t.name ?? "", code = t.internalName ?? "";
    if (ours.has(t.id) || isTestTemplate(name, code)) continue;
    const toName = tidyName(name), toCode = code ? tidyCode(code) : code;
    if (toName === name && toCode === code) continue;
    // Never two templates under one name.
    if (toName.toLowerCase() !== name.trim().toLowerCase() && names.has(toName.toLowerCase())) continue;
    const path = stTenantPath("sales", `estimate-templates/${t.id}`);
    try {
      await stSend("PATCH", path, { name: toName, internalName: toCode });
      const back = await stFetch<Live>(path);
      if (back.name !== toName || (back.internalName ?? "") !== toCode) throw new Error(`ServiceTitan answered OK but kept "${back.name}" / "${back.internalName ?? ""}"`);
      renamed[String(t.id)] = `${JSON.stringify(name)} → ${JSON.stringify(toName)}${toCode !== code ? `, ${JSON.stringify(code)} → ${toCode}` : ""}`;
      names.add(toName.toLowerCase());
      done.push(toName);
    } catch (e) {
      fails.rename = (fails.rename ?? 0) + 1;
      failed.push(name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Quote template "${name.trim()}" couldn't be renamed`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }
  if (done.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${done.length} quote template name${done.length === 1 ? "" : "s"} put to the pattern`, detail: done.join(", ").slice(0, 400) });
  await saveSettings(KEY, p);
  await logAuto(log).catch(() => undefined);
  return { renamed: done, failed };
}

/**
 * The review's "where they don't line up" fixes still open on 16 Nov, each on
 * the one template it names and only if that template still looks as the
 * review found it. The rest of that list (both Continuous Flow installs and
 * the Thermann 135L at $0, the Kaden 5kW roof install in twice) the 6 Nov
 * labour run had already put right. Once each; switched off, never deleted.
 */
type LineUp = { id: number; name: string; what: string } & (
  | { drop: (items: TemplateItem[]) => TemplateItem[] | null }
  | { off: true }
  | { rename: string }
);
const named = (re: RegExp) => (i: TemplateItem) => re.test((i.skuName ?? "").trim());
const LINE_UP: LineUp[] = [
  {
    id: 301078336, name: "Mitsubishi Electric 5kW Split System - Roof Mounted", what: "second compliance certificate removed",
    drop: (items) => {
      const bpc = items.filter(named(/^BPC Compliance Certificate$/i));
      return bpc.length === 2 ? items.filter((i) => i !== bpc[1]) : null;
    },
  },
  {
    // Four indoor units on it, so the four-head labour; the 5 and 6 head lines were left in.
    id: 301146356, name: "Rinnai 14kW Multi Head Split System", what: "5 and 6 head labour lines removed; the 4 head line stays",
    drop: (items) => {
      const heads = items.filter((i) => i.skuType === "Equipment" && /indoor/i.test(i.skuName ?? "")).length;
      const extra = items.filter(named(/^Multi Head Labour \((5|6) Head\)$/i));
      return heads === 4 && extra.length === 2 && items.some(named(/^Multi Head Labour \(4 Head\)$/i)) ? items.filter((i) => !extra.includes(i)) : null;
    },
  },
  // Only the refrigerant, at $0; "Split System - Leak Detection & Regas" (15 Nov) does the job.
  { id: 301387892, name: "Split System Leak Detection", what: "switched off: the new Leak Detection & Regas template replaces it", off: true },
  // No unit and the install only; the 59 Brivis templates and "Evaporative Cooler - Replacement (Add Unit)" replace it.
  { id: 301355120, name: "Brivis Contour L36 - Changeover", what: "switched off: the new Brivis and Add Unit templates replace it", off: true },
  { id: 301365843, name: "Continuous Flow - Installation", what: "names its unit", rename: "Thermann G-Series 26L Continuous Flow - Installation" },
  { id: 301354538, name: "Continuous Flow - Installation (New Gas Feed)", what: "names its unit", rename: "Thermann G-Series 26L Continuous Flow - Installation (New Gas Feed)" },
];

export async function lineUpFixes(until: number, all: Live[]): Promise<{ fixed: string[]; failed: string[] }> {
  type WithLineUp = Progress & { lineUp?: Record<string, string> };
  const p = ((await getSettings<WithLineUp>(KEY).catch(() => null)) ?? {}) as WithLineUp;
  const fails = (p.fails ??= {});
  const lineUp = (p.lineUp ??= {});
  if ((fails.lineUp ?? 0) >= 3) return { fixed: [], failed: [] };
  const byId = new Map(all.map((t) => [t.id, t]));
  const fixed: string[] = [], failed: string[] = [], log: AutoEntry[] = [];
  for (const f of LINE_UP) {
    if (Date.now() > until) break;
    if (lineUp[String(f.id)]) continue;
    const t = byId.get(f.id);
    if (!t || (t.name ?? "").trim() !== f.name) {
      lineUp[String(f.id)] = `skipped: not as the review found it (${t ? `now "${(t.name ?? "").trim()}"` : "not active"})`;
      continue;
    }
    const path = stTenantPath("sales", `estimate-templates/${f.id}`);
    try {
      if ("drop" in f) {
        const items = f.drop(t.items ?? []);
        if (!items) { lineUp[String(f.id)] = "skipped: its lines have changed since the review"; continue; }
        await stSend("PATCH", path, { items: templatePatchItems(items) });
        const back = await stFetch<Live>(path);
        if ((back.items?.length ?? 0) !== items.length) throw new Error(`ServiceTitan answered OK but has ${back.items?.length ?? 0} lines, not ${items.length}`);
        lineUp[String(f.id)] = `${f.what}: $${t.totalPrice} → $${back.totalPrice}`;
      } else if ("off" in f) {
        await stSend("PATCH", path, { active: false });
        const back = await stFetch<Live & { active?: boolean }>(path);
        if (back.active !== false) throw new Error("ServiceTitan answered OK but kept it switched on: switch it off in Pricebook › Estimate Templates");
        lineUp[String(f.id)] = f.what;
      } else {
        await stSend("PATCH", path, { name: f.rename });
        const back = await stFetch<Live>(path);
        if (back.name !== f.rename) throw new Error(`ServiceTitan answered OK but kept "${back.name}"`);
        lineUp[String(f.id)] = `renamed "${f.rename}"`;
      }
      fixed.push(`${f.name}: ${lineUp[String(f.id)]}`);
    } catch (e) {
      fails.lineUp = (fails.lineUp ?? 0) + 1;
      failed.push(f.name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `Quote template "${f.name}" couldn't be fixed`, detail: (e as Error).message.slice(0, 300) });
    }
  }
  if (fixed.length) log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `${fixed.length} quote template${fixed.length === 1 ? "" : "s"} lined up`, detail: fixed.join("; ").slice(0, 600) });
  await saveSettings(KEY, p);
  await logAuto(log).catch(() => undefined);
  return { fixed, failed };
}
