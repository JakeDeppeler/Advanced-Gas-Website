/**
 * The quote templates the 15 Nov review asked for (Jake: "go ahead and make
 * the new templates, and the different colours ... all evap sizes and
 * brands"), as data: the Brivis evaporative range from Rinnai's Climate price
 * list (1 Apr 2026), every size in Beige, Charcoal and Terra Red, and the
 * repair, service and replacement work the office had been building by hand.
 * Each template has the lines the office actually quoted: the same pricebook
 * items, quantities and prices, with a line the office put in at $0 (pipe,
 * valves, the base box) still at $0. Equipment is the exception: it takes
 * today's pricebook price, because most of those quotes were written before
 * the 8 Nov equipment prices (the KC32 quoted at $2,200 now sells at $2,420).
 * Labour keeps the quoted price: the repair lines are generic services
 * (EVAP-REPAIR, GEN-WORK) whose pricebook price is a placeholder the office
 * prices over on every job, so the quote is the only real figure for them.
 * quoteTemplatesAdd.ts makes them in ServiceTitan. Pure, so
 * scripts/check-quote-templates.ts can check it.
 */

import { HEATER_EVAP_DISCOUNTS, MULTI_SPLIT, priceOf } from "./servicePricing";

export type Colour = "Beige" | "Charcoal" | "Terra Red";
export type EvapUnit = { series: "Contour" | "Promina" | "Advance" | "Balaero"; model: string; colour: Colour; part: string; cost: number };

