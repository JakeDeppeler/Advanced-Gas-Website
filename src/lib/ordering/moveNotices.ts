import "server-only";
import { loadAlreadyOrdered, loadSuppliers, loadWeekInputs } from "./db";
import { isoAddDays, nextWeek, planWeek, thisWeek, type Problem } from "./plan";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

export type Move = NonNullable<Problem["moved"]> & { job_number: string | null; customer_name: string | null };

/**
 * Jobs that moved after their order went, from the same plan To order works
 * from: this week, next week and the one after. Only moves to a day still to
 * come; a job pulled into the past is something else.
 */
export async function findMoves(now = new Date()): Promise<Move[]> {
  const today = isoDateMelbourne(now);
  const [suppliers, already] = await Promise.all([loadSuppliers(), loadAlreadyOrdered()]);
  const tw = thisWeek(now), nw = nextWeek(now);
  const weeks = [tw, nw, { start: isoAddDays(nw.start, 7), end: isoAddDays(nw.end, 7) }];
  const out = new Map<string, Move>();
  for (const week of weeks) {
    const inputs = await loadWeekInputs(week);
    for (const p of planWeek({ week, ...inputs, suppliers, alreadyOrdered: already }).problems) {
      if (!p.moved || p.moved.to < today) continue;
      out.set(`${p.moved.po_number}|${p.moved.job_id}|${p.moved.to}`, { ...p.moved, job_number: p.job_number, customer_name: p.customer_name });
    }
  }
  return [...out.values()];
}
