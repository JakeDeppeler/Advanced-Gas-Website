import { CREWS, type CrewKind } from "@/lib/portal/cover/hour";

/**
 * Rates for a day spent on one site: an install that fills the day, and
 * commercial work. Kept apart from `pricing` (the domestic crew rates that
 * match the ServiceTitan pricebook) in portal_settings key `site_rates`.
 *
 * The domestic rates are built on 6 of 8 hours billed, because a van doing
 * service calls loses the rest to driving between them. A van on one site all
 * day bills every hour it's paid for, so each hour carries less of the year's
 * overheads. Commercial work gets its own hours and its own profit, since
 * what's different about it (slower payment, site inductions, a tender's
 * margin) is the owner's to say, not the portal's to guess.
 *
 * Null is "not set": the hours fall back to the full paid day, the profit to
 * the one Our hourly rate is built on, and a charge to nothing to measure.
 */
export type SiteRates = {
  onsiteHrs: number | null;
  commercialHrs: number | null;
  commercialMargin: number | null;
  onsite: Record<CrewKind, number | null>;
  commercial: Record<CrewKind, number | null>;
};

const n = (v: unknown) => (v == null || v === "" ? null : Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

export function normaliseSiteRates(raw: unknown): SiteRates {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const crews = (o: unknown) => Object.fromEntries(CREWS.map((c) => [c.k, n((o as Record<string, unknown> | undefined)?.[c.k])])) as Record<CrewKind, number | null>;
  const hrs = (v: unknown) => { const x = n(v); return x != null && x <= 24 ? x : null; };
  const pct = Number(r.commercialMargin);
  return {
    onsiteHrs: hrs(r.onsiteHrs),
    commercialHrs: hrs(r.commercialHrs),
    commercialMargin: r.commercialMargin != null && r.commercialMargin !== "" && pct >= 0 && pct < 100 ? pct : null,
    onsite: crews(r.onsite),
    commercial: crews(r.commercial),
  };
}
