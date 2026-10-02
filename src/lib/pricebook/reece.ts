import { q, sbSelectOne, sbUpsert } from "@/lib/dashboard/db";
import type { ParsedItem } from "./reeceFile";

// Reece API client (docs.api.reecegroup.com.au).
//
// Reece's model for a tool used by one Reece customer — which this is — is
// deliberately simple: OAuth2 client_credentials for the app itself, plus a
// `Customer-Number` header naming the account on every call. There is no
// per-user login, no refresh token, no browser flow. The alternative,
// `Customer-Token`, is for multi-tenant platforms that onboard many Reece
// customers; it is supported here (see /api/reece/connect) in case Reece sets
// us up that way, and wins over the customer number when stored.
//
// What rides on the connection:
//   price file   — the whole catalogue with our contractor pricing, as one CSV
//                  generated on Reece's side (GET price-gateway/price-file),
//                  parsed by the same code as a manual maX upload
//   search       — product-gateway/search while quoting
//   PunchOut     — the user builds a cart on Reece's site; Reece form-posts a
//                  cartToken back to us and we fetch the cart
//   ordering     — order-gateway: preview, check, create
//   invoices     — invoice-gateway: headers, details, PDFs
//
// Two environments. Reece issues separate credentials for test and production;
// REECE_ENV picks the host pair, and REECE_AUTH_URL / REECE_API_BASE override it.

const env = (k: string) => process.env[k]?.trim() || undefined;

const HOSTS = {
  production: { auth: "https://auth.api.reecegroup.com.au", api: "https://open.api.reecegroup.com.au" },
  test: { auth: "https://auth.api.test.reecegroup.com.au", api: "https://open.api.test.reecegroup.com.au" },
};

export function reeceConfig() {
  const which = env("REECE_ENV") === "test" ? "test" : "production";
  const hosts = HOSTS[which];
  const apiBase = (env("REECE_API_BASE") ?? hosts.api).replace(/\/$/, "");
  return {
    env: which,
    clientId: env("REECE_CLIENT_ID"),
    clientSecret: env("REECE_CLIENT_SECRET"),
    tokenUrl: env("REECE_AUTH_URL") ?? `${hosts.auth}/oauth2/token`,
    apiBase,
    // The onboarding and PunchOut pages are browser redirects on the API host
    // unless Reece says otherwise.
    linkBase: (env("REECE_LINK_BASE") ?? apiBase).replace(/\/$/, ""),
    region: env("REECE_REGION") ?? "au",
    scopes: env("REECE_SCOPES") ?? "Default/read Default/write",
    customerNumber: env("REECE_CUSTOMER_NUMBER"),
    // PunchOut's clientId is the "domain key" — {domainKey}.api.reecegroup.com.au.
    domainKey: env("REECE_DOMAIN_KEY") ?? env("REECE_CLIENT_ID"),
    punchoutSecret: env("REECE_PUNCHOUT_SECRET"),
    priceFileFormat: env("REECE_PRICE_FILE_FORMAT") === "MAX_JSON" ? "MAX_JSON" : "MAX_CSV",
    siteUrl: (env("NEXT_PUBLIC_SITE_URL") ?? "").replace(/\/$/, ""),
  };
}

export function reeceConfigured(): boolean {
  const c = reeceConfig();
  return Boolean(c.clientId && c.clientSecret);
}

// --- app token (client_credentials) ------------------------------------------------

// Module-scoped like the ServiceTitan token: a warm lambda reuses it.
let token: { value: string; expiresAt: number } | null = null;

export type AuthProbe = { ok: true; expiresInSeconds: number } | { ok: false; status: number; detail: string };

async function requestToken(): Promise<AuthProbe & { value?: string }> {
  const c = reeceConfig();
  if (!c.clientId || !c.clientSecret) return { ok: false, status: 0, detail: "REECE_CLIENT_ID / REECE_CLIENT_SECRET not set" };

  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: c.scopes }),
    cache: "no-store",
  });

  if (!res.ok) {
    // The body is not echoed: like ServiceTitan's, it can carry the client id.
    return { ok: false, status: res.status, detail: `${res.status} ${res.statusText}` };
  }
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = json.expires_in ?? 3600;
  token = { value: json.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  return { ok: true, expiresInSeconds: expiresIn, value: json.access_token };
}

