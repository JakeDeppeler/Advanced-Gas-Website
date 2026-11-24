/**
 * The shapes and the arithmetic behind the Daily pace page, with nothing server
 * -side in it.
 *
 * Split out for the reason `remoteTypes` is split from `remote`: the board's
 * data modules import `./db`, which imports `server-only`, and that cannot be
 * loaded from a check script or a client component. The arithmetic here is the
 * part most worth testing, so it lives where a test can reach it.
 */

/** The portal_settings key holding "how long this kind of job should take". */
export const STANDARD_HOURS_KEY = "job-type-hours";

export type StandardHours = Record<string, number>;

export function normaliseStandardHours(v: unknown): StandardHours {
  if (!v || typeof v !== "object") return {};
  const out: StandardHours = {};
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(raw);
    // A zero is "not set", not "should take no time": it would score every job
    // of that type as infinitely over.
    if (Number.isFinite(n) && n > 0 && n <= 24) out[k] = Math.round(n * 100) / 100;
  }
  return out;
}

/**
 * A span longer than this is a forgotten "done" tap, not a day's work. One
 * diagnostic on 13 November reads 24.8 hours — arrived at one in the afternoon,
 * tapped done the next morning — which put 30.7 hours on one tech's card and
 * scored him 60% behind for it.
 */
export const LONGEST_SPAN_HOURS = 12;

/** One job a tech was on today. */
export type PaceJob = {
  jobId: number;
  what: string;
  where: string | null;
  /**
   * Hours clocked: arrived to done, or arrived to now if they are still on it.
   *
   * Null when the stamps are not a measurement — over LONGEST_SPAN_HOURS apart.
   * The job stays on the list and still counts as done; it just carries no time
   * and is left out of the comparison, because a figure nobody recorded is
   * worse than an empty one.
   */
  taken: number | null;
  /**
   * What it was quoted to take, or null when nothing says — and on a job more
   * than one tech was on, **this tech's share of it**. See `crew`.
   */
  quoted: number | null;
  quotedFrom: "invoice" | "estimate" | "standard" | "typical" | null;
  done: boolean;
  /** Billed so far on this job, and whether anything has been. */
  billed: number;
  /** Still on site: arrived, not finished. */
  onNow: boolean;
  /**
   * How many techs were on this job today.
   *
   * Three men on one ducted install each used to be scored against the whole
   * seventeen hours it was sold for, so all three read "Ahead · 204%" off one
   * job the crew was in fact over on. The quoted time is the crew's allowance
   * for the job, so it is split between whoever was on it — but only where it
   * came from the invoice or the sold estimate. A job type's standard time is
   * the length of the slot, which is the same length whoever turns up.
   */
  crew: number;
};

export type TechDay = {
  tech: string;
  jobs: PaceJob[];
  /** Every hour clocked today, quoted job or not. */
  hoursTaken: number;
  /** Jobs whose stamps gave no usable span, so they carry no hours. */
  untimed: number;
  /** Quoted hours, and the hours taken **on those same jobs**. Null when none. */
  hoursQuoted: number | null;
  /**
   * Hours taken on the quoted jobs only.
   *
   * The dial divides these two, and they have to be over the same jobs or it is
   * not a comparison. Summing every hour against the quoted hours of some of
   * them is how you get "4.2h taken, 3h quoted, 1.2h over" for a tech whose
   * third job was never quoted at all — a wrong number, confidently coloured.
   */
  hoursTakenQuoted: number;
  /** Of the jobs with a quoted time: how many, out of how many today. */
  quotedCover: { with: number; of: number };
  jobsDone: number;
  jobsTotal: number;
  billedCount: number;
  billedValue: number;
  /** Finished, not yet billed. */
  toBillValue: number;
  toBillCount: number;
  /** What they are on right now, if anything. */
  onNow: PaceJob | null;
};

export type DailyPace = {
  /** Melbourne day this is about, as an ISO date. */
  day: string;
  techs: TechDay[];
  team: {
    hoursTaken: number;
    hoursQuoted: number | null;
    /** Hours taken on the quoted jobs only — the dial's other half. */
    hoursTakenQuoted: number;
    jobsDone: number;
    jobsTotal: number;
    billedCount: number;
    billableCount: number;
    billedValue: number;
    toBillValue: number;
    toBillCount: number;
    /** How many of today's jobs carry a quoted time at all, for the caveat line. */
    quotedCover: { with: number; of: number };
  };
};

/**
 * One tech's day, from their jobs. Pure, so the arithmetic can be tested
 * without a database — and it is the arithmetic that matters here: the quoted
 * hours and the hours taken have to be summed over the *same* jobs or the dial
 * is comparing one day against part of another.
 */
export function techDay(tech: string, list: PaceJob[]): TechDay {
  // Both halves over the same jobs, and only the ones that were measured: a job
  // with a quoted time and no usable clock cannot be on either side of it.
  const quoted = list.filter((x) => x.quoted != null && x.taken != null);
  const doneJobs = list.filter((x) => x.done);
  return {
    tech,
    jobs: list,
    hoursTaken: list.reduce((a, x) => a + (x.taken ?? 0), 0),
    untimed: list.filter((x) => x.taken == null).length,
    hoursQuoted: quoted.length ? quoted.reduce((a, x) => a + (x.quoted as number), 0) : null,
    hoursTakenQuoted: quoted.reduce((a, x) => a + (x.taken as number), 0),
    /*
     * Jobs that carry a quoted time at all — not the stricter set the dial is
     * built from. The two differ by a job that was quoted but not clocked, and
     * the page says "no quoted time" about this one: counting an unclocked job
     * here would have put that sentence on a job that was quoted perfectly well.
     */
    quotedCover: { with: list.filter((x) => x.quoted != null).length, of: list.length },
    jobsDone: doneJobs.length,
    jobsTotal: list.length,
    billedCount: doneJobs.filter((x) => x.billed > 0).length,
    billedValue: list.reduce((a, x) => a + x.billed, 0),
    toBillValue: 0, // a finished job with no invoice has no value to show yet
    toBillCount: doneJobs.filter((x) => x.billed <= 0).length,
    onNow: list.find((x) => x.onNow) ?? null,
  };
}

