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
ok("an evap replacement is unit, install, compliance", evap.every((t) => t.lines.map((l) => l.skuType).join() === "Equipment,Service,Service"));
ok("names say size and colour", evap[0].name === "Brivis Contour L36 Evaporative Cooler (Beige) - Replacement", evap[0].name);
ok("the summary names the unit and colour", /new Brivis Contour L36 in Beige/.test(evap[0].summary));

// Prices on the lines.
const live = new Map<number, LiveSku>([
  [1000, { price: 2450, cost: 1957.85, description: "unit", name: "u" }],
  [209601267, { price: 820, cost: null, description: "<p>install</p>", name: "EVAP-INSTALL" }],
  [209621211, { price: 65, cost: 50, description: null, name: "BPC Compliance Certificate" }],
]);
const priced = pricedItems(evap[0].lines, live);
ok("the unit takes today's price, labour the quoted one", priced.items.map((i) => i.unitPrice).join() === "2450,800,65", priced.items.map((i) => i.unitPrice));
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
  it(4, "Material", "Tomson Turbo 15mm Valve Kit", 0),
  it(5, "Material", "Concrete Slab 600", 0),
];
const g = groupedItems(flat)!;
ok("equipment first, as its own group", g[0].id === 1 && g[0].itemGroupName === "Thermann Smart Electric Storage 125L 3kw" && g[0].itemGroupParentId === null);
ok("then the labour header, named for its service", g[1].id === 2 && g[1].itemGroupName === "Electric HWS - Changeover" && g[1].itemGroupParentId === null);
ok("materials under the header", g.filter((i) => i.skuType === "Material").every((i) => i.itemGroupParentId === 2), g.map((i) => [i.id, i.itemGroupParentId]));
ok("BPC last, on its own", g[g.length - 1].id === 3 && g[g.length - 1].itemGroupParentId === null);
ok("no price moves", g.reduce((a, i) => a + i.unitPrice, 0) === flat.reduce((a, i) => a + i.unitPrice, 0));
ok("the read-back test passes on it", isGrouped(g) && !isGrouped(flat));
ok("a grouped template is left alone", groupedItems(g) === null);
const cooker = groupedItems([it(10, "Service", "Gas Cooktop – Installation", 550), it(11, "Service", "Cooker - Electrical Connection ", 350), it(12, "Service", "BPC Compliance Certificate", 65)])!;
ok("the electrician's line rides under the header", cooker[1].id === 11 && cooker[1].itemGroupParentId === 10);
const motor = groupedItems([it(20, "Service", "Evaporative Cooler – Repair", 350), it(21, "Material", "FAN MOTOR - EVAP", 550), it(22, "Material", "Capacitor", 91)])!;
ok("a repair: parts under the labour, one price", motor[0].id === 20 && motor.slice(1).every((i) => i.itemGroupParentId === 20));
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

console.log("\nTemplates, at the prices quoted by hand:");
for (const t of OTHER_TEMPLATES) console.log(`  ${t.code.padEnd(26)} $${lineTotal(t.lines).toFixed(0).padStart(5)}  ${t.name}`);
console.log(`  + ${evap.length} Brivis evaporative replacements`);

if (bad) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log("\nall passed");
