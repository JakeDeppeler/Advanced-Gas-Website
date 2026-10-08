import "server-only";
import { listUsers, dbConfigured } from "./db";
import { getCostSettings } from "./costSettings";
import { computeCapacity, LEVEL_BILLABLE, LEVEL_LABEL, type CrewLevel } from "./crew";
import type { CrewRate } from "@/components/portal/JobCalculator";

export type RateFigure = { label: string; sub: string; mobile: number | null; onsite: number | null };

export type CrewFigures = {
  crew: CrewRate[];
  costPerHr: number | null;
  costPerHrOnsite: number | null;
  /** The headline figures: what an hour of each kind of person costs. */
  figures: RateFigure[];
  /** The mobile-day cost of an hour of each level, averaged over the people on it. */
  byLevel: Partial<Record<CrewLevel, number>>;
  /** True for a level whose people ride with a tech rather than run their own van. */
  ridesAlong: Partial<Record<CrewLevel, boolean>>;
};

const EMPTY: CrewFigures = { crew: [], costPerHr: null, costPerHrOnsite: null, figures: [], byLevel: {}, ridesAlong: {} };

/**
 * What the crew costs an hour, priced both ways.
 *
 * This was written inline on the job-calculator page. The trade portal's
 * on-site calculator needs the same figures, and two copies of this
 * arithmetic is the one thing that must not happen — a tech quoting from a
 * number that disagrees with the office's by a dollar an hour is worse than
 * having no calculator in the van.
 *
 * A job is either a mobile day or a day parked on one site, and which one it is
 * changes what the hour has to recover, so both sets come back together.
 */
export async function crewFigures(): Promise<CrewFigures> {
  if (!dbConfigured()) return EMPTY;

  const [users, base] = await Promise.all([listUsers(), getCostSettings()]);
  const people = users
    .filter((u) => u.active && u.id && u.level && LEVEL_BILLABLE[u.level as CrewLevel])
    .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));

  const capMobile = computeCapacity(people, { ...base, mode: "mobile" });
  const capOnsite = computeCapacity(people, { ...base, mode: "onsite" });
  const mob = new Map(capMobile.rates.map((r) => [r.id, r.rate]));
  const ons = new Map(capOnsite.rates.map((r) => [r.id, r.rate]));
  // What someone riding with a tech adds to the crew for every hour they are on
  // the job. The calculator used to charge nothing for them, which priced a
  // two-hander at the tech on his own.
  const mobUp = new Map(capMobile.rates.map((r) => [r.id, r.uplift]));
  const onsUp = new Map(capOnsite.rates.map((r) => [r.id, r.uplift]));
  const round = (v: number | null | undefined) => (v != null ? Math.round(v) : null);

  const crew: CrewRate[] = people.map((p) => ({
    id: p.id, name: p.name, level: p.level,
    rate: round(mob.get(p.id)),
    rateOnsite: round(ons.get(p.id)),
    uplift: round(mobUp.get(p.id)),
    upliftOnsite: round(onsUp.get(p.id)),
    // A wage does not change with the mode: the same hour of their time costs
    // the same whether the van drove five jobs or parked on one. The charge is
    // that wage with the margin on it, because the margin goes on what the crew
    // costs, both bodies in it.
    wage: Math.round(p.costing.wage * (1 + base.oncosts / 100) * 100) / 100,
    wageCharge: Math.round(p.costing.wage * (1 + base.oncosts / 100) * (1 + base.margin / 100) * 100) / 100,
  }));

  // An average across everyone on that level. Two tradesmen on different wages
  // give one figure for "a tradesman", which is what you want when the question
  // is what the hour costs rather than what Dave costs.
  const levelCost = (cap: typeof capMobile, level: CrewLevel) => {
    const ids = new Set(people.filter((p) => p.level === level).map((p) => p.id));
    const rows = cap.rates.filter((r) => ids.has(r.id) && r.costPerHr != null);
    if (!rows.length) return null;
    return rows.reduce((a, r) => a + (r.costPerHr as number), 0) / rows.length;
  };
  const oh = (cap: typeof capMobile) => (cap.totalBillHrs > 0 ? cap.sharedPerHr : null);
  // Two different figures wear the same "$/hr" label, and saying so matters.
  // Someone with their own van carries a share of the overhead in their hour.
  // Someone riding along does not: their cost is deliberately kept out of the
  // shared pool and comes back as an uplift on the crew they go out in, so
  // their figure is their whole cost spread over that van's hours.
  const rides = (lv: CrewLevel) => people.filter((p) => p.level === lv).every((p) => !p.costing.ownVan);
  const levels: CrewLevel[] = ["tradesman", "apprentice"];
  const figures: RateFigure[] = [
    ...levels
      .filter((lv) => people.some((p) => p.level === lv))
      .map((lv) => ({
        label: LEVEL_LABEL[lv],
        sub: rides(lv)
          ? "Their whole cost, school days included, over the hours they're out on jobs"
          : "Their pay, on-costs and their hour's share of overhead",
        mobile: levelCost(capMobile, lv),
        onsite: levelCost(capOnsite, lv),
      })),
    { label: "Overhead", sub: "The share sitting inside both figures above", mobile: oh(capMobile), onsite: oh(capOnsite) },
  ].filter((f) => f.mobile !== null || f.onsite !== null);

  const byLevel: Partial<Record<CrewLevel, number>> = {};
  const ridesAlong: Partial<Record<CrewLevel, boolean>> = {};
  for (const lv of levels) {
    if (!people.some((p) => p.level === lv)) continue;
    const c = levelCost(capMobile, lv);
    if (c != null) byLevel[lv] = c;
    ridesAlong[lv] = rides(lv);
  }

  return {
    crew,
    costPerHr: capMobile.totalBillHrs > 0 ? capMobile.costPerHr : null,
    costPerHrOnsite: capOnsite.totalBillHrs > 0 ? capOnsite.costPerHr : null,
    figures, byLevel, ridesAlong,
  };
}
