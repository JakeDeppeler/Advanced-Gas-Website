import type { CrewMember } from "./crew";

/**
 * The pay plan being trained up for: the fully qualified tradesmen on one
 * base wage, plus a commission on what they sell, from a set start date.
 * Saved in portal_settings ("payplan"); until it's saved the defaults stand.
 */
export type PayPlan = {
  /** The day it goes live. */
  startOn: string;
  /** Base wage an hour for everyone on it. */
  wage: number;
  /** Commission as a percentage of the sales (ex GST) their work brings in. */
  pct: number;
  /** Who's on it, by portal user id. Null means every tradesman. */
  who: string[] | null;
};

export const DEFAULT_PAY_PLAN: PayPlan = { startOn: "2027-01-01", wage: 45, pct: 3, who: null };

export function readPayPlan(raw: unknown): PayPlan {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<PayPlan>;
  const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
  return {
    startOn: typeof r.startOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.startOn) ? r.startOn : DEFAULT_PAY_PLAN.startOn,
    wage: n(r.wage, DEFAULT_PAY_PLAN.wage),
    pct: n(r.pct, DEFAULT_PAY_PLAN.pct),
    who: Array.isArray(r.who) ? r.who.filter((x): x is string => typeof x === "string") : null,
  };
}

/** Whether someone is on the plan: named, or a tradesman when nobody's been named. */
export const onPlan = (p: CrewMember, plan: PayPlan) => (plan.who ? plan.who.includes(p.id) : p.level === "tradesman");

/** The crew with the plan's wage applied to the people on it. */
export const withPlanWages = (people: CrewMember[], plan: PayPlan): CrewMember[] =>
  people.map((p) => (onPlan(p, plan) ? { ...p, costing: { ...p.costing, wage: plan.wage } } : p));
