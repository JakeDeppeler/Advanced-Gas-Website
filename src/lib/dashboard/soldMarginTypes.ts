/**
 * The shapes and rules behind the sold-margin figure, with nothing server-side
 * in it, so a check script and a client component can both reach them.
 */

/**
 * Estimates imported before ServiceTitan went live carry no line costs at all,
 * so every one of them computes as 99.3% margin. 140 of them would drown any
 * window longer than a month. The import stamped this business unit on them.
 */
const GST = 1.1;

export const IMPORT_UNIT = "Imported Default Businessunit";

/** One estimate, as much of it as the margin needs. */
export type SoldRow = {
  subtotal: number | null;
  total: number | null;
  business_unit: string | null;
  raw: { name?: unknown; items?: unknown } | null;
};

/** Where the office records what a VEU rebate is worth per job. */
export const VEU_REBATE_KEY = "veu-rebate";

export type SoldMargin = {
  /** Jobs sold this month that carry costed lines. */
  jobs: number;
  soldExGst: number;
  cost: number;
  /** Null only when there is nothing to divide by. */
  marginPct: number | null;
  veuJobs: number;
  /** What the office says a rebate is worth, or null when nobody has said. */
  rebatePerJob: number | null;
  rebateIncome: number;
  /** Sold jobs with no costed lines: in the coverage, out of the margin. */
  uncosted: number;
  uncostedValue: number;
  coveragePct: number | null;
};

/**
 * Is this a VEU job?
 *
 * The estimate's name is the only signal there is. The business unit does not
 * carry it — three of six Real Estate installs were VEU and three were not —
 * and no tag or field marks them. So this matches the words the office puts in
 * the name, and the rebate it drives is a figure somebody sets rather than one
 * this guesses. A miss costs that job its rebate; it never invents one.
 */
export function isVeu(name: string | null | undefined): boolean {
  return /energy efficient|\bveu\b|rebate/i.test(String(name ?? ""));
}

/** Dollars per VEU job. Zero is "not set", not "the rebate is nothing". */
export function normaliseRebate(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number((v as { amount?: unknown })?.amount ?? NaN);
  if (!Number.isFinite(n) || n <= 0 || n > 20_000) return null;
  return Math.round(n);
}

/** Pure, so the arithmetic can be checked without a database. */
export function summariseSold(rows: SoldRow[], rebate: number | null): SoldMargin | null {
  let jobs = 0;
  let price = 0;
  let cost = 0;
  let veuJobs = 0;
  let uncosted = 0;
  let uncostedValue = 0;
  let allValue = 0;

  for (const r of rows) {
    if (r.business_unit === IMPORT_UNIT) continue;
    const p = r.subtotal != null ? Number(r.subtotal) : Number(r.total ?? 0) / GST;
    if (!(p > 0)) continue;
    allValue += p;

    const items = Array.isArray(r.raw?.items) ? (r.raw!.items as Array<Record<string, unknown>>) : [];
    const c = items.reduce((a, i) => a + Number(i.totalCost ?? 0), 0);
    // No costed lines is not a free job. Counted in the coverage, left out of
    // the margin, rather than booked at 100%.
    if (!(c > 0)) {
      uncosted++;
      uncostedValue += p;
      continue;
    }

    jobs++;
    price += p;
    cost += c;
    if (isVeu(typeof r.raw?.name === "string" ? r.raw.name : null)) veuJobs++;
  }

  if (jobs === 0) return null;

  /*
   * The rebate, where the office has told us what it is.
   *
   * A VEU job is sold at a reduced price because the rebate covers the rest, so
   * on the estimate alone it reads thin and sometimes below cost — which is the
   * accounting, not the selling. The rebate is real income and nothing in
   * ServiceTitan records it, so it is a figure the office sets; until it is set
   * it is not counted, and the board says so rather than quietly assuming one.
   */
  const rebateIncome = rebate != null ? rebate * veuJobs : 0;
  const withRebate = price + rebateIncome;

  return {
    jobs,
    soldExGst: price,
    cost,
    marginPct: withRebate > 0 ? ((withRebate - cost) / withRebate) * 100 : null,
    veuJobs,
    rebatePerJob: rebate,
    rebateIncome,
    uncosted,
    /** Of the month's sold value, the share this margin is computed over. */
    coveragePct: allValue > 0 ? (price / allValue) * 100 : null,
    uncostedValue,
  };
}
