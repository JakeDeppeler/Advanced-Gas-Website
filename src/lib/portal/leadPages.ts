import type { WebLead } from "@/lib/portal/db";
import sitemap from "@/app/sitemap";
import { searchCorpus } from "@/lib/searchIndex";

/**
 * Which pages earn, and which ones sit there.
 *
 * The leads table records the page an enquiry came from, so ranking the pages
 * that produced one is easy and was already being done. The harder and more
 * useful half is the other list: the pages that produced nothing. That needs
 * to know what pages exist, which is what the sitemap is for — so this reads
 * the sitemap rather than keeping a second list of routes that would drift
 * out of date the first time a page was added.
 *
 * One honest limitation, stated here and repeated on the page itself: this
 * counts enquiries, not visits. A page with nothing against it might be a page
 * nobody read, or a page everybody read and nobody acted on, and from this data
 * alone the two are the same. Visit counts live in Vercel Analytics and Google
 * Analytics; the sensible use of this list is to take the named silent pages
 * and go and look them up there.
 *
 * Runs on the server. The sitemap pulls in the suburb, brand and fault-code
 * modules, which together are most of a megabyte.
 */

export type SectionKey =
  | "home" | "service" | "hotwater" | "money" | "suburb"
  | "brand" | "tool" | "faultcode" | "guide" | "filtration" | "commercial" | "other";

type SectionDef = { key: SectionKey; label: string; note: string; named: boolean };

/**
 * `named` marks the sections whose silent pages are worth listing by name.
 * Seventy-three quiet suburb pages is a number; four quiet service pages is a
 * problem with four names on it.
 */
const SECTIONS: SectionDef[] = [
  { key: "home", label: "Home page", note: "The front door.", named: true },
  { key: "service", label: "Service pages", note: "What we sell, one page each.", named: true },
  { key: "hotwater", label: "Hot water", note: "The heat pump and gas fork.", named: true },
  { key: "money", label: "Price, rebate & quote", note: "The pages somebody reads with a wallet out.", named: true },
  { key: "commercial", label: "Commercial", note: "The other side of the business.", named: true },
  { key: "tool", label: "Calculators", note: "Nine of them, plus repair-or-replace.", named: true },
  // Their own section, not part of the calculators. Thirty-three near-identical
  // reference pages averaged into the calculators made nine good tools look
  // like they were failing, and a quiet fault code page is not news — somebody
  // looking up what E5 means is not shopping.
  { key: "faultcode", label: "Fault code pages", note: "One per code, per brand. A reference, not a pitch.", named: false },
  { key: "suburb", label: "Suburb pages", note: "One per place we work, for local search.", named: false },
  { key: "brand", label: "Brands & products", note: "Model pages and brand pages.", named: false },
  { key: "guide", label: "Guides", note: "The blog. Long game, not a lead machine.", named: false },
  { key: "filtration", label: "Water filtration", note: "The newest thing we sell.", named: true },
  { key: "other", label: "Everything else", note: "About, reviews, gallery, the rest.", named: false },
];

export const SECTION_ORDER = SECTIONS;

/** One path, one section. Order matters: the specific tests come first. */
export function sectionOf(path: string): SectionKey {
  const p = path.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (p === "/") return "home";
  if (p.startsWith("/commercial")) return "commercial";
  if (p.startsWith("/services")) return "service";
  if (p === "/heat-pumps") return "hotwater";
  if (p.startsWith("/water-filtration")) return "filtration";
  if (p.startsWith("/areas")) return "suburb";
  if (p.startsWith("/brands")) return "brand";
  if (p.startsWith("/tools/fault-codes/")) return "faultcode";
  if (p.startsWith("/tools") || p === "/upgrade-or-repair") return "tool";
  if (p.startsWith("/blog")) return "guide";
  if (["/quote", "/pricing", "/rebates", "/range", "/contact", "/membership"].includes(p)) return "money";
  return "other";
}

let pathCache: string[] | null = null;

/** Every public page, from the sitemap, as a path. */
function allPaths(): string[] {
  if (pathCache) return pathCache;
  const out = new Set<string>();
  for (const e of sitemap()) {
    try {
      const p = new URL(e.url).pathname.replace(/\/$/, "") || "/";
      out.add(p);
    } catch { /* a malformed sitemap entry is not worth throwing over */ }
  }
  pathCache = [...out];
  return pathCache;
}

let titleCache: Map<string, string> | null = null;

