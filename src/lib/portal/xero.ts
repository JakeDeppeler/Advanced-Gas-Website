/**
 * Xero connection — OAuth2 (authorization code + rotating refresh token) and
 * the Profit & Loss report the finance dashboard reads.
 *
 * Server-only: the client secret and the stored tokens must never reach the
 * browser. Everything degrades to "not configured" when the app credentials
 * aren't set, so the finance page shows setup steps instead of breaking.
 *
 * Setup: create a Xero app at developer.xero.com, set the redirect URI to
 * <site>/api/xero/callback, and set XERO_CLIENT_ID and XERO_CLIENT_SECRET in
 * the environment.
 */

import "server-only";
import { unstable_cache } from "next/cache";
import { site } from "@/lib/site";
import { claimIntegrationRefresh, getIntegration, saveIntegration } from "./db";

const AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const API_BASE = "https://api.xero.com/api.xro/2.0";

// This app uses Xero's granular scopes, so the P&L report needs the specific
// accounting.reports.profitandloss.read scope, not the broad accounting.reports.read.
//
// accounting.invoices.read is for the wall board's overdue tile, which reads
// authorised ACCREC invoices.
//
// It must be the granular scope, not the broad accounting.transactions.read:
// Xero split those on 2 March 2026 and apps created after that date are refused
// the old ones at the authorize step with `invalid_scope` — which rejects the
// whole string, so the connect button stops working altogether rather than
// just losing the one permission. This app already uses the granular
// accounting.reports.profitandloss.read, so it is on the new side of that line.
//
// Both are read-only. Nothing in this codebase can write to Xero.
const SCOPES = "offline_access accounting.reports.profitandloss.read accounting.invoices.read";

export function xeroConfigured(): boolean {
  return !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
}

export function redirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
  return `${base}/api/xero/callback`;
}

export function authorizeUrl(state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.XERO_CLIENT_ID || "",
    redirect_uri: redirectUri(),
    state,
  });
  // scope must be space-delimited; encode the spaces as %20 rather than the
  // '+' URLSearchParams would produce, which some servers reject.
  return `${AUTH_URL}?${p.toString()}&scope=${encodeURIComponent(SCOPES)}`;
}

function basicAuth(): string {
  const raw = `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`;
  return "Basic " + Buffer.from(raw).toString("base64");
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };

export async function exchangeCode(code: string): Promise<TokenResponse | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri() }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<TokenResponse | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

