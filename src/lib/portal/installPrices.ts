/**
 * The install pricebook a tech quotes from on site.
 *
 * Two sources, joined, and nothing invented:
 *
 *   - the product catalogue (`brands.ts`) for what each system is — brand,
 *     model, capacity, specs, whether the VEU rebate applies;
 *   - the published price tiers on the service pages (`serviceContent.ts`)
 *     for the money and for what the number includes.
 *
 * Those tiers are the only installed prices the business has written down, and
 * they are the ones the website quotes, so a tech reading this screen and a
 * customer reading advancedgas.com.au see the same figure. Where a category has
 * no published tier — hot water heat pumps, today — the card says it is priced
 * on site rather than carrying a number nobody agreed to.
 *
 * Pure, so it can be checked without a database or a network.
 */

import { brands, visibleProducts, type Product, type ProductCategory } from "@/lib/brands";
import { serviceContent } from "@/lib/serviceContent";

export type Tier = {
  group: string;
  tier: string;
  price: string;
  /** "Installed", "Per visit", "Call-out fee" — what the figure actually is. */
  priceKey: string;
  includes: string[];
  /** The kW the tier names, where it names one, for matching a model to it. */
  kw: number | null;
  /** Which service page published it. */
  service: string;
};

const INSTALLED = "Installed";

/** Every published price tier, with its inclusions split into real bullets. */
export function publishedTiers(): Tier[] {
  const out: Tier[] = [];
  for (const [service, c] of Object.entries(serviceContent)) {
    for (const p of c.pricing ?? []) {
      const kw = /([\d.]+)\s*kW/i.exec(p.tier);
      out.push({
        group: p.group ?? c.h1 ?? service,
        tier: p.tier,
        price: p.price,
        priceKey: p.priceKey ?? INSTALLED,
        includes: p.includes.split(",").map((s) => s.trim()).filter(Boolean),
        kw: kw ? Number(kw[1]) : null,
        service,
      });
    }
  }
  return out;
}

export type PbCategory = {
  key: string;
  label: string;
  blurb: string;
  /** Catalogue categories that belong on this shelf. */
  cats: ProductCategory[];
  /** Which published tier group prices it, if any. */
  group?: string;
};

/**
 * The shelves, in the order the design puts them — what a customer asks for
 * first, not how the catalogue is keyed.
 */
export const PB_CATEGORIES: PbCategory[] = [
  { key: "hot-water", label: "Hot water heat pumps", blurb: "Replaces an electric or gas tank. VEU rebate applies.", cats: ["heat-pump"] },
  { key: "split", label: "Split systems", blurb: "One room, heats and cools.", cats: ["split-system", "floor-console"], group: "Split system" },
  { key: "multi", label: "Multi-head", blurb: "One outdoor unit, a head in each room.", cats: ["multi-head"], group: "Multi-head" },
  { key: "ducted", label: "Ducted", blurb: "Whole home, vents in every room.", cats: ["ducted", "cassette"], group: "Ducted reverse-cycle" },
  { key: "gas-heating", label: "Gas ducted heating", blurb: "The heater in most homes built 1990–2015 around here.", cats: [], group: "Gas ducted heating" },
  { key: "gas-flow", label: "Gas continuous flow", blurb: "No tank at all, on an outside wall.", cats: ["gas-continuous-flow"], group: "Gas hot water" },
  { key: "gas-tank", label: "Gas & electric storage", blurb: "A tank kept hot. Like-for-like replacement only.", cats: ["gas-storage", "electric-storage"] },
  { key: "evap", label: "Evaporative cooling", blurb: "Fresh, cool air on water and a fan. Cooling only.", cats: [] },
  { key: "controls", label: "Zoning & controls", blurb: "Room-by-room control and the wall controllers.", cats: ["zoning", "damper", "controller"] },
];

export type PbItem = {
  brand: string;
  brandSlug: string;
  slug: string;
  name: string;
  model: string;
  categoryLabel: string;
  capacity: string | null;
  /** The size chip, where the capacity gives one cleanly. */
  kw: number | null;
  litres: number | null;
  veu: boolean;
  bestFor: string;
  specs: { label: string; value: string }[];
  /** The published tier that prices this model, if one does. */
  tier: Tier | null;
  href: string;
};

const firstKw = (capacity?: string) => {
  const m = /([\d.]+)\s*kW/i.exec(capacity ?? "");
  return m ? Number(m[1]) : null;
};

const firstLitres = (text?: string) => {
  const m = /([\d.]+)\s*L\b/i.exec(text ?? "");
  return m ? Number(m[1]) : null;
};

/** How many indoor heads, from "· 4 Heads" or "4-indoor". */
const firstHeads = (text?: string) => {
  const m = /(\d+)\s*(?:heads?\b|-indoor\b)/i.exec(text ?? "");
  return m ? Number(m[1]) : null;
};

/** Evaporative coolers are a `ducted` product named as evap in their label, so
 *  the shelf is decided on the label rather than a category of their own. */
const isEvap = (p: Product) => /evaporative/i.test(p.categoryLabel);
const isGasHeater = (p: Product) => /gas ducted heater/i.test(p.categoryLabel);

function belongs(p: Product, c: PbCategory): boolean {
  if (c.key === "evap") return isEvap(p);
  if (c.key === "gas-heating") return isGasHeater(p);
  // Evaporative coolers and gas ducted heaters are both keyed `ducted` in the
  // catalogue — they go on their own shelves, not on reverse-cycle.
  if (c.key === "ducted") return c.cats.includes(p.category) && !isEvap(p) && !isGasHeater(p);
  return c.cats.includes(p.category);
}

