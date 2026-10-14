/**
 * Accounts receivable, aged the way ServiceTitan's AR report ages it.
 *
 * One row per customer, one column per ageing band, and a summary of the bands
 * underneath — so what is on the screen can be read straight against the report
 * the office already knows. Pure: no database, no network, so the bucketing
 * can be checked against hand-worked figures.
 *
 * **The bands are ServiceTitan's, not the wall board's.** The board ages what
 * is owed in 1–7, 8–14, 15–30 and 30+, because at four metres the question is
 * "is anything slipping this week". An AR report answers a different question —
 * what do we write off, what do we hand to a collector — and that one is asked
 * in thirties. Two different cuts of the same money, each for its own room.
 */

/** Days past due. "Current" is anything not yet due, including due today. */
export const AR_BANDS = [
  { key: "current", label: "Current", short: "Current" },
  { key: "d1_30", label: "1 – 30 days", short: "1–30" },
  { key: "d31_60", label: "31 – 60 days", short: "31–60" },
  { key: "d61_90", label: "61 – 90 days", short: "61–90" },
  { key: "d90", label: "Over 90 days", short: "90+" },
] as const;

export type ArBandKey = (typeof AR_BANDS)[number]["key"];

/**
 * Which band an invoice falls in, by how many days past due it is.
 *
 * Zero and below is Current: an invoice due today has not been paid late. The
 * boundaries are inclusive at the top — 30 is in 1–30, 31 opens the next — so
 * every day lands in exactly one band and nothing is counted twice.
 */
export function arBand(daysOver: number): ArBandKey {
  if (daysOver <= 0) return "current";
  if (daysOver <= 30) return "d1_30";
  if (daysOver <= 60) return "d31_60";
  if (daysOver <= 90) return "d61_90";
  return "d90";
}

export type ArTotals = Record<ArBandKey, number>;

export const emptyTotals = (): ArTotals =>
  Object.fromEntries(AR_BANDS.map((b) => [b.key, 0])) as ArTotals;

/** One invoice, as much of it as the ageing needs. */
export type ArInvoice = {
  customer: string;
  amount: number;
  daysOver: number;
};

export type ArRow = {
  customer: string;
  bands: ArTotals;
  total: number;
  invoices: number;
  /** The worst band this customer has anything in, for marking the row. */
  worst: ArBandKey;
  /** The oldest invoice on the row, in days past due. */
  oldestDays: number;
};

/**
 * How long a kind of customer is allowed to take.
 *
 * A domestic job is paid on the day or within the week — the office's rule,
 * and the one worth holding, because a homeowner who hasn't paid in a
 * fortnight usually isn't going to without a phone call. An agency pays on
 * its monthly owner-statement run, so the same seven days against Barry Plant
 * would light up every row every month and teach the room to ignore the
 * colour. The thirties on the grid are the accountant's cut; this is the
 * office's.
 */
export const TERMS = { domestic: 7, realestate: 30 } as const;

export type ArReport = {
  rows: ArRow[];
  totals: ArTotals;
  total: number;
  invoices: number;
  customers: number;
};

const ORDER: ArBandKey[] = ["d90", "d61_90", "d31_60", "d1_30", "current"];

/**
 * The report: a row per customer, biggest balance first.
 *
 * Biggest first rather than oldest, because the row a person acts on is the one
 * with the most money in it — and the age is in the column it lands in, so
 * sorting by age as well would be sorting by something already on screen.
 * A customer with nothing owing never appears: an AR report is what is owed.
 */
export function arReport(invoices: ArInvoice[]): ArReport {
  const byCustomer = new Map<string, ArRow>();
  const totals = emptyTotals();
  let total = 0;
  let count = 0;

  for (const inv of invoices) {
    const amount = Number(inv.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    // An unnamed customer is still money owed, so it gets a row rather than
    // being dropped into whichever row happens to sort first.
    const name = (inv.customer ?? "").trim() || "No customer name";
    const band = arBand(inv.daysOver);

    const row = byCustomer.get(name) ?? { customer: name, bands: emptyTotals(), total: 0, invoices: 0, worst: "current" as ArBandKey, oldestDays: 0 };
    row.bands[band] += amount;
    row.total += amount;
    row.invoices += 1;
    row.oldestDays = Math.max(row.oldestDays, inv.daysOver);
    byCustomer.set(name, row);

    totals[band] += amount;
    total += amount;
    count += 1;
  }

  for (const row of byCustomer.values()) {
    row.worst = ORDER.find((k) => row.bands[k] > 0) ?? "current";
  }

  const rows = [...byCustomer.values()].sort((a, b) => b.total - a.total || a.customer.localeCompare(b.customer));
  return { rows, totals, total, invoices: count, customers: rows.length };
}

/** What is past due: everything but Current. The figure the page leads with. */
export const arOverdue = (t: ArTotals): number => t.d1_30 + t.d31_60 + t.d61_90 + t.d90;

/**
 * What has gone past the terms for this kind of customer.
 *
 * Counted per invoice rather than per customer row: a customer with one
 * invoice at four days and one at twelve has breached on the second, and
 * reporting their whole balance as late would overstate it.
 */
export function pastTerms(invoices: ArInvoice[], days: number): { count: number; value: number; worst: number } {
  let count = 0;
  let value = 0;
  let worst = 0;
  for (const i of invoices) {
    if (!(i.amount > 0) || i.daysOver <= days) continue;
    count += 1;
    value += i.amount;
    worst = Math.max(worst, i.daysOver);
  }
  return { count, value, worst };
}
