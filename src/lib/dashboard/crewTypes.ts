/**
 * The Crew page's shapes and arithmetic, with nothing server-side in it.
 *
 * Split out for the reason `dailyPaceTypes` is split from `dailyPace`: the
 * board's data modules import `./db`, which imports `server-only`, and that
 * cannot be loaded from a check script or a client component. The arithmetic
 * here is the part worth testing, so it lives where a test can reach it.
 *
 * Jake asked (15 Nov) for an overview of each main tech: the mix of installs,
 * repairs, breakdowns and maintenance, time on the tools, non-billable time,
 * drive time, whether the job came in inside the time sold, and "other KPI we
 * can use to see who is standing out vs who is not".
 *
 * **Lateness to a job is not here, and cannot be yet** — see DASHBOARD.md: 576
 * of 715 arrival stamps in sixty days are defaults, so a late count would
 * measure who taps the app. What is here instead is how much of each person's
 * work carries a real stamp at all, which is the thing that has to change
 * first and the only honest figure the data supports.
 */

/** The four kinds of work, and everything that is none of them. */
export type CrewSector = "maintenance" | "breakdown" | "repair" | "install" | "other";

export const CREW_SECTORS: CrewSector[] = ["maintenance", "breakdown", "repair", "install", "other"];

/** How far back the year page looks. ServiceTitan's own records start well inside it. */
export const CREW_DAYS = 365;

/**
 * Who the page is about: the techs with their own van (Jake, 15 Nov).
 *
 * Everyone else rides with one of them, so their hours are already inside a
 * van's day and a row of their own would count the same work twice. The list
 * is here rather than worked out from the data because nothing in ServiceTitan
 * says who drives; `portal_settings` under VAN_TECHS_KEY overrides it, so it
 * can be changed without a deploy.
 */
export const VAN_TECHS = [
  "Dean Winbanks",
  "Jackson Lane",
  "Chaz Stephens",
  "Jye Stephens",
  "Paddy Fairclough",
];
export const VAN_TECHS_KEY = "crew-vans";

export const normaliseVans = (v: unknown): string[] => {
  const list = Array.isArray(v) ? v : [];
  const out = list.map((n) => String(n ?? "").trim()).filter(Boolean);
  return out.length > 0 ? out : VAN_TECHS;
};

const key = (name: string) => name.trim().toLowerCase();
export const isVanTech = (name: string, vans: string[] = VAN_TECHS): boolean =>
  vans.some((v) => key(v) === key(name));

/**
 * A visit whose arrive-and-done stamps are less than this apart was not
 * measured: the tech tapped both at once, or ServiceTitan filled them in
 * together when the job was closed in the office. They still count as a job
 * attended — dispatch is not in doubt — but they contribute no time.
 */
export const MIN_SPAN_HOURS = 0.25;

/** Over this and somebody forgot to tap done, so the span is not a measurement either. */
export const LONGEST_SPAN_HOURS = 12;

/** A drive longer than this is a tech who forgot to tap arrive, not a trip. */
export const LONGEST_DRIVE_HOURS = 3;

/** A job within a quarter hour of its sold time came in on it. The trade's own rounding. */
export const GRACE_HOURS = 0.25;

/** The fewest judged jobs that earns a rate. Below it the card says how many it has. */
export const MIN_TIMED = 8;

/**
 * The working day non-billable time is measured against: 7:00 to 15:30
 * Melbourne, which is what Jake pays for (15 Nov). Anything inside it that is
 * not on a job and not driving to one is time the business carried.
 */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 15.5;
export const DAY_HOURS = DAY_END_HOUR - DAY_START_HOUR;

/**
 * Half an hour a day for a break is not idleness (Jake, 16 Nov).
 *
 * Deducted per day, not per window: the allowance is a break, and a man who
 * worked straight through on Tuesday does not bank Tuesday's half hour against
 * Wednesday. It is an allowance rather than a deduction — a day already full
 * of work cannot go below zero idle because of it.
 */
export const BREAK_HOURS = 0.5;

/**
 * The longest slot a single visit can be judged against.
 *
 * ServiceTitan books "Installation - Ducted Refrigerated" for twenty hours,
 * which is two or three days on site. Time on site is first arrival to last
 * done inside one measurable stretch, so a twenty-hour slot can only ever come
 * in under — the comparison is not a comparison. Anything booked longer than
 * the paid day is counted and timed like any other job, and left out of the
 * in-the-time rate with the page saying so.
 */
