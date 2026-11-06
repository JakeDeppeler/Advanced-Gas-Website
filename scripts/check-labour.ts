/**
 * Labour pricing: which services are a call-out, one person or two, and how
 * an aircon template is rebuilt around its installation header. A wrong crew
 * is a whole price wrong on every quote that uses the service; a line dropped
 * or doubled in a template is wrong on every quote built from it.
 *
 *   npm run check:labour
 */
import {
  crewFor, headCount, planRefrigerant, planServices, planTemplate, templatePatchItems, templateTotal,
  type Catalogue, type Template, type TemplateItem,
} from "../src/lib/pricebook/labour";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const rates = { callout: 200, solo: 250, partDay: 350, pair: 310, crew3: 360 };
const tr = { partDay: 350, pair: 310 };

// --- services -----------------------------------------------------------------------

ok("split diagnostics is the call-out", crewFor("AC-SPLIT-DIAG") === "callout");
ok("split repair is one person by the hour", crewFor("AC-SPLIT-REPAIR") === "solo");
ok("servicing is left at its own price", crewFor("SVC-AS-SPLIT") === null && crewFor("AC-SPLIT-DEEPCLEAN") === null && crewFor("EVAP-MAINT-DS") === null);
ok("a split install is the part-day rate", crewFor("AC-SPLIT-RTR") === "partDay");
ok("heat pump, split hot water and cooktop installs are part-day", ["HW-HP-HARD", "HW-HP-SPLIT", "GAS-COOKTOP-INSTALL", "HW-CF-INS"].every((c) => crewFor(c) === "partDay"));
ok("all-day jobs are the crew rate: multi-head, ducted, Dominator", ["AC-SPLIT-MULTI-3", "AC-DUCTED-2DAYS", "AC-DOM-LAB"].every((c) => crewFor(c) === "pair"));
ok("codes with stray spaces still match", crewFor(" GAS-DUCT-EXT") === "partDay" && crewFor("AC-SPLIT-MULTI-4 ") === "pair");
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
  { id: 7, code: "AC-SPLIT-REPAIR", name: "Split System – Repair", hours: 1, price: 0, active: false },
  { id: 8, code: "EVAP-DIAG", name: "Evaporative Cooler – Diagnostics", hours: 0, price: 0 },
  { id: 9, code: "AC-MULTI-REPAIR", name: "Multi-Head – Repair", hours: 1, price: 0 },
  { id: 10, code: "SVC-AS-SPLIT", name: "Split System - Clean & Service", hours: 1, price: 250 },
], rates);
const by = (id: number) => sv.changes.find((c) => c.id === id);
ok("diagnostics: the $200 call-out", by(1)?.after === 200, by(1));
ok("a diagnostic with no hours on it is still the call-out", by(8)?.after === 200, by(8));
ok("repair: 1 hour at $250", by(9)?.after === 250, by(9));
ok("4-head labour: 8 hours at $310", by(2)?.after === 2480, by(2));
ok("evap install, 2.8 hours at the part-day $350: $980", by(3)?.after === 980, by(3));
ok("a listed hourly service with no hours is skipped and says so", sv.skipped.some((s) => s.id === 4 && /hours/.test(s.reason)));
ok("an unlisted service is not touched or reported", !by(5) && !sv.skipped.some((s) => s.id === 5));
ok("already at its price counts as unchanged", !by(6) && sv.unchanged === 1);
ok("inactive services are left alone", !by(7));
ok("servicing isn't re-priced", !by(10));
ok("removing the old unit goes with the install: part-day", crewFor("DECOMMISSION-DISPOSAL") === "partDay");

const gas = planRefrigerant([
  { id: 1, code: "R410A 1kg", name: "Refrigerant R410A (HFC) 1KG", price: 0, cost: 100 },
  { id: 2, code: "R32 1kg", name: "Refrigerant R32 (HFC) 1kg", price: 0, cost: 120 },
  { id: 3, code: "Silent Mini Pump FP3450", name: "Pump", price: 280, cost: 230 },
  { id: 4, code: "R32 1kg", name: "inactive copy", price: 0, cost: 0, active: false },
], { markupPct: 25, perKg: { "R410A 1KG": 106, "R32 1KG": 109 } });
ok("R410A: $106 cost, $133 sell", gas.find((g) => g.id === 1)?.after === 133 && gas.find((g) => g.id === 1)?.cost === 106, gas);
ok("R32: $109 cost, $136 sell", gas.find((g) => g.id === 2)?.after === 136 && gas.find((g) => g.id === 2)?.cost === 109);
ok("codes match whatever their case", gas.length === 2);
ok("no refrigerant settings: nothing changes", planRefrigerant([{ id: 1, code: "R410A 1kg", name: "x", price: 0, cost: 100 }], null).length === 0);

