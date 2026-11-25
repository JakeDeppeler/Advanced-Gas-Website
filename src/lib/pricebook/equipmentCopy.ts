/**
 * What each unit's line says on a quote (Jake, 17 Nov): "how it saves money,
 * the key feature, why it's better than its other model ... the warranty".
 * Jake, 25 Nov: "on the brand we should only talk about that brand, not
 * compare it to other brands". So a unit is compared only with its own
 * brand's other models (a Promina with the Advance, a 5-star Buffalo with the
 * 3-star) or with a kind of system (a split, gas storage), never with another
 * maker's unit. The job itself (what we do, remove, include) is the template
 * summary (wording.ts).
 *
 * Jake, 25 Nov: "more wording, not so much dot points; the only [label]
 * should be the warranty". So every description is two paragraphs of plain
 * sentences, the same two on every unit so a customer comparing options reads
 * like for like: what the unit is and what it has, then how it saves you money
 * and why you'd choose it. The warranty follows under its own label.
 * Facts are the manufacturer's own (sources by family below); a figure the
 * manufacturer doesn't publish isn't here. Pure, for scripts/check-quote-templates.ts;
 * quoteWording.ts writes them to the pricebook and onto every template line.
 */

export type EquipmentFacts = { name: string; model?: string | null; code?: string | null };

export const EQUIPMENT_LABELS = { warranty: "Warranty:" } as const;

/** Our own cover, after the manufacturer's, on every unit we install (brands.ts). */
export const WORKMANSHIP = "Plus our 6-year workmanship warranty on the installation.";

export type Copy = { title: string; saves: string; features: string; choose: string; warranty: string };

/**
 * One description, in the one order: the opening sentence (title) runs on into
 * what it has (features); how it saves runs on into why you'd choose it. Each
 * part is written as whole sentences so the two paragraphs read as prose.
 */
export const copyText = (c: Copy) =>
  [`${c.title} ${c.features}`, `${c.saves} ${c.choose}`, `${EQUIPMENT_LABELS.warranty} ${c.warranty} ${WORKMANSHIP}`]
    .map((p) => p.trim().replace(/\s+/g, " ")).join("\n\n");

type Unit = { name: string; model: string; all: string };
type Family = { key: string; matches: (u: Unit) => boolean; copy: (u: Unit) => Copy };

const has = (re: RegExp) => (u: Unit) => re.test(u.all);
const grab = (u: Unit, re: RegExp) => re.exec(u.all)?.[1] ?? "";
/** The roof colour, as the pricebook spells it several ways ("Char", "T'cotta red"). */
const colourOf = (u: Unit) => {
  const c = /terra|t'?cotta|\bred\b/i.test(u.all) ? "Terra Red" : /\bchar(coal)?\b/i.test(u.all) ? "Charcoal" : /beige/i.test(u.all) ? "Beige" : "";
  return c ? ` in ${c}` : "";
};

// --- Hot water: Thermann gas, electric and continuous flow -----------------------------
// thermann.com.au (gas storage, continuous flow pages; Residential Brochure Aug 2025;
// Electric and Gas Storage Owner's Guide Sep 2024), checked 17 Nov 2026.
const THERMANN_GAS: Family = {
  key: "thermann-gas-storage",
  matches: has(/thermann\s+(135|170)\s*l\s+gas storage/i),
  copy: (u) => {
    const l = grab(u, /(135|170)\s*l/i);
    return {
      title: `The Thermann ${l}L is a 4-star gas storage hot water system, installed outdoors.`,
      saves: "Thermann says gas storage usually costs less to buy and install than other types, with no gas line upgrade needed, and it fits the footprint of older square gas units. It's 4-star rated. The trade-off is that the tank loses some heat whether you use the water or not.",
      features: `It runs at full mains pressure with an adjustable thermostat, Thermann sizes it for ${l === "135" ? "2 to 4" : "3 to 5"} people, and it's made in Australia.`,
      choose: "Compared with gas continuous flow, such as the Thermann G-Series, it costs less up front and keeps hot water stored ready to use. Continuous flow or a heat pump costs less to run, and we can price either for you.",
      warranty: "Thermann, in a single-family home: 7 years on the tank and 1 year parts and labour, from installation. After the first year a replacement tank is covered, but not the labour to fit it.",
    };
  },
};
const THERMANN_SMART: Family = {
  key: "thermann-smart-electric",
  matches: has(/thermann smart electric/i),
  copy: (u) => ({
    title: `The Thermann Smart Electric ${grab(u, /(125|160)\s*l/i)}L is a 3kW electric storage hot water system with built-in wifi.`,
    saves: "The Thermann app shows your hot water's energy use and power cost, and lets you choose when the tank heats: Schedule for solar or cheaper time-of-use hours, Eco to learn your household's pattern, Manual for a lower temperature, and Holiday to switch it off while you're away.",
    features: "It keeps its anti-legionella cycle in every mode, and it works as a normal tank if you don't use the app (which needs a 2.4GHz wifi network). It's made in Australia.",
    choose: "Compared with a standard Thermann electric tank, it's the same tank with app control and longer cover on the electronics. A heat pump uses far less power again: Thermann puts it at about 70% less energy than a standard electric tank.",
    warranty: "Thermann, in a single-family home: 10 years on the tank, 3 years on the wifi module, thermostat and element, and 1 year on labour.",
  }),
};
const THERMANN_CF: Family = {
  key: "thermann-g-series",
  matches: has(/g-series\s*26/i),
  copy: () => ({
    title: "The Thermann G-Series 26L is a continuous flow hot water system for natural gas, preset to 50°C.",
    saves: "It heats water only while a hot tap is running, so there's no tank losing heat all day. Thermann rates the 26L at up to 6.7 stars, against 4 stars for a gas storage tank.",
    features: "It delivers 26 litres a minute at a 25°C rise, enough for two to three bathrooms at once, and it never runs out. It's a compact, Japanese-made outdoor wall unit with built-in frost protection.",
    choose: "Compared with a gas storage tank, you get endless hot water, a higher star rating and no tank to replace. Some homes need a bigger gas line for it, which we check before we quote.",
    warranty: "Thermann, domestic: 12 years on the heat exchanger (parts) and 3 years parts and labour on all components, from installation.",
  }),
};

