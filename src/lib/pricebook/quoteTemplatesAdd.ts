import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import {
  EVAP_UNITS, OTHER_TEMPLATES, evapTemplate, evapUnitCode, evapUnitName, evapUnitPrice, findUnit, pricedItems,
  type EquipRow, type EvapUnit, type LiveSku, type TemplateSpec,
} from "./quoteTemplateSpecs";
import { summaryHtml } from "./wording";

/**
 * The 15 Nov quote templates made in ServiceTitan (Jake: "go ahead and make
 * the new templates"): first the Brivis sizes and colours the pricebook
 * doesn't sell yet, then a template for every Brivis unit and the rest of
 * quoteTemplateSpecs.ts.
 *
 * It runs as many as fit a call after each sync (api/pricebook/quote-templates),
 * because there are over a hundred and a function has a minute in all. Each item made is
 * recorded the moment it exists, so a run cut off part way never makes it
 * twice; the templates already in ServiceTitan are checked by name too, in
 * case one was made by hand meanwhile.
 *
 * Once, ever. A refusal from ServiceTitan stops that kind for the run, and
 * three runs refused is ServiceTitan's answer, left for a person.
 */
const KEY = "quote_templates_added";

type Raw = Record<string, unknown>;
type Progress = {
  units: Record<string, number>;
  templates: Record<string, number>;
  fails: Record<string, number>;
  /** Read back unlike what was sent: made, recorded, and named here for a look. */
  notes: Record<string, string>;
};

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/** The Brivis rows the sync keeps, by every vendor code they carry. */
async function brivisRows(): Promise<(EquipRow & { raw: Raw })[]> {
  const rows = await sbSelect<{ id: number; raw: Raw | null }>("st_pricebook_equipment",
    [q.select("id,raw"), "active=is.true", "name=ilike.*brivis*"].join("&"));
  return rows.map((r) => {
    const raw = r.raw ?? {};
    const vendors = [raw.primaryVendor, ...(Array.isArray(raw.otherVendors) ? raw.otherVendors : [])] as (Raw | null)[];
    return {
      id: Number(r.id), raw, model: String(raw.model ?? ""), price: Number(raw.price) || 0,
      parts: vendors.map((v) => String(v?.vendorPart ?? "")).filter(Boolean),
    };
  });
}

/** Today's price, cost and wording for each item, 50 to a call (ServiceTitan's limit on ids). */
async function liveSkus(ids: { skuId: number; skuType: string }[]): Promise<Map<number, LiveSku>> {
  const out = new Map<number, LiveSku>();
  const byType: Record<string, number[]> = {};
  for (const i of ids) {
    const list = (byType[i.skuType] ??= []);
    if (!list.includes(i.skuId)) list.push(i.skuId);
  }
  const resource: Record<string, string> = { Service: "services", Material: "materials", Equipment: "equipment" };
  for (const [type, all] of Object.entries(byType)) {
    for (let k = 0; k < all.length; k += 50) {
      const chunk = all.slice(k, k + 50);
      const rows = await stList<Raw>("pricebook", resource[type], {
        ids: chunk.join(","), active: "True", ...(type === "Service" ? { calculatePrices: "true" } : {}),
      }, 2);
      for (const r of rows) {
        // A service on Dynamic Pricing charges its calculated price, not the stored one.
        const price = type === "Service" && r.useStaticPrices === false && r.calculatedPrice != null ? num(r.calculatedPrice) : num(r.price);
        out.set(Number(r.id), { price, cost: num(r.cost), description: (r.description as string) || null, name: String(r.displayName ?? r.code ?? "") });
      }
    }
  }
  return out;
}

