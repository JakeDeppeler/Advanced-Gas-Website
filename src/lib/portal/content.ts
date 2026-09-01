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
export type Video = {
  title: string;
  category: string;
  description: string;
  youtubeId?: string; // just the id, e.g. "dQw4w9WgXcQ"
  minutes?: number;
};

export const VIDEOS: Video[] = [
  { title: "Back-to-back split install, start to finish", category: "Install standards", description: "The full method on a standard job.", minutes: 12 },
  { title: "Zoning a ducted system with Zonemate", category: "Install standards", description: "Setting up and balancing zones.", minutes: 9 },
  { title: "Reclaim CO₂ heat pump commissioning", category: "Products & brands", description: "First run, temp check and app setup.", minutes: 7 },
  { title: "Talking a customer through the VEU rebate", category: "Sales & quoting", description: "How to explain the rebate simply on a quote call.", minutes: 5 },
  { title: "The front-door approach", category: "The customer", description: "How we introduce ourselves and set the tone on arrival.", minutes: 4 },
  { title: "Good / Better / Best on the iPad", category: "Sales & quoting", description: "Presenting three options the right way.", minutes: 6 },
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
