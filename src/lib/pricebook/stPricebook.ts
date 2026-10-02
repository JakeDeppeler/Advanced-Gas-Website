import { randomUUID } from "node:crypto";
import { q, sbInsert, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { serviceTitanConfigured, stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";

// Pushes supplier (Reece) pricing into the ServiceTitan pricebook.
//
// The flow is plan → apply, and they are separate on purpose. A plan reads the
// supplier replica and the live pricebook, matches them, and produces the exact
// list of writes it would make. Nothing touches ServiceTitan until an apply is
// asked for explicitly, and even then every write is read back and compared:
// ServiceTitan returns 200 for several fields it silently drops (top-level
// `cost` on a material is one; a `vendors` array is another), so an HTTP success
// proves nothing. Cost therefore goes through `primaryVendor`, and a read-back
// that disagrees with what was sent is reported as a failure.
//
// Matching is by Reece product code, carried on the ServiceTitan material as the
// primary vendor's supplier part number. That is the only stable key: display
// names get edited, and ServiceTitan material codes are whatever the office typed.

export type PricebookSettings = {
  vendorName: string;
  priceMode: "markup" | "cost-only";
  markupPercent: number;
  roundTo: number;
  createMissing: boolean;
  codePrefix: string;
};

const DEFAULT_SETTINGS: PricebookSettings = {
  vendorName: "Reece",
  priceMode: "cost-only",
  markupPercent: 0,
  roundTo: 1,
  createMissing: false,
  codePrefix: "",
};

export async function loadPricebookSettings(): Promise<PricebookSettings> {
  const row = await sbSelectOne<{ value: Partial<PricebookSettings> }>(
    "portal_settings",
    [q.select("value"), q.eq("key", "pricebook")].join("&"),
  );
  const v = row?.value ?? {};
  return {
    vendorName: typeof v.vendorName === "string" && v.vendorName.trim() ? v.vendorName.trim() : DEFAULT_SETTINGS.vendorName,
    priceMode: v.priceMode === "markup" ? "markup" : "cost-only",
    markupPercent: Number.isFinite(Number(v.markupPercent)) ? Number(v.markupPercent) : 0,
    roundTo: Number(v.roundTo) > 0 ? Number(v.roundTo) : 1,
    createMissing: v.createMissing === true,
    codePrefix: typeof v.codePrefix === "string" ? v.codePrefix : "",
  };
}

// --- ServiceTitan shapes ------------------------------------------------------

export type StVendor = { id: number; name: string; active?: boolean };

export type StPrimaryVendor = {
  id?: number;
  vendorId: number;
  vendorName?: string;
  cost?: number | null;
  supplierPartNumber?: string | null;
  active?: boolean;
};

export type StMaterial = {
  id: number;
  code: string;
  displayName?: string | null;
  description?: string | null;
  cost?: number | null;
  price?: number | null;
  memberPrice?: number | null;
  active?: boolean;
  taxable?: boolean;
  unitOfMeasure?: string | null;
  primaryVendor?: StPrimaryVendor | null;
  modifiedOn?: string;
};

/** The Reece vendor record in ServiceTitan — found by name, created if absent. */
export async function resolveVendor(name: string): Promise<StVendor> {
  const vendors = await stList<StVendor>("pricebook", "vendors", {}, 20);
  const wanted = name.trim().toLowerCase();
  const found = vendors.find((v) => v.name?.trim().toLowerCase() === wanted);
  if (found) return found;

  try {
    const created = await stSend<StVendor>("POST", stTenantPath("pricebook", "vendors"), {
      name: name.trim(),
      active: true,
    });
    if (created?.id) return created;
  } catch (e) {
    throw new Error(
      `Vendor "${name}" is not in the ServiceTitan pricebook and could not be created (${(e as Error).message}). ` +
        `Create it under Pricebook → Vendors, or set pricebook.vendorName in portal_settings to the existing vendor's exact name.`,
    );
  }
  throw new Error(`Vendor "${name}" could not be created — ServiceTitan returned no id.`);
}

/** Every material, active or not. Inactive ones still match so they can be revived rather than duplicated. */
export async function loadMaterials(): Promise<StMaterial[]> {
  return stList<StMaterial>("pricebook", "materials", { active: "Any" }, 500);
}

export type MaterialIndex = {
  byVendorPart: Map<string, StMaterial>;
  byCode: Map<string, StMaterial>;
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

export function buildMaterialIndex(materials: StMaterial[], vendorId: number): MaterialIndex {
  const byVendorPart = new Map<string, StMaterial>();
  const byCode = new Map<string, StMaterial>();
  for (const m of materials) {
    if (m.code) byCode.set(norm(m.code), m);
    const pv = m.primaryVendor;
    if (pv && pv.vendorId === vendorId && pv.supplierPartNumber) {
      byVendorPart.set(norm(pv.supplierPartNumber), m);
    }
  }
  return { byVendorPart, byCode };
}

/** Find the ServiceTitan material for a supplier code: vendor part number first, then material code with and without the prefix. */
export function findMaterial(index: MaterialIndex, code: string, codePrefix: string): StMaterial | undefined {
  const k = norm(code);
  return (
    index.byVendorPart.get(k) ??
    index.byCode.get(norm(codePrefix + code)) ??
    index.byCode.get(k)
  );
}

// --- supplier replica ----------------------------------------------------------

export type SupplierItem = {
  supplier: string;
  code: string;
  description: string | null;
  uom: string | null;
  pack_qty: number | null;
  cost: number | null;
  gst_applies: boolean;
  list_price: number | null;
  category: string | null;
  barcode: string | null;
  source: string;
  seen_at: string;
};

export async function loadSupplierItems(supplier = "reece"): Promise<SupplierItem[]> {
  const out: SupplierItem[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const rows = await sbSelect<SupplierItem>(
      "supplier_items",
      [
        q.select("supplier,code,description,uom,pack_qty,cost,gst_applies,list_price,category,barcode,source,seen_at"),
        q.eq("supplier", supplier),
        q.order("code"),
        `offset=${from}`,
        `limit=${page}`,
      ].join("&"),
    );
    // PostgREST returns numeric columns as strings in some configurations; normalise once here.
    for (const r of rows) {
      out.push({ ...r, cost: r.cost == null ? null : Number(r.cost), pack_qty: r.pack_qty == null ? null : Number(r.pack_qty), list_price: r.list_price == null ? null : Number(r.list_price) });
    }
    if (rows.length < page) break;
  }
  return out;
}

// --- plan -------------------------------------------------------------------------

export type Change = {
  action: "update" | "create";
  code: string;
  materialId?: number;
  materialCode?: string;
  description: string | null;
  before?: { cost: number | null; price: number | null };
  after: { cost: number; price: number | null };
  fields: string[];
};

export type Plan = {
  vendor: StVendor;
  settings: PricebookSettings;
  changes: Change[];
  /** Supplier rows keyed by normalised code — what a create needs (unit, GST flag) beyond the change itself. */
  itemsByCode: Map<string, SupplierItem>;
  summary: {
    supplierItems: number;
    materials: number;
    matched: number;
    toUpdate: number;
    toCreate: number;
    unchanged: number;
    unmatchedNotCreated: number;
    noCost: number;
    missingInSupplier: number;
  };
  /** ServiceTitan materials attached to the vendor whose code is no longer in the supplier file. Reported, never deactivated. */
  missingInSupplier: Array<{ materialId: number; code: string; supplierPartNumber: string }>;
};

const near = (a: number | null | undefined, b: number | null | undefined) =>
  a != null && b != null && Math.abs(a - b) < 0.005;

export function derivePrice(cost: number, s: PricebookSettings): number {
  const raw = cost * (1 + s.markupPercent / 100);
  const rounded = Math.round(raw / s.roundTo) * s.roundTo;
  return Number(rounded.toFixed(2));
}

export async function planPricebookSync(supplier = "reece"): Promise<Plan> {
  if (!serviceTitanConfigured()) throw new Error("ServiceTitan credentials not set");

  const settings = await loadPricebookSettings();
  const [items, vendor] = await Promise.all([loadSupplierItems(supplier), resolveVendor(settings.vendorName)]);
  const materials = await loadMaterials();
  const index = buildMaterialIndex(materials, vendor.id);

  const changes: Change[] = [];
  const seenMaterialIds = new Set<number>();
  let matched = 0;
  let unchanged = 0;
  let unmatchedNotCreated = 0;
  let noCost = 0;

  for (const item of items) {
    if (item.cost == null || !Number.isFinite(item.cost)) {
      noCost++;
      continue;
    }
    const cost = Number(item.cost.toFixed(2));
    const price = settings.priceMode === "markup" ? derivePrice(cost, settings) : null;
    const m = findMaterial(index, item.code, settings.codePrefix);

    if (m) {
      matched++;
      seenMaterialIds.add(m.id);
      const fields: string[] = [];
      const pv = m.primaryVendor;
      const vendorLinked = pv?.vendorId === vendor.id && norm(pv?.supplierPartNumber) === norm(item.code);
      if (!vendorLinked) fields.push("primaryVendor");
      if (!near(pv?.cost, cost)) fields.push("cost");
      if (price != null && !near(m.price, price)) fields.push("price");

      if (fields.length === 0) {
        unchanged++;
        continue;
      }
      changes.push({
        action: "update",
        code: item.code,
        materialId: m.id,
        materialCode: m.code,
        description: m.displayName ?? m.description ?? item.description,
        before: { cost: pv?.cost ?? m.cost ?? null, price: m.price ?? null },
        after: { cost, price },
        fields,
      });
    } else if (settings.createMissing) {
      changes.push({
        action: "create",
        code: item.code,
        materialCode: settings.codePrefix + item.code,
        description: item.description,
        after: { cost, price: price ?? cost },
        fields: ["create"],
      });
    } else {
      unmatchedNotCreated++;
    }
  }

  const supplierCodes = new Set(items.map((i) => norm(i.code)));
  const missingInSupplier = materials
    .filter(
      (m) =>
        m.primaryVendor?.vendorId === vendor.id &&
        m.primaryVendor.supplierPartNumber &&
        !supplierCodes.has(norm(m.primaryVendor.supplierPartNumber)),
    )
    .map((m) => ({ materialId: m.id, code: m.code, supplierPartNumber: m.primaryVendor!.supplierPartNumber! }));

  // Deterministic order so a capped apply walks the same list each run.
  changes.sort((a, b) => (a.action === b.action ? a.code.localeCompare(b.code) : a.action === "update" ? -1 : 1));

  return {
    vendor,
    settings,
    changes,
    itemsByCode: new Map(items.map((i) => [norm(i.code), i])),
    summary: {
      supplierItems: items.length,
      materials: materials.length,
      matched,
      toUpdate: changes.filter((c) => c.action === "update").length,
      toCreate: changes.filter((c) => c.action === "create").length,
      unchanged,
      unmatchedNotCreated,
      noCost,
      missingInSupplier: missingInSupplier.length,
    },
    missingInSupplier,
  };
}

// --- apply ------------------------------------------------------------------------

export type ApplyResult = {
  applied: number;
  verified: number;
  failed: Array<{ code: string; materialId?: number; error: string }>;
  remaining: number;
};

function vendorBody(vendorId: number, code: string, cost: number): StPrimaryVendor {
  return { vendorId, cost, supplierPartNumber: code, active: true };
}

async function readBack(id: number): Promise<StMaterial> {
  return stFetch<StMaterial>(stTenantPath("pricebook", `materials/${id}`));
}

function verify(m: StMaterial, change: Change, vendorId: number): string | null {
  const pv = m.primaryVendor;
  if (!pv || pv.vendorId !== vendorId) return "primaryVendor not persisted";
  if (norm(pv.supplierPartNumber) !== norm(change.code)) return "supplierPartNumber not persisted";
  if (!near(pv.cost, change.after.cost)) return `vendor cost not persisted (read back ${pv.cost ?? "null"})`;
  if (change.after.price != null && !near(m.price, change.after.price)) {
    return `price not persisted (read back ${m.price ?? "null"})`;
  }
  return null;
}

/**
 * Write up to `limit` changes from a plan, one at a time, verifying each.
 *
 * Sequential because ServiceTitan throttles per tenant, and capped because a
 * serverless function has a time budget. A capped run is safe to repeat: the
 * next plan no longer contains what already persisted, so re-running continues
 * from where this stopped.
 */
export async function applyPlan(plan: Plan, limit: number): Promise<ApplyResult> {
  const batch = plan.changes.slice(0, Math.max(0, limit));
  const result: ApplyResult = { applied: 0, verified: 0, failed: [], remaining: plan.changes.length - batch.length };
  const vendorId = plan.vendor.id;

  for (const change of batch) {
    try {
      let id = change.materialId;
      if (change.action === "update" && id != null) {
        const body: Record<string, unknown> = {
          primaryVendor: vendorBody(vendorId, change.code, change.after.cost),
        };
        if (change.after.price != null) body.price = change.after.price;
        await stSend("PATCH", stTenantPath("pricebook", `materials/${id}`), body);
      } else {
        const item = plan.itemsByCode.get(norm(change.code));
        const created = await stSend<StMaterial>("POST", stTenantPath("pricebook", "materials"), {
          code: change.materialCode ?? change.code,
          // `displayName` on create — `name` is one of the silently dropped fields.
          displayName: (change.description ?? change.code).slice(0, 255),
          description: change.description ?? "",
          price: change.after.price ?? change.after.cost,
          active: true,
          taxable: item ? item.gst_applies : true,
          unitOfMeasure: item?.uom ?? undefined,
          primaryVendor: vendorBody(vendorId, change.code, change.after.cost),
        });
        id = created?.id;
        if (id == null) throw new Error("create returned no id");
      }
      result.applied++;

      const after = await readBack(id);
      const problem = verify(after, change, vendorId);
      if (problem) throw new Error(`ServiceTitan accepted the write but ${problem}`);
      result.verified++;
    } catch (e) {
      result.failed.push({ code: change.code, materialId: change.materialId, error: (e as Error).message });
    }
  }

  return result;
}

// --- run log ------------------------------------------------------------------------

const CHANGE_LOG_CAP = 2000;

export async function recordRun(
  mode: "dry-run" | "apply",
  plan: Plan,
  apply?: ApplyResult,
): Promise<string | null> {
  const id = randomUUID();
  try {
    await sbInsert("pricebook_sync_runs", {
      id,
      mode,
      supplier: "reece",
      finished_at: new Date().toISOString(),
      summary: { ...plan.summary, ...(apply ? { applied: apply.applied, verified: apply.verified, failed: apply.failed.length, remaining: apply.remaining } : {}) },
      changes: plan.changes.slice(0, CHANGE_LOG_CAP),
      errors: apply?.failed ?? [],
      settings: { ...plan.settings, vendorId: plan.vendor.id, missingInSupplier: plan.missingInSupplier.slice(0, 200) },
    });
  } catch (e) {
    console.error((e as Error).message);
    return null;
  }
  return id;
}