// --- Evaporative cooling: Brivis and Kaden ---------------------------------------------
// Rinnai's Brivis brochure (RA85.06.22) and Climate price list (1 Apr 2026), Brivis
// warranty booklet (Mar 2026) and operation manual; kaden.com.au. Checked 17 Nov 2026.
const EVAP_SAVES = "Brivis rates its evaporative coolers up to 75% more efficient to run than ducted refrigerated air conditioning, citing Sustainability Victoria.";
const BRIVIS_EVAP_WARRANTY = "Brivis: 5 years parts and labour, and 10 years on structural parts (parts only). Register within 12 months and book Brivis services in years 4, 6 and 8 to extend parts and labour to 9 years. Servicing every two years by an authorised Brivis technician is a condition of the warranty.";
const sizeOf = (u: Unit, re: RegExp) => grab(u, re).toUpperCase();
const BRIVIS_ADVANCE: Family = {
  key: "brivis-advance",
  matches: has(/brivis advance/i),
  copy: (u) => ({
    title: `The Brivis Advance ${sizeOf(u, /\b(F\d\dDS?)\b/i)} is an evaporative cooler${colourOf(u)}, with a traditional cabinet and a large cooling pad area for high airflow.`,
    saves: EVAP_SAVES,
    features: "A motorised winter seal closes it off so there are no cold draughts in winter, and AutoRefresh and FreshStart keep the water fresh. It has a pre-wet cycle, a quiet fan and variable speeds, and it's made in Australia.",
    choose: "It's the best value of the three Brivis ranges we fit (Advance, Promina and Contour), with a motorised winter seal as standard, a Brivis warranty that can be extended to 9 years, and the option of the Brivis Touch and Networker controllers.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_PROMINA: Family = {
  key: "brivis-promina",
  matches: has(/brivis promina/i),
  copy: (u) => ({
    title: `The Brivis Promina ${sizeOf(u, /\b(P\d\d)\b/i)} is a slimline evaporative cooler${colourOf(u)}, with a low-profile sloping base so it sits lower on the roof.`,
    saves: EVAP_SAVES,
    features: "Its cooling pads are up to 130mm thick, and AutoRefresh and FreshStart keep the water fresh. It has a pre-wet cycle and a quiet fan, a winter seal is available as an add-on, and it's made in Australia.",
    choose: "Compared with the Advance below it, the Promina's slimline shape sits lower and neater on the roofline, with thicker pads on the larger sizes. The Advance has the bigger pad area and a motorised winter seal as standard.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_CONTOUR_7: Family = {
  key: "brivis-contour-7",
  matches: has(/brivis contour\s+l\d7\b/i),
  copy: (u) => ({
    title: `The Brivis Contour 7 Series ${sizeOf(u, /\b(L\d7)\b/i)} is a slimline evaporative cooler${colourOf(u)}, with an EC fan motor.`,
    saves: `${EVAP_SAVES} Its EC fan motor uses on average 45% less energy than Brivis's standard motor (about 20% less at high speed, 70% at low), and AquaSave uses up to 45% less water than a conventional cooler with a bleed system.`,
    features: "It has a low-profile sloping base, a motorised winter seal, cooling pads up to 130mm thick, a pre-wet cycle and FreshStart, and it's made in Australia.",
    choose: "Compared with the standard Contour, it's the same cooler with an EC motor that uses less power, most of all at low fan speeds.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_CONTOUR: Family = {
  key: "brivis-contour",
  matches: has(/brivis contour/i),
  copy: (u) => ({
    title: `The Brivis Contour ${sizeOf(u, /\b(L\d\d)\b/i)} is a slimline evaporative cooler${colourOf(u)}, with a low-profile sloping base.`,
    saves: `${EVAP_SAVES} AquaSave water management uses up to 45% less water than a conventional cooler with a bleed system, and its small reservoir means less water is dumped when it's turned off.`,
    features: "It has a motorised winter seal, cooling pads up to 130mm thick, a pre-wet cycle and a quiet fan, and it's made in Australia.",
    choose: "It's the top of the three Brivis ranges we fit. Compared with the Promina below it, the Contour adds AquaSave and a motorised winter seal as standard, with a larger pad area from the L46 up.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_BALAERO: Family = {
  key: "brivis-balaero",
  matches: has(/balaero/i),
  copy: (u) => {
    const size = grab(u, /balaero\s*(50|70)/i) || grab(u, /\bB(50|70)BAL\b/i);
    return {
      title: `The Brivis Balaero ${size} is an evaporative cooler for bushfire-prone areas, in Charcoal.`,
      saves: EVAP_SAVES,
      features: `Its stainless steel ember protection is engineered to meet Bushfire Attack Level 12.5. A gravity-closing winter seal is ${size === "70" ? "fitted" : "available as an add-on"}, and it has 100mm cooling pads, variable fan speeds and a pre-wet cycle.`,
      choose: "Compared with the Advance, the Balaero is built for bushfire-prone sites rated up to BAL-12.5 (your builder or council confirms your site's rating). Where that isn't needed, the Advance has more features for the money.",
      warranty: "Brivis: 5 years parts and labour, with servicing every two years by an authorised Brivis technician a condition of the warranty.",
    };
  },
};
const KADEN_KC32: Family = {
  key: "kaden-kc32",
  matches: has(/\bKC32\b/i),
  copy: () => ({
    title: "The Kaden Classic KC32 is an evaporative cooler in Charcoal, with a manual wall controller.",
    saves: "Kaden says evaporative cooling uses considerably less energy than a comparable ducted refrigerated system. It cools best on hot, dry days, with a window or door open.",
    features: "It's the largest Kaden Classic, with a 1000W motor and 3,290 L/s of airflow, and it has high-efficiency pads, Smart Water Management, an automatic winter seal, a pre-wet cycle, a self-cleaning pump and a quiet fan.",
    choose: "It's a straightforward, lower-cost way to cool a whole home, with a warranty that can be extended to 7 years.",
    warranty: "Kaden: 5 years parts and labour, and 10 years on structural parts (parts only). Register within 12 months and have Rinnai service it in year 4 to add 2 years. Servicing as set out in the owner's manual is a condition.",
  }),
};

// --- Kitchen: cooktops and rangehood ---------------------------------------------------
// bosch-home.com.au, westinghouse.com.au and beko.com/au-en (5-year registration offer),
// product pages and warranty terms, checked 17 Nov 2026.
const BOSCH_COOKTOP: Family = {
  key: "bosch-pnk6b6k40a",
  matches: has(/PNK6B6K40A|bosch series 4 60cm gas cooktop/i),
  copy: () => ({
    title: "The Bosch Series 4 60cm gas cooktop (PNK6B6K40A) has a black glass top and a wok burner.",
    saves: "The 1kW economy burner looks after simmering and small pans, so you're not running a big burner for a small job, and an LPG nozzle set comes in the box if you ever change gas supply.",
    features: "It has four burners: a 3.5kW wok, two 1.75kW and a 1kW economy burner. Flame failure safety cuts the gas if a flame goes out. The black tempered glass has bevelled edges, the controls sit at the front right with ignition built into the knobs, and the pan supports are cast iron.",
    choose: "Black glass is quick to wipe down, the pan supports go in the dishwasher, and the 3.5kW wok burner handles high-heat cooking.",
    warranty: "Bosch: 2 years from purchase against defects in materials and workmanship, for domestic use.",
  }),
};
const BEKO_COOKTOP: Family = {
  key: "beko-bct60gx1",
  matches: has(/BCT60GX1|beko 60\s*cm stainless steel gas cooktop/i),
  copy: () => ({
    title: "The Beko 60cm gas cooktop (BCT60GX1) is stainless steel, with a wok burner.",
    saves: "Register it with Beko within 90 days and the warranty runs 5 years instead of 2, at no charge. An LPG conversion kit is included.",
    features: "It has four burners, including a 5kW wok burner at the front left. Flame failure safety shuts off the gas if a flame goes out, and it has cast iron pan supports and electronic ignition.",
    choose: "It gives you a strong 5kW wok burner for high-heat cooking, in easy-clean stainless steel.",
    warranty: "Beko: 2 years from purchase, extended to 5 years at no charge if you register it on Beko's website within 90 days.",
  }),
};
const WESTINGHOUSE_COOKTOP: Family = {
  key: "westinghouse-whg644sc",
  matches: has(/WHG644SC|westinghouse 60cm 4 burner/i),
  copy: () => ({
    title: "The Westinghouse 60cm 4-burner natural gas cooktop (WHG644SC) is stainless steel.",
    saves: "An LP gas conversion kit is included, and the ignition runs off mains power, so there are no batteries to replace.",
    features: "Its four burners give 40.6 MJ/h between them: a 14.4 MJ/h triple-ring wok, a 12.1 MJ/h rapid, a 9.0 MJ/h semi-rapid and a 5.1 MJ/h simmer. A flame failure device cuts the gas if a flame goes out, and it has flat cast iron trivets and under-knob ignition.",
    choose: "It gives plenty of heat across all four burners, from the triple-ring wok for high-heat cooking down to a gentle simmer.",
    warranty: "Westinghouse: 2 years from purchase, with faulty parts repaired or replaced at no charge, for domestic use.",
  }),
};
const BOSCH_RANGEHOOD: Family = {
  key: "bosch-dhl555bau",
  matches: has(/DHL555BAU|bosch 53cm series 4 under cupboard rangehood/i),
  copy: () => ({
    title: "The Bosch Series 4 53cm under-cupboard rangehood (DHL555BAU) is silver, and fits neatly into a 500mm overhead cupboard.",
    saves: "It has LED lighting and washable aluminium grease filters that go in the dishwasher, so there are no paper filters to keep buying when it's ducted outside.",
    features: "It has three speeds plus an intensive setting for steam and strong smells, on a slide control, and moves up to 420 m³/h, or 650 m³/h on intensive, when it's ducted outside.",
    choose: "Ducted outside, it clears more steam and smell than the same hood recirculating (420 against 320 m³/h), and needs no recirculation filters.",
    warranty: "Bosch: 2 years from purchase against defects in materials and workmanship, for domestic use.",
  }),
};

// --- Air conditioning: Mitsubishi Electric, Kaden, Rinnai, ZoneMate ---------------------
// mitsubishielectric.com.au (MSZ-AP, MXZ-F multi kits flyer 2025, PEA-M), kadenair.com.au
// (KSI V3, multi brochure v2, KDI, KW; 7-year warranty for units bought from 1 Jan 2026),
// rinnai.com.au (RPX, MON), zonemate.com.au; star ratings are the Zoned Energy Rating
// Label's cold zone, which is Melbourne's. Checked 17 Nov 2026.
const kwKey = (u: Unit, re: RegExp) => String(Number(grab(u, re)));
const ZERL = "in Melbourne's cold zone on the Zoned Energy Rating Label";
const MITSU_WARRANTY = "Mitsubishi Electric: 5 years parts and labour on the indoor and outdoor units from installation, for home use. Licensed installation and clean filters, coils and drains are required.";
const KADEN_WARRANTY = "Kaden: 7 years parts, labour and compressor for home use, on units bought from 1 January 2026. Licensed installation, clean filters and a clear drain are required.";
const RINNAI_WARRANTY = "Rinnai: 7 years parts and labour for home use from installation (wifi devices 1 year). It needs a qualified installer and servicing as the owner's manual sets out.";

const MSZ: Record<string, { cool: string; heat: string; cs: string; hs: string; vs: string }> = {
  "2.5": { cool: "2.5", heat: "3.2", cs: "6", hs: "3", vs: "It suits a bedroom or study." },
  "3.5": { cool: "3.5", heat: "3.7", cs: "5", hs: "3", vs: "It suits a large bedroom or a smaller living area." },
  "5": { cool: "5.0", heat: "6.0", cs: "4.5", hs: "2", vs: "It suits a living area, with more heat than cooling for winter." },
  "6": { cool: "6.0", heat: "6.8", cs: "4.5", hs: "2.5", vs: "It suits a larger living area, between the 5 and 7.1kW sizes." },
  "7.1": { cool: "7.1", heat: "8.0", cs: "3.5", hs: "2", vs: "It suits a large open-plan living area." },
};
const MITSU_SPLIT: Family = {
  key: "mitsubishi-msz-ap-split",
  matches: has(/mitsubishi electric\s+[\d.]+\s*kw\s+split system/i),
  copy: (u) => {
    const k = kwKey(u, /([\d.]+)\s*kw/i), m = MSZ[k] ?? MSZ["3.5"];
    return {
      title: `The Mitsubishi Electric MSZ-AP ${m.cool}kW is a reverse cycle split system with ${m.cool}kW of cooling and ${m.heat}kW of heating.`,
      saves: `It's an inverter system rated ${m.cs} stars for cooling and ${m.hs} for heating ${ZERL}, and Econo Cool raises the cooling set point 2°C without the room feeling any warmer.`,
      features: `It has built-in wifi, Dual Barrier Coating to keep the indoor coil cleaner and Blue Fin coating to protect the outdoor coil from corrosion, and it keeps heating down to -15°C outside.`,
      choose: `${m.vs} You also have Mitsubishi Electric's own Australian service and parts support behind it.`,
      warranty: MITSU_WARRANTY,
    };
  },
};
const MSZ_HEAD_DB: Record<string, string> = { "2.5": "19", "3.5": "19", "5": "28", "7.1": "30" };
const MITSU_HEAD: Family = {
  key: "mitsubishi-msz-ap-head",
  matches: has(/mitsubishi electric\s+[\d.]+\s*kw\s+indoor head/i),
  copy: (u) => {
    const k = kwKey(u, /([\d.]+)\s*kw/i);
    return {
      title: `The Mitsubishi Electric MSZ-AP ${k}kW is a wall-mounted indoor unit for a multi-split system.`,
      saves: "Each room has its own remote and app control, so you run only the rooms you're using. Econo Cool raises the cooling set point 2°C without the room feeling any warmer.",
      features: `It's rated at ${k}kW of cooling nominal, though the actual output depends on the other units on the system. It has built-in wifi, Dual Barrier Coating to keep the coil cleaner and an anti-allergy filter${MSZ_HEAD_DB[k] ? `, and runs from ${MSZ_HEAD_DB[k]} dB(A) on low fan` : ""}.`,
      choose: "It's the same MSZ-AP unit Mitsubishi sells as a single split, so every room matches, with Mitsubishi Electric's own Australian service and parts support behind it.",
      warranty: MITSU_WARRANTY,
    };
  },
};
const MXZ: Record<string, { rooms: string; cool: string; heat: string; cop: string }> = {
  "8": { rooms: "4", cool: "8.0", heat: "8.8", cop: "5.2" },
  "10": { rooms: "5", cool: "10.0", heat: "10.0", cop: "4.8" },
  "12": { rooms: "6", cool: "12.0", heat: "13.2", cop: "4.4" },
};
const MITSU_MULTI: Family = {
  key: "mitsubishi-mxz-multi",
  matches: has(/mitsubishi electric\s+\d+\s*kw\s+multi condenser/i),
  copy: (u) => {
    const k = kwKey(u, /(\d+)\s*kw/i), m = MXZ[k] ?? MXZ["10"];
    return {
      title: `The Mitsubishi Electric MXZ ${m.cool}kW is a multi-split outdoor unit, for up to ${m.rooms} rooms.`,
      saves: `Each room is controlled separately, so you run only the rooms in use. In Mitsubishi's standard heating test (7°C outside) it makes about ${m.cop}kW of heat for every kW of power it uses.`,
      features: `It gives ${m.cool}kW of cooling and ${m.heat}kW of heating across up to ${m.rooms} indoor units, and it's an inverter system using R32 refrigerant.`,
      choose: `Compared with separate splits, there's one outdoor unit to find room for instead of ${m.rooms}, with Mitsubishi Electric's own Australian service and parts support behind it.`,
      warranty: MITSU_WARRANTY,
    };
  },
};
const PEA: Record<string, { cool: string; heat: string; cop: string; db: string; pa: string; vs: string }> = {
  "12": { cool: "12.5", heat: "14.0", cop: "4.6", db: "35", pa: "150", vs: "" },
  "16": { cool: "16.0", heat: "18.0", cop: "4.0", db: "35", pa: "150", vs: "" },
  "18": { cool: "18.0", heat: "20.0", cop: "4.1", db: "30", pa: "250", vs: "" },
};
const MITSU_DUCTED: Family = {
  key: "mitsubishi-pea-m-ducted",
  matches: has(/mitsubishi electric\s+\d+\s*kw\s+ducted/i),
  copy: (u) => {
    const k = kwKey(u, /(\d+)\s*kw/i), m = PEA[k] ?? PEA["16"];
    return {
      title: `The Mitsubishi Electric PEA-M ${m.cool}kW is a single-phase ducted reverse cycle system, with ${m.cool}kW of cooling and ${m.heat}kW of heating.`,
      saves: `Its Power Inverter outdoor unit makes about ${m.cop}kW of heat for every kW of power it uses in Mitsubishi's standard heating test (7°C outside), and with zoning you heat and cool only the rooms in use.`,
      features: `The indoor unit runs from ${m.db} dB(A), its fan pushes up to ${m.pa} Pa for long duct runs, and it comes in two pieces to fit tight roof spaces. It keeps heating down to -20°C outside.`,
      choose: "You also have Mitsubishi Electric's own Australian service and parts support behind it.",
      warranty: MITSU_WARRANTY,
    };
  },
};
const KSI: Record<string, { cool: string; heat: string; cs: string; hs: string }> = {
  "2.5": { cool: "2.5", heat: "2.8", cs: "5", hs: "3" },
  "3.5": { cool: "3.5", heat: "4.0", cs: "5", hs: "2.5" },
  "5": { cool: "5.0", heat: "5.5", cs: "4.5", hs: "2" },
  "7": { cool: "7.0", heat: "7.5", cs: "4", hs: "2" },
};
const KADEN_VALUE = "Kaden is the value range we fit: a lower price with a 7-year warranty.";
const KADEN_SPLIT: Family = {
  key: "kaden-ksi-v3-split",
  matches: has(/kaden ksi\s+[\d.]+\s*kw\s+v3/i),
  copy: (u) => {
    const k = kwKey(u, /ksi\s+([\d.]+)\s*kw/i), m = KSI[k] ?? KSI["3.5"];
    return {
      title: `The Kaden KSI V3 ${m.cool}kW is a reverse cycle split system with ${m.cool}kW of cooling and ${m.heat}kW of heating.`,
      saves: `It's an inverter system rated ${m.cs} stars for cooling and ${m.hs} for heating ${ZERL}, and Kaden says ECO mode uses up to 60% less energy than normal running, for 8 hours at a time.`,
      features: `It has built-in wifi and voice control, an anti-corrosion gold-fin coating, a self-clean mode and a three-in-one filter, and it keeps heating down to -15°C outside.`,
      choose: `${KADEN_VALUE} Kaden is Reece's own brand, so an Australian company stands behind the warranty.`,
      warranty: KADEN_WARRANTY,
    };
  },
};
const KADEN_HEAD: Family = {
  key: "kaden-ksi-head",
  matches: has(/kaden ksi\s+[\d.]+\s*kw\s+indoor/i),
  copy: (u) => {
    const k = grab(u, /ksi\s+([\d.]+)\s*kw/i);
    return {
      title: `The Kaden KSI ${k}kW is a wall-mounted indoor unit for a Kaden multi-split system.`,
      saves: "Each room has its own controls, so you run only the rooms you're using. Kaden says ECO mode uses up to 60% less energy than normal running, for 8 hours at a time.",
      features: `It's rated at ${k}kW of cooling nominal, though the actual output depends on the rest of the system, and it comes with wifi, a gold-fin coating, a self-clean mode and a three-in-one filter.`,
      choose: "It's a lower-cost head with a 7-year warranty, and Kaden's outdoor units go up to 17.5kW across six rooms.",
      warranty: KADEN_WARRANTY,
    };
  },
};
const KM: Record<string, { model: string; rooms: string; cool: string; heat: string; cs: string; hs: string; vs: string }> = {
  KM48: { model: "KM48", rooms: "5", cool: "13.0", heat: "13.5", cs: "3.5", hs: "2.5", vs: "13kW of cooling across up to five rooms" },
  KM60: { model: "KM60", rooms: "6", cool: "17.5", heat: "19.5", cs: "3.5", hs: "2", vs: "17.5kW of cooling across up to six rooms" },
};
const KADEN_MULTI: Family = {
  key: "kaden-km-multi",
  matches: has(/\bKM(48|60)\b|kaden\s+13\s*kw\s+multi/i),
  copy: (u) => {
    const m = /KM60/i.test(u.all) ? KM.KM60 : KM.KM48;
    return {
      title: `The Kaden ${m.model} is a ${m.cool}kW multi-split outdoor unit, for up to ${m.rooms} rooms.`,
      saves: `It's an inverter system rated ${m.cs} stars for cooling and ${m.hs} for heating ${ZERL}, and you run only the rooms in use.`,
      features: `It gives ${m.cool}kW of cooling and ${m.heat}kW of heating across up to ${m.rooms} wall, ducted or cassette indoor units, keeps heating down to -15°C outside, and uses R32 refrigerant.`,
      choose: `Compared with separate splits, there's one outdoor unit instead of ${m.rooms}: ${m.vs}, with a 7-year warranty.`,
      warranty: KADEN_WARRANTY,
    };
  },
};
const KADEN_DUCTED: Family = {
  key: "kaden-kdi-ducted",
  matches: has(/KDI-17|kaden ducted split 17/i),
  copy: () => ({
    title: "The Kaden KDI V2 17kW is a single-phase ducted reverse cycle system, with 17.0kW of cooling and 18.0kW of heating.",
    saves: `It's an inverter system rated 3.5 stars for cooling and 2 for heating ${ZERL}, and with zoning you heat and cool only the rooms in use.`,
    features: "It has built-in wifi, a built-in drain pump and a weekly timer, and the indoor unit splits in two for tight roof spaces. It keeps heating down to -15°C outside and uses R32 refrigerant.",
    choose: "It's a lower-cost ducted system with a 7-year warranty.",
    warranty: KADEN_WARRANTY,
  }),
};
const KADEN_WINDOW: Family = {
  key: "kaden-kw-window",
  matches: has(/kaden window air conditioner/i),
  copy: (u) => {
    const big = /kw12/i.test(u.all);
    const m = big ? { model: "KW12", cool: "3.9", heat: "3.6", split: "5 for cooling and 2.5 for heating" } : { model: "KW09", cool: "2.75", heat: "2.45", split: "5 for cooling and 3 for heating" };
    return {
      title: `The Kaden ${m.model} is a ${m.cool}kW reverse cycle window/wall air conditioner, with ${m.heat}kW of heating.`,
      saves: `It heats or cools just the one room, and you can switch it off from your phone. It's rated 1.5 stars for cooling and 0.5 for heating ${ZERL}, so it's best for a room you use now and then.`,
      features: `It's one self-contained unit that plugs into a power point, with wifi, a silver-ion filter and an anti-corrosion Blue Fin coating, and it keeps heating down to -7°C outside.`,
      choose: `Compared with a split system, there's nothing to mount outside and it fits the existing opening. A split is quieter and costs less to run: Kaden's equivalent split rates ${m.split}.`,
      warranty: "Kaden: 5 years parts and labour for home use, from the date of purchase. It needs a licensed installer and clean filters.",
    };
  },
};
const RPX: Record<string, { cool: string; heat: string }> = { "2.5": { cool: "2.6", heat: "3.25" }, "3.5": { cool: "3.5", heat: "3.8" }, "5": { cool: "5.0", heat: "6.0" }, "7": { cool: "7.0", heat: "7.7" } };
const RINNAI_HEAD: Family = {
  key: "rinnai-rpx-head",
  matches: has(/rinnai rpx\s+[\d.]+\s*kw\s+indoor|HINRPX/i),
  copy: (u) => {
    const k = kwKey(u, /rpx\s+([\d.]+)\s*kw/i), m = RPX[k] ?? RPX["3.5"];
    return {
      title: `The Rinnai RPX ${m.cool}kW is a wall-mounted indoor unit for a Rinnai multi-split system.`,
      saves: "You run only the rooms in use. A built-in presence sensor saves energy when the room is empty, and ECO+ fine-tunes cooling for efficiency.",
      features: `It's rated at ${m.cool}kW of cooling and ${m.heat}kW of heating nominal, though the actual output depends on the rest of the system. It has wifi app and voice control, a HEPA filter, adjustable humidity and an anti-corrosion coil coating, and Turbo+ shifts the temperature by up to 6°C in 10 minutes.`,
      choose: "Every room gets a presence sensor, a HEPA filter and adjustable humidity, with a 7-year warranty.",
      warranty: RINNAI_WARRANTY,
    };
  },
};
const MON: Record<string, { rooms?: string; cool?: string; heat?: string; acop?: string; vs: string }> = {
  "5": { rooms: "2", cool: "5.4", heat: "5.4", acop: "4.0", vs: "It suits two rooms where only one outdoor unit will fit." },
  // The pricebook's part (MON4H11B1LA) isn't one Rinnai lists, so no figures until it's confirmed.
  "11": { vs: "" },
  "14": { rooms: "5", cool: "13.5", heat: "14.0", acop: "4.2", vs: "" },
  "19": { rooms: "6", cool: "19.0", heat: "21.5", acop: "4.2", vs: "" },
};
const RINNAI_MULTI: Family = {
  key: "rinnai-mon-multi",
  matches: has(/rinnai multi condenser|MON\dH\d\d/i),
  copy: (u) => {
    const k = kwKey(u, /condenser\s+(\d+)\s*kw/i), m = MON[k] ?? MON["14"];
    return {
      title: `The Rinnai ${m.cool ?? k}kW is a multi-split outdoor unit${m.rooms ? `, for up to ${m.rooms} rooms` : ""}.`,
      saves: `It's an inverter system, and you run only the rooms in use.${m.acop ? ` In Rinnai's standard test it rates ${m.acop} for heating efficiency (ACOP: the higher, the better).` : ""}`,
      features: `${m.cool ? `It gives ${m.cool}kW of cooling and ${m.heat}kW of heating across` : "It runs"} wall, slim ducted, cassette or floor-console indoor units, keeps heating down to -15°C outside, and is single phase with R32 refrigerant.`,
      choose: `Compared with separate splits, there's one outdoor unit instead of several.${m.vs ? ` ${m.vs}` : ""} Rinnai Australia is based in Braeside, Melbourne.`,
      warranty: RINNAI_WARRANTY,
    };
  },
};
const ZONEMATE: Family = {
  key: "zonemate-touch-pro",
  matches: has(/zonemate/i),
  copy: () => ({
    title: "The ZoneMate Touch Pro is a ducted zone controller, with 4 wireless room sensors.",
    saves: "You heat or cool only the zones in use. Each sensor reads its own room, so a zone eases off when that room reaches temperature, and schedules stop the system running when nobody's home.",
    features: "You run it from a wall touchscreen, the phone app, or by voice through Google Home and Alexa. It handles up to 12 zones, with the airflow to each adjustable in 1% steps, and works with Mitsubishi Electric and Kaden ducted systems.",
    choose: "A standard ducted controller reads one temperature and switches zones on or off. ZoneMate measures each room and trims the airflow to suit it.",
    warranty: "ZoneMate: a 2-year limited warranty.",
  }),
};

// --- Ducted gas heating and the Dominator ----------------------------------------------
// rinnai.com.au (Brivis Buffalo BX3C/BX5C, Classic Wombat, Compact Classic, StarPro 6;
// Brivis warranty booklet Mar 2026), braemar.com.au and seeleyinternational.com
// (Ecostar TQM618, Dominator), kaden.com.au (KN3/KUN3 brochure). Checked 17 Nov 2026.
// Brivis publishes outputs that differ from the pricebook names: the "26kW" Buffalos
// are 28 kW (3-star) and 30 kW (5-star); the titles use Brivis's figures.
const BRIVIS_HEATER_WARRANTY = "Brivis: 5 years parts and labour (extendable to 9 with registration and Brivis services in years 4, 6 and 8), and 10 years on the heat exchanger and burner (parts). Servicing every 2 years is a condition of the warranty.";
const STAR_STEP = "Brivis says each extra star cuts gas use by about 10%.";
const BUFFALO_3: Record<string, string> = { "315": "15.5", "320": "20", "326": "28" };
const BRIVIS_BUFFALO_3: Family = {
  key: "brivis-buffalo-3",
  matches: has(/buffalo\s+3\s*star|BX3\d\dC/i),
  copy: (u) => ({
    title: `The Brivis Buffalo ${BUFFALO_3[grab(u, /BX(3\d\d)/i)] ?? grab(u, /(\d+)\s*kw/i)}kW 3-star is an external ducted gas heater for natural gas.`,
    saves: `It's rated 3.5 stars, the top of the 3-star band. ${STAR_STEP} There's no pilot light burning gas between runs.`,
    features: "It's made in Australia, in a weatherproof outdoor cabinet built as an easy changeover for an existing Buffalo, and Networker or wifi control is available with an extra module.",
    choose: "Compared with the 5-star Buffalo, it costs less up front and is the simplest like-for-like swap for an existing Buffalo, with the same warranty. The 5-star uses less gas over a long winter and adds a modulating burner and zoning.",
    warranty: BRIVIS_HEATER_WARRANTY,
  }),
};
const BUFFALO_5: Record<string, { kw: string; stars: string }> = { "520": { kw: "20", stars: "5.1" }, "526": { kw: "30", stars: "5.0" } };
const BRIVIS_BUFFALO_5: Family = {
  key: "brivis-buffalo-5",
  matches: has(/buffalo\s+5\s*star|BX5\d\dC/i),
  copy: (u) => {
    const m = BUFFALO_5[grab(u, /BX(5\d\d)/i)] ?? BUFFALO_5["520"];
    return {
      title: `The Brivis Buffalo ${m.kw}kW 5-star is an external ducted gas heater for natural gas.`,
      saves: `It's rated ${m.stars} stars. Brivis estimates a 5-star heater uses about 22% less gas than a standard 3.0-star one: around $603 a year in its test home (220 m², 600 hours a year, gas at 3.01c/MJ). Its modulating gas valve turns down as your home warms.`,
      features: "It's made in Australia, in a weatherproof outdoor cabinet designed to replace an existing Buffalo, and works with ZonePlus zoning (up to 4 zones) and wifi control.",
      choose: "Compared with the 3-star Buffalo, it burns less gas every winter and adds a modulating burner and zoning. The 3-star is rated 3.5 stars, so your saving against it will be under Brivis's 22%.",
      warranty: BRIVIS_HEATER_WARRANTY,
    };
  },
};
const BRIVIS_WOMBAT: Family = {
  key: "brivis-wombat",
  matches: has(/wombat|2PW\d\dN/i),
  copy: (u) => ({
    title: `The Brivis Classic Wombat ${/2PW20|20NG/i.test(u.all) ? "21" : "15.5"}kW is an internal ducted gas heater for natural gas.`,
    saves: `It's rated 3.8 stars, which Brivis says makes it one of the highest-rated 3-star heaters available. ${STAR_STEP} There's no pilot light burning gas between runs.`,
    features: "It's made in Australia, installs out of sight in the roof space and splits in two for easier handling, and Networker or wifi control is available with an extra module.",
    choose: "Compared with the Brivis Compact Classic below it, it has a higher star rating (3.8 against 3.0 to 3.5) and a longer warranty (5 years against 3). Zoning needs a StarPro.",
    warranty: BRIVIS_HEATER_WARRANTY,
  }),
};
const BRIVIS_COMPACT: Family = {
  key: "brivis-compact-classic",
  matches: has(/compact classic|CC3\d\dIN/i),
  copy: (u) => {
    const big = /CC320|19\s*kw/i.test(u.all);
    return {
      title: `The Brivis Compact Classic ${big ? "19.5" : "15"}kW is an internal ducted gas heater for natural gas, with a manual controller.`,
      saves: `It's rated ${big ? "3.5" : "3.0"} stars. ${STAR_STEP} There's no pilot light burning gas between runs.`,
      features: "It's made in Australia, low-profile, compact and splittable for tight roof spaces, with a three-speed fan and a large digital display on the controller.",
      choose: "Compared with the Brivis Wombat, it's much smaller (724mm long against 1,187mm), so it fits roof spaces a Wombat won't, and it costs less. The Wombat has the higher star rating and the longer warranty.",
      warranty: "Brivis: 3 years parts and labour on the Compact Classic, and 10 years on the heat exchanger and burner (parts). Servicing every 2 years is a condition of the warranty.",
    };
  },
};
const BRIVIS_STARPRO: Family = {
  key: "brivis-starpro-6",
  matches: has(/starpro|SP615/i),
  copy: () => ({
    title: "The Brivis StarPro 6 (SP615IN) is a 15kW 6-star internal ducted gas heater for natural gas.",
    saves: "Brivis estimates a 6-star heater uses about 30% less gas than a standard 3.0-star one: around $814 a year in its test home (220 m², 600 hours a year, gas at 3.01c/MJ).",
    features: "It's made in Australia and condensing, with a modulating gas valve, a 4-pass heat exchanger and up to 16 fan speeds, and it works with ZonePlus zoning (up to 4 zones) and wifi control.",
    choose: "Compared with the 15.5kW Brivis Wombat (3.8 stars), it rates more than two stars higher, each worth about 10% less gas by Brivis's measure, and adds modulation and zoning.",
    warranty: BRIVIS_HEATER_WARRANTY,
  }),
};
const BRAEMAR_ECOSTAR: Family = {
  key: "braemar-ecostar-tqm618",
  matches: has(/TQM618|ecostar/i),
  copy: () => ({
    title: "The Braemar Ecostar (TQM618) is a 6-star 17.9kW ducted gas heater for natural gas.",
    saves: "It's rated 6.3 stars equivalent in Australian Gas Association testing, above the label's 6-star top. Braemar puts each star at about 10% less gas, and estimates a 6-star heater saves about $966 a year over a 3-star (240 m² home, 600 hours a year, gas at 3.26c/MJ).",
    features: "It's Australian made, with modulating gas control, a Tri-Action heat exchanger and the Stealth Softair fan system for steady warm air without cold draughts, and zoning is available with the MagIQtouch controller.",
    choose: "It's Braemar's most efficient heater.",
    warranty: "Braemar: 5 years comprehensive cover for home use (7 when bought through a participating dealer), plus 10 years on the heat exchanger and burner (parts only). Servicing every 2 years as set out in the owner's manual is a condition.",
  }),
};
const KADEN_KN315: Family = {
  key: "kaden-kn315",
  matches: has(/KN315/i),
  copy: () => ({
    title: "The Kaden KN315INT is a 15kW 3-star internal ducted gas heater for natural gas, with a digital manual controller.",
    saves: "It's rated 3 stars. Kaden says each extra star saves around 10% on running costs, and there's no pilot light burning gas while it's off.",
    features: "It's compact and splittable, installs in the roof space or under the floor, has a three-speed fan, and takes add-on cooling up to 10kW.",
    choose: "It's a compact heater with 5 years parts and labour from Kaden, and 10 years on the heat exchanger and burner.",
    warranty: "Kaden: 5 years parts and labour (7 with registration within 12 months and a Rinnai service in year 4), and 10 years on the heat exchanger and burner (parts). Servicing as set out in the owner's manual is a condition.",
  }),
};
const KADEN_KUN320: Family = {
  key: "kaden-kun320",
  matches: has(/KUN320/i),
  copy: () => ({
    title: "The Kaden Universal KUN320 is a 19kW 3-star ducted gas heater for natural gas, with a manual controller.",
    saves: "It's rated 3 stars. Kaden says each extra star saves around 10% on running costs, and there's no pilot light burning gas while it's off.",
    features: "Its Universal cabinet can go in the roof space, under the floor or outside. It's splittable, has a three-speed fan, and takes add-on cooling up to 10kW.",
    choose: "Compared with Kaden's internal-only models, it can go inside or out, so it suits wherever your old heater sat, with 5 years parts and labour.",
    warranty: "Kaden: 5 years parts and labour (7 with registration within 12 months and a Rinnai service in year 4), and 10 years on the heat exchanger and burner (parts). Servicing as set out in the owner's manual is a condition.",
  }),
};
const BRAEMAR_DOMINATOR: Family = {
  key: "braemar-dominator",
  matches: has(/dominator/i),
  copy: (u) => {
    // The pricebook's "Series 3 - External" (KGHV200A1S) is the earlier KGHV model.
    const s3 = /KCDB195|KGDB195|18\s*kw/i.test(u.all);
    const m = s3 ? { heat: "17.9", cool: "16.5" } : { heat: "17", cool: "13.2" };
    return {
      title: `The Braemar Dominator is a ${m.heat}kW ducted reverse cycle system, made to replace a ducted gas heater.`,
      saves: "Your heating comes off gas. Braemar says its heat pump gives 3 to 4 units of heat for every unit of electricity, with a seasonal heating rating of HSPF 3.4 in Melbourne's cold zone.",
      features: `Its indoor unit is made in Albury, NSW, to sit where your gas heater is now, on your existing ducts and outlets. It adds ${m.cool}kW of refrigerated cooling, with optional zoning up to 8 zones.`,
      choose: "Compared with a full new ducted system, it reuses your ductwork and avoids ceiling work. Compared with keeping gas, one system heats and cools; the air from the outlets is a little cooler than a gas heater's (40 to 50°C against about 53°C).",
      warranty: "Braemar: 5 years comprehensive cover for home use, with servicing as set out in the owner's manual.",
    };
  },
};

// --- Heat pump hot water: Reclaim, Panasonic, Thermann, iStore ------------------------
// reclaimenergy.com.au (CO2 brochure, V2 manual, warranty booklet Issue 19 Sep 2026, Eco
// R290 manual), panasonic.com/au (CO2 range launch: 10 years parts and labour),
// thermann.com.au (Integrated Heat Pump manual), istore.net.au (manual, warranty); STC
// counts from the Clean Energy Regulator, the locally made list from Solar Victoria's
// list of 4 Nov 2026. Checked 17 Nov 2026. Where Reclaim's booklet contradicts itself
// on tank labour, the tank line gives parts only.
const RECLAIM_SAVES = "Reclaim says it uses up to 80% less electricity than a conventional electric water heater, and it needs no booster element, even at -10°C outside.";
const v2 = (u: Unit) => /\bV2\b/i.test(u.all);
const reclaimVersion = (u: Unit) => v2(u)
  ? { label: "V2 with wifi controller", controller: "The wifi controller and app give you 8 modes, solar and off-peak timers, holiday mode, boost and fault alerts.", hp: "Heat pump and wifi controller: 10 years parts and labour.", rebate: " It's eligible for STCs, VEU and Solar Victoria's higher locally made rebate.", vs: "The V2 adds app control and a 10-year heat pump warranty (7 on the V1)." }
  : { label: "V1", controller: "Its six-mode controller has off-peak and solar timers.", hp: "Heat pump and controller: 7 years parts and labour.", rebate: " It's eligible for STC and VEU discounts.", vs: "The V2 adds app control and a longer heat pump warranty, if you'd like them." };
const RECLAIM_TAIL = "Licensed installation and Reclaim's water quality limits apply.";
const RECLAIM_DUPLEX: Family = {
  key: "reclaim-co2-duplex",
  matches: has(/reclaim split.*duplex/i),
  copy: (u) => {
    const v = reclaimVersion(u);
    return {
      title: `This is Reclaim Energy's CO2 split heat pump with a 315L duplex stainless steel tank (${v.label}).`,
      saves: `${RECLAIM_SAVES} It's eligible for STC and VEU discounts and Solar Victoria's hot water rebate.`,
      features: `The inner tank and casing are 2205 duplex stainless with 65mm insulation. It uses natural CO2 refrigerant, and the outdoor heat pump is rated at 37 dB and makes water at 63°C. ${v.controller}`,
      choose: `The duplex tank is about 100mm shorter than Reclaim's standard 315L stainless tank. ${v.vs}`,
      warranty: `Tank: 15 years parts (full replacement to year 6, then pro-rata). ${v.hp} ${RECLAIM_TAIL}`,
    };
  },
};
const RECLAIM_GL: Family = {
  key: "reclaim-co2-glass",
  matches: has(/reclaim split\s*-\s*glass lined/i),
  copy: (u) => {
    const v = reclaimVersion(u);
    return {
      title: `This is Reclaim Energy's CO2 split heat pump with a ${grab(u, /(\d{3})\s*l/i)}L glass-lined tank (${v.label}).`,
      saves: `${RECLAIM_SAVES}${v.rebate}`,
      features: `It uses natural CO2 refrigerant, the outdoor heat pump is rated at 37 dB and makes water at 63°C, and the tank is made in Australia. ${v.controller}`,
      choose: `Reclaim recommends glass-lined for a wider range of water supplies than its stainless tank, at a lower price. ${v.vs}`,
      warranty: `Tank: 10 years parts. ${v.hp} ${RECLAIM_TAIL}`,
    };
  },
};
const RECLAIM_SS: Family = {
  key: "reclaim-co2-stainless",
  matches: has(/reclaim split\s*-\s*stainless/i),
  copy: (u) => {
    const v = reclaimVersion(u), ew = /earth\s*worker/i.test(u.all);
    return {
      title: `This is Reclaim Energy's CO2 split heat pump with a ${grab(u, /(\d{3})\s*l/i)}L stainless steel tank${ew ? " made by Earthworker" : ""} (${v.label}).`,
      saves: `${RECLAIM_SAVES}${v.rebate}`,
      features: `It uses natural CO2 refrigerant, and the outdoor heat pump is rated at 37 dB and makes water at 63°C. ${v.controller}`,
      choose: `Compared with Reclaim's glass-lined tank, stainless gives 15 years of tank cover instead of 10, where your water suits it. ${v.vs}`,
      warranty: `Tank: 15 years parts (full replacement to year 6, then pro-rata). ${v.hp} ${RECLAIM_TAIL}`,
    };
  },
};
const PANASONIC: Family = {
  key: "reclaim-x-panasonic",
  matches: has(/reclaim x panasonic|HE-UM\d0CR/i),
  copy: (u) => {
    const six = /\b6\s*kw\b|UM60/i.test(u.all), ss = /stainless/i.test(u.all);
    return {
      title: `This is Panasonic's ${six ? "6kW HE-UM60CR" : "4kW HE-UM40CR"} CO2 heat pump with a ${grab(u, /(\d{3})\s*l/i)}L ${ss ? "stainless steel" : "glass-lined"} tank.`,
      saves: `Panasonic says it makes hot water with no electric booster, even at -10°C outside.${six ? "" : " Panasonic rates the 4kW at COP 5.0 (32.5°C air, 21°C inlet water)."} It's eligible for STCs, VEU and Solar Victoria's higher locally made rebate.`,
      features: "It uses natural CO2 refrigerant, and the Japanese-made Panasonic outdoor heat pump is rated at 37 dB and works from -10°C to 43°C. It works with your solar without extra hardware.",
      choose: `Compared with Reclaim's own CO2 heat pump, you get Panasonic's heat pump and Panasonic's 10-year warranty.${six ? " The 6kW has more capacity than Reclaim's 5.24kW unit, for faster reheating." : ""}`,
      warranty: "Panasonic backs its CO2 heat pump range with 10 years parts and labour.",
    };
  },
};
const RECLAIM_ECO: Family = {
  key: "reclaim-eco-r290",
  matches: has(/reclaim heat pump\s+(200|300)\s*l|REC25P/i),
  copy: (u) => {
    const big = /300/.test(u.all);
    return {
      title: `The Reclaim Eco R290 ${big ? "300" : "200"}L is an all-in-one heat pump that plugs in.`,
      saves: `Reclaim rates it at COP ${big ? "4.63" : "4.23"} at 20°C air, heating water from 20°C to 60°C. It's eligible for STCs, VEU and Solar Victoria's higher locally made rebate.`,
      features: "The tank and heat pump sit together in one outdoor unit on a standard 10A plug, using natural R290 refrigerant. The app gives you Eco, Boost, Holiday and solar or off-peak schedules, there's a 1.2kW backup element, and it's made in Australia.",
      choose: "It has 8 years parts and labour on the tank and the heat pump, and the standard plug means there's no hard wiring.",
      warranty: "In a single-family home: tank and refrigeration parts 8 years parts and labour; sensors, valves, element and anode 1 year. A Solar Homes rebate adds a 5-year whole-of-product warranty with labour.",
    };
  },
};
const THERMANN_HP: Family = {
  key: "thermann-integrated-hp",
  matches: has(/thermann heat pump\s+(200|285)\s*l|THC25P/i),
  copy: (u) => {
    const big = /285|300THC/i.test(u.all);
    return {
      title: `The Thermann ${big ? "285" : "200"}L is an R290 integrated heat pump that plugs in.`,
      saves: `Thermann's VEU-approved simulation puts it at up to ${big ? "70.7" : "69.3"}% less energy than a standard electric water heater for a medium household. It's eligible for STCs, VEU and Solar Victoria's higher locally made rebate.`,
      features: "The tank and heat pump sit together in one outdoor unit on a standard 10A plug. The heat pump runs from -6°C to 45°C, with a 1.2kW element beyond that, and the controller and app give you schedule, holiday, boost and rescue modes.",
      choose: "It's locally made, which can mean a higher Solar Victoria rebate, with 7 years on the tank.",
      warranty: "In a single-family home: tank 7 years parts and 3 years labour; heat pump and controller 3 years parts and labour; other parts 1 year. A Solar Homes rebate adds a 5-year whole-of-product warranty with labour.",
    };
  },
};
const ISTORE: Family = {
  key: "istore-r290",
  matches: has(/istore/i),
  copy: (u) => {
    const big = /270/.test(u.all);
    return {
      title: `The iStore ${big ? "270" : "180"}L is an all-in-one heat pump using natural R290 refrigerant.`,
      saves: `iStore says it uses up to 70% less hot water energy than conventional electric storage, based on about 200L a day.${big ? " It's rated at COP 4.82 at about 20°C air, heating from 15°C to 60°C." : ""} It's eligible for STCs, VEU and Solar Victoria's hot water rebate.`,
      features: `The tank and heat pump sit together in one outdoor unit${big ? ", putting out more than 4kW of heat at 46.6 dB or less at 1m" : ", with 2.5kW of heat output"}, and it has a solar-hours timer and an electric booster.`,
      choose: "iStore's 5-year warranty covers parts and labour on everything, the heat pump included.",
      warranty: "5 years parts and labour on the tank, refrigeration, electrical parts, anode and relief valve. Register online within 6 weeks of installation. Licensed installation and iStore's water quality limits apply.",
    };
  },
};

/** In order: the first match wins, so the Contour 7 comes before the Contour. */
const FAMILIES: Family[] = [
  MITSU_SPLIT, MITSU_HEAD, MITSU_MULTI, MITSU_DUCTED,
  KADEN_SPLIT, KADEN_HEAD, KADEN_MULTI, KADEN_DUCTED, KADEN_WINDOW,
  RINNAI_HEAD, RINNAI_MULTI, ZONEMATE,
  RECLAIM_DUPLEX, RECLAIM_GL, RECLAIM_SS, PANASONIC, RECLAIM_ECO, THERMANN_HP, ISTORE,
  BRIVIS_BUFFALO_3, BRIVIS_BUFFALO_5, BRIVIS_WOMBAT, BRIVIS_COMPACT, BRIVIS_STARPRO, BRAEMAR_ECOSTAR, KADEN_KN315, KADEN_KUN320, BRAEMAR_DOMINATOR,
  THERMANN_GAS, THERMANN_SMART, THERMANN_CF,
  BRIVIS_ADVANCE, BRIVIS_PROMINA, BRIVIS_CONTOUR_7, BRIVIS_CONTOUR, BRIVIS_BALAERO, KADEN_KC32,
  BOSCH_COOKTOP, BEKO_COOKTOP, WESTINGHOUSE_COOKTOP, BOSCH_RANGEHOOD,
];

/** The description for a pricebook unit, or null when no family covers it (it keeps its own). */
export function equipmentCopy(e: EquipmentFacts): { family: string; text: string } | null {
  const u: Unit = { name: e.name.trim(), model: (e.model ?? "").trim(), all: `${e.name} ${e.model ?? ""} ${e.code ?? ""}` };
  const f = FAMILIES.find((x) => x.matches(u));
  return f ? { family: f.key, text: copyText(f.copy(u)) } : null;
}

export const equipmentFamilies = () => FAMILIES.map((f) => f.key);
