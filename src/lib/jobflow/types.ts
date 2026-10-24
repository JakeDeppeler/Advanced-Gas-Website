/**
 * Where every job is up to, from the enquiry to the money in the bank.
 *
 * **Why not tags.** ServiceTitan's tags say why a job is waiting only when
 * somebody remembers to put one on, and the jobs that fall through are exactly
 * the ones nobody remembered. So every stage here is read from what
 * ServiceTitan records whether anyone thinks about it or not: the job's status,
 * its appointments and when they were, the quotes written against it, the
 * invoice and whether it was sent, and the payments. A job with no tag still
 * lands in a stage.
 *
 * **One stage per job, one stage per action.** A job is in the first stage
 * that applies to it, in the order the work runs. A quote visit that has its
 * quote written but was never closed is in "close the visit"; the quote itself
 * is separately in the quote stages, because ringing the customer and closing
 * the visit are two people's jobs.
 *
 * Pure: no database, no React, so scripts/check-jobflow.ts can pin the rules.
 */

export type FlowStage =
  | "enquiry"
  | "nodate"
  | "booked"
  | "toquote"
  | "quoted"
  | "closevisit"
  | "sold"
  | "notclosed"
  | "hold"
  | "tobill"
  | "tosend"
  | "overdue"
  | "imported";

export type Phase = "book" | "quote" | "work" | "paid" | "tidy";

export const PHASES: Array<{ k: Phase; label: string }> = [
  { k: "book", label: "Getting the job" },
  { k: "quote", label: "Quoting" },
  { k: "work", label: "Doing the work" },
  { k: "paid", label: "Getting paid" },
  { k: "tidy", label: "Left over from the switch" },
];

export type StageDef = {
  k: FlowStage;
  phase: Phase;
  label: string;
  /** What puts a job here, in words, for the line under the title. */
  rule: string;
  /** What to do about it, in a line: the first thing the list says. The rule is there for whoever asks why. */
  act: string;
  /** Nothing to do: shown as a count, not a list to work. */
  quiet?: boolean;
};

export const STAGES: StageDef[] = [
  {
    k: "enquiry", phase: "book", label: "Asked, not booked",
    rule: "A website enquiry in the last 21 days, and no job or quote in ServiceTitan for that phone number or email since.",
    act: "Ring them and book it.",
  },
  {
    k: "nodate", phase: "book", label: "Job made, no visit booked",
    rule: "An open job in ServiceTitan with no appointment on it.",
    act: "Book the visit, or cancel the job.",
  },
  {
    k: "booked", phase: "book", label: "Booked, on track", quiet: true,
    rule: "A visit in the diary, or one in the last two days that's still being finished.",
    act: "Nothing yet.",
  },
  {
    k: "toquote", phase: "quote", label: "Visited, not quoted",
    rule: "A quote visit or site assessment whose appointment has been, with no quote written on the job or for the customer since.",
    act: "Write the quote and send it.",
  },
  {
    k: "quoted", phase: "quote", label: "Quoted, to follow up",
    rule: "From the quote pipeline: quotes out less than two days, and the ones due a call today.",
    act: "Check new quotes went out. Ring the ones due.",
  },
  {
    k: "closevisit", phase: "quote", label: "Quote visit to close",
    rule: "A quote visit that's been, with its quote written, and the job still open in ServiceTitan.",
    act: "Complete the visit in ServiceTitan. A free quote closes at $0.",
  },
  {
    k: "sold", phase: "work", label: "Sold, not booked",
    rule: "From the quote pipeline: sold, with no job booked to do the work.",
    act: "Book the install and order the gear.",
  },
  {
    k: "notclosed", phase: "work", label: "Visit day gone, job still open",
    rule: "The last appointment was two or more days ago, nothing is booked after it, and the job isn't completed, on hold or cancelled.",
    act: "Ask the tech. Done: complete it so it can be billed. Not done: book the return or put it on hold.",
  },
  {
    k: "hold", phase: "work", label: "On hold",
    rule: "Status Hold in ServiceTitan, tagged or not.",
    act: "Find what it's waiting on and move it.",
  },
  {
    k: "tobill", phase: "paid", label: "Done, not invoiced",
    rule: "Completed since 17 September with the invoice still at $0. Quote visits and cancelled jobs are left out.",
    act: "Price the invoice and send it.",
  },
  {
    k: "tosend", phase: "paid", label: "Invoiced, not sent",
    rule: "Completed, invoiced, money owing, and ServiceTitan says the invoice was never sent.",
    act: "Check the invoice and send it.",
  },
  {
    k: "overdue", phase: "paid", label: "Overdue",
    rule: "Sent, and past its due date with money still owing. ServiceTitan's since 17 September, Xero's before.",
    act: "Chase it.",
  },
  {
    k: "imported", phase: "tidy", label: "Old jobs still open",
    rule: "Jobs copied across from the old system before 17 September that were never closed, each checked against Xero.",
    act: "Billed in Xero: close it in ServiceTitan. Not in Xero: bill it.",
  },
];

export const STAGE = Object.fromEntries(STAGES.map((s) => [s.k, s])) as Record<FlowStage, StageDef>;

const DAY = 86_400_000;

/** How long after the last visit an open job counts as left open, rather than still being finished. */
export const CLOSE_AFTER_DAYS = 2;
/** How far back a website enquiry is looked for a job. Past this it's a lost lead, not a booking to make. */
export const ENQUIRY_DAYS = 21;