/** Series, model, colour, Rinnai order code, net invoice price ex GST (Climate price list, effective 1 Apr 2026). */
const RANGE: [EvapUnit["series"], string, Colour, string, number][] = [
  ["Contour", "L36", "Beige", "L36BEIGE", 1957.85],
  ["Contour", "L36", "Charcoal", "L36CHAR", 1957.85],
  ["Contour", "L36", "Terra Red", "L36TERRA", 1957.85],
  ["Contour", "L46", "Beige", "L46BEIGE", 2044.95],
  ["Contour", "L46", "Charcoal", "L46CHAR", 2044.95],
  ["Contour", "L46", "Terra Red", "L46TERRA", 2044.95],
  ["Contour", "L56", "Beige", "L56BEIGE", 2162.9],
  ["Contour", "L56", "Charcoal", "L56CHAR", 2162.9],
  ["Contour", "L56", "Terra Red", "L56TERRA", 2162.9],
  ["Contour", "L66", "Beige", "L66BEIGE", 2270.56],
  ["Contour", "L66", "Charcoal", "L66CHAR", 2270.56],
  ["Contour", "L66", "Terra Red", "L66TERRA", 2270.56],
  ["Contour", "L76", "Beige", "L76BEIGE", 2423.49],
  ["Contour", "L76", "Charcoal", "L76CHAR", 2423.49],
  ["Contour", "L76", "Terra Red", "L76TERRA", 2423.49],
  ["Contour", "L37", "Beige", "L37BEIGE", 2135.46],
  ["Contour", "L37", "Charcoal", "L37CHAR", 2135.46],
  ["Contour", "L37", "Terra Red", "L37TERRA", 2135.46],
  ["Contour", "L47", "Beige", "L47BEIGE", 2220.4],
  ["Contour", "L47", "Charcoal", "L47CHAR", 2220.4],
  ["Contour", "L47", "Terra Red", "L47TERRA", 2220.4],
  ["Contour", "L57", "Beige", "L57BEIGE", 2342.14],
  ["Contour", "L57", "Charcoal", "L57CHAR", 2342.14],
  ["Contour", "L57", "Terra Red", "L57TERRA", 2342.14],
  ["Contour", "L77", "Beige", "L77BEIGE", 2600.93],
  ["Contour", "L77", "Charcoal", "L77CHAR", 2600.93],
  ["Contour", "L77", "Terra Red", "L77TERRA", 2600.93],
  ["Promina", "P36", "Beige", "P36BEIGE", 1729.48],
  ["Promina", "P36", "Charcoal", "P36CHAR", 1729.48],
  ["Promina", "P36", "Terra Red", "P36TERRA", 1729.48],
  ["Promina", "P46", "Beige", "P46BEIGE", 1878.78],
  ["Promina", "P46", "Charcoal", "P46CHAR", 1878.78],
  ["Promina", "P46", "Terra Red", "P46TERRA", 1878.78],
  ["Promina", "P56", "Beige", "P56BEIGE", 2006.08],
  ["Promina", "P56", "Charcoal", "P56CHAR", 2006.08],
  ["Promina", "P56", "Terra Red", "P56TERRA", 2006.08],
  ["Promina", "P66", "Beige", "P66BEIGE", 2121.58],
  ["Promina", "P66", "Charcoal", "P66CHAR", 2121.58],
  ["Promina", "P66", "Terra Red", "P66TERRA", 2121.58],
  ["Promina", "P76", "Beige", "P76BEIGE", 2255.95],
  ["Promina", "P76", "Charcoal", "P76CHAR", 2255.95],
  ["Promina", "P76", "Terra Red", "P76TERRA", 2255.95],
  ["Advance", "F36DS", "Beige", "F36DSBEIGE", 1518.7],
  ["Advance", "F36DS", "Charcoal", "F36DSCHAR", 1518.7],
  ["Advance", "F36DS", "Terra Red", "F36DSTERRA", 1518.7],
  ["Advance", "F46DS", "Beige", "F46DSBEIGE", 1707.9],
  ["Advance", "F46DS", "Charcoal", "F46DSCHAR", 1707.9],
  ["Advance", "F46DS", "Terra Red", "F46DSTERRA", 1707.9],
  ["Advance", "F56DS", "Beige", "F56DSBEIGE", 1776.63],
  ["Advance", "F56DS", "Charcoal", "F56DSCHAR", 1776.63],
  ["Advance", "F56DS", "Terra Red", "F56DSTERRA", 1776.63],
  ["Advance", "F66DS", "Beige", "F66DSBEIGE", 1897.34],
  ["Advance", "F66DS", "Charcoal", "F66DSCHAR", 1897.34],
  ["Advance", "F66DS", "Terra Red", "F66DSTERRA", 1897.34],
  ["Advance", "F86DS", "Beige", "F86DSBEIGE", 2166.93],
  ["Advance", "F86DS", "Charcoal", "F86DSCHAR", 2166.93],
  ["Advance", "F86DS", "Terra Red", "F86DSTERRA", 2166.93],
  ["Balaero", "50", "Charcoal", "B50BAL", 2094.75],
  ["Balaero", "70", "Charcoal", "B70BAL", 2266.44],
];
export const EVAP_UNITS: EvapUnit[] = RANGE.map(([series, model, colour, part, cost]) => ({ series, model, colour, part, cost }));

/**
 * The sell price for a size not yet in the pricebook: cost plus 25%, up to the
 * next $10. That is the Brivis rule the 8 Nov equipment pricing applied (the
 * P36: $1,729.48 cost, $2,170), so a new size sits where the others do.
 */
export const evapSellPrice = (cost: number) => Math.ceil(Math.round(cost * 1.25 * 100) / 1000) * 10;

/**
 * A new colour of a size already sold takes that size's price: the customer
 * picks a colour, not a price. The 8 Nov run only ever raised prices, so some
 * sizes (the L56 at $2,800) sell above the 25%, and a Beige L56 at $2,710 next
 * to it would be a colour discount nobody chose. The dearest colour is taken
 * where two differ (the F66DS: $2,400 Charcoal, $2,380 Terra Red).
 */
export function evapUnitPrice(u: EvapUnit, have: { model: string; price: number }[]): number {
  const same = have.filter((h) => h.model === u.model && h.price > 0).map((h) => h.price);
  return same.length ? Math.max(...same) : evapSellPrice(u.cost);
}

