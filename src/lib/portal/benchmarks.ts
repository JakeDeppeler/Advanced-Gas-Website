/**
 * What a healthy service trade looks like. Fixed here on purpose: these are
 * shown beside our own goals and never edited in the portal, because a
 * benchmark you can move to suit the month stops being one.
 *
 * Sources are the bands the brief settled on (docs/portal-new/BRIEF.md).
 */

export type BenchKey = "gm" | "ovh" | "np" | "wages" | "win" | "cash" | "book" | "rvd" | "drive" | "callbacks" | "pay";
export type Bench = { lo: number; hi: number; words: string; why: string };

export const BENCH: Record<BenchKey, Bench> = {
  gm: { lo: 40, hi: 60, words: "40 to 60%", why: "service trades; installs sit at the low end" },
  ovh: { lo: 10, hi: 15, words: "10 to 15%", why: "a growing service business runs near 15" },
  np: { lo: 15, hi: 25, words: "15 to 25%", why: "an established service business reaches 25" },
  wages: { lo: 20, hi: 24, words: "20 to 24%", why: "wages, super and WorkCover together" },
  win: { lo: 25, hi: 70, words: "25 to 35% on new leads · 55 to 65% on existing customers", why: "over 70% usually means we're too cheap" },
  cash: { lo: 8, hi: 12, words: "8 weeks or more", why: "two months of payroll in the bank" },
  book: { lo: 70, hi: 85, words: "70 to 85%", why: "calls that become a booked job" },
  rvd: { lo: 900, hi: 1400, words: "$900 to $1,400 a day", why: "$155K a year per tech is the median, $210K the top quarter" },
  drive: { lo: 15, hi: 25, words: "15 to 25% of the day", why: "more than 25% on the road is a routing problem" },
  callbacks: { lo: 0, hi: 3, words: "3% or less", why: "free second visits on our own work" },
  pay: { lo: 14, hi: 30, words: "14 days domestic · 30 days real estate", why: "agents pay on their monthly statement run" },
};

/** In the band, a little out, or well out, in words. `lower` when less is better. */
export function benchStatus(key: BenchKey, v: number, lower = false): { k: "good" | "mid" | "bad"; w: string } {
  const b = BENCH[key];
  if (lower) return v <= b.hi ? { k: "good", w: "In the band" } : v <= b.hi * 1.3 ? { k: "mid", w: "Above the band" } : { k: "bad", w: "Well above" };
  if (key === "win" && v > b.hi) return { k: "mid", w: "Too cheap?" };
  return v >= b.lo ? { k: "good", w: "In the band" } : v >= b.lo * 0.8 ? { k: "mid", w: "Under the band" } : { k: "bad", w: "Well under" };
}
