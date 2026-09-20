/**
 * One card per product family, not one per model.
 *
 * The catalogue stores every size as its own product, which is right —
 * MSZ-AP25 and MSZ-AP50 have different specs, different prices and
 * different pages. It is wrong as a way to *show* the catalogue. The range
 * page opened with six Mitsubishi cards carrying the same photograph, the
 * same two sentences and the same category chip, differing only in a number,
 * and Kaden's brand page put four multi-heads in a row the same way. A reader
 * scanning that cannot see six sizes of one thing; they see six things.
 *
 * So: group by family, show one card, and put the sizes on it as chips. The
 * model pages are untouched and every one of them is still linked — the chip
 * decides which one the card points at.
 *
 * Nothing new is stored to make this work. The family is `brand +
 * categoryLabel`, which is already written per product and already specific
 * enough to be a family name: Reclaim's glass-lined and stainless tanks have
 * different labels and stay different families, which is correct, because the
 * tank material is a real choice and the capacity is a size.
 */

export type FamilyMember = {
  slug: string;
  /** Set by the grouper when the short capacity label was ambiguous and a
   *  longer one had to be used to tell the sizes apart. */
  chipLabel?: string;
  name: string;
  capacity?: string;
  installedPriceFrom?: string;
  veuEligible: boolean;
  bestFor: string;
  href: string;
};

export type Family<T extends FamilyMember> = {
  key: string;
  /** What to call the family on the card. */
  title: string;
  /** Every member, in capacity order. One member means no chips. */
  members: T[];
};

/**
 * The short label on a chip.
 *
 * Capacity strings are written for a spec table, not a chip: "2.5 kW cooling /
 * 3.2 kW heating", "4.0 kW combined · 2 indoor heads", "160 L glass-lined
 * tank". The chip needs the number and its unit and nothing else.
 *
 * Some products already carry several sizes in one row — "15 · 20 · 26 · 30 kW
 * output" is one page covering four heaters. Those become a range chip rather
 * than a chip showing only the smallest, which would be a lie about what the
 * page behind it sells.
 */
export function variantLabel(capacity?: string): string | null {
  if (!capacity) return null;

  // A multi-size row, two ways of writing it: "15 · 20 · 26 · 30 kW output",
  // and "10 kW / 12.5 kW / 14 kW cooling". The second has to be told apart
  // from "2.5 kW cooling / 3.2 kW heating", which is ONE size described twice
  // — the tell is whether a word sits between the figures. Nothing between
  // means more sizes; a word between means more ways of measuring one size.
  const dots = /^\s*([\d.]+(?:\s*[·•]\s*[\d.]+)+)\s*(kW|L)\b/i.exec(capacity);
  if (dots) {
    const nums = dots[1].split(/[·•]/).map((n) => n.trim()).filter(Boolean);
    if (nums.length > 1) return `${nums[0]}\u2013${nums[nums.length - 1]} ${dots[2]}`;
  }
  const slashes = /^\s*([\d.]+)\s*(kW|L)\s*(?:\/\s*([\d.]+)\s*\2\s*)+/i.exec(capacity);
  if (slashes) {
    const all = [...capacity.matchAll(/([\d.]+)\s*(kW|L)\b/gi)].map((m) => m[1]);
    if (all.length > 1) return `${all[0]}\u2013${all[all.length - 1]} ${slashes[2]}`;
  }

  // The ordinary case. The digits are kept exactly as written, so 4.0 stays
  // 4.0 and sits straight under 2.5 rather than collapsing to 4.
  const first = /([\d.]+)\s*(kW|L)\b/i.exec(capacity);
  return first ? `${first[1]} ${first[2]}` : null;
}

/**
 * A longer chip label, for when the short one cannot tell two sizes apart.
 *
 * Reclaim's Panasonic units vary on two axes at once: "250 L glass-lined tank ·
 * 4 kW Panasonic Aquarea compressor" and the same tank with a 6 kW compressor.
 * The short label reads the first figure it finds and gets "250 L" for both,
 * so without this they look like a family with a duplicate chip and get split
 * into four cards that differ, visibly, in nothing.
 */
