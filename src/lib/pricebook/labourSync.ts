import "server-only";
import { randomUUID } from "node:crypto";
import { sbInsert } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings } from "@/lib/portal/db";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import {
  normCode, planServices, planTemplate, ratesFromPricing, templatePatchItems,
  type Catalogue, type Rates, type ServiceChange, type ServiceRow, type Template, type TemplatePlan, type TemplateSkip,
} from "@/lib/pricebook/labour";

// Labour pricing → ServiceTitan, plan then apply, the same shape as the Reece
// sync (stPricebook.ts): a plan is worked out from the live pricebook every
// time, an apply writes at most `limit` changes and reads each one back,
// because ServiceTitan answers 200 to fields it then ignores. Repeating an
// apply until `remaining` is 0 is the whole procedure.

type Raw = Record<string, unknown>;

export async function loadRates(): Promise<Rates> {
  return ratesFromPricing(normalisePricing(await getSettings<unknown>("pricing")));
}

const serviceRow = (s: Raw): ServiceRow => ({
  id: Number(s.id), code: String(s.code ?? ""), name: String(s.displayName ?? s.code ?? ""),
  hours: s.hours == null ? null : Number(s.hours), price: s.price == null ? null : Number(s.price), active: (s.active as boolean | null) ?? null,
});

export type LabourResult = { applied: number; verified: number; failed: { id: number; name: string; error: string }[]; remaining: number };

// --- services ----------------------------------------------------------------------

export async function planServicePrices() {
  const [rates, services] = await Promise.all([loadRates(), stList<Raw>("pricebook", "services", { active: "True" }, 10)]);
  return { rates, ...planServices(services.map(serviceRow), rates) };
}

export async function applyServicePrices(changes: ServiceChange[], limit: number): Promise<LabourResult> {
  const out: LabourResult = { applied: 0, verified: 0, failed: [], remaining: 0 };
  const batch = changes.slice(0, limit);
  out.remaining = changes.length - batch.length;
  for (const c of batch) {
    const path = stTenantPath("pricebook", `services/${c.id}`);
    try {
      await stSend("PATCH", path, { price: c.after });
      out.applied++;
      const back = await stFetch<Raw>(path);
      if (Math.abs(Number(back.price) - c.after) < 0.005) out.verified++;
      else out.failed.push({ id: c.id, name: c.name, error: `sent $${c.after}, ServiceTitan kept $${back.price}` });
    } catch (e) {
      out.failed.push({ id: c.id, name: c.name, error: (e as Error).message.slice(0, 300) });
    }
  }
  return out;
}

// --- templates ---------------------------------------------------------------------

async function catalogue(): Promise<Catalogue> {
  const [services, materials] = await Promise.all([
    stList<Raw>("pricebook", "services", { active: "True" }, 10),
    stList<Raw>("pricebook", "materials", { active: "True" }, 20),
  ]);
  const service: Catalogue["service"] = new Map();
  const multiHead: Catalogue["multiHead"] = new Map();
  for (const s of services) {
    const code = normCode(s.code);
    const hours = Number(s.hours) || 0;
    const name = String(s.displayName ?? s.code ?? "").trim();
    service.set(Number(s.id), { code, hours, name });
    const m = /^AC-SPLIT-MULTI-(\d)$/.exec(code);
    if (m) multiHead.set(Number(m[1]), { skuId: Number(s.id), hours, name });
  }
  const materialPrice = new Map<number, number>();
  for (const m of materials) if (m.price != null) materialPrice.set(Number(m.id), Number(m.price));
  return { service, materialPrice, multiHead };
}

export async function planTemplatePrices(): Promise<{ rate: number | null; plans: TemplatePlan[]; skipped: TemplateSkip[] }> {
  const [rates, cat, templates] = await Promise.all([
    loadRates(), catalogue(), stList<Template>("sales", "estimate-templates", { active: "True" }, 10),
  ]);
  const plans: TemplatePlan[] = [];
  const skipped: TemplateSkip[] = [];
  if (!rates.pair) return { rate: null, plans, skipped: [{ id: 0, name: "all", reason: "no tech & apprentice rate set in the portal" }] };
  for (const t of templates) {
    const p = planTemplate(t, cat, rates.pair);
    if ("reason" in p) { if (p.reason !== "not an aircon install template") skipped.push(p); }
    else plans.push(p);
  }
  plans.sort((a, b) => a.name.localeCompare(b.name));
  return { rate: rates.pair, plans, skipped };
}

export async function applyTemplatePrices(plans: TemplatePlan[], limit: number): Promise<LabourResult> {
  const out: LabourResult = { applied: 0, verified: 0, failed: [], remaining: 0 };
  const batch = plans.slice(0, limit);
  out.remaining = plans.length - batch.length;
  for (const p of batch) {
    const path = stTenantPath("sales", `estimate-templates/${p.id}`);
    try {
      await stSend("PATCH", path, { items: templatePatchItems(p.items) });
      out.applied++;
      // Read back: the header's price, every member in its group, and the total.
      const back = await stFetch<Template>(path);
      const head = back.items.find((i) => i.id === p.header.itemId);
      const inGroup = back.items.filter((i) => i.itemGroupParentId === p.header.itemId).length;
      const want = p.items.filter((i) => i.itemGroupParentId === p.header.itemId).length;
      const addOnSkus = new Set(p.addOns.map((a) => a.skuId));
      const addOnsBack = back.items.filter((i) => i.isAddOn && addOnSkus.has(i.skuId)).length;
      const problems = [
        addOnsBack !== p.addOns.length ? `${addOnsBack} of ${p.addOns.length} labour add-ons landed` : "",
        !head ? "the installation line is gone" : Math.abs(Number(head.unitPrice) - p.header.labour) >= 0.005 ? `labour kept at $${head.unitPrice}, not $${p.header.labour}` : "",
        inGroup !== want ? `${inGroup} of ${want} lines landed in the installation group` : "",
        back.totalPrice != null && Math.abs(Number(back.totalPrice) - p.after) >= 0.5 ? `total is $${back.totalPrice}, expected $${p.after}` : "",
      ].filter(Boolean);
      if (problems.length) out.failed.push({ id: p.id, name: p.name, error: problems.join("; ") });
      else out.verified++;
    } catch (e) {
      out.failed.push({ id: p.id, name: p.name, error: (e as Error).message.slice(0, 300) });
    }
  }
  return out;
}

// --- run log -------------------------------------------------------------------------

/** One row per run in pricebook_sync_runs, as the Reece sync keeps them. */
export async function recordLabourRun(
  what: "services" | "templates", mode: "dry-run" | "apply",
  summary: Record<string, unknown>, changes: unknown[], result?: LabourResult,
): Promise<string | null> {
  const id = randomUUID();
  try {
    await sbInsert("pricebook_sync_runs", {
      id, mode, supplier: `labour-${what}`, finished_at: new Date().toISOString(),
      summary: { ...summary, ...(result ? { applied: result.applied, verified: result.verified, failed: result.failed.length, remaining: result.remaining } : {}) },
      changes: changes.slice(0, 2000), errors: result?.failed ?? [], settings: {},
    });
  } catch (e) {
    console.error((e as Error).message);
    return null;
  }
  return id;
}
