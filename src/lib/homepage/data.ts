/**
 * Everything the homepage and the /find product pages say, in one place.
 *
 * Ported from the prototype Jake designed (aga-homepage-handoff/prototype/
 * Live.dc.html) rather than retyped, so the systems, questions, prices and
 * FAQs read the same here as in the clickable version he signed off.
 *
 * Prices are only the ones Jake has confirmed. Everything else is `null` and
 * prints "At quote" until he supplies a real figure. Don't fill one in.
 */

/**
 * Brighte finance. Built, but switched off until Brighte is set up.
 *
 * When this is false nothing finance-related renders: weekly prices, the
 * "How would you like to pay?" choices, the "Can I pay it off?" FAQ and the
 * footer badge. The weekly maths below is a plain split with no interest or
 * fees, which is NOT what Brighte charges, so it has to be replaced with their
 * real terms before this is turned on.
 */
export const SHOW_FINANCE = false;
export const FINANCE_MONTHS = 36;

export const weekly = (price: number, months = FINANCE_MONTHS) => Math.ceil(price / ((months * 52) / 12));
export const money = (n: number) => "$" + n.toLocaleString("en-AU");

/** Encoded once here, because several product shots have spaces in their names. */
const pub = (p: string) => encodeURI(p);

export const IMG = {
  kadenSplit: pub("/ksi_slide_0.jpg"),
  mitsuSplit: pub("/mitsubishi-msz-ap-wall-split-v2-v3.webp"),
  kadenMulti: pub("/Kaden Multi Head.jpg"),
  mitsuCond: pub("/mitsubishi-mxz-multi-split-condenser-v2.webp"),
  kadenDucted: pub("/kdi-v2-image_01.webp"),
  mitsuDucted: pub("/mitsubishi-pea-m-ducted-v2-v3.webp"),
  evapClassic: pub("/classic_evap_product_image.jpg"),
  evapLow: pub("/Kaden low_evap cooler.jpg"),
  istore: pub("/270L-istore-heatpump.webp"),
  reclaimAio: pub("/Reclaim-EcoAIO-Products-NewLogo-600PX-400x631-1.webp"),
  reclaimSplit: pub("/Reclaim-Herosystem-v2-controller-shadows-rgb-web-769x1024.png"),
  gasCf: pub("/G-Series_Front_On_View_1200x900.jpg"),
  gasStorage: pub("/Web_1200x900-Thermann-4-Star-Hot-Water-Unit-135ltr-Natural-Gas.jpg"),
  brivisWombat: pub("/Brivis_Heating-Gas-Ducted-Heating-Compact-Classic-Classic-Wombat-3-Star-600x371.jpg"),
  brivisStar: pub("/Brivis Starpro 6 star indoor and outdoor gas ducted heater.jpg"),
  zmTouch: pub("/ZM-Touch-App_Hero_1.jpg"),
  zmTablet: pub("/Milieu Zonemate tablet.jpg"),
};

export const PHOTO = {
  team: "/team-photo.webp",
  teamMobile: "/team-photo-mobile.webp",
  whyBig: "/kaden-team-with-chaz.jpg",
  vans: "/comm/team-vans.webp",
  splitRoom: "/kaden-indoor.webp",
  heatPump: "/reclaim-split-back.webp",
  heating: "/gas-ducted-install.webp",
  evapService: "/evap-cooler-service.webp",
  gasLine: "/gas-line.webp",
  commercial: "/comm/ceiling-unit.jpg",
  ductedInstall: "/ducted-split.webp",
  outdoorUnit: "/ducted-condenser.webp",
  heatPumpInstall: "/reclaim-and-mitsubishi.jpg",
  hotWater1: "/gas-hot-water-changeover.webp",
  hotWater2: "/ba-hw-after.webp",
  map: "/aga-service-map.webp",
};

/** SVG path data for the line icons, straight from the prototype. */
export const ICON = {
  snow: "M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  flame: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z",
  duct: "M3 7h18v10H3zM7 11h10M7 14h6",
  tap: "M5 8h8a4 4 0 0 1 4 4v2M5 5v6M17 18v.01M14 21v.01M20 21v.01",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z",
  building: "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M3 21h18M8 7h4M8 11h4M8 15h4",
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z",
  home: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5",
  shield: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4",
};

/* ------------------------------------------------------------ questions */

export type Opt = { label: string; sub?: string; spec?: string; n?: number };
export type Question = { id: string; q: string; opts: Opt[]; size?: boolean };

const o = (label: string, sub?: string): Opt => (sub ? { label, sub } : { label });

const ROOM: Opt[] = [
  { label: "Up to 20 m²", sub: "Bedroom or study", spec: "2.5 kW", n: 1 },
  { label: "20–30 m²", sub: "Main bedroom or small lounge", spec: "3.5 kW", n: 2 },
  { label: "30–45 m²", sub: "Living room", spec: "5.0 kW", n: 3 },
  { label: "45 m² +", sub: "Open-plan living", spec: "7.1–8.0 kW", n: 4 },
];
const HEADS: Opt[] = [
  { label: "2 rooms", sub: "Two indoor heads", spec: "2 heads", n: 1 },
  { label: "3 rooms", sub: "Three indoor heads", spec: "3 heads", n: 2 },
  { label: "4–5 rooms", sub: "Four or five heads", spec: "4–5 heads", n: 3 },
];
const HOUSE: Opt[] = [
  { label: "Smaller home", sub: "Usually 3 bedrooms", spec: "Up to 150 m²", n: 1 },
  { label: "Family home", sub: "Usually 4 bedrooms", spec: "150–250 m²", n: 2 },
  { label: "Large home", sub: "5 bedrooms or more", spec: "250 m² +", n: 3 },
];
const PEOPLE: Opt[] = [
  { label: "1–2 people", sub: "Small household", spec: "160–200 L", n: 1 },
  { label: "3–4 people", sub: "Family home", spec: "250–270 L", n: 2 },
  { label: "5+ people", sub: "Big household", spec: "300–400 L", n: 3 },
];
const BATHS: Opt[] = [
  { label: "1 bathroom", sub: "One shower at a time", spec: "1 bath", n: 1 },
  { label: "2 bathrooms", sub: "Two showers at once", spec: "2 baths", n: 2 },
  { label: "3+ bathrooms", sub: "Big family home", spec: "3+ baths", n: 3 },
];
const ZONES: Opt[] = [
  { label: "2–3 zones", sub: "Living and sleeping", spec: "2–3 zones", n: 1 },
  { label: "4–6 zones", sub: "Most family homes", spec: "4–6 zones", n: 2 },
  { label: "7–8 zones", sub: "Every room its own", spec: "7–8 zones", n: 3 },
];

