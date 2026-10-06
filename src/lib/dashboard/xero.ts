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
      overdue: XeroOverdue[];
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

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let overdueTotal = 0;
  let overdueCount = 0;
  let receivablesTotal = 0;
  const aging: XeroAging = { notDue: 0, d1to7: 0, d8to14: 0, d15to30: 0, d30plus: 0 };
  const overdue: XeroOverdue[] = [];

  for (const inv of json.Invoices ?? []) {
    const due = Number(inv.AmountDue ?? 0);
    if (due <= 0) continue;
    receivablesTotal += due;

    // Xero serialises dates as "/Date(1234567890000+0000)/" unless the string
    // variant is present; prefer the string form and fall back to parsing.
    const raw = inv.DueDateString ?? inv.DueDate ?? "";
    const ms = raw.startsWith("/Date(") ? Number(raw.slice(6, raw.indexOf("+"))) : Date.parse(raw);

    // A due date we cannot read is not yet overdue: calling it 30+ days late
    // would put money in the worst bucket on the strength of a parse failure.
    if (!Number.isFinite(ms) || ms >= now) {
      aging.notDue += due;
      continue;
    }

    const days = Math.floor((now - ms) / DAY);
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

  return { ok: true, overdueTotal, overdueCount, receivablesTotal, aging, overdue: overdue.slice(0, 6) };
}