export async function getConnections(accessToken: string): Promise<{ tenantId: string; tenantName: string }[]> {
  const res = await fetch(CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const arr = (await res.json()) as { tenantId: string; tenantName: string }[];
  return arr.map((c) => ({ tenantId: c.tenantId, tenantName: c.tenantName }));
}

type XeroAuth = { accessToken: string; tenantId: string };

/**
 * How close to expiry a reader will tolerate before refreshing.
 *
 * A minute: a page about to make several Xero calls wants a token that will
 * still be good when the last of them lands, and no more than that — every
 * refresh rotates the stored refresh token, so the fewer the better.
 */
const READ_MARGIN_MS = 60_000;

/**
 * How close to expiry the keep-alive refreshes at.
 *
 * Wider than a reader's margin, because this one is not answering a question —
 * it is making sure there is a live token for whoever asks next, and it only
 * gets the chances the board's poll gives it. Five minutes is roughly twelve
 * polls of room to get one refresh through.
 */
const KEEPALIVE_MARGIN_MS = 5 * 60_000;

/**
 * How long a claimed refresh stands before another caller may take it over.
 *
 * Shorter than KEEPALIVE_MARGIN_MS on purpose: a caller that claims the lease
 * and then fails — a cold lambda killed mid-flight, a Xero timeout — must not
 * hold everybody off until the token dies. At ninety seconds against a
 * five-minute margin there are three attempts before anything is at risk.
 */
const TOKEN_LOCK_HOLD_MS = 90_000;

/** A valid access token + tenant, refreshing and re-storing if it's expired. */
async function resolveToken(marginMs = READ_MARGIN_MS): Promise<XeroAuth | null> {
  const integ = await getIntegration("xero");
  if (!integ || !integ.refreshToken || !integ.tenantId) return null;

  const exp = integ.expiresAt ? Date.parse(integ.expiresAt) : 0;
  if (integ.accessToken && exp - marginMs > Date.now()) {
    return { accessToken: integ.accessToken, tenantId: integ.tenantId };
  }

  const t = await refreshTokens(integ.refreshToken);
  if (!t) return null;
  await saveIntegration("xero", {
    accessToken: t.access_token,
    refreshToken: t.refresh_token, // rotates every use — must be saved
    expiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(),
  });
  return { accessToken: t.access_token, tenantId: integ.tenantId };
}

// The finance page asks for several reports at once, so this gets called many
// times in parallel. Xero rotates the refresh token on every use, so parallel
// refreshes race and invalidate each other — the first wins, the rest come back
// 400 and their sections of the page render blank. One refresh is shared by
// everyone waiting on it.
let tokenInFlight: Promise<XeroAuth | null> | null = null;

async function validToken(marginMs = READ_MARGIN_MS): Promise<XeroAuth | null> {
  if (!tokenInFlight) {
    tokenInFlight = resolveToken(marginMs).finally(() => { tokenInFlight = null; });
  }
  // Joining a refresh started with a narrower margin can hand back a token this
  // caller would have refreshed. Harmless: it is a valid token, and the lease
  // the keep-alive holds expires well before the token does, so the next poll
  // claims it and tries again.
  return tokenInFlight;
}

/**
 * Keep the stored Xero token alive, so a reader always finds a live one.
 *
 * Nothing used to do this. A Xero access token lives thirty minutes and the
 * only thing that ever refreshed it was somebody opening a portal Finance page,
 * so overnight it always lapsed and the wall board's overdue figures were
 * thirteen hours old by morning with the footer saying so.
 *
 * Both schedulable things call this: the GitHub Actions sync cron, and the
 * board's own refresh route. Both, because neither is enough alone — GitHub
 * does not honour a ten-minute schedule on a repository this quiet (today it
 * fired at 07:11, 16:10 and 22:45, against a token that dies in half an hour),
 * and the board only polls while a panel is switched on. Between them the token
 * is turned through the working day and overnight.
 *
 * Which means this is called from several serverless instances at once, and
 * that is the one thing a Xero refresh must never be: the refresh token rotates
 * on every use and the old one dies immediately, so a lost race does not retry,
 * it disconnects until somebody re-authorises by hand. `tokenInFlight` above is
 * a module-level promise and only collapses callers inside one instance, so the
 * claim has to be made where all the instances can see it — an atomic
 * `update ... where` on the integration row. See claimIntegrationRefresh.
 *
 * The order matters. Check whether a refresh is even due BEFORE claiming,
 * because the common case by far is a token with twenty minutes left, and that
 * case should cost one read and take no lease at all.
 */
export async function ensureXeroToken(): Promise<{ ok: boolean; reason?: string }> {
  if (!xeroConfigured()) return { ok: false, reason: "not configured" };
  try {
    const integ = await getIntegration("xero");
    if (!integ?.refreshToken || !integ.tenantId) return { ok: false, reason: "not connected" };

    const exp = integ.expiresAt ? Date.parse(integ.expiresAt) : 0;
    if (integ.accessToken && exp - KEEPALIVE_MARGIN_MS > Date.now()) {
      return { ok: true, reason: "not due" };
    }

    if (!(await claimIntegrationRefresh("xero", TOKEN_LOCK_HOLD_MS))) {
      // Somebody else has it. The token is still minutes from expiry, so the
      // right thing to do is nothing at all.
      return { ok: true, reason: "refreshing elsewhere" };
    }

    const auth = await validToken(KEEPALIVE_MARGIN_MS);
    return auth ? { ok: true, reason: "refreshed" } : { ok: false, reason: "refresh failed" };
  } catch (e) {
    // Never the response body: it can carry the client id.
    return { ok: false, reason: (e as Error).message };
  }
}

export type XeroStatus = "not-configured" | "not-connected" | "connected";

export async function xeroStatus(): Promise<{ status: XeroStatus; tenantName?: string | null }> {
  if (!xeroConfigured()) return { status: "not-configured" };
  const integ = await getIntegration("xero");
  if (!integ || !integ.refreshToken) return { status: "not-connected" };
  return { status: "connected", tenantName: integ.tenantName };
}

/* -------- Profit & Loss -------- */

export type ProfitLoss = { income: number; expenses: number; netProfit: number };

type XeroCell = { Value?: string };
type XeroRow = { RowType?: string; Title?: string; Cells?: XeroCell[]; Rows?: XeroRow[] };

function walk(rows: XeroRow[] | undefined, into: Map<string, number>) {
  if (!rows) return;
  for (const r of rows) {
    if (r.Cells && r.Cells.length >= 2) {
      const label = (r.Cells[0]?.Value || "").trim().toLowerCase();
      const last = r.Cells[r.Cells.length - 1]?.Value;
      const n = last ? parseFloat(last.replace(/[^0-9.-]/g, "")) : NaN;
      if (label && !Number.isNaN(n)) into.set(label, n);
    }
    walk(r.Rows, into);
  }
}

function pick(map: Map<string, number>, keys: string[]): number | null {
  for (const k of keys) if (map.has(k)) return map.get(k) as number;
  return null;
}

function parseReport(data: ReportJson): ProfitLoss {
  const map = new Map<string, number>();
  walk(data.Reports?.[0]?.Rows, map);
  const income = pick(map, ["total income", "total operating income", "total trading income", "total revenue"]) ?? 0;
  const opExpenses = pick(map, ["total operating expenses", "total expenses", "less operating expenses"]) ?? 0;
  const netProfit = pick(map, ["net profit", "profit for the period", "total net profit"]) ?? income - opExpenses;
  // "Money out" = everything that isn't profit (includes cost of sales, not just
  // operating expenses), so in − out always equals the profit Xero reports.
  const expenses = income - netProfit;
  return { income, expenses, netProfit };
}

/* -------- Staying inside Xero's rate limits -------- */

// Xero allows 5 calls in flight at once per organisation. One render of the
// finance page wants up to seventeen reports — five headline figures plus a
// point per month on the chart — so firing them all together earned most of
// them a 429, and a 429 read back as "no data": the blank cards and the flat
// stretches on the 12-month chart. Every report now queues through a pool,
// retries once if Xero still pushes back, and repeat date ranges are answered
// from a short-lived cache rather than asked for again.

const MAX_PARALLEL = 4;
let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  else running++;
  try {
    return await fn();
  } finally {
    // Hand the slot straight to whoever is next rather than freeing and
    // re-taking it, so the count can never drift above the cap.
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

const REPORT_CACHE_MS = 5 * 60 * 1000;
const reportCache = new Map<string, { at: number; value: ProfitLoss }>();
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type ReportJson = { Reports?: { Rows?: XeroRow[] }[] };

/** One P&L report from Xero, through the pool, retried once on a 429. */
async function rawReport(accessToken: string, tenantId: string, fromDate: string, toDate: string): Promise<ReportJson | null> {
  const url = `${API_BASE}/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`;
  return withSlot(async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, "Xero-tenant-id": tenantId, Accept: "application/json" },
        cache: "no-store",
      });
      if (res.status === 429 && attempt === 0) {
        // Xero names the wait in whole seconds; cap it so one slow report can't
        // hold up the whole page.
        const after = parseInt(res.headers.get("Retry-After") || "", 10);
        await sleep(Math.min(Number.isNaN(after) ? 2 : after, 5) * 1000);
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as ReportJson;
    }
    return null;
  });
}