const noRate = planServices([{ id: 1, code: "AC-SPLIT-DIAG", name: "d", hours: 1, price: 0 }], { callout: null, solo: 250, partDay: 350, pair: 310, crew3: null });
ok("no call-out fee in the portal: skipped, not priced at $0", noRate.changes.length === 0 && /call-out/.test(noRate.skipped[0]?.reason ?? ""));

// --- templates ----------------------------------------------------------------------

const S = { CF: 28, ELECHP: 29, RTW: 10, RTR: 11, ELEC: 12, BPC: 13, MULTI: 14, M2: 25, M3: 26, M4: 15, M5: 16, M6: 17, MELEC: 18, DUCT: 19, DOM: 27, REBATES: 22, ZONE: 23, HP: 24 };
const M = { COIL: 100, BRACKET: 101, HAT: 102, PVC: 103, VEEC: 104, DAMPER: 105, CABLE: 106 };
const E = { KADEN35: 200, RINNAI14: 201, RPX25: 202, RPX35: 203, RPX5: 204, RPX7: 205, DUCTED16: 206 };
const mh = (n: number, skuId: number, hours: number) => [n, { skuId, hours, name: `Multi Head Labour (${n} head)` }] as const;
const cat: Catalogue = {
  service: new Map([
    [S.RTW, { code: "AC-SPLIT-RTW", hours: 4 }], [S.RTR, { code: "AC-SPLIT-RTR", hours: 4 }], [S.ELEC, { code: "AC-SPLIT-ELEC", hours: 0 }],
    [S.BPC, { code: "BPC COMPLIANCE CERTIFICATE", hours: 0 }], [S.MULTI, { code: "AC-SPLIT-MULTI", hours: 0 }],
    [S.M2, { code: "AC-SPLIT-MULTI-2", hours: 5 }], [S.M3, { code: "AC-SPLIT-MULTI-3", hours: 7 }],
    [S.M4, { code: "AC-SPLIT-MULTI-4", hours: 8 }], [S.M5, { code: "AC-SPLIT-MULTI-5", hours: 12 }], [S.M6, { code: "AC-SPLIT-MULTI-6", hours: 14 }],
    [S.MELEC, { code: "AC-MULTI-ELEC", hours: 0 }], [S.DUCT, { code: "AC-DUCTED-2DAYS", hours: 16 }], [S.DOM, { code: "AC-DOM-INSTALL", hours: 0 }],
    [S.CF, { code: "HW-CF-INS", hours: 2.8 }], [S.ELECHP, { code: "ELEC-HP", hours: 0 }],
    [S.REBATES, { code: "REBATE-TOTAL", hours: 0 }], [S.ZONE, { code: "ZONE 150MM ADD-ON", hours: 0 }], [S.HP, { code: "HW-HP-SPLIT", hours: 4 }],
  ]),
  materialPrice: new Map([[M.COIL, 240], [M.BRACKET, 50], [M.HAT, 35], [M.PVC, 20], [M.VEEC, -70], [M.DAMPER, 76], [M.CABLE, 20]]),
  multiHead: new Map([mh(2, S.M2, 5), mh(3, S.M3, 7), mh(4, S.M4, 8), mh(5, S.M5, 12), mh(6, S.M6, 14)]),
  splitAddOns: [
    { skuId: 301, skuType: "Material", name: "Silent Mini White Cond Pump 45L/h FP3450", price: 280 },
    { skuId: 302, skuType: "Service", name: "Blygold Corrosion Protection", price: 1100 },
  ],
};
let nextId = 1000;
const it = (skuType: TemplateItem["skuType"], skuId: number, skuName: string, unitPrice: number, more: Partial<TemplateItem> = {}): TemplateItem =>
  ({ id: nextId++, skuId, skuType, skuName, quantity: 1, unitPrice, isAddOn: false, ...more });
