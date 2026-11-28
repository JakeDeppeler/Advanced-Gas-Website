/**
 * The 15 Nov quote templates (quoteTemplateSpecs.ts): every Brivis size in
 * every colour from the Climate price list, priced the way the pricebook
 * already prices Brivis, and none of the ones Jake ruled out.
 *
 *   npm run check:quote-templates
 */
import {
  DIAGNOSTICS, EVAP_UNITS, LEAK_REGAS, OTHER_TEMPLATES, REPAIRS_28, SERVICES_28, evapSellPrice, leakRegasCode, evapTemplate, evapUnitPrice, findUnit, lineTotal, pricedItems, type LiveSku,
} from "../src/lib/pricebook/quoteTemplateSpecs";
import { groupedItems, isGrouped, isTestTemplate, tidyCode, tidyName } from "../src/lib/pricebook/templateShape";
import { HEATER_EVAP_DISCOUNTS, SERVICE_PRICES, pricedAt, sameName } from "../src/lib/pricebook/servicePricing";
import { GENERIC_REBATE_HEADER, REBATE_HEADERS, rebateGroup, swapHeader } from "../src/lib/pricebook/rebateSpecs";
import { evapProposals } from "../src/lib/pricebook/evapProposalSpecs";
import { flatText, textHash, wordingAction } from "../src/lib/pricebook/summaryRule";
import { summaryHtml } from "../src/lib/pricebook/wording";
import type { TemplateItem } from "../src/lib/pricebook/labour";
import { DOM, DUCTED, DUCTED_HOURS, DUCTED_LABOUR_PRICE, ITC_SKU, LAB_3P, RENAME_24, SKU, SKU24, T, T24, ZC10, ZONEMATE, ZONE_DAMPER, planDominator25, planDucted25, planDuctedFixed, planDuctedHourly, planFixes, planFixes24, planMitsubishiZoning, planZoneAddOn, planZoningB, planFixes28, BDO, SUNDRY, T28, FLUE_100, REPAIR_TEMPLATES, planRepairParts, DOM18, cloneLines, regroup } from "../src/lib/pricebook/templateFixPlan";
import { HEATERS, HEATER_TEMPLATES, customerPrice, heaterPrice, pickTakeoffs, readHit, takeoffName } from "../src/lib/pricebook/reeceBuildSpecs";
import { EVAP_FAULTS, EVAP_REPAIR_SIZES, REPAIR_REPLACE_UPGRADE, SPLIT_FAULTS, SPLIT_REPAIR_SIZES, repairProposals } from "../src/lib/pricebook/repairProposalSpecs";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

ok("59 Brivis units from the Climate list", EVAP_UNITS.length === 59, EVAP_UNITS.length);
ok("each Rinnai order code once", new Set(EVAP_UNITS.map((u) => u.part)).size === EVAP_UNITS.length);
const models = [...new Set(EVAP_UNITS.filter((u) => u.series !== "Balaero").map((u) => u.model))];
ok("every Contour, Promina and Advance size in all three colours",
  models.every((m) => ["Beige", "Charcoal", "Terra Red"].every((c) => EVAP_UNITS.some((u) => u.model === m && u.colour === c))), models.length);
ok("a size costs the same in every colour",
  models.every((m) => new Set(EVAP_UNITS.filter((u) => u.model === m).map((u) => u.cost)).size === 1));

// The 8 Nov rule, against what it actually set.
ok("P36 at $1,729.48 sells at $2,170", evapSellPrice(1729.48) === 2170, evapSellPrice(1729.48));
ok("L36 at $1,957.85 sells at $2,450", evapSellPrice(1957.85) === 2450, evapSellPrice(1957.85));
ok("a cost landing exactly on $10 isn't pushed up", evapSellPrice(2000) === 2500, evapSellPrice(2000));
const l56 = EVAP_UNITS.find((u) => u.part === "L56BEIGE")!;
ok("a new colour takes its size's price, not the 25%", evapUnitPrice(l56, [{ model: "L56", price: 2800 }]) === 2800);
const f66 = EVAP_UNITS.find((u) => u.part === "F66DSBEIGE")!;
ok("the dearer of two colours", evapUnitPrice(f66, [{ model: "F66DS", price: 2400 }, { model: "F66DS", price: 2380 }]) === 2400);
const l37 = EVAP_UNITS.find((u) => u.part === "L37BEIGE")!;
ok("a size never sold takes cost plus 25%", evapUnitPrice(l37, [{ model: "L36", price: 2450 }]) === evapSellPrice(l37.cost), evapUnitPrice(l37, []));

// Matching what the pricebook already has.
const p56 = EVAP_UNITS.find((u) => u.part === "P56BEIGE")!;
ok("found by Rinnai's code on a second vendor", findUnit(p56, [{ id: 1, price: 2510, model: "P56", parts: ["1608122", "P56BEIGE"] }])?.id === 1);
ok("found through stray spaces and case", findUnit(p56, [{ id: 2, price: 1, model: "", parts: [" p56beige "] }])?.id === 2);
ok("not found on another colour", findUnit(p56, [{ id: 3, price: 1, model: "P56", parts: ["P56CHAR"] }]) === undefined);

// The templates.
const evap = EVAP_UNITS.map((u, i) => evapTemplate(u, 1000 + i, 2500));
const all = [...OTHER_TEMPLATES, ...evap];
ok("every template code once", new Set(all.map((t) => t.code)).size === all.length, all.length);
ok("every template name once", new Set(all.map((t) => t.name.toLowerCase())).size === all.length);
ok("no 2 x split templates (Jake: rare)", !all.some((t) => /2 ?x/i.test(t.name)));
ok("no 10kW ducted until it's priced", !all.some((t) => /10 ?kw/i.test(t.name)));
ok("every template has lines and a summary", all.every((t) => t.lines.length > 0 && t.summary.length > 40));

// Jake, 16 Nov: service prices ex GST; two or more splits $180 each; 10% off a heater and evap together.
ok("service prices as Jake gave them, and the evap install at $900", SERVICE_PRICES.slice(0, 6).map((s) => s.price).join(",") === "250,350,300,400,250,900");
// Jake, 22 Nov: Dominator labour $3,300, the ducted install $5,000, multi-heads at 1 tech + 1 apprentice ($350 an hour) for 6–14 h.
const p22 = (id: number) => SERVICE_PRICES.find((s) => s.skuId === id)?.price;
// The ducted $5,000 moved from the installation line to the two-day labour under it on 25 Nov.
// 25 Nov evening: the installation back on Dynamic Pricing, so off the fixed list (its price is ServiceTitan's).
ok("Dominator labour $3,300, the two-day labour $5,000, and the installation off the fixed list", p22(301165543) === 3300 && p22(301164889) === 5000 && !SERVICE_PRICES.some((x) => (x.skuId as number) === 209599911));
ok("multi-heads 2–6 at $2,100 to $4,900", [301089962, 301089572, 301090544, 301091980, 301089957].map(p22).join(",") === "2100,2800,3500,4200,4900");
ok("multi-heads are 6, 8, 10, 12, 14 hours at $350", [2100, 2800, 3500, 4200, 4900].every((p, i) => p === (6 + 2 * i) * 350));
ok("every priced item once", new Set(SERVICE_PRICES.map((s) => s.skuId)).size === SERVICE_PRICES.length);
ok("the 10% off heater + evap: $55 single storey, $65 double", HEATER_EVAP_DISCOUNTS.map((d) => d.price).join(",") === "-55,-65");
const total = (code: string) => lineTotal(OTHER_TEMPLATES.find((t) => t.code === code)!.lines);
ok("2, 3 and 4 splits at $180 each", [total("AC-SPLIT-SVC-2"), total("AC-SPLIT-SVC-3"), total("AC-SPLIT-SVC-4")].join(",") === "360,540,720");
ok("heater + evap: $495 single storey, $585 double", total("SVC-HTR-EVAP-SS") === 495 && total("SVC-HTR-EVAP-DS") === 585, [total("SVC-HTR-EVAP-SS"), total("SVC-HTR-EVAP-DS")]);
ok("heater + evap kept as plain lines, so the discount shows", OTHER_TEMPLATES.filter((t) => t.flat).map((t) => t.code).join(",") === "SVC-HTR-EVAP-SS,SVC-HTR-EVAP-DS");
ok("the deep clean in the condensate pump template at $350", total("AC-SPLIT-REP-CONDPUMP") === 630);
// Jake, 16 Nov: a rebate total for hot water (with its conditions) and one for heating & cooling.
const item = (id: number, skuId: number, under: number | null, price = 0): TemplateItem =>
  ({ id, skuId, skuType: skuId === GENERIC_REBATE_HEADER ? "Service" : "Material", quantity: 1, unitPrice: price, isAddOn: false, itemGroupParentId: under, itemGroupName: under ? null : "Total Government Rebates Applied" } as TemplateItem);
