/**
 * Labour pricing: which services are priced for one person and which for two,
 * and how an aircon template is rebuilt around its installation header. A
 * wrong crew is a whole price wrong on every quote that uses the service; a
 * line dropped or doubled in a template is wrong on every quote built from it.
 *
 *   npm run check:labour
 */
import {
  crewFor, headCount, planServices, planTemplate, templatePatchItems, templateTotal,
  type Catalogue, type Template, type TemplateItem,
} from "../src/lib/pricebook/labour";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const rates = { solo: 250, pair: 310, crew3: 360 };

// --- services -----------------------------------------------------------------------

ok("split diagnostics is one person", crewFor("AC-SPLIT-DIAG") === "solo");
ok("split repair is one person", crewFor("AC-SPLIT-REPAIR") === "solo");
ok("split clean & service is two", crewFor("SVC-AS-SPLIT") === "pair");
ok("roof-bracket install is two", crewFor("AC-SPLIT-RTR") === "pair");
ok("codes with stray spaces still match", crewFor(" GAS-DUCT-EXT") === "pair" && crewFor("AC-SPLIT-MULTI-4 ") === "pair");
ok("a hot water repair filed under Split System – Repair is left alone", crewFor("HW-CF-REPAIR") === null);
ok("electrical connections are the electrician's price, left alone", crewFor("AC-SPLIT-ELEC") === null);
ok("the three-person hourly line follows the install rate", crewFor("LAB-HR-3P") === "crew3");

const sv = planServices([
  { id: 1, code: "AC-SPLIT-DIAG", name: "Split System – Diagnostics", hours: 1, price: 180 },
  { id: 2, code: "AC-SPLIT-MULTI-4 ", name: "Multi Head Labour (4 Head)", hours: 8, price: 2600 },
  { id: 3, code: "EVAP-INSTALL", name: "Evaporative Cooler - Installation", hours: 2.8, price: 0 },
  { id: 4, code: "AC-DUCTED-LAB-1DAY", name: "Ducted Split System – Installation Labour", hours: 0, price: 0 },
  { id: 5, code: "AC-CASSETTE", name: "Cassette Unit - Install", hours: 0, price: 0 },
  { id: 6, code: "LAB-HR-2P", name: "Labour – Tech & Apprentice", hours: 1, price: 310 },
  { id: 7, code: "SVC-AS-SPLIT", name: "Split System - Clean & Service", hours: 1, price: 250, active: false },
  { id: 8, code: "EVAP-MAINT-DS", name: "Evap Maintenance (Double Storey)", hours: 1.5, price: 400 },
], rates);
const by = (id: number) => sv.changes.find((c) => c.id === id);
ok("diagnostics: 1 hour at $250", by(1)?.after === 250, by(1));
ok("4-head labour: 8 hours at $310", by(2)?.after === 2480, by(2));
ok("2.8 hours at $310 is $868 to the cent", by(3)?.after === 868, by(3));
ok("double-storey evap: 1.5 hours at $310", by(8)?.after === 465, by(8));
ok("a listed service with no hours is skipped and says so", sv.skipped.some((s) => s.id === 4 && /hours/.test(s.reason)));
ok("an unlisted service is not touched or reported", !by(5) && !sv.skipped.some((s) => s.id === 5));
ok("already at its price counts as unchanged", !by(6) && sv.unchanged === 1);
ok("inactive services are left alone", !by(7));
const noRate = planServices([{ id: 1, code: "AC-SPLIT-DIAG", name: "d", hours: 1, price: 0 }], { solo: null, pair: 310, crew3: null });
ok("no one-person rate in the portal: skipped, not priced at $0", noRate.changes.length === 0 && /rate/.test(noRate.skipped[0]?.reason ?? ""));

// --- templates ----------------------------------------------------------------------

// Pricebook ids, shaped like the real ones.
const S = { RTW: 10, RTR: 11, ELEC: 12, BPC: 13, MULTI: 14, M4: 15, M5: 16, M6: 17, MELEC: 18, DUCT: 19, DLAB: 20, DELEC: 21, REBATES: 22, ZONE: 23, HP: 24 };
const M = { COIL: 100, BRACKET: 101, HAT: 102, PVC: 103, VEEC: 104, DAMPER: 105, CABLE: 106 };
const E = { KADEN35: 200, RINNAI14: 201, RPX25: 202, RPX35: 203, RPX5: 204, RPX7: 205, DUCTED16: 206 };
const cat: Catalogue = {
  service: new Map([
    [S.RTW, { code: "AC-SPLIT-RTW", hours: 4 }], [S.RTR, { code: "AC-SPLIT-RTR", hours: 4 }], [S.ELEC, { code: "AC-SPLIT-ELEC", hours: 0 }],
    [S.BPC, { code: "BPC COMPLIANCE CERTIFICATE", hours: 0 }], [S.MULTI, { code: "AC-SPLIT-MULTI", hours: 0 }],
    [S.M4, { code: "AC-SPLIT-MULTI-4", hours: 8 }], [S.M5, { code: "AC-SPLIT-MULTI-5", hours: 12 }], [S.M6, { code: "AC-SPLIT-MULTI-6", hours: 14 }],
    [S.MELEC, { code: "AC-MULTI-ELEC", hours: 0 }], [S.DUCT, { code: "AC-DUCTED-2DAYS", hours: 16 }], [S.DLAB, { code: "AC-DUCTED-LAB", hours: 16 }],
    [S.DELEC, { code: "AC-DUCTED-ELE", hours: 0 }], [S.REBATES, { code: "REBATE-TOTAL", hours: 0 }], [S.ZONE, { code: "ZONE 150MM ADD-ON", hours: 0 }],
    [S.HP, { code: "HW-HP-SPLIT", hours: 4 }],
  ]),
  materialPrice: new Map([[M.COIL, 240], [M.BRACKET, 50], [M.HAT, 35], [M.PVC, 20], [M.VEEC, -70], [M.DAMPER, 76], [M.CABLE, 20]]),
  multiHeadHours: new Map([[2, 5], [3, 7], [4, 8], [5, 12], [6, 14]]),
  dominatorHours: 8,
};
let nextId = 1000;
const it = (skuType: TemplateItem["skuType"], skuId: number, skuName: string, unitPrice: number, more: Partial<TemplateItem> = {}): TemplateItem =>
  ({ id: nextId++, skuId, skuType, skuName, quantity: 1, unitPrice, isAddOn: false, ...more });
