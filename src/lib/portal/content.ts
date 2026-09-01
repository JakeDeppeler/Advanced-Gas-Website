/**
 * Portal content — the handbook shelves, videos, reference info and tools.
 *
 * The HANDBOOK below is the company operations manual, grouped into the
 * seven shelves (A–G). Each item carries a status:
 *   - "have"  → the content is written, it just needs loading in (add an
 *               `href` to a file/Google Doc and it goes live).
 *   - "write" → a genuine gap still to create.
 *   - today   → flagged as ready-today in the source map.
 * So this doubles as the team's table of contents and our build tracker.
 *
 * Everything is plain data — edit here to change what's in the portal.
 */

export type HandbookStatus = "have" | "write";

export type HandbookItem = {
  title: string;
  note?: string;
  status: HandbookStatus;
  today?: boolean;
  href?: string; // add a file/Doc link and the item becomes clickable
  gap?: string;  // for "write" items: what's needed
};

export type Shelf = {
  letter: string;
  title: string;
  items: HandbookItem[];
};

export const HANDBOOK: Shelf[] = [
  {
    letter: "A",
    title: "Who we are & how we work",
    items: [
      { title: "Welcome / who we are", note: "Company, licences, org chart", status: "have" },
      { title: "The 10 standards we run on", status: "have" },
      { title: "Attitude & the two-way deal", note: "“We train as long as you learn”", status: "have", today: true },
      { title: "Who owns what + who decides", status: "have" },
      { title: "The weekly & daily rhythm", note: "Van check, Monday huddle, scorecard, Wednesday planning", status: "have" },
    ],
  },
  {
    letter: "B",
    title: "Your role & your future",
    items: [
      { title: "Expectations per role", note: "Tradesman & apprentice", status: "have" },
      { title: "The career ladder", note: "Apprentice yr 1–4 → tradesman → leading hand → manager", status: "have", today: true },
      { title: "Pay bands", status: "write", gap: "Needs award check + sign-off" },
      { title: "KPIs per role", note: "The 3–4 each person is scored on", status: "write", gap: "Targets exist, per-role split doesn’t" },
      { title: "Reward & consequence", note: "What you earn, and the fair path when you miss", status: "have", today: true },
    ],
  },
  {
    letter: "C",
    title: "The places — factory & vans",
    items: [
      { title: "Keep the factory clean", note: "Daily tidy, who owns which area, end-of-day", status: "write" },
      { title: "Stock & restock system", note: "Van kit list, running-low flag, deliveries", status: "write" },
      { title: "Van care", note: "Daily/weekly by the crew", status: "have" },
      { title: "The monthly van condition check + damage log", status: "have", today: true },
      { title: "Rego, service & fuel", note: "Who tracks it", status: "write" },
    ],
  },
  {
    letter: "D",
    title: "The customer",
    items: [
      { title: "At the front door", note: "Parking, “G’day I’m [name] from Advanced Gas,” boots, their-home-their-rules", status: "have" },
      { title: "How we present", note: "Uniform, ID, business card", status: "have" },
      { title: "How we sell", note: "Value not price, the 4 steps, diagnose & explain, Good/Better/Best, the iPad menu, quoting on the phone, “it’s too expensive,” ask for the sale", status: "have" },
      { title: "How we quote & price", note: "Three options always, never invent a price, scope changes priced first, rebates", status: "have" },
    ],
  },
  {
    letter: "E",
    title: "The systems",
    items: [
      { title: "On the job in ServiceTitan", note: "Lead → dispatch → estimate → invoice → paid, photos & forms every time", status: "have" },
      { title: "The numbers", note: "The scoreboard, GP%, utilisation, what they mean", status: "have" },
      { title: "Reviews", note: "Ask every happy job, make it easy, reply to them", status: "have" },
      { title: "The website & where to point everyone", status: "have" },
    ],
  },
  {
    letter: "F",
    title: "Safety, compliance & admin",
    items: [
      { title: "Safety wins every argument", note: "SWMS/JSA, incident reporting", status: "write", gap: "Consolidate" },
      { title: "Compliance", note: "Never work outside your licence, gas & ARC, compliance certs", status: "write", gap: "Consolidate" },
      { title: "Timesheets, invoicing & getting paid", status: "write" },
    ],
  },
  {
    letter: "G",
    title: "Forms & templates",
    items: [
      { title: "Estimate templates", note: "Good/Better/Best, top 10 jobs", status: "write", gap: "Part of the ServiceTitan build" },
      { title: "Checklists", note: "Van kit, front-door card, before-go-live", status: "write", gap: "Part have / part write" },
    ],
  },
];