/** What the open-job stages need to know about a job. */
export type OpenJob = {
  status: string;
  /** A quote visit or site assessment, not the work itself. */
  quoteVisit: boolean;
  /** Copied across from the old system, in ServiceTitan's "Imported Default" unit. */
  imported: boolean;
  /** When the latest appointment that has started ended (or started, if it has no end). */
  lastVisit: string | null;
  /** When the next appointment that hasn't started yet starts. */
  nextVisit: string | null;
  /** A quote written on this job, or for this customer since the visit. */
  quoted: boolean;
};

/** Whole days from an ISO time to now, never negative. */
export const daysSince = (iso: string, nowMs: number) => Math.max(0, Math.floor((nowMs - Date.parse(iso)) / DAY));

/**
 * The stage of a job ServiceTitan still has open (Scheduled, In progress or
 * Hold). Status first, because Hold is somebody's decision and imported jobs
 * are a different conversation; then the diary: a visit still to come is on
 * track, a job with no visit at all needs one; then what the visit left.
 */
export function openStage(j: OpenJob, nowMs: number): FlowStage {
  if (j.imported) return "imported";
  if (j.status === "Hold") return "hold";
  if (j.nextVisit) return "booked";
  if (!j.lastVisit) return "nodate";
  // A quote visit is to be quoted from the moment it's been: that's its stage
  // even on the day. How late it is goes on its pill, not in which list.
  if (j.quoteVisit && !j.quoted) return "toquote";
  if (daysSince(j.lastVisit, nowMs) < CLOSE_AFTER_DAYS) return "booked";
  return j.quoteVisit ? "closevisit" : "notclosed";
}

/** An invoice the customer owes on and was never sent. The Office today count and this page use the same rule. */
export const unsentOwing = (i: { sent: string | null | undefined; balance: number | string | null | undefined }) =>
  i.sent === "NotSent" && Number(i.balance ?? 0) > 0.5;

/* ------------------------------------------------------------- the track */

/** The steps a job goes through, start to finish. Quoted and Sold only on work that was quoted. */
export type Step = "booked" | "visited" | "quoted" | "sold" | "done" | "invoiced" | "sent" | "paid";

export const STEPS: Array<{ k: Step; label: string }> = [
  { k: "booked", label: "Booked" },
  { k: "visited", label: "Visited" },
  { k: "quoted", label: "Quoted" },
  { k: "sold", label: "Sold" },
  { k: "done", label: "Done" },
  { k: "invoiced", label: "Invoiced" },
  { k: "sent", label: "Sent" },
  { k: "paid", label: "Paid" },
];

/** done: passed. now: where it's stuck. todo: still to come. skip: not a step this job has. */
export type StepState = "done" | "now" | "todo" | "skip";

/** The step each stage is stuck at. Hold depends on whether anyone has been out yet. */
function stuckAt(stage: FlowStage, visited: boolean): Step {
  switch (stage) {
    case "enquiry": case "nodate": return "booked";
    case "booked": return "visited";
    case "toquote": return "quoted";
    case "quoted": return "sold";
    case "hold": return visited ? "done" : "visited";
    case "closevisit": case "sold": case "notclosed": case "imported": return "done";
    case "tobill": return "invoiced";
    case "tosend": return "sent";
    case "overdue": return "paid";
  }
}

/**
 * The job's track from booked to paid, for the strip on each row. `quotePath`
 * is work that went through a quote (a job with a sold quote on it); without
 * one, Quoted and Sold aren't steps it has. A quote visit left open is the
 * visit's own job, which closes at $0 once the quote is written: whatever
 * sells is booked, billed and paid on a job of its own, so those steps aren't
 * this one's.
 */
export function trackFor(stage: FlowStage, opts: { quotePath?: boolean; visited?: boolean } = {}): Record<Step, StepState> {
  const at = stuckAt(stage, opts.visited ?? false);
  const quoting = stage === "toquote" || stage === "quoted" || stage === "sold" || stage === "closevisit";
  const freeVisit = stage === "closevisit";
  const order = STEPS.map((s) => s.k);
  const i = order.indexOf(at);
  const out = {} as Record<Step, StepState>;
  for (const [n, k] of order.entries()) {
    if ((k === "quoted" || k === "sold") && !opts.quotePath && !quoting) out[k] = "skip";
    else if (freeVisit && (k === "sold" || k === "invoiced" || k === "sent" || k === "paid")) out[k] = "skip";
    else out[k] = n < i ? "done" : n === i ? "now" : "todo";
  }
  return out;
}

/* ------------------------------------------------------- matching enquiries */

/**
 * The forms a phone number can take in ServiceTitan's contacts, which keep
 * digits only and often drop the leading zero (412345678 for 0412 345 678).
 * A landline also appears without its area code. Mobiles don't get the
 * eight-digit form: the last eight digits of a mobile could be anyone's
 * landline, and a false match would hide an enquiry nobody has booked.
 */
export function phoneKeys(raw: string | null | undefined): string[] {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("61") && d.length === 11) d = `0${d.slice(2)}`;
  if (d.length === 9 && !d.startsWith("0")) d = `0${d}`;
  if (d.length === 10 && d.startsWith("0")) {
    const keys = [d, d.slice(1)];
    if (/^0[2378]/.test(d)) keys.push(d.slice(2));
    return keys;
  }
  return d.length >= 8 ? [d] : [];
}

/** An email as ServiceTitan's contacts would hold it. */
export const emailKey = (raw: string | null | undefined): string | null => {
  const e = String(raw ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};
