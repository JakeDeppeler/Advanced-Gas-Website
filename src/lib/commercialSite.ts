/**
 * The four commercial sub-pages, as data.
 *
 * `commercial.ts` holds what the front page argues with — the ten packages,
 * the clients, the process, the compliance rows. This holds what the four
 * pages behind it need and the front page has no use for: the disciplines,
 * the sectors, the director's licence classes, the leadership, the towns on
 * the radar.
 *
 * Kept apart rather than piled into the same file because the two have
 * different jobs. The front page is an argument; these are a reference.
 */

import { site } from "./site";

/* ========================= WHAT WE DO ========================= */

/**
 * The four disciplines, which is the real answer to "what do you do".
 *
 * Not the ten packages — a package is a way of buying work, and these are
 * the trades that do it. A consultant reading this page is checking whether
 * one contractor covers all four, because four contractors is four
 * programmes to coordinate.
 */
export const COMM_DISCIPLINES: {
  n: string;
  kicker: string;
  h: string;
  p: string;
  tags: string[];
  /** Which zone of the building schematic this one lights up. */
  zone: number;
}[] = [
  {
    n: "01",
    kicker: "Mechanical",
    h: "Mechanical services, commercial & domestic",
    p: "HVAC systems, central heating and packaged units, ducted split systems, evaporative and refrigerated cooling and heat pumps, including full mechanical-services design, installation and commissioning.",
    tags: ["VRV / VRF", "Packaged rooftop units", "Ducted systems", "Evaporative cooling"],
    zone: 0,
  },
  {
    n: "02",
    kicker: "Gas",
    h: "Type A gas services",
    p: "Installation, servicing and repair of Type A gas appliances, from gas cooktops and heaters to hot-water systems, with safety, compliance and reliability built into every job.",
    tags: ["Appliance install & service", "Gas safety inspections", "Commercial hot water"],
    zone: 1,
  },
  {
    n: "03",
    kicker: "Controls",
    h: "Air balancing & BMS controls",
    p: "Airflow testing and balancing, building-management-system integration and controls, and full commissioning, delivering measured, efficient performance across commercial sites.",
    tags: ["Air balancing", "BMS integration", "Commissioning & handover"],
    zone: 2,
  },
  {
    n: "04",
    kicker: "Refrigeration",
    h: "Refrigeration & heat-pump hot water",
    p: "Refrigerated air-conditioning, split and multi-head systems, and high-efficiency heat-pump hot-water solutions, including rebate-eligible upgrades under Victorian energy programs.",
    tags: ["Split & multi-head", "Heat pump plant", "Rebate-eligible upgrades"],
    zone: 3,
  },
];

/** The captions under the schematic, one per zone, in zone order. */
export const COMM_ZONES: { label: string; cap: string }[] = [
  { label: "Mechanical", cap: "HVAC, packaged units, ducted systems" },
  { label: "Type A gas", cap: "Appliances, hot water, cooktops" },
  { label: "Controls", cap: "Airflow testing, BMS integration" },
  { label: "Refrigeration", cap: "Splits, multi-head, heat pump hot water" },
];

/** Design → Install → Maintain → Certify. */
export const COMM_DIMC: { n: string; h: string; p: string }[] = [
  { n: "01", h: "Design", p: "Mechanical-services design worked from the drawings." },
  { n: "02", h: "Install", p: "Our own crews, to the builder's program." },
  { n: "03", h: "Maintain", p: "Planned preventative maintenance contracts." },
  { n: "04", h: "Certify", p: "Compliance certificates issued on handover." },
];

/**
 * The one-line version of each package, for the two-column index.
 *
 * Keyed by the slug in COMM_SCOPES so the titles and numbers stay in one
 * place and only the short line lives here.
 */