const hwT = [item(1, 999, null), item(2, GENERIC_REBATE_HEADER, null), item(3, 301034179, 2, -35), item(4, 301034820, 2, -70), item(5, 301034190, 2, -909.09)];
const hcT = [item(1, 999, null), item(2, GENERIC_REBATE_HEADER, null), item(4, 301034820, 2, -70)];
ok("a template with STC or Solar Victoria under the total is hot water", rebateGroup(hwT)?.kind === "hotWater" && rebateGroup(hwT)?.members.length === 3);
ok("VEU alone is heating & cooling", rebateGroup(hcT)?.kind === "heatingCooling");
ok("no generic header, nothing to do", rebateGroup([item(1, 999, null)]) === null);
const sw = swapHeader(hwT, hwT[1], 777, "d");
ok("swapped in place: same line, new item, the rebates still under it", sw[1].id === 2 && sw[1].skuId === 777 && sw.filter((i) => i.itemGroupParentId === 2).length === 3);
const sw2 = swapHeader(hwT, hwT[1], 777, "d", 50);
ok("swapped in two steps: the new line's id, the rebates moved under it", sw2[1].id === 50 && sw2.filter((i) => i.itemGroupParentId === 50).length === 3 && !sw2.some((i) => i.id === 2));
ok("the hot water wording has the 1 July 2026 income cap; heating & cooling only the gas heater", /\$150,000/.test(REBATE_HEADERS.hotWater.description) && /gas heater is decommissioned and removed/.test(REBATE_HEADERS.heatingCooling.description));

// Jake, 16 Nov: evap proposals, Advance / Promina / Contour, one per size and colour.
const props = evapProposals();
ok("15 evap proposals: 5 sizes in 3 colours", props.length === 15, props.length);
ok("every size offers all three ranges in order", props.every((p) => p.options.map((o) => `${o.order}${o.templateCode.split("-")[2]}`).join() === "1ADVANCE,2PROMINA,3CONTOUR"));
ok("36 to 66: the same size in each", props.filter((p) => !/ 76 /.test(p.name)).every((p) => new Set(p.options.map((o) => o.templateCode.split("-")[3].replace(/\D/g, ""))).size === 1));
ok("the 76: Advance F86DS (no Advance 76), Promina P76, Contour L76, in its colour", props.filter((p) => / 76 /.test(p.name)).every((p) => p.options.map((o) => o.templateCode.split("-")[3]).join() === "F86DS,P76,L76" && p.options.every((o) => o.templateCode.endsWith(p.key.split("-")[2].replace("TERRARED", "TERRA").replace("CHARCOAL", "CHAR")))), props.filter((p) => / 76 /.test(p.name)).map((p) => [p.key, p.options.map((o) => o.templateCode)]));
ok("each option is a template that's made", props.every((p) => p.options.every((o) => evap.some((t) => t.code === o.templateCode))));
ok("names match through ServiceTitan's dashes", sameName("Evaporative Cooler - Maintenance (Single Storey)", "Evaporative Cooler – Maintenance (Single Storey)") && !sameName("Split System - Deep Clean", "Split System - Clean & Service"));
ok("an evap replacement is unit, install, compliance", evap.every((t) => t.lines.map((l) => l.skuType).join() === "Equipment,Service,Service"));
ok("names say size and colour", evap[0].name === "Brivis Contour L36 Evaporative Cooler (Beige) - Replacement", evap[0].name);
ok("the summary names the unit and colour", /new Brivis Contour L36 evaporative cooler in Beige/.test(evap[0].summary));

// Prices on the lines.
const live = new Map<number, LiveSku>([
  [1000, { price: 2450, cost: 1957.85, description: "unit", name: "u" }],
  [209601267, { price: 820, cost: null, description: "<p>install</p>", name: "EVAP-INSTALL" }],
  [209621211, { price: 65, cost: 50, description: null, name: "BPC Compliance Certificate" }],
]);
const priced = pricedItems(evap[0].lines, live);
ok("the unit takes today's price, the install Jake's $900", priced.items.map((i) => i.unitPrice).join() === "2450,900,65", priced.items.map((i) => i.unitPrice));
const kc = OTHER_TEMPLATES.find((t) => t.code === "EVAP-KADEN-KC32-CHAR")!;
ok("the KC32 at its 8 Nov price, not the $2,200 quoted", pricedItems(kc.lines, new Map(kc.lines.map((l) => [l.skuId, { price: 2420, cost: 1, description: "d", name: "n" }]))).items[0].unitPrice === 2420);
ok("a line with no description takes the item's name", priced.items[2].description === "BPC Compliance Certificate");
ok("nothing missing", priced.missing.length === 0);
const hw = OTHER_TEMPLATES.find((t) => t.code === "HW-THERMANN-125-ELEC")!;
const hwPriced = pricedItems(hw.lines, new Map(hw.lines.map((l) => [l.skuId, { price: 999, cost: 1, description: "d", name: "n" }])));
ok("a line the office put in at $0 stays at $0", hwPriced.items.filter((_, k) => hw.lines[k].unitPrice === 0).every((i) => i.unitPrice === 0));
ok("an item gone from the pricebook is named", pricedItems(hw.lines, new Map()).missing.length === hw.lines.length);

// The labour items switched off and renamed to junk ("frfvd") after the quotes were written.
const retired = [1309, 148186526, 209601318, 209601882, 301175242, 301359168, 301368653];
ok("no template on a retired labour item", !all.some((t) => t.lines.some((l) => retired.includes(l.skuId))),
  all.filter((t) => t.lines.some((l) => retired.includes(l.skuId))).map((t) => t.code));
const kun = OTHER_TEMPLATES.find((t) => t.code === "GAS-KADEN-KUN320")!;
ok("the Kaden internal heaters on the internal install, found by code", kun.lines[1].code === "GAS-DUCT-INT" && kun.lines[1].skuId === 0);
ok("an item waited on by code says which", pricedItems(kun.lines, new Map()).missing.includes("GAS-DUCT-INT"));
ok("no frost valve template until we know the system", !all.some((t) => /frost/i.test(t.name)));
// Jake, 28 Nov: a diagnostic for each kind of system, and the common evap and split repairs.
ok("a diagnostic template for each kind of system, one line at the $200 call-out", DIAGNOSTICS.length === 13 && DIAGNOSTICS.every((t) => t.lines.length === 1 && t.lines[0].unitPrice === 200 && / - Diagnostics$/.test(t.name) && OTHER_TEMPLATES.includes(t)));
ok("…none twice, and none for the split system, which has its own", new Set(DIAGNOSTICS.map((t) => t.lines[0].skuId)).size === 13 && !DIAGNOSTICS.some((t) => /^Split System/.test(t.name)));
ok("repairs: the repair line is an hour or more at $250 plus the part's price, the part under it at $0", REPAIRS_28.every((t) => t.lines.length === 2 && t.lines[1].unitPrice === 0 && ["Material", "Equipment"].includes(t.lines[1].skuType) && (t.lines[0].unitPrice - 250) >= 0 && OTHER_TEMPLATES.includes(t)));
ok("…the water pump at $405 ($250 + $155), the control board at an hour and a half", total("EVAP-REP-PUMP") === 405 && total("EVAP-REP-CONTROLBOARD") === 375 + 515);
ok("…and a remote for the split system", REPAIRS_28.some((t) => t.code === "AC-SPLIT-REP-REMOTE" && t.lines[1].skuId === 301202953));

// The layout Jake asked for on 16 Nov: equipment as its own group, the labour
// header holding electrical and materials at one price, then the BPC.
const it = (id: number, skuType: TemplateItem["skuType"], skuName: string, unitPrice: number, more: Partial<TemplateItem> = {}): TemplateItem =>
  ({ id, skuId: id, skuType, skuName, quantity: 1, unitPrice, isAddOn: false, parentItemId: null, itemGroupParentId: null, itemGroupName: null, ...more });
