/**
 * The commission rule from the brief: one rule for everyone. Hit the month
 * target and the bonus is the rate on everything sold that month, not just
 * the part over. Kept in portal_settings key `commission`, edited on Our
 * numbers › Commission.
 *
 * The wall board's tiered bands (dashboard.commissionTiers) are left as they
 * are until Jake confirms this replaces them.
 */
export type Commission = { monthTarget: number; ratePct: number };

export const DEFAULT_COMMISSION: Commission = { monthTarget: 25_000, ratePct: 5 };

export function normaliseCommission(raw: unknown): Commission {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t = Number(r.monthTarget), p = Number(r.ratePct);
  return {
    monthTarget: Number.isFinite(t) && t > 0 ? Math.round(t) : DEFAULT_COMMISSION.monthTarget,
    ratePct: Number.isFinite(p) && p > 0 && p <= 50 ? p : DEFAULT_COMMISSION.ratePct,
  };
}

/** Hit or not, and the bonus: the rate on the whole month once the target is reached. */
export function bonusFor(sold: number, c: Commission) {
  const hit = sold >= c.monthTarget;
  return { hit, bonus: hit ? (sold * c.ratePct) / 100 : 0, toGo: Math.max(0, c.monthTarget - sold), wouldBe: (Math.max(sold, c.monthTarget) * c.ratePct) / 100 };
}
