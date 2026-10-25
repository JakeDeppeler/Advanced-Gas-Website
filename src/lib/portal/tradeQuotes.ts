import "server-only";
import { loadPipeline } from "@/lib/pipeline/store";
import type { PipeQuote } from "@/lib/pipeline/types";
import { sameSeller } from "@/lib/portal/tradeHome";

/**
 * The quotes a tech wrote, or has been put on to chase, that are still
 * waiting on a yes: the Pipeline's own open quotes, so a call logged here is
 * the same call the office sees there and the Follow up card moves with it.
 */
export async function myPipeQuotes(name: string): Promise<PipeQuote[]> {
  const p = await loadPipeline({ detail: true });
  const rank: Record<string, number> = { due: 0, new: 1, waiting: 2 };
  return p.quotes
    .filter((x) => (x.stage === "due" || x.stage === "new" || x.stage === "waiting") && ((x.quotedBy && sameSeller(name, x.quotedBy)) || (x.owner && sameSeller(name, x.owner))))
    .sort((a, b) => (rank[a.stage] ?? 3) - (rank[b.stage] ?? 3) || b.quietDays - a.quietDays);
}