/* ------------------------------------------------------------- Videos -- */
export type LearningTrackSlug = "on-the-tools" | "sales" | "customer" | "accounting";

export type Video = {
  title: string;
  category: string;
  track: LearningTrackSlug;
  description: string;
  youtubeId?: string; // just the id, e.g. "dQw4w9WgXcQ"
  minutes?: number;
};

/** The learning tracks — the sidebar splits Learning into these so the crew
 *  can jump to "on the tools" vs "accounting & admin" rather than scrolling
 *  one long list. */
export const LEARNING_TRACKS: { slug: LearningTrackSlug; label: string; blurb: string }[] = [
  { slug: "on-the-tools", label: "On the tools", blurb: "Install methods, commissioning and the on-site standard." },
  { slug: "sales", label: "Sales & quoting", blurb: "Presenting options, explaining rebates, asking for the sale." },
  { slug: "customer", label: "The customer", blurb: "How we show up and set the tone on arrival." },
  { slug: "accounting", label: "Accounting & admin", blurb: "Timesheets, invoicing, ServiceTitan and getting paid." },
];

export const VIDEOS: Video[] = [
  { title: "Back-to-back split install, start to finish", category: "Install standards", track: "on-the-tools", description: "The full method on a standard job.", minutes: 12 },
  { title: "Zoning a ducted system with Zonemate", category: "Install standards", track: "on-the-tools", description: "Setting up and balancing zones.", minutes: 9 },
  { title: "Reclaim CO₂ heat pump commissioning", category: "Products & brands", track: "on-the-tools", description: "First run, temp check and app setup.", minutes: 7 },
  { title: "Talking a customer through the VEU rebate", category: "Sales & quoting", track: "sales", description: "How to explain the rebate simply on a quote call.", minutes: 5 },
  { title: "Good / Better / Best on the iPad", category: "Sales & quoting", track: "sales", description: "Presenting three options the right way.", minutes: 6 },
  { title: "The front-door approach", category: "The customer", track: "customer", description: "How we introduce ourselves and set the tone on arrival.", minutes: 4 },
];

/* -------------------------------------------------------------- Tools -- */
export type ToolLink = {
  title: string;
  description: string;
  href: string;
  external?: boolean;
};

export const TOOLS: ToolLink[] = [
  { title: "Heat pump sizing", description: "Size a tank off shower draw-off, not bedroom count.", href: "/tools/heat-pump-sizing" },
  { title: "VEU rebate estimator", description: "Ballpark the rebate before a site visit.", href: "/tools/veu-rebate-estimator" },
  { title: "Running-cost calculator", description: "Heat pump vs gas running costs for the quote.", href: "/tools/running-cost-calculator" },
  { title: "Fault-code finder", description: "Look up a brand + code on site.", href: "/tools/fault-codes" },
  { title: "System comparison", description: "Compare system types side by side.", href: "/tools/system-comparison" },
  { title: "Full price list", description: "Every model, installed price, VEU applied.", href: "/pricing" },
];

/* -------------------------------------------------------------- Info --- */
export type InfoBlock = {
  title: string;
  rows: { k: string; v: string }[];
};

