/**
 * What each unit's line says on a quote (Jake, 17 Nov): "how it saves money,
 * the key feature, why it's better than its other model, like Mitsubishi vs
 * other brand or a Promina vs another model below it, the warranty". The job
 * itself (what we do, remove, include) is the template summary (wording.ts).
 *
 * Every description is the unit's name and four labelled paragraphs, the same
 * four on every unit, so a customer comparing options reads like for like.
 * Facts are the manufacturer's own (sources by family below); a figure the
 * manufacturer doesn't publish isn't here. Pure, for scripts/check-quote-templates.ts;
 * quoteWording.ts writes them to the pricebook and onto every template line.
 */

export type EquipmentFacts = { name: string; model?: string | null; code?: string | null };

export const EQUIPMENT_LABELS = {
  saves: "Why it saves you money:",
  features: "Key features:",
  choose: "Why choose it:",
  warranty: "Warranty:",
} as const;

/** Our own cover, after the manufacturer's, on every unit we install (brands.ts). */
export const WORKMANSHIP = "Plus our 6-year workmanship warranty on the installation.";

export type Copy = { title: string; saves: string; features: string; choose: string; warranty: string };

/** One description, in the one order. */
export const copyText = (c: Copy) =>
  [c.title, `${EQUIPMENT_LABELS.saves} ${c.saves}`, `${EQUIPMENT_LABELS.features} ${c.features}`, `${EQUIPMENT_LABELS.choose} ${c.choose}`, `${EQUIPMENT_LABELS.warranty} ${c.warranty} ${WORKMANSHIP}`]
    .map((p) => p.trim().replace(/\s+/g, " ")).join("\n\n");

type Unit = { name: string; model: string; all: string };
type Family = { key: string; matches: (u: Unit) => boolean; copy: (u: Unit) => Copy };