/**
 * The same report, shared by every server instance for five minutes.
 *
 * The in-memory cache below only helps the instance that filled it, and on
 * Vercel a quiet portal is a cold one: the first person to open Finance after
 * lunch paid for seventeen reports, four at a time. This is the deployment's
 * shared data cache instead, keyed on the organisation and the span — never on
 * the token, which rotates every half hour.
 *
 * The token is fetched inside, so a hit costs no token read at all. A failure
 * throws rather than returning null, because unstable_cache keeps whatever is
 * returned: a cached "no answer" would hold a page blank for five minutes after
 * one 429. The summary and the line-by-line view are the same report parsed two
 * ways, so they share one entry, and a page wanting both makes one call.
 */
const sharedReport = unstable_cache(
  async (tenantId: string, fromDate: string, toDate: string): Promise<ReportJson> => {
    const tok = await validToken();
    if (!tok || tok.tenantId !== tenantId) throw new Error("xero: no token");
    const data = await rawReport(tok.accessToken, tenantId, fromDate, toDate);
    if (!data) throw new Error("xero: no report");
    return data;
  },
  ["xero-pl-report"],
  { revalidate: 300, tags: ["xero-reports"] },
);

async function plFetch(_accessToken: string, tenantId: string, fromDate: string, toDate: string): Promise<ProfitLoss | null> {
  const key = `${tenantId}|${fromDate}|${toDate}`;
  const hit = reportCache.get(key);
  if (hit && Date.now() - hit.at < REPORT_CACHE_MS) return hit.value;

  const data = await sharedReport(tenantId, fromDate, toDate).catch(() => null);
  const value = data ? parseReport(data) : null;

  // Only a real answer is worth keeping — caching a failure would hold the page
  // blank for five minutes after a single hiccup.
  if (value) reportCache.set(key, { at: Date.now(), value });
  return value;
}