export const LONGEST_ALLOWED_HOURS = DAY_HOURS;

/**
 * Non-billable time is counted **only on days where every job was fully
 * stamped** — a real span on each, and a recorded drive to each.
 *
 * Measured over the year, the two populations are not the same figure. Dean's
 * day comes out 4.24 hours idle over every day he worked and 2.71 over the days
 * everything was stamped; Ray's 2.43 against 1.07. The gap is work nobody
 * recorded, and counting it as idleness would put an hour and a half a day on
 * a man for not tapping his phone. So the days that cannot answer are left out
 * and the page says how many answered.
 */
export const MIN_IDLE_DAYS = 5;

/**
 * One job one tech was on, reduced to what the scorecard needs.
 *
 * `elapsed` and `sold` are the job's, not the tech's, and that is deliberate.
 * Sold labour hours do not scale with the crew: a service call is sold at an
 * hour and an install at three whether one man goes or two, so a tech's own
 * clocked hours against the job's sold hours reads every two-man install as
 * twice over. Over sixty days, man-hours against sold hours put the median
 * two-man install at 2.0× its sold time and the median two-man service at
 * 1.8×, while the time on site — first arrival to last done — put them at
 * 1.11× and 1.00×. The second pair is the comparison the sold hours were
 * written for. So the *job* is judged in or over its time, and every tech who
 * was on it carries that verdict.
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
  /**
   * The slot ServiceTitan books this kind of job for, in hours — the width of
   * the block on the dispatch board — or null where the job type sets none.
   *
   * This is the half of the comparison that exists on the morning of the job.
   * Sold hours arrive with the invoice, days later and only on the jobs that
   * were billed by the hour: over the year 458 of 490 attended jobs carry a
   * slot and 238 carry a sold time, so a day page built on what was sold is
   * mostly empty on the day it is read. Like the sold time it belongs to the
   * job, not the man: the slot is the same four hours whether one turns up or
   * two, so it is read against time on site, never against man-hours.
   */
  allowed: number | null;
  /**
   * The job's price before GST, and this tech's share of it.
   *
   * The share follows the van, not the head: a job Jackson did with Ray on the
   * other end of it is Jackson's van's money, because Ray rode there in it.
   * Where two vans were on one job it splits between them.
   */
  billed: number;
  share: number;
  /** A maintenance or breakdown visit: the two kinds that can turn into work. */
  canFind: boolean;
  /** A quote was written on the visit's own job. */
  quoted: boolean;
  /** An install was booked at the same address inside the follow-on window. */
  ledInstall: boolean;
  /**
   * Dispatch to arrival on this job, and whether any trip to it recorded one.
   * 289 of 715 trips in sixty days have arrival stamped at the dispatch moment
   * to the second, which is a default and not a drive of no minutes — so those
   * count in the denominator and not in the average.
   */
  drive: { hours: number; recorded: boolean };
};

/** One day a tech worked, for the non-billable arithmetic. */
export type CrewDay = {
  /** ISO date, Melbourne. */
  day: string;
  /** Every job that day had a real span and a recorded drive. See MIN_IDLE_DAYS. */
  full: boolean;
  /**
   * Hours inside 7:00–15:30 spent dispatched to a job or on one, already
   * unioned so two overlapping jobs are not counted twice, and clipped to the
   * day — a job that ran to six o'clock fills the window and no more.
   */
  busy: number;
};