const COLOUR_CODE: Record<Colour, string> = { Beige: "BEIGE", Charcoal: "CHAR", "Terra Red": "TERRA" };

export const evapUnitName = (u: EvapUnit) => `Brivis ${u.series} ${u.model} Evap Cooler (${u.colour})`;
export const evapUnitCode = (u: EvapUnit) => `BRIVIS-${u.series.toUpperCase()}-${u.model}-${COLOUR_CODE[u.colour]}`;

/** A pricebook equipment row as the sync keeps it, enough to find a unit by Rinnai's order code. */
export type EquipRow = { id: number; price: number; model: string; parts: string[] };

/**
 * The pricebook item already selling this unit, by Rinnai's order code on any
 * of its vendors: the P56 Beige was entered against Reece with Rinnai's code
 * second, and its name says "- Beige", not "(Beige)".
 */
export const findUnit = (u: EvapUnit, rows: EquipRow[]) =>
  rows.find((r) => r.parts.some((p) => p.replace(/\s+/g, "").toUpperCase() === u.part));

/** The pricebook items the templates are built from, by id (from the quotes that used them). */
export const SKU = {
  evapInstall: { skuId: 209601267, skuType: "Service" }, // EVAP-INSTALL
  compliance: { skuId: 209621211, skuType: "Service" }, // BPC Compliance Certificate
  evapServiceSS: { skuId: 301220633, skuType: "Service" }, // EVAP-MAINT-SS
  evapServiceDS: { skuId: 301220979, skuType: "Service" }, // EVAP-SERVICE-DS
  evapRepair: { skuId: 301618481, skuType: "Service" }, // EVAP-REPAIR
  seeleySolenoid: { skuId: 301621837, skuType: "Material" },
  seeleyDumpValve: { skuId: 301204625, skuType: "Material" },
  evapFanMotor: { skuId: 301571078, skuType: "Material" },
  evapCapacitor: { skuId: 301216390, skuType: "Material" },
  kadenKC32: { skuId: 301637887, skuType: "Equipment" },
  r410a: { skuId: 301358552, skuType: "Material" },
  splitRepair: { skuId: 301620463, skuType: "Service" }, // AC-SPLIT-REPAIR
  runCap: { skuId: 301267743, skuType: "Material" },
  splitDeepClean: { skuId: 209601256, skuType: "Service" }, // AC-SPLIT-DEEPCLEAN
  condensatePump: { skuId: 209621465, skuType: "Material" },
  splitDiag: { skuId: 209601842, skuType: "Service" }, // AC-SPLIT-DIAG
  splitRelocate: { skuId: 303150733, skuType: "Service" }, // AC-SPLIT-RELOCATE
  wallBracket550: { skuId: 209621677, skuType: "Material" },
  racInstall: { skuId: 301630471, skuType: "Service" }, // AC-RAC-INSTALL
  kadenRac27: { skuId: 301644829, skuType: "Equipment" },
  rac4kw: { skuId: 301588673, skuType: "Equipment" },
  // Made by the 6 Nov labour run, after the catalogue these ids were read from,
  // so it is found by its code when the template is made.
  heaterInternal: { skuId: 0, skuType: "Service", code: "GAS-DUCT-INT" },
  heaterKit: { skuId: 301123586, skuType: "Material" }, // DH-SM
  kadenKUN320: { skuId: 301154353, skuType: "Equipment" },
  kadenKN315: { skuId: 301122867, skuType: "Equipment" },
  heaterService: { skuId: 148186656, skuType: "Service" }, // HTG-DUCT-SVC
  elecHwInstall: { skuId: 209601872, skuType: "Service" }, // HWS-ELEC-INSTALLATION
  gasStorageInstall: { skuId: 209601308, skuType: "Service" }, // HW-GAS-STORAGE-INS
  thermannElec125: { skuId: 303110429, skuType: "Equipment" },
  thermannElec160: { skuId: 303108196, skuType: "Equipment" },
  thermannGas170: { skuId: 148183961, skuType: "Equipment" },
  valveKit: { skuId: 148184216, skuType: "Material" }, // Tomson Turbo 15mm Valve Kit
  slab600: { skuId: 303111620, skuType: "Material" },
  insulation: { skuId: 148184236, skuType: "Material" },
  copper15: { skuId: 148184226, skuType: "Material" },
  duoValve: { skuId: 301190653, skuType: "Material" },
  tempValve: { skuId: 301188305, skuType: "Material" },
  elbow: { skuId: 148186722, skuType: "Material" },
  tee: { skuId: 301143015, skuType: "Material" },
  ptrValve: { skuId: 301190051, skuType: "Material" },
  gasStorageRepair: { skuId: 301619049, skuType: "Service" }, // HW-GAS-STORAGE-REPAIR
  cooktopInstallCS: { skuId: 303045968, skuType: "Service" }, // GAS-COOKTOP-INSTALL-CS
  cookingInstall: { skuId: 301638479, skuType: "Service" }, // GAS-COOKTOP-INSTALL
  cookerElectrical: { skuId: 301188404, skuType: "Service" }, // ELEC-COOKER
  rangehoodInstall: { skuId: 303114773, skuType: "Service" }, // RANGEHOOD
  boschRangehood53: { skuId: 303112237, skuType: "Equipment" },
  splitService: { skuId: 148186510, skuType: "Service" }, // Split System - Clean & Service
  // Made by serviceSetup.ts on 16 Nov, so found by code when the template is made.
  splitServiceMulti: { skuId: 0, skuType: "Service", code: MULTI_SPLIT.code },
  discHeaterEvapSS: { skuId: 0, skuType: "Material", code: "DISC-HTR-EVAP-SS" },
  discHeaterEvapDS: { skuId: 0, skuType: "Material", code: "DISC-HTR-EVAP-DS" },
} as const;

