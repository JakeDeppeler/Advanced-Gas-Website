import { services, suburbs } from "@/lib/site";
import { brands } from "@/lib/brands";
import { posts } from "@/lib/blog";
import { TIERS } from "@/lib/waterFiltration";

/**
 * Everything on the site, as one flat list for the search page.
 *
 * Built and matched on the server. The suburb and brand modules together are
 * a large amount of prose, and there is no reason for any of it to reach the
 * browser so somebody can type "ducted": the header's search box is a plain
 * form that posts to /search, which is also why it works with no JavaScript.
 */

export type Hit = {
  title: string;
  path: string;
  kind: "Service" | "Hot water" | "Brand" | "Suburb" | "Guide" | "Tool" | "Page" | "Filtration";
  blurb: string;
  /** Extra words worth matching that are not in the title or blurb. */
  terms?: string;
};

/** Pages that exist in their own right rather than coming out of a data file. */
const PAGES: Hit[] = [
  { title: "Get a quote", path: "/quote", kind: "Page", blurb: "Tell us about the job and we come back in writing inside 12 hours.", terms: "estimate price booking enquire" },
  { title: "Pricing", path: "/pricing", kind: "Page", blurb: "Installed prices for the systems we fit, with the VEU rebate already off.", terms: "cost how much price list" },
  { title: "VEU rebates", path: "/rebates", kind: "Page", blurb: "The Victorian Energy Upgrades rebate, applied at the quote rather than chased afterwards.", terms: "rebate veu government subsidy solar homes discount" },
  { title: "Hot water: heat pump or gas", path: "/heat-pumps", kind: "Hot water", blurb: "All-in-one, split, gas continuous flow and gas storage, and which suits your place.", terms: "hot water heat pump reclaim istore thermann tank" },
  { title: "Emergency and after hours", path: "/contact#emergency", kind: "Page", blurb: "Gas leak, no hot water, CO alarm. We answer after hours for locals.", terms: "emergency urgent after hours leak no hot water" },
  { title: "Service areas", path: "/service-areas", kind: "Page", blurb: "Every suburb we work in, with drive times from Pakenham.", terms: "areas coverage suburbs do you come to" },
  { title: "Commercial and mechanical", path: "/commercial", kind: "Page", blurb: "Fit-outs, plant replacement, maintenance and breakdowns across Melbourne's south-east.", terms: "commercial business shop office builder site fitout" },
  { title: "Membership", path: "/membership", kind: "Page", blurb: "Servicing booked before it becomes a problem, with priority call-outs.", terms: "membership plan subscription annual service" },
  { title: "About us", path: "/about", kind: "Page", blurb: "Who we are, how long we have been at it, and what we hold licences for.", terms: "about team jake licence arc abn history" },
  { title: "Contact", path: "/contact", kind: "Page", blurb: "Phone, email and the quote form.", terms: "contact phone email address call" },
  { title: "Reviews", path: "/reviews", kind: "Page", blurb: "What customers across the south-east have said.", terms: "reviews testimonials google rating" },
  { title: "Fault codes", path: "/tools/fault-codes", kind: "Tool", blurb: "What the flashing code on your unit actually means, by brand.", terms: "fault code error flashing light blinking e1 e5" },
  { title: "Running cost calculator", path: "/tools/running-cost-calculator", kind: "Tool", blurb: "What a system costs to run, on your tariff.", terms: "running cost electricity bill calculator" },
  { title: "Sizing calculator", path: "/tools/sizing-calculator", kind: "Tool", blurb: "What size aircon a room actually needs.", terms: "size kw capacity room calculator how big" },
  { title: "Heat pump sizing", path: "/tools/heat-pump-sizing", kind: "Tool", blurb: "What tank size suits your household.", terms: "tank size litres household sizing" },
  { title: "VEU rebate estimator", path: "/tools/veu-rebate-estimator", kind: "Tool", blurb: "Roughly what the rebate is worth on your job.", terms: "rebate estimator calculator veu" },
  { title: "Heat pump compare", path: "/tools/heat-pump-compare", kind: "Tool", blurb: "Reclaim, iStore and Thermann side by side.", terms: "compare brands heat pump which" },
  { title: "Upgrade or repair", path: "/upgrade-or-repair", kind: "Tool", blurb: "Whether it is worth fixing or worth replacing.", terms: "repair replace worth fixing old unit" },
  { title: "Water filtration", path: "/water-filtration", kind: "Filtration", blurb: "Whole house, under sink, hot water and rainwater UV.", terms: "water filter filtration puretec bwt rainwater uv" },
];

let cache: Hit[] | null = null;

export function searchCorpus(): Hit[] {
  if (cache) return cache;

  const out: Hit[] = [...PAGES];

  for (const s of services) {
    out.push({
      title: s.name,
      path: `/services/${s.slug}`,
      kind: "Service",
      blurb: s.blurb,
      terms: s.short,
    });
  }

  for (const b of brands) {
    out.push({
      title: b.name,
      path: `/brands/${b.slug}`,
      kind: "Brand",
      blurb: b.tagline ?? `Everything we fit from ${b.name}, and our take on each model.`,
    });
  }

  for (const s of suburbs) {
    out.push({
      title: s.name,
      path: `/areas/${s.slug}`,
      kind: "Suburb",
      blurb: `Aircon, heat pump and gas plumbing in ${s.name} ${s.postcode}.`,
      terms: `${s.postcode} ${s.council}`,
    });
  }

  for (const p of posts) {
    out.push({ title: p.title, path: `/blog/${p.slug}`, kind: "Guide", blurb: p.blurb, terms: p.cat });
  }

  for (const t of TIERS) {
    out.push({
      title: t.label,
      path: `/water-filtration/${t.slug}`,
      kind: "Filtration",
      blurb: t.tagline,
      terms: t.fitsWhere,
    });
  }

  cache = out;
  return out;
}

/**
 * Match on whole words, scored by where the word turned up.
 *
 * Deliberately not fuzzy. On a site like this a near-miss is worse than no
 * match: somebody searching "ducted" should not be shown "Drouin" because the
 * letters line up, and a wrong answer confidently presented is how people stop
 * trusting a search box.
 */
export function searchSite(query: string, limit = 24): Hit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];

  const scored = searchCorpus().map((h) => {
    const title = h.title.toLowerCase();
    const blurb = h.blurb.toLowerCase();
    const terms = (h.terms ?? "").toLowerCase();
    const path = h.path.toLowerCase();

    let score = 0;
    for (const w of words) {
      if (title === w) score += 120;
      else if (title.startsWith(w)) score += 70;
      else if (title.includes(w)) score += 45;
      if (terms.includes(w)) score += 30;
      if (path.includes(w)) score += 20;
      if (blurb.includes(w)) score += 12;
    }
    // Every word has to land somewhere, or it is not a match at all.
    const all = words.every((w) => title.includes(w) || blurb.includes(w) || terms.includes(w) || path.includes(w));
    return { h, score: all ? score : 0 };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.h.title.length - b.h.title.length)
    .slice(0, limit)
    .map((x) => x.h);
}
