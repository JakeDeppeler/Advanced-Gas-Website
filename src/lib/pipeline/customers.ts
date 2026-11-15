/**
 * The pipeline a customer at a time (Jake, 15 Nov: "more like a real pipeline
 * for each customer"). The board's cards are quotes, so a customer quoted for
 * a ducted system, a split and a hot water unit is three cards in three
 * columns and nobody can see where that customer is up to. Here the same
 * quotes are grouped into one card per customer, sitting in one column, and
 * the columns run the whole way from quoted to paid.
 *
 * Pure: the board in the browser groups what the server already sent.
 */

import { ruleNext, type PipeQuote, type Stage } from "./types";

/** The customer columns, left to right. Lost is to the side, as on the quote board. */
export type CustStage = "new" | "due" | "waiting" | "won" | "booked" | "billed";

export const CUST_STAGES: Array<{ k: CustStage; label: string; blurb: string }> = [
  { k: "new", label: "Just quoted", blurb: "A quote out less than 2 days, nothing to ring yet" },
  { k: "due", label: "Follow up today", blurb: "At least one of their quotes is due a call" },
  { k: "waiting", label: "Waiting on them", blurb: "Followed up, next call booked" },
  { k: "won", label: "Sold, to be booked", blurb: "Said yes, no job in the diary for it yet" },
  { k: "booked", label: "Booked", blurb: "The job's in the diary" },
  { k: "billed", label: "Done, to be paid", blurb: "Done, money still owing" },
];

/**
 * The milestones a customer passes, for the dots on the card and the bar in
 * their panel. Not the columns: "Follow up today" and "Waiting on them" are
 * what to do next, these are what has happened.
 */
export const MILESTONES = ["Quoted", "Followed up", "Sold", "Booked", "Done", "Paid"] as const;
export type Milestone = (typeof MILESTONES)[number];

export type PipeCustomer = {
  key: string;
  customerId: number | null;
  customer: string | null;
  suburb: string | null;
  phone: string | null;
  stage: CustStage;
  /** The quote that put them in their column: its next step is the card's next step. */
  lead: PipeQuote;
  /** Every quote of theirs on the board, open, sold and lost, newest first. */
  quotes: PipeQuote[];
  /** Open quotes' worth while anything is still open; what they bought once it's all sold. */
  value: number;
  /** Sold value alongside open quotes, so a customer who bought one and is weighing another shows both. */
  soldValue: number;
  /** Who's chasing them, then who quoted them. */
  people: string[];
  /** Each milestone and the day it was reached, when the day is known. Null: not reached. */
  journey: Array<{ m: Milestone; on: string | null; reached: boolean }>;
  /** How many milestones are behind them. */
  reached: number;
};

const OPEN: Stage[] = ["new", "due", "waiting"];

/** A timestamp's day in Melbourne: a 9am visit is stored the evening before in UTC. */
const melDay = (ts: string) => new Date(ts).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

const keyOf = (q: PipeQuote) =>
  q.customerId != null ? `c${q.customerId}`
    : q.customer ? `n${q.customer.trim().toLowerCase()}|${(q.suburb ?? "").trim().toLowerCase()}`
      : `q${q.key}`;

const minOf = (xs: Array<string | null | undefined>) => xs.filter((x): x is string => !!x).sort()[0] ?? null;

/** The day the next call falls due on a quote, booked by hand or by the follow-up rule. */
export const dueOn = (q: PipeQuote) => q.nextOn ?? ruleNext(q.pricedOn ?? q.quotedOn, q.touches) ?? "9999";

/**
 * Where a customer sits: their most urgent open action wins.
 *
 *   1. Any quote due a call puts them in Follow up today, whatever else they
 *      have: a call owed is the thing that slips.
 *   2. Otherwise a sale with no job booked puts them in Sold, to be booked.
 *   3. Otherwise a quote still out: Just quoted if one went out in the last two
 *      days (the newest news about them), else Waiting on them.
 *   4. Only with nothing open or unbooked do they move on to Booked, then to
 *      Done, to be paid, and they leave the board once everything is paid.
 *
 * A customer whose every quote here is lost isn't in a column at all; they're
 * in the Lost fold beside the board.
 */
function placeOf(qs: PipeQuote[]): { stage: CustStage; lead: PipeQuote } | null {
  const of = (s: Stage) => qs.filter((q) => q.stage === s);
  const due = of("due");
  // The longest late call first, then the biggest.
  if (due.length) return { stage: "due", lead: [...due].sort((a, b) => dueOn(a).localeCompare(dueOn(b)) || b.value - a.value)[0] };
  // The oldest sale still unbooked: the one most likely to go cold.
  const won = of("won");
  if (won.length) return { stage: "won", lead: [...won].sort((a, b) => (a.soldOn ?? "").localeCompare(b.soldOn ?? ""))[0] };
  const fresh = of("new");
  if (fresh.length) return { stage: "new", lead: [...fresh].sort((a, b) => b.quotedOn.localeCompare(a.quotedOn))[0] };
  // The next call booked soonest.
  const waiting = of("waiting");
  if (waiting.length) return { stage: "waiting", lead: [...waiting].sort((a, b) => dueOn(a).localeCompare(dueOn(b)))[0] };
  const booked = of("booked");
  if (booked.length) return { stage: "booked", lead: [...booked].sort((a, b) => (a.work?.bookedFor ?? "9999").localeCompare(b.work?.bookedFor ?? "9999"))[0] };
  const billed = of("billed");
  if (billed.length) return { stage: "billed", lead: [...billed].sort((a, b) => (a.work?.completedOn ?? "").localeCompare(b.work?.completedOn ?? ""))[0] };
  return null;
}

