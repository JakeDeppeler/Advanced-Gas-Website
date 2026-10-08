/**
 * The margin on the work the team sold this month.
 *
 * Not the same measure as the board's Job margin, and the difference matters
 * enough that the two must never be read as one number moving:
 *
 * - **Job margin** (Performance page) is what finished work actually made:
 *   invoice revenue less materials and the crew's hours at cost. It is the
 *   truth, and it arrives weeks late, because a job sold in October is often
 *   installed and billed in December.
 * - **Sold margin** (here) is what was sold *at the price it was sold for*:
 *   the estimate's own line items, price against cost, on the day it closed.
 *   It is available immediately and it is the number a salesperson can act on.
 *
 * Sold margin is therefore the *quoted* margin and does not know about labour
 * running over, a part costing more than the book said, or a callback. It will
 * read higher than Job margin and should.
 *
 * **Why it is computed from the estimate rather than the invoice.** The obvious
 * route — take the jobs sold this month and look up their invoices — covers 18%
 * of the month's sold value, because most sold work is not billed yet. Worse,
 * the 18% is not a random sample: it is the quick service jobs that sell and
 * bill the same day, which is why that route reported 54% against a business
 * running at 21%. Every ServiceTitan estimate line carries `totalCost`, so the
 * estimate knows its own margin the moment it is signed: 23 of 24 sold
 * estimates this month, 97% of the value.
 */

import { q, sbSelect } from "./db";
import { startOfMonthMelbourne } from "./dates";
import { getSettings } from "@/lib/portal/db";
import { VEU_REBATE_KEY, normaliseRebate, summariseSold, type SoldMargin, type SoldRow } from "./soldMarginTypes";

export * from "./soldMarginTypes";

export async function soldMargin(now: Date = new Date()): Promise<SoldMargin | null> {
  const from = startOfMonthMelbourne(now).toISOString();
  const [rows, rebateRaw] = await Promise.all([
    sbSelect<SoldRow>(
      "st_estimates",
      [q.select("id,status,sold_on,subtotal,total,business_unit,raw"), q.eq("status", "Sold"), q.gte("sold_on", from)].join("&"),
    ).catch(() => []),
    getSettings<unknown>(VEU_REBATE_KEY).catch(() => null),
  ]);

  const rebate = normaliseRebate(rebateRaw);
  return summariseSold(rows, rebate);
}
