/**
 * Portal content — the docs, videos, reference info and tools the team sees.
 *
 * This is the single place to edit what's in the portal. Add a training
 * document, drop in a video, add a supplier number — it all lives here as
 * plain data, so nobody needs to touch a React component to keep it current.
 * (A later phase can move this into an in-portal editor / file uploads; for
 * now it's version-controlled, which is no bad thing for install standards.)
 *
 * A doc/video with no `href`/`youtubeId` yet renders as "coming soon" so the
 * shape of the library is visible before every file is uploaded.
 */

export type Category = "Install standards" | "Safety & compliance" | "Rebates & paperwork" | "Products & brands" | "Sales & quoting" | "Onboarding";

export const CATEGORIES: Category[] = [
  "Install standards",
  "Safety & compliance",
  "Rebates & paperwork",
  "Products & brands",
  "Sales & quoting",
  "Onboarding",
];

export type Doc = {
  title: string;
  category: Category;
  description: string;
  href?: string; // a file URL, Google Doc, or internal page — leave blank for "coming soon"
  kind?: "pdf" | "doc" | "sheet" | "link";
};

export type Video = {
  title: string;
  category: Category;
  description: string;
  youtubeId?: string; // just the id, e.g. "dQw4w9WgXcQ"
  minutes?: number;
};

export type ToolLink = {
  title: string;
  description: string;
  href: string;
  external?: boolean;
};

export type InfoBlock = {
  title: string;
  rows: { k: string; v: string }[];
};

/* ---------------------------------------------------------------- Docs -- */
export const DOCS: Doc[] = [
  { title: "Split system install standard", category: "Install standards", description: "Back-to-back method, line-set, bracketing, capping and the finish we sign off to.", kind: "pdf" },
  { title: "Ducted install standard", category: "Install standards", description: "Duct design, zoning, return-air and commissioning checklist.", kind: "pdf" },
  { title: "Heat pump hot water install standard", category: "Install standards", description: "Split vs all-in-one, tank siting, condensate and power-point rules.", kind: "pdf" },
  { title: "Job SWMS template", category: "Safety & compliance", description: "Safe work method statement to fill out before each install.", kind: "doc" },
  { title: "Carbon monoxide test procedure", category: "Safety & compliance", description: "The gas-heater CO test steps and the analyser reading we record.", kind: "pdf" },
  { title: "VEU rebate — how we lodge it", category: "Rebates & paperwork", description: "Eligibility, the forms, and how the rebate comes off the quote.", kind: "doc" },
  { title: "Compliance certificate process", category: "Rebates & paperwork", description: "What gets issued, to whom, and the 24-hour turnaround.", kind: "doc" },
  { title: "Brand cheat-sheet", category: "Products & brands", description: "Which brand we lead with for which job, and why — Reclaim, iStore, Thermann, Mitsubishi, Kaden, Brivis.", href: "/brands", kind: "link" },
  { title: "New starter handbook", category: "Onboarding", description: "How we work, who does what, and the standards we hold to.", kind: "doc" },
];

/* ------------------------------------------------------------- Videos -- */
export const VIDEOS: Video[] = [
  { title: "Back-to-back split install, start to finish", category: "Install standards", description: "The full method on a standard job.", minutes: 12 },
  { title: "Zoning a ducted system with Zonemate", category: "Install standards", description: "Setting up and balancing zones.", minutes: 9 },
  { title: "Reclaim CO₂ heat pump commissioning", category: "Products & brands", description: "First run, temp check and app setup.", minutes: 7 },
  { title: "Talking a customer through the VEU rebate", category: "Sales & quoting", description: "How to explain the rebate simply on a quote call.", minutes: 5 },
];

/* -------------------------------------------------------------- Tools -- */
export const TOOLS: ToolLink[] = [
  { title: "Heat pump sizing", description: "Size a tank off shower draw-off, not bedroom count.", href: "/tools/heat-pump-sizing" },
  { title: "VEU rebate estimator", description: "Ballpark the rebate before a site visit.", href: "/tools/veu-rebate-estimator" },
  { title: "Running-cost calculator", description: "Heat pump vs gas running costs for the quote.", href: "/tools/running-cost-calculator" },
  { title: "Fault-code finder", description: "Look up a brand + code on site.", href: "/tools/fault-codes" },
  { title: "System comparison", description: "Compare system types side by side.", href: "/tools/system-comparison" },
  { title: "Full price list", description: "Every model, installed price, VEU applied.", href: "/pricing" },
];

/* -------------------------------------------------------------- Info --- */
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