export const INFO: InfoBlock[] = [
  {
    title: "The numbers we quote",
    rows: [
      { k: "Quote turnaround", v: "Fixed price back within 12 business hours" },
      { k: "Workmanship warranty", v: "6 years, every job" },
      { k: "Compliance cert", v: "Emailed within 24 hours of install" },
      { k: "After-hours call-out", v: "$380 call-out, then $260/hr after" },
      { k: "Standard split service", v: "$220 (or $140 ea for 3+ at one address)" },
      { k: "Service area", v: "Pakenham + 75 km" },
    ],
  },
  {
    title: "Licences & accreditation",
    rows: [
      { k: "ARCtick", v: "AU59557" },
      { k: "Plumbing licence", v: "46828" },
      { k: "ABN", v: "35 607 575 280" },
      { k: "ACN", v: "607 575 280" },
      { k: "Public liability", v: "$20M" },
      { k: "Accreditation", v: "VEU accredited · Reece trade partner" },
    ],
  },
  {
    title: "Head office",
    rows: [
      { k: "Address", v: "1 Sierra Circuit, Pakenham VIC 3810" },
      { k: "Office", v: "(03) 5947 8000" },
      { k: "Hours", v: "Mon–Fri, 8:00am–4:00pm" },
    ],
  },
];

/* ------------------------------------------------- Information sections -- */
/**
 * The Information area, split into the sections the sidebar expands into —
 * about the business, the history, the roles, pricing, licences, contact.
 * Each block is either a set of key/value rows, body paragraphs, or a bullet
 * list. Edit here to change what the crew reads.
 */
export type InfoRow = { k: string; v: string };
export type InfoContentBlock = { title: string; rows?: InfoRow[]; body?: string[]; list?: string[] };
export type InfoSection = { slug: string; label: string; title: string; intro?: string; blocks: InfoContentBlock[] };

