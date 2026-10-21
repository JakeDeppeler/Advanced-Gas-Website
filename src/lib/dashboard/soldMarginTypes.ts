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

/**
 * A rebate line: REBATE-VEEC, REBATE-STC, REBATE-SOLARVIC and the like. They
 * are set up in ServiceTitan as materials with a negative cost, the customer
 * charged less and the certificate trader paying us, so added in with the gear
 * they read as gear we never bought: $49k of October's $122k. They're kept
 * apart here, the gear at its full cost and the rebate as money coming in. A
 * cost below zero counts too, since no real unit or fitting has one. The
 * database's st_rebate_back (migration 0082) is the same rule for invoices.
 */
type Line = { totalCost?: unknown; skuName?: unknown; sku?: { name?: unknown } | null };
export function isRebateLine(i: Line): boolean {
  const name = String(i.skuName ?? i.sku?.name ?? "");
  return /^rebate/i.test(name) || Number(i.totalCost ?? 0) < 0;
}

/** An estimate's lines: what they cost us, rebates left out, and what the rebates bring back. */
export function splitCost(items: Line[]): { cost: number; rebate: number } {
  let cost = 0, rebate = 0;
  for (const i of items) {
    const c = Number(i.totalCost ?? 0);
    if (!Number.isFinite(c)) continue;
    if (isRebateLine(i)) rebate -= c;
    else cost += c;
  }
  return { cost, rebate };
}

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
  /** From the estimates' rebate lines, and the office's figure for VEU jobs that have none. */
  rebateIncome: number;
  /** VEU jobs with no rebate line and no figure set: their rebate isn't in the margin. */
  veuUncounted: number;
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
  let veuUncounted = 0;
  let rebateIncome = 0;
  let uncosted = 0;
  let uncostedValue = 0;
  let allValue = 0;

  for (const r of rows) {
    if (r.business_unit === IMPORT_UNIT) continue;
    const p = r.subtotal != null ? Number(r.subtotal) : Number(r.total ?? 0) / GST;
    if (!(p > 0)) continue;
    allValue += p;

    const items = Array.isArray(r.raw?.items) ? (r.raw!.items as Array<Record<string, unknown>>) : [];
    const { cost: c, rebate: back } = splitCost(items);
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
    const veu = isVeu(typeof r.raw?.name === "string" ? r.raw.name : null);
    if (veu || back > 0) veuJobs++;
    // The estimate's own rebate lines where it has them; the office's figure
    // only for a VEU job without, so a rebate is never counted twice.
    if (back > 0) rebateIncome += back;
    else if (veu) {
      if (rebate != null) rebateIncome += rebate;
      else veuUncounted++;
    }
  }

  if (jobs === 0) return null;

  /*
   * The rebate is income. A VEU job is sold at a reduced price because the
   * rebate covers the rest, so on its price alone it reads thin and sometimes
   * below cost. Most estimates carry the rebate as lines now; where one
   * doesn't, the office's figure stands in, and until that's set the job's
   * rebate isn't counted and the board says so.
   */
  const withRebate = price + rebateIncome;

  return {
    jobs,
    soldExGst: price,
    cost,
    marginPct: withRebate > 0 ? ((withRebate - cost) / withRebate) * 100 : null,
    veuJobs,
    rebatePerJob: rebate,
    rebateIncome,
    veuUncounted,
    uncosted,
    /** Of the month's sold value, the share this margin is computed over. */
    coveragePct: allValue > 0 ? (price / allValue) * 100 : null,
    uncostedValue,
  };
}
