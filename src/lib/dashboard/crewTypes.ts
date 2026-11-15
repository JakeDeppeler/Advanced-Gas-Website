/**
 * The Crew page's shapes and arithmetic, with nothing server-side in it.
 *
 * Split out for the reason `dailyPaceTypes` is split from `dailyPace`: the
 * board's data modules import `./db`, which imports `server-only`, and that
 * cannot be loaded from a check script or a client component. The arithmetic
 * here is the part worth testing, so it lives where a test can reach it.
 *
 * Jake asked (15 Nov) for "an overview of each main tech so we can see how many
 * installs, repairs, break down and maintenance, how on time they are, if they
 * got the job done within the time frame, if they were late, and other KPI we
 * can use to see who is standing out vs who is not".
 *
 * Four of those five are here. **Lateness to a job is not, and cannot be yet** —
 * see the note in DASHBOARD.md: 576 of 715 arrival stamps in the last sixty
 * days are defaults (the scheduled start to the second, or the dispatch
 * moment), so a late count would be a measurement of who happened to tap the
 * app. What is here instead is how much of each person's work carries a real
 * stamp at all, which is the thing that has to change first and the only honest
 * figure the data supports.
 */

/** The four kinds of work, and everything that is none of them. */
export type CrewSector = "maintenance" | "breakdown" | "repair" | "install" | "other";

export const CREW_SECTORS: CrewSector[] = ["maintenance", "breakdown", "repair", "install", "other"];

/** How far back the page looks. The same window as the Areas page. */
export const CREW_DAYS = 60;

/**
 * A visit whose arrive-and-done stamps are less than this apart was not
 * measured: the tech tapped both at once, or ServiceTitan filled them in
 * together when the job was closed in the office. 158 of 715 rows in the last
 * sixty days are under a minute. They still count as a job attended — dispatch
 * is not in doubt — but they contribute no time.
 */
export const MIN_SPAN_HOURS = 0.25;

/** Over this and somebody forgot to tap done, so the span is not a measurement either. */
export const LONGEST_SPAN_HOURS = 12;

/** A job within a quarter hour of its sold time came in on it. The trade's own rounding. */
export const GRACE_HOURS = 0.25;

/** The fewest judged jobs that earns a rate. Below it the card says how many it has. */
export const MIN_TIMED = 8;

/**
 * How long a finished job is given to be invoiced before its hours count as
 * never-to-be-billed. The office bills in batches; a job closed on Friday and
 * typed up on Monday is not lost time.
 */
export const BILL_SETTLE_DAYS = 7;

/** A drive longer than this is a tech who forgot to tap arrive, not a trip. */
export const LONGEST_DRIVE_HOURS = 3;

/** What makes somebody a tech on the tools rather than a name on a job. */
export const MIN_HOURS = 20;
export const MIN_JOBS = 10;

/**
 * One job one tech was on, reduced to what the scorecard needs.
 *
 * `elapsed` and `sold` are the job's, not the tech's, and that is deliberate.
 * Sold labour hours do not scale with the crew: a service call is sold at an
 * hour and an install at three whether one man goes or two, so a tech's own
 * clocked hours against the job's sold hours reads every two-man install as
 * twice over. Measured over the last sixty days, man-hours against sold hours
 * puts the median two-man install at 2.0× its sold time and the median two-man
 * service at 1.8×, while the time on site — first arrival to last done — puts
 * them at 1.11× and 1.00×. The second pair is the comparison the sold hours
 * were written for. So the *job* is judged in or over its time, and every tech
 * who was on it carries that verdict.
 */
