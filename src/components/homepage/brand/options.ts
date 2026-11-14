import type { Brand } from "@/lib/brands";
import { CATS, BRAND_SLUGS } from "@/lib/homepage/data";

/**
 * The finder's options from this brand, matched the same way a product page
 * finds its brand, so the two always agree. A split appears under Cooling
 * and again under Heating (as a reverse-cycle split); it is listed once,
 * with both categories on its card.
 */
export function brandOptions(brand: Brand) {
  // Unlisted options (zoning) still have pages, so a brand's range still shows them.
  const all = CATS.flatMap((c) => [...c.systems, ...(c.unlisted ?? [])].flatMap((s) => s.tiers
    .map((t, i) => ({ c, s, t, i }))
    // An option that is really another one (`same`) is listed as that one.
    .filter(({ t }) => BRAND_SLUGS[t.brand] === brand.slug && !t.same)));
  return all
    .filter((o, k) => all.findIndex((x) => x.t.model === o.t.model) === k)
    .map((o) => ({ ...o, cats: [...new Set(all.filter((x) => x.t.model === o.t.model).map((x) => x.c.label))] }));
}