export const COMM_PACKAGE_LINES: Record<string, string> = {
  "fit-outs": "Delivered to the builder's programme",
  "base-build": "From the schedule through to handover",
  "plant-replacement": "End-of-life plant on a building that cannot stop",
  maintenance: "Keeps a site compliant and the plant alive",
  gas: "Domestic through to industrial",
  "hot-water": "Sized for a building, not a household",
  evaporative: "For spaces that can't be sealed and chilled",
  ventilation: "Supply, exhaust and make-up air",
  commissioning: "Proved against the design figures",
  breakdowns: "A number that gets answered",
};

/** Who the work is for. Three doors, one of them back to the home side. */
export const COMM_SECTORS: {
  kicker: string;
  h: string;
  p: string;
  img: string;
  cta: { label: string; href: string };
}[] = [
  {
    kicker: "Residential",
    h: "Homes across the south-east",
    p: "Heat-pump hot water, split and ducted air-conditioning, gas heating, servicing and rebate-eligible upgrades under Victorian energy programs.",
    img: "/comm/ducted-home.webp",
    cta: { label: "Your home →", href: "/" },
  },
  {
    kicker: "Commercial",
    h: "Retail, offices & tenancies",
    p: "Mechanical-services design, installation, air balancing, BMS controls and planned preventative maintenance.",
    img: "/comm/ceiling-unit.jpg",
    cta: { label: "Business & commercial →", href: "/commercial" },
  },
  {
    kicker: "Industrial",
    h: "Plant & facilities",
    p: "Plant and facility HVAC, refrigeration and Type A gas, delivered to schedule, certified and fully compliance-documented on handover.",
    img: "/comm/vrv-outdoor.jpg",
    cta: { label: "Submit a scope →", href: "/commercial#scope" },
  },
];

/** Capability at a glance: twelve ticks, three columns. */
export const COMM_SCOPE_ITEMS: string[] = [
  "Ducted refrigerated heating & cooling",
  "Split & multi-head air-conditioning",
  "Ducted gas heating",
  "Evaporative cooling",
  "Gas, electric & heat-pump hot water",
  "Type A gas appliance install & service",
  "Gas safety inspections & compliance",
  "Commercial & retail fit-outs",
  "Air balancing",
  "BMS controls & integration",
  "Commissioning & handover",
  "Planned & preventative maintenance",
];

/**
 * The full authorised-brand list.
 *
 * Longer than the seven on the front page, which is a shortlist of the ones
 * a commercial reader recognises. iStore is deliberately not here: the
 * handoff dropped it and flagged it as needing confirmation, so it stays off
 * until Jake says otherwise rather than being claimed by default.
 */
export const COMM_BRANDS_ALL: { name: string; what: string }[] = [
  { name: "Mitsubishi Electric", what: "Aircon" },
  { name: "Daikin", what: "VRV & ducted" },
  { name: "Temperzone", what: "Packaged" },
  { name: "APAC", what: "Packaged" },
  { name: "Kaden", what: "Aircon" },
  { name: "Brivis", what: "Gas ducted" },
  { name: "Rinnai", what: "Gas & hot water" },
  { name: "Bosch", what: "Hot water" },
  { name: "Rheem", what: "Hot water" },
  { name: "Thermann", what: "Hot water" },
  { name: "Reclaim", what: "Heat pumps" },
  { name: "Milieu", what: "Controls" },
];

/* ======================= CAPABILITY STATEMENT ======================= */

/**
 * The tables on the capability page.
 *
 * Deliberately not the same set as `CAPABILITY` in commercial.ts, which the
 * front page uses. That one answers "can we let you on site" and carries
 * Capacity and job records; this one is the prequal document and carries
 * warranty and equipment cover instead. Same company, two audiences.
 *
 * The third element marks an identifier — a licence number, an ABN, a
 * figure — which renders in mono so it can be read off and typed into a
 * form somewhere else.
 */
