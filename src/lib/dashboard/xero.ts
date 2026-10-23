import { arBand, type ArInvoice } from "@/lib/portal/ar";
import { agePayables, daysBetween, emptyAging, type Aging, type OnTerms, type XeroBill, type XeroPayables } from "./payablesTypes";
import { isoDateMelbourne } from "./dates";
import { q, sbSelectOne } from "./db";

// Read-only Xero access for the dashboard.
//
// IMPORTANT: this module deliberately does NOT refresh the Xero token.
//
// Xero rotates the refresh token on every refresh — the old one dies the moment
// a new one is issued. The internal portal already owns that refresh loop and
// stores the result in portal_integrations. If the dashboard refreshed as well,
// the two would race and whichever refreshed second would invalidate the other,
// silently breaking the live Xero connection.
//
// So: use the stored access token while it is valid, and when it isn't, report
// the Xero source as stale and let the tile carry its last known value forward.
// The fix for persistent staleness is on the portal side, not here.

const XERO_API = "https://api.xero.com/api.xro/2.0";

type Integration = {
  tenant_id: string | null;
  access_token: string | null;
  expires_at: string | null;
};

/** What is owed to us, split by how long it has been owed. */
export type XeroAging = { notDue: number; d1to7: number; d8to14: number; d15to30: number; d30plus: number };

/**
 * The same money in the accountant's bands, which is the cut the AR report
 * uses: not due, then thirties. See portal/ar.ts, whose `arBand` draws the
 * boundaries so the wall and the report agree to the dollar.
 *
 * Both cuts, not one. The fortnight above answers "is anything slipping this
 * week", which is what a board four metres away is for; the thirties answer
 * "what are we about to lose", which is the question the money page asks of
 * both ledgers at once — and it is the shape the office already reads in
 * ServiceTitan, so putting a different one beside the bills would invite the
 * room to reconcile two reports that were never the same report.
 */
export type XeroArAging = Aging;

/**
 * What we owe: authorised purchase bills with money still on them, aged by
 * payablesTypes.ts — read from the same stored token the receivables use and
 * under the same rule, that this file never refreshes it.
 */
export type { XeroBill, XeroPayables };

export type XeroPayablesResult = ({ ok: true } & XeroPayables) | { ok: false; reason: string };

/**
 * One overdue invoice, for the chase list.
 *
 * It carries the customer's name. That was left off at first, on the grounds
 * that the board hangs where people walk past and a named debt is a different
 * thing from a figure — but it is Jake's office and his wall, and the list is
 * useless for its one job if whoever picks up the phone has to go and look up
 * six invoice numbers before they can ring anybody. The number stays under the
 * name, smaller, the way the quote list carries a job number.
 */
export type XeroOverdue = { number: string; name: string | null; days: number; amount: number };

export type XeroResult =
  | {
      ok: true;
      overdueTotal: number;
      overdueCount: number;
      receivablesTotal: number;
      aging: XeroAging;
      /** The same money in the AR report's thirties; see XeroArAging. */
      arAging: XeroArAging;
      /**
       * Every unpaid invoice as the AR report wants it: who owes it, how much,
       * how late. Not stored in the snapshot — the snapshot keeps the finished
       * report, a row per customer, because that is what the wall shows and a
       * hundred invoices is not.
       */
      rows: ArInvoice[];
      /** Every overdue invoice, oldest first; the wall shows the top six. */
      overdue: XeroOverdue[];
      /** Every unpaid invoice's number, so another source's copy isn't counted twice. */
      numbers: string[];
    }
  | { ok: false; reason: string };

async function currentToken(): Promise<{ token: string; tenant: string } | { error: string }> {
  let row: Integration | null;
  try {
    row = await sbSelectOne<Integration>(
      "portal_integrations",
      [q.select("tenant_id,access_token,expires_at"), q.eq("provider", "xero")].join("&"),
    );
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!row?.access_token || !row.tenant_id) return { error: "xero not connected" };

  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : 0;
  if (!expiresAt || expiresAt <= Date.now()) {
    return { error: "xero access token expired — portal needs to refresh it" };
  }

  return { token: row.access_token, tenant: row.tenant_id };
}

/**
 * An invoice's due date as a calendar day, or null when it cannot be read.
 *
 * Xero serialises dates as "/Date(1234567890000+0000)/" unless the string
 * variant is present, so prefer the string form and fall back to parsing the
 * instant into a Melbourne day. Null is deliberately not "overdue": putting
 * money in the worst bucket on the strength of a parse failure is exactly the
 * confidently wrong figure this board is not allowed to show.
 */
function dueDayOf(inv: { DueDateString?: string; DueDate?: string }): string | null {
  const raw = inv.DueDateString ?? inv.DueDate ?? "";
  if (!raw) return null;
  const isMs = raw.startsWith("/Date(");
  const ms = isMs ? Number(raw.slice(6, raw.indexOf("+"))) : Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return isMs ? isoDateMelbourne(new Date(ms)) : raw.slice(0, 10);
}

