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
