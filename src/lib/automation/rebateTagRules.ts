/**
 * The rule behind "Not On Alitsy" (Jake, 12 Nov: "if a job gets a rebate tag
 * it needs a Not On Alitsy as well"). Pure, so it can be checked without
 * ServiceTitan; rebateTag.ts does the reading and writing.
 *
 * "Not On Alitsy" says the rebate still has to be entered on Alitsy. The
 * office takes it off once it is, so it goes on each job once and never again:
 * a job is remembered from the first time it's seen with the Rebates tag. The
 * jobs that already had the Rebates tag when this started were Jake's call:
 * the open ones are tagged, the completed ones left alone.
 */

export const NOT_ON_ALITSY = "Not On Alitsy";

/** A Rebates tag by its name as tagKey spells it: "Rebates 💰" is "rebates". Any tag the office names that way counts. */
export const isRebateTag = (key: string) => /^rebates?\b/.test(key);

/** The mark that says a job has been dealt with, and the one that says the first run is done. */
export const rebateMark = (jobId: number) => `rebate:${jobId}`;
export const REBATE_STARTED = "rebate:started";

export type RebateJob = { id: number; status: string | null; tags: number[] };

/**
 * What to do with one job carrying a Rebates tag:
 *  - "seen": already dealt with, or Not On Alitsy is on it already; keep the
 *    mark fresh (the done list forgets marks after 120 days, and a forgotten
 *    one would put the tag back after the office took it off)
 *  - "leave": a completed job that had the tag before this started; marked, not tagged
 *  - "tag": put Not On Alitsy on
 *  - "skip": cancelled, nothing to enter
 */
export function rebateStep(j: RebateJob, notOn: number, marked: boolean, firstRun: boolean): "seen" | "leave" | "tag" | "skip" {
  if (marked) return "seen";
  if (j.status === "Canceled") return "skip";
  if (j.tags.includes(notOn)) return "seen";
  if (firstRun && j.status === "Completed") return "leave";
  return "tag";
}