export const QB = {
  floor: { id: "floor", q: "Which floor is the room on?", opts: [o("Ground floor"), o("Upstairs", "Longer pipe run to the outdoor unit")] },
  outdoor: { id: "outdoor", q: "Where can the outdoor unit go?", opts: [o("Straight behind the indoor unit", "Back-to-back on the same wall"), o("Further along the wall or around a corner"), o("On a balcony or the roof"), o("Not sure", "We'll work it out on site")] },
  oldSplit: { id: "old", q: "Is there an old unit to remove?", opts: [o("No, it's a new install"), o("Yes, an old split system"), o("Yes, a window or wall box unit")] },
  storeys: { id: "storeys", q: "Single or double storey?", opts: [o("Single storey"), o("Double storey"), o("Split level")] },
  roofSpace: { id: "roof", q: "What's the roof space like?", opts: [o("Pitched roof with room to move", "Most houses"), o("Low or tight roof space"), o("Flat roof or no access"), o("Not sure")] },
  ductedNow: { id: "now", q: "What's there now?", opts: [o("Nothing, it's a new system"), o("Old ducted aircon to replace"), o("Gas ducted heating", "Add cooling or replace it")] },
  roofType: { id: "rooftype", q: "What type of roof?", opts: [o("Tiled"), o("Colorbond or metal"), o("Flat or low pitch")] },
  oldEvap: { id: "old", q: "Replacing an old evaporative cooler?", opts: [o("Yes, swap the old one"), o("No, it's a new install")] },
  hwNow: { id: "now", q: "What hot water do you have now?", opts: [o("Gas storage tank"), o("Gas continuous flow"), o("Electric storage tank"), o("Solar hot water"), o("Nothing yet", "New build or extension")] },
  hwWhere: { id: "where", q: "Where does the unit go?", opts: [o("Outside, against a wall"), o("Inside, in a laundry or cupboard"), o("Not sure")] },
  solar: { id: "solar", q: "Do you have solar panels?", opts: [o("Yes", "It can heat your water off your solar during the day"), o("No"), o("Planning to")] },
  gasType: { id: "gas", q: "Natural gas or LPG bottles?", opts: [o("Natural gas", "Mains gas meter"), o("LPG bottles"), o("Not sure")] },
  heatNow: { id: "now", q: "What heating do you have now?", opts: [o("Old ducted heater to replace"), o("Wall furnace or space heater"), o("Nothing, it's a new install")] },
  vents: { id: "vents", q: "Where are the vents?", opts: [o("In the floor"), o("In the ceiling"), o("No vents yet"), o("Not sure")] },
  ductSys: { id: "ductsys", q: "What ducted system do you have?", opts: [o("Gas ducted heating"), o("Ducted reverse-cycle"), o("Evaporative cooling")] },
  age: { id: "age", q: "How old is the system?", opts: [o("Under 5 years"), o("5–10 years"), o("Over 10 years"), o("Not sure")] },
  issue: { id: "issue", q: "What's happening?", opts: [o("Not working", "No heating, cooling or hot water"), o("Noisy, leaking or smells"), o("Error code on the screen"), o("Due for a service", "Clean and health check")] },
  urgent: { id: "urgent", q: "How urgent is it?", opts: [o("Today, it's urgent", "No heating, cooling or hot water"), o("This week"), o("Just booking a service")] },
  gasJob: { id: "job", q: "What do you need?", opts: [o("New install", "Something new going in"), o("Repair or replace", "Fix or swap what's there"), o("Safety check", "CO test and leak check")] },
  jobSize: { id: "size", q: "How big is the job?", opts: [{ label: "1–2 units", sub: "A shop or small office", spec: "Small", n: 1 }, { label: "3–10 units", sub: "A bigger site or a few rentals", spec: "Medium", n: 2 }, { label: "10+ units", sub: "Strata blocks and large sites", spec: "Large", n: 3 }] },
  need: { id: "need", q: "What do you need?", opts: [o("New install"), o("Replace old units"), o("Servicing or a maintenance plan")] },
  when: { id: "when", q: "When do you need it done?", opts: [o("As soon as possible"), o("Within a month"), o("In 1–3 months"), o("Just getting prices")] },
  own: { id: "own", q: "Is this your home?", opts: [o("I own it and live there"), o("I'm a landlord", "For a rental property"), o("I'm renting", "We'll need the owner's OK"), o("Builder or new build")] },
  ownBiz: { id: "own", q: "Who are you?", opts: [o("Business owner"), o("Property or facility manager"), o("Strata manager"), o("Builder")] },
} satisfies Record<string, Question>;

export const SIZE_NOTE = "A rough guide only. We confirm the exact size with a heat-load check at the free site visit.";

