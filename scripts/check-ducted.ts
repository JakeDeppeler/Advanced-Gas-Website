/**
 * The ducted builder: hours from the layout, the two-day floor, and the
 * materials a layout turns into. A wrong hour is $310 on every ducted quote;
 * a duct length miscounted is a job short of duct on the day.
 *
 *   npm run check:ducted
 */
import { buildDucted, ductedHours, standardLayout, type DuctedCatalogue, type DuctedInput, type Sku } from "../src/lib/ducted/plan";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

// Jake, 5 Nov: a standard house is 8 outlets and 4 zones, and that's two days.
ok("8 outlets, 4 zones is exactly two days", ductedHours(8, 4, false, 0).total === 16, ductedHours(8, 4, false, 0));
ok("12 outlets, 6 zones: 8 + 9 + 3 = 20 h", ductedHours(12, 6, false, 0).total === 20);
ok("a small house still takes two days", ductedHours(5, 2, false, 0).total === 16 && ductedHours(5, 2, false, 0).floor);
ok("double storey adds 4 h on top", ductedHours(12, 6, true, 0).total === 24);
ok("extra hours add on top of the floor, not inside it", ductedHours(5, 2, false, 3).total === 19);
ok("negative extra hours are ignored", ductedHours(8, 4, false, -5).total === 16);

const s = (skuId: number, name: string, price: number, skuType: Sku["skuType"] = "Material"): Sku => ({ skuId, skuType, name, price });
const cat: DuctedCatalogue = {
  units: [{ ...s(1, "Mitsubishi Electric 16kw Ducted Split", 5800, "Equipment"), kit: [{ sku: s(50, "Chipboard", 35), quantity: 4 }, { sku: s(51, "Filter 1200x400", 156), quantity: 1 }] }],
  duct: { 150: s(10, "Duct R1.5 150mm x 6m", 51), 200: s(11, "Duct R1.5 200mm x 6m", 62), 250: s(12, "Duct R1.5 250mm x 6m", 71), 300: s(13, "Duct R1.5 300mm x 6m", 84) },
  downjet: { 150: s(20, "Downjet 150mm", 16), 200: s(21, "Downjet 200mm", 24), 250: s(22, "Downjet 250mm", 37) },
  damper: { 200: s(30, "ZoneBoss Damper 200mm", 80), 250: s(31, "ZoneBoss Damper 250mm", 80), 300: s(32, "ZoneBoss Damper 300mm", 95) },
  zoneCable: s(40, "ZoneBoss cable", 20), sensor: s(41, "ZoneMate sensor", 150), controller: s(42, "Zonemate Touch Pro Bundle", 1500, "Equipment"),
  install: s(60, "Ducted Refrigerated System - Installation", 0, "Service"), electrical: s(61, "Ducted Split - Electrical Connection", 1000, "Service"),
  certificate: s(62, "BPC Compliance Certificate", 65, "Service"), rate: 310,
};
const base = (): DuctedInput => ({ unitSkuId: 1, ...standardLayout(), doubleStorey: false, extraHours: 0, extraReason: "", extraSensors: 0, notes: "" });

const q = buildDucted(base(), cat);
const line = (name: RegExp) => q.lines.find((l) => name.test(l.name));
ok("the standard layout is 8 outlets over 4 zones", base().outlets.length === 8 && base().zones.length === 4);
ok("standard house labour: 16 h × $310 = $4,960", q.labour === 4960 && q.hours.total === 16, q.hours);
ok("labour sits on the installation service line", line(/Installation · 16 h/)?.unitPrice === 4960);
// 250 mm: 8 + 8 + 8 = 24 m → 4 lengths; 200 mm: 8 + 8 + 10 + 6 = 32 m → 6 lengths; 150 mm: 6 m → 1.
ok("duct rounded up to whole 6 m lengths, per size", line(/250mm x 6m/)?.quantity === 4 && line(/200mm x 6m/)?.quantity === 6 && line(/150mm x 6m/)?.quantity === 1,
  q.lines.filter((l) => /x 6m/.test(l.name)).map((l) => [l.name, l.quantity]));
ok("a downjet per outlet, by size", line(/Downjet 250/)?.quantity === 3 && line(/Downjet 200/)?.quantity === 4 && line(/Downjet 150/)?.quantity === 1);
const dampers = (x: typeof q) => x.lines.filter((l) => /Damper/.test(l.name)).reduce((a, l) => a + l.quantity, 0);
ok("a damper per zone at the zone's size, same sizes on one line, and a cable each", line(/Damper 300/)?.quantity === 2 && q.lines.filter((l) => /Damper/.test(l.name)).length === 3 && dampers(q) === 4 && line(/ZoneBoss cable/)?.quantity === 4);
ok("the controller bundle on every job", line(/Touch Pro Bundle/)?.quantity === 1);
ok("no extra sensors unless asked for", !line(/ZoneMate sensor/));
ok("the unit's kit comes along", line(/Chipboard/)?.quantity === 4 && line(/Filter/)?.quantity === 1);
ok("electrical and certificate on", line(/Electrical/)?.unitPrice === 1000 && line(/BPC/)?.unitPrice === 65);
ok("nothing missing on a fully stocked pricebook", q.missing.length === 0, q.missing);

const total = 5800 + 1500 + 4960 + 1000 + 4 * 71 + 6 * 62 + 51 + 3 * 37 + 4 * 24 + 16 + (95 + 95 + 80 + 80) + 4 * 20 + 4 * 35 + 156 + 65;
ok("the total adds up", q.total === total, { got: q.total, want: total });

const empty = buildDucted({ ...base(), zones: [...base().zones, { name: "Spare", damper: 200 }] }, cat);
ok("a zone with no outlets isn't charged for", dampers(empty) === 4 && empty.hours.total === 16);

const big = buildDucted({ ...base(), outlets: [...base().outlets, { room: "Rumpus", size: 450, metres: 12, zone: 1 }] }, cat);
ok("a size the pricebook doesn't carry is flagged, not priced from another", big.missing.some((m) => /450 mm duct/.test(m)) && big.missing.some((m) => /450 mm downjet/.test(m)), big.missing);

const extras = buildDucted({ ...base(), doubleStorey: true, extraHours: 2, extraReason: "a tight roof space", extraSensors: 2, notes: "Existing ducting stays in the roof." }, cat);
ok("double storey and extra hours priced", extras.hours.total === 22 && extras.labour === 6820);
ok("extra sensors priced", line(/ZoneMate sensor/) === undefined && extras.lines.find((l) => /ZoneMate sensor/.test(l.name))?.quantity === 2);
ok("the summary names the zones and their rooms", /4 zones: Living \(Living, Kitchen \/ meals\); Bedrooms \(Bedroom 2, Bedroom 3, Bedroom 4\)/.test(extras.summary), extras.summary.slice(0, 200));
ok("the summary carries the double storey, the reason and the notes", /double-storey/.test(extras.summary) && /Allows for a tight roof space\./.test(extras.summary) && /Existing ducting stays in the roof\./.test(extras.summary));

const noUnit = buildDucted({ ...base(), unitSkuId: null }, cat);
ok("no unit chosen: says so", noUnit.missing.includes("Choose the unit"));
const noRate = buildDucted(base(), { ...cat, rate: null });
ok("no hourly rate set: labour isn't silently $0", noRate.missing.some((m) => /hourly rate/.test(m)));

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);
