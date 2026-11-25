/**
 * The ducted builder: hours from the layout, the two-day floor, and the
 * materials a layout turns into. A wrong hour is $310 on every ducted quote;
 * a duct length miscounted is a job short of duct on the day.
 *
 *   npm run check:ducted
 */
import { readFileSync } from "node:fs";
import { buildDucted, ductedHours, standardLayout, type DuctedCatalogue, type DuctedInput, type Sku } from "../src/lib/ducted/plan";
import { asFitting, asReducers, pickFitting, type Fitting } from "../src/lib/ducted/fittings";
import { readTakeoff, outletCount, zoneCount } from "../src/lib/ducted/takeoff";
import { buildFromDesign, matchUnit, type DesignOptions } from "../src/lib/ducted/design";

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
  units: [
    { ...s(1, "Mitsubishi Electric 16kw Ducted Split", 5800, "Equipment"), model: "PEAZM160VHAAMAKIT", kit: [{ sku: s(50, "Chipboard", 35), quantity: 4 }, { sku: s(51, "Filter 1200x400", 156), quantity: 1 }] },
    { ...s(2, "Mitsubishi Electric 12kw Ducted Split", 4800, "Equipment"), model: "PEAZM125VHAA2MAKIT", kit: [{ sku: s(50, "Chipboard", 35), quantity: 4 }, { sku: s(52, "Custom Ducted Transition / Plenum", 350), quantity: 1 }, { sku: s(53, "Multisnap DBTO F/Insul 300.250.200.200", 81), quantity: 1 }] },
    { ...s(3, "Kaden Ducted Split 17kW V2", 4800, "Equipment"), model: "KDI-17-v2", kit: [] },
  ],
  duct: { 150: s(10, "Duct R1.5 150mm x 6m", 51), 200: s(11, "Duct R1.5 200mm x 6m", 62), 250: s(12, "Duct R1.5 250mm x 6m", 71), 300: s(13, "Duct R1.5 300mm x 6m", 84) },
  downjet: { 150: s(20, "Downjet 150mm", 16), 200: s(21, "Downjet 200mm", 24), 250: s(22, "Downjet 250mm", 37) },
  damper: { 200: s(30, "ZoneBoss Damper 200mm", 80), 250: s(31, "ZoneBoss Damper 250mm", 80), 300: s(32, "ZoneBoss Damper 300mm", 95) },
  zoneCable: s(40, "ZoneBoss cable", 20), itc: s(41, "Mitsubishi Electric Individual Temperature Control", 90, "Equipment"), controller: s(42, "Mitsubishi Electric Zone Controller", 1550, "Equipment"),
  install: s(60, "Ducted Refrigerated System - Installation", 0, "Service"), electrical: s(61, "Ducted Split - Electrical Connection", 1000, "Service"),
  certificate: s(62, "BPC Compliance Certificate", 65, "Service"), rate: 310,
  fittings: [], reducers: [], transition: null, raGrilles: [], raBoxes: [], collar: {},
};
const base = (): DuctedInput => ({ unitSkuId: 1, ...standardLayout(), doubleStorey: false, extraHours: 0, extraReason: "", itcs: null, notes: "" });

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
ok("the Mitsubishi Electric controller on every job, as its own group (Jake, 24 Nov)", line(/Zone Controller/)?.quantity === 1 && line(/Zone Controller/)?.group === "controls" && q.lines.filter((l) => l.group === "controls")[0] === line(/Zone Controller/));
ok("a temperature control per zone unless told otherwise, with the installation's materials (Jake, 25 Nov)", line(/Temperature Control/)?.quantity === 4 && line(/Temperature Control/)?.group === "install");
ok("the controller is alone in its group", q.lines.filter((l) => l.group === "controls").length === 1);
ok("the installation's head is still the installation service, not an ITC", q.lines.filter((l) => l.group === "install")[0].name.startsWith("Ducted Refrigerated System - Installation"));
ok("the unit's kit comes along", line(/Chipboard/)?.quantity === 4 && line(/Filter/)?.quantity === 1);
ok("electrical and certificate on", line(/Electrical/)?.unitPrice === 1000 && line(/BPC/)?.unitPrice === 65);
ok("nothing missing on a fully stocked pricebook", q.missing.length === 0, q.missing);

const total = 5800 + 1550 + 4 * 90 + 4960 + 1000 + 4 * 71 + 6 * 62 + 51 + 3 * 37 + 4 * 24 + 16 + (95 + 95 + 80 + 80) + 4 * 20 + 4 * 35 + 156 + 65;
ok("the total adds up", q.total === total, { got: q.total, want: total });

