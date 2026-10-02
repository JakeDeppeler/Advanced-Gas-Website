import { q, sbSelectOne, sbUpsert } from "@/lib/dashboard/db";
import type { ParsedItem } from "./reeceFile";

// Reece maX API client.
//
// Reece grants API access to the software vendor, not the contractor: we are
// registered with Reece as an integration partner, the office then authorises
// our app from a maX login (OAuth authorization-code), and we hold the tokens.
// Three capabilities ride on that connection:
//
//   catalogue   — the full purchasable catalogue with our contractor pricing,
//                 pulled nightly into supplier_items (the same table the price
//                 file upload fills, so everything downstream is source-agnostic)
//   search      — item lookup while quoting
//   PunchOut    — maX posts a cart back to us (handled in /api/reece/punchout)
//
// Reece's endpoint paths and payload shapes are taken from the partner
// documentation they issue with the credentials, which is why every path here is
// an environment variable with a placeholder default rather than a constant.
// Until REECE_CLIENT_ID / REECE_CLIENT_SECRET / REECE_TOKEN_URL are set, every
// function reports "not configured" and the file-upload path carries the load.
//
// Unlike Xero (see xero.ts), this app *owns* the Reece connection — nothing else
// refreshes these tokens — so refreshing here is safe.

const env = (k: string) => process.env[k]?.trim() || undefined;

export function reeceConfig() {
  return {
    clientId: env("REECE_CLIENT_ID"),
    clientSecret: env("REECE_CLIENT_SECRET"),
    authorizeUrl: env("REECE_AUTHORIZE_URL"),
    tokenUrl: env("REECE_TOKEN_URL"),
    apiBase: env("REECE_API_BASE"),
    scopes: env("REECE_SCOPES") ?? "",
    redirectUri: env("REECE_REDIRECT_URI") ?? `${env("NEXT_PUBLIC_SITE_URL") ?? ""}/api/reece/callback`,
    cataloguePath: env("REECE_CATALOGUE_PATH") ?? "/catalogue/items",
    searchPath: env("REECE_SEARCH_PATH") ?? "/catalogue/search",
    punchoutSecret: env("REECE_PUNCHOUT_SECRET"),
  };
}

export function reeceConfigured(): boolean {
  const c = reeceConfig();
  return Boolean(c.clientId && c.clientSecret && c.tokenUrl && c.apiBase);
}

export function reeceOAuthConfigured(): boolean {
  return reeceConfigured() && Boolean(reeceConfig().authorizeUrl);
}

// --- OAuth ---------------------------------------------------------------------

export function reeceAuthorizeUrl(state: string): string {
  const c = reeceConfig();
  if (!c.authorizeUrl || !c.clientId) throw new Error("REECE_AUTHORIZE_URL and REECE_CLIENT_ID must be set");
  const url = new URL(c.authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", c.clientId);
  url.searchParams.set("redirect_uri", c.redirectUri);
  if (c.scopes) url.searchParams.set("scope", c.scopes);
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

type StoredToken = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  tenant_id: string | null;
};

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const c = reeceConfig();
  if (!c.tokenUrl || !c.clientId || !c.clientSecret) throw new Error("Reece OAuth is not configured");
  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      // Sent both ways — in the body and as basic auth — because providers
      // differ on which they read and none object to the other being present.
      Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ ...params, client_id: c.clientId, client_secret: c.clientSecret }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Reece token endpoint failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as TokenResponse;
}

async function storeToken(t: TokenResponse, previous?: StoredToken | null): Promise<void> {
  const expiresAt = new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString();
  await sbUpsert(
    "portal_integrations",
    [
      {
        provider: "reece",
        access_token: t.access_token,
        // Some providers rotate the refresh token on every refresh and some
        // never return it again; keep the previous one when a response omits it.
        refresh_token: t.refresh_token ?? previous?.refresh_token ?? null,
        expires_at: expiresAt,
        tenant_id: previous?.tenant_id ?? null,
        updated_at: new Date().toISOString(),
      },
    ],
    "provider",
  );
}

export async function reeceExchangeCode(code: string): Promise<void> {
  const c = reeceConfig();
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: c.redirectUri });
  await sbUpsert(
    "portal_integrations",
    [{ provider: "reece", connected_at: new Date().toISOString(), connected_by: "website", updated_at: new Date().toISOString() }],
    "provider",
  );
  await storeToken(t);
}

export type ReeceConnection =
  | { status: "not-configured" }
  | { status: "not-connected" }
  | { status: "connected"; expiresAt: string | null };

export async function reeceConnection(): Promise<ReeceConnection> {
  if (!reeceConfigured()) return { status: "not-configured" };
  const data = await readStored();
  if (!data?.access_token && !data?.refresh_token) return { status: "not-connected" };
  return { status: "connected", expiresAt: data.expires_at };
}

async function readStored(): Promise<StoredToken | null> {
  return sbSelectOne<StoredToken>(
    "portal_integrations",
    [q.select("access_token,refresh_token,expires_at,tenant_id"), q.eq("provider", "reece")].join("&"),
  );
}

