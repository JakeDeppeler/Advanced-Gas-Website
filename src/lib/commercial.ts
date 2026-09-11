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
import type { SweepKind } from "@/components/RouteMotion";

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

/** Everything a procurement team asks for before you're allowed on site. */
export const CAPABILITY: { group: string; rows: [string, string][] }[] = [
  {
    group: "The entity",
    rows: [
      ["Legal name", site.legalName],
      ["Trading as", site.name],
      ["ABN", site.abn],
      ["ACN", site.acn],
      ["Registered address", `${site.address.street}, ${site.address.suburb} ${site.address.state} ${site.address.postcode}`],
      ["Years trading", "12"],
    ],
  },
  {
    group: "Licences & authorisations",
    rows: [
      ["Plumbing licence", site.licences.plumbing],
      ["Refrigerant handling", site.licences.refrigeration],
      ["Type A gas", "Appliance installation & servicing"],
      ["Mechanical services", "Design, install, commission"],
    ],
  },
  {
    group: "Insurance",
    rows: [
      ["Public liability", "$20,000,000"],
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

export const COMM_CLIENTS: { name: string; what: string; where: string }[] = [
  { name: "Westpac", what: "Branch fit-out", where: "Sale, Gippsland" },
  { name: "Commonwealth Bank", what: "Branch fit-out", where: "Victoria" },
  { name: "Kane Constructions", what: "Tier-one builder, subcontract packages", where: "Victoria" },
  { name: "Petbarn", what: "National retail rollout", where: "Multi-site" },
  { name: "Greencross", what: "Vet clinics", where: "Multi-site" },
  { name: "Reece Group", what: "Multi-site service contract", where: "Victoria" },
  { name: "Reliance Worldwide", what: "Industrial service contract", where: "Victoria" },
  { name: "KFC", what: "Hospitality / QSR", where: "Victoria" },
  { name: "Retirement Villages Constructions", what: "Aged care, heat pump upgrades", where: "Victoria" },
  { name: "Pakenham Springs P.S.", what: "Education", where: "Pakenham" },
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
 * The four doors off the top of the commercial page — the same shape as the
 * residential ones, named for what a PM or an FM is actually holding when they
 * land here. They go to the scope anchors on the services page rather than to
 * a form, because at this point the question is "do you do this", not "can I
 * have a price".
 */
export const COMM_DOORS: { href: string; label: string; sub: string; icon: DoorIconKey; tone: string; sweep: SweepKind }[] = [
  { href: "/commercial/services#fit-outs", label: "Fit-outs", sub: "To the builder's program", icon: "fitout", tone: "navy", sweep: "build" },
  { href: "/commercial/services#plant-replacement", label: "System replacement", sub: "On a site that can't stop", icon: "plant", tone: "sky", sweep: "crane" },
  { href: "/commercial/services#maintenance", label: "Maintenance", sub: "Across every site you have", icon: "maintenance", tone: "ink", sweep: "schedule" },
  { href: "/commercial/services#breakdowns", label: "Breakdowns", sub: "Priority response, after hours", icon: "breakdown", tone: "orange", sweep: "callout" },
];
/**
 * The standard, which is what the residential "why us" grid is for. Six on
 * that side, six here — the reassurances a facility manager needs are not the
 * ones a homeowner needs, but there are just as many of them.
 */
export const COMM_STANDARD: { n: string; h: string; p: string }[] = [
  {
    n: "01",
    h: "Directly employed crews",
    p: "Our own installers and apprentices. Not labour hire, not a different subcontractor each visit. The crew in week three works the way the crew in week one did, because it is the same crew.",
  },
  {
    n: "02",
    h: "The standard is written down",
    p: "Twenty procedures covering how a van is stocked, what gets photographed, what gets certified and what happens when something goes wrong. It is not folklore held by whoever has been here longest. Ask to see it.",
  },
  {
    n: "03",
    h: "Documented on the day",
    p: "Photos, forms and notes completed on site, not reconstructed on Friday afternoon. Compliance certificates on completion. If it is not recorded, it is not finished.",
  },
  {
    n: "04",
    h: "Paperwork before site access",
    p: "SWMS, certificates of currency and inductions back before anyone turns up, usually the same day you ask. Nobody on your side should be chasing us for a document on the morning of the install.",
  },
  {
    n: "05",
    h: "One contact through the trade",
    p: "The person who prices it is the person you ring about it. Not a call centre, not a ticket number, not a different name on every email in the chain.",
  },
  {
    n: "06",
    h: "We will tell you no",
    p: "If a scope needs something we are not set up to do properly, we say so while you can still do something about it. That is cheaper for both of us than finding out at the halfway mark.",
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