/**
 * The published tier that prices this exact model — or nothing.
 *
 * Strict on purpose, and it took three goes to get there. The tiers are written
 * per job, not per box, so anything short of an exact identification goes
 * wrong in a way that matters: a near-enough size match put the 2.5 kW bedroom
 * price on a 3.5 kW unit, a word match on the brand put the Wombat price on a
 * Buffalo, and a word match on the category put the two-head price on a
 * six-head system. Each of those is a job quoted at the wrong number by a
 * tradesman who had no reason to doubt the screen.
 *
 * So a tier is claimed only on an exact identification — the model's own code
 * or family name, its size to one decimal, its tank in litres, or its head
 * count. Every tier on the shelf is shown either way, as what we quote from,
 * which is where an unmatched model's price comes from in the end anyway.
 */
function tierFor(p: Product, c: PbCategory, tiers: Tier[], brand: string): Tier | null {
  if (!c.group) return null;
  const inGroup = tiers.filter((t) => t.group === c.group && t.priceKey === INSTALLED);
  if (!inGroup.length) return null;

  const haystack = `${p.model} ${p.name}`.toLowerCase();
  const brandWords = new Set(brand.toLowerCase().split(/\s+/));

  for (const t of inGroup) {
    // 1. The tier names the model's code (MXZ-2F) or its family (Wombat).
    //    A token counts only if some part of it is a real identifier:
    //    "Multi-head" is two stop words joined by a hyphen and matched every
    //    multi-head in the catalogue, which is how all nine of them ended up
    //    quoting the two-head price.
    const tokens = (t.tier.match(/[A-Za-z][A-Za-z0-9-]{3,}/g) ?? []).filter((w) =>
      w.toLowerCase().split("-").some((part) => part.length > 1 && !STOP.has(part) && !brandWords.has(part)));
    if (tokens.some((w) => haystack.includes(w.toLowerCase()))) return t;

    // 2. The same size, to one decimal place. 3.5 kW is not 2.5 kW.
    const kw = firstKw(p.capacity);
    if (kw != null && t.kw != null && Math.abs(t.kw - kw) < 0.15) return t;

    // 3. The same tank or flow rate in litres — "26 L" against "26 L/min".
    const l = firstLitres(p.capacity);
    const tl = firstLitres(t.tier);
    if (l != null && tl != null && l === tl) return t;

    // 4. The same number of indoor heads, which is what a multi-head tier is
    //    actually about: "2-indoor" against "· 2 Heads".
    const heads = firstHeads(p.name) ?? firstHeads(p.capacity);
    const th = firstHeads(t.tier);
    if (heads != null && th != null && heads === th) return t;
  }
  return null;
}

/** Words that appear in a tier title without identifying a product. */
const STOP = new Set([
  "single", "split", "system", "multi", "head", "indoor", "ducted", "reverse", "cycle",
  "zones", "zone", "annual", "service", "standard", "emergency", "call", "hours", "parts",
  "bundle", "units", "unit", "aircon", "business", "weekend", "heating", "water", "flow",
  "continuous", "appliance", "installation", "point", "leak", "detection", "report",
  "replacement", "like", "higher", "spec", "gas", "hot", "cooling", "large", "open", "plan",
  "bedroom", "living", "series", "console", "wall", "classic", "internal", "external",
  "for", "star", "stars", "compact", "with", "and", "the", "per", "visit", "extra",
]);

export type Shelf = {
  cat: PbCategory;
  items: PbItem[];
  /** Size chips, where the shelf's models carry sizes. */
  sizes: string[];
  /** Every published tier for this shelf — what we quote from. */
  tiers: Tier[];
};

export function shelf(key: string): Shelf {
  const cat = PB_CATEGORIES.find((c) => c.key === key) ?? PB_CATEGORIES[0];
  const tiers = publishedTiers();

  const items: PbItem[] = [];
  for (const b of brands) {
    for (const p of visibleProducts(b)) {
      if (!belongs(p, cat)) continue;
      const litres = firstLitres(p.capacity);
      items.push({
        brand: b.name, brandSlug: b.slug, slug: p.slug,
        name: p.name, model: p.model, categoryLabel: p.categoryLabel,
        capacity: p.capacity ?? null,
        kw: firstKw(p.capacity),
        litres,
        veu: p.veuEligible, bestFor: p.bestFor,
        specs: p.specs,
        tier: tierFor(p, cat, tiers, b.name),
        href: `/brands/${b.slug}/${p.slug}`,
      });
    }
  }

  // Smallest first, so a shelf reads the way a tech works up through sizes.
  items.sort((a, b) =>
    (a.kw ?? a.litres ?? 0) - (b.kw ?? b.litres ?? 0) || a.brand.localeCompare(b.brand));

  const sizes = Array.from(new Set(items.map((i) => sizeOf(i)).filter(Boolean) as string[]));
  const mine = cat.group ? tiers.filter((t) => t.group === cat.group) : [];

  return { cat, items, sizes, tiers: mine };
}

/** The chip a model filters under: its kW, or its tank in litres. */
export function sizeOf(i: PbItem): string | null {
  if (i.kw != null) return `${i.kw} kW`;
  if (i.litres != null) return `${i.litres} L`;
  return null;
}