/* -------- The profit & loss itself, line by line -------- */

export type PLLine = { label: string; amount: number };
export type PLSection = { title: string; kind: "in" | "out" | "summary"; lines: PLLine[]; total: number };
export type PLDetail = {
  sections: PLSection[];
  income: number; costOfSales: number; grossProfit: number | null;
  operatingExpenses: number; netProfit: number;
};

const cellNum = (v: string | undefined): number | null => {
  if (!v) return null;
  const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? null : n;
};

// Xero titles its expense sections "Less Operating Expenses"; the "Less" is a
// bookkeeping convention, not something a reader needs.
const tidyTitle = (t: string) => t.replace(/^less\s+/i, "").trim();

const sectionKind = (title: string): "in" | "out" => (
  /income|revenue|sales|profit/i.test(title) && !/cost of sales/i.test(title) ? "in" : "out"
);

/**
 * The report broken into its sections rather than flattened to totals.
 *
 * Xero nests a P&L as Sections holding Rows (the account lines) and a
 * SummaryRow (the section total). The profit sections carry no Title of their
 * own, so their summary row's label stands in for one.
 */
function parseDetail(data: { Reports?: { Rows?: XeroRow[] }[] }): PLDetail {
  const sections: PLSection[] = [];
  const totals = new Map<string, number>();

  // Sections can sit inside sections depending on how an org has its chart of
  // accounts arranged, so this walks the tree rather than assuming one level.
  function readSection(sec: XeroRow) {
    const lines: PLLine[] = [];
    let total: number | null = null;
    let title = (sec.Title || "").trim();

    for (const r of sec.Rows ?? []) {
      if (r.RowType === "Section") { readSection(r); continue; }
      const cells = r.Cells;
      if (!cells || cells.length < 2) continue;
      const label = (cells[0]?.Value || "").trim();
      const amount = cellNum(cells[cells.length - 1]?.Value);
      if (!label || amount === null) continue;
      if (r.RowType === "SummaryRow") {
        total = amount;
        totals.set(label.toLowerCase(), amount);
        if (!title) title = label;
      } else {
        lines.push({ label, amount });
      }
    }

    if (!title) return;
    if (total === null) {
      if (!lines.length) return;
      total = lines.reduce((a, l) => a + l.amount, 0);
    }
    const clean = tidyTitle(title);
    sections.push({ title: clean, kind: lines.length ? sectionKind(clean) : "summary", lines, total });
  }

  for (const sec of data.Reports?.[0]?.Rows ?? []) {
    if (sec.RowType === "Section") readSection(sec);
  }

  const at = (keys: string[]): number | null => {
    for (const k of keys) if (totals.has(k)) return totals.get(k) as number;
    return null;
  };
  const income = at(["total income", "total operating income", "total trading income", "total revenue"]) ?? 0;
  const costOfSales = at(["total cost of sales", "total less cost of sales"]) ?? 0;
  const grossProfit = at(["gross profit"]);
  const operatingExpenses = at(["total operating expenses", "total expenses", "total less operating expenses"]) ?? 0;
  const netProfit = at(["net profit", "profit for the period", "total net profit"]) ?? income - costOfSales - operatingExpenses;

  return { sections, income, costOfSales, grossProfit, operatingExpenses, netProfit };
}

async function detailFetch(tenantId: string, fromDate: string, toDate: string): Promise<PLDetail | null> {
  const data = await sharedReport(tenantId, fromDate, toDate).catch(() => null);
  return data ? parseDetail(data) : null;
}

const detailCache = new Map<string, { at: number; value: PLDetail }>();