export type Line = { skuId: number; skuType: string; quantity: number; unitPrice: number; code?: string };
/**
 * `flat`: left out of Jake's layout (one header holding everything at one
 * price). A discount inside a group is folded into the header and shows at
 * $0, and the point of the line is that the customer sees it.
 */
/**
 * `was`: summaries this template has been made with before. templateSummaries.ts
 * writes a changed summary only over one of these (or the last it wrote), never
 * over words the office has put on the template since.
 */
export type TemplateSpec = { name: string; code: string; summary: string; lines: Line[]; flat?: boolean; was?: string[] };

const L = (s: { skuId: number; skuType: string; code?: string }, unitPrice: number, quantity = 1): Line => ({ ...s, quantity, unitPrice });

const FITTED = "Includes removal and disposal of the old cooler, supply and installation of the new unit on your existing roof dropper and ducting, connection to the existing water, power and controller, a full operational test, and a compliance certificate on completion.";

/**
 * What tells the three Brivis ranges apart on a quote, side by side in the evap
 * proposals (Jake, 16 Nov: "speak about the difference between them and then
 * the reason people should choose each model").
 *
 * Only what Rinnai says: its Brivis brochure (RA85.06.22, Aug 2022, the
 * feature table and each range's page) and its Climate price list (1 Apr 2026:
 * "Advance Series (All With Motorised Winter Seal)", "All Brivis Contour
 * Series Include AquaSave and ServoSeal", a winter seal among the Promina's
 * accessories). What all three have (AutoRefresh, pre-wet, FreshStart, the
 * quiet fan, Australian made) is said once, the same on each, so it never
 * reads as one range's advantage. "Best value" and "the top" are the
 * pricebook's order, Advance under Promina under Contour at every size (16 Nov).
 * The Balaero isn't in the proposals and keeps the plain summary.
 */