export async function addQuoteTemplates(budgetMs = 10_000): Promise<{ units: string[]; templates: string[]; failed: string[]; left?: number; skipped?: string }> {
  const until = Date.now() + budgetMs;
  const timeLeft = () => Date.now() < until;
  const saved = await getSettings<Partial<Progress>>(KEY).catch(() => null);
  // Spread first: the regroup and the renames keep their progress in the same record.
  const p: Progress = { ...(saved ?? {}), units: saved?.units ?? {}, templates: saved?.templates ?? {}, fails: saved?.fails ?? {}, notes: saved?.notes ?? {} };
  const otherLeft = OTHER_TEMPLATES.filter((t) => !(t.code in p.templates));
  const evapLeft = EVAP_UNITS.filter((u) => !(evapCode(u) in p.templates));
  const unitsOn = (p.fails.equipment ?? 0) < 3, templatesOn = (p.fails.template ?? 0) < 3;
  if ((!otherLeft.length && !evapLeft.length) || (!unitsOn && !templatesOn)) return { units: [], templates: [], failed: [], skipped: "all done" };

  const log: AutoEntry[] = [], madeUnits: string[] = [], madeTemplates: string[] = [], failed: string[] = [];
  const at = () => new Date().toISOString();
  const save = () => saveSettings(KEY, p);

  // --- 1. Brivis units the pricebook doesn't sell yet -------------------------------
  const rows = await brivisRows();
  const unitId = (u: EvapUnit): number | undefined => p.units[u.part] ?? findUnit(u, rows)?.id;
  const have = EVAP_UNITS.flatMap((u) => {
    const r = findUnit(u, rows);
    return r ? [{ model: u.model, price: r.price }] : [];
  });
  // The pattern for a new item: a Brivis cooler bought from Rinnai, as the L36 is.
  const like = rows.find((r) => (r.raw.primaryVendor as Raw | null)?.vendorName === "Rinnai Australia Pty Ltd"
    && Array.isArray(r.raw.categories) && (r.raw.categories as unknown[]).length > 0 && /contour/i.test(String(r.raw.displayName)));
  const contourWords = rows.map((r) => String(r.raw.description ?? "")).filter((d) => /^Brivis Contour slimline/.test(d)).sort((a, b) => b.length - a.length)[0];

  if (unitsOn && like) {
    for (const u of EVAP_UNITS) {
      if (unitId(u) != null) continue;
      if (!timeLeft()) break;
      const price = evapUnitPrice(u, have);
      const pv = like.raw.primaryVendor as Raw;
      const body = {
        code: evapUnitCode(u), displayName: evapUnitName(u),
        // The Contour wording on the pricebook is about the range, not one size.
        description: u.series === "Contour" && contourWords ? contourWords : `${evapUnitName(u)}.`,
        price, memberPrice: 0, addOnPrice: 0, addOnMemberPrice: 0, cost: u.cost,
        manufacturer: "Brivis", model: `${u.series} ${u.model} ${u.colour}`, active: true,
        account: like.raw.account ?? "Sales", taxable: like.raw.taxable ?? true, isInventory: false, hours: 0,
        categories: like.raw.categories,
        primaryVendor: { vendorId: pv.vendorId, vendorPart: u.part, cost: u.cost, active: true },
      };
      try {
        const made = await stSend<{ id?: number } | null>("POST", stTenantPath("pricebook", "equipment"), body);
        if (!made?.id) throw new Error("ServiceTitan answered without the new item's id");
        // Recorded before anything else can fail, so it is never made twice.
        p.units[u.part] = made.id;
        have.push({ model: u.model, price });
        madeUnits.push(evapUnitName(u));
        await save();
        const back = await stFetch<Raw>(stTenantPath("pricebook", `equipment/${made.id}`)).catch(() => null);
        const vendor = (back?.primaryVendor as Raw | null)?.vendorPart;
        if (!back || Number(back.price) !== price || vendor !== u.part) {
          p.notes[u.part] = back ? `kept price $${back.price}, vendor code ${vendor ?? "none"} (sent $${price}, ${u.part})` : "couldn't be read back";
        }
      } catch (e) {
        p.fails.equipment = (p.fails.equipment ?? 0) + 1;
        failed.push(evapUnitName(u));
        log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `${evapUnitName(u)} couldn't be added to the pricebook`, detail: (e as Error).message.slice(0, 300) });
        break;
      }
    }
  }

  // --- 2. The templates ----------------------------------------------------------------
  const specs: TemplateSpec[] = [];
  for (const u of evapLeft) {
    const id = unitId(u);
    // The unit's line is charged, so pricedItems puts today's price on it.
    if (id != null) specs.push(evapTemplate(u, id, findUnit(u, rows)?.price ?? evapUnitPrice(u, have)));
  }
  specs.unshift(...otherLeft);
  // More than a call can make is no use fetching prices for.
  let batch = specs.slice(0, 30);
  if (templatesOn && batch.length && timeLeft()) {
    // A line named by its code (a service made after the ids were read) gets
    // its id from the live pricebook; one not there stays 0 and is waited on.
    if (batch.some((s) => s.lines.some((l) => l.code && !l.skuId))) {
      const byCode = new Map((await stList<Raw>("pricebook", "services", { active: "True" }, 5))
        .map((r) => [String(r.code ?? "").trim().toUpperCase(), Number(r.id)] as const));
      batch = batch.map((s) => ({ ...s, lines: s.lines.map((l) => (l.code && !l.skuId ? { ...l, skuId: byCode.get(l.code.toUpperCase()) ?? 0 } : l)) }));
    }
    const [live, existing] = await Promise.all([
      liveSkus(batch.flatMap((s) => s.lines).filter((l) => l.skuId)),
      stList<{ id: number; name?: string; internalName?: string }>("sales", "estimate-templates", { active: "True" }, 5),
    ]);
    const byName = new Map<string, number>();
    for (const t of existing) {
      if (t.name) byName.set(norm(t.name), t.id);
      if (t.internalName) byName.set(norm(t.internalName), t.id);
    }
    for (const s of batch) {
      if (!timeLeft()) break;
      const there = byName.get(norm(s.name)) ?? byName.get(norm(s.code));
      if (there) { p.templates[s.code] = there; continue; }
      const { items, missing } = pricedItems(s.lines, live);
      if (missing.length) {
        if (!p.notes[s.code]) log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `Quote template "${s.name}" not made`, detail: `Item ${missing.join(", ")} isn't active in the pricebook.` });
        p.notes[s.code] = `waiting on item ${missing.join(", ")}`;
        continue;
      }
      try {
        const made = await stSend<{ id?: number } | null>("POST", stTenantPath("sales", "estimate-templates"), {
          // ServiceTitan refuses a create without a mode (400, "Required property
          // 'mode'"). Every template already there is Dynamic, so these are too.
          name: s.name, internalName: s.code, mode: "Dynamic", summary: summaryHtml(s.summary), active: true, items,
        });
        if (!made?.id) throw new Error("ServiceTitan answered without the new template's id");
        p.templates[s.code] = made.id;
        madeTemplates.push(s.name);
        await save();
        // ServiceTitan can answer 200 and drop a field, so read it back; lines
        // missing are put on the way the price runs always have.
        const path = stTenantPath("sales", `estimate-templates/${made.id}`);
        let back = await stFetch<{ items?: unknown[]; mode?: string; summary?: string | null }>(path).catch(() => null);
        if (back && (back.items?.length ?? 0) < items.length) {
          await stSend("PATCH", path, { items: items.map((i) => ({ ...i, id: null })) }).catch(() => undefined);
          back = await stFetch<{ items?: unknown[]; mode?: string; summary?: string | null }>(path).catch(() => null);
        }
        const problems = [
          !back && "couldn't be read back",
          back && (back.items?.length ?? 0) < items.length && `has ${back.items?.length ?? 0} of ${items.length} lines`,
          back && !back.summary && "has no summary",
        ].filter(Boolean);
        if (problems.length) p.notes[s.code] = problems.join(", ");
        else delete p.notes[s.code];
        if (back?.mode) p.notes.mode = back.mode;
      } catch (e) {
        p.fails.template = (p.fails.template ?? 0) + 1;
        failed.push(s.name);
        log.push({ at: at(), kind: "quoteTemplates", ok: false, title: `Quote template "${s.name}" couldn't be made`, detail: (e as Error).message.slice(0, 300) });
        break;
      }
    }
  }

  const left = OTHER_TEMPLATES.filter((t) => !(t.code in p.templates)).length + EVAP_UNITS.filter((u) => !(evapCode(u) in p.templates)).length;
  if (madeUnits.length) log.push({ at: at(), kind: "quoteTemplates", ok: true, title: `${madeUnits.length} Brivis cooler${madeUnits.length === 1 ? "" : "s"} added to the pricebook`, detail: madeUnits.join(", ").slice(0, 400) });
  if (madeTemplates.length) log.push({ at: at(), kind: "quoteTemplates", ok: true, title: `${madeTemplates.length} quote template${madeTemplates.length === 1 ? "" : "s"} added to ServiceTitan`, detail: `${madeTemplates.join(", ").slice(0, 400)}${left ? ` (${left} to go)` : ""}` });
  await save();
  await logAuto(log).catch(() => undefined);
  return { units: madeUnits, templates: madeTemplates, failed, left };
}

const evapCode = (u: EvapUnit) => evapTemplate(u, 0, 0).code;