export async function getPLDetail(fromDate: string, toDate: string): Promise<PLDetail | null> {
  const tok = await validToken();
  if (!tok) return null;
  const key = `${tok.tenantId}|${fromDate}|${toDate}`;
  const hit = detailCache.get(key);
  if (hit && Date.now() - hit.at < REPORT_CACHE_MS) return hit.value;
  const value = await detailFetch(tok.tenantId, fromDate, toDate);
  if (value) detailCache.set(key, { at: Date.now(), value });
  return value;
}

export async function getProfitAndLoss(fromDate: string, toDate: string): Promise<ProfitLoss | null> {
  const tok = await validToken();
  if (!tok) return null;
  return plFetch(tok.accessToken, tok.tenantId, fromDate, toDate);
}

/* -------- Money in vs money out, over a chosen range (for the chart) -------- */

// `ok` is false when Xero didn't answer for that span. Without it a failed read
// draws as a genuine $0 month, which is indistinguishable from a quiet month.
export type MonthPoint = { label: string; full: string; income: number; expenses: number; netProfit: number; ok: boolean };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Today's calendar date in Melbourne, as a UTC-midnight Date.
 *
 * The server runs in UTC, where at 9am in Melbourne it is still yesterday. Left
 * alone that shifted every range back a day, and on the first of a month it
 * reported the whole of last month as "this month".
 */
export function localToday(): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/* -------- The periods the P&L is read over -------- */

export type PLSpan = { from: string; to: string; label: string };
export const PL_PERIODS = [
  { k: "month", label: "This month" },
  { k: "lastmonth", label: "Last month" },
  { k: "3m", label: "Last 3 months" },
  { k: "year", label: "This year" },
] as const;
export type PLPeriod = (typeof PL_PERIODS)[number]["k"];

const MONTH_NAME = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * The exact window the money chart is showing, paired with the one before it,
 * so the profit & loss on the overview answers for the same stretch of time the
 * chart above it is drawing rather than a period of its own.
 */
export function rangeSpans(range: MoneyRange): { now: PLSpan; before: PLSpan } {
  const t = localToday();
  const Y = t.getUTCFullYear(), M = t.getUTCMonth(), D = t.getUTCDate();
  const day = (n: number) => new Date(Date.UTC(Y, M, D + n));
  const monthStart = (n: number) => new Date(Date.UTC(Y, M + n, 1));
  const dayBefore = (d: Date) => new Date(d.getTime() - 86_400_000);

  if (range === "7d") {
    return {
      now: { from: isoDate(day(-6)), to: isoDate(t), label: "the last 7 days" },
      before: { from: isoDate(day(-13)), to: isoDate(day(-7)), label: "the 7 days before those" },
    };
  }
  if (range === "4w") {
    return {
      now: { from: isoDate(day(-27)), to: isoDate(t), label: "the last 4 weeks" },
      before: { from: isoDate(day(-55)), to: isoDate(day(-28)), label: "the 4 weeks before those" },
    };
  }
  if (range === "3m") {
    return {
      now: { from: isoDate(monthStart(-2)), to: isoDate(t), label: "the last 3 months" },
      before: { from: isoDate(monthStart(-5)), to: isoDate(dayBefore(monthStart(-2))), label: "the 3 months before those" },
    };
  }
  return {
    now: { from: isoDate(monthStart(-11)), to: isoDate(t), label: "the last 12 months" },
    before: { from: isoDate(monthStart(-23)), to: isoDate(dayBefore(monthStart(-11))), label: "the 12 months before those" },
  };
}

/**
 * The windows the Finance overview's profit & loss can be read over. Its own
 * control rather than the chart's — the chart is about the shape of money in
 * and out, this is about where it went, and you don't always want both looking
 * at the same stretch.
 */
export const OV_PERIODS = [
  { k: "7d", label: "7d" },
  { k: "month", label: "This month" },
  { k: "3m", label: "3m" },
  { k: "12m", label: "12m" },
  { k: "year", label: "Year on year" },
] as const;
export type OvPeriod = (typeof OV_PERIODS)[number]["k"];

/** The last twelve whole-ish months up to today, for reading real spend. */
export function lastTwelveMonths(): PLSpan {
  return rangeSpans("12m").now;
}

export function ovSpans(key: OvPeriod): { now: PLSpan; before: PLSpan } {
  if (key === "month" || key === "year") return plSpans(key);
  return rangeSpans(key);
}