const flat = [
  it(1, "Equipment", "Thermann Smart Electric Storage 125L 3kw", 1410),
  it(2, "Service", "Electric HWS - Changeover ", 1210),
  it(3, "Service", "BPC Compliance Certificate", 65),
  it(4, "Material", "Tomson Turbo 15mm Valve Kit", 220),
  it(5, "Material", "Concrete Slab 600", 35),
  it(6, "Material", "Small-scale Technology Certificate", -35),
];
const g = groupedItems(flat)!;
ok("equipment first, as its own group", g[0].id === 1 && g[0].itemGroupName === "Thermann Smart Electric Storage 125L 3kw" && g[0].itemGroupParentId === null);
ok("then the labour header, named for its service", g[1].id === 2 && g[1].itemGroupName === "Electric HWS - Changeover" && g[1].itemGroupParentId === null);
ok("materials under the header", g.filter((i) => i.skuType === "Material").every((i) => i.itemGroupParentId === 2), g.map((i) => [i.id, i.itemGroupParentId]));
ok("BPC last, on its own", g[g.length - 1].id === 3 && g[g.length - 1].itemGroupParentId === null);
ok("an install's materials go to $0 inside the group, as the office's templates have them", g.filter((i) => i.skuType === "Material" && i.unitPrice >= 0).every((i) => i.unitPrice === 0));
ok("a rebate keeps its value", g.find((i) => i.id === 6)?.unitPrice === -35);
ok("the unit, labour and BPC keep theirs", [1410, 1210, 65].every((v, k) => g.find((i) => i.id === [1, 2, 3][k])?.unitPrice === v));
ok("the read-back test passes on it", isGrouped(g) && !isGrouped(flat));
ok("a grouped template is left alone", groupedItems(g) === null);
const cooker = groupedItems([it(10, "Service", "Gas Cooktop – Installation", 550), it(11, "Service", "Cooker - Electrical Connection ", 350), it(12, "Service", "BPC Compliance Certificate", 65)])!;
ok("the electrician's line rides under the header", cooker[1].id === 11 && cooker[1].itemGroupParentId === 10);
const motor = groupedItems([it(20, "Service", "Evaporative Cooler – Repair", 350), it(21, "Material", "FAN MOTOR - EVAP", 550), it(22, "Material", "Capacitor", 91)])!;
ok("a repair: parts under the labour, one price", motor[0].id === 20 && motor.slice(1).every((i) => i.itemGroupParentId === 20));
ok("a repair keeps its parts' prices: labour plus parts", motor.reduce((a, i) => a + i.unitPrice, 0) === 991);
ok("an add-on stays an add-on", groupedItems([it(30, "Service", "Install", 900), it(31, "Material", "Coil", 0), it(32, "Service", "Extra", 100, { isAddOn: true })])!.find((i) => i.id === 32)?.itemGroupParentId === null);

// Names and codes the review listed.
ok("comma decimal", tidyName("Mitsubishi Electric 7,1kW Split System - Back to Back") === "Mitsubishi Electric 7.1kW Split System - Back to Back");
ok("stray spaces", tidyName(" Mitsubishi Electric 7.1kW Split System - Roof Mounted ") === "Mitsubishi Electric 7.1kW Split System - Roof Mounted");
ok("kw to kW", tidyName("Rinnai 14kw Multi Head Split System ") === "Rinnai 14kW Multi Head Split System");
ok("the Kaden 2.6 that is a 2.5", tidyName("Kaden 2.6kW Split System - Roof Mounted") === "Kaden 2.5kW Split System - Roof Mounted");
ok("the 315 missing its L", tidyName("Reclaim Split GL 315 V2") === "Reclaim Split GL 315L V2");
ok("Panasonic says heat pump", tidyName("Panasonic Split SS 315L 4kw\u2028") === "Panasonic Heat Pump Split SS 315L 4kW", tidyName("Panasonic Split SS 315L 4kw\u2028"));
ok("a good name is untouched", tidyName("Kaden 5kW Split System - Back to Back") === "Kaden 5kW Split System - Back to Back");
ok("codes: no spaces, capitals", tidyCode("  AC-SPLIT-RTR-MITELEC-6") === "AC-SPLIT-RTR-MITELEC-6" && tidyCode("GAS-BUFFALO-3-STAR-20kW ") === "GAS-BUFFALO-3-STAR-20KW");
ok("codes: the Reclaim typo and the 285L", tidyCode("HW-REClAIM-400-GL-SPLIT-V1") === "HW-RECLAIM-400-GL-SPLIT-V1" && tidyCode("HW-THERMANN-300-HP-PLUG") === "HW-THERMANN-285-HP-PLUG");
ok("test templates left alone", isTestTemplate("fefefefefefefefe", "") && isTestTemplate("Mitsubishi Electric 2.6kw rewrewrewrewreSystem", "Mitsubishi ew eewe System"));
ok("real ones aren't taken for tests", !isTestTemplate("Brivis Buffalo 3 Star 20kW Ducted Gas Heater ", "GAS-BUFFALO-3-STAR-20kW ") && !isTestTemplate("Reclaim Split GL 315 V2", "HW-RECLAIM-315-GL-SPLIT-V2"));


// Jake, 17 Nov: the summary is the job, in four labelled parts; the unit is sold on its own line.
const unit = (series: "Advance" | "Promina" | "Contour" | "Balaero", model: string) => EVAP_UNITS.find((u) => u.series === series && u.model === model && (u.colour === "Charcoal"))!;
const pro = evapTemplate(unit("Promina", "P46"), 0, 0), bal = evapTemplate(unit("Balaero", "50"), 0, 0);
const paras = (t: { summary: string }) => t.summary.split("\n\n");
const LABELLED = /^(What we're doing|What we're removing|What's included|What's not included):/m;
ok("an evap summary is three plain paragraphs, no labels (Jake, 25 Nov)", paras(pro).length === 3 && !LABELLED.test(pro.summary), paras(pro).map((p) => p.slice(0, 24)));
ok("and its wall controller comes with the cooler", /its wall controller is fitted/.test(pro.summary) && /The price includes the new cooler and its wall controller/.test(pro.summary));
ok("it names the unit and colour, and doesn't sell it", /new Brivis Promina P46 evaporative cooler in Charcoal/.test(pro.summary) && !/AquaSave|winter seal|best value|Choose the/.test(pro.summary));
ok("the Balaero reads the same way", paras(bal).length === 3 && /Brivis Balaero 50 evaporative cooler in Charcoal/.test(bal.summary));
const installs = OTHER_TEMPLATES.filter((t) => /Replacement|Gas Storage$/.test(t.name) && !/Valve|Motor|Capacitor|Controller|Pump Replacement/.test(t.name) && !REPAIRS_28.includes(t));
ok("every install the code makes is three plain paragraphs", installs.length >= 9 && installs.every((t) => paras(t).length === 3 && !LABELLED.test(t.summary) && /The price includes the /.test(t.summary)), installs.filter((t) => paras(t).length !== 3 || LABELLED.test(t.summary)).map((t) => t.name));
ok("the Add Unit template doesn't name itself as the unit", /with a new evaporative cooler,/.test(OTHER_TEMPLATES.find((t) => t.code === "EVAP-REPLACE-ADD-UNIT")!.summary));

