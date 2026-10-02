// ServiceTitan API v2 client.
//
// Auth is OAuth 2.0 client_credentials — the only grant ServiceTitan supports.
// Every authenticated call needs three things from the developer portal:
//   ST_CLIENT_ID / ST_CLIENT_SECRET  -> exchanged for a short-lived bearer token
//   ST_APP_KEY                       -> sent as the ST-App-Key header on every call
//   ST_TENANT_ID                     -> baked into every resource path
// Each tenant gets its own client id/secret pair.
//
// Both hostnames are env-overridable because ServiceTitan runs a separate
// integration (sandbox) environment on different hosts — point these at the
// integration pair while testing, production once the app is approved.

const AUTH_URL = process.env.ST_AUTH_URL ?? "https://auth.servicetitan.io/connect/token";
const API_BASE = process.env.ST_API_BASE ?? "https://api.servicetitan.io";

const MAX_ATTEMPTS = 4;

export function serviceTitanConfigured(): boolean {
  return Boolean(
    process.env.ST_CLIENT_ID &&
      process.env.ST_CLIENT_SECRET &&
      process.env.ST_APP_KEY &&
      process.env.ST_TENANT_ID,
  );
}

function tenantId(): string {
  const t = process.env.ST_TENANT_ID;
  if (!t) throw new Error("ST_TENANT_ID is not set");
  return t;
}

