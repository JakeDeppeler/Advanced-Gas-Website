import {
  stAuthProbe,
  stCredentialHygiene,
  stCredentialStatus,
  stEndpoints,
  stProbe,
  serviceTitanConfigured,
} from "./servicetitan";

// Verifies a ServiceTitan tenant link, one stage at a time.
//
// Four separate things have to be right before the sync returns a single row:
// the client id/secret pair, the app key, the tenant id, and the per-API scopes
// ticked on the developer portal app. ServiceTitan reports every one of those as
// a bare 401, 403 or 404 on whichever call happens to run first, so a failing
// sync says "estimates: 403" and nothing about which of the four is wrong.
//
// This walks the stages in dependency order and stops at the first one that
// breaks, because every later probe would fail for the same reason and the extra
// red herrings are what make this hard to debug.

/**
 * Each sync resource and the scope that authorises it.
 *
 * The probes hit the plain *list* endpoint rather than the `export/` one the
 * sync uses: both sit under the same API scope, so a green list probe means the
 * export will authorise too, and the list call can be capped at one record
 * instead of streaming a tenant's entire history for a health check.
 */
const PROBES: Array<{
  module: string;
  resource: string;
  scope: string;
  usedFor: string;
}> = [
  { module: "settings", resource: "business-units", scope: "Settings", usedFor: "business unit labels" },
  { module: "settings", resource: "technicians", scope: "Settings", usedFor: "sales leaderboard names" },
  { module: "jpm", resource: "job-types", scope: "Job Planning & Management", usedFor: "job type labels" },
  { module: "jpm", resource: "jobs", scope: "Job Planning & Management", usedFor: "jobs completed / booked" },
  { module: "accounting", resource: "invoices", scope: "Accounting", usedFor: "revenue, daily target, job type profit" },
  { module: "sales", resource: "estimates", scope: "Sales & Estimates", usedFor: "quotes open, close rate, leaderboard" },
  { module: "crm", resource: "leads", scope: "CRM", usedFor: "ServiceTitan lead counts" },
];

function explainProbe(status: number, scope: string): string {
  if (status === 401) return "App key rejected, or the token is not valid for this tenant.";
  if (status === 403) return `The "${scope}" scope is not granted to this app for this tenant — tick it in the developer portal and have the tenant re-authorise.`;
  if (status === 404) return "Tenant id is wrong, or this resource is not available on the tenant's plan.";
  if (status === 429) return "Rate limited. Not a credential problem — retry in a minute.";
  if (status >= 500) return "ServiceTitan is erroring. Not a credential problem.";
  return `Unexpected status ${status}.`;
}

function explainAuth(status: number, code: string | null): string {
  if (code === "invalid_client") return "ST_CLIENT_ID or ST_CLIENT_SECRET is wrong. Note the secret is shown only once, at creation — regenerate it if it was not recorded.";
  if (code === "invalid_scope") return "The app has no API scopes at all. Tick the scopes it needs in the developer portal.";
  if (code === "unsupported_grant_type") return "The auth URL is not the client-credentials token endpoint — check ST_AUTH_URL.";
  if (status === 400) return "Rejected as malformed. Usually a credential pasted with a trailing newline or a stray quote — see the format stage above.";
  // ServiceTitan's token endpoint answers bad credentials with 400, not 403, so
  // a 403 here generally means something in front of it answered instead.
  if (status === 403) return "Forbidden before ServiceTitan answered — an egress proxy, firewall or WAF in front of the deployment is intercepting the token request. Confirm the host can reach auth.servicetitan.io directly.";
  if (status === 404) return "Auth URL not found. Check ST_AUTH_URL — the integration (sandbox) environment uses a different host.";
  return `Token exchange failed with ${status}${code ? ` (${code})` : ""}.`;
}

export type CheckStage = {
  stage: string;
  status: "ok" | "failed" | "skipped";
  detail?: string;
  fix?: string;
};

export type CheckReport = {
  linked: boolean;
  environment: { authUrl: string; apiBase: string };
  credentials: Record<string, boolean>;
  stages: CheckStage[];
  resources: Array<{
    resource: string;
    scope: string;
    usedFor: string;
    status: "ok" | "failed" | "skipped";
    records?: number | null;
    httpStatus?: number;
    fix?: string;
  }>;
};

