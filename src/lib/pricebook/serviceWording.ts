import "server-only";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { templatePatchItems, type TemplateItem } from "./labour";
import { madeServiceItems } from "./serviceSetup";
import { MULTI_SPLIT } from "./servicePricing";
import { SERVICE_SCOPES, scopeFlat, scopeHtml, scopeText, type ServiceScope } from "./serviceScopes";
import { flatText, textHash, wordingAction } from "./summaryRule";
import { plainText } from "./wording";

/**
 * Jake's service and maintenance wording (19 Nov) onto ServiceTitan: each of
 * the six service items' own description in the pricebook, and the line for
 * it on every quote template that has one, as a template keeps its own copy
 * of a service's words. Worded so it reads the same on a quote or an invoice
 * (serviceScopes.ts).
 *
 * The same rules as the quote wording (summaryRule.ts): the first pass of a
 * version writes over what's there, the old words kept in
 * service_wording_backup first; after that only over its own, so an edit the
 * office makes in ServiceTitan stays. Every write is read back, and a
 * template whose total moves stops the run.
 */
export const VERSION = "2026-11-19";
const KEY = "service_wording";
const BACKUP = "service_wording_backup";

type Raw = Record<string, unknown>;
type Live = { id: number; name?: string; totalPrice?: number; items?: TemplateItem[] };
type Progress = { v?: string; items?: Record<string, string>; lines?: Record<string, string>; left?: Record<string, string>; fails?: number; done?: string };
type Backup = { items?: Record<string, { at: string; description: string }>; lines?: Record<string, { at: string; description: string }> };

const at = () => new Date().toISOString();