const empty = buildDucted({ ...base(), zones: [...base().zones, { name: "Spare", damper: 200 }] }, cat);
ok("a zone with no outlets isn't charged for", dampers(empty) === 4 && empty.hours.total === 16);

const big = buildDucted({ ...base(), outlets: [...base().outlets, { room: "Rumpus", size: 450, metres: 12, zone: 1 }] }, cat);
ok("a size the pricebook doesn't carry is flagged, not priced from another", big.missing.some((m) => /450 mm duct/.test(m)) && big.missing.some((m) => /450 mm downjet/.test(m)), big.missing);

const extras = buildDucted({ ...base(), doubleStorey: true, extraHours: 2, extraReason: "a tight roof space", itcs: 2, notes: "Existing ducting stays in the roof." }, cat);
ok("double storey and extra hours priced", extras.hours.total === 22 && extras.labour === 6820);
ok("fewer temperature controls when asked, and the summary says so", extras.lines.find((l) => /Temperature Control/.test(l.name))?.quantity === 2 && /temperature control in 2 of the 4 zones/.test(extras.summary));
ok("the summary names the Mitsubishi controller, not the Zonemate", /Mitsubishi Electric zone controller/.test(q.summary) && !/Zonemate/i.test(q.summary));
ok("the summary names the zones and their rooms", /4 zones: Living \(Living, Kitchen \/ meals\); Bedrooms \(Bedroom 2, Bedroom 3, Bedroom 4\)/.test(extras.summary), extras.summary.slice(0, 200));
ok("the summary carries the double storey, the reason and the notes", /double-storey/.test(extras.summary) && /Allows for a tight roof space\./.test(extras.summary) && /Existing ducting stays in the roof\./.test(extras.summary));

const noUnit = buildDucted({ ...base(), unitSkuId: null }, cat);
ok("no unit chosen: says so", noUnit.missing.includes("Choose the unit"));
const noRate = buildDucted(base(), { ...cat, rate: null });
ok("no hourly rate set: labour isn't silently $0", noRate.missing.some((m) => /hourly rate/.test(m)));


// ---------------------------------------------------------------- a Trust Trade design
// The designer's own materials CSV for its demo house (engine.wasm, run on 24 Nov).
const csv = readFileSync(new URL("./fixtures/trusttrade-demo-materials.csv", import.meta.url), "utf8");
const t = readTakeoff(csv);
ok("the designer's CSV reads: unit, kW, zones, ITCs", t.indoor === "Mitsubishi Electric PEA-M125HAA" && t.kw === 12.5 && t.zones === 5 && t.itc === 5 && !t.problem, { indoor: t.indoor, kw: t.kw, zones: t.zones });
ok("duct in 6 m lengths by size, the return air duct with them", t.duct[200] === 6 && t.duct[400] === 2 && t.duct[350] === 1, t.duct);
ok("every take-off with its legs", t.takeoffs.length === 4 && t.takeoffs[1].in === 300 && t.takeoffs[1].outs.join() === "250,200,150" && t.takeoffs[3].qty === 2, t.takeoffs);
ok("outlets and zones for the hours", outletCount(t) === 9 && zoneCount(t) === 5);
ok("nothing in the demo goes unread", t.unread.length === 0, t.unread);
ok("mounting, fixing and the pair coil are left to the unit's kit", t.kitLines === 9);
ok("a file that isn't the materials list says so", !!readTakeoff("name,phone\nBob,0400").problem && !!readTakeoff("").problem);
ok("a quoted field with a comma and doubled quotes parses", readTakeoff('"Group","Item","Detail","Qty","Unit"\n"Zoning","Motorised zone damper Ø250","a, ""b""","3","ea"').dampers[250] === 3);