/* ------------------------------------------------------------ systems */

export type Tier = {
  slug: "essential" | "premium" | "signature";
  tier: "Essential" | "Premium" | "Signature";
  brand: string;
  model: string;
  img: string;
  feats: string[];
  price: number | null;
};

export type FaqKey = "split" | "multi" | "ducted" | "evap" | "hp" | "gashw" | "gasheat" | "zone";

export type System = {
  slug: string;
  label: string;
  sub: string;
  img: string;
  /** The size question's wording. */
  q: string;
  sizes: Opt[];
  tiers: Tier[];
  /** Every question asked about the home, the size first. */
  qs: Question[];
  faq: FaqKey;
  /** The `service` the quote API files a lead under. */
  service: string;
};

export type Category = {
  id: "air" | "hw" | "heat";
  label: string;
  sub: string;
  photo: string;
  alt: string;
  pos: string;
  fg: string;
  icon: string;
  systems: System[];
};

const W = "6-yr workmanship warranty";
const t = (slug: Tier["slug"], brand: string, model: string, img: string, feats: string[], price: number | null): Tier => ({
  slug, tier: (slug[0].toUpperCase() + slug.slice(1)) as Tier["tier"], brand, model, img, feats, price,
});

const SPLIT_TIERS: Tier[] = [
  t("essential", "Kaden", "KSI wall split", IMG.kadenSplit, ["Reverse cycle: heats and cools", "Installed by our own crew", W], null),
  t("premium", "Mitsubishi Electric", "MSZ-AP wall split", IMG.mitsuSplit, ["As quiet as 19 dBA on low", "Back-to-back install in a morning", W], 2199),
  t("signature", "Mitsubishi Electric", "MSZ-AP Hyper Heating", IMG.mitsuSplit, ["Full rated heat down to −15°", "Built for hills postcodes", W], null),
];

type SystemDef = Omit<System, "qs"> & { more: Question[] };
const sys = (d: SystemDef): System => {
  const { more, ...rest } = d;
  return { ...rest, qs: [{ id: "size", q: d.q, size: true, opts: d.sizes }, ...more] };
};