export type CrewVisit = {
  jobId: number;
  sector: CrewSector;
  /** This tech's own hours on it, or null when the stamps gave no real span. */
  hours: number | null;
  /** First arrival to last done over everyone on the job, or null when unmeasured. */
  elapsed: number | null;
  /** Labour hours sold on the job's invoice, or null when none were. */
  sold: number | null;
  /** The job's price before GST, and this tech's share of the crew's hours on it. */
  billed: number;
  share: number;
  /**
   * Hours that will never be billed: a quote visit, or a job finished over a
   * week ago with nothing on it. A job finished yesterday and not yet invoiced
   * is neither — it is waiting, and calling it non-billable would read as lost
   * time on the day the office is still typing it up.
   */
  nonBillable: boolean;
  /** A quote or site assessment: non-billable by design, which is not the same as wasted. */
  quoteVisit: boolean;
  /** A maintenance or breakdown visit: the two kinds that can turn into work. */
  canFind: boolean;
  /** A quote was written on the visit's own job. */
  quoted: boolean;
  /** An install was booked at the same address inside the follow-on window. */
  ledInstall: boolean;
  /**
   * Dispatch to arrival, over the trips that recorded it, and how many trips
   * this job took in all. 289 of 715 trips in the last sixty days have arrival
   * stamped at the dispatch moment to the second, which is a default and not a
   * drive of no minutes — so those are counted in `of` and not in `hours`, and
   * the board shows the average over what was recorded rather than a total that
   * would be short by two trips in five.
   */
  drive: { hours: number; trips: number; of: number };
};

export type TechKpi = {
  tech: string;
  /** Jobs attended in the window, each counted once however many visits it took. */
  jobs: number;
  mix: Record<CrewSector, number>;
  /** Hours clocked on the jobs whose stamps gave a real span. */
  hours: number;
  /** Of those, the hours that will never be billed, and the quote visits inside that. */
  nonBillableHours: number;
  quoteHours: number;
  /** nonBillableHours ÷ hours. Null without an hour on the clock. */
  nonBillableShare: number | null;
  /** Drive time: the hours recorded, the trips that recorded one, and all the trips. */
  drive: { hours: number; trips: number; of: number; avgMins: number | null };
  /** How many of their jobs were timed at all, out of how many they were on. */
  timed: { with: number; of: number };
  /** Jobs with both a measured time on site and a sold time, and how many came in within it. */
  inTime: { of: number; within: number };
  /** within ÷ of. Null below MIN_TIMED judged jobs. */
  inTimeRate: number | null;
  /** Sold hours over time on site across those jobs. Above 1 is inside the time. */
  timeIndex: number | null;
  /** Their share of what those jobs billed, before GST. */
  billed: number;
  /** Billed over hours clocked. Null without an hour on the clock. */
  perHour: number | null;
  /** Of the maintenance and breakdown visits they did: quotes written, installs that followed. */
  found: { visits: number; quoted: number; install: number };
};

export type Crew = {
  from: string;
  to: string;
  days: number;
  /** How long after a visit an install at the address is still credited to it. */
  followDays: number;
  /** The techs with real time on the tools, most jobs first. */
  techs: TechKpi[];
  /** Names left off for want of hours or jobs, so the page can say so rather than hide it. */
  omitted: string[];
  team: {
    jobs: number;
    hours: number;
    mix: Record<CrewSector, number>;
    inTime: { of: number; within: number };
    inTimeRate: number | null;
    billed: number;
    perHour: number | null;
    timed: { with: number; of: number };
    nonBillableHours: number;
    quoteHours: number;
    nonBillableShare: number | null;
    drive: { hours: number; trips: number; of: number; avgMins: number | null };
    found: { visits: number; quoted: number; install: number };
  };
};

const noMix = (): Record<CrewSector, number> =>
  ({ maintenance: 0, breakdown: 0, repair: 0, install: 0, other: 0 });

/**
 * One tech's sixty days, from their visits. Pure, so the arithmetic can be
 * tested without a database — and it is the arithmetic that matters: which jobs
 * are allowed into each denominator is the whole difference between a figure
 * and an accusation.
 */