const m = (id: number, name: string, price: number) => s(id, name, price);
const fittings = [
  m(100, "Multisnap DBTO F/Insul 300.250.200.200", 81), m(101, "Multisnap DBTO F/Insul 300.250.250.250", 83), m(102, "Multisnap F/Insul MXY 350.300.200 Kit", 43),
  m(103, "Multisnap BTO F/Insul 350.300.300", 121), m(104, "Multisnap F/Insul MXY 300.250.250  Base", 33), m(105, "Duct Poly Insul BTO 300x250x250mm", 59),
  m(106, "Multisnap F/Insul MXY 250.200.200 Base", 23), m(107, "Duct Poly Insul BTO 250x200x200mm", 36),
].map(asFitting).filter((f): f is Fitting => !!f);
const reducers = [m(110, "Multisnap F/Insul Reducer 200-150", 4), m(111, "Multisnap F/Insul Reducer 300-250-200", 7), m(112, "Duct Poly Insul Reducer 250x200mm", 21)].flatMap(asReducers);
ok("pricebook take-offs read inlet first, legs biggest first", fittings.length === 8 && fittings[0].in === 300 && fittings[0].outs.join() === "250,200,200" && fittings[4].rank === 4, fittings.map((f) => [f.name, f.in, f.outs]));
ok("a stepped reducer cuts to either size", reducers.filter((r) => r.from === 300).map((r) => r.to).sort().join() === "200,250");
const exact = pickFitting({ in: 350, outs: [200, 300] }, fittings, reducers);
ok("an exact take-off is used as it is", exact?.fitting.skuId === 102 && exact.exact && exact.reducers.length === 0);
const near = pickFitting({ in: 300, outs: [250, 200, 150] }, fittings, reducers);
ok("no 300 → 250·200·150 in stock: the DBTO 300.250.200.200 and a 200-150 reducer, as 20803 was done by hand", near?.fitting.skuId === 100 && near.reducers.map((r) => r.skuId).join() === "110", near && [near.fitting.name, near.reducers.map((r) => r.name)]);
const pref = pickFitting({ in: 300, outs: [250, 250] }, fittings, reducers);
ok("a complete poly BTO before a Multisnap MXY base", pref?.fitting.skuId === 105, pref?.fitting.name);
const kitFirst = pickFitting({ in: 350, outs: [300, 200] }, [...fittings, ...[m(108, "Duct Poly Insul BTO 350x300x200mm", 51)].map(asFitting).filter((f): f is Fitting => !!f)], reducers);
ok("the office's Multisnap range before the poly one", kitFirst?.fitting.skuId === 102);
const ys = [m(150, "Multisnap Y F/Insul 450.350.350", 75), m(151, "Multisnap Y F/Insul 200.200-100.200-100", 49), m(152, "Multisnap F/Insul MXB 300.250.200 Kit", 65), m(153, "Multisnap F/Insul MXB 250.200.200 Base", 35)].map(asFitting);
ok("Multisnap Ys, MXBs and adjustable legs read too", ys.every(Boolean) && ys[0]!.in === 450 && ys[0]!.rank === 0 && ys[1]!.mins.join() === "100,100" && ys[2]!.rank === 1 && ys[3]!.rank === 4, ys.map((f) => f && [f.name, f.in, f.outs, f.mins, f.rank]));
ok("a 450 trunk splitting to two 350s takes the Multisnap Y", pickFitting({ in: 450, outs: [350, 350] }, ys.filter((f): f is Fitting => !!f), reducers)?.fitting.skuId === 150);
const cut = pickFitting({ in: 200, outs: [150, 150] }, ys.filter((f): f is Fitting => !!f), reducers);
ok("an adjustable leg cuts down to size with no reducer, and says what it's for", cut?.fitting.skuId === 151 && cut.reducers.length === 0 && !cut.exact);
ok("a bigger inlet is never substituted", pickFitting({ in: 400, outs: [350, 300] }, fittings, reducers) === null && pickFitting({ in: 250, outs: [300, 200] }, fittings, reducers) === null);

const dcat: DuctedCatalogue = {
  ...cat, fittings, reducers, transition: s(120, "Custom Ducted Transition / Plenum", 350),
  duct: { ...cat.duct, 350: s(14, "Duct R1.5 350mm x 6m", 98), 400: s(15, "Duct R1.5 400mm x 6m", 110) },
  raGrilles: [{ ...s(130, "Profiler Eggcrate Black Filter 1200mm x 400mm", 156), w: 1200, h: 400 }, { ...s(131, "Profiler Eggcrate Black Filter 600mm x 400mm", 92), w: 600, h: 400 }],
  raBoxes: [{ ...s(132, "Return Air Box - 400mm x 600mm", 124), w: 400, h: 600 }],
  collar: { 400: s(140, "Starting Collar Metal 400mm", 11) },
  damper: { ...cat.damper, 150: s(33, "ZoneBoss Damper 150mm", 76) },
};
ok("the designer's unit finds its pricebook kit by Mitsubishi's capacity code", matchUnit(t, dcat.units)?.skuId === 2);
ok("…and by kW and brand when there's no code", matchUnit({ indoor: "Kaden KDI-170", outdoor: null, kw: 16.5 }, dcat.units)?.skuId === 3 && matchUnit({ indoor: null, outdoor: null, kw: null }, dcat.units) === null);

