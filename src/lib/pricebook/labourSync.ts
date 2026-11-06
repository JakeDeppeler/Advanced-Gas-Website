import "server-only";
import { randomUUID } from "node:crypto";
import { sbInsert } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings } from "@/lib/portal/db";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import {
  normCode, planRefrigerant, planServices, planTemplate, ratesFromPricing, templatePatchItems,
  type Catalogue, type MaterialChange, type RefrigerantSettings, type Rates, type ServiceChange, type ServiceRow,
  type Template, type TemplatePlan, type TemplateSkip,
} from "@/lib/pricebook/labour";
import { lineCopy, plainText, SERVICE_COPY, summaryHtml, templateFacts, templateSummary } from "@/lib/pricebook/wording";

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
  const [rates, services, materials, refrigerant] = await Promise.all([
    loadRates(), stList<Raw>("pricebook", "services", { active: "True" }, 10),
    stList<Raw>("pricebook", "materials", { active: "True" }, 20), getSettings<RefrigerantSettings>("refrigerant"),
  ]);
  const materialChanges = planRefrigerant(materials.map((m) => ({
    id: Number(m.id), code: String(m.code ?? ""), name: String(m.displayName ?? m.code ?? ""),
    price: m.price == null ? null : Number(m.price), cost: m.cost == null ? null : Number(m.cost), active: (m.active as boolean | null) ?? null,
  })), refrigerant);
  return { rates, refrigerant, materialChanges, ...planServices(services.map(serviceRow), rates) };
}

/**
 * Refrigerant price and cost. Price sticks on a material directly; cost, on
 * the pricebook sync's evidence, only through a supplier (primaryVendor), and
 * the refrigerant has none set. So cost is sent and read back, and a cost
 * ServiceTitan kept is reported as such rather than counted as written.
 */
export async function applyRefrigerant(changes: MaterialChange[]): Promise<LabourResult> {
  const out: LabourResult = { applied: 0, verified: 0, failed: [], remaining: 0 };
  for (const c of changes) {
    const path = stTenantPath("pricebook", `materials/${c.id}`);
    try {
      const now = await stFetch<Raw>(path);
      const pv = now.primaryVendor as Raw | null | undefined;
      const body: Record<string, unknown> = { price: c.after, cost: c.cost };
      if (pv && pv.vendorId != null) body.primaryVendor = { ...pv, cost: c.cost };
      await stSend("PATCH", path, body);
      out.applied++;
      const back = await stFetch<Raw>(path);
      const price = Number(back.price);
      const cost = Number((back.primaryVendor as Raw | null | undefined)?.cost ?? back.cost);
      if (Math.abs(price - c.after) >= 0.005) out.failed.push({ id: c.id, name: c.name, error: `sent $${c.after}, ServiceTitan kept $${back.price}` });
      else if (Math.abs(cost - c.cost) >= 0.005) out.failed.push({ id: c.id, name: c.name, error: `price set to $${c.after}; cost stayed $${cost}: give it a supplier in ServiceTitan for the cost to stick` });
      else out.verified++;
    } catch (e) {
      out.failed.push({ id: c.id, name: c.name, error: (e as Error).message.slice(0, 300) });
    }
  }
  return out;
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

  // A split's optional extras, found by code. One that's missing or unpriced
  // simply isn't offered.
  const splitAddOns: Catalogue["splitAddOns"] = [];
  const svc = (code: string) => services.find((s) => normCode(s.code) === code);
  const mat = (code: string) => materials.find((m) => normCode(m.code) === code);
  // Removing the old unit isn't offered here: a new install includes it
  // (Jake, 6 Nov). The removal service is for a visit where nothing goes in.
  const pump = mat("SILENT MINI PUMP FP3450");
  if (pump && Number(pump.price) > 0) splitAddOns.push({ skuId: Number(pump.id), skuType: "Material", name: String(pump.displayName ?? "Condensate pump").trim(), price: Number(pump.price) });
  const blygold = svc("BLYGOLD");
  if (blygold && Number(blygold.price) > 0) splitAddOns.push({ skuId: Number(blygold.id), skuType: "Service", name: String(blygold.displayName ?? "Blygold").trim(), price: Number(blygold.price) });

  return { service, materialPrice, multiHead, splitAddOns };
}

