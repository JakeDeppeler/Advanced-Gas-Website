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
import { HEATER_EVAP_DISCOUNTS, SERVICE_PRICES, pricedAt, sameName } from "../src/lib/pricebook/servicePricing";
import { GENERIC_REBATE_HEADER, REBATE_HEADERS, rebateGroup, swapHeader } from "../src/lib/pricebook/rebateSpecs";
import { evapProposals } from "../src/lib/pricebook/evapProposalSpecs";
import { flatText, textHash, wordingAction } from "../src/lib/pricebook/summaryRule";
import { summaryHtml } from "../src/lib/pricebook/wording";
import type { TemplateItem } from "../src/lib/pricebook/labour";
import { DUCTED, DUCTED_LABOUR_PRICE, ITC_SKU, RENAME_24, SKU, SKU24, T, T24, planDucted25, planDuctedFixed, planFixes, planFixes24 } from "../src/lib/pricebook/templateFixPlan";

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
ok("Dominator labour $3,300, and the ducted $5,000 on the two-day labour with the installation at $0", p22(301165543) === 3300 && p22(301164889) === 5000 && p22(209599911) === 0);
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
  ok("the pricebook follows: installation $0, two-day labour $5,000", SERVICE_PRICES.find((x) => x.skuId === SKU.ductedInstall)?.price === 0 && SERVICE_PRICES.find((x) => x.skuId === SKU.ductedLabour)?.price === DUCTED_LABOUR_PRICE);
  ok("a service price changed since it was set is set again", pricedAt("$5000 → $5000", 5000) && !pricedAt("$5000 → $5000", 0) && pricedAt("$5230 → $0", 0) && !pricedAt(undefined, 0));

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
