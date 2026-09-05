import { supabase } from "./supabase";

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

export type XeroResult =
  | { ok: true; overdueTotal: number; overdueCount: number; receivablesTotal: number }
  | { ok: false; reason: string };

async function currentToken(): Promise<{ token: string; tenant: string } | { error: string }> {
  const { data, error } = await supabase()
    .from("portal_integrations")
    .select("tenant_id, access_token, expires_at")
    .eq("provider", "xero")
    .maybeSingle<Integration>();

  if (error) return { error: `portal_integrations read failed: ${error.message}` };
  if (!data?.access_token || !data.tenant_id) return { error: "xero not connected" };

  const expiresAt = data.expires_at ? Date.parse(data.expires_at) : 0;
  if (!expiresAt || expiresAt <= Date.now()) {
    return { error: "xero access token expired — portal needs to refresh it" };
  }

  return { token: data.access_token, tenant: data.tenant_id };
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
    Invoices?: Array<{ AmountDue?: number; DueDateString?: string; DueDate?: string }>;
  };

  const now = Date.now();
  let overdueTotal = 0;
  let overdueCount = 0;
  let receivablesTotal = 0;

  for (const inv of json.Invoices ?? []) {
    const due = Number(inv.AmountDue ?? 0);
    if (due <= 0) continue;
    receivablesTotal += due;

    // Xero serialises dates as "/Date(1234567890000+0000)/" unless the string
    // variant is present; prefer the string form and fall back to parsing.
    const raw = inv.DueDateString ?? inv.DueDate ?? "";
    const ms = raw.startsWith("/Date(") ? Number(raw.slice(6, raw.indexOf("+"))) : Date.parse(raw);
    if (Number.isFinite(ms) && ms < now) {
      overdueTotal += due;
      overdueCount += 1;
    }
  }

  return { ok: true, overdueTotal, overdueCount, receivablesTotal };
}
