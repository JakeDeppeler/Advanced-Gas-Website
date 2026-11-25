import { suburbCoords, distanceKm } from "@/lib/suburbCoords";
/**
 * Who we are as a company: the people, what we put in writing, and the
 * licences and cover behind it. Written for the About page (Jake, Nov 2026)
 * and shared with the suburb pages, which show the same people and promises
 * to someone deciding whether to let us into their home. One copy, so the
 * two can't drift apart.
 *
 * Every claim is one the site already makes elsewhere. Everything about a
 * person is written about them, never as a quote.
 */

export const DIRECTORS = [
  {
    name: "Dean Winbanks", role: "Director · Plumbing Lic. 46828", photo: "/dean.webp",
    about: "Dean has more than 20 years in the trade across industrial, commercial and domestic work. He holds the company's plumbing licence, sets the technical standard every job is measured against, trains the crew to it, and signs off the work.",
  },
  {
    name: "Jake Deppeler", role: "Director", photo: "/jake.webp",
    about: "Jake looks after estimating, quoting and the running of the business. He makes sure every customer gets one clear price in writing, with any rebate worked in, and that the price quoted is the price paid.",
  },
];

export const CLIENTS = ["Westpac", "Commonwealth Bank", "Reece Group", "Petbarn", "KFC", "Kane Constructions", "Reliance Worldwide", "Pakenham Springs P.S.", "Retirement Villages Constructions"];

export const STANDARDS: [string, string][] = [
  ["A fixed price in writing", "A free site check, then one price with the model, the work and the warranty spelled out. It only changes if the job does, and we ask you first."],
  ["Our own installers in your home", "Every installer and apprentice works for us, not a labour-hire agency, so you know who's turning up. Where a job needs new electrical work, a licensed electrician does that part."],
  ["Compliance on every job", "A compliance certificate emailed within 24 hours, and every gas job tested for carbon monoxide before we leave."],
  ["Six years on our workmanship", "On top of the manufacturer's warranty. If something we did isn't right, we come back and fix it."],
  ["Rebates handled for you", "Where you're eligible, the VEU rebate comes off the price at the quote. No forms to chase afterwards."],
];

export const ACCREDITED: [string, string][] = [
  ["Accredited", "VEU provider"], ["Authorised", "ARC refrigeration"], ["Licensed", "Victorian plumber"], ["Partner", "Reece Trade"],
];

export const LICENCES: [string, string][] = [
  ["Advanced Gas & Airconditioning Services Pty Ltd", "ACN 607 575 280"],
  ["Plumbing licence", "46828"],
  ["ARC refrigeration authorisation", "AU59557"],
  ["Public liability", "$20M"],
  ["Workmanship warranty", "6 years"],
  ["Workshop", "1 Sierra Circuit, Pakenham"],
];


/** Kellie, who answers the office: written as on the About page. */
export const OFFICE = {
  name: "Kellie", role: "Office & scheduling", photo: "/kellie.webp",
  about: "Runs bookings, compliance certificates and the paperwork, so every job is scheduled, documented and closed out properly.",
};

/**
 * Where the installers live (Jake, Nov 2026). Suburb pages use it to say
 * how close the nearest of them is, which is a truer "we're local" than the
 * workshop's address alone for anyone out past Pakenham.
 */
export const CREW_TOWNS: { slug: string; name: string }[] = [
  { slug: "berwick", name: "Berwick" },
  { slug: "pakenham", name: "Pakenham" },
  { slug: "drouin", name: "Drouin" },
  { slug: "warragul", name: "Warragul" },
];

/** The crew town nearest a suburb, straight-line, or null without coordinates. */
export function nearestCrew(slug: string): { name: string; km: number; here: boolean } | null {
  const at = suburbCoords[slug];
  if (!at) return null;
  let best: { name: string; km: number; here: boolean } | null = null;
  for (const t of CREW_TOWNS) {
    const c = suburbCoords[t.slug];
    if (!c) continue;
    const km = t.slug === slug ? 0 : Math.round(distanceKm(at, c));
    if (!best || km < best.km) best = { name: t.name, km, here: t.slug === slug };
  }
  return best;
}
