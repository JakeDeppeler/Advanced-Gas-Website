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
  { slug: "sales", label: "Sales & quoting", blurb: "The job conversation, quoting on the iPad, and the tiers." },
  { slug: "customer", label: "The customer", blurb: "First impressions, the handover, and looking after the home." },
  { slug: "accounting", label: "Accounting & admin", blurb: "Job paperwork, compliance certificates and getting paid." },
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
      { k: "Hours", v: "Mon–Fri, 7:00am–3:30pm" },
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
export type InfoRow = { k: string; v: string; note?: string; href?: string };
export type InfoPerson = { name: string; role: string; detail: string };
/**
 * A block's `as` is its shape, not its decoration — the design gives each
 * section the shape its content actually is, and a licence number people
 * read down the phone is a different object from a paragraph.
 *
 *  · rows   (default) a key/value card
 *  · facts  the three-tile strip at the top of a section, first one filled
 *  · copy   one card per row with a Copy button — numbers people transcribe
 *  · people the crew, with their role
 *  · chips  a row of stages, for the ladder
 *  · price  key/value where the value is a figure, set large and right
 *  · timeline  a year down the left and what happened beside it
 *  · stat   one card, one big value — a phone number, an address
 *
 * `tone: "navy"` fills the card; `span: "full"` makes it run the width;
 * `span: "tall"` runs it down two rows beside the next two blocks.
 */
export type InfoBlockAs = "rows" | "facts" | "copy" | "people" | "chips" | "price" | "timeline" | "stat";
export type InfoContentBlock = {
  title?: string;
  as?: InfoBlockAs;
  tone?: "navy";
  span?: "full" | "tall";
  rows?: InfoRow[];
  body?: string[];
  list?: string[];
  people?: InfoPerson[];
  chips?: string[];
};
export type InfoSection = { slug: string; label: string; title: string; intro?: string; blocks: InfoContentBlock[] };

