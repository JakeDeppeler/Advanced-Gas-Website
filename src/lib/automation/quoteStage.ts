/**
 * Where a job's quote is up to, and the tag that says so in ServiceTitan:
 *
 *   visit done, nothing quoted yet ..... Quotation Required
 *   a quote out ........................ Awaiting Quote Approval
 *   sold, nothing booked ............... To Be Booked
 *   sold and booked, or invoiced ....... none of the three
 *
 * ServiceTitan's Draft tick isn't in its API: the estimate probe (#360) found
 * no draft or sent field on any endpoint, and none of our estimates carry one.
 * So "out" is the nearest thing the data shows: an open quote with a price on
 * it that hasn't been changed for a day. One still being written keeps
 * changing, or has no price yet. A draft left alone longer than that reads as
 * out; the office puts Quotation Required back, and it's left alone (see
 * quoteTag.ts) until the quote sells.
 *
 * Kept apart from the ServiceTitan calls so it can be checked without them.
 */

export type Stage = "toQuote" | "sent" | "toBook" | "done";
export type TaggedStage = Exclude<Stage, "done">;

export const STAGE_TAGS: Record<TaggedStage, string> = {
  toQuote: "Quotation Required",
  sent: "Awaiting Quote Approval",
  toBook: "To Be Booked",
};
const RANK: Record<Stage, number> = { toQuote: 1, sent: 2, toBook: 3, done: 4 };

const DAY = 86_400_000;
/** How long a priced quote sits unchanged before it counts as out. */
export const QUIET_MS = DAY;
/** A quote visit this long ago with nothing quoted has been let go; quoteToWrite stops at the same point. */
export const VISIT_DAYS = 30;
/** A quote older than this is off the Pipeline, and its job is left as it is. */
export const LIVE_DAYS = 60;

export type Est = { status: string | null; subtotal: number | null; createdOn: string | null; modifiedOn: string | null; soldOn: string | null };

export type Facts = {
  /** A Quotation, Site Assessment or Diagnostics job: a visit that leads to a quote. */
  quoteVisit: boolean;
  /** An Installation job. A quote on one is an extra on work already sold, not a sale waiting to be booked. */
  install: boolean;
  /** The job's own estimates, inactive ones left out. */
  ests: Est[];
  /** A quote on another job in its project, or for the customer since the visit. */
  quotedElsewhere: boolean;
  /** The latest visit that's started, cancelled ones aside. */
  lastVisit: string | null;
  /** A visit on the job still to come, cancelled ones aside. */
  future: boolean;
  /** A job, not cancelled, made from one of its quotes. */
  bookedFrom: boolean;
  invoiced: boolean;
};

const at = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

export function stageOf(f: Facts, now: number): Stage | null {
  const sold = f.ests.filter((e) => e.status === "Sold");
  if (sold.length) {
    if (f.bookedFrom || f.future || f.invoiced) return "done";
    if (f.install) return null;
    return now - Math.max(...sold.map((e) => at(e.soldOn))) <= LIVE_DAYS * DAY ? "toBook" : null;
  }
  // A visit still to come means the quote isn't settled yet, whatever's on the job.
  if (f.future || f.install) return null;
  const out = f.ests.filter((e) => e.status === "Open" && Number(e.subtotal) > 0 && at(e.modifiedOn) > 0 && now - at(e.modifiedOn) >= QUIET_MS);
  if (out.length) return now - Math.max(...out.map((e) => at(e.createdOn))) <= LIVE_DAYS * DAY ? "sent" : null;
  // Quoted and lost, or quoted on another job: there's nothing to write.
  if (f.ests.some((e) => e.status === "Dismissed") || f.quotedElsewhere) return null;
  if (!f.quoteVisit || !f.lastVisit || now - at(f.lastVisit) > VISIT_DAYS * DAY) return null;
  return "toQuote";
}

export type TagPlan =
  | { tags: number[]; add: number | null; drop: number[] }
  /** Only stage tags on the job, all to come off: ServiceTitan won't take a job's last tag off (below). */
  | { stuck: number[] };

/**
 * The job's tags with its stage's in place of the other two. Null: leave it
 * as it is.
 *
 * Never backwards: a job at Awaiting Quote Approval isn't put back to
 * Quotation Required because another option is being written, and To Be
 * Booked stays when a sold quote is unsold to change it.
 *
 * Never to an empty list. ServiceTitan answers OK to one and changes nothing,
 * which is why taking Awaiting Quote Approval off a job that had no other tag
 * failed every day. Swapping one tag for the next always leaves one on.
 */
export function planTags(cur: number[], stage: Stage, ids: Partial<Record<TaggedStage, number>>): TagPlan | null {
  const stageOfId = new Map<number, TaggedStage>();
  for (const s of Object.keys(STAGE_TAGS) as TaggedStage[]) if (ids[s] != null) stageOfId.set(ids[s] as number, s);
  const on = cur.filter((x) => stageOfId.has(x));
  if (on.some((x) => RANK[stageOfId.get(x) as TaggedStage] > RANK[stage])) return null;
  const want = stage === "done" ? null : ids[stage] ?? null;
  // That tag isn't in ServiceTitan, or has been renamed: nothing to swap to.
  if (stage !== "done" && want == null) return null;
  const drop = on.filter((x) => x !== want);
  const add = want != null && !cur.includes(want) ? want : null;
  if (!drop.length && add == null) return null;
  const tags = [...cur.filter((x) => !drop.includes(x)), ...(add != null ? [add] : [])];
  return tags.length ? { tags, add, drop } : { stuck: drop };
}