/** The page's real title where the search index knows one, else the path. */
function titleFor(path: string): string {
  if (!titleCache) {
    titleCache = new Map();
    for (const h of searchCorpus()) titleCache.set(h.path.replace(/\/$/, "") || "/", h.title);
    titleCache.set("/", "Home");
  }
  const t = titleCache.get(path);
  if (t) return t;
  const fc = /^\/tools\/fault-codes\/([^/]+)\/([^/]+)$/.exec(path);
  if (fc) {
    const brand = fc[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${brand} fault code ${fc[2].toUpperCase()}`;
  }
  const tail = path.replace(/^\//, "").split("/").pop() ?? "";
  if (!tail) return "Home";
  return tail.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const clean = (p: string | null): string | null => {
  if (!p) return null;
  const s = p.split("?")[0].split("#")[0].replace(/\/$/, "");
  return s === "" ? "/" : s;
};

export type PageRow = {
  path: string;
  title: string;
  section: SectionKey;
  sectionLabel: string;
  n: number;
  quotes: number;
  calls: number;
  /** Visits that started on this page and ended in an enquiry, wherever the
   *  enquiry was actually made. Only counts visits since landing pages started
   *  being recorded. */
  landed: number;
  share: number;
};

export type SectionRow = SectionDef & {
  pages: number;
  earning: number;
  n: number;
  quotes: number;
  calls: number;
  /** Enquiries per page that exists. The only number that lets a section of
   *  seventy-three pages be compared with a section of one. */
  perPage: number;
};

export type PageReport = {
  rows: PageRow[];
  sections: SectionRow[];
  /** Pages in the sections worth naming that produced nothing in the window. */
  silent: { path: string; title: string; sectionLabel: string }[];
  silentCount: number;
  totalPages: number;
  earningPages: number;
  /** Landing pages, once any have been recorded. */
  landings: { path: string; title: string; n: number; share: number }[];
  landingsKnown: number;
};

export function pageReport(leads: WebLead[]): PageReport {
  const paths = allPaths();
  const known = new Set(paths);

  const acc = new Map<string, PageRow>();
  const row = (path: string): PageRow => {
    let r = acc.get(path);
    if (!r) {
      const section = sectionOf(path);
      r = {
        path, title: titleFor(path), section,
        sectionLabel: SECTIONS.find((s) => s.key === section)!.label,
        n: 0, quotes: 0, calls: 0, landed: 0, share: 0,
      };
      acc.set(path, r);
    }
    return r;
  };

  let landingsKnown = 0;
  const landAcc = new Map<string, number>();

  for (const l of leads) {
    const p = clean(l.pagePath);
    if (p) {
      const r = row(p);
      r.n += 1;
      if (l.kind === "quote") r.quotes += 1; else r.calls += 1;
    }
    const land = clean(l.utm?.landing ?? null);
    if (land) {
      landingsKnown += 1;
      landAcc.set(land, (landAcc.get(land) ?? 0) + 1);
      row(land).landed += 1;
    }
  }

  const total = leads.length || 1;
  const rows = [...acc.values()]
    .map((r) => ({ ...r, share: r.n / total }))
    .sort((a, b) => b.n - a.n || b.landed - a.landed || a.title.localeCompare(b.title));

  // The rollup. Pages that exist come from the sitemap; enquiries come from
  // whatever path the leads actually carry — including one the sitemap has
  // never heard of, which is how an old URL or a redirect shows itself.
  const sections: SectionRow[] = SECTIONS.map((def) => {
    const mine = rows.filter((r) => r.section === def.key);
    const exists = paths.filter((p) => sectionOf(p) === def.key).length;
    const n = mine.reduce((a, r) => a + r.n, 0);
    return {
      ...def,
      pages: exists,
      earning: mine.filter((r) => r.n > 0).length,
      n,
      quotes: mine.reduce((a, r) => a + r.quotes, 0),
      calls: mine.reduce((a, r) => a + r.calls, 0),
      perPage: exists ? n / exists : 0,
    };
  }).filter((s) => s.pages > 0 || s.n > 0);

  const earned = new Set(rows.filter((r) => r.n > 0).map((r) => r.path));
  const namedSections = new Set(SECTIONS.filter((s) => s.named).map((s) => s.key));
  const silentAll = paths.filter((p) => !earned.has(p));
  const silent = silentAll
    .filter((p) => namedSections.has(sectionOf(p)))
    .map((p) => ({
      path: p,
      title: titleFor(p),
      sectionLabel: SECTIONS.find((s) => s.key === sectionOf(p))!.label,
    }))
    .sort((a, b) => a.sectionLabel.localeCompare(b.sectionLabel) || a.title.localeCompare(b.title));

  const landings = [...landAcc.entries()]
    .map(([path, n]) => ({ path, title: titleFor(path), n, share: n / Math.max(1, landingsKnown) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  return {
    rows,
    sections,
    silent,
    silentCount: silentAll.length,
    totalPages: paths.length,
    earningPages: earned.size,
    landings,
    landingsKnown,
  };
}