function richLabel(capacity?: string): string | null {
  if (!capacity) return null;
  const found = [...capacity.matchAll(/([\d.]+)\s*(kW|L)\b/gi)];
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const m of found) {
    const unit = m[2].toUpperCase() === "L" ? "L" : "kW";
    if (seen.has(unit)) continue;
    seen.add(unit);
    parts.push(`${m[1]} ${unit}`);
  }
  // Tank before compressor: it is the figure a customer shops on.
  parts.sort((a) => (a.endsWith("L") ? -1 : 1));
  return parts.length ? parts.join(" \u00b7 ") : null;
}

/**
 * The sizes a single product is sold in, when one page covers several.
 *
 * A gas ducted heater is one model in four outputs — "15 · 20 · 26 · 30 kW
 * output" — and an evaporative cooler is one model in three roof units. There
 * is one page for each because the choice between them is made on the roof
 * with a tape measure, not on a website. So these cannot be chips you pick;
 * they are chips that tell you the sizes exist, which is the question somebody
 * reading a heater card is actually asking.
 *
 * Deliberately only matches a list at the very start of the string. "2.5 kW
 * cooling / 3.2 kW heating" is one size described twice and must not come back
 * as two.
 */
export function staticSizes(capacity?: string): string[] | null {
  if (!capacity) return null;

  // "15 · 20 · 26 · 30 kW output"
  const nums = /^\s*([\d.]+(?:\s*[·•]\s*[\d.]+)+)\s*(kW|L)\b/i.exec(capacity);
  if (nums) {
    const unit = nums[2];
    return nums[1].split(/[·•]/).map((n) => `${n.trim()} ${unit}`);
  }

  // "10 kW / 12.5 kW / 14 kW cooling" — repeated unit, nothing between.
  if (/^\s*[\d.]+\s*(kW|L)\s*(?:\/\s*[\d.]+\s*\1\s*)+/i.test(capacity)) {
    const all = [...capacity.matchAll(/([\d.]+)\s*(kW|L)\b/gi)];
    if (all.length > 1) return all.map((m) => `${m[1]} ${m[2]}`);
  }

  // "Small · Medium · Large roof units"
  const words_ = /^\s*([A-Z][a-z-]+(?:\s*[·•]\s*[A-Z][a-z-]+)+)\s/.exec(capacity);
  if (words_) {
    const parts = words_[1].split(/[·•]/).map((w) => w.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  return null;
}

/** The number a chip sorts on. Falls back to 0 so unsized rows lead. */
function sortValue(capacity?: string): number {
  const m = /([\d.]+)\s*(?:kW|L)\b/i.exec(capacity ?? "");
  return m ? parseFloat(m[1]) : 0;
}

const words = (s: string) => s.trim().split(/\s+/);

/** Words that are a unit or a counted noun rather than part of a name. */
const UNIT = /^(kw|l|litre|litres|head|heads|zone|zones|star|output|combined)$/i;
const SEP = /^[·•\-–|]$/;

function tidy(parts: string[]): string {
  const out = [...parts];
  while (out.length && (UNIT.test(out[0]) || SEP.test(out[0]))) out.shift();
  while (out.length && (UNIT.test(out[out.length - 1]) || SEP.test(out[out.length - 1]))) out.pop();
  return out.join(" ").trim();
}

/**
 * The family's name, worked out from its members' names.
 *
 * Take the words the names share at the end, then the words they share at the
 * start, and use the first of those that survives having its units stripped.
 * Both halves are needed: Mitsubishi's sizes are "MSZ-AP25 Classic Wall Split"
 * through "MSZ-AP80 Classic Wall Split", which share only their tail, while
 * Kaden's are "Kaden KSI-v3 2.5 kW Split" through "Kaden KSI-v3 8.0 kW Split",
 * whose tail is "kW Split" and whose head is the actual name.
 *
 * Stripping units is the part that is easy to leave out and obvious once it
 * bites: without it those two produce "Kaden KSI-v3 kW Split" and, for the
 * multi-heads, "Kaden Multi-Head Heads".
 */
export function familyTitle(names: string[], fallback: string): string {
  if (names.length === 1) return names[0];
  const lists = names.map(words);
  const shortest = Math.min(...lists.map((l) => l.length));

  let head = 0;
  while (head < shortest && lists.every((l) => l[head] === lists[0][head])) head++;

  let tail = 0;
  while (
    tail < shortest - head &&
    lists.every((l) => l[l.length - 1 - tail] === lists[0][lists[0].length - 1 - tail])
  ) tail++;

  const first = lists[0];
  const fromTail = tidy(tail ? first.slice(first.length - tail) : []);
  if (words(fromTail).length >= 2) return fromTail;
  const fromHead = tidy(first.slice(0, head));
  if (words(fromHead).length >= 2) return fromHead;
  // One shared word is not a name. "Kaden Gas Ducted · 3-Star Internal" and
  // "Kaden Starpro · 4 & 5-Star Internal" share only "Internal", and a card
  // headed Internal tells nobody anything. The category label is duller and
  // true.
  return fallback;
}

/**
 * Group a flat list into families, preserving the order families first
 * appeared so a filtered list does not reshuffle itself.
 */
export function groupFamilies<T extends FamilyMember>(
  items: T[],
  keyOf: (item: T) => string,
  labelOf: (item: T) => string,
): Family<T>[] {
  const order: string[] = [];
  const buckets = new Map<string, T[]>();

  for (const it of items) {
    const k = keyOf(it);
    if (!buckets.has(k)) { buckets.set(k, []); order.push(k); }
    buckets.get(k)!.push(it);
  }

  const out: Family<T>[] = [];
  for (const k of order) {
    const members = [...buckets.get(k)!].sort((a, b) => sortValue(a.capacity) - sortValue(b.capacity));

    // Chips have to tell the sizes apart, and sometimes they cannot. Kaden's
    // 3-star and 4/5-star internal heaters are both "15–30 kW": same output,
    // different efficiency, genuinely different products. Collapsing those
    // into one card gives you two chips with the same text on them, which is
    // a control that appears broken. So a bucket whose labels collide is not
    // a family — it goes back to being one card each.
    const ok = (ls: string[]) => new Set(ls).size === ls.length && !ls.includes("");
    let labels = members.map((m) => variantLabel(m.capacity) ?? "");
    if (members.length > 1 && !ok(labels)) {
      // Try again with both figures before giving up on the family.
      const rich = members.map((m) => richLabel(m.capacity) ?? "");
      if (ok(rich)) { labels = rich; for (const m of members) m.chipLabel = richLabel(m.capacity) ?? undefined; }
    }
    const distinct = ok(labels);
    if (members.length > 1 && !distinct) {
      for (const m of members) out.push({ key: `${k}|${m.slug}`, title: m.name, members: [m] });
      continue;
    }

    out.push({
      key: k,
      title: familyTitle(members.map((m) => m.name), labelOf(members[0])),
      members,
    });
  }

  // Two families with the same name sitting side by side look like a bug even
  // when they are not. Reclaim's glass-lined and stainless CO₂ splits share
  // every word of their names except the tank material, which lives in the
  // category label, so both resolve to "Reclaim CO₂ Split". Where that
  // happens, both fall back to the label, which is the thing that actually
  // tells them apart.
  const byTitle = new Map<string, number>();
  for (const f of out) byTitle.set(f.title, (byTitle.get(f.title) ?? 0) + 1);
  for (const f of out) {
    if ((byTitle.get(f.title) ?? 0) > 1) f.title = labelOf(f.members[0]);
  }
  return out;
}
