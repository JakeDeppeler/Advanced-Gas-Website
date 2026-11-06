import "server-only";
import { stList } from "@/lib/dashboard/servicetitan";
import { getSettings } from "@/lib/portal/db";
import { normalisePricing } from "@/lib/portal/pricingTypes";
import { normCode } from "@/lib/pricebook/labour";
import { DUCT_SIZES, type DuctSize, type DuctedCatalogue, type Sku } from "@/lib/ducted/plan";

type Raw = Record<string, unknown>;
type TemplateItem = { skuId: number; skuType: string; skuName?: string | null; quantity: number; isAddOn?: boolean; parentItemId?: number | null };

const sku = (r: Raw, skuType: Sku["skuType"]): Sku => ({
  skuId: Number(r.id), skuType, name: String(r.displayName ?? r.code ?? "").trim(), price: Number(r.price) || 0,
});

/**
 * Everything the ducted builder prices from, read live from the pricebook.
 *
 * Items are found by their ServiceTitan code where they have a dependable one
 * (the install, electrical and certificate services) and by name where the
 * pricebook names them by size ("Bradflo Insulated Duct R1.5 250mm x 6 Metre",
 * "Downjet 250mm", "ZoneBoss Damper 24V 250mm"). R1.5 is what every ducted
 * template uses. A size the pricebook doesn't carry is left out and the quote
 * says so, rather than borrowing the next size's price.
 *
 * The install kit (fan coil supports, springs, drain, filter, plenum, tape,
 * straps, the condenser bracket and the coil) is the unit's own ducted
 * template minus the duct, outlets and zone parts the layout now supplies, so
 * the office keeps the kit in ServiceTitan where it already is.
 */
export async function loadDuctedCatalogue(): Promise<DuctedCatalogue> {
  const [services, materials, equipment, templates, pricing] = await Promise.all([
    stList<Raw>("pricebook", "services", { active: "True" }, 10),
    stList<Raw>("pricebook", "materials", { active: "True" }, 20),
    stList<Raw>("pricebook", "equipment", { active: "True" }, 10),
    stList<{ name: string; items: TemplateItem[] }>("sales", "estimate-templates", { active: "True" }, 10),
    getSettings<unknown>("pricing"),
  ]);
  const svc = (code: string) => { const s = services.find((x) => normCode(x.code) === code); return s ? sku(s, "Service") : null; };
  const matByName = (re: RegExp) => { const m = materials.find((x) => re.test(String(x.displayName ?? ""))); return m ? sku(m, "Material") : null; };
  const bySize = (make: (size: DuctSize) => RegExp) => {
    const out: Partial<Record<DuctSize, Sku>> = {};
    for (const size of DUCT_SIZES) { const s = matByName(make(size)); if (s) out[size] = s; }
    return out;
  };

  const materialById = new Map(materials.map((m) => [Number(m.id), sku(m, "Material")]));
  // Parts the layout supplies, so the kit leaves them out.
  const fromLayout = /insulated duct|downjet|zoneboss|zonemate|damper|sensor|veec|rebate|discount/i;
  const units = equipment
    .filter((e) => /ducted/i.test(String(e.displayName ?? "")) && !/heater|gas/i.test(String(e.displayName ?? "")))
    .map((e) => {
      const unit = sku(e, "Equipment");
      const tpl = templates.find((t) => t.items.some((i) => i.skuType === "Equipment" && i.skuId === unit.skuId));
      const kit = (tpl?.items ?? [])
        .filter((i) => i.skuType === "Material" && !i.isAddOn && i.parentItemId == null)
        .map((i) => ({ sku: materialById.get(i.skuId), quantity: Number(i.quantity) || 0 }))
        .filter((k): k is { sku: Sku; quantity: number } => !!k.sku && k.quantity > 0 && !fromLayout.test(k.sku.name));
      return { ...unit, kit };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const controller = equipment.find((e) => /zonemate touch pro bundle/i.test(String(e.displayName ?? "")));
  return {
    units,
    duct: bySize((s) => new RegExp(`^bradflo insulated duct r1\\.5 ${s}mm`, "i")),
    downjet: bySize((s) => new RegExp(`^downjet ${s}mm`, "i")),
    damper: bySize((s) => new RegExp(`^zoneboss damper 24v\\s+${s}mm`, "i")),
    zoneCable: matByName(/^zoneboss blue 24v cable/i),
    sensor: matByName(/^zonemate wireless temperature sensor/i),
    controller: controller ? sku(controller, "Equipment") : null,
    install: svc("AC-DUCTED-2DAYS"),
    electrical: svc("AC-DUCTED-ELE"),
    certificate: (() => { const s = services.find((x) => /^bpc compliance certificate$/i.test(String(x.displayName ?? x.code ?? "").trim())); return s ? sku(s, "Service") : null; })(),
    rate: normalisePricing(pricing).hourly,
  };
}
