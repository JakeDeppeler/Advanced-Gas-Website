import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/dashboard/screenAuth";
import { reeceAuthProbe, reeceConfig, reeceConfigured, reeceConnection, reeceRequest } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Read-only diagnostic for the Reece link, in dependency order, stopping at
// the first failure: credentials present → token exchange → customer identity
// → one cheap call per capability. Each failing stage names what to change.
// Returns 200 even when broken: the body is the report.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/reece/check

/** Reece's own words from an error body ({"errors":[{"message":…}]}), or nothing. */
function reeceSaid(body: string): string {
  try {
    const m = (JSON.parse(body) as { errors?: { message?: string }[] }).errors?.map((e) => e.message).filter(Boolean).join("; ");
    return (m ?? "").slice(0, 200);
  } catch {
    return "";
  }
}

type Stage = { stage: string; status: "ok" | "failed" | "skipped"; detail?: string; fix?: string };

export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });

  const c = reeceConfig();
  const stages: Stage[] = [];
  const report = {
    linked: false,
    environment: { env: c.env, tokenUrl: c.tokenUrl, apiBase: c.apiBase, region: c.region },
    credentials: { clientId: Boolean(c.clientId), clientSecret: Boolean(c.clientSecret), customerNumber: Boolean(c.customerNumber), punchoutSecret: Boolean(c.punchoutSecret) },
    stages,
  };
  const done = () => NextResponse.json(report);

  if (!reeceConfigured()) {
    stages.push({ stage: "credentials", status: "failed", detail: "REECE_CLIENT_ID / REECE_CLIENT_SECRET not set", fix: "Set both from Reece's credentials, then redeploy." });
    return done();
  }
  stages.push({ stage: "credentials", status: "ok", detail: `client id and secret present (${c.env})` });

  const auth = await reeceAuthProbe().catch((e: Error) => ({ ok: false as const, status: 0, detail: e.message }));
  if (!auth.ok) {
    stages.push({
      stage: "auth",
      status: "failed",
      detail: auth.detail,
      fix:
        /invalid_scope/.test(auth.detail)
          ? "The login isn't allowed the scopes asked for, even with none named. Ask Reece which scopes it carries and set REECE_SCOPES to them."
          : /unauthorized_client/.test(auth.detail)
            ? "Reece hasn't enabled this login for the client-credentials sign-in the portal uses. Ask Reece to enable it for API access."
          : auth.status === 401 || auth.status === 400
          ? "Client id or secret rejected. Check for whitespace from the paste, and that the credentials match REECE_ENV (test credentials only work against the test hosts)."
          : auth.status === 0
            ? "Could not reach the token endpoint — check outbound network access and REECE_AUTH_URL."
            : `Token endpoint answered ${auth.status}.`,
    });
    return done();
  }
  stages.push({ stage: "auth", status: "ok", detail: `Token issued, valid ${auth.expiresInSeconds}s` });

  const conn = await reeceConnection();
  if (conn.status !== "ready") {
    stages.push({ stage: "customer", status: "failed", detail: "no customer identity", fix: "Set REECE_CUSTOMER_NUMBER to the Reece account number, or complete /api/reece/connect?k=<SCREEN_TOKEN> if Reece set us up as a platform." });
    return done();
  }
  stages.push({ stage: "customer", status: "ok", detail: `${conn.via}${conn.customerNumber ? ` ${conn.customerNumber}` : ""}` });

  const probes: Array<{ stage: string; path: string; params?: Record<string, string>; accept?: string; okStatuses?: number[]; usedFor: string }> = [
    { stage: "branches", path: "branches", usedFor: "pickup branch list for orders" },
    { stage: "search", path: "product-gateway/search", params: { searchPhrase: "copper", pageSize: "1" }, usedFor: "item search while quoting" },
    // JSON allowed as well as CSV, as the nightly pull asks: Reece writes its
    // refusals as JSON, and with CSV alone it answers 406 instead of the 403.
    { stage: "price-file", path: "price-gateway/price-file", params: { format: "MAX_CSV" }, accept: "text/csv, application/json", okStatuses: [200, 204], usedFor: "nightly catalogue pull" },
    { stage: "invoices", path: "invoice-gateway/invoice-headers", params: { documentTypes: "TAX_INVOICE", fromDate: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10) }, usedFor: "invoice sync" },
  ];

  let failed = 0;
  for (const p of probes) {
    try {
      const res = await reeceRequest(p.path, { params: p.params, accept: p.accept });
      const ok = (p.okStatuses ?? [200]).includes(res.status);
      // A price file can be large and nothing here needs it; a refusal is
      // short and says why ("not authorized to access any customers"), so
      // that is kept for the report.
      const text = await res.text().catch(() => "");
      const body = ok ? "" : text.slice(0, 300);
      if (ok) {
        stages.push({ stage: p.stage, status: "ok", detail: res.status === 204 ? "reachable, no price file generated yet" : `HTTP ${res.status}` });
      } else {
        failed++;
        stages.push({
          stage: p.stage,
          status: "failed",
          detail: `HTTP ${res.status} (${p.usedFor})${reeceSaid(body) ? `: ${reeceSaid(body)}` : ""}`,
          fix:
            res.status === 403 || res.status === 401
              ? "Reece has not enabled this capability for the app, or the customer number is not linked to it. Ask ConnectingCustomers@reece.com.au."
              : res.status === 404 && p.stage === "price-file"
                ? "No price file built for the account yet (every other Reece call answers, so the address is right). The nightly Pricebook sync now asks Reece to build one; it lands a night or so later. If it doesn't, choose the price-file setting in maX (Typical)."
              : res.status === 404
                ? "Endpoint not found on this host — check REECE_API_BASE / REECE_REGION."
                : "See detail.",
        });
      }
    } catch (e) {
      failed++;
      stages.push({ stage: p.stage, status: "failed", detail: (e as Error).message });
    }
  }

  report.linked = failed === 0;
  return done();
}
