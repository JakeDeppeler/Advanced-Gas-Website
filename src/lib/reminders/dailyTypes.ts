/**
 * The morning to-do email's rules, kept pure so scripts/check-reminders.ts can
 * run them (Jake, 5 Nov: "an email reminder to jake and admin for the things
 * that need to be completed that day, like booking a waste mate in, or
 * materials that aren't marked as ordered, or a job completed that hasn't been
 * billed from the previous day, and make these items under the groups").
 *
 * The office already says what is outstanding, with its own tag pairs in
 * ServiceTitan: "Rubbish Removal Not Booked" until the bin is booked, then
 * "Rubbish Removal Booked"; "Materials Not Ordered" until "Materials Ordered".
 * The portal's ordering swaps some of these itself when an order goes
 * (lib/ordering/stJobNotes.ts). So the email reads the tags rather than
 * guessing from orders, and a job carrying both halves of a pair (the done tag
 * went on, the not-yet tag was never taken off) counts as done.
 */

/** Only the words count: the office's tags carry emoji and stray spaces ("System Ordered "). */
export const tagWords = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

export type GroupKey = "rubbish" | "system" | "materials" | "electrician";

export type Group = {
  key: GroupKey;
  /** The heading, saying what to do. */
  title: string;
  /** The tag (in tagWords form) that says it isn't done yet. */
  not: (t: string) => boolean;
  /** Any tag that says it is. */
  done: (t: string) => boolean;
  /** Where in the portal it gets done, when somewhere does. */
  href?: string;
};

export const GROUPS: Group[] = [
  {
    key: "rubbish",
    title: "Rubbish removal to book",
    not: (t) => t === "rubbish removal not booked",
    done: (t) => t === "rubbish removal booked",
  },
  {
    key: "system",
    title: "Systems to order",
    // "System Not Ordered", or a brand's own ("Rinnai System Not Ordered") if one is ever made.
    not: (t) => /(?:^| )system not order(?:ed)?$/.test(t),
    // "System Ordered" or any brand's: "Brivis System Ordered", "Mitsubishi Electric System Ordered".
    done: (t) => /(?:^| )system order(?:ed)?$/.test(t) && !/\bnot\b/.test(t),
    href: "/portal/supply/next-week",
  },
  {
    key: "materials",
    title: "Materials to order",
    not: (t) => t === "materials not ordered",
    done: (t) => t === "materials ordered" || t === "materials delivered",
    href: "/portal/supply/next-week",
  },
  {
    key: "electrician",
    title: "Electrician (GTE) to book",
    not: (t) => t === "gte not booked",
    done: (t) => t === "gte booked",
  },
];

/** Which groups a job is outstanding in, from its tag names. */
export function outstanding(tagNames: string[]): GroupKey[] {
  const words = tagNames.map(tagWords);
  return GROUPS.filter((g) => words.some(g.not) && !words.some(g.done)).map((g) => g.key);
}

/**
 * How far ahead a visit makes it today's job. A week: materials and systems
 * have to be ordered with a few days' lead, and a skip bin or the electrician
 * booked before the day. Further out is counted ("4 more after that"), not
 * listed, so the email stays a list of today's jobs.
 */
export const HORIZON_DAYS = 7;

const MEL = "Australia/Melbourne";

/** A date in Melbourne, yyyy-mm-dd. */
export function melDate(at: Date | string | number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MEL, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/**
 * The days whose finished jobs should have been billed by this morning: the
 * working day before. On a Monday, Friday through Sunday, so weekend work
 * isn't skipped. Returned as Melbourne dates, first and last inclusive.
 */
export function billingDays(today: string): { from: string; to: string } {
  const dow = weekday(today);
  if (dow === 1) return { from: addDays(today, -3), to: addDays(today, -1) };
  if (dow === 0) return { from: addDays(today, -2), to: addDays(today, -1) };
  return { from: addDays(today, -1), to: addDays(today, -1) };
}

/** "Today 7:00am", "Tomorrow 9:30am", "Mon 9 Nov 7:30am". */
export function visitLabel(start: string, today: string): string {
  const day = melDate(start);
  const time = new Intl.DateTimeFormat("en-AU", { timeZone: MEL, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(start)).replace(/\s/g, "").toLowerCase();
  const name =
    day === today ? "Today" :
    day === addDays(today, 1) ? "Tomorrow" :
    new Intl.DateTimeFormat("en-AU", { timeZone: MEL, weekday: "short", day: "numeric", month: "short" }).format(new Date(start)).replace(",", "");
  return `${name} ${time}`;
}

/** "Mon 9 Nov" or "Fri 6 – Sun 8 Nov", for the billing heading. */
export function spanLabel(s: { from: string; to: string }): string {
  const f = (d: string, month = true) =>
    new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", ...(month ? { month: "short" } : {}) }).format(new Date(`${d}T12:00:00Z`)).replace(",", "");
  return s.from === s.to ? f(s.from) : `${f(s.from, s.from.slice(5, 7) !== s.to.slice(5, 7))} – ${f(s.to)}`;
}

export type ReminderJob = {
  id: number;
  jobNumber: string | null;
  customer: string | null;
  where: string | null;
  jobType: string | null;
  /** The next visit, ISO; null for a billing line. */
  visit: string | null;
};

export type ReminderGroup = { key: GroupKey | "billing"; title: string; jobs: ReminderJob[]; later: number; href?: string };

/** One line of the email: when, the job, who and where, what it is. */
export function jobLine(j: ReminderJob, today: string): string {
  const who = [j.customer?.trim(), j.where?.trim()].filter(Boolean).join(", ");
  return [j.visit ? visitLabel(j.visit, today) : null, `Job ${j.jobNumber ?? j.id}`, who || null, j.jobType].filter(Boolean).join(" · ");
}

/** "3 materials to order, 1 rubbish removal to book, 2 to bill". */
export function subjectFor(groups: ReminderGroup[]): string {
  const short: Record<string, string> = {
    rubbish: "rubbish removal to book", system: "systems to order", materials: "materials to order",
    electrician: "electrician to book", billing: "to bill",
  };
  const parts = groups.filter((g) => g.jobs.length).map((g) => `${g.jobs.length} ${short[g.key]}`);
  return `To do today: ${parts.join(", ")}`;
}