export const INFO_SECTIONS: InfoSection[] = [
  {
    slug: "business",
    label: "The business",
    title: "About Advanced Gas.",
    intro: "Who we are and what we do — so everyone gives the same answer.",
    blocks: [
      {
        title: "What we do",
        body: [
          "Advanced Gas & Airconditioning Services is a family-owned business based in Pakenham, serving Melbourne’s South-East and West Gippsland.",
          "Design, installation, repair and maintenance across HVAC, heating and cooling, Type A gas, general and mechanical plumbing, and refrigeration — residential, commercial and industrial.",
        ],
      },
      {
        title: "Where we work",
        rows: [
          { k: "Base", v: "Pakenham VIC" },
          { k: "Service area", v: "Melbourne South-East + West Gippsland (Pakenham + ~75 km)" },
          { k: "Larger projects", v: "Across Victoria, and open to interstate" },
        ],
      },
      {
        title: "The details",
        rows: [
          { k: "Legal name", v: "Advanced Gas & Airconditioning Services Pty Ltd" },
          { k: "ABN", v: "35 607 575 280" },
          { k: "ACN", v: "607 575 280" },
          { k: "Public liability", v: "$20M" },
        ],
      },
    ],
  },
  {
    slug: "history",
    label: "Our history",
    title: "Family-owned. Traditional values.",
    intro: "Where we came from and what we run on.",
    blocks: [
      {
        title: "Our story",
        body: [
          "We’re based in Pakenham and serve Melbourne’s South-East and West Gippsland. Our team are like family to us, and our clients are an extension of that ethos.",
          "We value quality working relationships and build them on trust and experience over time. We operate from traditional values: under-promise, over-deliver, and complete work on time, within schedule and within budget.",
          "Headed up by Director Dean Winbanks, with over 20 years’ industrial, commercial and domestic experience. Our staff are mentored individually and trained to uphold the same values and quality of work — as though the director had completed your works personally.",
        ],
      },
      {
        title: "What we stand on",
        list: [
          "Compliance-first — never work outside a licence, cert every job.",
          "Under-promise, over-deliver — on time, on schedule, on budget.",
          "Same faces on every job — directly employed, not subbed out.",
          "Six-year workmanship warranty, every job.",
        ],
      },
    ],
  },
  {
    slug: "roles",
    label: "Roles & the ladder",
    title: "Who does what.",
    intro: "The team today, and the path through the business.",
    blocks: [
      {
        title: "The team",
        rows: [
          { k: "Dean Winbanks", v: "Director · Plumbing Lic. 46828 · signs off the works" },
          { k: "Jake", v: "Estimating & quotes · pricing, rebates, the numbers" },
          { k: "Kellie", v: "Office & scheduling · bookings, compliance certs, paperwork" },
          { k: "Jye", v: "Installer · same face, same standard, every job" },
        ],
      },
      {
        title: "The career ladder",
        list: [
          "Apprentice (year 1–4)",
          "Tradesman",
          "Leading hand",
          "Manager",
        ],
      },
      {
        title: "How we run the roles",
        body: [
          "Each person is mentored individually and scored on the 3–4 KPIs that matter for their role. Expectations per role, pay bands and the full scorecard live in the Handbook (shelf B).",
        ],
      },
    ],
  },
  {
    slug: "pricing",
    label: "Pricing",
    title: "The prices we quote from.",
    intro: "So every quote and every phone answer lines up.",
    blocks: [
      {
        title: "In every installed price",
        list: [
          "Labour and standard installation",
          "Disposal of the old unit",
          "Compliance certificate",
          "VEU rebate applied where the unit qualifies",
          "No hidden extras — the quote number is the invoice number",
        ],
      },
      {
        title: "Standard service prices",
        rows: [
          { k: "Split service", v: "$220 (or $140 ea for 3+ at one address)" },
          { k: "After-hours call-out", v: "$380 call-out, then $260/hr" },
          { k: "Quote turnaround", v: "Fixed price back within 12 business hours" },
          { k: "Compliance cert", v: "Emailed within 24 hours of install" },
        ],
      },
      {
        title: "Every model, every installed price",
        body: [
          "The full model-by-model price list is in the Quick quote tool (Tools → Quick quote) — pick a model and it shows the installed price with the VEU rebate already applied, ready to read out.",
        ],
      },
    ],
  },
  {
    slug: "licences",
    label: "Licences",
    title: "Licences & accreditation.",
    intro: "The credentials behind every job.",
    blocks: [
      {
        title: "Licences & accreditation",
        rows: [
          { k: "ARCtick", v: "AU59557" },
          { k: "Plumbing licence", v: "46828" },
          { k: "ABN", v: "35 607 575 280" },
          { k: "ACN", v: "607 575 280" },
          { k: "Public liability", v: "$20M" },
          { k: "Accreditation", v: "VEU accredited · Reece trade partner" },
        ],
      },
    ],
  },
  {
    slug: "contact",
    label: "Head office",
    title: "Head office.",
    intro: "Where to find us.",
    blocks: [
      {
        title: "Head office",
        rows: [
          { k: "Address", v: "1 Sierra Circuit, Pakenham VIC 3810" },
          { k: "Office", v: "(03) 5947 8000" },
          { k: "Hours", v: "Mon–Fri, 8:00am–4:00pm" },
        ],
      },
    ],
  },
];

/* -------------------------------------------------------- Portal tools -- */
/** The tools as they appear in the portal — the calculators open natively
 *  inside the portal (no marketing chrome); the price list opens on the main
 *  site. `href` is where the sidebar/child link points. */
export type PortalToolLink = { slug: string; label: string; blurb: string; href: string; external?: boolean };

export const PORTAL_TOOLS: PortalToolLink[] = [
  { slug: "quick-quote", label: "Quick quote", blurb: "Any model’s installed price, VEU applied, ready to read out.", href: "/portal/quote" },
  { slug: "heat-pump-sizing", label: "Heat pump sizing", blurb: "Size a tank off shower draw-off, not bedroom count.", href: "/portal/tools/heat-pump-sizing" },
  { slug: "veu-rebate-estimator", label: "VEU rebate estimator", blurb: "Ballpark the rebate before a site visit.", href: "/portal/tools/veu-rebate-estimator" },
  { slug: "running-cost-calculator", label: "Running cost", blurb: "Heat pump vs gas running costs for the quote.", href: "/portal/tools/running-cost-calculator" },
  { slug: "fault-codes", label: "Fault-code finder", blurb: "Look up a brand + code on site.", href: "/portal/tools/fault-codes" },
  { slug: "price-list", label: "Full price list", blurb: "Every model, installed price, on the main site.", href: "/pricing", external: true },
];