export const CAPABILITY_STATEMENT: { group: string; rows: [string, string, boolean?][] }[] = [
  {
    group: "The entity",
    rows: [
      ["Legal name", site.legalName],
      ["Trading as", site.name],
      ["ABN", site.abn, true],
      ["ACN", site.acn, true],
      ["Registered address", `${site.address.street}, ${site.address.suburb} ${site.address.state} ${site.address.postcode}`],
    ],
  },
  {
    group: "Licences & authorisations",
    rows: [
      ["Plumbing licence", "Lic. 46828", true],
      ["Refrigerant handling", site.licences.refrigeration, true],
      ["Type A gas", "Appliance installation & servicing"],
      ["Mechanical services", "Design, install, commission"],
    ],
  },
  {
    group: "Insurance & warranty",
    rows: [
      ["Public liability", "$20,000,000", true],
      ["Workers compensation", "Current"],
      ["Motor vehicle", "Comprehensive, full fleet"],
      ["Workmanship", "12-month defects liability"],
      ["Equipment", "Full manufacturer warranties"],
    ],
  },
  {
    group: "Safety & compliance",
    rows: [
      ["SWMS", "Supplied before site access"],
      ["Certificates of currency", "Supplied within 24 hours"],
      ["Documented procedures", "Written SOPs, version controlled"],
      ["Compliance certificates", "Issued on completion"],
    ],
  },
];

/** The classes on the director's licence. The ones that decide a tender. */
export const COMM_LICENCE_CLASSES: string[] = [
  "Gasfitting",
  "Gasfitting: caravans, rec vehicles & mobile homes",
  "Gasfitting: disconnect / reconnect",
  "Gasfitting: Type A appliances",
  "Type A appliance servicing work",
  "Mechanical services",
  "Mechanical services: duct fixing",
  "Mechanical services: single-head split systems",
  "Mechanical services: solid-fuel heaters",
  "Refrigerated air-conditioning: basic systems",
  "Fire protection: hydrants & hose reels",
];

/**
 * What the director is qualified as, rather than licensed for.
 *
 * Worth its own line because it is a different kind of credential and the
 * stronger one. "Refrigerated air-conditioning: basic systems" in the list
 * above is a class on a plumbing licence; a refrigeration mechanic is a
 * completed trade. On a mechanical package it is the difference between
 * refrigeration work being ours and refrigeration work being somebody we
 * booked.
 */
export const COMM_TRADE_QUALIFICATIONS: { q: string; p: string } = {
  q: "Qualified refrigeration mechanic",
  p: "The director holds the refrigeration trade as well as the plumbing and gasfitting licence, so the refrigeration and air-conditioning work on a package is done by us and signed off by us, not subcontracted out and signed off on trust.",
};

export const COMM_REGISTRATION_CLASSES: string[] = [
  "Water supply",
  "Water supply: domestic hot-water services",
  "Irrigation (non-agricultural)",
  "Electrical disconnect / reconnect",
  "Drainage",
  "Sanitary",
  "Roofing (stormwater)",
  "Roofing (stormwater): class 10A buildings",
];

/** What a procurement team sees ticked off on the animated document card. */
export const CAPABILITY_TICKS: { k: string; v: string }[] = [
  { k: "Public liability", v: "$20,000,000" },
  { k: "Refrigerant handling", v: site.licences.refrigeration },
  { k: "Plumbing licence", v: "46828" },
  { k: "Workers compensation", v: "Current" },
  { k: "SWMS", v: "Before site access" },
  { k: "Compliance certificates", v: "On completion" },
];

/* ============================ THE PEOPLE ============================ */

/**
 * Three people, and the third one is the point.
 *
 * Dean signs the works and Jake prices them, which is what a builder asks.
 * Kellie is who they will actually deal with most weeks, and leaving her off
 * would misrepresent the company. Her photograph has not been taken yet, so
 * she gets a lettered card rather than a stock face or an empty frame.
 */
