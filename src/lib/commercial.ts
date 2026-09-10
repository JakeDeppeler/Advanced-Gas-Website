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
      "As-builts, compliance certificates and O&M on handover",
    ],
    suits: "Builders, national retail rollouts, tenancy coordinators",
  },
  {
    slug: "plant-replacement",
    n: "02",
    title: "Plant replacement on live sites",
    lede: "Swapping end-of-life plant on a building that cannot stop.",
    detail: [
      "Out-of-hours and staged changeovers",
      "Temporary cooling where the site cannot go without",
      "Crane and access coordination",
      "Old plant decommissioned, degassed and disposed of to spec",
    ],
    suits: "Facility managers, building owners, asset managers",
  },
  {
    slug: "maintenance",
    n: "03",
    title: "Scheduled maintenance contracts",
    lede: "Planned preventative maintenance that keeps a site compliant and the plant alive.",
    detail: [
      "Service schedules built around the asset, not a calendar template",
      "Condition reports and photographs against every visit",
      "Statutory and compliance items tracked and flagged before they fall due",
      "One contact, one invoice, across as many sites as you have",
    ],
    suits: "Multi-site retail, aged care, education, industrial",
  },
  {
    slug: "gas",
    n: "04",
    title: "Type A gas & commercial hot water",
    lede: "Gas appliance installation, servicing and compliance, and commercial hot water plant.",
    detail: [
      "Type A appliance installation and servicing",
      "Gas line design, sizing and pressure testing",
      "Commercial hot water including heat pump plant",
      "Compliance certificates issued on completion",
    ],
    suits: "Hospitality, aged care, industrial, education",
  },
  {
    slug: "breakdowns",
    n: "05",
    title: "Breakdown response",
    lede: "A number that gets answered when the plant stops on a Friday afternoon.",
    detail: [
      "Priority response on contracted sites",
      "After-hours attendance",
      "Fault diagnosis reported in writing, not over the phone and forgotten",
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
      ["Workers compensation", "Current — certificate of currency on request"],
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
      ["Workforce", "Directly employed — installers and apprentices, not subcontracted"],
      ["Base", `${site.address.suburb}, VIC`],
      ["Service area", "Melbourne's south-east and Gippsland, and further for contract work"],
      ["Response", "Priority attendance on contracted sites, after hours available"],
    ],
  },
];

export const COMM_CLIENTS: { name: string; what: string; where: string }[] = [
  { name: "Westpac", what: "Branch fit-out", where: "Sale, Gippsland" },
  { name: "Commonwealth Bank", what: "Branch fit-out", where: "Victoria" },
  { name: "Kane Constructions", what: "Tier-one builder — subcontract packages", where: "Victoria" },
  { name: "Petbarn", what: "National retail rollout", where: "Multi-site" },
  { name: "Greencross", what: "Vet clinics", where: "Multi-site" },
  { name: "Reece Group", what: "Multi-site service contract", where: "Victoria" },
  { name: "Reliance Worldwide", what: "Industrial service contract", where: "Victoria" },
  { name: "KFC", what: "Hospitality / QSR", where: "Victoria" },
  { name: "Retirement Villages Constructions", what: "Aged care — heat pump upgrades", where: "Victoria" },
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
  "Refrigerant handling — ARC",
  "Plant replacement",
  "Commissioning & handover",
  "Preventative maintenance",
  "Breakdown response",
];

/** How a commercial job actually runs, start to finish. */
export const COMM_PROCESS: { n: string; h: string; p: string }[] = [
  {
    n: "01",
    h: "We get the plans",
    p: "Drawings, a mechanical schedule, a site address — whatever you have. We read them properly before we quote, and if something is missing or does not add up we come back and ask rather than pricing around it and arguing later.",
  },
  {
    n: "02",
    h: "We put the scope together with you",
    p: "We write what we are actually going to do, in a form you can check line by line. Exclusions are stated, not buried. Where the drawings leave a gap we tell you what we have assumed, so nobody is relying on a different reading of the same page.",
  },
  {
    n: "03",
    h: "Priced against that scope",
    p: "One price against one written scope. If the scope changes — and on a live site it usually does — it is repriced and approved before the work happens. No variations arriving with the invoice.",
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