const opts: DesignOptions = { unitSkuId: null, doubleStorey: false, extraHours: 0, extraReason: "", itcs: null, notes: "" };
const d = buildFromDesign(t, opts, dcat);
const dl = (re: RegExp) => d.lines.find((l) => re.test(l.name));
ok("the design's unit is on unless one is chosen", d.unit?.skuId === 2 && dl(/12kw/)?.group === "unit");
ok("design hours: 9 outlets, 5 zones → 8 + 6.75 + 2.5 = 17.25 h", d.hours.total === 17.25 && d.labour === 5347.5, d.hours);
ok("the controller in its own group, the design's 5 ITCs with the materials", dl(/Zone Controller/)?.group === "controls" && d.lines.filter((l) => l.group === "controls").length === 1 && dl(/Temperature Control/)?.quantity === 5 && dl(/Temperature Control/)?.group === "install");
ok("duct straight from the design's lengths", dl(/200mm x 6m/)?.quantity === 6 && dl(/400mm x 6m/)?.quantity === 2 && dl(/150mm x 6m/)?.quantity === 1);
ok("take-offs priced at the design's sizes, reducers where the exact one isn't stocked", dl(/MXY 350\.300\.200/)?.quantity === 1 && dl(/DBTO F\/Insul 300\.250\.200\.200/)?.quantity === 1 && dl(/Reducer 200-150/)?.quantity === 1, d.lines.filter((l) => /BTO|MXY|Reducer/.test(l.name)).map((l) => [l.name, l.quantity, l.note]));
ok("two of the same take-off is two", dl(/BTO 250x200x200/)?.quantity === 2);
ok("a downjet per round outlet, by size", dl(/Downjet 200/)?.quantity === 6 && dl(/Downjet 250/)?.quantity === 2 && dl(/Downjet 150/)?.quantity === 1);
ok("dampers by size and a cable each", dl(/Damper 300/)?.quantity === 1 && dl(/Damper 200/)?.quantity === 2 && dl(/Damper 150/)?.quantity === 1 && dl(/ZoneBoss cable/)?.quantity === 6);
ok("the transition once, from the design, not again from the kit", d.lines.filter((l) => /Transition/.test(l.name)).length === 1 && dl(/Transition/)?.sku?.skuId === 120);
ok("the kit's own take-off is left out when the design brings its own", !d.lines.some((l) => l.sku?.skuId === 53) && dl(/Chipboard/)?.quantity === 4);
ok("return air: the nearest grille, said out loud", dl(/Eggcrate.*1200mm/)?.note === "the design has 1200 × 500" && d.missing.some((x) => /1200 × 500 grille/.test(x)), d.missing);
ok("…and no return air box invented for a size the pricebook doesn't carry", !dl(/Return Air Box/) && d.missing.some((x) => /Return air box for 1200 × 500/.test(x)));
ok("collars from the design", dl(/Starting Collar Metal 400/)?.quantity === 2);
ok("groups in quote order with the right head on each", ["unit", "controls", "install", "extra"].every((g) => d.lines.some((l) => l.group === g)) && d.lines.filter((l) => l.group === "install")[0].name.startsWith("Ducted Refrigerated System - Installation"));
ok("the design's summary: outlets, zones, the Mitsubishi controller", /9 outlets across 5 zones/.test(d.summary) && /temperature control in each zone/.test(d.summary), d.summary.slice(0, 160));
const sum = d.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0);
ok("the design's total is its lines", Math.abs(d.total - sum) < 0.01, { total: d.total, sum });
const eleven = buildFromDesign({ ...t, zones: 11 }, opts, dcat);
ok("more than 10 zones is flagged for the 10-zone controller", eleven.missing.some((x) => /up to 10 zones and this has 11/.test(x)));
const chosen = buildFromDesign(t, { ...opts, unitSkuId: 1, itcs: 3, doubleStorey: true }, dcat);
ok("a chosen unit, fewer ITCs and a double storey all carry", chosen.unit?.skuId === 1 && chosen.lines.find((l) => /Temperature Control/.test(l.name))?.quantity === 3 && chosen.hours.total === 21.25);

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);