export const COMM_LEADERSHIP: {
  name: string;
  role: string;
  cred: string;
  bio: string;
  photo?: string;
  /** Shown in place of a photograph until one exists. */
  initial?: string;
}[] = [
  {
    name: "Dean Winbanks",
    role: "Director · Licensed Plumber",
    cred: "Licence 46828",
    bio: "Over twenty years across industrial, commercial and domestic work. He sets the standard every job is measured against, and he signs off every compliance certificate we issue.",
    photo: "/dean.webp",
  },
  {
    name: "Jake Deppeler",
    role: "Estimating & install",
    cred: site.licences.refrigeration,
    bio: "Your first point of contact for pricing. Reads every commercial enquiry himself and prices it off the drawings. If we have quoted it, he has been on the roof.",
    photo: "/jake.webp",
  },
  {
    name: "Kellie",
    role: "Office & scheduling",
    cred: site.email,
    bio: "Keeps jobs booked, compliance certificates issued and the paperwork moving, so nothing slips and you're never left chasing.",
    initial: "K",
  },
];

/** Four reasons, for the About page. */
export const COMM_HOW_WE_WORK: { n: string; h: string; p: string }[] = [
  {
    n: "01",
    h: "One point of contact",
    p: "Quote, schedule and sign-off through one accountable team. No call centres, no subcontractor run-around.",
  },
  {
    n: "02",
    h: "Compliance handled",
    p: "We issue the Certificates of Electrical & Gas Safety and all compliance paperwork. You don't chase a thing.",
  },
  {
    n: "03",
    h: "On time, on budget",
    p: "Work completed to schedule and within the agreed price.",
  },
  {
    n: "04",
    h: "Genuinely local",
    p: "A Pakenham-based fleet across the south-east and Gippsland. Fast on site when it matters.",
  },
];

/**
 * The community photographs.
 *
 * Three real clubs the crew turn out for. The photographs have not been
 * supplied yet, so each slot renders as a labelled frame rather than
 * disappearing — an empty section would read as a claim with nothing behind
 * it, and a stock photograph of somebody else's football club would be
 * worse than that.
 */
export const COMM_COMMUNITY: { cap: string }[] = [
  { cap: "Local football" },
  { cap: "Basketball" },
  { cap: "Netball" },
];

/* =========================== WHERE WE WORK =========================== */

/** The chips on the capability overview. */
export const COMM_AREA_NEAR: string[] = [
  "Berwick",
  "Officer",
  "Beaconsfield",
  "Cranbourne",
  "Dandenong",
  "Drouin",
  "Warragul",
  "The Gippsland corridor",
];

/** The chips beside the radar on contact. */
export const COMM_AREA_TOWNS: string[] = [
  "Pakenham",
  "Officer",
  "Beaconsfield",
  "Berwick",
  "Narre Warren",
  "Cranbourne",
  "Clyde North",
  "Dandenong",
  "Drouin",
  "Warragul",
];

/**
 * The towns on the radar, at their true bearing and distance from Pakenham.
 *
 * `x`/`y` are viewBox coordinates on a 520×420 canvas centred at (260, 210),
 * at 2.5px per kilometre — so the rings at 62, 125 and 187 are 25, 50 and
 * 75 km. `ping` marks the three that pulse; `lx`/`ly` place the label clear
 * of its own dot.
 */
export const COMM_RADAR: {
  name: string;
  x: number;
  y: number;
  lx: number;
  ly: number;
  ping?: number;
  faint?: boolean;
}[] = [
  { name: "Melbourne CBD", x: 146, y: 138, lx: 100, ly: 128, faint: true },
  { name: "Berwick", x: 231, y: 199, lx: 178, ly: 196 },
  { name: "Dandenong", x: 201, y: 190, lx: 136, ly: 186, ping: 0.6 },
  { name: "Cranbourne", x: 216, y: 218, lx: 146, ly: 230, ping: 1.4 },
  { name: "Emerald", x: 251, y: 171, lx: 226, ly: 160 },
  { name: "Koo Wee Rup", x: 262, y: 246, lx: 248, ly: 264 },
  { name: "Drouin", x: 344, y: 227, lx: 330, ly: 216, ping: 2 },
  { name: "Warragul", x: 359, y: 235, lx: 368, ly: 244 },
];
