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
import { site } from "@/lib/site";
import { getIntegration, saveIntegration } from "./db";

const AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const API_BASE = "https://api.xero.com/api.xro/2.0";

// This app uses Xero's granular scopes, so the P&L report needs the specific
// accounting.reports.profitandloss.read scope, not the broad accounting.reports.read.
const SCOPES = "offline_access accounting.reports.profitandloss.read";

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

/** A valid access token + tenant, refreshing and re-storing if it's expired. */
async function resolveToken(): Promise<XeroAuth | null> {
  const integ = await getIntegration("xero");
  if (!integ || !integ.refreshToken || !integ.tenantId) return null;

  const exp = integ.expiresAt ? Date.parse(integ.expiresAt) : 0;
  if (integ.accessToken && exp - 60_000 > Date.now()) {
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

async function validToken(): Promise<XeroAuth | null> {
  if (!tokenInFlight) {
    tokenInFlight = resolveToken().finally(() => { tokenInFlight = null; });
  }
  return tokenInFlight;
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

function parseReport(data: { Reports?: { Rows?: XeroRow[] }[] }): ProfitLoss {
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

async function plFetch(accessToken: string, tenantId: string, fromDate: string, toDate: string): Promise<ProfitLoss | null> {
  const key = `${tenantId}|${fromDate}|${toDate}`;
  const hit = reportCache.get(key);
  if (hit && Date.now() - hit.at < REPORT_CACHE_MS) return hit.value;

  const url = `${API_BASE}/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`;
  const value = await withSlot(async () => {
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
      return parseReport((await res.json()) as { Reports?: { Rows?: XeroRow[] }[] });
    }
    return null;
  });

  // Only a real answer is worth keeping — caching a failure would hold the page
  // blank for five minutes after a single hiccup.
  if (value) reportCache.set(key, { at: Date.now(), value });
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