export const CATS: Category[] = [
  {
    id: "air", label: "Air conditioning", sub: "Splits, multi-head, ducted, evap",
    photo: PHOTO.splitRoom, alt: "Split system installed in a bedroom", pos: "center 30%", fg: "#0C6F96", icon: ICON.snow,
    systems: [
      sys({ slug: "split-system", label: "Split system", sub: "One room at a time", img: IMG.mitsuSplit, q: "How big is the room?", sizes: ROOM, tiers: SPLIT_TIERS, more: [QB.floor, QB.outdoor, QB.oldSplit], faq: "split", service: "split" }),
      sys({ slug: "multi-head", label: "Multi-head", sub: "Several rooms, one outdoor unit", img: IMG.kadenMulti, q: "How many rooms?", sizes: HEADS, faq: "multi", service: "split", more: [QB.storeys, QB.outdoor], tiers: [
        t("essential", "Kaden", "Multi-head system", IMG.kadenMulti, ["One outdoor unit, several rooms", "Each room its own remote", W], null),
        t("premium", "Mitsubishi Electric", "MXZ multi-head", IMG.mitsuCond, ["2 to 6 heads off one outdoor unit", "Mix wall and floor console heads", W], 6500),
        t("signature", "Mitsubishi Electric", "MXZ with floor consoles", IMG.mitsuCond, ["Heat at floor level, where it counts", "Nothing mounted high on feature walls", W], null),
      ] }),
      sys({ slug: "ducted", label: "Ducted split", sub: "The whole home, zoned", img: IMG.kadenDucted, q: "How big is the home?", sizes: HOUSE, faq: "ducted", service: "ducted", more: [QB.storeys, QB.roofSpace, QB.ductedNow], tiers: [
        t("essential", "Kaden", "KDI ducted system", IMG.kadenDucted, ["Whole-home heating and cooling", "Sized off a room-by-room heat load", W], null),
        t("premium", "Mitsubishi Electric", "PEAD-M ducted", IMG.mitsuDucted, ["Zoned as standard: 4, 6 or 8 zones", "Heat output matches cooling", "Duct design done first"], 12500),
        t("signature", "Mitsubishi Electric", "PEAD-M + Zonemate", IMG.zmTouch, ["Zonemate touch and Wi-Fi control", "Run only the rooms you use", "Duct design done first"], null),
      ] }),
      sys({ slug: "evaporative", label: "Evaporative cooler", sub: "Roof-mounted, cheap to run", img: IMG.evapClassic, q: "How big is the home?", sizes: HOUSE, faq: "evap", service: "evaporative-cooling", more: [QB.storeys, QB.roofType, QB.oldEvap], tiers: [
        t("essential", "Kaden", "Classic evaporative", IMG.evapClassic, ["Cheap to run on dry days", "Fresh air through the house", "Pre-summer service available"], null),
        t("premium", "Kaden", "Low-profile evaporative", IMG.evapLow, ["Sits low on the roofline", "Cheap to run on dry days", "Pre-summer service available"], null),
        t("signature", "Brivis", "Advance low-profile", IMG.evapLow, ["Brivis low-profile cooler", "Cheap to run on dry days", "Pre-summer service available"], null),
      ] }),
    ],
  },
  {
    id: "hw", label: "Hot water", sub: "Heat pumps and gas",
    photo: PHOTO.heatPump, alt: "Reclaim heat pump installed against a brick wall", pos: "center 40%", fg: "#C2521A", icon: ICON.drop,
    systems: [
      sys({ slug: "heat-pump", label: "Heat pump", sub: "VEU rebate applied", img: IMG.reclaimAio, q: "How many people at home?", sizes: PEOPLE, faq: "hp", service: "hp", more: [QB.hwNow, QB.hwWhere, QB.solar], tiers: [
        t("essential", "iStore", "270 L R290 all-in-one", IMG.istore, ["VEU rebate applied at the quote", "PV diverter and Wi-Fi built in", "Old unit removed"], 2150),
        t("premium", "Reclaim", "ECO R290 all-in-one", IMG.reclaimAio, ["Australian made", "VEU rebate applied at the quote", "Old unit removed"], 2624),
        t("signature", "Reclaim", "CO₂ split heat pump", IMG.reclaimSplit, ["Compressor split from the tank: quieter", "Stainless tank option", "VEU rebate applied at the quote"], null),
      ] }),
      sys({ slug: "gas-continuous-flow", label: "Gas continuous flow", sub: "Endless hot water", img: IMG.gasCf, q: "How many bathrooms?", sizes: BATHS, faq: "gashw", service: "gas-hot-water", more: [QB.hwNow, QB.gasType, QB.hwWhere], tiers: [
        t("essential", "Thermann", "G-series continuous flow", IMG.gasCf, ["Endless hot water", "Same-day swaps on common models", W], null),
        t("premium", "Thermann", "G-series, high-flow", IMG.gasCf, ["Two showers running at once", "Endless hot water", W], null),
        t("signature", "Reclaim", "Switch to a heat pump", IMG.reclaimAio, ["VEU rebate applied at the quote", "Cuts hot water energy use by up to 75%", "Old unit removed"], 2624),
      ] }),
      sys({ slug: "gas-storage", label: "Gas storage", sub: "Like-for-like swap", img: IMG.gasStorage, q: "How many people at home?", sizes: PEOPLE, faq: "gashw", service: "gas-hot-water", more: [QB.gasType, QB.hwWhere], tiers: [
        t("essential", "Thermann", "4-star gas storage", IMG.gasStorage, ["Like-for-like swap", "Same-day on common sizes", "Old unit removed"], null),
        t("premium", "Thermann", "Upgrade to continuous flow", IMG.gasCf, ["Endless hot water", "No tank to reheat", W], null),
        t("signature", "iStore", "Switch to a heat pump", IMG.istore, ["VEU rebate applied at the quote", "Cuts hot water energy use by up to 75%", "Old unit removed"], 2150),
      ] }),
    ],
  },
  {
    id: "heat", label: "Heating", sub: "Gas ducted and reverse cycle",
    photo: PHOTO.heating, alt: "Ducted gas heater installed in a roof space", pos: "center 55%", fg: "#050A30", icon: ICON.flame,
    systems: [
      sys({ slug: "gas-ducted-heating", label: "Gas ducted heating", sub: "Brivis, CO tested", img: IMG.brivisStar, q: "How big is the home?", sizes: HOUSE, faq: "gasheat", service: "gas-heating", more: [QB.storeys, QB.heatNow, QB.vents], tiers: [
        t("essential", "Brivis", "Classic Wombat 3-star", IMG.brivisWombat, ["Whole-home gas heating", "CO safety test on install", W], null),
        t("premium", "Brivis", "StarPro 6-star", IMG.brivisStar, ["6-star efficiency", "CO safety test on install", W], null),
        t("signature", "Brivis", "StarPro 6-star + Zonemate", IMG.zmTouch, ["Heat only the rooms you use", "Zonemate touch and Wi-Fi", "CO safety test on install"], null),
      ] }),
      sys({ slug: "reverse-cycle-split", label: "Reverse-cycle split", sub: "Electric heating, one room", img: IMG.kadenSplit, q: "How big is the room?", sizes: ROOM, tiers: SPLIT_TIERS, faq: "split", service: "split", more: [QB.floor, QB.outdoor, QB.oldSplit] }),
      sys({ slug: "zoning", label: "Zoning & controls", sub: "Heat the rooms you use", img: IMG.zmTablet, q: "How many zones?", sizes: ZONES, faq: "zone", service: "zoning", more: [QB.ductSys, QB.age], tiers: [
        t("essential", "Zonemate", "Zone controller", IMG.zmTablet, ["Turn rooms on and off", "Fits most ducted systems", W], null),
        t("premium", "Zonemate", "Touch + Wi-Fi", IMG.zmTouch, ["Touchscreen wall controller", "Control from your phone", W], null),
        t("signature", "Milieu", "Smart zone control", IMG.zmTablet, ["Schedules per room", "Control from your phone", W], null),
      ] }),
    ],
  },
];

export const WORKMANSHIP = W;
export const TONES = ["#0C6F96", "#C2521A", "#050A30"] as const;

export type SystemRef = { ci: number; si: number; cat: Category; sys: System };

export function findSystem(slug: string): SystemRef | null {
  for (let ci = 0; ci < CATS.length; ci++) {
    const si = CATS[ci].systems.findIndex((s) => s.slug === slug);
    if (si >= 0) return { ci, si, cat: CATS[ci], sys: CATS[ci].systems[si] };
  }
  return null;
}

export function allProductParams() {
  return CATS.flatMap((c) => c.systems.flatMap((s) => s.tiers.map((tr) => ({ system: s.slug, tier: tr.slug }))));
}

/* ------------------------------------------------------------ answers in a URL */

export type Answers = Record<string, number>;

/** Answers as query params, by question id, e.g. size=1&floor=0. */
export function answersQuery(sys: System, ans: Answers): string {
  const p = new URLSearchParams();
  for (const q of sys.qs) if (ans[q.id] != null) p.set(q.id, String(ans[q.id]));
  return p.toString();
}