/**
 * A period paired with the equivalent stretch before it, so the two are
 * genuinely comparable: five days into this month is measured against the
 * first five days of last month, not against a whole one.
 */
export function plSpans(key: PLPeriod): { now: PLSpan; before: PLSpan } {
  const t = localToday();
  const y = t.getUTCFullYear(), m = t.getUTCMonth(), d = t.getUTCDate();
  const monthEnd = (mm: number) => new Date(Date.UTC(y, mm + 1, 0));
  const named = (mm: number) => {
    const at = new Date(Date.UTC(y, mm, 1));
    return `${MONTH_NAME[at.getUTCMonth()]} ${at.getUTCFullYear()}`;
  };

  if (key === "lastmonth") {
    return {
      now: { from: isoDate(new Date(Date.UTC(y, m - 1, 1))), to: isoDate(monthEnd(m - 1)), label: named(m - 1) },
      before: { from: isoDate(new Date(Date.UTC(y, m - 2, 1))), to: isoDate(monthEnd(m - 2)), label: named(m - 2) },
    };
  }
  if (key === "3m") {
    // Whole months only — a part-finished month would drag the comparison down.
    return {
      now: { from: isoDate(new Date(Date.UTC(y, m - 3, 1))), to: isoDate(monthEnd(m - 1)), label: "the last 3 full months" },
      before: { from: isoDate(new Date(Date.UTC(y, m - 6, 1))), to: isoDate(monthEnd(m - 4)), label: "the 3 months before those" },
    };
  }
  if (key === "year") {
    return {
      now: { from: isoDate(new Date(Date.UTC(y, 0, 1))), to: isoDate(t), label: `${y} so far` },
      before: { from: isoDate(new Date(Date.UTC(y - 1, 0, 1))), to: isoDate(new Date(Date.UTC(y - 1, m, d))), label: `the same point in ${y - 1}` },
    };
  }
  const sameDay = Math.min(d, monthEnd(m - 1).getUTCDate());
  return {
    now: { from: isoDate(new Date(Date.UTC(y, m, 1))), to: isoDate(t), label: `${named(m)}, ${d} ${d === 1 ? "day" : "days"} in` },
    before: {
      from: isoDate(new Date(Date.UTC(y, m - 1, 1))), to: isoDate(new Date(Date.UTC(y, m - 1, sameDay))),
      label: `the first ${sameDay} ${sameDay === 1 ? "day" : "days"} of ${named(m - 1)}`,
    },
  };
}

export const MONEY_RANGES = ["7d", "4w", "3m", "12m"] as const;
export type MoneyRange = (typeof MONEY_RANGES)[number];

// Each range is a set of explicit date spans — daily for 7 days, weekly for
// 4 weeks, monthly for 3 or 12 months — so the data genuinely changes per range
// rather than leaning on Xero's periods param.
function buildSpans(range: MoneyRange): { from: string; to: string; label: string; full: string }[] {
  const today = localToday();
  const Y = today.getUTCFullYear(), M = today.getUTCMonth(), D = today.getUTCDate();
  const spans: { from: string; to: string; label: string; full: string }[] = [];
  if (range === "7d") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(Y, M, D - i));
      spans.push({ from: isoDate(d), to: isoDate(d), label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, full: `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` });
    }
  } else if (range === "4w") {
    for (let i = 3; i >= 0; i--) {
      const end = new Date(Date.UTC(Y, M, D - i * 7));
      const start = new Date(Date.UTC(Y, M, D - i * 7 - 6));
      spans.push({ from: isoDate(start), to: isoDate(end), label: `${end.getUTCDate()}/${end.getUTCMonth() + 1}`, full: `Week to ${end.getUTCDate()} ${MON[end.getUTCMonth()]}` });
    }
  } else {
    const months = range === "3m" ? 3 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const first = new Date(Date.UTC(Y, M - i, 1));
      const last = i === 0 ? today : new Date(Date.UTC(Y, M - i + 1, 0));
      spans.push({ from: isoDate(first), to: isoDate(last), label: MON[first.getUTCMonth()], full: `${MON[first.getUTCMonth()]} ${first.getUTCFullYear()}` });
    }
  }
  return spans;
}