export async function checkServiceTitan(): Promise<CheckReport> {
  const credentials = stCredentialStatus();
  const stages: CheckStage[] = [];
  const report: CheckReport = {
    linked: false,
    environment: stEndpoints(),
    credentials,
    stages,
    resources: [],
  };

  const missing = Object.entries(credentials)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  if (!serviceTitanConfigured()) {
    stages.push({
      stage: "credentials",
      status: "failed",
      detail: `Not set: ${missing.join(", ")}`,
      fix: "Set ST_CLIENT_ID, ST_CLIENT_SECRET, ST_APP_KEY and ST_TENANT_ID in the deployment environment, then redeploy — Next.js reads them at runtime, but a running instance keeps the old values.",
    });
    report.resources = PROBES.map((p) => ({
      resource: `${p.module}/${p.resource}`,
      scope: p.scope,
      usedFor: p.usedFor,
      status: "skipped" as const,
    }));
    return report;
  }

  stages.push({ stage: "credentials", status: "ok", detail: "All four present" });

  // Reported, not enforced: these are near-certain misconfigurations, but the
  // auth probe below still runs so a surprise success is visible rather than
  // blocked on a guess about formatting.
  const hygiene = stCredentialHygiene();
  const formatProblems = [
    ...hygiene.untrimmed.map((name) => `${name} has leading or trailing whitespace`),
    ...(hygiene.tenantIdNumeric ? [] : ["ST_TENANT_ID is not numeric — ServiceTitan tenant ids are, so this is probably the tenant name"]),
  ];

  stages.push(
    formatProblems.length === 0
      ? { stage: "format", status: "ok", detail: "All four well-formed" }
      : {
          stage: "format",
          status: "failed",
          detail: formatProblems.join("; "),
          fix: "Re-paste the affected values with no surrounding whitespace. A trailing newline survives a copy out of the developer portal and is invisible in every dashboard that stores it.",
        },
  );

  const auth = await stAuthProbe().catch((e: Error) => ({
    ok: false as const,
    status: 0,
    code: null,
    thrown: e.message,
  }));

  if (!auth.ok) {
    stages.push({
      stage: "auth",
      status: "failed",
      detail: "thrown" in auth ? auth.thrown : `HTTP ${auth.status}`,
      fix: "thrown" in auth
        ? "Could not reach the token endpoint at all — check outbound network access and ST_AUTH_URL."
        : explainAuth(auth.status, auth.code),
    });
    report.resources = PROBES.map((p) => ({
      resource: `${p.module}/${p.resource}`,
      scope: p.scope,
      usedFor: p.usedFor,
      status: "skipped" as const,
    }));
    return report;
  }

  stages.push({
    stage: "auth",
    status: "ok",
    detail: `Token issued, valid ${auth.expiresInSeconds}s`,
  });

  // Every probe shares one token, so a per-resource failure from here on is a
  // scope or tenant problem rather than an authentication one.
  for (const p of PROBES) {
    try {
      const probe = await stProbe(p.module, p.resource);
      report.resources.push(
        probe.ok
          ? {
              resource: `${p.module}/${p.resource}`,
              scope: p.scope,
              usedFor: p.usedFor,
              status: "ok",
              records: probe.totalCount,
              httpStatus: probe.status,
            }
          : {
              resource: `${p.module}/${p.resource}`,
              scope: p.scope,
              usedFor: p.usedFor,
              status: "failed",
              httpStatus: probe.status,
              fix: explainProbe(probe.status, p.scope),
            },
      );
    } catch (e) {
      report.resources.push({
        resource: `${p.module}/${p.resource}`,
        scope: p.scope,
        usedFor: p.usedFor,
        status: "failed",
        fix: (e as Error).message,
      });
    }
  }

  const failed = report.resources.filter((r) => r.status === "failed");
  stages.push(
    failed.length === 0
      ? { stage: "scopes", status: "ok", detail: "All seven endpoints reachable" }
      : {
          stage: "scopes",
          status: "failed",
          detail: `${failed.length} of ${report.resources.length} endpoints rejected`,
          // A 403 on every endpoint is one missing authorisation, not seven.
          fix: failed.every((r) => r.httpStatus === 403)
            ? "Every endpoint returned 403, which usually means the tenant has not authorised the app at all rather than that each scope is missing. Have the tenant connect it under Settings → Integrations → API Application Access."
            : "See the per-resource fixes below. The dashboard still runs on whatever authorises — a failed resource leaves its tiles on their last known value.",
        },
  );

  report.linked = failed.length === 0;
  return report;
}