export async function fetchXeroReceivables(): Promise<XeroResult> {
  const auth = await currentToken();
  if ("error" in auth) return { ok: false, reason: auth.error };

  // Authorised ACCREC invoices are the ones still owed to us. AmountDue is the
  // outstanding balance, so partially paid invoices count only for the remainder.
  const url = new URL(`${XERO_API}/Invoices`);
  url.searchParams.set("where", 'Type=="ACCREC"&&Status=="AUTHORISED"');
  url.searchParams.set("pageSize", "1000");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Xero-tenant-id": auth.tenant,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return { ok: false, reason: `xero ${res.status} ${res.statusText}` };

  const json = (await res.json()) as {
    Invoices?: Array<{
      AmountDue?: number;
      DueDateString?: string;
      DueDate?: string;
      InvoiceNumber?: string;
      Contact?: { Name?: string };
    }>;
  };

  const todayMel = isoDateMelbourne(new Date());
  let overdueTotal = 0;
  let overdueCount = 0;
  let receivablesTotal = 0;
  const aging: XeroAging = { notDue: 0, d1to7: 0, d8to14: 0, d15to30: 0, d30plus: 0 };
  const arAging = emptyAging();
  const overdue: XeroOverdue[] = [];
  const numbers: string[] = [];
  const rows: ArInvoice[] = [];

  for (const inv of json.Invoices ?? []) {
    const due = Number(inv.AmountDue ?? 0);
    if (due <= 0) continue;
    receivablesTotal += due;
    if (inv.InvoiceNumber) numbers.push(inv.InvoiceNumber);

    // Overdue from the day after it's due, in Melbourne — the same line the
    // portal's Owed page draws, so the count above it agrees with the rows.
    // A date that cannot be read counts as not due; see dueDayOf.
    const dueDay = dueDayOf(inv);
    const name = inv.Contact?.Name ?? "";
    if (!dueDay || dueDay >= todayMel) {
      aging.notDue += due;
      arAging.current += due;
      // Not due is still owed, so it is still a row on the report: a customer
      // with $40K coming and nothing late belongs on a page about what we are
      // owed, and leaving them off would make the rows disagree with the total
      // above them.
      rows.push({ customer: name, amount: due, daysOver: 0 });
      continue;
    }

    const days = daysBetween(dueDay, todayMel);
    arAging[arBand(days)] += due;
    rows.push({ customer: name, amount: due, daysOver: days });
    overdueTotal += due;
    overdueCount += 1;
    if (days <= 7) aging.d1to7 += due;
    else if (days <= 14) aging.d8to14 += due;
    else if (days <= 30) aging.d15to30 += due;
    else aging.d30plus += due;

    overdue.push({ number: inv.InvoiceNumber ?? "—", name: inv.Contact?.Name ?? null, days, amount: due });
  }

  // Oldest first: the chase list is worked from the top.
  overdue.sort((a, b) => b.days - a.days);

  return { ok: true, overdueTotal, overdueCount, receivablesTotal, aging, arAging, overdue, numbers, rows };
}

/**
 * What we owe our suppliers, aged the way what we are owed is aged.
 *
 * The same read-only rule as everything else in this file: the stored token,
 * never a refresh. Authorised ACCPAY invoices with an AmountDue are the bills
 * that still have to be paid; a draft one is not yet a commitment and a paid
 * one has no money on it.
 *
 * One page of a thousand. The business runs forty open bills against ten
 * suppliers, so a second page would be a hypothetical — and a truncated read
 * would understate what we owe, which is why the count is carried onto the
 * screen beside the total rather than left for somebody to assume.
 */
export async function fetchXeroPayables(onTerms: OnTerms): Promise<XeroPayablesResult> {
  const auth = await currentToken();
  if ("error" in auth) return { ok: false, reason: auth.error };

  const url = new URL(`${XERO_API}/Invoices`);
  url.searchParams.set("where", 'Type=="ACCPAY"&&Status=="AUTHORISED"');
  url.searchParams.set("pageSize", "1000");
  // Headers and line items are a megabyte of nothing for a figure and a date.
  url.searchParams.set("summaryOnly", "true");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Xero-tenant-id": auth.tenant,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  // Never the body: a Xero error can echo the client id back.
  if (!res.ok) return { ok: false, reason: `xero ${res.status} ${res.statusText}` };

  const json = (await res.json()) as {
    Invoices?: Array<{
      AmountDue?: number;
      DueDateString?: string;
      DueDate?: string;
      InvoiceNumber?: string;
      Reference?: string;
      Contact?: { Name?: string };
    }>;
  };

  const todayMel = isoDateMelbourne(new Date());
  return {
    ok: true,
    ...agePayables(
      (json.Invoices ?? []).map((inv) => ({
        supplier: inv.Contact?.Name ?? "\u2014",
        // A supplier's own invoice number is what the office matches against;
        // Xero's Reference carries it for bills raised off a statement.
        number: inv.InvoiceNumber || inv.Reference || "\u2014",
        due: dueDayOf(inv),
        amount: Number(inv.AmountDue ?? 0),
      })),
      todayMel,
      onTerms,
    ),
  };
}