const plan = (t: Template) => {
  const p = planTemplate(t, cat, 310);
  if ("reason" in p) throw new Error(`${t.name}: ${p.reason}`);
  return p;
};
const group = (items: TemplateItem[], headId: number) => items.filter((i) => i.itemGroupParentId === headId);

// Kaden 3.5kW roof-to-wall, as it is today: install $1,670 carrying the
// materials, electrician $400 beside it, materials loose at $0.
const k35: Template = { id: 1, name: "Kaden 3.5kW Split System - Roof To Wall Bracket", items: [
  it("Equipment", E.KADEN35, "Kaden KSI 3.5kw V3 Split Air Conditioner", 900, { itemGroupName: "Kaden KSI 3.5kw" }),
  it("Service", S.RTW, "Split System Installation - Wall Bracket", 1670, { itemGroupName: "Split System Install - Roof To Mounted Condenser" }),
  it("Service", S.ELEC, "Split System - Electrical Connection", 400),
  it("Material", M.COIL, "Ardent Copper Pair Coil 1/4\" x 3/8\"", 0),
  it("Material", M.BRACKET, "Rodigas Wall Bracket 420mm", 0),
  it("Material", M.HAT, "Colorbond Hat Section - 2.4m", 0, { quantity: 2 }),
  it("Material", M.PVC, "Pressure Pipe PVC 20mm", 0),
  it("Service", S.BPC, "BPC Compliance Certificate", 65, { itemGroupName: "BPC Compliance Certificate" }),
] };
const p1 = plan(k35);
const head1 = p1.items.find((i) => i.id === p1.header.itemId)!;
ok("split labour: 4 hours at $310", p1.header.labour === 1240 && head1.unitPrice === 1240, p1.header);
ok("the header keeps the template's group name", head1.itemGroupName === "Split System Install - Roof To Mounted Condenser");
ok("electrical and all four materials sit under the header", group(p1.items, head1.id).length === 5, group(p1.items, head1.id).map((i) => i.skuName));
ok("materials priced from the pricebook: 240 + 50 + 2×35 + 20", p1.materials === 380 && p1.electrical === 400, { m: p1.materials, e: p1.electrical });
ok("the unit and the certificate stay outside the group", !p1.items.find((i) => i.skuId === E.KADEN35)!.itemGroupParentId && !p1.items.find((i) => i.skuId === S.BPC)!.itemGroupParentId);
ok("order: unit, header, its group, then the certificate", p1.items.map((i) => i.skuId).join() === [E.KADEN35, S.RTW, S.ELEC, M.COIL, M.BRACKET, M.HAT, M.PVC, S.BPC].join());
ok("total: 900 + 1670 + 400 + 65 before, 900 + 1240 + 400 + 380 + 65 after", p1.before === 3035 && p1.after === 2985, { before: p1.before, after: p1.after });
ok("nothing taken off a template with nothing doubled", p1.removed.length === 0);
const body = templatePatchItems(p1.items);
ok("every item is sent with its own id", body.every((b) => b.id >= 1000) && body.length === k35.items.length);
ok("members are sent pointing at the header", body.filter((b) => b.itemGroupParentId === head1.id).length === 5);

// Kaden 5kW roof-mounted: the install line twice.
const k5: Template = { id: 2, name: "Kaden 5kW Split System - Roof Mounted", items: [
  it("Equipment", E.KADEN35, "Kaden KSI 5kw", 1200),
  it("Service", S.RTR, "Split System Installation - Roof Bracket", 1310),
  it("Service", S.RTR, "Split System Installation - Roof Bracket", 1870),
  it("Service", S.ELEC, "Split System - Electrical Connection", 400),
  it("Service", S.BPC, "BPC Compliance Certificate", 65),
] };
const p2 = plan(k5);
ok("a second install line comes off", p2.items.filter((i) => i.skuId === S.RTR).length === 1 && p2.removed.some((r) => /second/.test(r)), p2.removed);

