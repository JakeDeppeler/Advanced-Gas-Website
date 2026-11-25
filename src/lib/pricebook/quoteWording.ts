import "server-only";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { templatePatchItems, type TemplateItem } from "./labour";
import { EVAP_UNITS, OTHER_TEMPLATES, evapTemplate, type TemplateSpec } from "./quoteTemplateSpecs";
import { equipmentCopy } from "./equipmentCopy";
import { flatText, textHash, wordingAction } from "./summaryRule";
import { INSTALL_CODES, lineCopy, plainText, SERVICE_COPY, summaryHtml, templateFacts, templateSummary } from "./wording";

/**
 * Jake's 17 Nov wording onto ServiceTitan, after each sync, a call's worth at
 * a time:
 *
 *   - every install template's summary: what we're doing, removing, including
 *     and not (wording.ts; the templates made here take their own spec's);
 *   - each unit's own description in the pricebook (equipmentCopy.ts), first:
 *     a template's equipment line shows the pricebook's words, whatever the
 *     template sends (the Thermann 135L on 17 Nov kept its old line after a
 *     PATCH that changed its summary), so the pricebook is where they go;
 *   - the description on each service line (wording.ts › SERVICE_COPY). A
 *     line ServiceTitan won't change is noted, not a failure: the summary is
 *     what has to stick.
 *
 * Each is read back. The old words are saved to quote_wording_backup before
 * the first write over them, and summaryRule.ts decides what may be written
 * over. A template whose total moves after a write stops the run: a line
 * description should never change a price.
 *
 * Bump VERSION when the wording changes, and everything is looked at again.
 */
// 2026-11-19 (Jake, "do it on all the templates"): the labour line says only
// "All labour and materials required to complete the works described in the
// Job Summary". That run wrote it on 171 templates' lines and every one read
// back with the service's own words: a template's service line shows the
// pricebook service's description, whatever the template sends.
// 2026-11-22: so it goes on the installation services themselves (step 2
// below, wording.ts INSTALL_CODES), and the templates' lines are left to
// follow them.
export const VERSION = "2026-11-22";
// The units' own descriptions didn't change with it, so they stay on the
// 17 Nov pass: a new pass would treat any description nobody recorded as
// fair to write over, and nobody asked for the units to be looked at again.
const EQUIPMENT_VERSION = "2026-11-25";
// The installation services' own descriptions (step 2). Kept apart from VERSION so
// new install wording (Jake, 25 Nov: say what the installation covers) goes on
// the 18 services without walking all 199 templates again: a template's service
// line shows the service's description whatever the template holds.
const SERVICE_VERSION = "2026-11-25";
const KEY = "quote_wording";
const BACKUP = "quote_wording_backup";
/** ServiceTitan's limit on ids in one call. */
const CHUNK = 50;

type Raw = Record<string, unknown>;
type Live = { id: number; name?: string; summary?: string | null; totalPrice?: number; items?: TemplateItem[] };
type Rec = { v?: string; s?: string; l?: Record<string, string> };
type Progress = {
  templates?: Record<string, Rec>;
  equipment?: Record<string, { v?: string; h?: string }>;
  /** Installation services whose description is done, by id: the SERVICE_VERSION it was done at. */
  services?: Record<string, string>;
  /** The SERVICE_VERSION every installation service is done at. Until it is,
   *  a run goes on to step 2 even with no template or unit left to do. */
  servicesDone?: string;
  /** The version whose first pass is done: from then on, nothing unrecorded is written over. */
  firstPassDone?: string;
  left?: Record<string, string>;
  fails?: number;
  notes?: Record<string, string>;
};
type Backup = {
  templates?: Record<string, { at: string; summary: string; lines: Record<string, string> }>;
  equipment?: Record<string, { at: string; description: string }>;
  services?: Record<string, { at: string; code: string; description: string }>;
};

const at = () => new Date().toISOString();
const specs = (): TemplateSpec[] => [...EVAP_UNITS.map((u) => evapTemplate(u, 0, 0)), ...OTHER_TEMPLATES];

