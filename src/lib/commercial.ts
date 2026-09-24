/**
 * The commercial side, as data.
 *
 * Kept apart from the residential service list on purpose. A facility manager
 * is not shopping for a split system — they are trying to work out whether you
 * can be let onto a site, whether you will create work for them, and whether
 * the paperwork will land. The scopes, the words and the proof are all
 * different, so they live in their own file rather than sharing one with the
 * homeowner content and slowly bending it out of shape.
 */

import { site } from "./site";
import type { DoorIconKey } from "@/components/DoorIcon";

export type CommScope = {
  slug: string;
  n: string;
  title: string;
  lede: string;
  detail: string[];
  suits: string;
};

export const COMM_SCOPES: CommScope[] = [
  {
    slug: "fit-outs",
    n: "01",
    title: "Tenancy & retail fit-outs",
    lede: "Mechanical services for a new tenancy, delivered to the builder's programme.",
    detail: [
      "Ductwork, plant, controls and commissioning as one package",
      "Coordinated with the head contractor and the other trades",
      "Staged so a trading site keeps trading",
    ],
    suits: "Builders, national retail rollouts, tenancy coordinators",
  },
  {
    slug: "base-build",
    n: "02",
    title: "Base build mechanical",
    lede: "The mechanical package on a new build, from the schedule through to handover.",
    detail: [
      "Priced from the drawings and the mechanical schedule",
      "Plant, ductwork, ventilation and controls as one trade",
      "As-builts, O&M manuals and commissioning data at handover",
    ],
    suits: "Builders, developers, project managers",
  },
  {
    slug: "plant-replacement",
    n: "03",
    title: "System replacement on live sites",
    lede: "Swapping end-of-life plant on a building that cannot stop.",
    detail: [
      "Out-of-hours and staged changeovers",
      "Temporary cooling where the site cannot go without",
      "Old plant decommissioned, degassed and disposed of to spec",
    ],
    suits: "Facility managers, building owners, asset managers",
  },
  {
    slug: "maintenance",
    n: "04",
    title: "Scheduled maintenance",
    lede: "Planned preventative maintenance that keeps a site compliant and the plant alive.",
    detail: [
      "Service schedules built around the asset, not a calendar template",
      "Condition reports and photographs against every visit",
      "Statutory items tracked and flagged before they fall due",
    ],
    suits: "Multi-site retail, aged care, education, industrial",
  },
  {
    slug: "gas",
    n: "05",
    title: "Type A & Type B gas",
    lede: "Gas appliance installation, servicing and compliance, domestic through to industrial.",
    detail: [
      "Type A appliance installation and servicing",
      "Type B industrial appliance work",
      "Gas line design, sizing and pressure testing",
    ],
    suits: "Hospitality, aged care, industrial, education",
  },
  {
    slug: "hot-water",
    n: "06",
    title: "Commercial hot water",
    lede: "Hot water plant sized for a building rather than a household.",
    detail: [
      "Continuous flow banks, storage and recirculation",
      "Heat pump plant where the running cost decides it",
      "Tempering, compliance and certificates on completion",
    ],
    suits: "Hospitality, accommodation, aged care, gyms",
  },
  {
    slug: "evaporative",
    n: "07",
    title: "Commercial evaporative cooling",
    lede: "High-volume evaporative cooling for spaces that can't be sealed and chilled.",
    detail: [
      "Warehouses, workshops and production floors",
      "Roof and ground-mounted units, ducted or direct",
      "Relief air designed in, not left to the roller door",
    ],
    suits: "Warehousing, manufacturing, workshops",
  },
  {
    slug: "ventilation",
    n: "08",
    title: "Ventilation & kitchen exhaust",
    lede: "Supply, exhaust and make-up air, including commercial kitchens.",
    detail: [
      "Kitchen canopies, exhaust and make-up air",
      "Carpark, plant room and amenities ventilation",
      "Ducted to the standard, not to whatever fits",
    ],
    suits: "Hospitality, QSR, industrial, carparks",
  },
  {
    slug: "commissioning",
    n: "09",
    title: "Air balancing & commissioning",
    lede: "Systems proved against the design figures and handed over with the numbers.",
    detail: [
      "Air balanced to the mechanical schedule",
      "Controls and zoning set up and demonstrated",
      "Commissioning data and certificates in the handover pack",
    ],
    suits: "Consultants, builders, building owners",
  },
  {
    slug: "breakdowns",
    n: "10",
    title: "Breakdown response",
    lede: "A number that gets answered when the plant stops on a Friday afternoon.",
    detail: [
      "Priority response on contracted sites",
      "After-hours attendance",
      "Make-safe, then a priced repair before the work goes ahead",
    ],
    suits: "Anyone with a site that cannot be closed",
  },
];