// Mitsubishi 5kW roof-mounted: the certificate twice.
const m5: Template = { id: 3, name: "Mitsubishi Electric 5kW Split System - Roof Mounted", items: [
  it("Service", S.RTR, "Split System Installation - Roof Bracket", 1870),
  it("Service", S.BPC, "BPC Compliance Certificate", 65), it("Service", S.BPC, "BPC Compliance Certificate", 65),
] };
const p3 = plan(m5);
ok("a second certificate comes off", p3.items.filter((i) => i.skuId === S.BPC).length === 1, p3.removed);

// Rinnai 14kW: 4-, 5- and 6-head labour all charged, four heads fitted.
const r14: Template = { id: 4, name: "Rinnai 14kw Multi Head Split System", items: [
  it("Equipment", E.RINNAI14, "Rinnai Multi Condenser 14kw", 3000),
  it("Service", S.M4, "Multi Head Labour (4 Head)", 2620), it("Service", S.M5, "Multi Head Labour (5 Head)", 3920), it("Service", S.M6, "Multi Head Labour (6 Head)", 4570),
  it("Service", S.MELEC, "Multi Head - Electrical", 700),
  it("Equipment", E.RPX25, "Rinnai RPX 2.5kw Indoor\t", 250), it("Equipment", E.RPX35, "Rinnai RPX 3.5kw Indoor", 270),
  it("Equipment", E.RPX5, "Rinnai RPX 5kw Indoor", 400), it("Equipment", E.RPX7, "Rinnai RPX 7kw Indoor", 450),
  it("Service", S.MULTI, "Multi Head Installation", 1250, { itemGroupName: "Split System - Multi-Head Install" }),
  it("Service", S.BPC, "BPC Compliance Certificate", 65),
  it("Service", S.REBATES, "Total Government Rebates Applied", 0),
  it("Material", M.VEEC, "Victorian Energy Upgrades Discount (VEEC)", -70),
  it("Material", M.COIL, "Ardent Copper Pair Coil", 0),
] };
ok("four indoor heads counted, condenser not", headCount(r14.items) === 4);
const p4 = plan(r14);
ok("multi-head labour from the head count: 4 heads, 8 hours", p4.header.heads === 4 && p4.header.hours === 8 && p4.header.labour === 2480, p4.header);
ok("all three head-count labour lines come off", p4.removed.length === 3 && !p4.items.some((i) => [S.M4, S.M5, S.M6].includes(i.skuId)), p4.removed);
ok("the rebate stays out of the group, at its own price", (() => { const v = p4.items.find((i) => i.skuId === M.VEEC)!; return !v.itemGroupParentId && v.unitPrice === -70; })());
ok("Rinnai 14kW comes down from $17,425-style stacking", p4.after < p4.before, { before: p4.before, after: p4.after });

// Ducted: an internal two-day labour line beside the installation, and zone
// add-ons whose kits hang off them.
const zone = it("Service", S.ZONE, "Zone 150mm Add-on", 0, { isAddOn: true });
const ducted: Template = { id: 5, name: "Mitsubishi Electric Ducted Split 16kw", items: [
  it("Equipment", E.DUCTED16, "Mitsubishi Electric 16kw Ducted Split", 5800),
  it("Service", S.DLAB, "Ducted Split - Labour (Two Days)", 5230),
  it("Service", S.DELEC, "Ducted Split - Electrical Connection", 1000),
  it("Material", M.COIL, "Ardent Copper Pair Coil 3/8 x 3/4", 0),
  it("Service", S.DUCT, "Ducted Refrigerated System - Installation", 8560),
  zone,
  it("Material", M.CABLE, "ZoneBoss Blue 24V Cable", 20, { parentItemId: zone.id }),
  it("Material", M.DAMPER, "ZoneBoss Damper 24V 150mm", 76, { parentItemId: zone.id }),
] };
const p5 = plan(ducted);
ok("ducted labour: 16 hours, once", p5.header.hours === 16 && p5.header.labour === 4960 && p5.removed.some((r) => /Two Days/.test(r)), p5);
ok("zone kits stay under their add-on, not the installation", p5.items.filter((i) => i.parentItemId === zone.id).length === 2 && group(p5.items, p5.header.itemId).length === 2);
ok("add-on kits aren't in the total", templateTotal(ducted.items) === 5800 + 5230 + 1000 + 8560);

// Not aircon, or already rebuilt.
const hp: Template = { id: 6, name: "Reclaim Split GL 250L V1", items: [it("Service", S.HP, "Heat Pump Split - Installation", 2160)] };
const skipHp = planTemplate(hp, cat, 310);
ok("a heat pump template isn't touched", "reason" in skipHp && /not an aircon/.test(skipHp.reason));
const again = plan(k35);
const rebuilt: Template = { ...k35, items: again.items };
const skipAgain = planTemplate(rebuilt, cat, 310);
ok("a template already grouped is left for the office", "reason" in skipAgain && /already/.test(skipAgain.reason));

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);
