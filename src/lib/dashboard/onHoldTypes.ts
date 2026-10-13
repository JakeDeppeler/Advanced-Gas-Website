/**
 * What a held job is, and which tags mean "held" — with nothing server-side in
 * it, so a check script and a client component can both reach the rules.
 *
 * Split out for the reason `dailyPaceTypes` is: the data module imports
 * `./db`, which imports `server-only`.
 */

/** Where the office says which tags mean a job is waiting on something. */
export const HOLD_TAGS_KEY = "board-hold-tags";

/**
 * Whose move it is.
 *
 * The one cut that changes what anybody does about a held job. "Awaiting Quote
 * Approval" is 44 jobs the office has already done its part on; "Materials Not
 * Ordered" is 16 somebody here has to go and action this afternoon. Counting
 * them together gives a total nobody can act on, which is how a tile ends up
 * being read past.
 */
export type HoldSide = "us" | "them";

/**
 * Tags the customer has to move on. Everything else blocking is ours.
 *
 * Matched on the office's own wording, because that wording is the only signal
 * ServiceTitan carries: a tag is a name and an id, with no field saying who is
 * waiting on whom.
 */
const THEIRS = /approval|voicemail|further instruction/i;

/**
 * Tags that mean the job is held.
 *
 * Half the 44 tags in use are not holds at all — "Potential Member" is on 63
 * open jobs and means somebody might buy a membership, "System Ordered",
 * "Materials Delivered", "Invoice Ready", "Cat 🐈‍⬛". So the default is the
 * office's own grammar of waiting: awaiting something, something required or
 * needed, something not ordered or not booked, a problem, a voicemail left.
 *
 * It is a default, not the rule: the portal's Held work page edits the list,
 * and `configured` on the result says which of the two the board is showing.
 * Under-claiming on purpose — "Rebates 💰" sits on 18 open jobs and may well
 * be a hold, but nothing in the name says so, and a tile that counts it is
 * asserting something nobody here has confirmed.
 */
const BLOCKING = /awaiting|required|needed|not ordered|not booked|problem|voicemail/i;

export const blocksByDefault = (name: string): boolean => BLOCKING.test(name);
export const sideByDefault = (name: string): HoldSide => (THEIRS.test(name) ? "them" : "us");

/**
 * The tag ids on a job, however PostgREST hands the array back.
 *
 * `raw->tagTypeIds` comes back as a JSON array, but the same column read
 * through `->>` anywhere else comes back as its text, and the difference
 * between the two is one character in a select string. Reading both costs a
 * line and the alternative is a page that silently finds nothing held.
 */
export function tagIds(v: unknown): number[] {
  const arr = Array.isArray(v)
    ? v
    : typeof v === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  // Number(null) and Number("") are both 0, which is finite and is not a tag.
  return arr
    .filter((x) => typeof x === "number" || (typeof x === "string" && x.trim() !== ""))
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
}

/** The stored setting: which tags block, split by whose move it is. */
export type HoldTags = { us: string[]; them: string[] };

export function normaliseHoldTags(v: unknown): HoldTags | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const list = (x: unknown) =>
    [...new Set((Array.isArray(x) ? x : []).map((s) => String(s).trim()).filter(Boolean))];
  const us = list(r.us);
  const them = list(r.them);
  // An empty saved list is a real choice ("nothing is a hold"), but an object
  // with neither key is a malformed row, and falling back to the defaults beats
  // blanking the page on it.
  if (!Array.isArray(r.us) && !Array.isArray(r.them)) return null;
  // A tag in both lists is ours: see `worstSide`.
  return { us, them: them.filter((t) => !us.includes(t)) };
}

/** Which tags block, and whose move each is — the setting or the defaults. */
export function holdRules(saved: HoldTags | null, known: string[]): { side: Map<string, HoldSide>; configured: boolean } {
  const side = new Map<string, HoldSide>();
  if (saved) {
    for (const t of saved.them) side.set(t, "them");
    for (const t of saved.us) side.set(t, "us");
    return { side, configured: true };
  }
  for (const t of known) if (blocksByDefault(t)) side.set(t, sideByDefault(t));
  return { side, configured: false };
}

/**
 * One job's side, from every blocking tag on it.
 *
 * Ours wins. A job tagged both "Awaiting Quote Approval" and "Materials Not
 * Ordered" has something we can do today, and filing it under "waiting on the
 * customer" would park it behind a phone call that isn't ours to make.
 */
export const worstSide = (sides: HoldSide[]): HoldSide => (sides.includes("us") ? "us" : "them");

/** One job that is waiting on something. */
export type HeldJob = {
  jobId: number;
  /** ServiceTitan's own job number, which is what the office searches on. */
  jobNumber: string | null;
  what: string;
  who: string | null;
  where: string | null;
  ageDays: number;
  /** The average of the job's quoted options, or null when it carries none. */
  value: number | null;
  reasons: string[];
  side: HoldSide;
  /** Already sold: the work is won and still sitting. */
  sold: boolean;
};

/** One thing being waited on, across every job carrying it. */
export type HoldReason = {
  name: string;
  side: HoldSide;
  jobs: number;
  /** Summed over the jobs that carry a value; see `unpriced`. */
  value: number;
  oldestDays: number;
};

export type OnHold = {
  /** Every held job, worst first. The board shows the top few. */
  jobs: HeldJob[];
  reasons: HoldReason[];
  jobsOnUs: number;
  jobsOnThem: number;
  valueOnUs: number;
  valueOnThem: number;
  /** Held jobs with nothing quoted on them, so the value is a floor not a total. */
  unpriced: number;
  /** True when the office has set the tag list; false when these are the defaults. */
  configured: boolean;
};

/**
 * Worst first: ours before theirs, then oldest.
 *
 * Age before value, deliberately. The page's question is what has been sitting
 * — a $15K quote written on Friday is not the problem, and sorting by money
 * would bury the 90-day job behind it.
 */
export function sortHeld(a: HeldJob, b: HeldJob): number {
  if (a.side !== b.side) return a.side === "us" ? -1 : 1;
  return b.ageDays - a.ageDays || (b.value ?? 0) - (a.value ?? 0);
}