/**
 * Everything a procurement team asks for before you're allowed on site.
 *
 * The third element marks a value as an IDENTIFIER rather than a sentence —
 * a licence number, an ABN, a figure — which the commercial front page sets
 * in mono so it can be read off the screen digit by digit and typed into a
 * form somewhere else. That is what these rows are for.
 */
const PLUMBING_NO = site.licences.plumbing.replace(/^plumbing licence\s*/i, "");

export const CAPABILITY: { group: string; rows: [string, string, boolean?][] }[] = [
  {
    group: "The entity",
    rows: [
      ["Legal name", site.legalName],
      ["Trading as", site.name],
      ["ABN", site.abn, true],
      ["ACN", site.acn, true],
      ["Registered address", `${site.address.street}, ${site.address.suburb} ${site.address.state} ${site.address.postcode}`],
      ["Years trading", "12"],
    ],
  },
  {
    group: "Licences & authorisations",
    rows: [
      ["Plumbing licence", `Lic. ${PLUMBING_NO}`, true],
      ["Refrigerant handling", site.licences.refrigeration, true],
      ["Type A gas", "Appliance installation & servicing"],
      ["Mechanical services", "Design, install, commission"],
    ],
  },
  {
    group: "Insurance",
    rows: [
      ["Public liability", "$20,000,000", true],
      ["Workers compensation", "Current. Certificate of currency on request"],
      ["Motor vehicle", "Comprehensive, full fleet"],
      ["Tools & plant", "Covered"],
    ],
  },
  {
    group: "Safety & compliance",
    rows: [
      ["SWMS", "Supplied before site access"],
      ["Site inductions", "Completed and returned within 24 hours"],
      ["Documented procedures", "Written SOPs, reviewed and version controlled"],
      ["Job records", "Photographs and forms against every job, retained"],
      ["Compliance certificates", "Issued on completion"],
    ],
  },
  {
    group: "Capacity",
    rows: [
      ["Workforce", "Directly employed installers and apprentices, not subcontracted"],
      ["Base", `${site.address.suburb}, VIC`],
      ["Service area", "Melbourne's south-east and Gippsland, and further for contract work"],
      ["Response", "Priority attendance on contracted sites, after hours available"],
    ],
  },
];

/**
 * Who already lets us on site.
 *
 * `sector` is not decoration. A facility manager scanning this is looking
 * for somebody like them, and "Branch fit-out" does not say whether that
 * was a bank or a bakery. It also groups the list into three kinds of
 * client — institutional, consumer-facing and trade — which is the only
 * grouping that carries a colour honestly rather than a colour per row.
 *
 * Four groups, not three: a tier-one builder is neither an institution nor a
 * trade supplier, and on this page it is the one kind of client every other
 * builder reading the page is looking for.
 */
export type CommClient = {
  name: string;
  what: string;
  where: string;
  sector: string;
  /** institutional · consumer · builder · trade — drives the pill colour. */
  tone: "inst" | "cons" | "build" | "trade";
};

export const COMM_CLIENTS: CommClient[] = [
  { name: "Westpac", what: "Branch fit-out", where: "Sale, Gippsland", sector: "Banking", tone: "inst" },
  { name: "Commonwealth Bank", what: "Branch fit-out", where: "Victoria", sector: "Banking", tone: "inst" },
  { name: "Kane Constructions", what: "Tier-one builder, subcontract packages", where: "Victoria", sector: "Construction", tone: "build" },
  { name: "Petbarn", what: "National retail rollout", where: "Multi-site", sector: "Retail", tone: "cons" },
  { name: "Greencross", what: "Vet clinics", where: "Multi-site", sector: "Retail", tone: "cons" },
  { name: "Reece Group", what: "Multi-site service contract", where: "Victoria", sector: "Trade supply", tone: "trade" },
  { name: "Reliance Worldwide", what: "Industrial service contract", where: "Victoria", sector: "Industrial", tone: "trade" },
  { name: "KFC", what: "Hospitality / QSR", where: "Victoria", sector: "Hospitality", tone: "cons" },
  { name: "Retirement Villages Constructions", what: "Aged care, heat pump upgrades", where: "Victoria", sector: "Aged care", tone: "inst" },
  { name: "Pakenham Springs P.S.", what: "Education", where: "Pakenham", sector: "Education", tone: "inst" },
];


