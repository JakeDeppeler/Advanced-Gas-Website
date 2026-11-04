import "server-only";
import { stList } from "@/lib/dashboard/servicetitan";
import { saveSettings } from "@/lib/portal/db";

// One copy of everything a quote is built from in ServiceTitan: the proposal
// templates, the estimate templates they offer as options, the option sets,
// and the whole pricebook (services, materials with their vendors' part
// numbers, equipment), saved to portal_settings.st_catalog_snapshot.
//
// For the proposals audit Jake asked for on 3 Nov (template lines that no
// longer link to a live pricebook item, Reece materials without a Reece part
// number, and the quotes the office keeps building by hand that have no
// template), and then for drafting quotes from Condition Reports. Kept whole
// so the audit can be worked out against it without another trip to
// ServiceTitan. Prices and costs, no customers.

type Raw = Record<string, unknown>;
const cut = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : v ?? null);
const vendors = (m: Raw) => [m.primaryVendor, ...(Array.isArray(m.otherVendors) ? m.otherVendors : [])]
  .filter((v): v is Raw => !!v && typeof v === "object")
  .map((v) => ({ name: v.vendorName ?? null, part: v.vendorPart ?? null, cost: v.cost ?? null, active: v.active ?? null }));

/** The list with inactive items too where ServiceTitan allows it, else the default. */
async function all(module: string, resource: string): Promise<Raw[]> {
  try {
    return await stList<Raw>(module, resource, { active: "Any" }, 30);
  } catch {
    return stList<Raw>(module, resource, {}, 30);
  }
}

export async function snapshotCatalog(): Promise<Record<string, number | string>> {
  const [estimateTemplates, proposalTemplates, proposalTypes, services, materials, equipment] = await Promise.all([
    all("sales", "estimate-templates"), all("sales", "proposal-templates"), stList<Raw>("sales", "proposal-types", {}, 5),
    all("pricebook", "services"), all("pricebook", "materials"), all("pricebook", "equipment"),
  ]);
  const snap = {
    at: new Date().toISOString(),
    estimateTemplates: estimateTemplates.map((t) => ({
      id: t.id, name: t.name, internalName: t.internalName ?? null, summary: cut(t.summary, 800), mode: t.mode ?? null, active: t.active ?? null,
      businessUnitId: t.businessUnitId ?? null, totalCost: t.totalCost ?? null, totalPrice: t.totalPrice ?? null, modifiedOn: t.modifiedOn ?? null,
      items: (Array.isArray(t.items) ? (t.items as Raw[]) : []).map((i) => ({
        skuId: i.skuId, skuType: i.skuType, skuName: i.skuName, description: cut(i.description, 160), quantity: i.quantity,
        unitPrice: i.unitPrice, unitCost: i.unitCost, isAddOn: i.isAddOn ?? false, parentItemId: i.parentItemId ?? null, itemGroupName: i.itemGroupName ?? null, order: i.order ?? null,
      })),
    })),
    proposalTemplates: proposalTemplates.map((p) => ({
      id: p.id, name: p.name, description: cut(p.description, 300), active: p.active ?? null, status: p.status ?? null,
      proposalTypeId: p.proposalTypeId ?? null, proposalTypeName: p.proposalTypeName ?? null, businessUnitIds: p.businessUnitIds ?? null,
      options: p.estimateAssignments ?? [], modifiedOn: p.modifiedOn ?? null,
    })),
    proposalTypes: proposalTypes.map((t) => ({ id: t.id, name: t.name, type: t.type ?? null, active: t.active ?? null, options: t.options ?? [] })),
    services: services.map((s) => ({
      id: s.id, code: s.code, name: s.displayName ?? s.code, active: s.active ?? null, price: s.price ?? null, cost: s.cost ?? null, hours: s.hours ?? null,
      categories: (Array.isArray(s.categories) ? (s.categories as Raw[]) : []).map((c) => c.name),
      materials: s.serviceMaterials ?? [], equipment: s.serviceEquipment ?? [],
    })),
    materials: materials.map((m) => ({ id: m.id, code: m.code, name: m.displayName ?? m.code, active: m.active ?? null, price: m.price ?? null, cost: m.cost ?? null, vendors: vendors(m) })),
    equipment: equipment.map((e) => ({ id: e.id, code: e.code, name: e.displayName ?? e.code, active: e.active ?? null, price: e.price ?? null, cost: e.cost ?? null, manufacturer: e.manufacturer ?? null, model: e.model ?? null, vendors: vendors(e) })),
  };
  const saved = await saveSettings("st_catalog_snapshot", snap);
  return {
    saved: saved.ok ? "yes" : `no: ${saved.error ?? "?"}`,
    estimateTemplates: snap.estimateTemplates.length, proposalTemplates: snap.proposalTemplates.length, proposalTypes: snap.proposalTypes.length,
    services: snap.services.length, materials: snap.materials.length, equipment: snap.equipment.length,
  };
}