/** Read answers back, ignoring anything that isn't one of this system's options. */
export function answersFrom(sys: System, get: (k: string) => string | null): Answers {
  const out: Answers = {};
  for (const q of sys.qs) {
    const v = get(q.id);
    if (v == null || !/^\d+$/.test(v)) continue;
    const n = Number(v);
    if (n < q.opts.length) out[q.id] = n;
  }
  return out;
}

export const answerChips = (sys: System, ans: Answers) =>
  sys.qs.map((q) => (ans[q.id] == null ? null : q.opts[ans[q.id]].label)).filter((x): x is string => !!x);

export const productHref = (sys: System, tier: Tier, ans: Answers) => {
  const qs = answersQuery(sys, ans);
  return `/find/${sys.slug}/${tier.slug}${qs ? `?${qs}` : ""}`;
};

export const bookHref = (sys: System, tier: Tier, ans: Answers) => {
  const qs = answersQuery(sys, ans);
  return `/?book=${sys.slug}.${tier.slug}${qs ? `&${qs}` : ""}#quote`;
};

export const findHref = (sys: System, ans: Answers) => {
  const qs = answersQuery(sys, ans);
  return `/?find=${sys.slug}${qs ? `&${qs}` : ""}#find`;
};

/** The one-line pick the quote form carries, e.g. "Premium · Mitsubishi Electric MSZ-AP wall split · 20–30 m² · Upstairs". */
export function pickSummary(sys: System, tier: Tier, ans: Answers) {
  return [tier.tier, `${tier.brand} ${tier.model}`, ...answerChips(sys, ans)].join(" · ");
}

/** Question → answer, worded for whoever reads the lead. */
export function answerMap(qs: Question[], ans: Answers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of qs) if (ans[q.id] != null) out[q.q] = q.opts[ans[q.id]].label;
  return out;
}

/* ------------------------------------------------------------ product page */

/** A brand's product shot only appears on that brand's options. "p" is a product shot, "c" one of our installs. */
type GalItem = { src: string; alt: string; kind: "p" | "c"; brand?: string };
const g = (src: string, alt: string, kind: "p" | "c", brand?: string): GalItem => ({ src, alt, kind, brand });

const GAL: Record<string, GalItem[]> = {
  "split-system": [g(IMG.mitsuCond, "Mitsubishi Electric outdoor unit", "p", "Mitsubishi Electric"), g(PHOTO.splitRoom, "A split system we installed in a bedroom", "c"), g(PHOTO.outdoorUnit, "An outdoor unit we installed", "c")],
  "multi-head": [g(IMG.mitsuCond, "Mitsubishi Electric outdoor unit", "p", "Mitsubishi Electric"), g(PHOTO.outdoorUnit, "An outdoor unit we installed", "c"), g(PHOTO.splitRoom, "An indoor head we installed", "c")],
  ducted: [g(IMG.zmTouch, "Zonemate touch controller", "p", "Zonemate"), g(PHOTO.ductedInstall, "A ducted install", "c"), g(PHOTO.commercial, "Our technician in the roof space", "c")],
  evaporative: [g(IMG.evapClassic, "Kaden classic evaporative cooler", "p", "Kaden"), g(PHOTO.evapService, "An evaporative cooler on a roof", "c")],
  "heat-pump": [g(IMG.reclaimSplit, "Reclaim CO₂ split heat pump", "p", "Reclaim"), g(PHOTO.heatPump, "A Reclaim heat pump we installed", "c"), g(PHOTO.heatPumpInstall, "A heat pump install", "c")],
  "gas-continuous-flow": [g(PHOTO.hotWater1, "A recent hot water install", "c"), g(PHOTO.hotWater2, "A recent hot water install", "c")],
  "gas-storage": [g(PHOTO.hotWater1, "A recent hot water install", "c"), g(PHOTO.hotWater2, "A recent hot water install", "c")],
  "gas-ducted-heating": [g(IMG.brivisWombat, "Brivis gas ducted heater", "p", "Brivis"), g(PHOTO.heating, "A ducted gas heater in a roof space", "c"), g(IMG.zmTouch, "Zonemate touch controller", "p", "Zonemate")],
  "reverse-cycle-split": [g(IMG.mitsuCond, "Mitsubishi Electric outdoor unit", "p", "Mitsubishi Electric"), g(PHOTO.splitRoom, "A split system we installed", "c"), g(PHOTO.outdoorUnit, "An outdoor unit we installed", "c")],
  zoning: [g(IMG.zmTablet, "Zonemate tablet", "p", "Zonemate"), g(IMG.zmTouch, "Zonemate touch controller", "p", "Zonemate"), g(PHOTO.ductedInstall, "A ducted install", "c")],
};

export function galleryFor(sys: System, tier: Tier): GalItem[] {
  const out: GalItem[] = [g(tier.img, `${tier.brand} ${tier.model}`, "p")];
  for (const it of GAL[sys.slug] ?? []) {
    const fits = !it.brand || it.brand === tier.brand || `${tier.brand} ${tier.model}`.includes(it.brand);
    if (fits && !out.some((x) => x.src === it.src)) out.push(it);
  }
  return out;
}

export const BRAND_PAGES: Record<string, string> = {
  "Mitsubishi Electric": "/brands/mitsubishi-electric",
  Reclaim: "/brands/reclaim",
  Thermann: "/brands/thermann",
};

export const isHeatPump = (s: System) => s.slug === "heat-pump";
/** "Nothing yet (new build)" is the fifth answer to the heat pump's "what do you have now?". */
export const isNewBuildHeatPump = (s: System, ans: Answers) => isHeatPump(s) && ans.now === 4;