/**
 * The technical capabilities, for the strip that runs under the hero.
 *
 * These are the words a facility manager or a mechanical consultant scans for.
 * "Air balancing" and "VRV/VRF" say more about whether we can be trusted with a
 * package than any paragraph does — they are either in your vocabulary or they
 * are not.
 *
 * Anything here has to be something we genuinely do. A capability claimed and
 * then declined at tender is worse than one never claimed — so the list is
 * confirmed with Jake line by line before anything is added to it, rather than
 * padded out with things that sound good on a mechanical schedule.
 */
export const COMM_CAPABILITIES = [
  "VRV / VRF systems",
  "Ducted systems",
  "Packaged rooftop units",
  "Air balancing",
  "Mechanical ventilation",
  "Kitchen & exhaust ventilation",
  "Type A gas",
  "Commercial hot water",
  "Heat pump plant",
  "Split & multi-head",
  "Controls & zoning",
  "ARC refrigerant handling",
  "System replacement",
  "Commissioning & handover",
  "Preventative maintenance",
  "Breakdown response",
];

/** How a commercial job actually runs, start to finish. */
export const COMM_PROCESS: { n: string; h: string; p: string }[] = [
  {
    n: "01",
    h: "We get the plans",
    p: "Drawings, a mechanical schedule, a site address: whatever you have. We read them properly before we quote, and if something is missing or does not add up we come back and ask rather than pricing around it and arguing later.",
  },
  {
    n: "02",
    h: "We put the scope together with you",
    p: "We write what we are actually going to do, in a form you can check line by line. Exclusions are stated, not buried. Where the drawings leave a gap we tell you what we have assumed, so nobody is relying on a different reading of the same page.",
  },
  {
    n: "03",
    h: "Priced against that scope",
    p: "One price against one written scope. If the scope changes, and on a live site it usually does, it is repriced and approved before the work happens. No variations arriving with the invoice.",
  },
  {
    n: "04",
    h: "We work to your program",
    p: "Install windows coordinated with the head contractor and the other trades. Staged, out of hours or over a weekend if the site has to keep trading. SWMS and inductions are back before anyone turns up, not on the morning.",
  },
  {
    n: "05",
    h: "Commissioned, balanced, certified",
    p: "Systems commissioned and air balanced to the design figures, not to whatever falls out. Compliance certificates issued, defects closed before handover rather than after.",
  },
  {
    n: "06",
    h: "Handed over properly",
    p: "As-builts, O&M manuals, warranties and the commissioning data, in one handover. Then a maintenance contract from there if you want the plant to reach the life it was specified for.",
  },
];

/**
 * The standard, which is what the residential "why us" grid is for. Six on
 * that side, six here — the reassurances a facility manager needs are not the
 * ones a homeowner needs, but there are just as many of them.
 */
export const COMM_STANDARD: { n: string; h: string; p: string }[] = [
  {
    n: "01",
    h: "Our own crews",
    p: "Directly employed installers and apprentices. The crew in week three is the crew from week one.",
  },
  {
    n: "02",
    h: "The standard is written down",
    p: "Twenty procedures, not folklore held by whoever has been here longest. Ask to see them.",
  },
  {
    n: "03",
    h: "Documented on the day",
    p: "Photos, forms and certificates finished on site. Not reconstructed on a Friday afternoon.",
  },
  {
    n: "04",
    h: "Paperwork before boots",
    p: "SWMS, certificates of currency and inductions back the same day you ask for them.",
  },
  {
    n: "05",
    h: "One contact, start to finish",
    p: "Whoever prices it is who you ring about it. Not a call centre, not a ticket number.",
  },
  {
    n: "06",
    h: "We will tell you no",
    p: "If a scope needs something we cannot do properly, you hear it while you can still act on it.",
  },
];

/**
 * The questions that decide whether we get let onto a site. These are the ones
 * that actually arrive by email before a first job — not the ones that make us
 * look good.
 */