export function techKpi(tech: string, visits: CrewVisit[]): TechKpi {
  const mix = noMix();
  for (const v of visits) mix[v.sector] += 1;

  const timed = visits.filter((v) => v.hours != null);
  // Judged only where both halves were measured: a sold time with no clock on
  // it, or a clock with nothing sold, is not a comparison.
  const judged = visits.filter((v) => v.elapsed != null && v.sold != null && v.sold > 0);
  const within = judged.filter((v) => (v.elapsed as number) <= (v.sold as number) + GRACE_HOURS).length;
  const soldSum = judged.reduce((a, v) => a + (v.sold as number), 0);
  const onSite = judged.reduce((a, v) => a + (v.elapsed as number), 0);
  const hours = timed.reduce((a, v) => a + (v.hours as number), 0);
  const find = visits.filter((v) => v.canFind);
  const billed = visits.reduce((a, v) => a + v.billed * v.share, 0);
  const driveHours = visits.reduce((a, v) => a + v.drive.hours, 0);
  const trips = visits.reduce((a, v) => a + v.drive.trips, 0);

  return {
    tech,
    jobs: visits.length,
    mix,
    hours,
    nonBillableHours: timed.filter((v) => v.nonBillable).reduce((a, v) => a + (v.hours as number), 0),
    quoteHours: timed.filter((v) => v.quoteVisit).reduce((a, v) => a + (v.hours as number), 0),
    nonBillableShare:
      hours >= 1
        ? timed.filter((v) => v.nonBillable).reduce((a, v) => a + (v.hours as number), 0) / hours
        : null,
    drive: {
      hours: driveHours,
      trips,
      of: visits.reduce((a, v) => a + v.drive.of, 0),
      // The average over the trips that recorded one. The total is short by
      // whatever was never stamped, so the average is the figure that leads.
      avgMins: trips > 0 ? (driveHours / trips) * 60 : null,
    },
    timed: { with: timed.length, of: visits.length },
    inTime: { of: judged.length, within },
    inTimeRate: judged.length >= MIN_TIMED ? within / judged.length : null,
    timeIndex: judged.length >= MIN_TIMED && onSite > 0 ? soldSum / onSite : null,
    billed,
    // An hour is the floor: $403 an hour off twelve minutes on the clock is the
    // clock being wrong, not the hour being good.
    perHour: hours >= 1 ? billed / hours : null,
    found: {
      visits: find.length,
      quoted: find.filter((v) => v.quoted).length,
      install: find.filter((v) => v.ledInstall).length,
    },
  };
}

/** Somebody who was actually on the tools in the window. */
export const isMainTech = (t: TechKpi): boolean => t.hours >= MIN_HOURS && t.jobs >= MIN_JOBS;

/** The team's line, over the techs the page shows. */
export function crewTeam(techs: TechKpi[]): Crew["team"] {
  const mix = noMix();
  for (const t of techs) for (const k of CREW_SECTORS) mix[k] += t.mix[k];
  const sum = (f: (t: TechKpi) => number) => techs.reduce((a, t) => a + f(t), 0);
  const of = sum((t) => t.inTime.of);
  const within = sum((t) => t.inTime.within);
  const hours = sum((t) => t.hours);
  const billed = sum((t) => t.billed);
  const nonBillableHours = sum((t) => t.nonBillableHours);
  const driveHours = sum((t) => t.drive.hours);
  const trips = sum((t) => t.drive.trips);
  return {
    jobs: sum((t) => t.jobs),
    hours,
    mix,
    inTime: { of, within },
    inTimeRate: of >= MIN_TIMED ? within / of : null,
    billed,
    perHour: hours >= 1 ? billed / hours : null,
    timed: { with: sum((t) => t.timed.with), of: sum((t) => t.timed.of) },
    nonBillableHours,
    quoteHours: sum((t) => t.quoteHours),
    nonBillableShare: hours >= 1 ? nonBillableHours / hours : null,
    drive: {
      hours: driveHours,
      trips,
      of: sum((t) => t.drive.of),
      avgMins: trips > 0 ? (driveHours / trips) * 60 : null,
    },
    found: {
      visits: sum((t) => t.found.visits),
      quoted: sum((t) => t.found.quoted),
      install: sum((t) => t.found.install),
    },
  };
}