export const INFO_SECTIONS: InfoSection[] = [
  {
    slug: "business",
    label: "The business",
    title: "The business",
    intro: "Who we are and what we do, in one place.",
    blocks: [
      {
        // Three facts anyone might be asked on the phone. The first two are
        // the figures the public homepage already stands behind ("1,200+
        // installs done", "12 yrs local trading"), so the crew quote the same
        // numbers a customer has just read.
        as: "facts",
        span: "full",
        rows: [
          { k: "Local trading", v: "12 yrs" },
          { k: "Installs done", v: "1,200+" },
          { k: "Based in", v: "Pakenham" },
        ],
      },
      {
        title: "What we do",
        span: "full",
        body: [
          "Heating, cooling, gas and hot water across Melbourne\u2019s south-east and Gippsland — heat pump hot water, split and ducted aircon, gas heating, servicing and commercial fit-outs. Directly employed crews, one standard every job.",
        ],
      },
    ],
  },
  {
    slug: "history",
    label: "Our history",
    title: "Our history",
    intro: "How we got here.",
    blocks: [
      {
        // A dated timeline, with only the dates we can stand behind. 2014 is
        // the year the public site gives ("a family business in Pakenham
        // since 2014"). The design's middle rows — first vans and crew, heat
        // pumps and the VEU program — read "[Year]" in the mock too, and a
        // guessed year here is one somebody repeats to a customer, so they
        // wait for the real dates.
        as: "timeline",
        span: "full",
        rows: [
          { k: "2014", v: "Started in Pakenham as a family business, headed by Director Dean Winbanks" },
          { k: "2026", v: "The team portal, ServiceTitan and one standard every job" },
        ],
      },
    ],
  },
  {
    slug: "roles",
    label: "Roles & the ladder",
    title: "Who does what",
    intro: "The team today, and the path through the business.",
    blocks: [
      {
        as: "people",
        span: "full",
        people: [
          { name: "Dean Winbanks", role: "Director", detail: "Plumbing Lic. 46828 · signs off the works" },
          { name: "Jake", role: "Estimating & quotes", detail: "Pricing, rebates, the numbers" },
          { name: "Kellie", role: "Office & scheduling", detail: "Bookings, compliance certs, paperwork" },
          { name: "Jye", role: "Installer", detail: "Same face, same standard, every job" },
        ],
      },
      {
        title: "The career ladder",
        as: "chips",
        tone: "navy",
        span: "full",
        chips: ["Apprentice (year 1–4)", "Tradesman", "Leading hand", "Manager"],
        body: [
          "Each person is mentored individually and scored on the 3–4 KPIs that matter for their role. Pay bands and the scorecard live in Handbook shelf B.",
        ],
      },
    ],
  },
  {
    slug: "pricing",
    label: "Pricing",
    title: "The prices we quote from",
    intro: "So every quote and every phone answer lines up.",
    blocks: [
      {
        title: "Service prices (from)",
        as: "price",
        span: "tall",
        rows: [
          { k: "Split service", v: "$220+", note: "or $140 each for 3+ at one address" },
          { k: "Ducted split service", v: "$220+" },
          { k: "Gas heater service", v: "$220+" },
          { k: "Evap cooler service — single storey", v: "$300+" },
          { k: "Evap cooler service — double storey", v: "$375+" },
        ],
      },
      {
        title: "Call-outs & hours",
        rows: [
          { k: "Business hours", v: "7:00am – 3:30pm, Mon–Fri" },
          { k: "Outside those hours", v: "Charged as a call-out" },
          { k: "After-hours call-out", v: "$380, then $260/hr" },
          { k: "Quote turnaround", v: "Fixed price within 12 business hours" },
          { k: "Compliance cert", v: "Emailed within 24 hours of install" },
        ],
      },
      {
        title: "In every installed price",
        tone: "navy",
        list: [
          "Labour and standard installation",
          "Disposal of the old unit",
          "Compliance certificate",
          "VEU rebate applied where the unit qualifies",
          "No hidden extras — the quote number is the invoice number",
        ],
      },
    ],
  },
  {
    slug: "licences",
    label: "Licences",
    title: "Licences & accreditation",
    intro: "The credentials behind every job.",
    blocks: [
      {
        // Every one of these gets read down a phone or typed into a form, so
        // each is its own card with a Copy button rather than a row in a list
        // somebody has to select by hand without catching a neighbour.
        as: "copy",
        span: "full",
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
    title: "Head office",
    intro: "Where we are and who to call.",
    blocks: [
      {
        title: "Office phone",
        as: "stat",
        tone: "navy",
        rows: [{ k: "Office phone", v: "(03) 5947 8000", note: "Business hours 7:00am – 3:30pm, Mon–Fri", href: "tel:+61359478000" }],
      },
      {
        title: "Factory & office",
        as: "stat",
        rows: [{ k: "Factory & office", v: "1 Sierra Circuit, Pakenham VIC 3810", note: "Who to call: Kellie for bookings, Jake for quotes and pricing" }],
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
  { slug: "job-calculator", label: "Job calculator", blurb: "Workers × hours on the job → labour, materials and a price.", href: "/portal/job-calculator" },
  { slug: "heat-pump-sizing", label: "Heat pump sizing", blurb: "Size a tank off shower draw-off, not bedroom count.", href: "/portal/tools/heat-pump-sizing" },
  { slug: "veu-rebate-estimator", label: "VEU rebate estimator", blurb: "Ballpark the rebate before a site visit.", href: "/portal/tools/veu-rebate-estimator" },
  { slug: "running-cost-calculator", label: "Running cost", blurb: "Heat pump vs gas running costs for the quote.", href: "/portal/tools/running-cost-calculator" },
  { slug: "fault-codes", label: "Fault-code finder", blurb: "Look up a brand + code on site.", href: "/portal/tools/fault-codes" },
  { slug: "price-list", label: "Full price list", blurb: "Every model, installed price, on the main site.", href: "/pricing", external: true },
];
