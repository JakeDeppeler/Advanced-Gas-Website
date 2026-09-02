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

/** A valid access token + tenant, refreshing and re-storing if it's expired. */
async function validToken(): Promise<{ accessToken: string; tenantId: string } | null> {
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

export async function getProfitAndLoss(fromDate: string, toDate: string): Promise<ProfitLoss | null> {
  const tok = await validToken();
  if (!tok) return null;
  const url = `${API_BASE}/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tok.accessToken}`, "Xero-tenant-id": tok.tenantId, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { Reports?: { Rows?: XeroRow[] }[] };
  const map = new Map<string, number>();
  walk(data.Reports?.[0]?.Rows, map);

  const income = pick(map, ["total income", "total operating income", "total trading income", "total revenue"]) ?? 0;
  const expenses = pick(map, ["total operating expenses", "total expenses", "less operating expenses"]) ?? 0;
  const netProfit = pick(map, ["net profit", "profit for the period", "total net profit"]) ?? income - expenses;
  return { income, expenses, netProfit };
}

/* -------- Profit & Loss, month-by-month series (for the chart) -------- */

export type MonthPoint = { label: string; income: number; expenses: number; netProfit: number };

const INCOME_LABELS = ["total income", "total operating income", "total trading income", "total revenue"];
const EXPENSE_LABELS = ["total operating expenses", "total expenses", "less operating expenses"];
const NET_LABELS = ["net profit", "profit for the period", "total net profit"];

function num(v: string | undefined): number {
  const n = v ? parseFloat(v.replace(/[^0-9.-]/g, "")) : NaN;
  return Number.isNaN(n) ? 0 : n;
}

function findHeader(rows: XeroRow[] | undefined): string[] {
  if (!rows) return [];
  for (const r of rows) {
    if (r.RowType === "Header" && r.Cells) return r.Cells.slice(1).map((c) => (c.Value || "").trim());
  }
  return [];
}

function findRowCells(rows: XeroRow[] | undefined, labels: string[]): number[] | null {
  if (!rows) return null;
  for (const r of rows) {
    if (r.Cells && r.Cells.length >= 2) {
      const label = (r.Cells[0]?.Value || "").trim().toLowerCase();
      if (labels.includes(label)) return r.Cells.slice(1).map((c) => num(c.Value));
    }
    const nested = findRowCells(r.Rows, labels);
    if (nested) return nested;
  }
  return null;
}

// Turn "Sep 2026" / "Sep-26" / "Sep 26" into a sortable timestamp.
function periodDate(label: string): number {
  const m = label.replace(/-/g, " ").match(/([A-Za-z]{3,})\s+(\d{2,4})/);
  if (!m) return NaN;
  const yr = m[2].length === 2 ? 2000 + parseInt(m[2], 10) : parseInt(m[2], 10);
  return Date.parse(`${m[1]} 1, ${yr}`);
}

export async function getProfitAndLossSeries(months: number): Promise<MonthPoint[]> {
  const tok = await validToken();
  if (!tok) return [];
  const today = new Date().toISOString().slice(0, 10);
  const periods = Math.max(1, Math.min(11, months - 1));
  const url = `${API_BASE}/Reports/ProfitAndLoss?date=${today}&periods=${periods}&timeframe=MONTH`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tok.accessToken}`, "Xero-tenant-id": tok.tenantId, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { Reports?: { Rows?: XeroRow[] }[] };
  const rows = data.Reports?.[0]?.Rows;

  const header = findHeader(rows);
  const income = findRowCells(rows, INCOME_LABELS) ?? [];
  const expenses = findRowCells(rows, EXPENSE_LABELS) ?? [];
  const net = findRowCells(rows, NET_LABELS) ?? [];
  const n = header.length || Math.max(income.length, expenses.length, net.length);

  const points: MonthPoint[] = [];
  for (let i = 0; i < n; i++) {
    const inc = income[i] ?? 0;
    const exp = expenses[i] ?? 0;
    points.push({ label: header[i] || `P${i + 1}`, income: inc, expenses: exp, netProfit: net[i] ?? inc - exp });
  }
  // Oldest → newest, left to right.
  const allDated = points.every((p) => !Number.isNaN(periodDate(p.label)));
  if (allDated) points.sort((a, b) => periodDate(a.label) - periodDate(b.label));
  return points;
}
