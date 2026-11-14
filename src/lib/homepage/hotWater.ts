import { TIER_MODELS, CATS, modelForAnswer, type System } from "@/lib/homepage/data";

/**
 * Shower maths, shared by the product page's "How long are the showers?",
 * the finder's options and the hot water size check, so all three give the
 * same answer.
 *
 * Jake's working (Nov 2026): a 9 L/min shower head draws about 5 L cold and
 * 4 L hot, plus about 1 L a minute lost as heat on the way, so the tank gives
 * up 5 L of hot water for every minute someone is in the shower. A 200 L tank
 * is 40 minutes from full, and the reheat while it runs (and the boost every
 * heat pump we sell has) stretches that by about a quarter, to 50.
 *
 * A gas tank's burner puts back its rated recovery instead (Thermann 170 L:
 * 145 L/h at a 45° rise, about 2.4 L a minute), so its tank drains at 5 less
 * that. Those ratings are the Thermann spec sheet's; brands.ts carries the
 * same figures for the spec table, but it's too big to ship to the browser.
 */
export const HOT_PER_MIN = 4 + 1;
export const REHEAT = 1.25;
export const GAS_RECOVERY: Record<number, number> = { 135: 122, 170: 145 };

/** Minutes behind each answer to "How long are the showers?". */
export const SHOWER_MINUTES = [5, 8, 12];

/** Showering a full tank gives: from full, and with the reheat running. */
export function tankMinutes(litres: number, recovery?: number | null): { low: number; high: number } {
  const low = Math.round(litres / HOT_PER_MIN);
  const back = recovery ? recovery / 60 : 0;
  const high = back > 0 && back < HOT_PER_MIN ? Math.round(litres / (HOT_PER_MIN - back)) : Math.round(low * REHEAT);
  return { low, high };
}

/** The people count a size answer stands for: "3–4 people" → 4, "5+" → 5. */
export function peopleIn(label?: string): number {
  const ns = (label?.match(/\d+/g) ?? []).map(Number);
  return ns.length ? Math.max(...ns) : 4;
}

export type Fit = "plenty" | "reheat" | "short";
/**
 * Whether a tank covers the household's showers back to back: from a full
 * tank alone, only with the reheat running, or not at all.
 */
export function fitOf(need: number, m: { low: number; high: number }): Fit {
  return m.low >= need ? "plenty" : m.high >= need ? "reheat" : "short";
}
export const FIT_TEXT: Record<Fit, string> = {
  plenty: "Covers everyone from a full tank",
  reheat: "Covers everyone, with the reheat running",
  short: "Short for everyone back to back",
};

export type Tank = { litres: number; rec: number | null; chip: string; id: string };

/** Every tank size an option comes in, from its model list ("275 L" chips). */
export function tanksOf(sysSlug: string, tierSlug: string): Tank[] {
  const refs = TIER_MODELS[`${sysSlug}.${tierSlug}`] ?? [];
  return refs.flatMap(([, slug, chip, id]) => {
    const litres = Number(/^(\d{2,3})\s*L$/.exec(chip)?.[1]);
    if (!litres) return [];
    return [{ litres, rec: sysSlug === "gas-storage" ? GAS_RECOVERY[litres] ?? null : null, chip, id: id ?? slug }];
  });
}

/**
 * The tank we'd recommend from an option: the smallest that covers the
 * showers from a full tank with a quarter to spare, since the kitchen,
 * dishwasher and laundry draw on it too; failing that the smallest that
 * covers them with the reheat; failing that its biggest. A family of four
 * on 8-minute showers is 32 minutes, and a 160 L tank's 32 would leave
 * nothing for the rest of the house.
 */
export const SPARE = 1.25;
export function tankFor(sysSlug: string, tierSlug: string, need: number, min = 0): (Tank & { m: { low: number; high: number }; fit: Fit }) | null {
  const every = tanksOf(sysSlug, tierSlug).map((t) => { const m = tankMinutes(t.litres, t.rec); return { ...t, m, fit: fitOf(need, m) }; });
  if (!every.length) return null;
  // `min` is a floor in litres for the household size (a 4-bedroom home gets
  // 270–300 L), so the shower maths can only push the size up from it.
  const big = every.filter((t) => t.litres >= min);
  const all = big.length ? big : every.slice(-1);
  return all.find((t) => t.m.low >= need * SPARE) ?? all.find((t) => t.fit !== "short") ?? all[all.length - 1];
}

/** The hot water systems that keep a tank, for the size check. */
export const TANK_SYSTEMS = (): System[] =>
  (CATS.find((c) => c.id === "hw")?.systems ?? []).filter((s) => s.tiers.some((t) => !t.same && tanksOf(s.slug, t.slug).length));

/**
 * The tank the product page opens on for this size answer (the same
 * nearest-size pick), how it copes, and the next size up when it falls short.
 * The finder shows this one rather than the smallest that would do, so the
 * card and the page it opens agree.
 */
export function tankForAnswer(sysSlug: string, tierSlug: string, spec: string | undefined, need: number) {
  const all = tanksOf(sysSlug, tierSlug);
  if (!all.length) return null;
  const tk = all[modelForAnswer(all, spec)];
  const m = tankMinutes(tk.litres, tk.rec);
  const fit = fitOf(need, m);
  const up = fit === "short" ? all.find((t) => t.litres > tk.litres && fitOf(need, tankMinutes(t.litres, t.rec)) !== "short") : undefined;
  return { ...tk, m, fit, up };
}