export async function syncServiceWording(until: number, all: Live[], maxWrites = 12): Promise<{ items: string[]; templates: string[]; left: string[]; failed: string[] }> {
  const out = { items: [] as string[], templates: [] as string[], left: [] as string[], failed: [] as string[] };
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  if (p.v !== VERSION) Object.assign(p, { v: VERSION, items: {}, lines: {}, left: {}, fails: 0, done: undefined });
  if (p.done === VERSION || (p.fails ?? 0) >= 3) return out;
  const items = (p.items ??= {}), lines = (p.lines ??= {}), left = (p.left ??= {});
  const backup: Backup = (await getSettings<Backup>(BACKUP).catch(() => null)) ?? {};
  const bItems = (backup.items ??= {}), bLines = (backup.lines ??= {});
  const log: AutoEntry[] = [];

  // Each scope's item id: the five Jake priced, and the multi-split item made from one.
  const made = await madeServiceItems().catch(() => ({} as Record<string, number>));
  const byId = new Map<number, ServiceScope>();
  for (const s of SERVICE_SCOPES) {
    const id = s.skuId ?? (s.code === MULTI_SPLIT.code ? made[MULTI_SPLIT.code] : undefined);
    if (id) byId.set(id, s);
  }

  let writes = 0;
  const finish = async () => {
    await saveSettings(BACKUP, backup);
    await saveSettings(KEY, p);
    await logAuto(log).catch(() => undefined);
  };

  // --- 1. The pricebook items -------------------------------------------------
  for (const [id, scope] of byId) {
    if (items[id] && items[id] !== "pending") continue;
    if (Date.now() > until || writes >= maxWrites) break;
    const path = stTenantPath("pricebook", `services/${id}`);
    try {
      const r = await stFetch<{ data?: Raw[] }>(stTenantPath("pricebook", "services"), { ids: String(id) });
      const live = r.data?.[0];
      if (!live) { items[id] = "missing"; left[`item:${id}`] = `${scope.name}: not in the pricebook`; continue; }
      const a = wordingAction(live.description as string | null, scopeText(scope), undefined, true);
      if (a === "same") { items[id] = textHash(scopeFlat(scope)); continue; }
      bItems[id] ??= { at: at(), description: String(live.description ?? "") };
      await saveSettings(BACKUP, backup);
      await stSend("PATCH", path, { description: scopeHtml(scope) });
      writes++;
      const back = (await stFetch<{ data?: Raw[] }>(stTenantPath("pricebook", "services"), { ids: String(id) })).data?.[0];
      if (plainText(back?.description as string | null) !== scopeFlat(scope)) throw new Error("the description reads back different");
      items[id] = textHash(scopeFlat(scope));
      out.items.push(scope.name);
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      out.failed.push(scope.name);
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `"${scope.name}" couldn't take its new wording`, detail: (e as Error).message.slice(0, 300) });
      await finish();
      return out;
    }
  }

  // --- 2. Each template's line for one -------------------------------------------
  let stopped = false;
  for (const t of all) {
    if (Date.now() > until || writes >= maxWrites || stopped) break;
    const tItems = t.items ?? [];
    const want = new Map<number, ServiceScope>();
    for (const i of tItems) {
      const scope = i.skuType === "Service" && i.id != null ? byId.get(i.skuId) : undefined;
      if (!scope) continue;
      const k = `${t.id}:${i.id}`;
      const a = wordingAction(i.description, scopeText(scope), lines[k], !lines[k]);
      if (a === "same") lines[k] = textHash(scopeFlat(scope));
      else if (a === "write" && !lines[k]) want.set(i.id!, scope);
      else if (a === "leave") left[k] = `${t.name}: "${i.skuName}" line edited in ServiceTitan, left as it is`;
    }
    if (!want.size) continue;
    for (const i of tItems) if (i.id != null && want.has(i.id)) bLines[`${t.id}:${i.id}`] ??= { at: at(), description: plainText(i.description) };
    const path = stTenantPath("sales", `estimate-templates/${t.id}`);
    try {
      await saveSettings(BACKUP, backup);
      await stSend("PATCH", path, { items: templatePatchItems(tItems.map((i) => (i.id != null && want.has(i.id) ? { ...i, description: scopeHtml(want.get(i.id)!) } : i))) });
      writes++;
      const back = await stFetch<Live>(path);
      if (back.totalPrice != null && t.totalPrice != null && Math.abs(Number(back.totalPrice) - Number(t.totalPrice)) >= 0.01) {
        stopped = true;
        throw new Error(`the total moved from $${t.totalPrice} to $${back.totalPrice}: stopped, a description shouldn't change a price`);
      }
      for (const [lineId, scope] of want) {
        const b = back.items?.find((x) => x.id === lineId);
        if (b && plainText(b.description) === scopeFlat(scope)) lines[`${t.id}:${lineId}`] = textHash(scopeFlat(scope));
        else { lines[`${t.id}:${lineId}`] = "kept"; left[`${t.id}:${lineId}`] = `${t.name}: line ${lineId} keeps ServiceTitan's own words`; }
      }
      out.templates.push(t.name ?? String(t.id));
    } catch (e) {
      p.fails = (p.fails ?? 0) + (stopped ? 3 : 1);
      out.failed.push(t.name ?? String(t.id));
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `Quote template "${t.name}" couldn't take the new service wording`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }

  const itemsDone = [...byId.keys()].every((id) => items[id] && items[id] !== "pending");
  const linesDone = all.every((t) => (t.items ?? []).every((i) => !(i.skuType === "Service" && i.id != null && byId.has(i.skuId)) || lines[`${t.id}:${i.id}`] || left[`${t.id}:${i.id}`]));
  if (itemsDone && linesDone && !out.failed.length && byId.size === SERVICE_SCOPES.length) p.done = VERSION;
  out.left = Object.values(left).slice(0, 20);
  if (out.items.length || out.templates.length) {
    log.push({ at: at(), kind: "quoteTemplates", ok: true, title: `Service wording: ${out.items.length} pricebook item${out.items.length === 1 ? "" : "s"} and ${out.templates.length} template${out.templates.length === 1 ? "" : "s"} updated`, detail: p.done ? "all done" : "more to go" });
  }
  await finish();
  return out;
}

/** For the look-back: what a stored description reads as, against ours. */
export const sameAsScope = (html: string | null | undefined, scope: ServiceScope) => plainText(html) === flatText(scopeText(scope));