export async function planTemplatePrices(): Promise<{ rates: { partDay: number | null; pair: number | null }; plans: TemplatePlan[]; skipped: TemplateSkip[] }> {
  const rates = await loadRates();
  const plans: TemplatePlan[] = [];
  const skipped: TemplateSkip[] = [];
  if (!rates.pair || !rates.partDay) return { rates: { partDay: rates.partDay, pair: rates.pair }, plans, skipped: [{ id: 0, name: "all", reason: "set both the tech & apprentice rate and the part-day install rate in the portal" }] };
  const partDay = rates.partDay;
  const [cat, templates] = await Promise.all([catalogue(), stList<Template>("sales", "estimate-templates", { active: "True" }, 10)]);
  for (const t of templates) {
    const p = planTemplate(t, cat, { pair: rates.pair, partDay });
    if ("reason" in p) { if (p.reason !== "not an aircon install template") skipped.push(p); }
    else plans.push(p);
  }
  plans.sort((a, b) => a.name.localeCompare(b.name));
  return { rates: { partDay, pair: rates.pair }, plans, skipped };
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
  what: "services" | "templates" | "wording", mode: "dry-run" | "apply",
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

// --- wording -------------------------------------------------------------------------
//
// Service descriptions, template summaries, and the description on each
// template line that uses a service with new words (src/lib/pricebook/wording.ts).
// Same plan → apply → read back as the prices.

export type WordingChange = {
  kind: "service" | "template";
  id: number;
  name: string;
  before: string;
  after: string;
  /** Template lines whose description changes. */
  lines?: number;
  items?: Template["items"];
};

export async function planWording(): Promise<{ changes: WordingChange[]; untouched: string[] }> {
  const [services, templates] = await Promise.all([
    stList<Raw>("pricebook", "services", { active: "True" }, 10),
    stList<Template & { summary?: string | null }>("sales", "estimate-templates", { active: "True" }, 10),
  ]);
  const codeOf = new Map(services.map((s) => [Number(s.id), normCode(s.code)]));
  const changes: WordingChange[] = [];
  const untouched: string[] = [];

  for (const s of services) {
    const after = SERVICE_COPY[normCode(s.code)];
    if (!after) continue;
    const before = plainText(s.description as string | null);
    if (before === after) continue;
    changes.push({ kind: "service", id: Number(s.id), name: String(s.displayName ?? s.code ?? "").trim(), before, after });
  }

  for (const t of templates) {
    const items = t.items.map((i) => ({ ...i, code: i.skuType === "Service" ? codeOf.get(i.skuId) ?? "" : "" }));
    const facts = templateFacts(t.name, items);
    if (!facts) { untouched.push(t.name.trim()); continue; }
    const after = templateSummary(facts);
    const before = plainText(t.summary);
    let lines = 0;
    const patched = t.items.map((i, k) => {
      const want = i.skuType === "Service" ? lineCopy(items[k].code, facts) : null;
      if (!want || plainText(i.description) === want) return i;
      lines++;
      return { ...i, description: want };
    });
    if (before === after.replace(/\n\n/g, "\n") && lines === 0) continue;
    changes.push({ kind: "template", id: t.id, name: t.name.trim(), before, after, lines, items: lines ? patched : undefined });
  }
  return { changes, untouched };
}

export async function applyWording(changes: WordingChange[], limit: number): Promise<LabourResult> {
  const out: LabourResult = { applied: 0, verified: 0, failed: [], remaining: 0 };
  const batch = changes.slice(0, limit);
  out.remaining = changes.length - batch.length;
  for (const c of batch) {
    try {
      if (c.kind === "service") {
        const path = stTenantPath("pricebook", `services/${c.id}`);
        await stSend("PATCH", path, { description: c.after });
        out.applied++;
        const back = await stFetch<Raw>(path);
        if (plainText(back.description as string | null) === c.after) out.verified++;
        else out.failed.push({ id: c.id, name: c.name, error: "the description didn't stick" });
      } else {
        const path = stTenantPath("sales", `estimate-templates/${c.id}`);
        await stSend("PATCH", path, { summary: summaryHtml(c.after), ...(c.items ? { items: templatePatchItems(c.items) } : {}) });
        out.applied++;
        const back = await stFetch<Template & { summary?: string | null }>(path);
        const summaryOk = plainText(back.summary) === c.after.replace(/\n\n/g, "\n");
        const linesOk = !c.items || c.items.every((i) => {
          const b = back.items.find((x) => x.id === i.id);
          return !b || plainText(b.description) === plainText(i.description);
        });
        if (summaryOk && linesOk) out.verified++;
        else out.failed.push({ id: c.id, name: c.name, error: [summaryOk ? "" : "the summary didn't stick", linesOk ? "" : "a line description didn't stick"].filter(Boolean).join("; ") });
      }
    } catch (e) {
      out.failed.push({ id: c.id, name: c.name, error: (e as Error).message.slice(0, 300) });
    }
  }
  return out;
}
