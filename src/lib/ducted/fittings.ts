/**
 * Branch take-offs from the pricebook, matched to the sizes a design asks for.
 *
 * The pricebook names its fittings by their legs, inlet first: "Multisnap
 * DBTO F/Insul 300.250.200.200" is a Ø300 inlet with three outlets, "Multisnap
 * BTO F/Insul 300.200.200" and "Multisnap F/Insul MXY 250.200.150 Kit" have
 * two. The designer gives the same thing as "Ø300 in → Ø250 · Ø200 · Ø150".
 *
 * Not every combination is stocked. When one isn't, the fitting with the same
 * inlet whose legs are each at least as big goes on, with a reducer on every
 * leg that has to come down, which is how 20803 was quoted by hand (a DBTO
 * plus two 250 × 200 reducers). A bigger inlet is never substituted: that's a
 * different trunk, and the office decides it. Jake, 24 Nov: "the fitting will
 * be in the price book you just need to know the sizing of the bdo and zones".
 */

import type { Sku } from "./plan";

/**
 * `outs` are each leg's biggest size, biggest first; `mins` the smallest each
 * can be cut to with no reducer ("Multisnap Y F/Insul 200.200-100.200-100"
 * has two legs that cut from 200 down to 100). A plain leg's min is its size.
 */
export type Fitting = Sku & { in: number; outs: number[]; mins: number[]; rank: number };
export type Reducer = Sku & { from: number; to: number; rank: number };

const LEG = String.raw`\d{3}(?:-\d{3})?`;
const legs = (sep: string, n: string) => `(\\d{3}(?:${sep}${LEG}){${n}})`;

/**
 * Multisnap foam-insulated first: it's what the office quotes (20803), then
 * the poly ranges. A "Base" comes last: it reads as the base of a fitting
 * without its top, so a complete fitting from another range is safer.
 */
const FAMILIES: { re: RegExp; rank: number; sep: RegExp }[] = [
  { re: new RegExp(`^Multisnap (?:D?BTO |Y )?F/Insul (?:MXY )?${legs("\\.", "2,3")}(?: Kit)?$`, "i"), rank: 0, sep: /\./ },
  { re: new RegExp(`^Multisnap (?:Foam Insulated MXY|F/Insul MXB) ${legs("\\.", "2")}(?: Kit)?$`, "i"), rank: 1, sep: /\./ },
  { re: new RegExp(`^Duct Poly Insul D?BTO ${legs("x", "2,3")}mm$`, "i"), rank: 2, sep: /x/i },
  { re: new RegExp(`^D?BTO ${legs("\\.", "2,3")} Insulated$`, "i"), rank: 3, sep: /\./ },
  { re: new RegExp(`^Multisnap F/Insul MX[YB] ${legs("\\.", "2")} Base$`, "i"), rank: 4, sep: /\./ },
];

export function asFitting(s: Sku): Fitting | null {
  const name = s.name.replace(/\s+/g, " ").trim();
  for (const f of FAMILIES) {
    const m = f.re.exec(name);
    if (!m) continue;
    const [inlet, ...rest] = m[1].split(f.sep);
    const ls = rest.map((l) => { const [hi, lo] = l.split("-").map(Number); return { hi, lo: lo ?? hi }; }).sort((a, b) => b.hi - a.hi);
    return { ...s, in: Number(inlet), outs: ls.map((l) => l.hi), mins: ls.map((l) => l.lo), rank: f.rank };
  }
  return null;
}

/** "Multisnap F/Insul Reducer 300-250" and the stepped "300-250-200" (cut to either), "Duct Poly Insul Reducer 300x250mm". */
export function asReducers(s: Sku): Reducer[] {
  const name = s.name.replace(/\s+/g, " ").trim();
  const snap = /^Multisnap F\/Insul Reducer (\d{3})-(\d{3})(?:-(\d{3}))?$/i.exec(name);
  if (snap) {
    const [from, ...to] = [snap[1], snap[2], snap[3]].filter(Boolean).map(Number);
    return [...new Set(to)].filter((t) => t < from).map((t) => ({ ...s, from, to: t, rank: 0 }));
  }
  const poly = /^Duct Poly Insul Reducer (\d{3})x(\d{3})mm$/i.exec(name);
  return poly ? [{ ...s, from: Number(poly[1]), to: Number(poly[2]), rank: 1 }] : [];
}

/** The fewest reducers that take a leg from one size down to another, or null if the pricebook can't. */
export function reducerChain(from: number, to: number, reducers: Reducer[]): Reducer[] | null {
  if (from === to) return [];
  let best: Reducer[] | null = null;
  const walk = (at: number, path: Reducer[]) => {
    if (best && path.length >= best.length) return;
    if (at === to) { best = path; return; }
    for (const r of reducers.filter((x) => x.from === at && x.to >= to).sort((a, b) => a.to - b.to || a.rank - b.rank)) walk(r.to, [...path, r]);
  };
  walk(from, []);
  return best;
}

export type FittingPick = { fitting: Fitting; reducers: Reducer[]; exact: boolean };

const before = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

/** The take-off for one design fitting: exact if stocked, else the closest that fits plus reducers; null if nothing does. */
export function pickFitting(need: { in: number; outs: number[] }, fittings: Fitting[], reducers: Reducer[]): FittingPick | null {
  const want = [...need.outs].sort((a, b) => b - a);
  let best: (FittingPick & { score: number[] }) | null = null;
  for (const f of fittings) {
    if (f.in !== need.in || f.outs.length !== want.length) continue;
    if (f.outs.some((o, i) => o < want[i])) continue;
    // A leg that cuts down to the size needs nothing; below its smallest cut, reducers from there.
    const chains = f.outs.map((_, i) => (want[i] >= f.mins[i] ? [] : reducerChain(f.mins[i], want[i], reducers)));
    if (chains.some((c) => c === null)) continue;
    const red = chains.flat() as Reducer[];
    const exact = red.length === 0 && f.outs.every((o, i) => o === want[i]);
    // Fewest reducers, then the office's own range, then the cheaper.
    const score = [red.length, f.rank, f.price + red.reduce((a, r) => a + r.price, 0)];
    if (!best || before(score, best.score)) best = { fitting: f, reducers: red, exact, score };
  }
  return best ? { fitting: best.fitting, reducers: best.reducers, exact: best.exact } : null;
}