export const EVAP_SERIES_COPY: Partial<Record<EvapUnit["series"], { compares: string; choose: string }>> = {
  Advance: {
    compares: "How it compares: of the three Brivis ranges we fit (Advance, Promina and Contour), the Advance is the best value. It's the traditional shape, where the Promina and Contour are slimline and sit lower on the roof. It has a motorised winter seal built in, which closes when the cooler is off to stop cold draughts and heat escaping through it in winter, and a large cooling pad area that moves plenty of air.",
    choose: "Choose the Advance if you want a dependable Brivis at the lowest price and don't mind a traditional-looking cooler on the roof.",
  },
  Promina: {
    compares: "How it compares: of the three Brivis ranges we fit (Advance, Promina and Contour), the Promina is the middle one. It's slimline: its low-profile sloping base lets it sit lower on the roof than the traditional-shaped Advance, for a neater look. Unlike the Advance and Contour, it doesn't come with a winter seal. One can be added to stop cold draughts and heat escaping through it in winter; ask us if you'd like it included.",
    choose: "Choose the Promina if you want the slimline look on your roof without paying for the Contour's water saving and built-in winter seal.",
  },
  Contour: {
    compares: "How it compares: of the three Brivis ranges we fit (Advance, Promina and Contour), the Contour is the top. It has the same slimline, low-profile sloping base as the Promina, and adds two things the Promina doesn't have. AquaSave water management keeps the water clean while using up to 45% less water than a conventional cooler that bleeds water off, and its small reservoir means less water is dumped when it's turned off. And a motorised winter seal is built in, closing when the cooler is off to stop cold draughts and heat escaping through it in winter.",
    choose: "Choose the Contour if you want the best of the three: the slimline look, the lowest water use, and a winter seal that looks after itself.",
  },
};
const EVAP_SHARED = "Like the other two, it's Australian made, with a quiet fan, AutoRefresh water management that flushes the tank and refills it with clean water after a set number of fills, a pre-wet cycle that soaks the pads before the fan starts, and FreshStart, which clears stagnant water and sediment once cooling is switched off.";

/** A Brivis unit's replacement template: the unit, the install, the compliance certificate. */
export function evapTemplate(u: EvapUnit, unitSkuId: number, unitPrice: number): TemplateSpec {
  const opening = `Replacement of your existing evaporative cooler with a new Brivis ${u.series} ${u.model} in ${u.colour}, fully installed.`;
  const series = EVAP_SERIES_COPY[u.series];
  return {
    name: `Brivis ${u.series} ${u.model} Evaporative Cooler (${u.colour}) - Replacement`,
    code: `EVAP-BRIVIS-${u.series.toUpperCase()}-${u.model}-${COLOUR_CODE[u.colour]}`,
    summary: [opening, ...(series ? [series.compares, EVAP_SHARED, series.choose] : []), FITTED].join("\n\n"),
    // As made on 15 Nov, before the comparison.
    was: series ? [[opening, FITTED].join("\n\n")] : undefined,
    lines: [{ skuId: unitSkuId, skuType: "Equipment", quantity: 1, unitPrice }, L(SKU.evapInstall, priceOf(SKU.evapInstall.skuId)), L(SKU.compliance, 65)],
  };
}

const hw = (what: string, fuel: "gas" | "water and power") =>
  `Replacement of your existing hot water system with a new ${what}, fully installed.\n\nIncludes disconnection, removal and disposal of the old unit, supply and installation of the new system, connection to the existing ${fuel === "gas" ? "gas and water supply" : "water and power"}, all valves and fittings, a full operational test and a compliance certificate on completion.`;
const heater = (unit: string) =>
  `Replacement of your existing ducted gas heater with a new ${unit}, fully installed.\n\nIncludes removal and disposal of the old heater, installation of the new unit and its connection to your existing gas, flue, ducting and controller, a full operational and safety test, and a compliance certificate on completion.`;

/**
 * Everything else, from the quotes the office built by hand (Sept to Nov).
 * Seven of those quotes were on labour items since switched off and renamed
 * to junk ("frfvd"); each line here is on the active item that does that job
 * now, at the price quoted. The frost valve quote waits on which system it's
 * for: its job was a ducted heater diagnostic, and the repair line differs.
 */