export type TechKpi = {
  tech: string;
  /** Jobs attended in the window, each counted once however many visits it took. */
  jobs: number;
  mix: Record<CrewSector, number>;
  /** Hours clocked on the jobs whose stamps gave a real span. */
  hours: number;
  /** How many of their jobs were timed at all, out of how many they were on. */
  timed: { with: number; of: number };
  /**
   * Days they worked at all — every day with a timesheet on it, not the
   * stamped-right subset `idle.days` counts. It is the denominator for "on a
   * usual day", and dividing a year's hours by the stamped days instead put
   * 23 hours in Jye's usual day.
   */
  daysWorked: number;
  /**
   * The working day they were paid for, what they spent on jobs and getting to
   * them, and what is left — over the days every job was stamped. `share` is
   * null below MIN_IDLE_DAYS of them, and the page shows a dash rather than a
   * figure off three days.
   */
  idle: { hours: number; days: number; share: number | null };
  /** Drive time: the hours recorded, the jobs that recorded one, and all of them. */
  drive: { hours: number; jobs: number; of: number; avgMins: number | null };
  /** Jobs with both a measured time on site and a sold time, and how many came in within it. */
  inTime: { of: number; within: number };
  /** within ÷ of. Null below MIN_TIMED judged jobs. */
  inTimeRate: number | null;
  /**
   * The same question against the booked slot rather than the invoice: jobs
   * judged, jobs that came in, and the two sides of it in hours.
   *
   * `allowed` and `taken` are summed over the judged jobs only, so the pair is
   * a comparison — the hours a day was given against the hours it used.
   */
  allow: { of: number; within: number; allowed: number; taken: number };
  /** within ÷ of over the slot. Null below MIN_TIMED judged jobs. */
  inAllowedRate: number | null;
  /** Sold hours over time on site across those jobs. Above 1 is inside the time. */
  timeIndex: number | null;
  /** Their share of what those jobs billed, before GST. */
  billed: number;
  /** Billed over hours clocked. Null without an hour on the clock. */
  perHour: number | null;
  /** Of the maintenance and breakdown visits they did: quotes written, installs that followed. */
  found: { visits: number; quoted: number; install: number };
};

export type CrewTeam = Omit<TechKpi, "tech">;

/**
 * One job, reduced to what the Job types page counts.
 *
 * Jake, 16 Nov: "if it is an install what type and if it a maintenance is a
 * split or a ducted ect". The Sectors page answers the four kinds of work; this
 * is the row below it — the actual job types inside each, with the slot each
 * one is booked for against the time it really takes.
 */
export type TypedJob = {
  jobId: number;
  /** ServiceTitan's own job type name, as the office books it. */
  type: string;
  sector: CrewSector;
  allowed: number | null;
  elapsed: number | null;
  billed: number;
};

/**
 * The fewest judged jobs a job type needs before its rate is a rate.
 *
 * Lower than MIN_TIMED, which guards a person's score: a thin job type reads
 * "3 of 4" either way, and the figure in front of it is a count rather than a
 * percentage, so the floor is only deciding whether a percentage is added.
 */
export const MIN_TYPE_TIMED = 5;

export type JobTypeKpi = {
  type: string;
  sector: CrewSector;
  /** Jobs of this type somebody was sent to in the window. */
  jobs: number;
  /** The slot it is booked for. Null on a rolled-up row: several slots are not a slot. */
  allowed: number | null;
  /** Jobs with a measured time on site, and the average of it. */
  timed: number;
  avgTaken: number | null;
  /** Judged against the slot, and how many came in. */
  inTime: { of: number; within: number };
  /** Over those judged jobs: the hours the slots allowed, and the hours used. */
  slotHours: { allowed: number; taken: number };
  /** within ÷ of. Null below MIN_TYPE_TIMED. */
  rate: number | null;
  /** What those jobs billed before GST, over how many billed anything. */
  billed: number;
  billedJobs: number;
  avgBilled: number | null;
};

export type Crew = {
  from: string;
  to: string;
  days: number;
  /** How long after a visit an install at the address is still credited to it. */
  followDays: number;
  /** The techs with a van, most jobs first. */
  techs: TechKpi[];
  /** Everyone who rode with them, so the page can say who is not on it. */
  passengers: string[];
  team: CrewTeam;
  /**
   * Every job type attended in the window, most jobs first. Optional so a
   * snapshot written before the page existed still renders.
   */
  jobTypes?: JobTypeKpi[];
};

const noMix = (): Record<CrewSector, number> =>
  ({ maintenance: 0, breakdown: 0, repair: 0, install: 0, other: 0 });

/**
 * One tech's window, from their visits and the days they worked. Pure, so the
 * arithmetic can be tested without a database — and it is the arithmetic that
 * matters: which jobs are allowed into each denominator is the whole difference
 * between a figure and an accusation.
 */
