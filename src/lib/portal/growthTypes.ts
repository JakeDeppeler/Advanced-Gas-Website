/**
 * The numbers behind growing the business — what a new van costs to put on
 * the road, and what the materials and units the crew install make on top of
 * the hour. Set on Finance → Our numbers, read by Planning; pure, so the
 * planner in the browser and the page on the server agree.
 *
 * Kept under their own settings key rather than inside the costing settings:
 * Costs & capacity saves its whole settings object at once, and a screen
 * holding an older copy of it would quietly put these back.
 */

export type NewVan = {
  /** The van itself, drive-away. */
  price: number;
  /** Shelving, racking, signage. */
  fitout: number;
  /** Tools and the stock it carries on day one. */
  toolsStock: number;
  /** Cash down when it's financed. */
  deposit: number;
  /** Finance repayment a month. */
  monthly: number;
  /** Months the finance runs. */
  termMonths: number;
  /** What it fetches at the end of its life, for depreciation. */
  resale: number;
  lifeYears: number;
};

export type Markup = {
  /** Markup on materials, as a percentage on top of what they cost us. */
  materialsPct: number;
  /** Markup on units (the systems themselves), the same way. */
  unitsPct: number;
  /** Materials one van buys in a year, at cost. */
  materialsPerVan: number;
  /** Units one van installs in a year, at cost. */
  unitsPerVan: number;
};

export type Growth = { newVan: NewVan; markup: Markup; savedAt?: string | null };

export const EMPTY_GROWTH: Growth = {
  newVan: { price: 0, fitout: 0, toolsStock: 0, deposit: 0, monthly: 0, termMonths: 60, resale: 0, lifeYears: 5 },
  markup: { materialsPct: 0, unitsPct: 0, materialsPerVan: 0, unitsPerVan: 0 },
};

const num = (v: unknown, max = 10_000_000) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

/** Whatever was stored, made safe: every field a non-negative number. */
export function normaliseGrowth(raw: unknown): Growth {
  const r = (raw ?? {}) as { newVan?: Partial<NewVan>; markup?: Partial<Markup>; savedAt?: unknown };
  const v = r.newVan ?? {};
  const m = r.markup ?? {};
  return {
    newVan: {
      price: num(v.price), fitout: num(v.fitout), toolsStock: num(v.toolsStock), deposit: num(v.deposit),
      monthly: num(v.monthly), termMonths: num(v.termMonths, 120) || 60, resale: num(v.resale), lifeYears: num(v.lifeYears, 30) || 5,
    },
    markup: {
      materialsPct: num(m.materialsPct, 1000), unitsPct: num(m.unitsPct, 1000),
      materialsPerVan: num(m.materialsPerVan), unitsPerVan: num(m.unitsPerVan),
    },
    savedAt: typeof r.savedAt === "string" ? r.savedAt : null,
  };
}

/** What a new van loses in value a year. */
export const newVanDep = (v: NewVan) => (v.lifeYears > 0 ? Math.max(0, v.price + v.fitout - v.resale) / v.lifeYears : 0);

/** Cash out the door before the van does a job. */
export const newVanUpfront = (v: NewVan) => v.deposit + v.fitout + v.toolsStock;

/** What the markup makes a year on one van's materials and units, before anything is sold short. */
export const markupPerVan = (m: Markup) => (m.materialsPerVan * m.materialsPct) / 100 + (m.unitsPerVan * m.unitsPct) / 100;

export const growthSet = (g: Growth) => ({
  van: g.newVan.price > 0,
  markup: (g.markup.materialsPct > 0 && g.markup.materialsPerVan > 0) || (g.markup.unitsPct > 0 && g.markup.unitsPerVan > 0),
});
