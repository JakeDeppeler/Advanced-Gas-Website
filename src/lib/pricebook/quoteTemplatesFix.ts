import "server-only";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { templatePatchItems, type TemplateItem } from "./labour";
import { groupedItems, isGrouped, isTestTemplate, tidyCode, tidyName } from "./templateShape";

/**
 * After the 15 Nov templates were made (quoteTemplatesAdd.ts), Jake on 16 Nov:
 * every quote laid out as the equipment in its own group, one header holding
 * the labour, electrical and materials at one price, then the BPC; and the
 * names the review found off the pattern put right. Run after each sync by
 * api/pricebook/quote-templates, a call's worth at a time, each template read
 * back. Prices are never changed here.
 */

type Live = { id: number; name?: string; internalName?: string | null; mode?: string; totalPrice?: number; items?: TemplateItem[] };
const KEY = "quote_templates_added";
const LOOK = "quote_templates_look";

type Progress = { templates?: Record<string, number>; grouped?: Record<string, string>; renamed?: Record<string, string>; fails?: Record<string, number>; notes?: Record<string, string> };

/**
 * Every active template as ServiceTitan has it now, lines and prices, saved
 * whole to portal_settings.quote_templates_look. Reads only: for seeing what
 * a template really charges (ServiceTitan prices a template's service lines
 * from the pricebook, whatever was sent) before anything is changed.
 */
export async function lookAtTemplates(): Promise<{ templates: number; saved: boolean }> {
  const all = await stList<Live>("sales", "estimate-templates", { active: "True" }, 5);
  const look = {
    at: new Date().toISOString(),
    templates: all.map((t) => ({
      id: t.id, name: t.name, code: t.internalName ?? null, mode: t.mode ?? null, total: t.totalPrice ?? null,
      items: (t.items ?? []).map((i) => ({
        id: i.id, skuId: i.skuId, type: i.skuType, name: (i.skuName ?? "").trim(), qty: i.quantity, price: i.unitPrice, cost: i.unitCost ?? null,
        addOn: i.isAddOn, group: i.itemGroupName ?? null, under: i.itemGroupParentId ?? null, parent: i.parentItemId ?? null,
      })),
    })),
  };
  const saved = await saveSettings(LOOK, look);
  return { templates: look.templates.length, saved: saved.ok };
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