async function getToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const t = await requestToken();
  if (!t.ok) throw new Error(`Reece auth failed: ${t.detail}`);
  return t.value!;
}

/** Token exchange, bypassing the cache — for the connection check. */
export async function reeceAuthProbe(): Promise<AuthProbe> {
  const t = await requestToken();
  return t.ok ? { ok: true, expiresInSeconds: t.expiresInSeconds } : t;
}

// --- customer identity ---------------------------------------------------------------

type Stored = {
  access_token: string | null; // customer token, when onboarded as a platform
  tenant_id: string | null; // customer number
  tenant_name: string | null;
};

export type Customer =
  | { via: "customer-token"; customerToken: string; customerNumber: string | null }
  | { via: "customer-number"; customerNumber: string };

/**
 * How we identify the Reece account on each call. A stored customer token
 * (from the onboarding flow) wins; otherwise REECE_CUSTOMER_NUMBER, which is
 * what Reece sets up for a dedicated single-customer integration.
 */
export async function reeceCustomer(): Promise<Customer | null> {
  const c = reeceConfig();
  const row = await sbSelectOne<Stored>(
    "portal_integrations",
    [q.select("access_token,tenant_id,tenant_name"), q.eq("provider", "reece")].join("&"),
  ).catch(() => null);
  if (row?.access_token) return { via: "customer-token", customerToken: row.access_token, customerNumber: row.tenant_id };
  const number = c.customerNumber ?? row?.tenant_id ?? undefined;
  if (number) return { via: "customer-number", customerNumber: number };
  return null;
}

function customerHeaders(cu: Customer): Record<string, string> {
  return cu.via === "customer-token" ? { "Customer-Token": cu.customerToken } : { "Customer-Number": cu.customerNumber };
}

export type ReeceConnection =
  | { status: "not-configured" }
  | { status: "no-customer" }
  | { status: "ready"; via: Customer["via"]; customerNumber: string | null };

export async function reeceConnection(): Promise<ReeceConnection> {
  if (!reeceConfigured()) return { status: "not-configured" };
  const cu = await reeceCustomer();
  if (!cu) return { status: "no-customer" };
  return { status: "ready", via: cu.via, customerNumber: cu.customerNumber };
}

// --- HTTP -------------------------------------------------------------------------------

export class ReeceHttpError extends Error {
  constructor(public status: number, public path: string, public body: string) {
    super(`Reece ${path} failed: ${status}${body ? ` — ${body.slice(0, 300)}` : ""}`);
  }
}

type Init = {
  method?: "GET" | "POST" | "DELETE";
  params?: Record<string, string | undefined>;
  body?: unknown;
  accept?: string;
  /** Skip the customer header — for endpoints that only need the app token. */
  noCustomer?: boolean;
};