// When wording may be written over (summaryRule.ts).
const html = (t: string) => summaryHtml(t);
const want = pro.summary, h = (t: string) => textHash(flatText(t));
ok("already right: nothing to do", wordingAction(html(want), want, undefined, true) === "same");
ok("ServiceTitan's escaped apostrophes still read as the same", wordingAction(html(want).replace(/'/g, "&#39;"), want, undefined, false) === "same");
ok("a unit's warranty label goes in bold and still reads as the same", summaryHtml("Warranty: 5 years.").includes("<strong>Warranty:</strong>") && wordingAction(summaryHtml("A.\n\nWarranty: 5 years."), "A.\n\nWarranty: 5 years.", undefined, false) === "same");
ok("first pass: whatever is there is written over", wordingAction(html("The office's old words."), want, undefined, true) === "write");
ok("after it: words nobody recorded are left alone", wordingAction(html("Typed by the office."), want, undefined, false) === "leave");
ok("words this code wrote are written over", wordingAction(html("Older words.\n\nOurs."), want, h("Older words.\n\nOurs."), false) === "write");
ok("words edited since it wrote them are left alone", wordingAction(html("Ours, then edited."), want, h("Ours."), false) === "leave");
ok("an empty description is always filled", wordingAction("", want, h("Ours."), false) === "write" && wordingAction(null, want, undefined, false) === "write");

// Jake, 22 Nov: the template fixes from the review.
{
  const L = (id: number, skuId: number, skuType: TemplateItem["skuType"], skuName: string, unitPrice: number, extra: Partial<TemplateItem> = {}): TemplateItem =>
    ({ id, skuId, skuType, skuName, quantity: 1, unitPrice, isAddOn: false, ...extra } as TemplateItem);
  const prices = new Map<number, number>([[SKU.pvc, 20], [SKU.coil38, 240], [SKU.bpc, 65], [900001, 55]]);
  const multi = { id: 1, name: "Rinnai 5kW Multi Head Split System", items: [
    L(10, 500, "Equipment", "Rinnai Multi Condenser 5kw", 2220),
    L(11, 209600205, "Service", "Multi Head Installation", 1000, { itemGroupName: "Multi Head Installation" }),
    L(12, SKU.coil38, "Material", "Ardent Copper Pair Coil 1/4 x 3/8", 0, { quantity: 2, itemGroupParentId: 11 }),
    L(13, 301089962, "Service", "Multi Head Labour (2 head)", 2100),
    L(14, SKU.splitElec, "Service", "Split System - Electrical Connection", 400, { itemGroupParentId: 11 }),
  ] };
  const m = planFixes(multi, prices);
  ok("multi-head: the head labour comes off", !!m && !m.items.some((i) => i.skuId === 301089962), m?.did);
  ok("multi-head: one coil of each size", m?.items.find((i) => i.skuId === SKU.coil38)?.quantity === 1);
  ok("electrical $400 → $450", m?.items.find((i) => i.skuId === SKU.splitElec)?.unitPrice === 450);
  ok("a fixed template has nothing left to do", planFixes({ ...multi, items: m!.items }, prices) === null);
  const mits = planFixes({ id: 2, name: "Mitsubishi Electric 12kW Multi Head Split System", items: [L(20, 9, "Service", "Multi Head Installation", 1060, { itemGroupName: "x" }), L(21, SKU.coil58, "Material", "Coil 1/4 x 5/8", 0, { itemGroupParentId: 20 })] }, prices);
  ok("Mitsubishi multi-heads keep only the 3/8 and 1/2 coils", !!mits && !mits.items.some((i) => i.skuId === SKU.coil58));
  const btb = planFixes({ id: T.mitsu25Btb, name: "Mitsubishi Electric 2.5kW Split System - Back to Back", items: [
    L(30, 7, "Equipment", "Mitsubishi Electric 2.5kw Split System", 1200),
    L(31, 209600004, "Service", "Split System Install - Back To Back", 1320, { itemGroupName: "Installation" }),
    L(32, SKU.hat, "Material", "Colorbond Hat Section", 0, { quantity: 2, itemGroupParentId: 31 }),
    L(33, SKU.coil12, "Material", "Coil 1/4 x 1/2", 0, { quantity: 0.5, itemGroupParentId: 31 }),
    L(34, SKU.splitElec, "Service", "Split System - Electrical Connection", 450, { itemGroupParentId: 31 }),
    L(35, SKU.bpc, "Service", "BPC Compliance Certificate", 65),
  ] }, prices);
  const coil = btb?.items.find((i) => i.skuId === SKU.coil38);
  ok("Mitsubishi 2.5kW back-to-back: 1/4 x 3/8 coil, half a coil, in the install group", !!coil && coil.quantity === 0.5 && coil.itemGroupParentId === 31 && !btb!.items.some((i) => i.skuId === SKU.coil12));
  ok("…one hat section, and a drain pipe in the group before the certificate", btb?.items.find((i) => i.skuId === SKU.hat)?.quantity === 1
    && btb!.items.findIndex((i) => i.skuId === SKU.pvc) < btb!.items.findIndex((i) => i.skuId === SKU.bpc) && btb!.items.find((i) => i.skuId === SKU.pvc)?.itemGroupParentId === 31);
  const rec = planFixes({ id: T.reclaimGl250V1, name: "Reclaim Split GL 250L V1", items: [L(40, 8, "Equipment", "Reclaim Split", 5100)] }, prices);
  ok("Reclaim Split GL 250L V1 gets its BPC certificate at $65", rec?.items.find((i) => i.skuId === SKU.bpc)?.unitPrice === 65);
  const evapT = { id: 3, name: "Brivis Contour L36 Evaporative Cooler (Beige) - Replacement", items: [
    L(50, 11, "Equipment", "Brivis Contour L36", 2600), L(51, SKU.evapInstall, "Service", "Evaporative Cooler - Installation", 900, { itemGroupName: "Evaporative Cooler - Installation" }), L(52, SKU.bpc, "Service", "BPC", 65)] };
  const ev = planFixes(evapT, prices);
  const pvc = ev?.items.find((i) => i.skuId === SKU.pvc);
  ok("evap replacements get the PVC drain, at its price, in the install group", !!pvc && pvc.unitPrice === 20 && pvc.itemGroupParentId === 51, ev?.items);
  ok("…once", planFixes({ ...evapT, items: ev!.items }, prices) === null);
  ok("an evap repair isn't an evap replacement", planFixes({ ...evapT, name: "Evaporative Cooler - Fan Motor Replacement" }, prices) === null);
  const k5 = planFixes({ id: T.kaden5Roof, name: "Kaden 5kW Split System - Roof Mounted", items: [
    L(60, SKU.pump, "Material", "Silent Mini Pump", 280, { isAddOn: true }), L(61, SKU.coil12, "Material", "Second coil", 300, { isAddOn: true }), L(62, SKU.blygold, "Service", "Blygold", 1100, { isAddOn: true })] }, prices);
  ok("Kaden 5kW roof: the pump and Blygold add-ons go, the second coil stays", !!k5 && k5.items.length === 1 && k5.items[0].skuId === SKU.coil12);
  const duct = { id: DUCTED[0], name: "Kaden Ducted Split 17kW", items: [
    L(70, 12, "Equipment", "Kaden Ducted Split 17kW V2", 6300),
    L(71, SKU.ductedLabour, "Service", "Ducted Split - Labour (Two Days)", 5230, { itemGroupParentId: 72 }),
    L(72, SKU.ductedInstall, "Service", "Ducted Refrigerated System - Installation", 8830, { itemGroupName: "Ducted Refrigerated System - Installation" }),
    L(73, 900001, "Material", "Bradflo duct", 0, { itemGroupParentId: 72 }),
    L(74, 900002, "Material", "Zone damper", 0, { itemGroupParentId: 72, parentItemId: 75 }),
    L(76, SKU.bpc, "Service", "BPC", 65),
  ] };
  ok("ducted: the 22 Nov rule taking the labour out of the group is gone (Jake reversed it on 25 Nov)", planFixes(duct, prices) === null);
  const df = planDuctedFixed(duct, 5000, prices);
  ok("ducted at a fixed price: $5,000 on the installation, its materials at their pricebook price, add-on parts left alone",
    df?.items.find((i) => i.skuId === SKU.ductedInstall)?.unitPrice === 5000 && df.items.find((i) => i.id === 73)?.unitPrice === 55 && df.items.find((i) => i.id === 74)?.unitPrice === 0);
  ok("split and heat pump electrical at $450 in the pricebook", [209621215, 209607618].every((id) => SERVICE_PRICES.find((x) => x.skuId === id)?.price === 450));

  // Jake, 25 Nov: the installation at $0, the two-day labour under it at $5,000, the ITCs at $0.
  const now25 = { id: DUCTED[2], name: "Mitsubishi Electric Ducted Split 16kW", items: [
    L(100, 12, "Equipment", "Mitsubishi Electric 16kw Ducted Split", 6100),
    L(101, SKU.ductedInstall, "Service", "Ducted Refrigerated System - Installation", 5000, { itemGroupName: "Ducted Refrigerated System - Installation" }),
    L(102, 301215982, "Service", "Ducted Split - Electrical Connection", 1000, { itemGroupParentId: 101 }),
    L(103, 900001, "Material", "Bradflo duct", 62, { itemGroupParentId: 101, quantity: 6 }),
    L(104, ITC_SKU, "Equipment", "Mitsubishi ITC", 90, { itemGroupParentId: 101, quantity: 4 }),
    L(105, SKU.ductedLabour, "Service", "Ducted Split - Labour (Two Days)", 5230, { itemGroupName: "Ducted Split - Labour (Two Days)" }),
    L(106, SKU.bpc, "Service", "BPC", 65),
  ] };
  const p25 = planDucted25(now25);
  const lab25 = p25?.items.filter((i) => i.skuId === SKU.ductedLabour) ?? [];
  const sum = (xs: TemplateItem[]) => xs.filter((i) => !i.isAddOn).reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  ok("ducted 25 Nov: the installation at $0", p25?.items.find((i) => i.id === 101)?.unitPrice === 0, p25?.did);
  ok("…one two-day labour line, new, under the installation, at $5,000", lab25.length === 1 && lab25[0].id == null && lab25[0].itemGroupParentId === 101 && !lab25[0].itemGroupName && lab25[0].unitPrice === DUCTED_LABOUR_PRICE);
  ok("…placed after the group's last line, before the certificate", p25!.items.indexOf(lab25[0]) > p25!.items.findIndex((i) => i.id === 104) && p25!.items.indexOf(lab25[0]) < p25!.items.findIndex((i) => i.id === 106));
  ok("…the ITCs at $0, the materials and electrical left at their prices", p25?.items.find((i) => i.id === 104)?.unitPrice === 0 && p25?.items.find((i) => i.id === 103)?.unitPrice === 62 && p25?.items.find((i) => i.id === 102)?.unitPrice === 1000);
  ok("…so the labour is charged once: the template drops by the $5,230 line and the ITCs", sum(now25.items) - sum(p25!.items) === 5230 + 5000 - 5000 + 360, { before: sum(now25.items), after: sum(p25!.items) });
  ok("…and a template already laid out is left alone", planDucted25({ ...now25, items: p25!.items.map((i, k) => (i.id == null ? { ...i, id: 900 + k } : i)) }) === null);
  ok("…only the four ducted templates", planDucted25({ ...now25, id: 1 }) === null);
  ok("the pricebook keeps the two-day labour at $5,000; the installation is ServiceTitan's to price (25 Nov evening)", !SERVICE_PRICES.some((x) => (x.skuId as number) === SKU.ductedInstall) && SERVICE_PRICES.find((x) => x.skuId === SKU.ductedLabour)?.price === DUCTED_LABOUR_PRICE);
  ok("a service price changed since it was set is set again", pricedAt("$5000 → $5000", 5000) && !pricedAt("$5000 → $5000", 0) && pricedAt("$5230 → $0", 0) && !pricedAt(undefined, 0));

  // Jake, 25 Nov evening: "all of these should be chargeable", "the material for the dynamic markup but the labour can change".
  const dh = { id: DUCTED[1], name: "Mitsubishi Electric Ducted Split 12kW", items: [
    L(200, SKU.ductedInstall, "Service", "Ducted Refrigerated System - Installation", 0, { itemGroupName: "Ducted Refrigerated System - Installation" }),
    L(201, 301169157, "Material", "Chipboard", 0, { itemGroupParentId: 200, quantity: 4, chargeable: false }),
    L(202, 209621677, "Material", "Wall bracket", 75, { itemGroupParentId: 200, chargeable: true }),
    L(203, 301034820, "Material", "VEEC discount", -70, { itemGroupParentId: 200, chargeable: false }),
    L(204, ITC_SKU, "Equipment", "Mitsubishi ITC", 0, { itemGroupParentId: 200, quantity: 4, chargeable: false }),
    L(205, SKU.ductedLabour, "Service", "Ducted Split - Labour (Two Days)", 5000, { itemGroupParentId: 200 }),
    L(206, 900010, "Material", "Zone damper", 0, { isAddOn: true, parentItemId: 299, chargeable: false }),
  ] };
  const crewLine = { name: "Labour – Tech & 2 Apprentices", description: "Each hour of a technician and two apprentices.", price: 360 };
  const ph = planDuctedHourly(dh, crewLine);
  const crewIn = ph?.items.filter((i) => i.skuId === LAB_3P) ?? [];
  ok("ducted hourly: a material switched off is made chargeable", ph?.items.find((i) => i.id === 201)?.chargeable === true, ph?.did);
  ok("…but not a rebate, an add-on's own part, or the ITCs the controller comes with", ph?.items.find((i) => i.id === 203)?.chargeable === false && ph?.items.find((i) => i.id === 206)?.chargeable === false && ph?.items.find((i) => i.id === 204)?.chargeable === false);
  ok("…the $5,000 two-day labour comes off", !ph?.items.some((i) => i.skuId === SKU.ductedLabour));
  ok("…and the crew line goes on under the installation, 16 hours at its rate", crewIn.length === 1 && crewIn[0].id == null && crewIn[0].itemGroupParentId === 200 && crewIn[0].quantity === DUCTED_HOURS && crewIn[0].unitPrice === 360 && crewIn[0].skuType === "Service");
  ok("…once: a template already laid out is left alone, whatever hours the office set", planDuctedHourly({ ...dh, items: ph!.items.map((i, k) => (i.id == null ? { ...i, id: 950 + k, quantity: 20 } : i)) }, crewLine) === null);
  ok("…only the four ducted templates", planDuctedHourly({ ...dh, id: 1 }, crewLine) === null);

  // Jake, 25 Nov evening: "the Dominator we need to remove the return air box and make the grill 1000x400" (1200 for now, asked).
  const dom = { id: 301500001, name: "Braemar Dominator Series 3 18kW - Replacement", items: [
    L(300, DOM.install, "Service", "Dominator - Installation", 980, { itemGroupName: "Dominator - Installation" }),
    L(301, DOM.raBox, "Material", "Return Air Box - 400mm x 600mm", 0, { itemGroupParentId: 300 }),
    L(302, DOM.grille600, "Material", "Profiler Eggcrate Black Filter 600mm x 400mm", 0, { itemGroupParentId: 300, chargeable: true }),
    L(303, 148186547, "Material", "PVC", 0, { itemGroupParentId: 300 }),
  ] };
  const pd = planDominator25(dom, new Map([[DOM.grille1200, 155.96]]));
  const g = pd?.items.find((i) => i.skuId === DOM.grille1200);
  ok("Dominator: the return air box comes off", !pd?.items.some((i) => i.skuId === DOM.raBox), pd?.did);
  ok("…the 600 x 400 grille becomes the 1200 x 400, a new line in the same group, at $0 as the old one was", !pd?.items.some((i) => i.skuId === DOM.grille600) && g?.id == null && g?.itemGroupParentId === 300 && g?.unitPrice === 0 && g?.chargeable === true);
  ok("…a priced grille takes the 1200's price", planDominator25({ ...dom, items: dom.items.map((i) => (i.id === 302 ? { ...i, unitPrice: 92 } : i)) }, new Map([[DOM.grille1200, 155.96]]))?.items.find((i) => i.skuId === DOM.grille1200)?.unitPrice === 155.96);
  ok("…and a template already done, or not a Dominator, is left alone", planDominator25({ ...dom, items: pd!.items.map((i, k) => (i.id == null ? { ...i, id: 960 + k } : i)) }, new Map()) === null && planDominator25({ ...dom, items: dom.items.slice(1) }, new Map()) === null);

  // Jake, 25 Nov: "yes swap them to the mitsubishi 10 zone".
  const zm = { id: DUCTED[0], name: "Mitsubishi Electric Ducted Split 18kW", items: [
    L(110, 12, "Equipment", "Mitsubishi Electric 18kw Ducted Split", 6600, { itemGroupName: "Mitsubishi Electric 18kw Ducted Split" }),
    L(111, ZONEMATE.bundle, "Equipment", "Zonemate Touch Pro Bundle + 4 Wireless Sensors", 1500, { itemGroupName: "  Zonemate Touch Pro Bundle + 4 Wireless Sensors" }),
    L(112, SKU.ductedInstall, "Service", "Ducted Refrigerated System - Installation", 0, { itemGroupName: "Ducted Refrigerated System - Installation" }),
    L(113, ZONEMATE.gateway, "Material", "Zonemate Touch Gateway Mits Elec", 400, { itemGroupParentId: 112 }),
    L(114, ZONEMATE.sensor, "Material", "ZoneMate Wireless Temperature Sensor", 150, { itemGroupParentId: 112 }),
    L(115, 301216670, "Service", "Zone 450mm Add-on", 0, { isAddOn: true, itemGroupParentId: 112 }),
    L(116, ZONEMATE.sensor, "Material", "ZoneMate Wireless Temperature Sensor", 150, { itemGroupParentId: 112, parentItemId: 115 }),
  ] };
  const zt = { controllerPrice: 1550, controllerName: "Mitsubishi Electric Zone Controller", controllerText: "The Mitsubishi Electric Zone Controller…", itcName: "Mitsubishi Electric Individual Temperature Control", itcText: null };
  const zp = planMitsubishiZoning(zm, zt);
  const zc = zp?.items.find((i) => i.skuId === ZC10);
  ok("ducted zoning: the Zonemate bundle becomes the Mitsubishi 10-zone controller, new, in its own group, at its price", !!zc && zc.id == null && zc.itemGroupName === "Mitsubishi Electric Zone Controller" && zc.unitPrice === 1550 && zc.itemGroupParentId == null, zp?.did);
  ok("…the Zonemate gateway comes off, and no Zonemate part is left on the template's own lines", !zp!.items.some((i) => i.parentItemId == null && (Object.values(ZONEMATE) as number[]).includes(i.skuId)));
  const itcs = zp!.items.filter((i) => i.skuId === ITC_SKU);
  ok("…the ZoneMate sensor on the installation becomes a Mitsubishi ITC at $0, not chargeable, where it was", itcs.length === 1 && itcs[0].unitPrice === 0 && itcs[0].chargeable === false && itcs[0].id == null && itcs[0].itemGroupParentId === 112);
  ok("…the sensor that's the zone add-on's own part is left for the add-on", zp!.items.some((i) => i.skuId === ZONEMATE.sensor && i.parentItemId === 115));
  const at90 = { ...zm, items: zp!.items.map((i, k) => (i.id == null ? { ...i, id: 950 + k, ...(i.skuId === ITC_SKU ? { unitPrice: 90, chargeable: null } : {}) } : i)) };
  ok("…an ITC ServiceTitan priced from the pricebook ($90) goes back to $0, not chargeable", planMitsubishiZoning(at90, zt)?.items.find((i) => i.skuId === ITC_SKU)?.chargeable === false);
  ok("…and a template already swapped is left alone", planMitsubishiZoning({ ...zm, items: zp!.items.map((i, k) => (i.id == null ? { ...i, id: 950 + k } : i)) }, zt) === null);
  ok("…with the add-on's own sensor (negative id) left as it is", planMitsubishiZoning({ ...zm, items: [...zp!.items.map((i, k) => (i.id == null ? { ...i, id: 950 + k } : i)).filter((i) => i.parentItemId == null), { ...zm.items[6], id: -2 }] }, zt) === null);
  ok("…only the four ducted templates", planMitsubishiZoning({ ...zm, id: 1 }, zt) === null);

  // Jake, 28 Nov: "go with b and add the 450 damper".
  const d450 = ZONE_DAMPER.get(450)!.sku, d150 = ZONE_DAMPER.get(150)!.sku, cable = 301216984;
  const s450 = planZoneAddOn(450, [{ skuId: cable, quantity: 1 }, { skuId: ZONEMATE.sensor, quantity: 1 }], []);
  ok("zone add-on service, 450: the ZoneMate sensor off, its ZoneBoss 450 damper on, the cable kept", JSON.stringify(s450?.materials) === JSON.stringify([{ skuId: cable, quantity: 1 }, { skuId: d450, quantity: 1 }]) && s450?.equipment === null, s450?.did);
  const s200 = planZoneAddOn(200, [{ skuId: cable, quantity: 1 }, { skuId: ZONE_DAMPER.get(200)!.sku, quantity: 1 }], [{ skuId: ITC_SKU, quantity: 1 }]);
  ok("…an ITC linked as equipment comes off too, the damper it has stays", s200?.materials === null && JSON.stringify(s200?.equipment) === "[]");
  ok("…an add-on with its damper and no temperature control is left alone", planZoneAddOn(150, [{ skuId: cable, quantity: 1 }, { skuId: d150, quantity: 1 }], []) === null);
  ok("…and a damper of another size isn't doubled", planZoneAddOn(450, [{ skuId: ZONE_DAMPER.get(400)!.sku, quantity: 1 }], []) === null);
  const zb = { id: DUCTED[1], name: "Kaden Ducted Split 17kW", items: [
    L(120, SKU.ductedInstall, "Service", "Ducted Refrigerated System - Installation", 3250, { itemGroupName: "Ducted Refrigerated System - Installation" }),
    L(121, ITC_SKU, "Equipment", "Mitsubishi Electric Individual Temperature Control", 0, { itemGroupParentId: 120 }),
    L(122, 301216534, "Service", "Zone 150mm Add-on", 0, { isAddOn: true, itemGroupParentId: 120 }),
    L(123, cable, "Material", "ZoneBoss Blue 24V Cable", 20, { itemGroupParentId: 120, parentItemId: 122 }),
    L(124, d150, "Material", "ZoneBoss Damper 24V 150mm", 76, { itemGroupParentId: 120, parentItemId: 122 }),
    L(125, 301216670, "Service", "Zone 450mm Add-on", 0, { isAddOn: true, itemGroupParentId: 120 }),
    L(126, cable, "Material", "ZoneBoss Blue 24V Cable", 20, { itemGroupParentId: 120, parentItemId: 125 }),
    L(127, ZONEMATE.sensor, "Material", "ZoneMate Wireless Temperature Sensor", 150, { itemGroupParentId: 120, parentItemId: 125 }),
    L(128, LAB_3P, "Service", "Labour – Tech & 2 Apprentices", 360, { quantity: 16, itemGroupParentId: 120 }),
  ] };
  const zbp = planZoningB(zb, new Map([[d450, 160]]));
  const dmp = zbp?.items.find((i) => i.skuId === d450);
  ok("ducted templates, option (b): the ITC comes off the installation", !zbp?.items.some((i) => i.skuId === ITC_SKU), zbp?.did);
  ok("…the 450 add-on's sensor comes off and its damper goes on under it, at $160, after its cable", !zbp!.items.some((i) => i.skuId === ZONEMATE.sensor) && dmp?.id == null && dmp?.parentItemId === 125 && dmp?.itemGroupParentId === 120 && dmp?.unitPrice === 160 && !dmp?.isAddOn
    && zbp!.items.indexOf(dmp!) === zbp!.items.findIndex((i) => i.id === 126) + 1);
  ok("…the 150 add-on, the labour and the rest as they were", zbp!.items.filter((i) => i.parentItemId === 122).length === 2 && zbp!.items.some((i) => i.skuId === LAB_3P && i.quantity === 16));
  ok("…done once: a template already on (b) is left alone", planZoningB({ ...zb, items: zbp!.items.map((i, k) => (i.id == null ? { ...i, id: 970 + k } : i)) }, new Map()) === null);
  ok("…a damper the add-on service hands back (negative id) counts, and its own sensor is left for the service", planZoningB({ ...zb, items: [...zb.items.filter((i) => i.id !== 121 && i.id !== 127), L(-3, d450, "Material", "ZoneBoss Damper 24V 450mm", 160, { itemGroupParentId: 120, parentItemId: 125 }), L(-4, ZONEMATE.sensor, "Material", "ZoneMate Wireless Temperature Sensor", 150, { itemGroupParentId: 120, parentItemId: 125 })] }, new Map()) === null);
  ok("…only the four ducted templates", planZoningB({ ...zb, id: 1 }, new Map()) === null);

  // Jake, 28 Nov, on the audit.
  const kad = { id: T28.kadenHeaters[0], name: "Kaden KN315 Ducted Gas Heater - Replacement", items: [
    L(130, 301122867, "Equipment", "Kaden Ducted Heater 3 Star KN315", 1800, { itemGroupName: "Kaden Ducted Heater 3 Star KN315" }),
    L(131, SKU.gasInternal, "Service", "Gas Ducted Heater - Internal", 1300, { itemGroupName: "Gas Ducted Heater - Internal" }),
    L(132, SUNDRY.general, "Material", "Ducted Heater - Sundry Materials", 0, { itemGroupParentId: 131 }),
    L(133, SKU.bpc, "Service", "BPC Compliance Certificate", 65, { itemGroupName: "BPC Compliance Certificate" }),
  ] };
  const k28 = planFixes28(kad);
  ok("Kaden heater: the sundry line off, the Wombat's flue and duct on, under the installation at $0, not chargeable", !k28?.items.some((i) => i.skuId === SUNDRY.general)
    && FLUE_100.every((f) => k28?.items.some((i) => i.skuId === f.skuId && i.itemGroupParentId === 131 && i.unitPrice === 0 && i.chargeable === false && i.id == null)), k28?.did);
  ok("…no bend: it goes straight up", k28!.items.length === 3 + FLUE_100.length && !k28!.items.some((i) => /bend/i.test(i.skuName ?? "")));
  ok("…and done once", planFixes28({ ...kad, items: k28!.items.map((i, k) => (i.id == null ? { ...i, id: 980 + k } : i)) }) === null);
  const duc = { id: DUCTED[0], name: "Mitsubishi Electric Ducted Split 18kW", items: [
    L(140, SKU.ductedInstall, "Service", "Ducted Refrigerated System - Installation", 3170, { itemGroupName: "Ducted Refrigerated System - Installation" }),
    L(141, BDO[0], "Material", "BDO 10-14 Point", 0, { itemGroupParentId: 140, chargeable: true }),
    L(142, 301167074, "Material", "Bradflo Insulated Duct R1.5 150mm", 0, { itemGroupParentId: 140, chargeable: true }),
  ] };
  const d28 = planFixes28(duc);
  ok("ducted: the BDO comes off, the ductwork stays", d28?.items.length === 2 && !d28.items.some((i) => (BDO as readonly number[]).includes(i.skuId)), d28?.did);
  const ck = { id: T28.cooktops[0], name: "Gas Westinghouse Cooktop – Installation", items: [
    L(150, 301638479, "Service", "Gas Cooktop – Installation", 730, { itemGroupName: "Gas Cooktop – Installation" }),
    L(151, 301219319, "Material", "Appliance Regulator", 0, { itemGroupParentId: 150 }),
  ] };
  const c28 = planFixes28(ck);
  const bpc = c28?.items.find((i) => i.skuId === SKU.bpc);
  ok("cooktop: the BPC certificate on, $65, its own group, as the other templates carry it", bpc?.unitPrice === 65 && bpc.itemGroupName === "BPC Compliance Certificate" && bpc.itemGroupParentId == null && bpc.id == null, c28?.did);
  ok("…once, and a template that isn't a cooktop, a Kaden heater or carrying a BDO or sundry line is left alone",
    planFixes28({ ...ck, items: c28!.items.map((i, k) => (i.id == null ? { ...i, id: 990 + k } : i)) }) === null && planFixes28({ ...ck, id: 7 }) === null);

  // Jake, 28 Nov: "it should be the repair main item and then we add the product".
  const pump = { id: REPAIR_TEMPLATES[9], name: "Evaporative Cooler - Water Pump Replacement", items: [
    L(160, 301618481, "Service", "Evaporative Cooler – Repair", 530, { itemGroupName: "Evaporative Cooler – Repair" }),
    L(161, 301216709, "Material", "Brivis Evap Cooler Water Pump", 0, { itemGroupParentId: 160, chargeable: false }),
  ] };
  const rp = planRepairParts(pump, new Map([[301216709, 155]]));
  const part = rp?.items.find((i) => i.skuId === 301216709);
  ok("repair: the part comes out from under the repair line onto its own line, new, at its pricebook price, chargeable", !!part && part.id == null && part.itemGroupParentId == null && part.unitPrice === 155 && part.chargeable === true && !!part.itemGroupName, rp?.did);
  ok("…after the repair line, which stays", rp!.items[0].id === 160 && rp!.items[1] === part);
  ok("…and done once", planRepairParts({ ...pump, items: rp!.items.map((i, k) => (i.id == null ? { ...i, id: 1000 + k } : i)) }, new Map()) === null);
  const dv = { id: REPAIR_TEMPLATES[2], name: "Evaporative Cooler - Dump Valve Replacement & Service", items: [
    L(170, 301220633, "Service", "Evaporative Cooler – Maintenance (Single Storey)", 300, { itemGroupName: "Evaporative Cooler – Maintenance (Single Storey)" }),
    L(171, 301204625, "Material", "Seeley Dump Valve CPQ/BMQ", 250, { itemGroupParentId: 170, chargeable: false }),
  ] };
  ok("…the dump valve that went in free is charged now", planRepairParts(dv, new Map([[301204625, 250]]))?.items.find((i) => i.skuId === 301204625)?.chargeable === true);
  const leak = { id: REPAIR_TEMPLATES[13], name: "Split System - Leak Detection & Regas", items: [
    L(180, 301620463, "Service", "Split System – Repair", 750, { itemGroupName: "Split System – Repair" }),
    L(181, 301358552, "Material", "Refrigerant R410A (HFC) 1KG", 0, { quantity: 2.5, itemGroupParentId: 180 }),
  ] };
  ok("…the quantity kept (2.5 kg of gas)", planRepairParts(leak, new Map([[301358552, 133]]))?.items.find((i) => i.skuId === 301358552)?.quantity === 2.5);
  ok("…only the repair templates, by id or by the name of one the code made", planRepairParts({ ...pump, id: 5, name: "Something Else" }, new Map()) === null && planRepairParts({ ...pump, id: 5 }, new Map()) !== null);

  // Jake, 28 Nov: "build the dominator 18kw templates".
  const dom12 = [
    L(200, DOM18.sourceUnit, "Equipment", "Braemar Dominator Series 3 12KW - External", 5400, { itemGroupName: "Braemar Dominator Series 2 - External" }),
    L(201, 301165543, "Service", "Dominator - Labour (One Day)", 3300, { itemGroupParentId: 202 }),
    L(202, 301165167, "Service", "Dominator - Installation", 1060, { itemGroupName: "Dominator - Installation" }),
    L(203, 301167479, "Material", "Bradflo Insulated Duct R1.5 300mm", 0, { quantity: 2, itemGroupParentId: 202 }),
    L(204, 303260023, "Service", "Total Government Rebates Applied", 0, { itemGroupName: "Total Government Rebates Applied" }),
    L(205, 301034820, "Material", "VEEC", -70, { quantity: 63, itemGroupParentId: 204, chargeable: true }),
  ];
  const cl = cloneLines(dom12, { from: DOM18.sourceUnit, to: DOM18.unit, name: "Braemar Dominator Series 3 18KW - External", price: 6800 });
  ok("Dominator 18kW: the 12kW external's lines, flat and new, with the 18kW unit at its price", cl.flat.length === 6 && cl.flat.every((i) => i.id == null && i.itemGroupParentId == null)
    && cl.flat[0].skuId === DOM18.unit && cl.flat[0].unitPrice === 6800 && cl.flat[5].quantity === 63 && cl.flat[5].chargeable === true);
  const backLines = cl.flat.map((i, k) => ({ ...i, id: 500 + (5 - k) }));
  const rg = regroup(backLines, cl.flat, cl.groups);
  ok("…then put back in the 12kW's groups by the new lines' ids, the unit's group named for the 18kW",
    !!rg && rg[0].itemGroupName === "Braemar Dominator Series 3 18KW - External" && rg[1].itemGroupParentId === backLines[2].id && rg[3].itemGroupParentId === backLines[2].id && rg[5].itemGroupParentId === backLines[4].id && rg[2].itemGroupParentId == null);
  ok("…and not if the new template's lines don't match", regroup(backLines.slice(1), cl.flat, cl.groups) === null);

  // Jake, 28 Nov: "go with b": Repair, Replace, Upgrade.
  const rru = repairProposals();
  ok("Repair, Replace, Upgrade: a proposal for each evap fault in each size, and each split fault in each size", rru.length === EVAP_FAULTS.length * EVAP_REPAIR_SIZES.length + SPLIT_FAULTS.length * SPLIT_REPAIR_SIZES.length, rru.length);
  ok("…every key and name once, three options in order", new Set(rru.map((r) => r.key)).size === rru.length && new Set(rru.map((r) => r.name)).size === rru.length && rru.every((r) => r.options.map((o) => o.order).join() === "1,2,3"));
  const ev76 = rru.find((r) => r.key === "EVAP-REP-PUMP-76")!;
  ok("…evap: the repair, then the Advance, then the Contour, the same size in Charcoal; the 76 replaced by the F86DS", JSON.stringify(ev76.options.map((o) => o.ref)) === JSON.stringify([{ code: "EVAP-REP-PUMP" }, { code: "EVAP-BRIVIS-ADVANCE-F86DS-CHAR" }, { code: "EVAP-BRIVIS-CONTOUR-L76-CHAR" }]));
  ok("…every evap template it names is one the code makes", rru.filter((r) => r.key.startsWith("EVAP")).every((r) => r.options.every((o) => "code" in o.ref && all.some((t) => t.code === (o.ref as { code: string }).code))));
  const sp = rru.find((r) => r.key === "AC-SPLIT-LEAK-REGAS-R32-3.5")!;
  ok("…split: the repair, then the Kaden, then the Mitsubishi Electric, back to back, by name", JSON.stringify(sp.options.map((o) => o.ref)) === JSON.stringify([{ code: "AC-SPLIT-LEAK-REGAS-R32-3.5" }, { name: "Kaden 3.5kW Split System - Back to Back" }, { name: "Mitsubishi Electric 3.5kW Split System - Back to Back" }]));
  ok("…the R410A leak proposals take over the four made on the one-size template; the R32 ones are new", rru.filter((r) => r.was).map((r) => `${r.key}<${r.was}`).join() === SPLIT_REPAIR_SIZES.map((z) => `AC-SPLIT-LEAK-REGAS-R410A-${z}<AC-SPLIT-LEAK-REGAS-${z}`).join());
  ok("…and every split repair it names is one the code makes", rru.filter((r) => r.key.startsWith("AC-SPLIT")).every((r) => all.some((t) => t.code === (r.options[0].ref as { code: string }).code)));
  // Jake, 28 Nov: "the split leak & regas should be off r32 and r410A … small split have 1-1.5kg and larger can go from 2-4kg".
  const lr = (gas: string, size: string) => LEAK_REGAS.find((t) => t.code === leakRegasCode(gas, size))!;
  ok("leak and regas: one for each gas and split size, and the ducted, the gas by the kilo on its own line", LEAK_REGAS.length === 10 && LEAK_REGAS.every((t) => t.lines.length === 2 && t.lines[1].unitPrice === 0 && OTHER_TEMPLATES.includes(t)));
  ok("…1kg for a 2.5kW, 1.5kg a 3.5kW, 2kg a 5kW, 3kg a 7.1kW, 4kg a ducted", ["2.5", "3.5", "5", "7.1", "DUCTED"].map((z) => lr("R32", z).lines[1].quantity).join() === "1,1.5,2,3,4");
  ok("…R32 on the R32 ones, R410A on the R410A", lr("R32", "3.5").lines[1].skuId === 301358054 && lr("R410A", "3.5").lines[1].skuId === 301358552 && /R32 \(3\.5kW\)$/.test(lr("R32", "3.5").name));
  ok("…laid out as the other repairs once made: the gas comes out from under the repair line", planRepairParts({ id: 77, name: lr("R410A", "7.1").name, items: [
    L(210, 301620463, "Service", "Split System – Repair", 330, { itemGroupName: "Split System – Repair" }),
    L(211, 301358552, "Material", "Refrigerant R410A (HFC) 1KG", 0, { quantity: 3, itemGroupParentId: 210 })] }, new Map([[301358552, 133]]))?.items.find((i) => i.skuId === 301358552)?.itemGroupParentId == null);
  ok("services that had no template: ducted reverse cycle, gas log fire, space heater, wall air conditioner", SERVICES_28.map((t) => t.lines[0].unitPrice).join() === "300,240,220,250");
  ok("…on ServiceTitan's Repair, Replace, Upgrade type", REPAIR_REPLACE_UPGRADE.typeId === 1805 && REPAIR_REPLACE_UPGRADE.optionIds[1] === 1806 && REPAIR_REPLACE_UPGRADE.optionIds[3] === 1808);

  // Jake, 28 Nov: the Multisnap take-offs and the 4, 5 and 6 star heaters from Reece.
  const hitRaw = { code: "3200028", description: "Multisnap Branch Take Off Foam Insulated 300mm x 250mm x 200mm", cost: null, list_price: null, raw: {
    unitOfMeasures: JSON.stringify([{ pack: "EA", unitPriceExcludingGST: 39.32, unitPriceIncludingGST: 43.25, unitMarketPriceExcludingGST: 88.07, unitMarketPriceIncludingGST: 96.88 }]),
    productImages: JSON.stringify([{ width: 280, url: "https://x/280.jpg" }, { width: 380, url: "https://x/380.jpg" }]) } };
  const hh = readHit(hitRaw);
  ok("Reece: a search hit read for its cost ex GST, its CMP and its biggest photo", hh.cost === 39.32 && hh.cmpEx === 88.07 && hh.cmpInc === 96.88 && hh.image === "https://x/380.jpg");
  ok("…the customer pays the CMP with GST: the pricebook's price is the CMP ex GST", customerPrice(hh) === 88.07 && customerPrice({ ...hh, cmpEx: null }) === 88.07);
  ok("…take-offs named as the pricebook names them, either way Reece writes the sizes", takeoffName("Multisnap Branch Take Off Foam Insulated 300mm x 250mm x 200mm") === "Multisnap BTO F/Insul 300.250.200"
    && takeoffName("Multisnap Branch Take Off Foam Insulated 350.250.150") === "Multisnap BTO F/Insul 350.250.150"
    && takeoffName("Multisnap Double Branch Take Off Foam Insulated 300mm x 250mm x 250mm x 250mm") === "Multisnap DBTO F/Insul 300.250.250.250"
    && takeoffName("Multisnap Foam Insulated Reducer 200mm x 150mm") === null && takeoffName("Multisnap Branch Take Off Insulated 350mm x 300mm x 300mm") === null);
  const dupA = { ...hh, code: "35674", title: "Multisnap Branch Take Off Foam Insulated 300.200.200", cost: 89.09 };
  const dupB = { ...hh, code: "3200027", title: "Multisnap Branch Take Off Foam Insulated 300mm x 200mm x 200mm", cost: 32.06 };
  ok("…one per size: the one the pricebook already carries, else the cheaper", pickTakeoffs([dupA, dupB], new Set()).map((x) => x.hit.code).join() === "3200027"
    && pickTakeoffs([dupA, dupB], new Set(["35674"])).map((x) => x.hit.code).join() === "35674" && pickTakeoffs([{ ...dupB, cost: null }], new Set()).length === 0);
  ok("heaters: 4, 5 and 6 star at about 20 and 30kW from Brivis StarPro, internal and external, and Braemar's 28kW 4 and 5 star",
    [4, 5, 6].every((st) => HEATERS.some((h) => h.stars === st && h.kw <= 23 && h.place === "Internal") && HEATERS.some((h) => h.stars === st && h.kw === 30 && h.place === "External"))
    && HEATERS.filter((h) => h.kw === 28).map((h) => h.stars).join() === "4,5" && new Set(HEATERS.map((h) => h.code)).size === HEATERS.length);
  ok("…priced on the markup rules: Brivis 30% on the SP421IN's $1,949.94, up to the next $100", heaterPrice(1949.94, 30, 100) === 2600 && heaterPrice(1777.72, 25, 100) === 2300);
  ok("…a template for each internal StarPro, from the StarPro 6 Star 15kW, and the Braemars from the Ecostar", HEATER_TEMPLATES.length === 8
    && HEATER_TEMPLATES.every((t) => (t.heater.brand === "Brivis" ? t.from.template === 301479540 : t.from.template === 301399805) && t.heater.place !== "External")
    && HEATER_TEMPLATES.some((t) => t.name === "Brivis StarPro 4 Star 21kW Ducted Gas Heater") && HEATER_TEMPLATES.some((t) => t.name === "Braemar TQR428 4 Star 28kW Ducted Gas Heater"));

  // Jake, 24 Nov.
  const m5 = planFixes24({ id: T24.mitsu5Btb, name: "Mitsubishi Electric 5kW Split System - Back to Back", items: [
    L(80, 209600004, "Service", "Split System Install - Back To Back", 1280, { itemGroupName: "Installation" }),
    L(81, SKU.coil38, "Material", "Coil 1/4 x 3/8", 0, { quantity: 0.5, itemGroupParentId: 80 })] });
  const c12 = m5?.items.find((i) => i.skuId === SKU.coil12);
  ok("Mitsubishi 5kW back-to-back: 1/4 x 1/2 coil, half a coil, in the group", !!c12 && c12.quantity === 0.5 && c12.itemGroupParentId === 80 && !m5!.items.some((i) => i.skuId === SKU.coil38));
  const rtw = { id: 9, name: "Mitsubishi Electric 7.1kW Split System - Roof To Wall Bracket", items: [
    L(90, 209624835, "Service", "Split System Installation - Wall Bracket", 1850, { itemGroupName: "Installation" }),
    L(91, SKU24.roof520, "Material", "Rodigas Roof Bracket 520mm", 0, { itemGroupParentId: 90 }),
    L(92, SKU.hat, "Material", "Colorbond Hat Section", 0, { itemGroupParentId: 90 })] };
  const r7 = planFixes24(rtw);
  ok("roof-to-wall 7.1kW: the roof bracket becomes the 550mm wall bracket, and two hat sections", r7?.items.some((i) => i.skuId === SKU24.wall550 && i.itemGroupParentId === 90) === true
    && !r7!.items.some((i) => i.skuId === SKU24.roof520) && r7!.items.find((i) => i.skuId === SKU.hat)?.quantity === 2, r7?.did);
  ok("…and a fixed one is left alone", planFixes24({ ...rtw, items: r7!.items }) === null);
  const r25 = planFixes24({ ...rtw, name: "Mitsubishi Electric 2.5kW Split System - Roof To Wall Bracket" });
  ok("a 2.5kW roof-to-wall takes the 420mm wall bracket", r25?.items.some((i) => i.skuId === SKU24.wall420) === true);
  ok("back-to-back and roof-mounted templates aren't roof-to-wall", planFixes24({ ...rtw, name: "Kaden 5kW Split System - Roof Mounted" }) === null);
  ok("the two Brivis Charcoal coolers named as the price list has them", RENAME_24.every((r) => /^Brivis Advance F[48]6DS Evap Cooler \(Charcoal\)$/.test(r.to)));
}

console.log("\nTemplates, at the prices quoted by hand:");
for (const t of OTHER_TEMPLATES) console.log(`  ${t.code.padEnd(26)} $${lineTotal(t.lines).toFixed(0).padStart(5)}  ${t.name}`);
console.log(`  + ${evap.length} Brivis evaporative replacements`);

if (bad) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log("\nall passed");