/** A valid access token, refreshing when within a minute of expiry. */
async function accessToken(): Promise<string> {
  const data = await readStored();
  if (!data?.access_token && !data?.refresh_token) {
    throw new Error("Reece maX is not connected — open /api/reece/connect?k=<SCREEN_TOKEN> and log in with the maX account");
  }

  const expiresAt = data.expires_at ? Date.parse(data.expires_at) : 0;
  if (data.access_token && Date.now() < expiresAt - 60_000) return data.access_token;

  if (!data.refresh_token) throw new Error("Reece access token expired and no refresh token is stored — reconnect maX");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: data.refresh_token });
  await storeToken(t, data);
  return t.access_token;
}

// --- API --------------------------------------------------------------------------

export async function reeceFetch<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const c = reeceConfig();
  if (!c.apiBase) throw new Error("REECE_API_BASE is not set");
  const url = new URL(`${c.apiBase.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await accessToken()}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Reece ${path} failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

type Raw = Record<string, unknown>;

const first = (r: Raw, ...keys: string[]): unknown => {
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "") return v;
  }
  return undefined;
};
const asNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const asStr = (v: unknown): string | null => (v == null ? null : String(v));

/**
 * Normalise one catalogue record from the maX API to the supplier_items shape.
 * The candidate field names cover the conventions seen across Reece's partner
 * integrations; tighten to the documented names once the API docs are in hand.
 */
export function toSupplierItem(r: Raw): ParsedItem | null {
  const code = asStr(first(r, "productCode", "product_code", "code", "sku", "itemCode", "item_code", "partNumber", "id"));
  if (!code) return null;
  const price = first(r, "yourPrice", "your_price", "netPrice", "net_price", "tradePrice", "trade_price", "price", "unitPrice", "cost");
  const priceObj = price && typeof price === "object" ? (price as Raw) : null;
  const cost = priceObj ? asNum(first(priceObj, "exGst", "ex_gst", "net", "amount", "value")) : asNum(price);
  const gst = first(r, "gstApplicable", "gst_applicable", "taxable", "gst");
  return {
    code,
    description: asStr(first(r, "description", "productDescription", "name", "title")),
    uom: asStr(first(r, "unitOfMeasure", "unit_of_measure", "uom", "unit", "sellUnit")),
    pack_qty: asNum(first(r, "packQty", "pack_qty", "packSize", "pack_size", "multiple")),
    cost,
    gst_applies: gst == null ? true : !(gst === false || /^(n|no|0|false|free)$/i.test(String(gst))),
    list_price: asNum(first(r, "listPrice", "list_price", "rrp", "retailPrice")),
    category: asStr(first(r, "category", "productGroup", "product_group", "group")),
    barcode: asStr(first(r, "barcode", "ean", "gtin")),
    raw: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])),
  };
}

export type CataloguePage = { items: ParsedItem[]; next: string | null; rawCount: number };

/** One page of the catalogue. `cursor` is whatever the previous page said comes next (a token, a URL, or a page number). */
export async function reeceCataloguePage(cursor: string | null, pageSize = 500): Promise<CataloguePage> {
  const c = reeceConfig();
  const params: Record<string, string | undefined> = { pageSize: String(pageSize), limit: String(pageSize) };
  if (cursor) {
    if (/^\d+$/.test(cursor)) params.page = cursor;
    else params.cursor = cursor;
  }
  const res = await reeceFetch<Raw>(c.cataloguePath, params);
  const list = (first(res, "items", "data", "products", "results") ?? []) as Raw[];
  const items = Array.isArray(list) ? list.map(toSupplierItem).filter((i): i is ParsedItem => i != null) : [];

  // Next-page discovery, in order of how explicit the API is about it.
  const explicit = asStr(first(res, "nextCursor", "next_cursor", "continuationToken", "nextPageToken", "next"));
  const hasMore = first(res, "hasMore", "has_more");
  const page = asNum(first(res, "page", "pageNumber"));
  const totalPages = asNum(first(res, "totalPages", "pageCount"));
  let next: string | null = explicit ?? null;
  if (!next && page != null && ((totalPages != null && page < totalPages) || hasMore === true)) next = String(page + 1);
  if (!next && !explicit && hasMore === true && page == null) next = String((cursor && /^\d+$/.test(cursor) ? Number(cursor) : 1) + 1);

  return { items, next, rawCount: Array.isArray(list) ? list.length : 0 };
}

export async function reeceSearch(q: string, limit = 25): Promise<ParsedItem[]> {
  const c = reeceConfig();
  const res = await reeceFetch<Raw>(c.searchPath, { q, query: q, search: q, limit: String(limit), pageSize: String(limit) });
  const list = (first(res, "items", "data", "products", "results") ?? []) as Raw[];
  return Array.isArray(list) ? list.map(toSupplierItem).filter((i): i is ParsedItem => i != null) : [];
}

// --- storage shared by the API pull and the file upload ----------------------------

export async function upsertSupplierItems(items: ParsedItem[], source: "file" | "api", supplier = "reece"): Promise<number> {
  const now = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < items.length; i += 500) {
    const rows = items.slice(i, i + 500).map((it) => ({
      supplier,
      code: it.code,
      description: it.description,
      uom: it.uom,
      pack_qty: it.pack_qty,
      cost: it.cost,
      gst_applies: it.gst_applies,
      list_price: it.list_price,
      category: it.category,
      barcode: it.barcode,
      source,
      raw: it.raw,
      seen_at: now,
      updated_at: now,
    }));
    await sbUpsert("supplier_items", rows, "supplier,code");
    written += rows.length;
  }
  return written;
}
