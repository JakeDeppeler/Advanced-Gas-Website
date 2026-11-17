/**
 * The 15 Nov quote templates (quoteTemplateSpecs.ts): every Brivis size in
 * every colour from the Climate price list, priced the way the pricebook
 * already prices Brivis, and none of the ones Jake ruled out.
 *
 *   npm run check:quote-templates
 */
import {
  EVAP_UNITS, OTHER_TEMPLATES, evapSellPrice, evapTemplate, evapUnitPrice, findUnit, lineTotal, pricedItems, type LiveSku,
} from "../src/lib/pricebook/quoteTemplateSpecs";
import { groupedItems, isGrouped, isTestTemplate, tidyCode, tidyName } from "../src/lib/pricebook/templateShape";
import { HEATER_EVAP_DISCOUNTS, SERVICE_PRICES, sameName } from "../src/lib/pricebook/servicePricing";
import { GENERIC_REBATE_HEADER, REBATE_HEADERS, rebateGroup, swapHeader } from "../src/lib/pricebook/rebateSpecs";
import { evapProposals } from "../src/lib/pricebook/evapProposalSpecs";
import { flatText, textHash, wordingAction } from "../src/lib/pricebook/summaryRule";
import { summaryHtml } from "../src/lib/pricebook/wording";
import type { TemplateItem } from "../src/lib/pricebook/labour";

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
ok("service prices as Jake gave them, and the evap install at $900", SERVICE_PRICES.map((s) => s.price).join(",") === "250,350,300,400,250,900");
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
const FOUR = ["What we're doing:", "What we're removing:", "What's included:", "What's not included:"];
ok("an evap summary is the four parts, in order", paras(pro).length === 4 && paras(pro).every((p, k) => p.startsWith(FOUR[k])), paras(pro).map((p) => p.slice(0, 24)));
ok("it names the unit and colour, and doesn't sell it", /new Brivis Promina P46 evaporative cooler in Charcoal/.test(pro.summary) && !/AquaSave|winter seal|best value|Choose the/.test(pro.summary));
ok("the Balaero reads the same way", paras(bal).length === 4 && /Brivis Balaero 50 evaporative cooler in Charcoal/.test(bal.summary));
const installs = OTHER_TEMPLATES.filter((t) => /Replacement|Gas Storage$/.test(t.name) && !/Valve|Motor|Capacitor|Controller|Pump Replacement/.test(t.name));
ok("every install the code makes has the four parts", installs.length >= 9 && installs.every((t) => FOUR.every((l) => t.summary.includes(l))), installs.filter((t) => !FOUR.every((l) => t.summary.includes(l))).map((t) => t.name));
ok("the Add Unit template doesn't name itself as the unit", /with a new evaporative cooler,/.test(OTHER_TEMPLATES.find((t) => t.code === "EVAP-REPLACE-ADD-UNIT")!.summary));

// When wording may be written over (summaryRule.ts).
const html = (t: string) => summaryHtml(t);
const want = pro.summary, h = (t: string) => textHash(flatText(t));
ok("already right: nothing to do", wordingAction(html(want), want, undefined, true) === "same");
ok("ServiceTitan's escaped apostrophes still read as the same", wordingAction(html(want).replace(/'/g, "&#39;"), want, undefined, false) === "same");
ok("the labels go in bold and still read as the same", html(want).includes("<strong>What we're doing:</strong>") && wordingAction(html(want), want, undefined, false) === "same");
ok("first pass: whatever is there is written over", wordingAction(html("The office's old words."), want, undefined, true) === "write");
ok("after it: words nobody recorded are left alone", wordingAction(html("Typed by the office."), want, undefined, false) === "leave");
ok("words this code wrote are written over", wordingAction(html("Older words.\n\nOurs."), want, h("Older words.\n\nOurs."), false) === "write");
ok("words edited since it wrote them are left alone", wordingAction(html("Ours, then edited."), want, h("Ours."), false) === "leave");
ok("an empty description is always filled", wordingAction("", want, h("Ours."), false) === "write" && wordingAction(null, want, undefined, false) === "write");

console.log("\nTemplates, at the prices quoted by hand:");
for (const t of OTHER_TEMPLATES) console.log(`  ${t.code.padEnd(26)} $${lineTotal(t.lines).toFixed(0).padStart(5)}  ${t.name}`);
console.log(`  + ${evap.length} Brivis evaporative replacements`);

if (bad) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log("\nall passed");