export async function getMoneySeries(range: MoneyRange): Promise<MonthPoint[]> {
  const tok = await validToken();
  if (!tok) return [];
  const spans = buildSpans(range);
  const results = await Promise.all(spans.map((s) => plFetch(tok.accessToken, tok.tenantId, s.from, s.to)));
  return spans.map((s, i) => ({
    label: s.label, full: s.full,
    income: results[i]?.income ?? 0, expenses: results[i]?.expenses ?? 0, netProfit: results[i]?.netProfit ?? 0,
    ok: results[i] !== null,
  }));
}

/* -------- A whole year, month by month, for the year-goal page -------- */

/**
 * The P&L for each of twelve explicit month spans.
 *
 * Separate from `getMoneySeries`, which builds its own spans from today and
 * only offers rolling ranges. The year-goal page needs a *named* period —
 * a financial year that started in July, including months that haven't
 * happened yet — so it passes the spans in.
 *
 * A month Xero didn't answer for comes back null rather than zero. The
 * caller has to be able to tell "we billed nothing" from "we don't know",
 * and the two look identical once a failure is written as 0.
 */
export async function getMonthlyActuals(
  spans: Array<{ from: string; to: string }>,
  today = localToday(),
): Promise<Array<ProfitLoss | null>> {
  const tok = await validToken();
  if (!tok) return spans.map(() => null);
  const todayIso = isoDate(today);
  return Promise.all(
    spans.map((s) =>
      // Nothing to ask about a month that hasn't started. Xero answers a
      // future range with zeroes, which would read as a real quiet month.
      s.from > todayIso ? Promise.resolve(null) : plFetch(tok.accessToken, tok.tenantId, s.from, s.to > todayIso ? todayIso : s.to),
    ),
  );
}

/* -------- Who owes us, and how late it is -------- */

export type OverdueInvoice = { number: string; contact: string; due: string; daysOver: number; amountDue: number };

/**
 * Authorised sales invoices past their due date, most overdue first.
 *
 * Through the portal's own token, which is the one refresh loop allowed to
 * touch the Xero connection. Cached for five minutes across instances, keyed
 * on the organisation only, and a failure throws rather than caching an empty
 * list — "nobody owes us anything" is not something to hold for five minutes
 * on the strength of one 429.
 */
const sharedOverdue = unstable_cache(
  async (tenantId: string): Promise<OverdueInvoice[]> => {
    const tok = await validToken();
    if (!tok || tok.tenantId !== tenantId) throw new Error("xero: no token");
    const url = new URL(`${API_BASE}/Invoices`);
    url.searchParams.set("where", 'Type=="ACCREC"&&Status=="AUTHORISED"&&AmountDue>0');
    url.searchParams.set("order", "DueDate ASC");
    url.searchParams.set("pageSize", "1000");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tok.accessToken}`, "Xero-tenant-id": tenantId, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`xero ${res.status}`);
    const json = (await res.json()) as {
      Invoices?: Array<{ InvoiceNumber?: string; Contact?: { Name?: string }; AmountDue?: number; DueDateString?: string; DueDate?: string }>;
    };
    const today = localToday().getTime();
    const out: OverdueInvoice[] = [];
    for (const inv of json.Invoices ?? []) {
      const amountDue = Number(inv.AmountDue ?? 0);
      if (!(amountDue > 0)) continue;
      const raw = inv.DueDateString ?? inv.DueDate ?? "";
      const ms = raw.startsWith("/Date(") ? Number(raw.slice(6, raw.search(/[+)]/))) : Date.parse(raw);
      if (!Number.isFinite(ms) || ms >= today) continue;
      out.push({
        number: inv.InvoiceNumber ?? "",
        contact: inv.Contact?.Name ?? "",
        due: new Date(ms).toISOString().slice(0, 10),
        daysOver: Math.floor((today - ms) / 86_400_000),
        amountDue,
      });
    }
    return out.sort((a, b) => b.daysOver - a.daysOver);
  },
  ["xero-overdue"],
  { revalidate: 300, tags: ["xero-reports"] },
);

/** Null when Xero isn't connected or didn't answer — never an empty list standing in for one. */
export async function getOverdueInvoices(): Promise<OverdueInvoice[] | null> {
  const integ = await getIntegration("xero").catch(() => null);
  if (!integ?.tenantId || !integ.refreshToken) return null;
  return sharedOverdue(integ.tenantId).catch(() => null);
}
