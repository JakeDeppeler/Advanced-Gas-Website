import "server-only";
import { loadPipeline } from "@/lib/pipeline/store";
import { xeroProfit } from "@/lib/portal/office";
import { owedInvoices } from "@/lib/portal/run/money";
import { getOwedBills } from "@/lib/portal/xero";

/**
 * Fill the portal's shared caches after a ServiceTitan pull, so the next
 * person to open a page reads them rather than waiting on them: the pipeline
 * (every office page counts from it) and the Xero reports Overview and
 * Accounts open with. The board's refresh calls this every couple of minutes
 * through the working day; each Xero report is kept five minutes, so at most
 * one call a report in that time reaches Xero, the same as one page view.
 * Capped, so a slow Xero never holds the board's refresh.
 */
export async function warmPortal(): Promise<void> {
  const work = Promise.allSettled([
    loadPipeline({ detail: false }),
    loadPipeline({ detail: true }),
    xeroProfit(),
    owedInvoices(),
    getOwedBills(),
  ]);
  await Promise.race([work, new Promise((r) => setTimeout(r, 20_000))]);
}