export function installTime(s: System) {
  if (s.faq === "split") return "Usually half a day for a back-to-back install";
  if (s.faq === "multi") return "Usually a full day";
  if (s.faq === "ducted") return "Usually 2–3 days for a retrofit";
  if (s.faq === "hp") return "Usually one day for a like-for-like swap";
  if (s.faq === "gashw") return "Same day on common models";
  return "Confirmed at your free site check";
}

/**
 * The spec table. Technical figures (energy rating, noise, capacity per
 * model) are deliberately absent: they come from the manufacturer's spec
 * sheet sent with the quote until Jake supplies the sheets.
 */
export function specRows(cat: Category, s: System, tier: Tier, ans: Answers): { k: string; v: string }[] {
  const feats = tier.feats.filter((f) => f !== W);
  const sizesHaveSpec = s.sizes.every((z) => /kW|L$/.test(z.spec ?? ""));
  const size = ans.size != null ? s.sizes[ans.size] : null;
  const refrig = /R290/.test(tier.model) ? "R290 (natural refrigerant)" : /CO₂/.test(tier.model) ? "CO₂ (natural refrigerant)" : null;
  const rows: [string, string][] = [
    ["Brand", tier.brand],
    ["Model", tier.model],
    ["System", `${cat.label} · ${s.label}`],
    [sizesHaveSpec ? "Sizes in this range" : "Suits", s.sizes.map((z) => (sizesHaveSpec ? z.spec : z.label)).join(" · ")],
  ];
  if (size) rows.push(["Your selection", size.label + (size.spec ? ` (${size.spec})` : "")]);
  rows.push(["Key features", feats.join(" · ")]);
  if (refrig) rows.push(["Refrigerant", refrig]);
  if (isHeatPump(s) || tier.feats.join(" ").includes("VEU")) rows.push(["VEU rebate", "Applied at the quote where you're eligible (up to $2,700)"]);
  rows.push(
    ["Install time", installTime(s)],
    ["Workmanship warranty", "6 years on our install"],
    ["Manufacturer warranty", "As per the manufacturer, listed on your quote"],
    ["Compliance certificate", "Emailed within 24 hours of install"],
  );
  return rows.map(([k, v]) => ({ k, v }));
}

export const SPEC_NOTE = "Energy ratings and noise figures change with the size. We send the manufacturer's full spec sheet with your written quote.";

type QA = { q: string; a: string };
const qa = (q: string, a: string): QA => ({ q, a });

export const PRODUCT_FAQS: Record<FaqKey, QA[]> = {
  split: [
    qa("How long does the install take?", "A back-to-back split is usually done in half a day. Upstairs rooms or longer pipe runs can take most of the day."),
    qa("How do you work out the right size?", "We check the room on site: its size, windows, insulation and which way it faces. The size you picked here is a starting point, and we confirm it in writing."),
    qa("Do I need a new power circuit?", "We check your switchboard at the site visit. If the unit needs its own circuit, it's included in your written price before we start."),
    qa("What's the warranty?", "The manufacturer's warranty on the unit, 6 years on our workmanship, and a compliance certificate emailed within 24 hours of install."),
  ],
  multi: [
    qa("How many rooms can one outdoor unit run?", "It depends on the outdoor unit. Mitsubishi MXZ units run 2 to 6 indoor heads, so we size it to the rooms you want covered."),
    qa("Can I mix wall and floor heads?", "Yes. Floor consoles suit rooms where you want heat at floor level or nothing high on a feature wall."),
    qa("How long does the install take?", "Usually a full day, depending on how many rooms and how far the pipe runs go."),
    qa("What's the warranty?", "The manufacturer's warranty on the unit, 6 years on our workmanship, and a compliance certificate within 24 hours."),
  ],
  ducted: [
    qa("How long does the install take?", "A full ducted retrofit is usually 2–3 days. We design the duct layout first, room by room."),
    qa("What if my roof space is tight?", "We look at it on the site visit. Low or flat roofs can change the unit and duct options, and we'll tell you straight if something won't fit."),
    qa("Can I heat or cool only some rooms?", "Yes. Zoning lets you run only the rooms you use, with a touch controller or your phone."),
    qa("What's the warranty?", "The manufacturer's warranty on the system, 6 years on our workmanship, and a compliance certificate within 24 hours."),
  ],
  evap: [
    qa("What roofs can it go on?", "Tiled, metal and most low-pitch roofs. We check the roof and the best spot for the unit at the site visit."),
    qa("Is it cheap to run?", "Evaporative cooling is cheap to run on dry days. It works best with some windows open to let air flow through."),
    qa("Does it need servicing?", "A pre-summer service keeps the pads and water system clean. We can book it in before the hot weather."),
    qa("What's the warranty?", "The manufacturer's warranty on the unit and 6 years on our workmanship."),
  ],
  hp: [
    qa("How much is the VEU rebate, really?", "It depends on your existing hot water unit, your home and the new unit going in. We apply it at the quote stage so you don't pay it then claim it back."),
    qa("How long does the install take?", "A like-for-like heat pump swap is usually one day, with the old unit removed."),
    qa("Can it run off my solar?", "Yes. Most heat pumps can be set to heat during the day while your panels are producing."),
    qa("What's the warranty?", "The manufacturer's warranty on the unit (typically 6–10 years on the tank), 6 years on our workmanship, and a compliance certificate within 24 hours."),
  ],
  gashw: [
    qa("Can you swap it the same day?", "Yes, on common models. If your hot water has died, call (03) 5947 8000 and we'll tell you how soon we can get there."),
    qa("Natural gas or LPG?", "Both. Let us know which you have so we bring the right unit."),
    qa("Should I switch to a heat pump instead?", "If you're replacing a gas or electric unit, a heat pump with the VEU rebate is often worth comparing. We can quote both side by side."),
    qa("What's the warranty?", "The manufacturer's warranty on the unit, 6 years on our workmanship, and a compliance certificate within 24 hours."),
  ],
  gasheat: [
    qa("Do you test for carbon monoxide?", "Yes. Every gas heating install gets a CO safety test before we leave."),
    qa("Can you reuse my existing ducts?", "Often, if they're in good condition. We check them on the site visit and price any replacement in writing."),
    qa("Can I heat only some rooms?", "Yes. Add zoning to heat only the rooms you use."),
    qa("What's the warranty?", "The manufacturer's warranty on the heater, 6 years on our workmanship, and a compliance certificate within 24 hours."),
  ],
  zone: [
    qa("Will it work with my system?", "Zone controllers fit most ducted systems. Tell us what you have and we'll confirm on the site visit."),
    qa("Can I control it from my phone?", "Yes, with the Wi-Fi controllers."),
    qa("How long does it take to fit?", "Usually a day, depending on how many zones and how easy the roof space is to get around."),
    qa("What's the warranty?", "The manufacturer's warranty and 6 years on our workmanship."),
  ],
};