const plan = (t: Template) => {
  const p = planTemplate(t, cat, tr);
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
ok("split labour: 4 hours at the part-day $350 on the header", p1.header.labour === 1400 && head1.unitPrice === 1400, p1.header);
ok("the header keeps the template's group name", head1.itemGroupName === "Split System Install - Roof To Mounted Condenser");
ok("electrical and all four materials sit under the header", group(p1.items, p1.header.itemId).length === 5);
ok("materials priced from the pricebook: 240 + 50 + 2×35 + 20", p1.materials === 380 && p1.electrical === 400, { m: p1.materials, e: p1.electrical });
ok("the unit and the certificate stay outside the group", !p1.items.find((i) => i.skuId === E.KADEN35)!.itemGroupParentId && !p1.items.find((i) => i.skuId === S.BPC)!.itemGroupParentId);
ok("order: unit, header, its group, then the certificate (extras aside)", p1.items.filter((i) => !i.isAddOn).map((i) => i.skuId).join() === [E.KADEN35, S.RTW, S.ELEC, M.COIL, M.BRACKET, M.HAT, M.PVC, S.BPC].join());
ok("total: 900 + 1670 + 400 + 65 before, 900 + 1400 + 400 + 380 + 65 after", p1.before === 3035 && p1.after === 3145, { before: p1.before, after: p1.after });
ok("nothing doubled, nothing taken off", p1.removed.length === 0);
const extras = p1.items.filter((i) => i.isAddOn);
ok("a split offers condensate pump, Blygold and a second coil; removal comes with the install", extras.length === 3 && extras.map((e) => e.unitPrice).join() === "280,1100,240", extras.map((e) => [e.skuName, e.unitPrice]));
ok("the second coil is the template's own coil, at its pricebook price", extras.some((e) => e.skuId === M.COIL && e.unitPrice === 240));
ok("extras are optional: not in the total", p1.after === 3145);
ok("extras are new items, sent without an id", templatePatchItems(p1.items).filter((b) => b.id === null).length === 3);
const withPump: Template = { ...k35, items: [...k35.items, it("Material", 301, "Silent Mini White Cond Pump", 280, { isAddOn: true })] };
ok("an extra the template already offers isn't added twice", plan(withPump).items.filter((i) => i.skuId === 301).length === 1);
const body = templatePatchItems(p1.items);
ok("every existing item is sent with its own id", body.filter((b) => b.id !== null).every((b) => (b.id ?? 0) >= 1000) && body.filter((b) => b.id !== null).length === k35.items.length);
ok("members are sent pointing at the header", body.filter((b) => b.itemGroupParentId === p1.header.itemId).length === 5);

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
ok("a second certificate comes off", plan(m5).items.filter((i) => i.skuId === S.BPC).length === 1);

// Rinnai 14kW: 4-, 5- and 6-head labour all charged as core lines.
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
const labourAddOns = p4.items.filter((i) => i.isAddOn);
ok("multi-head: no labour on the header, the office picks it", p4.header.labour === 0 && p4.items.find((i) => i.id === p4.header.itemId)!.unitPrice === 0);
ok("all five head counts offered as add-ons at hours × $310", labourAddOns.length === 5 && labourAddOns.map((a) => a.unitPrice).join() === "1550,2170,2480,3720,4340", labourAddOns.map((a) => a.unitPrice));
ok("the three labour lines already there are kept by id, as add-ons", [S.M4, S.M5, S.M6].every((sku) => { const a = labourAddOns.find((x) => x.skuId === sku); return a && a.id != null; }));
ok("the 2- and 3-head ones are added new", [S.M2, S.M3].every((sku) => labourAddOns.find((x) => x.skuId === sku)?.id === null));
ok("labour add-ons sit outside the installation group", labourAddOns.every((a) => !a.itemGroupParentId));
ok("electrical and the coil go under the header; the rebate doesn't", group(p4.items, p4.header.itemId).length === 2 && !p4.items.find((i) => i.skuId === M.VEEC)!.itemGroupParentId);
ok("the rebate keeps its price", p4.items.find((i) => i.skuId === M.VEEC)!.unitPrice === -70);
ok("Rinnai 14kW total: unit + heads + electrical + coil + certificate − rebate, labour picked per job", p4.after === 3000 + 1370 + 700 + 240 + 65 - 70, { before: p4.before, after: p4.after });
ok("new add-ons are sent without an id", templatePatchItems(p4.items).filter((b) => b.id === null).length === 2);

// Ducted and Dominator: priced from the job's design, not rebuilt.
const zone = it("Service", S.ZONE, "Zone 150mm Add-on", 0, { isAddOn: true });
const ducted: Template = { id: 5, name: "Mitsubishi Electric Ducted Split 16kw", items: [
  it("Equipment", E.DUCTED16, "Mitsubishi Electric 16kw Ducted Split", 5800),
  it("Service", S.DUCT, "Ducted Refrigerated System - Installation", 8560),
  zone,
  it("Material", M.CABLE, "ZoneBoss Blue 24V Cable", 20, { parentItemId: zone.id }),
] };
const skipDucted = planTemplate(ducted, cat, tr);
ok("ducted isn't rebuilt", "reason" in skipDucted && /ducted/.test(skipDucted.reason));
const dom: Template = { id: 7, name: "Braemar Dominator Installation External", items: [it("Service", S.DOM, "Dominator - Installation", 990)] };
const skipDom = planTemplate(dom, cat, tr);
ok("nor is the Dominator", "reason" in skipDom && /ducted/.test(skipDom.reason));
ok("add-on kits aren't in a total", templateTotal(ducted.items) === 5800 + 8560);

// Continuous Flow: the install line was $0.
const cf: Template = { id: 8, name: "Continuous Flow - Installation", items: [
  it("Equipment", 210, "Thermann G-Series 26L", 1170),
  it("Service", S.CF, "Continuous Flow - Installation", 0),
  it("Service", S.BPC, "BPC Compliance Certificate", 65),
  it("Material", M.PVC, "Fittings", 180),
] };
const pcf = plan(cf);
ok("continuous flow: 2.8 hours at the part-day $350 on the header, not $0", pcf.kind === "day" && pcf.header.labour === 980, pcf.header);
ok("hot water gets no split extras", pcf.addOns.length === 0);
ok("its fittings go under the header", group(pcf.items, pcf.header.itemId).length === 1);

// Gas heaters: the header at 3 h × $350. An internal heater on the external
// service is swapped to the internal one first, and only that.
const HEAT = { EXT: 40, INT: 41 };
const catH: Catalogue = { ...cat, service: new Map([...cat.service, [HEAT.EXT, { code: "GAS-DUCT-EXT", hours: 3 }], [HEAT.INT, { code: "GAS-DUCT-INT", hours: 3 }]]),
  internalHeater: { skuId: HEAT.INT, hours: 3, name: "Gas Ducted Heater - Internal" } };
const buffalo: Template = { id: 9, name: "Brivis Buffalo 5 Star 20kW Ducted Gas Heater", items: [
  it("Equipment", 220, "Brivis Buffalo 5 Star 20kW", 2400), it("Service", HEAT.EXT, "Gas Ducted Heater - External", 1240),
  it("Material", M.PVC, "Buffalo base box", 0), it("Service", S.BPC, "BPC Compliance Certificate", 65),
] };
const pb = planTemplate(buffalo, catH, tr);
ok("an external heater gets the header: 3 h at the part-day $350", !("reason" in pb) && pb.kind === "day" && pb.header.labour === 1050 && !pb.swap, pb);
const wombat: Template = { id: 10, name: "Brivis Wombat 3 Star 15kW Ducted Gas Heater", items: [
  it("Equipment", 221, "Brivis Classic 2P Wombat 15NG", 1600), it("Service", HEAT.EXT, "Gas Ducted Heater - External", 1190),
  it("Material", M.PVC, "Flue", 0), it("Service", S.BPC, "BPC Compliance Certificate", 65),
] };
const pw = planTemplate(wombat, catH, tr);
ok("an internal heater on the external service is swapped to the internal one", !("reason" in pw) && pw.swap?.skuId === HEAT.INT && pw.items.some((i) => i.skuId === HEAT.INT && i.id === null && i.unitPrice === 1050) && !pw.items.some((i) => i.skuId === HEAT.EXT), pw);
ok("the swap does nothing else: no group yet", !("reason" in pw) && !pw.items.some((i) => i.itemGroupParentId));
const pwNo = planTemplate(wombat, { ...catH, internalHeater: null }, tr);
ok("no internal service yet: skipped, saying run services first", "reason" in pwNo && /run services first/.test(pwNo.reason));
const wombat2: Template = { ...wombat, items: wombat.items.map((i) => (i.skuId === HEAT.EXT ? { ...i, skuId: HEAT.INT, skuName: "Gas Ducted Heater - Internal" } : i)) };
const pw2 = planTemplate(wombat2, catH, tr);
ok("once swapped, the next run groups it like any other", !("reason" in pw2) && !pw2.swap && pw2.header.labour === 1050 && pw2.items.some((i) => i.itemGroupParentId === pw2.header.itemId));

// Not aircon, or already rebuilt.
const cook: Template = { id: 6, name: "Gas Cooktop", items: [it("Service", 400, "Something unlisted", 100)] };
const skipCook = planTemplate(cook, cat, tr);
ok("a template with no listed install line isn't touched", "reason" in skipCook && /not an aircon/.test(skipCook.reason));
const rebuilt: Template = { ...k35, items: plan(k35).items };
const skipAgain = planTemplate(rebuilt, cat, tr);
ok("a template already grouped is left for the office", "reason" in skipAgain && /already/.test(skipAgain.reason));

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);
