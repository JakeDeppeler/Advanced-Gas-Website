import { brands, type Brand, type Product } from "@/lib/brands";

/**
 * The brands a system comes in, and the sizes each brand makes.
 *
 * "Choose your system" used to open on a list of price tiers, which
 * answers "what does it cost" but not "what can I actually have". A
 * split system is two brands and eleven models between them, and that
 * is the thing somebody is trying to picture when they press the
 * button.
 *
 * Built off the product catalogue rather than authored a second time,
 * so a model added to a brand page turns up here without anybody
 * remembering to do it twice.
 */

export type SystemBrandSizes = {
  brand: string;
  href: string;
  /** The series, where every model in the group shares one — "MSZ-AP",
   *  "KSI". Null where the group spans more than one. */
  series: string | null;
  models: {
    slug: string;
    /** "2.5 kW", pulled off the front of the capacity string. */
    size: string;
    model: string;
    href: string;
    priceFrom?: string;
  }[];
};

/** "2.5 kW cooling / 3.2 kW heating" → "2.5 kW". Anything that doesn't
 *  start with a figure keeps its full text — tank litres, star ratings
 *  and the like are already short. */
function shortSize(capacity: string | undefined): string {
  if (!capacity) return "";
  const m = capacity.match(/^\s*([\d.]+\s*(?:kW|L|litre)s?)/i);
  return m ? m[1].replace(/\s+/g, " ") : capacity.split("·")[0].trim();
}

/** The shared prefix of a set of model codes, to the last separator.
 *  "MSZ-AP25VGD" + "MSZ-AP35VGD" → "MSZ-AP". */
function commonSeries(models: Product[]): string | null {
  if (models.length < 2) return null;
  const codes = models.map((m) => m.model.split(/[·,/]/)[0].trim());
  let i = 0;
  while (i < codes[0].length && codes.every((c) => c[i] === codes[0][i])) i++;
  const prefix = codes[0].slice(0, i).replace(/[-\s]+$/, "");
  return prefix.length >= 3 ? prefix : null;
}

export function systemCatalogue(
  categoryLabels: string[] | undefined,
  brandNames: string[] | undefined,
): SystemBrandSizes[] {
  if (!categoryLabels || categoryLabels.length === 0) return [];
  const wanted = new Set(categoryLabels);

  const out: SystemBrandSizes[] = [];
  for (const b of brands as Brand[]) {
    // `brandNames` is what we actually fit in this system. A brand can
    // be in the catalogue for a category and still not be one we'd put
    // in — that list is the authority, not the catalogue.
    if (brandNames && !brandNames.some((n) => b.name.toLowerCase().startsWith(n.toLowerCase()))) {
      continue;
    }
    const models = b.products.filter((p) => wanted.has(p.categoryLabel));
    if (models.length === 0) continue;
    out.push({
      brand: b.name,
      href: `/brands/${b.slug}`,
      series: commonSeries(models),
      models: models.map((p) => ({
        slug: p.slug,
        size: shortSize(p.capacity),
        model: p.model,
        href: `/brands/${b.slug}/${p.slug}`,
        priceFrom: p.installedPriceFrom,
      })),
    });
  }
  return out;
}
