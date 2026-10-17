/**
 * The van stock and check sheets, straight off Advanced Gas's own paperwork.
 *
 * Five separate sheets, each with its own rhythm: stock and the tool lists are
 * counted, the daily check is ticked by the tech on their own before they
 * leave, and the monthly condition check is done together with the van emptied
 * out. Keeping them here — not in the database — means the lists stay the same
 * in every van and a change lands everywhere at once, which is the whole point
 * of "same list in every van".
 */

export type CheckKind = "weekly" | "monthly" | "stock" | "plant" | "bag";

export const CHECK_KINDS: {
  k: CheckKind; label: string; short: string; blurb: string; cadence: string;
  /** Whose job it is: the tech whose van it is, or the office. */
  who: "crew" | "admin";
}[] = [
  { k: "weekly", label: "Weekly van check", short: "Weekly", cadence: "Monday morning", who: "crew",
    blurb: "YOU do this one, on the van you're signed to. Ten minutes on a Monday before you leave. Anything wrong goes to the office the same day." },
  { k: "stock", label: "Van stock count", short: "Stock", cadence: "Monday, with the weekly check", who: "crew",
    blurb: "Same list in every van. Update the counts, and anything at or under the minimum gets ordered that day, order at the minimum, not when it runs out." },
  { k: "monthly", label: "Monthly van condition check", short: "Monthly", cadence: "First week of the month", who: "admin",
    blurb: "Admin does this one, with photos. A proper look over the van, what's wearing, what's due, what needs booking in." },
  { k: "plant", label: "Tools for vans", short: "Van tools", cadence: "With the monthly check", who: "admin",
    blurb: "Lives in the van. Missing, damaged or flat goes to the office the same day, don't work around it." },
  { k: "bag", label: "Tool bag", short: "Tool bag", cadence: "Back in at the end of the job", who: "crew",
    blurb: "What every tradesman and apprentice carries in the bag. Check it back in at the end of the job." },
];

export const KIND_LABEL: Record<CheckKind, string> = CHECK_KINDS.reduce((m, k) => { m[k.k] = k.label; return m; }, {} as Record<CheckKind, string>);

/* -------- Counted lists: stock, plant, tool bag -------- */

export type CountItem = { item: string; unit: string; min: number };
export type CountGroup = { group: string; items: CountItem[] };

const ea = (item: string, min: number): CountItem => ({ item, unit: "ea", min });

export const VAN_STOCK: CountGroup[] = [
  { group: "Copper, water & gas", items: [
    { item: '1/2" copper', unit: "length", min: 2 },
    { item: '3/4" copper', unit: "length", min: 2 },
    ea("Candy cane (gas bend)", 2),
    { item: "Pipe saddles & clips, assorted", unit: "pk", min: 1 },
  ] },
  { group: "Brass fittings", items: [
    ea('Union 1/2"', 4), ea('Union 3/4"', 4),
    ea('Nipple 1/2"', 6), ea('Nipple 3/4"', 6),
    ea('Cap 1/2"', 4), ea('Cap 3/4"', 4),
    ea('3/4"F to 15C elbow', 6), ea('3/4"M to 15C elbow', 6),
    ea("Gas regulator", 1),
  ] },
  { group: "B-Press, water", items: [
    ea('Cap 1/2"', 4), ea('Cap 3/4"', 4),
    ea('Elbow 1/2"', 10), ea('Elbow 3/4"', 10),
    ea('Tee 1/2"', 6), ea('Tee 3/4"', 6),
    ea('Coupling 1/2"', 6), ea('Coupling 3/4"', 6),
    ea('Male / female adaptors 1/2" & 3/4"', 8),
  ] },
  { group: "B-Press, gas (yellow)", items: [
    ea('Cap 1/2"', 4), ea('Cap 3/4"', 4),
    ea('Elbow 1/2"', 8), ea('Elbow 3/4"', 8),
    ea('Tee 1/2"', 4), ea('Tee 3/4"', 4),
    ea('Coupling 1/2"', 6), ea('Coupling 3/4"', 6),
    ea('Male / female adaptors 1/2" & 3/4"', 6),
  ] },
  { group: "Valves & hot water", items: [
    ea('Gas isolation valve 1/2"', 3),
    ea('Gas isolation valve 3/8"', 3),
    ea('Water isolation valve 1/2" & 3/4"', 4),
    ea("PTR valve", 2), ea("PTR cover", 2),
    ea("Tempering valve 50°C", 1),
    ea("Non-return valve", 2),
    ea("Flexible connectors", 4),
    { item: "Tap & valve washers, assorted", unit: "pk", min: 1 },
  ] },
  { group: "Controls", items: [
    ea("Networker controller", 1),
    ea("Wall controller (standard)", 1),
    { item: "T-stat cable", unit: "m", min: 30 },
    { item: "AA batteries", unit: "pk", min: 2 },
    { item: "AAA batteries", unit: "pk", min: 2 },
  ] },
  { group: "Sealants, tapes & straps", items: [
    { item: "Silicone, neutral cure", unit: "tube", min: 3 },
    { item: "Duct tape", unit: "roll", min: 3 },
    { item: "Silver (foil) tape", unit: "roll", min: 3 },
    { item: "Hanging strap / banding", unit: "roll", min: 2 },
    { item: "Gas thread tape (yellow)", unit: "roll", min: 4 },
    { item: "Thread sealant (gas approved)", unit: "tube", min: 2 },
    ea("Ratchet / load straps", 4),
    { item: "Cable ties, UV black", unit: "pk", min: 2 },
  ] },
  { group: "Gas & brazing", items: [
    ea("MAP gas", 2),
    { item: "Brazing rods", unit: "rod", min: 20 },
  ] },
  { group: "Drainage & site", items: [
    { item: "PVC drain pipe 20mm", unit: "m", min: 20 },
    { item: "PVC drain pipe 15mm", unit: "m", min: 10 },
    ea("Drain fittings, elbows, joiners, tees", 15),
    ea("Condensate pump", 1),
    { item: "PVC solvent cement + primer", unit: "tin", min: 1 },
    ea("Drop sheets", 3),
    { item: "Shoe covers", unit: "pr", min: 20 },
    ea("AGAS unit stickers", 30),
    ea("Rubbish bags", 10),
  ] },
];