export function techKpi(
  tech: string,
  visits: CrewVisit[],
  days: CrewDay[] = [],
  minDays: number = MIN_IDLE_DAYS,
): TechKpi {
  const mix = noMix();
  for (const v of visits) mix[v.sector] += 1;

  const timed = visits.filter((v) => v.hours != null);
  // Judged only where both halves were measured: a sold time with no clock on
  // it, or a clock with nothing sold, is not a comparison.
  const judged = visits.filter((v) => v.elapsed != null && v.sold != null && v.sold > 0);
  const within = judged.filter((v) => (v.elapsed as number) <= (v.sold as number) + GRACE_HOURS).length;
  const soldSum = judged.reduce((a, v) => a + (v.sold as number), 0);
  const onSite = judged.reduce((a, v) => a + (v.elapsed as number), 0);

  // The same comparison against the slot the office booked. See LONGEST_ALLOWED_HOURS
  // for why a job booked longer than the paid day is not judged here.
  const slotted = visits.filter(
    (v) => v.elapsed != null && v.allowed != null && v.allowed > 0 && v.allowed <= LONGEST_ALLOWED_HOURS,
  );
  const inSlot = slotted.filter((v) => (v.elapsed as number) <= (v.allowed as number) + GRACE_HOURS).length;
  const hours = timed.reduce((a, v) => a + (v.hours as number), 0);
  const find = visits.filter((v) => v.canFind);
  const billed = visits.reduce((a, v) => a + v.billed * v.share, 0);
  const driveHours = visits.reduce((a, v) => a + v.drive.hours, 0);
  const droveTo = visits.filter((v) => v.drive.recorded).length;

  // Only the days that can answer. See MIN_IDLE_DAYS.
  const told = days.filter((d) => d.full);
  const paid = told.length * DAY_HOURS;
  const busy = told.reduce((a, d) => a + d.busy, 0);
  // Day by day, each with its own half hour for a break. Taking the break off
  // the window total instead would let a flat-out Tuesday pay for a quiet
  // Wednesday, which is not what an allowance is. See BREAK_HOURS.
  const idleHours = told.reduce((a, d) => a + Math.max(0, DAY_HOURS - d.busy - BREAK_HOURS), 0);

  return {
    tech,
    jobs: visits.length,
    mix,
    hours,
    timed: { with: timed.length, of: visits.length },
    daysWorked: days.length,
    idle: {
      hours: idleHours,
      days: told.length,
      share: told.length >= minDays && paid > 0 ? idleHours / paid : null,
    },
    drive: {
      hours: driveHours,
      jobs: droveTo,
      of: visits.length,
      // The average over the jobs that recorded a drive. The total is short by
      // whatever was never stamped, so the average is the figure that leads.
      avgMins: droveTo > 0 ? (driveHours / droveTo) * 60 : null,
    },
    inTime: { of: judged.length, within },
    inTimeRate: judged.length >= MIN_TIMED ? within / judged.length : null,
    allow: {
      of: slotted.length,
      within: inSlot,
      allowed: slotted.reduce((a, v) => a + (v.allowed as number), 0),
      taken: slotted.reduce((a, v) => a + (v.elapsed as number), 0),
    },
    inAllowedRate: slotted.length >= MIN_TIMED ? inSlot / slotted.length : null,
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

/** The team's line, over the techs the page shows. */
export function crewTeam(techs: TechKpi[]): CrewTeam {
  const mix = noMix();
  for (const t of techs) for (const k of CREW_SECTORS) mix[k] += t.mix[k];
  const sum = (f: (t: TechKpi) => number) => techs.reduce((a, t) => a + f(t), 0);
  const of = sum((t) => t.inTime.of);
  const within = sum((t) => t.inTime.within);
  const hours = sum((t) => t.hours);
  const billed = sum((t) => t.billed);
  const driveHours = sum((t) => t.drive.hours);
  const droveTo = sum((t) => t.drive.jobs);
  const idleHours = sum((t) => t.idle.hours);
  // Days fully stamped across the team, so the share is of what the team was
  // paid for on those days rather than an average of averages.
  const days = sum((t) => t.idle.days);
  return {
    jobs: sum((t) => t.jobs),
    mix,
    hours,
    timed: { with: sum((t) => t.timed.with), of: sum((t) => t.timed.of) },
    daysWorked: sum((t) => t.daysWorked),
    idle: { hours: idleHours, days, share: days > 0 ? idleHours / (days * DAY_HOURS) : null },
    drive: {
      hours: driveHours,
      jobs: droveTo,
      of: sum((t) => t.drive.of),
      avgMins: droveTo > 0 ? (driveHours / droveTo) * 60 : null,
    },
    inTime: { of, within },
    inTimeRate: of >= MIN_TIMED ? within / of : null,
    allow: {
      of: sum((t) => t.allow.of),
      within: sum((t) => t.allow.within),
      allowed: sum((t) => t.allow.allowed),
      taken: sum((t) => t.allow.taken),
    },
    inAllowedRate: sum((t) => t.allow.of) >= MIN_TIMED ? sum((t) => t.allow.within) / sum((t) => t.allow.of) : null,
    timeIndex: null,
    billed,
    perHour: hours >= 1 ? billed / hours : null,
    found: {
      visits: sum((t) => t.found.visits),
      quoted: sum((t) => t.found.quoted),
      install: sum((t) => t.found.install),
    },
  };
}

/**
 * Each job type's window, from the jobs attended. Pure, like `techKpi`.
 *
 * One row per job type rather than per sector, because the question is which
 * kind of install or which kind of service — a page that says "installs take
 * 3.8 hours" has averaged a four-hour split system with a twenty-hour ducted
 * job and answered nothing.
 */
export function jobTypeKpis(jobs: TypedJob[]): JobTypeKpi[] {
  const by = new Map<string, TypedJob[]>();
  for (const j of jobs) by.set(j.type, [...(by.get(j.type) ?? []), j]);

  const rows = [...by.entries()].map(([type, list]) => {
    const timed = list.filter((j) => j.elapsed != null);
    const slotted = list.filter(
      (j) => j.elapsed != null && j.allowed != null && j.allowed > 0 && j.allowed <= LONGEST_ALLOWED_HOURS,
    );
    const within = slotted.filter((j) => (j.elapsed as number) <= (j.allowed as number) + GRACE_HOURS).length;
    const paid = list.filter((j) => j.billed > 0);
    const billed = paid.reduce((a, j) => a + j.billed, 0);
    // The slot is a property of the type, so any job of it carries the same
    // one. Taking the max rather than the first guards a job whose type was
    // renamed into this row with no duration of its own.
    const allowed = list.reduce<number | null>(
      (a, j) => (j.allowed != null && j.allowed > 0 ? Math.max(a ?? 0, j.allowed) : a),
      null,
    );
    return {
      type,
      sector: list[0].sector,
      jobs: list.length,
      allowed,
      timed: timed.length,
      avgTaken: timed.length > 0 ? timed.reduce((a, j) => a + (j.elapsed as number), 0) / timed.length : null,
      inTime: { of: slotted.length, within },
      slotHours: {
        allowed: slotted.reduce((a, j) => a + (j.allowed as number), 0),
        taken: slotted.reduce((a, j) => a + (j.elapsed as number), 0),
      },
      rate: slotted.length >= MIN_TYPE_TIMED ? within / slotted.length : null,
      billed,
      billedJobs: paid.length,
      // Over the jobs that billed something, not over every job attended: a
      // quote visit and a warranty call bill nothing by design, and averaging
      // their zeroes in reads as the work being worth less than it is.
      avgBilled: paid.length > 0 ? billed / paid.length : null,
    };
  });

  return rows.sort((a, b) => b.jobs - a.jobs || b.billed - a.billed);
}

/**
 * Several job-type rows folded into one, for the tail of the table and its
 * total line. `allowed` goes null: a row covering a four-hour install and a
 * ninety-minute service has no slot of its own, and a number there would be
 * read as one.
 */
export function rollUpTypes(rows: JobTypeKpi[], label: string, sector: CrewSector = "other"): JobTypeKpi {
  const sum = (f: (r: JobTypeKpi) => number) => rows.reduce((a, r) => a + f(r), 0);
  const timed = sum((r) => r.timed);
  const of = sum((r) => r.inTime.of);
  const within = sum((r) => r.inTime.within);
  const billed = sum((r) => r.billed);
  const billedJobs = sum((r) => r.billedJobs);
  return {
    type: label,
    sector,
    jobs: sum((r) => r.jobs),
    allowed: null,
    timed,
    // Re-weighted by the jobs behind each row, not an average of averages: a
    // type with two jobs would otherwise pull as hard as one with sixty.
    avgTaken: timed > 0 ? sum((r) => (r.avgTaken ?? 0) * r.timed) / timed : null,
    inTime: { of, within },
    slotHours: {
      allowed: sum((r) => r.slotHours.allowed),
      taken: sum((r) => r.slotHours.taken),
    },
    rate: of >= MIN_TYPE_TIMED ? within / of : null,
    billed,
    billedJobs,
    avgBilled: billedJobs > 0 ? billed / billedJobs : null,
  };
}