export const COMM_FAQS: { q: string; a: string }[] = [
  {
    q: "What insurance do you carry?",
    a: "$20,000,000 public liability, current workers compensation, comprehensive motor on the full fleet, and tools and plant cover. Certificates of currency go out the same day you ask. You do not need to chase them.",
  },
  {
    q: "Can you meet a builder's program?",
    a: "Yes, and we will tell you before we quote if we can't. Install windows are coordinated with the head contractor and the other trades, and we work staged, out of hours or over a weekend where a site has to keep trading. What we won't do is take a package we can't resource and then hold up the trades behind us.",
  },
  {
    q: "How do variations work?",
    a: "One price against one written scope. If the scope changes, and on a live site it usually does, it is repriced and approved in writing before the work happens. You will never get a variation arriving attached to the invoice.",
  },
  {
    q: "Do you supply SWMS and site inductions?",
    a: "SWMS are supplied before site access, and inductions are completed and returned within 24 hours. If your site uses a particular contractor management system, tell us which one and we'll get set up in it rather than sending you PDFs.",
  },
  {
    q: "Are you licensed for refrigerant and Type A gas work?",
    a: `ARC refrigerant handling licence ${site.licences.refrigeration} and plumbing licence ${site.licences.plumbing}, both current. Type A appliance installation and servicing, with compliance certificates issued on completion.`,
  },
  {
    q: "How far do you travel?",
    a: "The standard service area is 75 km from Pakenham, which covers Melbourne's south-east. We travel further for rollout and contract work. The Westpac branch was in Sale. If you have multiple sites spread across the state, talk to us about it rather than assuming we're out of range.",
  },
  {
    q: "Will you take a one-off job, or is it contract work only?",
    a: "Both. A single plant replacement is a perfectly good first job, and it's usually how a maintenance contract starts anyway. There's no minimum.",
  },
  {
    q: "Who actually turns up?",
    a: "Our own people, in our own vans, in our own uniform. If we ever needed to bring in a specialist for part of a package, say a crane crew or a balancing contractor on a large system, we'd tell you who and why at quote stage, not on the day.",
  },
];

/**
 * The four figures a procurement team writes down.
 *
 * Deliberately not "1,200 installs" or "4.9 stars" — those are the residential
 * numbers and they answer a homeowner's question. These answer the only ones
 * that decide whether a package gets awarded: are you covered, can you be let
 * on site, how fast does the paperwork come back, and who actually turns up.
 */
export const COMM_FACTS: { n: string; k: string; p: string }[] = [
  { n: "12", k: "years trading", p: "Same family, same name, same base in Pakenham since 2014." },
  { n: "$20M", k: "public liability", p: "Certificate of currency back the same day you ask for it." },
  { n: "Before site", k: "paperwork returned", p: "SWMS, certificates of currency and site inductions land before anyone turns up. If they are not back, we are not on site." },
  { n: "100%", k: "directly employed", p: "Our own installers and apprentices. No labour hire, no rotating subcontractors." },
];


/**
 * The brands we are authorised for.
 *
 * Daikin is on the list because it is in the fit-out photographs — the VRV
 * outdoor units on that roof are ours. Confirm the final list with Jake
 * before this is treated as a claim rather than a description.
 */
export const COMM_BRANDS: { name: string; what: string }[] = [
  { name: "Daikin", what: "VRV & ducted" },
  { name: "Mitsubishi", what: "Electric aircon" },
  { name: "Kaden", what: "Aircon" },
  { name: "Brivis", what: "Gas ducted" },
  { name: "Reclaim", what: "Heat pumps" },
  { name: "iStore", what: "Heat pumps" },
  { name: "Thermann", what: "Hot water" },
];

/**
 * One commercial fit-out, photographed by the crew on the job.
 *
 * These are the first real commercial photographs the site has had — until
 * now the only one was the crane shot, and everything else in the library
 * was domestic. The captions describe what is in frame; swap them for the
 * project name and location if that is ever cleared to publish.
 *
 * `big` spans two columns and two rows at the top left of the grid.
 */
export const COMM_GALLERY: { src: string; cap: string; big?: boolean }[] = [
  { src: "/comm/lift.jpg", cap: "Plant lifted to the roof by crane", big: true },
  { src: "/comm/vrv-outdoor.jpg", cap: "VRV outdoor unit, set on the roof" },
  { src: "/comm/rooftop-daikin-box.jpg", cap: "Units landed on the roof, still boxed" },
  { src: "/comm/ceiling-unit.jpg", cap: "Ceiling unit going in above the fit-out" },
  { src: "/comm/duct-install.jpg", cap: "Supply ductwork hung from the steel" },
  { src: "/comm/ductwork.jpg", cap: "Duct transitions before the ceiling closes" },
  { src: "/comm/unit-lift.jpg", cap: "Indoor unit lifted into position" },
  { src: "/comm/ewp-unit.jpg", cap: "Hanging units from the roof structure" },
  { src: "/comm/fitout-floor.jpg", cap: "Pipe runs across the tenancy" },
];
