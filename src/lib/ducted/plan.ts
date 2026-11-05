/**
 * The ducted quote, built from the job's layout rather than a template: the
 * sums only, no I/O, so the builder can run them as you type and
 * `npm run check:ducted` can hold them.
 *
 * Jake, 5 Nov 2026: every ducted install is at least two days. A standard
 * house is 8 outlets and 4 zones, and that's two days; more outlets or zones
 * add time, and so does a harder job. Labour is two people at the crew rate
 * (Our prices › Our hourly rate), because a ducted job takes the whole day.
 */

export const DUCTED = {
  /** Unit, plenum, return air, controller, commissioning. */
  baseHours: 8,
  perOutlet: 0.75,
  perZone: 0.5,
  /** Two days for two people, whatever the layout. */
  minHours: 16,
  doubleStorey: 4,
  /** Metres of duct in a 6 m length. */
  lengthM: 6,
  /** Wireless sensors the Zonemate bundle comes with. */
  bundleSensors: 4,
} as const;

export const DUCT_SIZES = [150, 200, 250, 300, 350, 400, 450] as const;
export type DuctSize = (typeof DUCT_SIZES)[number];

/** What the builder needs from the pricebook. Plain data, so it can go to the browser. */
export type Sku = { skuId: number; skuType: "Service" | "Material" | "Equipment"; name: string; price: number };
export type DuctedCatalogue = {
  units: (Sku & { kit: { sku: Sku; quantity: number }[] })[];
  duct: Partial<Record<DuctSize, Sku>>;
  downjet: Partial<Record<DuctSize, Sku>>;
  damper: Partial<Record<DuctSize, Sku>>;
  zoneCable: Sku | null;
  sensor: Sku | null;
  controller: Sku | null;
  install: Sku | null;
  electrical: Sku | null;
  certificate: Sku | null;
  rate: number | null;
};

export type Outlet = { room: string; size: DuctSize; metres: number; zone: number };
export type Zone = { name: string; damper: DuctSize };
export type DuctedInput = {
  unitSkuId: number | null;
  outlets: Outlet[];
  zones: Zone[];
  doubleStorey: boolean;
  extraHours: number;
  extraReason: string;
  extraSensors: number;
  notes: string;
};

export type Line = { group: "unit" | "install" | "extra"; sku: Sku | null; name: string; quantity: number; unitPrice: number; missing?: string };
export type DuctedQuote = {
  hours: { base: number; outlets: number; zones: number; layout: number; floor: boolean; doubleStorey: number; extra: number; total: number };
  labour: number;
  lines: Line[];
  total: number;
  missing: string[];
  summary: string;
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** Hours for the layout: base + outlets + zones, never under two days, then the extras on top. */
export function ductedHours(outlets: number, zones: number, doubleStorey: boolean, extra: number) {
  const layout = DUCTED.baseHours + outlets * DUCTED.perOutlet + zones * DUCTED.perZone;
  const floor = layout < DUCTED.minHours;
  const ds = doubleStorey ? DUCTED.doubleStorey : 0;
  const ex = Math.max(0, Number(extra) || 0);
  return {
    base: DUCTED.baseHours, outlets: outlets * DUCTED.perOutlet, zones: zones * DUCTED.perZone,
    layout, floor, doubleStorey: ds, extra: ex, total: Math.max(layout, DUCTED.minHours) + ds + ex,
  };
}

export function buildDucted(input: DuctedInput, cat: DuctedCatalogue): DuctedQuote {
  const missing: string[] = [];
  const lines: Line[] = [];
  const add = (group: Line["group"], sku: Sku | null, name: string, quantity: number, why?: string) => {
    if (quantity <= 0) return;
    if (!sku) { missing.push(why ?? name); lines.push({ group, sku: null, name, quantity, unitPrice: 0, missing: why ?? name }); return; }
    lines.push({ group, sku, name: sku.name, quantity, unitPrice: sku.price });
  };

  const outlets = input.outlets.filter((o) => o.metres >= 0);
  const zonesUsed = input.zones.filter((_, i) => outlets.some((o) => o.zone === i + 1));
  const h = ductedHours(outlets.length, zonesUsed.length, input.doubleStorey, input.extraHours);
  const rate = cat.rate ?? 0;
  if (!cat.rate) missing.push("Our hourly rate isn't set on Our prices");
  const labour = cents(h.total * rate);

  // The unit, and the controller every ducted job gets.
  const unit = cat.units.find((u) => u.skuId === input.unitSkuId) ?? null;
  if (!unit) missing.push("Choose the unit");
  else lines.push({ group: "unit", sku: unit, name: unit.name, quantity: 1, unitPrice: unit.price });
  add("unit", cat.controller, "Zonemate Touch Pro bundle (wifi, controller, gateway, zone box, 4 sensors)", 1);
  add("unit", cat.sensor, "Extra wireless sensors", Math.max(0, Math.round(input.extraSensors) || 0));

  // The installation: labour, the electrician, and every material.
  if (cat.install) lines.push({ group: "install", sku: cat.install, name: `${cat.install.name} · ${h.total} h × $${rate}`, quantity: 1, unitPrice: labour });
  else add("install", null, "Ducted installation service", 1, "The ducted installation service isn't in the pricebook");
  add("install", cat.electrical, "Electrical connection", 1);

  const metres = new Map<DuctSize, number>();
  const jets = new Map<DuctSize, number>();
  for (const o of outlets) {
    metres.set(o.size, (metres.get(o.size) ?? 0) + o.metres);
    jets.set(o.size, (jets.get(o.size) ?? 0) + 1);
  }
  for (const size of DUCT_SIZES) {
    const m = metres.get(size) ?? 0;
    if (m > 0) add("install", cat.duct[size] ?? null, `${size} mm insulated duct`, Math.ceil(m / DUCTED.lengthM), `${size} mm duct isn't in the pricebook`);
    const j = jets.get(size) ?? 0;
    if (j > 0) add("install", cat.downjet[size] ?? null, `${size} mm downjet`, j, `A ${size} mm downjet isn't in the pricebook`);
  }
  const dampers = new Map<DuctSize, number>();
  for (const z of zonesUsed) dampers.set(z.damper, (dampers.get(z.damper) ?? 0) + 1);
  for (const size of DUCT_SIZES) {
    const n = dampers.get(size) ?? 0;
    if (n > 0) add("install", cat.damper[size] ?? null, `${size} mm zone damper`, n, `A ${size} mm zone damper isn't in the pricebook`);
  }
  add("install", cat.zoneCable, "Zone damper cable", zonesUsed.length);
  for (const k of unit?.kit ?? []) add("install", k.sku, k.sku.name, k.quantity);

  add("extra", cat.certificate, "BPC Compliance Certificate", 1);

  const total = cents(lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0));
  return { hours: h, labour, lines, total, missing, summary: ductedSummary(input, unit, outlets, zonesUsed, h) };
}