/** Raw response for a regional path, e.g. "price-gateway/price-file". */
export async function reeceRequest(path: string, init: Init = {}): Promise<Response> {
  const c = reeceConfig();
  const url = new URL(`${c.apiBase}/${c.region}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(init.params ?? {})) if (v != null && v !== "") url.searchParams.set(k, v);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${await getToken()}`,
    Accept: init.accept ?? "application/json",
  };
  if (!init.noCustomer) {
    const cu = await reeceCustomer();
    if (!cu) throw new Error("No Reece customer identity — set REECE_CUSTOMER_NUMBER or complete /api/reece/connect");
    Object.assign(headers, customerHeaders(cu));
  }
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  return fetch(url, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
}

export async function reeceJson<T>(path: string, init: Init = {}): Promise<T> {
  const res = await reeceRequest(path, init);
  if (!res.ok) throw new ReeceHttpError(res.status, path, await res.text().catch(() => ""));
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// --- onboarding (Customer-Token model) ----------------------------------------------------

/** Step 1: a request token, then the URL to send the user to. */
export async function reeceOnboardingStart(callbackUrl: string): Promise<{ requestToken: string; redirect: string }> {
  const c = reeceConfig();
  const { requestToken } = await reeceJson<{ requestToken: string }>(
    "customer-application-onboarding-gateway/request-token",
    { method: "POST", noCustomer: true },
  );
  const redirect = new URL(`${c.linkBase}/link-application/account-select`);
  redirect.searchParams.set("request_token", requestToken);
  redirect.searchParams.set("callback_url", callbackUrl);
  return { requestToken, redirect: redirect.toString() };
}

/** Step 3: swap the request token for a customer token and remember it. */
export async function reeceOnboardingFinish(requestToken: string): Promise<{ customerNumber: number; displayName: string | null }> {
  const r = await reeceJson<{ customerToken: string; customerNumber: number; displayName: string | null }>(
    "customer-application-onboarding-gateway/customer-token",
    { method: "POST", noCustomer: true, body: { requestToken } },
  );
  await sbUpsert(
    "portal_integrations",
    [
      {
        provider: "reece",
        access_token: r.customerToken,
        tenant_id: String(r.customerNumber),
        tenant_name: r.displayName,
        connected_at: new Date().toISOString(),
        connected_by: "website",
        updated_at: new Date().toISOString(),
      },
    ],
    "provider",
  );
  return { customerNumber: r.customerNumber, displayName: r.displayName };
}

// --- price file -----------------------------------------------------------------------------

export type PriceFile =
  | { status: "pending" }
  | { status: "ok"; format: "MAX_CSV"; text: string }
  | { status: "ok"; format: "MAX_JSON"; json: unknown };

/** The customer's generated price file, or `pending` when Reece has not built one yet (204). */
export async function reecePriceFile(): Promise<PriceFile> {
  const c = reeceConfig();
  const res = await reeceRequest("price-gateway/price-file", {
    params: { format: c.priceFileFormat, additionalFields: c.priceFileFormat === "MAX_JSON" ? "CATEGORY" : undefined },
    accept: c.priceFileFormat === "MAX_JSON" ? "application/json" : "text/csv, application/json",
  });
  if (res.status === 204) return { status: "pending" };
  if (!res.ok) throw new ReeceHttpError(res.status, "price-gateway/price-file", await res.text().catch(() => ""));
  if (c.priceFileFormat === "MAX_JSON") return { status: "ok", format: "MAX_JSON", json: await res.json() };
  return { status: "ok", format: "MAX_CSV", text: await res.text() };
}

/** Ask Reece to (re)build the price file. 202 means queued; it is ready some time later. */
export async function reeceTriggerPriceFile(): Promise<void> {
  const res = await reeceRequest("price-gateway/price-file/trigger-generation", { method: "POST" });
  if (!res.ok && res.status !== 202) {
    throw new ReeceHttpError(res.status, "price-gateway/price-file/trigger-generation", await res.text().catch(() => ""));
  }
}

// --- product normalisation ------------------------------------------------------------------

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
 * One product record from search, a cart, or the JSON price file → supplier item.
 *
 * The documented product shapes share `productId` as the key and carry the
 * price on a unit-of-measure: a cart line has it flat (`unitPriceExcludingGst`),
 * a search hit has a `unitOfMeasures` array. Both are read; the first UOM wins
 * for a search hit. Anything else stays in `raw`.
 */
export function toSupplierItem(r: Raw): ParsedItem | null {
  const code = asStr(first(r, "productId", "productCode", "product_code", "code", "sku"));
  if (!code) return null;

  const uoms = Array.isArray(r.unitOfMeasures) ? (r.unitOfMeasures as Raw[]) : [];
  const uom = uoms[0] ?? {};
  const price = first(r, "unitPriceExcludingGst", "priceExcludingGst", "yourPriceExGst", "price") ?? first(uom, "unitPriceExcludingGst", "priceExcludingGst", "price");
  const listPrice = first(r, "unitMarketPriceExcludingGst", "marketPriceExcludingGst", "listPrice") ?? first(uom, "unitMarketPriceExcludingGst", "marketPriceExcludingGst");
  const gstRate = asNum(first(r, "gstRate") ?? first(uom, "gstRate"));

  return {
    code,
    description: asStr(first(r, "productTitle", "productDescription", "description", "title", "name")),
    uom: asStr(first(r, "unitOfMeasure") ?? first(uom, "unitOfMeasure", "code", "name")),
    pack_qty: asNum(first(r, "packQuantity", "packQty") ?? first(uom, "packQuantity", "quantity")),
    cost: asNum(price),
    gst_applies: gstRate == null ? true : gstRate > 0,
    list_price: asNum(listPrice),
    category: asStr(first(r, "category", "section")),
    barcode: asStr(first(r, "barcode", "ean")),
    raw: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])),
  };
}