/**
 * Tools for vans, as Jake listed them (Oct 2026): what lives in every van,
 * counted with the monthly check. It replaced the earlier draft list, so a
 * van's last count of the old list doesn't carry across to this one.
 */
export const VAN_PLANT: CountGroup[] = [
  { group: "Tools", items: [
    ea("Vac pump", 1), ea("Refrigeration gauges", 1), ea("Bender, 20mm", 1), ea("Bender, 15mm", 1),
    ea("Gas line tester", 1), ea("Water pressure tester", 1), ea("Silicone gun", 1), ea("Digital manometer", 1),
    { item: "B-Press set", unit: "set", min: 1 },
    { item: "Socket set", unit: "set", min: 1 },
    ea("Shovel", 1), ea("Textas", 2), ea("Pencils", 2), ea("Grinder", 1),
    ea("Grinder blade, diamond tip", 1), ea("Grinder blade, cutting", 1),
    ea("Multitool blade", 1), ea("Circular saw blade", 1), ea("Reciprocating saw blade", 1),
  ] },
  { group: "Servicing", items: [
    { item: "Rags", unit: "bag", min: 1 },
    ea("Hose", 1), ea("Pressure washer", 1), ea("Spray bottle", 1), ea("Cleaning solution", 1),
    ea("Sponge", 1), ea("Steel sponge", 1), ea("Cleaning solution, split & evap", 1), ea("Flexi hoses", 2), ea("Deodoriser", 1),
  ] },
  { group: "Fixings", items: [
    { item: "Tap-ins, 5mm", unit: "box", min: 1 },
    { item: "Green plugs, 6mm", unit: "box", min: 1 },
    { item: "Button head wood screws, 25mm", unit: "box", min: 1 },
    { item: "Wall mates", unit: "box", min: 1 },
    { item: "Metal teks, 16mm", unit: "box", min: 1 },
    ea("Ramset", 1),
    { item: "Nails", unit: "box", min: 1 },
    { item: "Bugle screws, 100mm", unit: "box", min: 1 },
    { item: "Roofing screws", unit: "box", min: 1 },
  ] },
  { group: "Cannons", items: [
    ea("PVC, 20mm", 2), ea("Copper, 15mm", 2), ea("Copper, 20mm", 1), ea("Yellow tongue", 1),
  ] },
  { group: "Perishables: hammer drill bits", items: [
    ea("Drill bit, 5mm", 1), ea("Drill bit, 6mm", 1), ea("Drill bit, 8mm", 1), ea("Drill bit, 10mm", 1),
    ea("Drill bit, 11mm", 1), ea("Drill bit, 12mm", 1), ea("Drill bit, 13mm", 1), ea("Drill bit, 32mm", 1),
  ] },
];

export const TOOL_BAG: CountGroup[] = [
  { group: "Tool bag", items: [
    ea("PVC pipe cutter", 1), ea("Screwdriver", 1), ea("Shifter", 2), ea("Hammer", 1),
    ea("Level", 1), ea("Copper cutter, small", 1), ea("Copper cutter, large", 1),
    { item: "Allen keys", unit: "set", min: 1 },
    ea("Knife", 1), ea("Plasterboard saw", 1), ea("Tape measure", 1), ea("Drill", 1),
    ea("Head torch", 1),
  ] },
];

/* -------- Ticked lists: the daily and monthly checks -------- */

export type TickItem = {
  item: string;
  looking?: string;
  /** Some things can't be taken on trust — the tyres, the panels, the km on the dash. */
  photo?: "required" | "optional";
};

export const WEEKLY_CHECK: TickItem[] = [
  { item: "Stock counted against the van stock sheet" },
  { item: "Anything at or under min qty flagged to the office" },
  { item: "This week's jobs reviewed, you know what each one needs" },
  { item: "Materials for the week's jobs loaded" },
  { item: "Tool bag complete and back in the van" },
  { item: "Batteries charged, drill, impact, test gear" },
  { item: "Gas bottles chained, upright and in date" },
  { item: "Ladders and racking secure" },
  { item: "Drop sheets, shoe covers and stickers on board" },
  { item: "iPad charged and logged in" },
  { item: "Van clean inside and out" },
];