// Module-scoped so a warm lambda reuses one token across requests instead of
// re-authenticating on every call.
let token: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  // Refresh a minute early so a token never expires mid-flight.
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.ST_CLIENT_ID ?? "",
    client_secret: process.env.ST_CLIENT_SECRET ?? "",
  });

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    // Deliberately does not echo the response body — it can contain the client id.
    throw new Error(`ServiceTitan auth failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return token.value;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch a ServiceTitan path (e.g. "jpm/v2/tenant/{tenant}/export/jobs").
 * Retries on 429 and 5xx with exponential backoff, honouring Retry-After.
 * A 401 clears the cached token and retries once, which covers a token that
 * was revoked or rotated out from under a warm lambda.
 */
export async function stFetch<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }

  let lastError = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        "ST-App-Key": process.env.ST_APP_KEY ?? "",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) return (await res.json()) as T;

    if (res.status === 401 && attempt === 0) {
      token = null; // force a fresh token, then retry immediately
      continue;
    }

    const retryable = res.status === 429 || res.status >= 500;
    lastError = `${res.status} ${res.statusText}`;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) break;

    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2 ** attempt * 1000 + Math.random() * 250;
    await sleep(backoff);
  }

  throw new Error(`ServiceTitan ${path} failed: ${lastError}`);
}

/**
 * Write to a ServiceTitan path (POST/PATCH/PUT). Same retry policy as stFetch.
 *
 * ServiceTitan answers 200 for a number of writes it then ignores — a field it
 * does not recognise on that endpoint is dropped silently rather than rejected.
 * Callers that care (the pricebook sync) must read the record back and compare;
 * this helper only gets the request there.
 */
export async function stSend<T>(
  method: "POST" | "PATCH" | "PUT",
  path: string,
  body: unknown,
): Promise<T> {
  const url = `${API_BASE}/${path.replace(/^\//, "")}`;
  let lastError = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        "ST-App-Key": process.env.ST_APP_KEY ?? "",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) {
      const text = await res.text();
      return (text ? JSON.parse(text) : null) as T;
    }

    if (res.status === 401 && attempt === 0) {
      token = null;
      continue;
    }

    // Writes are not retried on 5xx: a POST that timed out server-side may
    // already have created the record, and a second attempt would duplicate it.
    const retryable = res.status === 429;
    let detail = "";
    try {
      // Validation errors carry a useful body ("code is required"). Auth
      // failures (401/403) are never read: their body can echo the client id.
      if (res.status === 400 || res.status === 404 || res.status === 409 || res.status === 422) {
        detail = (await res.text()).slice(0, 500);
      }
    } catch {
      // body unreadable — the status is still the useful part
    }
    lastError = `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) break;

    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : 2 ** attempt * 1000 + Math.random() * 250;
    await sleep(backoff);
  }

  throw new Error(`ServiceTitan ${method} ${path} failed: ${lastError}`);
}

/** "{module}/v2/tenant/{tenant}/{resource}" — every tenant-scoped path. */
export function stTenantPath(module: string, resource: string): string {
  return `${module}/v2/tenant/${tenantId()}/${resource}`;
}

export type ExportPage<T> = {
  data: T[];
  hasMore: boolean;
  continueFrom: string | null;
};

/**
 * Walk a ServiceTitan export endpoint from a continuation token.
 *
 * Export endpoints are ServiceTitan's supported way to keep an external replica
 * in sync: each response carries a `continueFrom` token that you store and pass
 * back as `from` next time to get only what has changed since. Passing nothing
 * exports from the beginning of time (the initial backfill).
 *
 * Note `includeRecentChanges` — without it, exported records only become
 * visible ~15 minutes after they change, which is too stale for a wall board.
 *
 * `pageCap` bounds a single cron invocation so the very first backfill can't run
 * past the function timeout; the stored token means the next run picks up where
 * this one stopped.
 */
export async function stExportAll<T>(
  module: string,
  resource: string,
  continueFrom: string | null,
  pageCap = 20,
): Promise<{ records: T[]; continueFrom: string | null; exhausted: boolean }> {
  const records: T[] = [];
  let cursor = continueFrom;
  let exhausted = false;

  for (let page = 0; page < pageCap; page++) {
    const res = await stFetch<ExportPage<T>>(
      `${module}/v2/tenant/${tenantId()}/export/${resource}`,
      { from: cursor ?? undefined, includeRecentChanges: "true" },
    );

    records.push(...(res.data ?? []));
    cursor = res.continueFrom ?? cursor;

    if (!res.hasMore) {
      exhausted = true;
      break;
    }
  }

  return { records, continueFrom: cursor, exhausted };
}

/** Paged read of a normal (non-export) list endpoint. */
export async function stList<T>(
  module: string,
  resource: string,
  params: Record<string, string | undefined> = {},
  pageCap = 10,
): Promise<T[]> {
  const out: T[] = [];

  for (let page = 1; page <= pageCap; page++) {
    const res = await stFetch<{ data: T[]; hasMore: boolean }>(
      `${module}/v2/tenant/${tenantId()}/${resource}`,
      { ...params, page: String(page), pageSize: "200" },
    );
    out.push(...(res.data ?? []));
    if (!res.hasMore) break;
  }

  return out;
}

// --- Connection diagnostics ---------------------------------------------------
//
// Linking a tenant fails in four distinguishable ways — wrong client id/secret,
// wrong app key, wrong tenant id, or an API scope not ticked on the developer
// portal app — and ServiceTitan reports all of them as a bare 401/403/404. The
// helpers below probe one stage at a time so the failure can be named instead of
// guessed at. They deliberately do not retry: a diagnostic wants the real status
// code, not the one four backoffs later.

export function stEndpoints(): { authUrl: string; apiBase: string } {
  return { authUrl: AUTH_URL, apiBase: API_BASE };
}

/** Which of the four credentials are present. Never reports their values. */
export function stCredentialStatus(): Record<
  "clientId" | "clientSecret" | "appKey" | "tenantId",
  boolean
> {
  return {
    clientId: Boolean(process.env.ST_CLIENT_ID),
    clientSecret: Boolean(process.env.ST_CLIENT_SECRET),
    appKey: Boolean(process.env.ST_APP_KEY),
    tenantId: Boolean(process.env.ST_TENANT_ID),
  };
}

export type AuthProbe =
  | { ok: true; expiresInSeconds: number }
  | { ok: false; status: number; code: string | null };

/**
 * Exchange the client credentials for a token, bypassing the cache.
 *
 * Surfaces only the OAuth `error` code from a failure body — that field is a
 * fixed enum (`invalid_client`, `invalid_scope`, …), so it can be shown safely,
 * unlike the rest of the body, which can echo the client id back.
 */
export async function stAuthProbe(): Promise<AuthProbe> {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.ST_CLIENT_ID ?? "",
      client_secret: process.env.ST_CLIENT_SECRET ?? "",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === "string") code = body.error;
    } catch {
      // A non-JSON error body tells us nothing we can safely show.
    }
    return { ok: false, status: res.status, code };
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  // Prime the shared cache so the scope probes that follow reuse this token
  // rather than authenticating seven more times.
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return { ok: true, expiresInSeconds: json.expires_in };
}

export type Probe = { status: number; ok: boolean; totalCount: number | null };

/** Single-attempt tenant-scoped GET. Reports the status rather than throwing. */
export async function stProbe(
  module: string,
  resource: string,
  params: Record<string, string> = {},
): Promise<Probe> {
  const url = new URL(`${API_BASE}/${module}/v2/tenant/${tenantId()}/${resource}`);
  for (const [k, v] of Object.entries({ page: "1", pageSize: "1", includeTotal: "True", ...params })) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      "ST-App-Key": process.env.ST_APP_KEY ?? "",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return { status: res.status, ok: false, totalCount: null };

  const json = (await res.json().catch(() => ({}))) as { totalCount?: unknown };
  return {
    status: res.status,
    ok: true,
    totalCount: typeof json.totalCount === "number" ? json.totalCount : null,
  };
}

/**
 * Credential problems that are invisible by inspection.
 *
 * A secret pasted into a dashboard field with a trailing newline is the single
 * most common cause of `invalid_client`, and nothing in the error says so. The
 * client deliberately does not trim the values itself — silently accepting a
 * malformed secret hides a misconfiguration that will resurface on the next
 * rotation — so this reports them instead.
 */
export function stCredentialHygiene(): { untrimmed: string[]; tenantIdNumeric: boolean | null } {
  const vars: Array<[string, string | undefined]> = [
    ["ST_CLIENT_ID", process.env.ST_CLIENT_ID],
    ["ST_CLIENT_SECRET", process.env.ST_CLIENT_SECRET],
    ["ST_APP_KEY", process.env.ST_APP_KEY],
    ["ST_TENANT_ID", process.env.ST_TENANT_ID],
  ];

  const tenant = process.env.ST_TENANT_ID?.trim();
  return {
    untrimmed: vars.filter(([, v]) => v && v !== v.trim()).map(([name]) => name),
    // ServiceTitan tenant ids are numeric; a non-numeric value is usually the
    // tenant *name* pasted in by mistake, which fails as a 404 much later.
    // null when unset — an absent value is the credentials stage's business,
    // and reporting it as malformed here would be two complaints about one gap.
    tenantIdNumeric: tenant ? /^\d+$/.test(tenant) : null,
  };
}