// --- search -----------------------------------------------------------------------------------

export type SearchResult = { totalResults: number; gstRate: number | null; items: ParsedItem[] };

/** product-gateway/search — searchPhrase must be 3–30 characters, pageSize ≤ 100. */
export async function reeceSearch(phrase: string, pageSize = 25, pageNumber = 1): Promise<SearchResult> {
  const searchPhrase = phrase.trim().slice(0, 30);
  if (searchPhrase.length < 3) throw new Error("Reece search needs at least 3 characters");
  const res = await reeceJson<Raw>("product-gateway/search", {
    params: { searchPhrase, pageNumber: String(pageNumber), pageSize: String(Math.min(100, Math.max(1, pageSize))) },
  });
  const list = Array.isArray(res.products) ? (res.products as Raw[]) : [];
  return {
    totalResults: asNum(res.totalResults) ?? list.length,
    gstRate: asNum(res.gstRate),
    items: list.map(toSupplierItem).filter((i): i is ParsedItem => i != null),
  };
}

// --- PunchOut -----------------------------------------------------------------------------------

/** Where to send the user to build a cart on Reece's site. */
export async function reecePunchoutUrl(hookUrl: string): Promise<string> {
  const c = reeceConfig();
  if (!c.domainKey) throw new Error("REECE_DOMAIN_KEY (or REECE_CLIENT_ID) is not set");
  const cu = await reeceCustomer();
  if (!cu) throw new Error("No Reece customer identity");
  const url = new URL(`${c.linkBase}/punch-out-catalog/gateway`);
  url.searchParams.set("clientId", c.domainKey);
  url.searchParams.set("hookUrl", hookUrl);
  if (cu.via === "customer-token") url.searchParams.set("customerToken", cu.customerToken);
  else url.searchParams.set("customerNumber", cu.customerNumber);
  return url.toString();
}

export type CartLine = {
  productId: number;
  description: string | null;
  quantity: number;
  unitOfMeasure: string | null;
  unitPriceExcludingGst: number | null;
  unitPriceIncludingGst: number | null;
  gstRate: number | null;
  quoteNumber: number | null;
  quoteLineNumber: number | null;
};

/** The cart the user built, by the token Reece posted back. */
export async function reeceCart(cartToken: string): Promise<{ lines: CartLine[]; raw: unknown }> {
  const cu = await reeceCustomer();
  const raw = await reeceJson<Raw>(`punch-out-cart/cart/${encodeURIComponent(cartToken)}`, {
    params: cu?.via === "customer-token" ? { customerToken: cu.customerToken } : { customerNumber: cu?.customerNumber },
  });
  const list = Array.isArray(raw.products) ? (raw.products as Raw[]) : [];
  const lines = list
    .map((p) => ({
      productId: asNum(p.productId) ?? 0,
      description: asStr(first(p, "productDescription", "productTitle", "description")),
      quantity: asNum(p.quantity) ?? 1,
      unitOfMeasure: asStr(p.unitOfMeasure),
      unitPriceExcludingGst: asNum(p.unitPriceExcludingGst),
      unitPriceIncludingGst: asNum(p.unitPriceIncludingGst),
      gstRate: asNum(p.gstRate),
      quoteNumber: asNum(p.quoteNumber),
      quoteLineNumber: asNum(p.quoteLineNumber),
    }))
    .filter((l) => l.productId > 0);
  return { lines, raw };
}