export const MONTHLY_CHECK: TickItem[] = [
  { item: "Body & panels", looking: "Dents, scratches, mirrors, lights. Damage reported the day it happened.", photo: "required" },
  { item: "Tyres", looking: "Tread, pressure including spare, no sidewall damage.", photo: "required" },
  { item: "Fluids", looking: "Oil, coolant, brake fluid, washer bottle." },
  { item: "Service & rego", looking: "Sticker and logbook checked, and a photo of the km on the dash. Office told early if either is close.", photo: "required" },
  { item: "Racking & shelving", looking: "Secure, nothing loose, floor clear." },
  { item: "Gas bottle restraints", looking: "Chains and brackets sound, bottles upright." },
  { item: "Fire extinguisher", looking: "In date, charged, mounted, accessible." },
  { item: "First aid kit", looking: "Stocked and in date." },
  { item: "Ladders", looking: "No damage, feet intact, secured for travel." },
  { item: "Harness & height gear", looking: "In date, no fraying, tagged." },
  { item: "Test gear calibration", looking: "Analyser and manometer in date." },
  { item: "Signage", looking: "Clean and undamaged." },
  { item: "Wash & interior", looking: "Van washed, cab and rear tidy.", photo: "optional" },
];

/**
 * The walk-round on the weekly check: the van itself, as opposed to what's in
 * it. The weekly sheet above is the paperwork's "ready for the week" list;
 * this is the A1 procedure's last step, "flag anything that needs a
 * mechanic", broken out so a tyre is a line someone ticks rather than
 * something they have to remember to write.
 *
 * Anything marked as needing a look becomes a service request on the van when
 * the check is sent, which is where the office already picks them up.
 */
export const VEHICLE_CHECK: { group: string; items: string[] }[] = [
  { group: "Outside", items: ["Tyres & pressures", "Tyre tread", "Spare & jack", "Lights & indicators", "Panels & doors", "Mirrors & glass", "Wipers & washers"] },
  { group: "Under the bonnet", items: ["Oil", "Coolant", "Brake fluid", "Washer bottle"] },
  { group: "In the cab", items: ["No warning lights on the dash", "Brakes feel right", "Horn", "Seatbelts"] },
  { group: "Load area", items: ["Racking & shelving secure", "Gas bottles chained & upright", "Ladders secured", "Fire extinguisher in date"] },
];

export const VEHICLE_GROUP = "vehicle";
export const vehicleKey = (item: string) => itemKey(VEHICLE_GROUP, item);
export const VEHICLE_ITEMS = VEHICLE_CHECK.flatMap((g) => g.items);

/** The angles worth having on record, so a month's photos compare with the last. */
export const PHOTO_ANGLES = ["Front", "Driver side", "Passenger side", "Rear", "Inside rear", "Cab"];

export const countList = (kind: CheckKind): CountGroup[] | null =>
  kind === "stock" ? VAN_STOCK : kind === "plant" ? VAN_PLANT : kind === "bag" ? TOOL_BAG : null;

export const tickList = (kind: CheckKind): TickItem[] | null =>
  kind === "weekly" ? WEEKLY_CHECK : kind === "monthly" ? MONTHLY_CHECK : null;

/* -------- What a saved check holds -------- */

/** Counted sheets store a qty per item; ticked sheets store a state and a note. */
export type CheckEntry = {
  qty?: number | null; state?: "ok" | "action" | null; note?: string;
  /** On a flagged vehicle-check line: whether the van can still be driven. */
  drive?: boolean | null;
  /** The service request it became when the check was sent, so a re-send doesn't raise it twice. */
  reported?: string;
};
export type CheckItems = Record<string, CheckEntry>;

/** Stable key for an item, so a saved check still lines up if a list is reordered. */
export const itemKey = (group: string, item: string) => `${group}|${item}`;

export type ShortItem = { group: string; item: string; unit: string; min: number; qty: number };

/** Anything counted at or under its minimum — the day's order list. */
export function shortfalls(kind: CheckKind, items: CheckItems): ShortItem[] {
  const list = countList(kind);
  if (!list) return [];
  const out: ShortItem[] = [];
  for (const g of list) {
    for (const it of g.items) {
      const e = items[itemKey(g.group, it.item)];
      if (!e || e.qty == null) continue;
      if (e.qty <= it.min) out.push({ group: g.group, item: it.item, unit: it.unit, min: it.min, qty: e.qty });
    }
  }
  return out;
}

/** Anything on a ticked sheet that needs doing something about. */
export function actions(kind: CheckKind, items: CheckItems): { item: string; note: string }[] {
  const list = tickList(kind);
  if (!list) return [];
  return list
    .filter((t) => items[itemKey(kind, t.item)]?.state === "action")
    .map((t) => ({ item: t.item, note: items[itemKey(kind, t.item)]?.note || "" }));
}
