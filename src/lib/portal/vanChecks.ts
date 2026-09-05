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
    blurb: "Same list in every van. Update the counts, and anything at or under the minimum gets ordered that day — order at the minimum, not when it runs out." },
  { k: "monthly", label: "Monthly van condition check", short: "Monthly", cadence: "First week of the month", who: "admin",
    blurb: "Admin does this one, with photos. A proper look over the van — what's wearing, what's due, what needs booking in." },
  { k: "plant", label: "Power tools & plant", short: "Tools & plant", cadence: "With the monthly check", who: "admin",
    blurb: "Lives in the van. Missing, damaged or flat goes to the office the same day — don't work around it." },
  { k: "bag", label: "Tool bag", short: "Tool bag", cadence: "Back in at the end of the job", who: "crew",
    blurb: "What every tradesman and apprentice carries in the bag. Check it back in at the end of the job." },
];

export const KIND_LABEL: Record<CheckKind, string> = CHECK_KINDS.reduce((m, k) => { m[k.k] = k.label; return m; }, {} as Record<CheckKind, string>);

/* -------- Counted lists: stock, plant, tool bag -------- */

export type CountItem = { item: string; unit: string; min: number };
export type CountGroup = { group: string; items: CountItem[] };

const ea = (item: string, min: number): CountItem => ({ item, unit: "ea", min });

export const VAN_STOCK: CountGroup[] = [
  { group: "Copper — water & gas", items: [
    { item: '1/2" copper', unit: "length", min: 2 },
    { item: '3/4" copper', unit: "length", min: 2 },
    ea("Candy cane (gas bend)", 2),
    { item: "Pipe saddles & clips — assorted", unit: "pk", min: 1 },
  ] },
  { group: "Brass fittings", items: [
    ea('Union 1/2"', 4), ea('Union 3/4"', 4),
    ea('Nipple 1/2"', 6), ea('Nipple 3/4"', 6),
    ea('Cap 1/2"', 4), ea('Cap 3/4"', 4),
    ea('3/4"F to 15C elbow', 6), ea('3/4"M to 15C elbow', 6),
    ea("Gas regulator", 1),
  ] },
  { group: "B-Press — water", items: [
    ea('Cap 1/2"', 4), ea('Cap 3/4"', 4),
    ea('Elbow 1/2"', 10), ea('Elbow 3/4"', 10),
    ea('Tee 1/2"', 6), ea('Tee 3/4"', 6),
    ea('Coupling 1/2"', 6), ea('Coupling 3/4"', 6),
    ea('Male / female adaptors 1/2" & 3/4"', 8),
  ] },
  { group: "B-Press — gas (yellow)", items: [
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
    { item: "Tap & valve washers — assorted", unit: "pk", min: 1 },
  ] },
  { group: "Controls", items: [
    ea("Networker controller", 1),
    ea("Wall controller (standard)", 1),
    { item: "T-stat cable", unit: "m", min: 30 },
    { item: "AA batteries", unit: "pk", min: 2 },
    { item: "AAA batteries", unit: "pk", min: 2 },
  ] },
  { group: "Sealants, tapes & straps", items: [
    { item: "Silicone — neutral cure", unit: "tube", min: 3 },
    { item: "Duct tape", unit: "roll", min: 3 },
    { item: "Silver (foil) tape", unit: "roll", min: 3 },
    { item: "Hanging strap / banding", unit: "roll", min: 2 },
    { item: "Gas thread tape (yellow)", unit: "roll", min: 4 },
    { item: "Thread sealant (gas approved)", unit: "tube", min: 2 },
    ea("Ratchet / load straps", 4),
    { item: "Cable ties — UV black", unit: "pk", min: 2 },
  ] },
  { group: "Gas & brazing", items: [
    ea("MAP gas", 2),
    { item: "Brazing rods", unit: "rod", min: 20 },
  ] },
  { group: "Drainage & site", items: [
    { item: "PVC drain pipe 20mm", unit: "m", min: 20 },
    { item: "PVC drain pipe 15mm", unit: "m", min: 10 },
    ea("Drain fittings — elbows, joiners, tees", 15),
    ea("Condensate pump", 1),
    { item: "PVC solvent cement + primer", unit: "tin", min: 1 },
    ea("Drop sheets", 3),
    { item: "Shoe covers", unit: "pr", min: 20 },
    ea("AGAS unit stickers", 30),
    ea("Rubbish bags", 10),
  ] },
];

