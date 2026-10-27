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

export type StageDef = {
  k: FlowStage;
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
    k: "enquiry", label: "Enquiries to book",
    rule: "A website enquiry in the last 21 days, and no job or quote in ServiceTitan for that phone number or email since.",
    act: "Ring them and book it.",
  },
  {
    k: "nodate", label: "No visit booked",
    rule: "An open job in ServiceTitan with no appointment on it.",
    act: "Book the visit, or cancel the job.",
  },
  {
    k: "booked", label: "Booked", quiet: true,
    rule: "A visit in the diary, or one in the last two days that's still being finished.",
    act: "Nothing yet.",
  },
  {
    k: "toquote", label: "To quote",
    rule: "A quote visit or site assessment whose appointment has been, with no quote written on the job or for the customer since.",
    act: "Write the quote and send it.",
  },
  {
    k: "quoted", label: "Quotes to chase",
    rule: "From the quote pipeline: quotes out less than two days, and the ones due a call today.",
    act: "Check new quotes went out. Ring the ones due.",
  },
  {
    k: "closevisit", label: "Quote visits to close",
    rule: "A quote visit that's been, with its quote written, and the job still open in ServiceTitan.",
    act: "Complete the visit in ServiceTitan. A free quote closes at $0.",
  },
  {
    k: "sold", label: "Sold, to book",
    rule: "From the quote pipeline: sold, with no job booked to do the work.",
    act: "Book the install and order the gear.",
  },
  {
    k: "notclosed", label: "Left open",
    rule: "The last appointment was two or more days ago, nothing is booked after it, and the job isn't completed, on hold or cancelled.",
    act: "Ask the tech. Done: complete it so it can be billed. Not done: book the return or put it on hold.",
  },
  {
    k: "hold", label: "On hold",
    rule: "Status Hold in ServiceTitan, tagged or not.",
    act: "Find what it's waiting on and move it.",
  },
  {
    k: "tobill", label: "To invoice",
    rule: "Completed since 17 September with the invoice still at $0. Quote visits and cancelled jobs are left out.",
    act: "Price the invoice and send it.",
  },
  {
    k: "tosend", label: "To send",
    rule: "Completed, invoiced, money owing, and ServiceTitan says the invoice was never sent.",
    act: "Check the invoice and send it.",
  },
  {
    k: "overdue", label: "Owed, past due",
    rule: "Sent, and past its due date with money still owing. ServiceTitan's since 17 September, Xero's before.",
    act: "Chase it.",
  },
  {
    k: "imported", label: "Old jobs to close",
    rule: "Jobs copied across from the old system before 17 September that were never closed, each checked against Xero.",
    act: "Billed in Xero: close it in ServiceTitan. Not in Xero: bill it.",
  },
];

export const STAGE = Object.fromEntries(STAGES.map((s) => [s.k, s])) as Record<FlowStage, StageDef>;

/**
 * The board: one column a step, left to right, the way a job runs. Where two
 * stages are the same step for the customer (an enquiry and a job with no
 * visit both still need booking) they share a column, and each card says
 * which with its tag. The old system's jobs aren't a step in anyone's job,
 * so they sit under the board, not on it.
 */
export type ColumnKey = "book" | "toquote" | "quoted" | "sold" | "doing" | "toinvoice" | "tosend" | "owed";
export const COLUMNS: Array<{ k: ColumnKey; label: string; stages: FlowStage[] }> = [
  { k: "book", label: "To book", stages: ["enquiry", "nodate"] },
  { k: "toquote", label: "To quote", stages: ["toquote"] },
  { k: "quoted", label: "Quoted", stages: ["quoted", "closevisit"] },
  { k: "sold", label: "Sold", stages: ["sold"] },
  { k: "doing", label: "Doing", stages: ["notclosed", "hold", "booked"] },
  { k: "toinvoice", label: "To invoice", stages: ["tobill"] },
  { k: "tosend", label: "To send", stages: ["tosend"] },
  { k: "owed", label: "Owed", stages: ["overdue"] },
];

/** The word on a card in a shared column, saying which of its stages the job is in. */
export const TAG: Partial<Record<FlowStage, string>> = {
  enquiry: "Enquiry", nodate: "No visit", closevisit: "Close visit", notclosed: "Left open", hold: "On hold", booked: "Booked",
};

/** The column a stage sits in. */
export const columnOf = (k: FlowStage): ColumnKey | null => COLUMNS.find((c) => c.stages.includes(k))?.k ?? null;

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