/** What they've been through, from every quote of theirs. */
function journeyOf(qs: PipeQuote[]): PipeCustomer["journey"] {
  const sold = qs.filter((q) => q.soldOn || q.stage === "won" || q.stage === "booked" || q.stage === "billed");
  const works = sold.map((q) => q.work).filter((w): w is NonNullable<PipeQuote["work"]> => !!w);
  const followed = minOf(qs.flatMap((q) => q.touches.filter((t) => t.how !== "note").map((t) => melDay(t.at))));
  const soldOn = minOf(sold.map((q) => q.soldOn));
  // Booked: the visit day when one is set; a job that's been done was booked even if the visit's gone.
  const bookedFor = minOf(works.map((w) => (w.bookedFor ? melDay(w.bookedFor) : null)));
  const booked = works.length > 0;
  const doneOn = minOf(works.map((w) => w.completedOn?.slice(0, 10)));
  const done = works.some((w) => w.completedOn || w.status === "Completed");
  const paid = works.some((w) => w.invoiced > 0 && w.owing != null && w.owing <= 0.5);
  return [
    { m: "Quoted", on: minOf(qs.map((q) => q.quotedOn)), reached: true },
    // Selling without a call counts as having got past the follow-up.
    { m: "Followed up", on: followed, reached: !!followed || sold.length > 0 },
    { m: "Sold", on: soldOn, reached: sold.length > 0 },
    { m: "Booked", on: bookedFor, reached: booked },
    { m: "Done", on: doneOn, reached: done },
    { m: "Paid", on: null, reached: paid },
  ];
}

/**
 * Every customer on the board. `lost` holds those with nothing but lost
 * quotes; the rest are in a column.
 */
export function groupCustomers(quotes: PipeQuote[]): { live: PipeCustomer[]; lost: PipeCustomer[] } {
  const by = new Map<string, PipeQuote[]>();
  for (const q of quotes) {
    const k = keyOf(q);
    const list = by.get(k) ?? [];
    list.push(q);
    by.set(k, list);
  }
  const live: PipeCustomer[] = [];
  const lost: PipeCustomer[] = [];
  for (const [key, list] of by) {
    const qs = [...list].sort((a, b) => b.quotedOn.localeCompare(a.quotedOn));
    const named = qs.find((q) => q.customer) ?? qs[0];
    const open = qs.filter((q) => OPEN.includes(q.stage));
    const soldQs = qs.filter((q) => q.stage === "won" || q.stage === "booked" || q.stage === "billed");
    const openValue = open.reduce((n, q) => n + q.value, 0);
    const soldValue = soldQs.reduce((n, q) => n + q.value, 0);
    const people = [...new Set(qs.flatMap((q) => [q.owner, q.quotedBy]).filter((x): x is string => !!x))];
    const journey = journeyOf(qs);
    const place = placeOf(qs);
    const base = {
      key,
      customerId: named.customerId,
      customer: named.customer,
      suburb: named.suburb ?? qs.find((q) => q.suburb)?.suburb ?? null,
      phone: qs.find((q) => q.phone)?.phone ?? null,
      quotes: qs,
      people,
      journey,
      reached: journey.filter((j) => j.reached).length,
      soldValue,
    };
    if (!place) {
      lost.push({ ...base, stage: "new", lead: qs[0], value: qs.reduce((n, q) => n + q.value, 0) });
      continue;
    }
    live.push({ ...base, stage: place.stage, lead: place.lead, value: open.length ? openValue : soldValue });
  }
  return { live, lost };
}

/** The order of cards in a column: the same order the quote board puts their lead quotes in. */
export function custOrder(s: CustStage): (a: PipeCustomer, b: PipeCustomer) => number {
  switch (s) {
    case "due": return (a, b) => dueOn(a.lead).localeCompare(dueOn(b.lead)) || b.value - a.value;
    case "waiting": return (a, b) => dueOn(a.lead).localeCompare(dueOn(b.lead));
    case "won": return (a, b) => (a.lead.soldOn ?? "").localeCompare(b.lead.soldOn ?? "");
    case "booked": return (a, b) => (a.lead.work?.bookedFor ?? "9999").localeCompare(b.lead.work?.bookedFor ?? "9999");
    case "billed": return (a, b) => (a.lead.work?.completedOn ?? "").localeCompare(b.lead.work?.completedOn ?? "");
    default: return (a, b) => b.value - a.value;
  }
}
