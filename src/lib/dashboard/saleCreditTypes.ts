/**
 * Moving a job's credit from one person to another, and the record of who
 * moved it.
 *
 * ServiceTitan stamps `createdBy` on an estimate and `soldBy` once it closes,
 * and the board credits the first — see `creditFor` in metrics.ts. That is
 * right nearly always and wrong sometimes: one person prices a job, another
 * goes back and closes it, and the office decides the sale belongs to the
 * second. Nothing in ServiceTitan records that decision, and anything written
 * back into the estimate would be overwritten by the next sync, so it is kept
 * here and applied on the way out.
 *
 * **It moves the whole job, not just the sale.** The board's unit of credit is
 * a job's worth of quoting — the leaderboard, the per-person close rate and the
 * sold total are all keyed the same way. Moving the sale and leaving the quote
 * behind would give one person a sale against no quote and the other a quote
 * that never closed, and the Team page's "sold out of quoted" would read as
 * nonsense for both of them.
 *
 * Nothing server-side in here, so the rule can be checked without a database.
 */

/** Where the office records the moves. One settings row, keyed by job. */
export const SALE_CREDIT_KEY = "sale-credit";

/** One move. `from` is who held it when the move was made, for the audit line. */
export type CreditMove = {
  to: string;
  from: string | null;
  /** The portal user who made the move. */
  by: string | null;
  at: string | null;
};

/** Keyed by the board's own job identity — `quoteKey`, so `j301090477`. */
export type SaleCredits = Record<string, CreditMove>;

const str = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};

export function normaliseSaleCredits(v: unknown): SaleCredits {
  if (!v || typeof v !== "object") return {};
  const out: SaleCredits = {};
  for (const [key, raw] of Object.entries(v as Record<string, unknown>)) {
    const k = String(key).trim();
    const r = (raw ?? {}) as Record<string, unknown>;
    const to = str(r.to);
    // A move with nobody to move it to is not a move. Dropping it beats
    // crediting a job to the empty string, which would show as a blank row on
    // the leaderboard that nobody could account for.
    if (!k || !to) continue;
    out[k] = { to, from: str(r.from), by: str(r.by), at: str(r.at) };
  }
  return out;
}

/**
 * The board's `creditFor`, with the office's moves applied.
 *
 * Takes the rule rather than replacing it: the fallback is still "whoever wrote
 * the quote, else whoever closed it", and a job with no move behaves exactly as
 * it did before this existed.
 */
export function creditWith(
  moves: SaleCredits,
  keyOf: (r: { id: number; job_id: number | null; customer_id?: number | null; created_on?: string | null }) => string,
) {
  return <T extends { id: number; job_id: number | null; customer_id?: number | null; created_on?: string | null; created_by: string | null; sold_by: string | null }>(
    r: T,
  ): string | null => moves[keyOf(r)]?.to ?? r.created_by ?? r.sold_by;
}
