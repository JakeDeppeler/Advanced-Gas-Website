/**
 * The round badges and headline figures on a /find product page, read off a
 * catalogue model's own specs in lib/brands.ts. A badge only exists where the
 * model's record states the figure: no record, no badge, rather than a
 * warranty or star rating borrowed from a sibling model or guessed from the
 * brand. Server-side, so the catalogue stays out of the browser bundle.
 */

export type Badge = { big: string; small: string; kind: "warranty" | "energy" | "wifi" };
type Spec = { label: string; value: string };

/** "5-year manufacturer + 6-year workmanship" → 5 yr warranty; "Tank warranty: 10 years parts…" → 10 yr tank warranty. */
function warranty(specs: Spec[]): Badge | null {
  for (const s of specs) {
    if (!/warranty/i.test(s.label) || /workmanship/i.test(s.label)) continue;
    const m = s.value.match(/(\d+)[\s-]*years?\s*([a-z ]+)?/i);
    if (!m) continue;
    const what = /^warranty$/i.test(s.label.trim())
      // The word after "year" says what the years cover, unless it's the whole thing.
      ? (m[2] ?? "").trim().split(/\s+(?:\+|and)\s*|,/)[0].trim().toLowerCase()
      : s.label.replace(/warranty/i, "").trim().toLowerCase();
    const small = !what || /^(manufacturer|whole unit|parts and labour)$/.test(what) ? "warranty" : `${what} warranty`;
    return { big: `${m[1]} yr`, small, kind: "warranty" };
  }
  return null;
}

/** Star rating from the product record or its spec table: "4.5-star cooling / 4.5-star heating" → 4.5★. */
function energy(starRating: string | undefined, specs: Spec[]): Badge | null {
  const src = starRating ?? specs.find((s) => /star rating/i.test(s.label))?.value;
  const m = src?.match(/(\d+(?:\.\d+)?)/);
  return m ? { big: `${m[1]}★`, small: "energy rating", kind: "energy" } : null;
}

/** Wi-Fi only when a spec line or the option's own feature list says so. */
function wifi(specs: Spec[], feats: string[]): Badge | null {
  const spec = specs.find((s) => /wi-?fi/i.test(s.label));
  const said = spec?.value ?? feats.find((f) => /wi-?fi/i.test(f));
  if (!said) return null;
  const small = /built.?in/i.test(said) ? "built in" : /ready/i.test(said) ? "ready" : "control";
  return { big: "Wi-Fi", small, kind: "wifi" };
}

export function badgesFor(p: { starRating?: string; specs?: Spec[] }, tierFeats: string[]): Badge[] {
  const specs = p.specs ?? [];
  return [warranty(specs), energy(p.starRating, specs), wifi(specs, tierFeats)].filter((b): b is Badge => !!b);
}

/**
 * The few figures that change between sizes, for the Model card: room size
 * first, then capacity, heating, sound and stars, whichever the record has.
 */
const KEYS: RegExp[] = [
  /room size|suits/i,
  /cool(ing)? capacity|cool \/ heat|combined cooling|tank capacity|flow rate|output range|zones per/i,
  /heat(ing)? capacity|combined heating|indoor heads/i,
  /sound/i,
  /star rating/i,
];
export function keyFigures(specs: Spec[] | undefined, max = 3): Spec[] {
  const out: Spec[] = [];
  for (const re of KEYS) {
    const hit = specs?.find((s) => re.test(s.label) && !/warranty/i.test(s.label) && !out.includes(s));
    if (hit) out.push(hit);
    if (out.length === max) break;
  }
  return out;
}
