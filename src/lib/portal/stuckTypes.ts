/**
 * Where the money is stuck: the buckets and the rules, with nothing
 * server-side in them so they can be checked without a database.
 *
 * Three places money stops between finishing a job and banking it, and the
 * page is built to be read in that order, because that is the order the money
 * moves in:
 *
 *   1. **Done, not billed** — the work is finished and nothing has been put on
 *      the invoice. Nobody is chasing it because nobody has asked yet.
 *   2. **Billed, not paid** — the invoice is out and the money hasn't come.
 *   3. **On hold** — the job itself has stopped, so neither of the above has
 *      started.
 *
 * Every band is cut the same way, by how long it has been sitting, so the one
 * question the page answers — is this getting worse — is asked the same way
 * three times.
 */

/** The age bands, in days. Shared by all three so the page reads consistently. */
export const AGE_BANDS = [
  { key: "d0_7", label: "This week", upTo: 7 },
  { key: "d8_14", label: "8–14 days", upTo: 14 },
  { key: "d15_30", label: "15–30 days", upTo: 30 },
  { key: "d31_60", label: "31–60 days", upTo: 60 },
  { key: "d60plus", label: "Over 60 days", upTo: Infinity },
] as const;

export type AgeKey = (typeof AGE_BANDS)[number]["key"];

/** Which band an age in days falls in. Negative ages (not due yet) band as 0. */
export function bandOf(days: number): AgeKey {
  const n = Math.max(0, Math.round(days));
  return (AGE_BANDS.find((b) => n <= b.upTo) ?? AGE_BANDS[AGE_BANDS.length - 1]).key;
}

export type Band = { count: number; value: number };
export type Banded = Record<AgeKey, Band>;

export const emptyBanded = (): Banded =>
  Object.fromEntries(AGE_BANDS.map((b) => [b.key, { count: 0, value: 0 }])) as Banded;

export function addTo(b: Banded, days: number, value = 0): void {
  const slot = b[bandOf(days)];
  slot.count += 1;
  slot.value += value;
}

export const totalOf = (b: Banded): Band =>
  Object.values(b).reduce((t, x) => ({ count: t.count + x.count, value: t.value + x.value }), { count: 0, value: 0 });

/** What is past 30 days, which is the part of any band that is a problem. */
export const oldOf = (b: Banded): Band => ({
  count: b.d31_60.count + b.d60plus.count,
  value: b.d31_60.value + b.d60plus.value,
});

/**
 * Is a completed job one we have failed to bill?
 *
 * Three things are deliberately not counted, because counting them would put a
 * number on the wall that is wrong in the office's favour *and* against it:
 *
 *   - **A quote visit.** All nineteen quote visits in the last six months
 *     invoice at $0 and that is correct — you don't bill somebody for coming to
 *     price the job.
 *   - **A no-charge job.** ServiceTitan carries the flag; eight jobs have it.
 *     A warranty callback is finished work nobody owes for.
 *   - **A job with no type at all.** 126 of them, every one over thirty days
 *     old, which is the shape of the import rather than of a billing problem.
 *     They are counted and named on their own so they are not quietly dropped
 *     either.
 *
 * What is left — service and install work, finished, with nothing on the
 * invoice — is the real backlog: 57 jobs, 20 of them over a month old.
 */
export type JobClass = "service" | "install" | "quote" | "unknown";

export function classOf(jobType: string | null | undefined): JobClass {
  const t = (jobType ?? "").trim();
  if (!t) return "unknown";
  if (/^(quotation|site assessment)/i.test(t)) return "quote";
  if (/^install/i.test(t)) return "install";
  return "service";
}

/** Only service and install work can be "not billed yet". */
export const billable = (cls: JobClass) => cls === "service" || cls === "install";

export type StuckJob = {
  jobId: number;
  jobNumber: string | null;
  what: string;
  who: string | null;
  where: string | null;
  days: number;
};

export type StuckView = {
  /** Finished, nothing on the invoice. No value: none of them carry one. */
  unbilled: { bands: Banded; oldest: StuckJob[]; unknownType: number; noCharge: number; quoteVisits: number };
  /** Invoiced, not paid, banded by how long past due. */
  owed: { bands: Banded; notDueYet: Band; oldest: Array<StuckJob & { amount: number }> };
  /** Open work waiting on something. Mirrors the wall board's On hold page. */
  held: { jobs: number; onUs: number; onThem: number; reasons: Array<{ name: string; jobs: number; oldestDays: number }> } | null;
  /** How far back the unbilled scan looked. */
  sinceDays: number;
};
