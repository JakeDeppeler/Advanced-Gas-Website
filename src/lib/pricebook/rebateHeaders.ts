import "server-only";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { templatePatchItems, type TemplateItem } from "./labour";
import { GENERIC_REBATE_HEADER, REBATE_HEADERS, rebateGroup, swapHeader, type RebateKind } from "./rebateSpecs";

/**
 * The hot water and heating-and-cooling rebate totals (rebateSpecs.ts) made in
 * ServiceTitan's pricebook, then put in place of the generic "Total Government
 * Rebates Applied" on every template that has it, the rebate lines under it
 * untouched. A call's worth at a time after each sync, each template read back.
 *
 * The swap is tried in place first (the same line, a different item). If
 * ServiceTitan keeps the old item, the new header goes in beside it, the lines
 * move under it, and the old one comes out.
 */
const KEY = "rebate_headers";
type Raw = Record<string, unknown>;
type Live = { id: number; name?: string; totalPrice?: number; items?: TemplateItem[] };
type Progress = { made?: Record<string, number>; swapped?: Record<string, string>; fails?: Record<string, number>; notes?: Record<string, string> };

const at = () => new Date().toISOString();
const ids = (v: unknown) => (Array.isArray(v) ? v : []).map((c) => Number((c as Raw)?.id ?? c)).filter((n) => Number.isFinite(n) && n > 0);
const memberCount = (items: TemplateItem[], headerId: number | null) => items.filter((i) => headerId != null && i.itemGroupParentId === headerId).length;

export async function splitRebateHeaders(until: number, all: Live[]): Promise<{ made: string[]; swapped: string[]; failed: string[]; left: number }> {
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  const made = (p.made ??= {}), swapped = (p.swapped ??= {}), fails = (p.fails ??= {}), notes = (p.notes ??= {});
  const todo = all.filter((t) => !swapped[t.id] && t.items && rebateGroup(t.items));
  const out = { made: [] as string[], swapped: [] as string[], failed: [] as string[], left: todo.length };
  if (!todo.length) return out;
  const log: AutoEntry[] = [];
  const save = () => saveSettings(KEY, p);

  // --- 1. The two headers, from the generic one ------------------------------------
  const kinds = Object.keys(REBATE_HEADERS) as RebateKind[];
  if (kinds.some((k) => !made[REBATE_HEADERS[k].code]) && (fails.make ?? 0) < 3) {
    try {
      const services = await stList<Raw>("pricebook", "services", { active: "True" }, 10);
      const generic = services.find((s) => Number(s.id) === GENERIC_REBATE_HEADER);
      if (!generic) throw new Error("the generic \"Total Government Rebates Applied\" isn't active in the pricebook");
      for (const k of kinds) {
        const h = REBATE_HEADERS[k];
        if (made[h.code]) continue;
        const there = services.find((s) => String(s.code ?? "").trim().toUpperCase() === h.code);
        if (there) { made[h.code] = Number(there.id); continue; }
        const created = await stSend<Raw | null>("POST", stTenantPath("pricebook", "services"), {
          code: h.code, displayName: h.name, description: h.description,
          price: 0, memberPrice: 0, addOnPrice: 0, addOnMemberPrice: 0, hours: 0, cost: null,
          taxable: generic.taxable ?? true, account: generic.account ?? null, categories: ids(generic.categories), isLabor: generic.isLabor ?? null, active: true,
        });
        const id = Number(created?.id);
        if (!id) throw new Error("ServiceTitan answered without the new item's id");
        made[h.code] = id;
        out.made.push(h.name);
        await save();
      }
    } catch (e) {
      fails.make = (fails.make ?? 0) + 1;
      out.failed.push("rebate headers");
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: "The hot water and heating & cooling rebate totals couldn't be added to the pricebook", detail: (e as Error).message.slice(0, 300) });
    }
  }
  if (kinds.some((k) => !made[REBATE_HEADERS[k].code]) || (fails.swap ?? 0) >= 3) {
    await save();
    await logAuto(log).catch(() => undefined);
    return out;
  }

  // --- 2. Each template's generic header swapped -----------------------------------
  for (const t of todo) {
    if (Date.now() > until) break;
    const g = rebateGroup(t.items!)!;
    const h = REBATE_HEADERS[g.kind];
    const skuId = made[h.code];
    const path = stTenantPath("sales", `estimate-templates/${t.id}`);
    const before = g.members.length;
    try {
      // In place: the same line, the new item. A refusal falls through to the two steps below.
      await stSend("PATCH", path, { items: templatePatchItems(swapHeader(t.items!, g.header, skuId, h.description)) }).catch(() => undefined);
      let back = await stFetch<Live>(path);
      let line = back.items?.find((i) => i.id === g.header.id);
      if (!line || Number(line.skuId) !== skuId) {
        // Kept the old item: the new header in beside it, then the lines moved under it and the old one out.
        const added: TemplateItem = { ...g.header, id: null, skuId, description: h.description, itemGroupParentId: null, parentItemId: null };
        await stSend("PATCH", path, { items: templatePatchItems([...(back.items ?? t.items!), added]) });
        back = await stFetch<Live>(path);
        const known = new Set((t.items ?? []).map((i) => i.id));
        const fresh = back.items?.find((i) => Number(i.skuId) === skuId && !i.itemGroupParentId && !known.has(i.id));
        if (!fresh?.id) throw new Error("ServiceTitan didn't keep the new rebate header");
        const oldHeader = back.items!.find((i) => i.id === g.header.id) ?? g.header;
        const final = swapHeader(back.items!.filter((i) => i !== fresh), oldHeader, skuId, h.description, fresh.id);
        await stSend("PATCH", path, { items: templatePatchItems(final) });
        back = await stFetch<Live>(path);
        line = back.items?.find((i) => i.id === fresh.id);
      }
      if (!line || Number(line.skuId) !== skuId) throw new Error("ServiceTitan answered OK but kept the generic rebate header");
      const after = memberCount(back.items ?? [], line.id);
      if (after !== before) throw new Error(`${before} rebate lines were under the header, ${after} are now`);
      if (back.items?.some((i) => Number(i.skuId) === GENERIC_REBATE_HEADER && !i.itemGroupParentId)) notes[t.id] = "the generic header is still on it as well";
      if (back.totalPrice != null && t.totalPrice != null && Math.abs(Number(back.totalPrice) - Number(t.totalPrice)) >= 0.01) notes[t.id] = `total was $${t.totalPrice}, now $${back.totalPrice}`;
      swapped[t.id] = `${g.kind} ${at()}`;
      out.swapped.push(t.name ?? String(t.id));
      await save();
    } catch (e) {
      fails.swap = (fails.swap ?? 0) + 1;
      out.failed.push(t.name ?? String(t.id));
      log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `Quote template "${t.name}" couldn't take the ${g.kind === "hotWater" ? "hot water" : "heating & cooling"} rebate total`, detail: (e as Error).message.slice(0, 300) });
      break;
    }
  }
  out.left = todo.filter((t) => !swapped[t.id]).length;
  if (out.made.length) log.push({ at: at(), kind: "quoteTemplates", ok: true, title: "Rebate totals for hot water and heating & cooling added to the pricebook", detail: out.made.join(", ") });
  if (out.swapped.length) log.push({ at: at(), kind: "quoteTemplates", ok: true, title: `${out.swapped.length} quote template${out.swapped.length === 1 ? "" : "s"} on the hot water or heating & cooling rebate total`, detail: out.left ? `${out.left} to go` : undefined });
  await save();
  await logAuto(log).catch(() => undefined);
  return out;
}