// --- ordering -------------------------------------------------------------------------------------

export type OrderProduct = {
  productId: number;
  quantity: number;
  unitOfMeasure?: string | null;
  unitPriceExcludingGst?: number | null;
  unitPriceIncludingGst?: number | null;
  quoteNumber?: number | null;
  quoteLineNumber?: number | null;
};

export type OrderRequest = {
  jobName?: string;
  orderNumber?: string;
  orderByName: string;
  orderByPhone: string;
  orderByEmail?: string;
  comment?: string;
  /** Local time, yyyy-MM-ddTHH:mm:ss, in the future. */
  requiredByDateTime: string;
  notification?: { email?: string; sms?: string };
  fulfillment:
    | { type: "PICKUP"; pickupBranch: number }
    | { type: "DELIVERY"; deliveryDetails: Record<string, unknown> };
  products: OrderProduct[];
};

/** order-gateway: `preview` prices it, `check` validates it, `create` places it. */
export async function reeceOrder(mode: "preview" | "check" | "create", order: OrderRequest): Promise<unknown> {
  const path = mode === "create" ? "order-gateway/orders" : `order-gateway/${mode}`;
  return reeceJson<unknown>(path, { method: "POST", body: order });
}

export type Branch = { branchNumber: string; name: string; shortName: string | null; telephone: string | null; emailAddress: string | null };

export async function reeceBranches(): Promise<Branch[]> {
  const res = await reeceJson<{ branches?: Raw[] }>("branches");
  return (res.branches ?? []).map((b) => ({
    branchNumber: String(b.branchNumber ?? ""),
    name: String(b.name ?? ""),
    shortName: asStr(b.shortName),
    telephone: asStr(b.telephone),
    emailAddress: asStr(b.emailAddress),
  }));
}

// --- invoices ---------------------------------------------------------------------------------------

export type InvoiceHeader = {
  documentNumber: number;
  documentType: string;
  documentDate: string;
  customerNumber: number | null;
  jobNumber: string | null;
  orderNumber: string | null;
};

export async function reeceInvoiceHeaders(fromDate: string, toDate: string, types = "TAX_INVOICE,CREDIT_NOTE,CASH_SALE_INVOICE,CASH_REFUND"): Promise<InvoiceHeader[]> {
  const res = await reeceJson<{ documentHeaders?: Raw[] }>("invoice-gateway/invoice-headers", {
    params: { documentTypes: types, fromDate, toDate },
  });
  return (res.documentHeaders ?? [])
    .map((h) => ({
      documentNumber: asNum(h.documentNumber) ?? 0,
      documentType: String(h.documentType ?? ""),
      documentDate: String(h.documentDate ?? ""),
      customerNumber: asNum(h.customerNumber),
      jobNumber: asStr(h.jobNumber),
      orderNumber: asStr(h.orderNumber),
    }))
    .filter((h) => h.documentNumber > 0);
}

/** Full invoices for up to 100 document numbers. */
export async function reeceInvoices(documentNumbers: number[]): Promise<Raw[]> {
  if (!documentNumbers.length) return [];
  const res = await reeceJson<{ documents?: Raw[] }>("invoice-gateway/invoices", {
    params: { documentNumbers: documentNumbers.slice(0, 100).join(",") },
  });
  return res.documents ?? [];
}

/** The PDF of one invoice. */
export async function reeceInvoicePdf(documentNumber: number): Promise<Response> {
  return reeceRequest("invoice-gateway/invoice-documents", {
    params: { documentNumbers: String(documentNumber) },
    accept: "application/pdf",
  });
}

// --- storage shared by the price-file pull and the manual upload ------------------------------

export async function upsertSupplierItems(items: ParsedItem[], source: "file" | "api", supplier = "reece"): Promise<number> {
  const now = new Date().toISOString();
  let written = 0;
  for (let i = 0; i < items.length; i += 1000) {
    const rows = items.slice(i, i + 1000).map((it) => ({
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