/** Which reviews read as being about this kind of job. */
export const REVIEW_MATCH: Record<FaqKey, RegExp> = {
  split: /split/i, multi: /split|multi/i, ducted: /ducted/i, evap: /ducted|split/i,
  hp: /heat pump/i, gashw: /hot water|heat pump/i, gasheat: /ducted/i, zone: /ducted/i,
};

export const reviewTitle = (k: FaqKey) =>
  k === "hp" || k === "gashw" ? "From locals who swapped their hot water."
    : k === "split" || k === "multi" ? "From locals with a new split."
      : "From locals who went ducted.";

/* ------------------------------------------------------------ quote form */

export type FormType = { label: string; img?: string; icon?: string; qs: Question[]; /** The finder system this type is, when it is one. */ system?: string };
export type FormService = {
  t: string; icon: string; bg: string; fg: string; q: string;
  /** The `service` the lead is filed under, before a type is picked. */
  service: string;
  types: FormType[];
  biz?: boolean;
  /** Category for the photo tip. */
  cat?: Category["id"];
};

const SVCQ = [QB.issue, QB.age, QB.urgent];
const ft = (label: string, img: string | null, icon: string | null, qs: Question[]): FormType => ({
  label, ...(img ? { img } : {}), ...(icon ? { icon } : {}), qs,
});
const fromSystems = (c: Category): FormType[] => c.systems.map((s) => ({ label: s.label, img: s.img, qs: s.qs, system: s.slug }));

export const FSVC: FormService[] = [
  { t: "Air conditioning", icon: ICON.snow, bg: "#00B0ED", fg: "#050A30", q: "Which type of aircon?", service: "split", cat: "air", types: fromSystems(CATS[0]) },
  { t: "Hot water", icon: ICON.drop, bg: "#C2521A", fg: "#fff", q: "Which type of hot water?", service: "hp", cat: "hw", types: fromSystems(CATS[1]) },
  { t: "Heating", icon: ICON.flame, bg: "#050A30", fg: "#fff", q: "Which type of heating?", service: "gas-heating", cat: "heat", types: fromSystems(CATS[2]) },
  { t: "Service & repairs", icon: ICON.wrench, bg: "#FDEEE6", fg: "#B04711", q: "What needs a look?", service: "service", types: [
    ft("Split or multi-head", IMG.mitsuSplit, null, SVCQ), ft("Ducted aircon", IMG.mitsuDucted, null, SVCQ),
    ft("Evaporative cooler", IMG.evapClassic, null, SVCQ), ft("Hot water", IMG.gasCf, null, SVCQ),
    ft("Gas heater", IMG.brivisWombat, null, SVCQ),
  ] },
  { t: "Gas & plumbing", icon: ICON.tap, bg: "#E6F5FC", fg: "#0C6F96", q: "What sort of gas job?", service: "gas-plumbing", types: [
    ft("Gas heater or cooktop", IMG.brivisWombat, null, [QB.gasJob, QB.gasType]), ft("Gas hot water", IMG.gasStorage, null, [QB.gasJob, QB.gasType]),
    ft("New gas line", null, ICON.flame, [QB.gasType]), ft("Leak or safety check", null, ICON.shield, [QB.gasType, QB.urgent]),
  ] },
  { t: "Commercial", icon: ICON.building, bg: "#F3EFE5", fg: "#050A30", q: "What kind of site?", service: "commercial", biz: true, types: [
    ft("Office or shop", null, ICON.building, [QB.jobSize, QB.need]), ft("Rental property", null, ICON.home, [QB.jobSize, QB.need]),
    ft("Strata or multi-unit", null, ICON.building, [QB.jobSize, QB.need]),
  ] },
];
export const FSVC_SERVICE_INDEX = 3;

export const PHOTO_TIP: Record<Category["id"], string> = {
  air: "A photo of the room and where the outdoor unit could go helps us price it faster.",
  hw: "A photo of your current hot water unit and its label helps us price it faster.",
  heat: "A photo of your current heater, or the roof space access, helps us price it faster.",
};

/* ------------------------------------------------------------ services */

export type ServiceCard = { t: string; href: string; s: string; badge: string; photo: string; alt: string; pos: string; icon: string; bg: string; fg: string; cta: string };