export const VAN_PLANT: CountGroup[] = [
  { group: "Refrigeration plant", items: [
    ea("Vacuum pump", 1), ea("Micron / vacuum gauge", 1), ea("Manifold gauge set", 1),
    ea("Recovery machine", 1), ea("Recovery cylinder", 1), ea("Digital charging scales", 1),
    ea("Electronic leak detector", 1),
  ] },
  { group: "Benders & pipe tools", items: [
    ea('Bender 3/8"', 1), ea('Bender 1/2"', 1),
    ea("Tube cutter — small & large", 2), ea("Deburring tool", 1), ea("Flaring tool", 1),
    ea("Swaging / expanding tool", 1), ea("B-Press tool", 1),
    { item: 'B-Press jaws — 1/2", 3/4", 25mm, 32mm', unit: "set", min: 1 },
  ] },
  { group: "Power tools", items: [
    ea("Cordless drill", 1), ea("Impact driver", 1), ea("Angle grinder", 1),
    ea("Rotary hammer / SDS", 1), ea("Blower", 1), ea("Vacuum cleaner", 1),
    ea("Work light", 1), ea("Spare batteries + chargers", 2),
  ] },
  { group: "Test & compliance", items: [
    ea("Manometer (digital)", 1), ea("Combustion analyser", 1), ea("Gas leak detector", 1),
    ea("Personal CO monitor", 1), ea("Multimeter", 1), ea("Clamp meter", 1),
    ea("Insulation tester", 1), ea("Digital thermometer + probes", 1),
  ] },
  { group: "Access & safety", items: [
    ea("Extension ladder", 1), ea("Step ladder", 1), ea("Harness + lanyard", 1),
    ea("Roof anchor kit", 1), ea("Fire extinguisher", 1), ea("First aid kit", 1),
    ea("Safety glasses", 2),
    { item: "Gloves — general & cut resistant", unit: "pr", min: 2 },
    ea("Ear protection", 1),
    { item: "P2 dust masks", unit: "pk", min: 1 },
    { item: "Knee pads", unit: "pr", min: 1 },
    ea("Hi-vis", 1),
  ] },
];

export const TOOL_BAG: CountGroup[] = [
  { group: "Tool bag", items: [
    ea("PVC pipe cutter", 1), ea("Screwdriver", 1), ea("Shifter", 2), ea("Hammer", 1),
    ea("Level", 1), ea("Copper cutter — small", 1), ea("Copper cutter — large", 1),
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
  { item: "This week's jobs reviewed — you know what each one needs" },
  { item: "Materials for the week's jobs loaded" },
  { item: "Tool bag complete and back in the van" },
  { item: "Batteries charged — drill, impact, test gear" },
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

/** The angles worth having on record, so a month's photos compare with the last. */
export const PHOTO_ANGLES = ["Front", "Driver side", "Passenger side", "Rear", "Inside rear", "Cab"];

export const countList = (kind: CheckKind): CountGroup[] | null =>
  kind === "stock" ? VAN_STOCK : kind === "plant" ? VAN_PLANT : kind === "bag" ? TOOL_BAG : null;

export const tickList = (kind: CheckKind): TickItem[] | null =>
  kind === "weekly" ? WEEKLY_CHECK : kind === "monthly" ? MONTHLY_CHECK : null;

/* -------- What a saved check holds -------- */

/** Counted sheets store a qty per item; ticked sheets store a state and a note. */
export type CheckEntry = { qty?: number | null; state?: "ok" | "action" | null; note?: string };
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