/** The quote's summary, written from the layout and the notes, in the templates' own voice. */
export function ductedSummary(input: DuctedInput, unit: Sku | null, outlets: Outlet[], zones: Zone[], h: ReturnType<typeof ductedHours>): string {
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const zoneText = zones.map((z) => {
    const i = input.zones.indexOf(z) + 1;
    const rooms = outlets.filter((o) => o.zone === i).map((o) => o.room.trim() || "an outlet");
    return `${z.name.trim() || `Zone ${i}`} (${rooms.join(", ")})`;
  });
  const parts = [
    `Supply and installation of a new ${unit ? unit.name : "ducted reverse-cycle system"}, with ${plural(outlets.length, "outlet")} across ${plural(zones.length, "zone")}${zoneText.length ? `: ${zoneText.join("; ")}` : ""}.`,
    "Covers the indoor fan coil and outdoor unit, insulated ductwork run through the roof space to a ceiling outlet in each room, the return air, zone dampers and the Zonemate Touch controller with wifi, so each zone can be run on its own from the wall or your phone.",
    "Includes the electrical connection by a licensed electrician with a Certificate of Electrical Safety, commissioning, airflow balancing to every outlet, full operational testing and a compliance certificate on completion.",
    input.doubleStorey ? "Allows for the extra work of a double-storey home." : "",
    input.extraHours > 0 && input.extraReason.trim() ? `Allows for ${input.extraReason.trim().replace(/\.$/, "")}.` : "",
    input.notes.trim(),
  ];
  return parts.filter(Boolean).join(" ");
}

/** A standard house to start from: 8 outlets over 4 zones, the layout two days is priced on. */
export function standardLayout(): Pick<DuctedInput, "outlets" | "zones"> {
  const zones: Zone[] = [
    { name: "Living", damper: 300 }, { name: "Bedrooms", damper: 300 }, { name: "Master", damper: 250 }, { name: "Study", damper: 200 },
  ];
  const outlets: Outlet[] = [
    { room: "Living", size: 250, metres: 8, zone: 1 }, { room: "Kitchen / meals", size: 250, metres: 8, zone: 1 },
    { room: "Bedroom 2", size: 200, metres: 8, zone: 2 }, { room: "Bedroom 3", size: 200, metres: 8, zone: 2 }, { room: "Bedroom 4", size: 200, metres: 10, zone: 2 },
    { room: "Master", size: 250, metres: 8, zone: 3 }, { room: "Ensuite / WIR", size: 150, metres: 6, zone: 3 },
    { room: "Study", size: 200, metres: 6, zone: 4 },
  ];
  return { outlets, zones };
}