export const SERVICES: ServiceCard[] = [
  { t: "Aircon installation", href: "/services/air-conditioning-installation", s: "Split, multi-head, ducted and evaporative systems, sized to the room rather than the catalogue.", badge: "Splits from $2,199", photo: PHOTO.splitRoom, alt: "Split system installed in a bedroom", pos: "center 35%", icon: ICON.snow, bg: "#00B0ED", fg: "#050A30", cta: "Aircon installation" },
  { t: "Heat pump hot water", href: "/services/heat-pump-installation", s: "Swap your old gas or electric unit for a heat pump, with the VEU rebate taken off the quote, not claimed back later.", badge: "Up to $2,700 off", photo: PHOTO.heatPump, alt: "Reclaim heat pump installed against a brick wall", pos: "center 40%", icon: ICON.drop, bg: "#C2521A", fg: "#fff", cta: "Heat pump installs" },
  { t: "Aircon service & repairs", href: "/services/aircon-servicing-repairs", s: "Cleans, health checks and breakdowns on split, ducted and evaporative systems, whoever installed them.", badge: "Book before summer", photo: PHOTO.evapService, alt: "Evaporative cooler being serviced on a roof", pos: "center 45%", icon: ICON.wrench, bg: "#050A30", fg: "#fff", cta: "Servicing & repairs" },
  { t: "Gas & plumbing", href: "/services/gas-plumbing", s: "Gas heating, gas lines, hot water and appliances, with a carbon monoxide safety test on every gas job.", badge: "CO tested", photo: PHOTO.gasLine, alt: "Excavator digging a trench for a new gas line", pos: "center 50%", icon: ICON.flame, bg: "#FDEEE6", fg: "#B04711", cta: "Gas & plumbing" },
  { t: "Commercial & strata", href: "/commercial", s: "Offices, shops, rentals and strata blocks. Installs, servicing and planned maintenance from the same crew.", badge: "Homes & businesses", photo: PHOTO.commercial, alt: "Technician working in a ceiling space", pos: "center 40%", icon: ICON.building, bg: "#E6F5FC", fg: "#0C6F96", cta: "Commercial work" },
  { t: "24/7 emergency", href: "tel:+61359478000", s: "Gas leak, no hot water or no heat. After hours goes to someone on the tools, not a call centre.", badge: "Answered 24/7", photo: PHOTO.vans, alt: "The Advanced Gas team with their service vans", pos: "center 55%", icon: ICON.phone, bg: "#FF7A36", fg: "#050A30", cta: "Call (03) 5947 8000" },
];

/* ------------------------------------------------------------ header */

export type NavItem = { t: string; s: string; img: string; photo?: boolean; pos?: string; href: string; find?: string };
export type NavGroup = { label: string; href: string; head?: string; foot?: string; footHref?: string; footFind?: Category["id"]; items: NavItem[] };

const prod = (t: string, s: string, img: string, slug: string): NavItem => ({ t, s, img, href: `/?find=${slug}#find`, find: slug });

export const NAV: NavGroup[] = [
  { label: "Cooling", href: "/services/air-conditioning-installation", head: "Not sure which?", foot: "Find your cooling", footFind: "air",
    items: [prod("Split system", "One room", IMG.mitsuSplit, "split-system"), prod("Multi-head split", "Several rooms", IMG.kadenMulti, "multi-head"), prod("Ducted", "The whole home, zoned", IMG.mitsuDucted, "ducted"), prod("Evaporative", "Cheap to run", IMG.evapClassic, "evaporative")] },
  { label: "Heating", href: "/services#gas-heating", head: "Not sure which?", foot: "Find your heating", footFind: "heat",
    items: [prod("Gas ducted heating", "Brivis, CO tested", IMG.brivisStar, "gas-ducted-heating"), prod("Reverse-cycle split", "Electric, one room", IMG.kadenSplit, "reverse-cycle-split"), prod("Zoning & controls", "Heat the rooms you use", IMG.zmTouch, "zoning")] },
  { label: "Hot water", href: "/heat-pumps", head: "VEU rebate", foot: "Up to $2,700 off a heat pump", footFind: "hw",
    items: [prod("Heat pump", "Rebate applied", IMG.reclaimAio, "heat-pump"), prod("Gas continuous flow", "Endless hot water", IMG.gasCf, "gas-continuous-flow"), prod("Gas storage", "Like-for-like swap", IMG.gasStorage, "gas-storage")] },
  { label: "Services", href: "/services", head: "Something broken?", foot: "Call (03) 5947 8000", footHref: "tel:+61359478000",
    items: SERVICES.map((v) => ({ t: v.t, s: v.badge, img: v.photo, photo: true, pos: v.pos, href: v.href })) },
  { label: "About", href: "/about", items: [] },
  { label: "Reviews", href: "/reviews", items: [] },
  { label: "Areas", href: "/service-areas", items: [] },
];

/* ------------------------------------------------------------ homepage FAQ */

export const HOME_FAQS: (QA & { finance?: boolean })[] = [
  qa("How much is the VEU rebate, really?", "It depends on your existing hot water unit, your home and the new unit going in. We apply it at the quote stage so you don't pay it then claim it back, and give you the exact number after a 20-minute site check."),
  qa("Is the quote fixed?", "It's in writing, and it only changes if the job does. If we open a wall or a roof space and find something the site check couldn't show, we stop, price the difference and get your approval before going on."),
  { ...qa("Can I pay it off?", "Yes. Finance is available through Brighte, subject to approval. We'll show you the weekly figure alongside the installed price on your quote."), finance: true },
  qa("How long does an install actually take?", "A like-for-like heat pump swap is usually one day. A new split is half a day. A full ducted retrofit is 2–3 days."),
  qa("Do you do emergencies on weekends?", "Yes. Gas leak, no hot water, smoking flue, call the main number any time. After hours goes to someone on the tools, not an overseas call centre."),
  qa("What's the warranty?", "Manufacturer warranty on the unit (typically 6–10 years on the tank), 6 years on our workmanship, and a compliance certificate emailed within 24 hours of install."),
];