const has = (re: RegExp) => (u: Unit) => re.test(u.all);
const grab = (u: Unit, re: RegExp) => re.exec(u.all)?.[1] ?? "";
/** The roof colour, as the pricebook spells it several ways ("Char", "T'cotta red"). */
const colourOf = (u: Unit) => {
  const c = /terra|t'?cotta|\bred\b/i.test(u.all) ? "Terra Red" : /\bchar(coal)?\b/i.test(u.all) ? "Charcoal" : /beige/i.test(u.all) ? "Beige" : "";
  return c ? `, ${c}` : "";
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
      title: `Thermann 4-star ${l}L gas storage hot water system, installed outdoors.`,
      saves: "Thermann says gas storage usually costs less to buy and install than other types, with no gas line upgrade needed, and it fits the footprint of older square gas units. It's 4-star rated. The trade-off is that the tank loses some heat whether you use the water or not.",
      features: `Full mains pressure. Adjustable thermostat. Sized by Thermann for ${l === "135" ? "2 to 4" : "3 to 5"} people. Made in Australia.`,
      choose: "Compared with gas continuous flow, such as the Thermann G-Series, it costs less up front and keeps hot water stored ready to use. Continuous flow or a heat pump costs less to run, and we can price either for you.",
      warranty: "Thermann, in a single-family home: 7 years on the tank and 1 year parts and labour, from installation. After the first year a replacement tank is covered, but not the labour to fit it.",
    };
  },
};
const THERMANN_SMART: Family = {
  key: "thermann-smart-electric",
  matches: has(/thermann smart electric/i),
  copy: (u) => ({
    title: `Thermann Smart Electric ${grab(u, /(125|160)\s*l/i)}L 3kW electric storage hot water system, with built-in wifi.`,
    saves: "The Thermann app shows your hot water's energy use and power cost, and lets you choose when the tank heats: Schedule for solar or cheaper time-of-use hours, Eco to learn your household's pattern, Manual for a lower temperature, and Holiday to switch it off while you're away.",
    features: "3kW element. The anti-legionella cycle is kept in every mode. Works as a normal tank without wifi (it needs a 2.4GHz network for the app). Made in Australia.",
    choose: "Compared with a standard Thermann electric tank, it's the same tank with app control and longer cover on the electronics. A heat pump uses far less power again: Thermann puts it at about 70% less energy than a standard electric tank.",
    warranty: "Thermann, in a single-family home: 10 years on the tank, 3 years on the wifi module, thermostat and element, and 1 year on labour.",
  }),
};
const THERMANN_CF: Family = {
  key: "thermann-g-series",
  matches: has(/g-series\s*26/i),
  copy: () => ({
    title: "Thermann G-Series 26L continuous flow gas hot water system, natural gas, preset to 50°C.",
    saves: "It heats water only while a hot tap is running, so there's no tank losing heat all day. Thermann rates the 26L at up to 6.7 stars, against 4 stars for a gas storage tank.",
    features: "26 litres a minute at a 25°C rise, enough for 2 to 3 bathrooms at once. Never runs out. Compact outdoor wall unit with built-in frost protection. Japanese made.",
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
    title: `Brivis Advance ${sizeOf(u, /\b(F\d\dDS?)\b/i)} evaporative cooler${colourOf(u)}.`,
    saves: EVAP_SAVES,
    features: "Traditional cabinet with a large cooling pad area for high airflow. Motorised winter seal, so no cold draughts in winter. AutoRefresh and FreshStart keep the water fresh. Pre-wet cycle, quiet fan, variable speeds. Australian made.",
    choose: "The best value of the three Brivis ranges we fit (Advance, Promina, Contour), and still a step up from a basic traditional cooler such as the Kaden Classic: the Brivis warranty can be extended to 9 years rather than 7, and it takes the Brivis Touch and Networker controllers.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_PROMINA: Family = {
  key: "brivis-promina",
  matches: has(/brivis promina/i),
  copy: (u) => ({
    title: `Brivis Promina ${sizeOf(u, /\b(P\d\d)\b/i)} slimline evaporative cooler${colourOf(u)}.`,
    saves: EVAP_SAVES,
    features: "Low-profile sloping base, so it sits lower on the roof. Cooling pads up to 130mm thick. AutoRefresh and FreshStart keep the water fresh. Pre-wet cycle, quiet fan. A winter seal is available as an add-on. Australian made.",
    choose: "Compared with the Advance below it, the Promina's slimline shape sits lower and neater on the roofline, with thicker pads on the larger sizes. The Advance has the bigger pad area and a motorised winter seal as standard.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_CONTOUR_7: Family = {
  key: "brivis-contour-7",
  matches: has(/brivis contour\s+l\d7\b/i),
  copy: (u) => ({
    title: `Brivis Contour 7 Series ${sizeOf(u, /\b(L\d7)\b/i)} slimline evaporative cooler with EC fan motor${colourOf(u)}.`,
    saves: `${EVAP_SAVES} Its EC fan motor uses on average 45% less energy than Brivis's standard motor (about 20% less at high speed, 70% at low), and AquaSave uses up to 45% less water than a conventional cooler with a bleed system.`,
    features: "Low-profile sloping base. Motorised winter seal. Cooling pads up to 130mm thick. Pre-wet cycle and FreshStart. Australian made.",
    choose: "Compared with the standard Contour, it's the same cooler with an EC motor that uses less power, most of all at low fan speeds.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_CONTOUR: Family = {
  key: "brivis-contour",
  matches: has(/brivis contour/i),
  copy: (u) => ({
    title: `Brivis Contour ${sizeOf(u, /\b(L\d\d)\b/i)} slimline evaporative cooler${colourOf(u)}.`,
    saves: `${EVAP_SAVES} AquaSave water management uses up to 45% less water than a conventional cooler with a bleed system, and its small reservoir means less water is dumped when it's turned off.`,
    features: "Low-profile sloping base. Motorised winter seal. Cooling pads up to 130mm thick. Pre-wet cycle, and stagnant water drained when it's off. Quiet fan. Australian made.",
    choose: "The top of the three Brivis ranges we fit. Compared with the Promina below it, the Contour adds AquaSave and a motorised winter seal as standard, with a larger pad area from the L46 up.",
    warranty: BRIVIS_EVAP_WARRANTY,
  }),
};
const BRIVIS_BALAERO: Family = {
  key: "brivis-balaero",
  matches: has(/balaero/i),
  copy: (u) => {
    const size = grab(u, /balaero\s*(50|70)/i) || grab(u, /\bB(50|70)BAL\b/i);
    return {
      title: `Brivis Balaero ${size} evaporative cooler for bushfire-prone areas, Charcoal.`,
      saves: EVAP_SAVES,
      features: `Stainless steel ember protection, engineered to meet Bushfire Attack Level 12.5. Gravity-closing winter seal ${size === "70" ? "fitted" : "available as an add-on"}. 100mm cooling pads, variable fan speeds, pre-wet cycle.`,
      choose: "Compared with the Advance, the Balaero is built for bushfire-prone sites rated up to BAL-12.5 (your builder or council confirms your site's rating). Where that isn't needed, the Advance has more features for the money.",
      warranty: "Brivis: 5 years parts and labour, with servicing every two years by an authorised Brivis technician a condition of the warranty.",
    };
  },
};
const KADEN_KC32: Family = {
  key: "kaden-kc32",
  matches: has(/\bKC32\b/i),
  copy: () => ({
    title: "Kaden Classic KC32 evaporative cooler, Charcoal, with manual wall controller.",
    saves: "Kaden says evaporative cooling uses considerably less energy than a comparable ducted refrigerated system. It cools best on hot, dry days, with a window or door open.",
    features: "The largest Kaden Classic: 1000W motor and 3,290 L/s airflow. High-efficiency pads, Smart Water Management, automatic winter seal, pre-wet cycle, self-cleaning pump, quiet fan. Made by Rinnai.",
    choose: "Compared with the Brivis Advance, which Rinnai makes in the same size cabinet, the Kaden is the simpler, lower-cost option. Its extended warranty tops out at 7 years rather than 9.",
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
    title: "Bosch Series 4 60cm gas cooktop with wok burner, black glass (PNK6B6K40A).",
    saves: "A 1kW economy burner for simmering and small pans, so you're not running a big burner for a small job. Dishwasher-safe pan supports, and an LPG nozzle set in the box if you ever change gas supply.",
    features: "Four burners: a 3.5kW wok, two 1.75kW and a 1kW economy. Flame failure safety cuts the gas if a flame goes out. Black tempered glass with bevelled edges, front-right controls, cast iron pan supports, ignition built into the knobs.",
    choose: "Compared with the Westinghouse stainless cooktop, the Bosch is the glass-top option: easier to wipe down, with dishwasher-safe supports. The Westinghouse has more total heat output.",
    warranty: "Bosch: 2 years from purchase against defects in materials and workmanship, for domestic use.",
  }),
};
const BEKO_COOKTOP: Family = {
  key: "beko-bct60gx1",
  matches: has(/BCT60GX1|beko 60\s*cm stainless steel gas cooktop/i),
  copy: () => ({
    title: "Beko 60cm stainless steel gas cooktop with wok burner (BCT60GX1).",
    saves: "Register it with Beko within 90 days and the warranty runs 5 years instead of 2, at no charge. An LPG conversion kit is included.",
    features: "Four burners, including a 5kW wok burner front left. Flame failure safety shuts off the gas if a flame goes out. Cast iron pan supports, electronic ignition, stainless steel finish.",
    choose: "Compared with the Westinghouse stainless cooktop, the Beko has the stronger wok burner and the longer warranty once registered. The Westinghouse has more total output across its four burners.",
    warranty: "Beko: 2 years from purchase, extended to 5 years at no charge if you register it on Beko's website within 90 days.",
  }),
};
const WESTINGHOUSE_COOKTOP: Family = {
  key: "westinghouse-whg644sc",
  matches: has(/WHG644SC|westinghouse 60cm 4 burner/i),
  copy: () => ({
    title: "Westinghouse 60cm 4-burner natural gas cooktop, stainless steel (WHG644SC).",
    saves: "An LP gas conversion kit is included, and the ignition runs off mains power, so there are no batteries to replace.",
    features: "40.6 MJ/h across four burners: a 14.4 MJ/h triple-ring wok, a 12.1 MJ/h rapid, a 9.0 MJ/h semi-rapid and a 5.1 MJ/h simmer. Flame failure device cuts the gas if a flame goes out. Flat cast iron trivets, under-knob ignition.",
    choose: "Compared with the Beko, the Westinghouse has more total heat across its four burners. The Beko has the stronger single wok burner and a longer warranty once registered.",
    warranty: "Westinghouse: 2 years from purchase, with faulty parts repaired or replaced at no charge, for domestic use.",
  }),
};
const BOSCH_RANGEHOOD: Family = {
  key: "bosch-dhl555bau",
  matches: has(/DHL555BAU|bosch 53cm series 4 under cupboard rangehood/i),
  copy: () => ({
    title: "Bosch Series 4 53cm under-cupboard rangehood, silver (DHL555BAU).",
    saves: "LED lighting, and washable aluminium grease filters that go in the dishwasher, so there are no paper filters to keep buying when it's ducted outside.",
    features: "Three speeds plus an intensive setting for steam and strong smells: up to 420 m³/h, or 650 m³/h on intensive, ducted outside. Slide control. Fits neatly into a 500mm overhead cupboard.",
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
  "2.5": { cool: "2.5", heat: "3.2", cs: "6", hs: "3", vs: "Compared with Kaden's 2.5kW, our value option, it rates a star higher for cooling (6 against 5) and gives more heat (3.2 against 2.8kW)." },
  "3.5": { cool: "3.5", heat: "3.7", cs: "5", hs: "3", vs: "Compared with Kaden's 3.5kW, our value option, it rates half a star higher for heating (3 against 2.5)." },
  "5": { cool: "5.0", heat: "6.0", cs: "4.5", hs: "2", vs: "Compared with Kaden's 5kW, our value option, it gives more heat (6.0 against 5.5kW) for the same star ratings." },
  "6": { cool: "6.0", heat: "6.8", cs: "4.5", hs: "2.5", vs: "Kaden, our value option, doesn't make a 6kW split, and this size rates half a star higher for heating than Kaden's 5 and 7kW." },
  "7.1": { cool: "7.1", heat: "8.0", cs: "3.5", hs: "2", vs: "Compared with Kaden's 7kW, our value option, it gives more heat (8.0 against 7.5kW)." },
};
const MITSU_SPLIT: Family = {
  key: "mitsubishi-msz-ap-split",
  matches: has(/mitsubishi electric\s+[\d.]+\s*kw\s+split system/i),
  copy: (u) => {
    const k = kwKey(u, /([\d.]+)\s*kw/i), m = MSZ[k] ?? MSZ["3.5"];
    return {
      title: `Mitsubishi Electric MSZ-AP ${m.cool}kW reverse cycle split system.`,
      saves: `An inverter system rated ${m.cs} stars for cooling and ${m.hs} for heating ${ZERL}. Econo Cool raises the cooling set point 2°C without the room feeling any warmer.`,
      features: `${m.cool}kW cooling, ${m.heat}kW heating. Built-in wifi. Dual Barrier Coating keeps the indoor coil cleaner, and Blue Fin coating protects the outdoor coil from corrosion. Heats down to -15°C outside.`,
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
      title: `Mitsubishi Electric MSZ-AP ${k}kW wall-mounted indoor unit for a multi-split system.`,
      saves: "Each room has its own remote and app control, so you run only the rooms you're using. Econo Cool raises the cooling set point 2°C without the room feeling any warmer.",
      features: `${k}kW nominal cooling (the actual output depends on the other units on the system). Built-in wifi. Dual Barrier Coating keeps the coil cleaner. Anti-allergy filter.${MSZ_HEAD_DB[k] ? ` From ${MSZ_HEAD_DB[k]} dB(A) on low fan.` : ""}`,
      choose: "It's the same MSZ-AP unit Mitsubishi sells as a single split, so every room matches, and Mitsubishi's MXZ outdoor units rate more efficient for heating than the Kaden and Rinnai multis we fit.",
      warranty: MITSU_WARRANTY,
    };
  },
};
const MXZ: Record<string, { rooms: string; cool: string; heat: string; cop: string; vs: string }> = {
  "8": { rooms: "4", cool: "8.0", heat: "8.8", cop: "5.2", vs: "It rates more efficient for heating than the comparable Kaden and Rinnai multis we fit." },
  "10": { rooms: "5", cool: "10.0", heat: "10.0", cop: "4.8", vs: "It rates more efficient for heating than the comparable Kaden and Rinnai multis we fit." },
  "12": { rooms: "6", cool: "12.0", heat: "13.2", cop: "4.4", vs: "It rates more efficient for heating and cooling than the comparable Kaden and Rinnai six-room multis we fit." },
};
const MITSU_MULTI: Family = {
  key: "mitsubishi-mxz-multi",
  matches: has(/mitsubishi electric\s+\d+\s*kw\s+multi condenser/i),
  copy: (u) => {
    const k = kwKey(u, /(\d+)\s*kw/i), m = MXZ[k] ?? MXZ["10"];
    return {
      title: `Mitsubishi Electric MXZ ${m.cool}kW multi-split outdoor unit, for up to ${m.rooms} rooms.`,
      saves: `Each room is controlled separately, so you run only the rooms in use. In Mitsubishi's standard heating test (7°C outside) it makes about ${m.cop}kW of heat for every kW of power it uses.`,
      features: `${m.cool}kW cooling and ${m.heat}kW heating across up to ${m.rooms} indoor units. Inverter, R32 refrigerant.`,
      choose: `Compared with separate splits, there's one outdoor unit instead of ${m.rooms}. ${m.vs}`,
      warranty: MITSU_WARRANTY,
    };
  },
};
const PEA: Record<string, { cool: string; heat: string; cop: string; db: string; pa: string; vs: string }> = {
  "12": { cool: "12.5", heat: "14.0", cop: "4.6", db: "35", pa: "150", vs: "it rates more efficient for heating and cooling than Kaden's 12.5kW ducted" },
  "16": { cool: "16.0", heat: "18.0", cop: "4.0", db: "35", pa: "150", vs: "it matches Kaden's 17kW ducted for heating efficiency and beats it for cooling" },
  "18": { cool: "18.0", heat: "20.0", cop: "4.1", db: "30", pa: "250", vs: "it's bigger than Kaden's largest ducted (17kW) and a little more efficient for heating" },
};
const MITSU_DUCTED: Family = {
  key: "mitsubishi-pea-m-ducted",
  matches: has(/mitsubishi electric\s+\d+\s*kw\s+ducted/i),
  copy: (u) => {
    const k = kwKey(u, /(\d+)\s*kw/i), m = PEA[k] ?? PEA["16"];
    return {
      title: `Mitsubishi Electric PEA-M ${m.cool}kW ducted reverse cycle system, single phase.`,
      saves: `A Power Inverter outdoor unit that, in Mitsubishi's standard heating test (7°C outside), makes about ${m.cop}kW of heat for every kW of power it uses. With zoning you heat and cool only the rooms in use.`,
      features: `${m.cool}kW cooling, ${m.heat}kW heating. Indoor unit from ${m.db} dB(A). Fan pressure up to ${m.pa} Pa for long duct runs. Two-piece indoor unit to fit tight roof spaces. Heats down to -20°C outside.`,
      choose: `Compared with Kaden's ducted, our value option, ${m.vs}. It's also quieter on low fan, and keeps heating down to -20°C outside against Kaden's -15°C.`,
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
const KADEN_VALUE = "Kaden is the value range we fit: it costs less than Mitsubishi Electric and carries a longer warranty (7 years against 5), with star ratings within a star of Mitsubishi's at every size.";
const KADEN_SPLIT: Family = {
  key: "kaden-ksi-v3-split",
  matches: has(/kaden ksi\s+[\d.]+\s*kw\s+v3/i),
  copy: (u) => {
    const k = kwKey(u, /ksi\s+([\d.]+)\s*kw/i), m = KSI[k] ?? KSI["3.5"];
    return {
      title: `Kaden KSI V3 ${m.cool}kW reverse cycle split system.`,
      saves: `An inverter system rated ${m.cs} stars for cooling and ${m.hs} for heating ${ZERL}. Kaden says ECO mode uses up to 60% less energy than normal running, for 8 hours at a time.`,
      features: `${m.cool}kW cooling, ${m.heat}kW heating. Built-in wifi and voice control. Anti-corrosion gold-fin coating, self-clean mode and a three-in-one filter. Heats down to -15°C outside.`,
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
      title: `Kaden KSI ${k}kW wall-mounted indoor unit for a Kaden multi-split system.`,
      saves: "Each room has its own controls, so you run only the rooms you're using. Kaden says ECO mode uses up to 60% less energy than normal running, for 8 hours at a time.",
      features: `${k}kW nominal cooling (the actual output depends on the rest of the system). Wifi included. Gold-fin coating, self-clean mode and a three-in-one filter.`,
      choose: "Compared with Mitsubishi Electric's multi heads, it costs less and the warranty is longer (7 years against 5), and Kaden's outdoor units go up to 17.5kW across six rooms.",
      warranty: KADEN_WARRANTY,
    };
  },
};
const KM: Record<string, { model: string; rooms: string; cool: string; heat: string; cs: string; hs: string; vs: string }> = {
  KM48: { model: "KM48", rooms: "5", cool: "13.0", heat: "13.5", cs: "3.5", hs: "2.5", vs: "it has more capacity for five rooms (13 against 10kW)" },
  KM60: { model: "KM60", rooms: "6", cool: "17.5", heat: "19.5", cs: "3.5", hs: "2", vs: "it has more capacity for six rooms (17.5 against 12kW)" },
};
const KADEN_MULTI: Family = {
  key: "kaden-km-multi",
  matches: has(/\bKM(48|60)\b|kaden\s+13\s*kw\s+multi/i),
  copy: (u) => {
    const m = /KM60/i.test(u.all) ? KM.KM60 : KM.KM48;
    return {
      title: `Kaden ${m.model} ${m.cool}kW multi-split outdoor unit, for up to ${m.rooms} rooms.`,
      saves: `An inverter system rated ${m.cs} stars for cooling and ${m.hs} for heating ${ZERL}, and you run only the rooms in use.`,
      features: `${m.cool}kW cooling and ${m.heat}kW heating across up to ${m.rooms} wall, ducted or cassette indoor units. Heats down to -15°C outside. R32 refrigerant.`,
      choose: `Compared with separate splits, there's one outdoor unit instead of ${m.rooms}. Compared with Mitsubishi Electric's multis, ${m.vs}, with a longer warranty (7 years against 5).`,
      warranty: KADEN_WARRANTY,
    };
  },
};
const KADEN_DUCTED: Family = {
  key: "kaden-kdi-ducted",
  matches: has(/KDI-17|kaden ducted split 17/i),
  copy: () => ({
    title: "Kaden KDI V2 17kW ducted reverse cycle system, single phase.",
    saves: `An inverter system rated 3.5 stars for cooling and 2 for heating ${ZERL}. With zoning you heat and cool only the rooms in use.`,
    features: "17.0kW cooling, 18.0kW heating. Built-in wifi. Splittable indoor unit for tight roof spaces. Built-in drain pump and weekly timer. Heats down to -15°C outside. R32 refrigerant.",
    choose: "Compared with Mitsubishi Electric's 16 to 18kW ducted, it costs less, has wifi built in and a longer warranty (7 years against 5).",
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
      title: `Kaden ${m.model} ${m.cool}kW reverse cycle window/wall air conditioner.`,
      saves: `It heats or cools just the one room, and you can switch it off from your phone. It's rated 1.5 stars for cooling and 0.5 for heating ${ZERL}, so it's best for a room you use now and then.`,
      features: `${m.cool}kW cooling, ${m.heat}kW heating. One self-contained unit that plugs into a power point. Wifi. Silver-ion filter. Anti-corrosion Blue Fin coating. Heats down to -7°C outside.`,
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
      title: `Rinnai RPX ${m.cool}kW wall-mounted indoor unit for a Rinnai multi-split system.`,
      saves: "You run only the rooms in use. A built-in presence sensor saves energy when the room is empty, and ECO+ fine-tunes cooling for efficiency.",
      features: `${m.cool}kW cooling, ${m.heat}kW heating, nominal (the actual output depends on the rest of the system). Wifi app and voice control. Turbo+ shifts the temperature by up to 6°C in 10 minutes. HEPA filter. Adjustable humidity. Anti-corrosion coil coating.`,
      choose: "Compared with the Kaden heads we also fit, it adds a presence sensor and a HEPA filter. Compared with Mitsubishi Electric's, the warranty is longer (7 years against 5).",
      warranty: RINNAI_WARRANTY,
    };
  },
};
const MON: Record<string, { rooms?: string; cool?: string; heat?: string; acop?: string; vs: string }> = {
  "5": { rooms: "2", cool: "5.4", heat: "5.4", acop: "4.0", vs: "It suits two rooms where only one outdoor unit will fit." },
  // The pricebook's part (MON4H11B1LA) isn't one Rinnai lists, so no figures until it's confirmed.
  "11": { vs: "" },
  "14": { rooms: "5", cool: "13.5", heat: "14.0", acop: "4.2", vs: "It rates a little more efficient for heating than Kaden's 13kW, and it's bigger than any Mitsubishi five-room unit." },
  "19": { rooms: "6", cool: "19.0", heat: "21.5", acop: "4.2", vs: "It's bigger and more efficient for heating than Kaden's six-room 17.5kW, and Mitsubishi's largest multi is 12kW." },
};
const RINNAI_MULTI: Family = {
  key: "rinnai-mon-multi",
  matches: has(/rinnai multi condenser|MON\dH\d\d/i),
  copy: (u) => {
    const k = kwKey(u, /condenser\s+(\d+)\s*kw/i), m = MON[k] ?? MON["14"];
    return {
      title: `Rinnai ${m.cool ?? k}kW multi-split outdoor unit${m.rooms ? `, for up to ${m.rooms} rooms` : ""}.`,
      saves: `An inverter system, and you run only the rooms in use.${m.acop ? ` In Rinnai's standard test it rates ${m.acop} for heating efficiency (ACOP: the higher, the better).` : ""}`,
      features: `${m.cool ? `${m.cool}kW cooling and ${m.heat}kW heating, across` : "Runs"} wall, slim ducted, cassette or floor-console indoor units. Heats down to -15°C outside. Single phase, R32 refrigerant.`,
      choose: `Compared with separate splits, there's one outdoor unit instead of several.${m.vs ? ` ${m.vs}` : ""} Rinnai Australia is based in Braeside, Melbourne.`,
      warranty: RINNAI_WARRANTY,
    };
  },
};
const ZONEMATE: Family = {
  key: "zonemate-touch-pro",
  matches: has(/zonemate/i),
  copy: () => ({
    title: "ZoneMate Touch Pro ducted zone controller, with 4 wireless room sensors.",
    saves: "You heat or cool only the zones in use. Each sensor reads its own room, so a zone eases off when that room reaches temperature, and schedules stop the system running when nobody's home.",
    features: "Wall touchscreen and phone app. Up to 12 zones. Airflow to each zone adjustable in 1% steps. Google Home and Alexa voice control. Works with Mitsubishi Electric and Kaden ducted systems.",
    choose: "A standard ducted controller reads one temperature and switches zones on or off. ZoneMate measures each room and trims the airflow to suit it.",
    warranty: "ZoneMate: a 2-year limited warranty.",
  }),
};

/** In order: the first match wins, so the Contour 7 comes before the Contour. */
const FAMILIES: Family[] = [
  MITSU_SPLIT, MITSU_HEAD, MITSU_MULTI, MITSU_DUCTED,
  KADEN_SPLIT, KADEN_HEAD, KADEN_MULTI, KADEN_DUCTED, KADEN_WINDOW,
  RINNAI_HEAD, RINNAI_MULTI, ZONEMATE,
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