export const OTHER_TEMPLATES: TemplateSpec[] = [
  { name: "Kaden KC32 Evaporative Cooler (Charcoal) - Replacement", code: "EVAP-KADEN-KC32-CHAR",
    summary: `Replacement of your existing evaporative cooler with a new Kaden KC32 in Charcoal, fully installed.\n\n${FITTED}`,
    lines: [L(SKU.kadenKC32, 2200), L(SKU.evapInstall, priceOf(SKU.evapInstall.skuId)), L(SKU.compliance, 65)] },
  { name: "Evaporative Cooler - Replacement (Add Unit)", code: "EVAP-REPLACE-ADD-UNIT",
    summary: `Replacement of your existing evaporative cooler with a new unit, fully installed.\n\n${FITTED}`,
    lines: [L(SKU.evapInstall, priceOf(SKU.evapInstall.skuId)), L(SKU.compliance, 65)] },
  { name: "Evaporative Cooler Service - Single Storey", code: "EVAP-SVC-SS",
    summary: "A full service of the evaporative cooler on a single-storey home, to keep it running well through summer. What's included is set out below.",
    lines: [L(SKU.evapServiceSS, 300)] },
  { name: "Evaporative Cooler Service - Double Storey", code: "EVAP-SVC-DS",
    summary: "A full service of the evaporative cooler on a double-storey home, to keep it running well through summer. What's included is set out below.",
    lines: [L(SKU.evapServiceDS, 400)] },
  { name: "Evaporative Cooler - Solenoid Valve Replacement", code: "EVAP-REP-SOLENOID",
    summary: "Replacement of the solenoid valve on your evaporative cooler, with the cooler tested on completion.",
    lines: [L(SKU.evapRepair, 260), L(SKU.seeleySolenoid, 0)] },
  { name: "Evaporative Cooler - Dump Valve Replacement & Service", code: "EVAP-REP-DUMPVALVE",
    summary: "Replacement of the dump valve on your evaporative cooler, with a full service of the cooler at the same visit.",
    lines: [L(SKU.evapServiceSS, 300), L(SKU.seeleyDumpValve, 250)] },
  { name: "Evaporative Cooler - Fan Motor Replacement", code: "EVAP-REP-FANMOTOR",
    summary: "Replacement of the fan motor and its capacitor on your evaporative cooler, with the cooler tested on completion.",
    lines: [L(SKU.evapRepair, 350), L(SKU.evapFanMotor, 550), L(SKU.evapCapacitor, 91)] },
  { name: "Split System - Leak Detection & Regas", code: "AC-SPLIT-LEAK-REGAS",
    summary: "Finding the refrigerant leak on your split system, then regassing it and testing that it heats and cools as it should.",
    lines: [L(SKU.splitRepair, 1280), L(SKU.r410a, 0, 2.5)] },
  { name: "Split System - Capacitor Replacement", code: "AC-SPLIT-REP-CAPACITOR",
    summary: "Replacement of the run capacitor on your split system, with the system tested on completion.",
    lines: [L(SKU.splitRepair, 280), L(SKU.runCap, 0)] },
  { name: "Split System - Controller Replacement", code: "AC-SPLIT-REP-CONTROLLER",
    summary: "Replacement of the controller for your split system, with the system tested on completion.",
    lines: [L(SKU.splitRepair, 250)] },
  { name: "Split System - Condensate Pump Replacement & Deep Clean", code: "AC-SPLIT-REP-CONDPUMP",
    summary: "A deep clean of your split system and replacement of its condensate pump, with the system tested on completion.",
    lines: [L(SKU.splitDeepClean, priceOf(SKU.splitDeepClean.skuId)), L(SKU.condensatePump, 280)] },
  { name: "Split System - Diagnostics", code: "AC-SPLIT-DIAGNOSTICS",
    summary: "A visit to find the fault with your split system. We'll explain what we find and quote any repair before going ahead.",
    lines: [L(SKU.splitDiag, 180)] },
  { name: "Split System - Relocation (to Wall Bracket)", code: "AC-SPLIT-RELOCATE-WB",
    summary: "Moving your split system's outdoor unit onto a wall bracket, then reconnecting and testing the system.",
    lines: [L(SKU.splitRelocate, 850), L(SKU.wallBracket550, 0)] },
  { name: "Wall Air Conditioner Replacement - Kaden 2.7kW", code: "AC-RAC-KADEN-2.7",
    summary: "Replacement of your existing wall air conditioner with a new Kaden 2.7kW unit in the same opening, fully installed, with a compliance certificate on completion.",
    lines: [L(SKU.kadenRac27, 750), L(SKU.racInstall, 980), L(SKU.compliance, 65)] },
  { name: "Wall Air Conditioner Replacement - Kaden 3.9kW", code: "AC-RAC-KADEN-3.9",
    summary: "Replacement of your existing wall air conditioner with a new Kaden 3.9kW unit in the same opening, fully installed, with a compliance certificate on completion.",
    lines: [L(SKU.rac4kw, 950), L(SKU.racInstall, 800), L(SKU.compliance, 65)] },
  { name: "Kaden KUN320 Ducted Gas Heater - Replacement", code: "GAS-KADEN-KUN320",
    summary: heater("Kaden KUN320"),
    lines: [L(SKU.kadenKUN320, 1650), L(SKU.heaterInternal, 1080), L(SKU.compliance, 65), L(SKU.heaterKit, 0)] },
  { name: "Kaden KN315 Ducted Gas Heater - Replacement", code: "GAS-KADEN-KN315",
    summary: heater("Kaden KN315"),
    lines: [L(SKU.kadenKN315, 1600), L(SKU.heaterInternal, 1080), L(SKU.compliance, 65), L(SKU.heaterKit, 0)] },
  { name: "Ducted Heater Service", code: "GAS-HTR-SVC",
    summary: "A full service and safety check of your ducted gas heater. What's included is set out below.",
    lines: [L(SKU.heaterService, priceOf(SKU.heaterService.skuId))] },
  { name: "Ducted Heater & Add-on Cooling Service", code: "GAS-HTR-ADDC-SVC",
    summary: "A full service and safety check of your ducted gas heater, and a service of its add-on cooling. What's included is set out below.",
    lines: [L(SKU.heaterService, 290)] },
  { name: "Thermann Smart Electric Storage 125L 3kW - Replacement", code: "HW-THERMANN-125-ELEC",
    summary: hw("Thermann Smart Electric 125L 3kW storage hot water system", "water and power"),
    lines: [L(SKU.thermannElec125, 1300), L(SKU.elecHwInstall, 1210), L(SKU.compliance, 65), L(SKU.valveKit, 0), L(SKU.slab600, 0), L(SKU.insulation, 0), L(SKU.copper15, 0)] },
  { name: "Thermann Smart Electric Storage 160L 3kW - Replacement", code: "HW-THERMANN-160-ELEC",
    summary: hw("Thermann Smart Electric 160L 3kW storage hot water system", "water and power"),
    lines: [L(SKU.thermannElec160, 1400), L(SKU.elecHwInstall, 1210), L(SKU.compliance, 65), L(SKU.valveKit, 0), L(SKU.slab600, 0), L(SKU.insulation, 0), L(SKU.copper15, 0)] },
  { name: "Thermann 170L Gas Storage", code: "HW-THERMANN-170-GAS",
    summary: hw("Thermann 170L 4 Star gas storage hot water system", "gas"),
    lines: [L(SKU.thermannGas170, 1500), L(SKU.gasStorageInstall, 1210), L(SKU.compliance, 65), L(SKU.duoValve, 0), L(SKU.tempValve, 0), L(SKU.copper15, 0, 2), L(SKU.elbow, 0, 2), L(SKU.insulation, 0, 4), L(SKU.tee, 0)] },
  { name: "Gas Storage Hot Water - Tempering & Relief Valve Replacement", code: "HW-REP-TEMP-PTR",
    summary: "Replacement of the tempering valve and the pressure and temperature relief valve on your hot water system, with the system tested on completion.",
    lines: [L(SKU.gasStorageRepair, 200), L(SKU.tempValve, 92), L(SKU.ptrValve, 98)] },
  { name: "Gas Cooktop - Installation (Customer Supplied)", code: "GAS-COOKTOP-INSTALL-CS",
    summary: "Installation of the gas cooktop you've supplied, including its connection to the existing gas supply and a full test.",
    lines: [L(SKU.cooktopInstallCS, 600)] },
  { name: "Rangehood - Supply & Install (Bosch 53cm)", code: "RANGEHOOD-BOSCH-53",
    summary: "Supply and installation of a new Bosch 53cm rangehood.",
    lines: [L(SKU.boschRangehood53, 850), L(SKU.rangehoodInstall, 450)] },
  { name: "Upright Cooker - Install Only", code: "COOKER-UPRIGHT-INSTALL",
    summary: "Installation of the upright cooker you've supplied, including its gas and electrical connections, a full test and a compliance certificate on completion.",
    lines: [L(SKU.cookingInstall, 550), L(SKU.cookerElectrical, 350), L(SKU.compliance, 65)] },
  // Jake, 16 Nov: two or more splits at one home are $180 each. The office
  // changes the quantity for five or more.
  ...[2, 3, 4].map((n): TemplateSpec => ({
    name: `Split System Clean & Service - ${n} Splits`, code: `AC-SPLIT-SVC-${n}`,
    summary: `A clean and service of ${n} split systems at your home, at the rate for two or more. What's included is set out below.`,
    lines: [L(SKU.splitServiceMulti, MULTI_SPLIT.price, n)],
  })),
  // And 10% off a heater and an evap cooler serviced together.
  ...(["Single", "Double"] as const).map((storey): TemplateSpec => {
    const evap = storey === "Single" ? SKU.evapServiceSS : SKU.evapServiceDS;
    const disc = storey === "Single" ? SKU.discHeaterEvapSS : SKU.discHeaterEvapDS;
    const d = HEATER_EVAP_DISCOUNTS.find((x) => x.code === disc.code)!;
    return {
      name: `Ducted Heater & Evaporative Cooler Service - ${storey} Storey`, code: `SVC-HTR-EVAP-${storey === "Single" ? "SS" : "DS"}`,
      summary: `A full service and safety check of your ducted gas heater, and a service of the evaporative cooler on a ${storey.toLowerCase()}-storey home, at the same visit, with 10% off for having both done together. What's included is set out below.`,
      lines: [L(SKU.heaterService, priceOf(SKU.heaterService.skuId)), L(evap, priceOf(evap.skuId)), L(disc, d.price)],
      flat: true,
    };
  }),
];

/** A pricebook item as ServiceTitan has it today. */
export type LiveSku = { price: number | null; cost: number | null; description: string | null; name: string };

/**
 * The template's lines, equipment at today's price, with each item's own
 * description, as ServiceTitan's templates carry them. An item gone from the pricebook (or
 * switched off) is named, and the template is not made on a line that
 * would not price.
 */
export function pricedItems(lines: Line[], live: Map<number, LiveSku>) {
  const missing = lines.filter((l) => !live.has(l.skuId)).map((l) => (l.skuId ? String(l.skuId) : l.code ?? "?"));
  const items = lines.map((l) => {
    const sku = live.get(l.skuId);
    return {
      skuId: l.skuId, skuType: l.skuType, quantity: l.quantity,
      unitPrice: l.unitPrice !== 0 && l.skuType === "Equipment" ? (sku?.price ?? l.unitPrice) : l.unitPrice,
      unitCost: sku?.cost ?? null,
      description: sku?.description || sku?.name || null,
      isAddOn: false,
    };
  });
  return { items, missing };
}

export const lineTotal = (lines: Line[]) => Math.round(lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0) * 100) / 100;