export async function syncQuoteWording(until: number, all: Live[], maxWrites = 25): Promise<{ templates: string[]; equipment: string[]; services: string[]; left: string[]; failed: string[]; todo: number }> {
  const out = { templates: [] as string[], equipment: [] as string[], services: [] as string[], left: [] as string[], failed: [] as string[], todo: 0 };
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  if ((p.fails ?? 0) >= 3) return out;
  const recs = (p.templates ??= {}), eqRecs = (p.equipment ??= {}), left = (p.left ??= {}), notes = (p.notes ??= {});
  // The first pass (17 Nov) was the one allowed to write over words it had no
  // record of. A later version only replaces words this put there itself, or
  // a service's own earlier words (below): a template the office has made or
  // edited since keeps what they wrote.
  const firstPass = p.firstPassDone == null;
  const eqFirstPass = firstPass;

  const equipIds = [...new Set(all.flatMap((t) => (t.items ?? []).filter((i) => i.skuType === "Equipment").map((i) => i.skuId)))];
  const templatesTodo = all.filter((t) => recs[t.id]?.v !== VERSION);
  const equipTodo = equipIds.filter((id) => eqRecs[id]?.v !== EQUIPMENT_VERSION);
  out.todo = templatesTodo.length + equipTodo.length;
  // The services are counted apart: they're only known once listed, and a
  // run that hit its write limit partway through them (25 Nov: 12 units and
  // 13 of the 18 services) must not be followed by runs that stop here
  // because the templates and units are done.
  if (!out.todo && p.servicesDone === SERVICE_VERSION) return out;

  const log: AutoEntry[] = [];
  const backup: Backup = (await getSettings<Backup>(BACKUP).catch(() => null)) ?? {};
  const bT = (backup.templates ??= {}), bE = (backup.equipment ??= {}), bS = (backup.services ??= {});
  let backupDirty = false;
  const keepBackup = async () => { if (backupDirty) { await saveSettings(BACKUP, backup); backupDirty = false; } };

  // What the lines are: service codes for the summary and the service wording,
  // the unit's name and model for its own.
  const services = await stList<Raw>("pricebook", "services", { active: "True" }, 10);
  const codeOf = new Map(services.map((s) => [Number(s.id), String(s.code ?? "").trim().toUpperCase()]));
  const units = new Map<number, Raw>();
  for (let k = 0; k < equipIds.length; k += CHUNK) {
    const rows = await stList<Raw>("pricebook", "equipment", { ids: equipIds.slice(k, k + CHUNK).join(",") }, 2);
    for (const r of rows) units.set(Number(r.id), r);
  }
  const unitCopy = (id: number) => {
    const r = units.get(id);
    return r ? equipmentCopy({ name: String(r.displayName ?? r.code ?? ""), model: r.model as string | null, code: r.code as string | null })?.text ?? null : null;
  };
  const made = (await getSettings<{ templates?: Record<string, number> }>("quote_templates_added").catch(() => null))?.templates ?? {};
  const specById = new Map(specs().filter((s) => made[s.code] != null).map((s) => [made[s.code], s] as const));

  let writes = 0, stopped = false;

  // --- 1. Each unit's own description in the pricebook ------------------------------
  for (const id of equipTodo) {
    if (Date.now() > until || writes >= maxWrites || out.failed.length) break;
    const r = units.get(id);
    const want = unitCopy(id);
    const rec = eqRecs[id] ?? {};
    if (!r || !want) { eqRecs[id] = { ...rec, v: EQUIPMENT_VERSION }; continue; }
    const a = wordingAction(r.description as string | null, want, rec.h, eqFirstPass);
    if (a !== "write") {
      if (a === "same") rec.h = textHash(flatText(want));
      else left[`equipment:${id}`] = `${String(r.displayName ?? id)}: description edited in ServiceTitan, left as it is`;
      eqRecs[id] = { ...rec, v: EQUIPMENT_VERSION };
      continue;
    }
    if (!bE[id]) backupDirty = true;
    if (!bE[id]) bE[id] = { at: at(), description: plainText(r.description as string | null) };
    const path = stTenantPath("pricebook", `equipment/${id}`);
    try {
      await keepBackup();
      await stSend("PATCH", path, { description: summaryHtml(want) });
      writes++;
      const back = await stFetch<Raw>(path);
      if (wordingAction(back.description as string | null, want, undefined, false) !== "same") throw new Error("the description reads back different");
      eqRecs[id] = { v: EQUIPMENT_VERSION, h: textHash(flatText(want)) };
      out.equipment.push(String(r.displayName ?? id).trim());
      await saveSettings(KEY, p);
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      notes[`equipment:${id}`] = (e as Error).message.slice(0, 200);
      out.failed.push(String(r.displayName ?? id));
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `"${String(r.displayName ?? id).trim()}" couldn't take its new description`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }

  // --- 2. The installation services' own descriptions ------------------------------
  // What every template's and quote's line for the service shows. Jake asked
  // for it on all of them, so it's written over whatever the service says,
  // the old words kept in quote_wording_backup first.
  const svcRecs = (p.services ??= {});
  const installCodes = new Set<string>(INSTALL_CODES);
  const installServices = services.filter((s) => installCodes.has(String(s.code ?? "").trim().toUpperCase()));
  for (const s of installServices) {
    const id = Number(s.id);
    if (svcRecs[id] === SERVICE_VERSION) continue;
    if (Date.now() > until || writes >= maxWrites || out.failed.length) break;
    const code = String(s.code ?? "").trim().toUpperCase();
    const want = SERVICE_COPY[code];
    const name = String(s.displayName ?? code).trim();
    if (plainText(s.description as string | null) === flatText(want)) { svcRecs[id] = SERVICE_VERSION; continue; }
    if (!bS[id]) { bS[id] = { at: at(), code, description: plainText(s.description as string | null) }; backupDirty = true; }
    // As the 17 Nov service wording went on (labourSync.ts applyWording): plain text, read back.
    const path = stTenantPath("pricebook", `services/${id}`);
    try {
      await keepBackup();
      await stSend("PATCH", path, { description: want });
      writes++;
      const back = await stFetch<Raw>(path);
      if (plainText(back.description as string | null) !== flatText(want)) throw new Error("the description reads back different");
      svcRecs[id] = SERVICE_VERSION;
      out.services.push(name);
      await saveSettings(KEY, p);
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      notes[`service:${id}`] = (e as Error).message.slice(0, 200);
      out.failed.push(name);
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `The "${name}" service couldn't take its new description`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }

  // --- 3. Templates: summary and service line descriptions ------------------------
  for (const t of templatesTodo) {
    if (Date.now() > until || writes >= maxWrites || stopped || out.failed.length) break;
    const items = t.items ?? [];
    const withCodes = items.map((i) => ({ ...i, code: i.skuType === "Service" ? codeOf.get(i.skuId) ?? "" : "" }));
    const facts = templateFacts(t.name ?? "", withCodes);
    const spec = specById.get(t.id);
    const wantSummary = spec ? spec.summary : facts ? templateSummary(facts) : null;
    const rec: Rec = recs[t.id] ?? {};
    const lineRecs = (rec.l ??= {});

    const sAction = wantSummary == null ? "same" : wordingAction(t.summary, wantSummary, rec.s, firstPass);
    const lineWants = new Map<number, string>();
    let lineWrites = 0;
    for (const i of withCodes) {
      if (i.id == null) continue;
      // Equipment lines follow the pricebook (step 1 below), not the template.
      const want = i.skuType === "Service" ? lineCopy(i.code, facts) : null;
      if (!want) continue;
      // A service line shows the service's own description whatever the
      // template sends (19 Nov), so it isn't written here: step 2 puts the
      // words on the service. It's only recorded once it reads the same.
      if (plainText(i.description) === flatText(want)) { lineRecs[i.id] = textHash(flatText(want)); delete left[`${t.id}:${i.id}`]; }
    }
    if (sAction === "same" && wantSummary) rec.s = textHash(flatText(wantSummary));
    if (sAction === "leave") left[String(t.id)] = `${t.name}: summary edited in ServiceTitan, left as it is`;
    if (sAction !== "write" && !lineWrites) { rec.v = VERSION; recs[t.id] = rec; continue; }

    // Kept before anything is written over.
    if (!bT[t.id]) backupDirty = true;
    if (!bT[t.id]) bT[t.id] = { at: at(), summary: plainText(t.summary), lines: Object.fromEntries(items.filter((i) => i.id != null).map((i) => [String(i.id), plainText(i.description)])) };
    const body: Record<string, unknown> = {};
    if (sAction === "write") body.summary = summaryHtml(wantSummary!);
    if (lineWrites) body.items = templatePatchItems(items.map((i) => (i.id != null && lineWants.has(i.id) ? { ...i, description: summaryHtml(lineWants.get(i.id)!) } : i)));
    const path = stTenantPath("sales", `estimate-templates/${t.id}`);
    try {
      await keepBackup();
      await stSend("PATCH", path, body);
      writes++;
      const back = await stFetch<Live>(path);
      if (back.totalPrice != null && t.totalPrice != null && Math.abs(Number(back.totalPrice) - Number(t.totalPrice)) >= 0.01) {
        stopped = true;
        throw new Error(`the total moved from $${t.totalPrice} to $${back.totalPrice}: stopped, a description shouldn't change a price`);
      }
      if (sAction === "write" && wordingAction(back.summary, wantSummary!, undefined, false) !== "same") throw new Error("the summary reads back different");
      for (const [id, want] of lineWants) {
        const b = back.items?.find((x) => x.id === id);
        if (b && wordingAction(b.description, want, undefined, false) === "same") lineRecs[id] = textHash(flatText(want));
        else left[`${t.id}:${id}`] = `${t.name}: line ${id} keeps ServiceTitan's own words`;
      }
      if (sAction === "write") rec.s = textHash(flatText(wantSummary!));
      rec.v = VERSION;
      recs[t.id] = rec;
      delete notes[String(t.id)];
      out.templates.push(t.name ?? String(t.id));
      await saveSettings(KEY, p);
    } catch (e) {
      p.fails = (p.fails ?? 0) + (stopped ? 3 : 1);
      notes[String(t.id)] = (e as Error).message.slice(0, 200);
      out.failed.push(t.name ?? String(t.id));
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `Quote template "${t.name}" couldn't take its new wording`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }

  const remaining = all.filter((t) => recs[t.id]?.v !== VERSION).length + equipIds.filter((id) => eqRecs[id]?.v !== EQUIPMENT_VERSION).length
    + installServices.filter((s) => svcRecs[Number(s.id)] !== SERVICE_VERSION).length;
  if (!remaining && firstPass) p.firstPassDone = VERSION;
  if (installServices.length && installServices.every((s) => svcRecs[Number(s.id)] === SERVICE_VERSION)) p.servicesDone = SERVICE_VERSION;
  out.left = Object.values(left).slice(0, 20);
  if (out.templates.length || out.equipment.length || out.services.length) {
    log.push({ at: at(), kind: "quoteTemplates", ok: true, title: `Quote wording: ${out.services.length ? `${out.services.length} installation service${out.services.length === 1 ? "" : "s"}, ` : ""}${out.templates.length} template${out.templates.length === 1 ? "" : "s"} and ${out.equipment.length} unit${out.equipment.length === 1 ? "" : "s"} updated`, detail: remaining ? `${remaining} to go` : "all done" });
  }
  await keepBackup();
  await saveSettings(KEY, p);
  await logAuto(log).catch(() => undefined);
  return out;
}
