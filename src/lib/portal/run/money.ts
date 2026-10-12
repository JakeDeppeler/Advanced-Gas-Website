import "server-only";
import { cache } from "react";
import { q, sbSelect } from "@/lib/dashboard/db";
import { getBankSummary, getPLDetail, getUnpaidInvoices, localToday, type OverdueInvoice, type PLDetail } from "@/lib/portal/xero";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const isCogs = (t: string) => /cost of (sales|goods)|direct cost/i.test(t);

/* ---------------------------------------------------------------- owed */

export type Segment = "realestate" | "domestic";
export type OwedInvoice = OverdueInvoice & {
  segment: Segment;
  /** Where the segment came from: the job's business unit, or the customer's name. */
  by: "servicetitan" | "name";
  /** Which system holds the invoice. */
  from: "xero" | "servicetitan";
};

/**
 * The day ServiceTitan became the ledger for invoices and payments.
 *
 * Up to 17 September 2026 every sale was a Xero invoice (INV-0xxxx) and was
 * paid against in Xero. From then on ServiceTitan keeps the invoices (20xxx)
 * and the payments, and sends Xero a journal a day: the P&L in Xero is
 * complete, but Xero has no invoice to show as owing — the last one it holds
 * is INV-03654 of 17 September. So what's owed is Xero's unpaid invoices
 * from before this date plus ServiceTitan's open balances from it on.
 * ServiceTitan's balances before it are no good: those payments were only
 * ever recorded in Xero, which is what made it read $420K open.
 */
export const ST_LEDGER_FROM = "2026-09-17";

/**
 * Agencies, by the words in their names. Checked against the unpaid invoices
 * in Xero in October 2026: every agency there (Ray White, First National,
 * O'Brien Real Estate, Peake Real Estate, Core Realtors, Stockdale & Leggo)
 * matches, and no homeowner or builder does.
 */
const AGENCY = /real\s*estate|realt(y|or)|propert(y|ies)|ray white|first national|harcourts|barry plant|hooker|stockdale|century 21|raine\s*&?\s*horne|belle property|mcgrath|biggin|hocking stuart|elite agents|carbery/i;
const unit = (bu: string | null | undefined) => (bu && !/imported|default/i.test(bu) ? bu.trim() : null);
const segOf = (bu: string | null, contact: string): Pick<OwedInvoice, "segment" | "by"> =>
  bu ? { segment: /^real estate/i.test(bu) ? "realestate" : "domestic", by: "servicetitan" } : { segment: AGENCY.test(contact) ? "realestate" : "domestic", by: "name" };

/** ServiceTitan's invoices since it became the ledger that still have money owing. */
async function stOpen(today: string): Promise<OwedInvoice[] | null> {
  type R = { id: number; invoice_date: string; business_unit: string | null; ref: string | null; balance: string | null; due: string | null; customer: string | null };
  const rows = await sbSelect<R>("st_invoices", [
    q.select("id,invoice_date,business_unit,ref:raw->>referenceNumber,balance:raw->>balance,due:raw->>dueDate,customer:raw->customer->>name"),
    q.gte("invoice_date", ST_LEDGER_FROM), "limit=5000",
  ].join("&")).catch(() => null);
  if (!rows) return null;
  const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return rows
    .filter((r) => Number(r.balance) > 0.5 && !/imported|default/i.test(r.business_unit ?? ""))
    .map((r) => {
      const due = (r.due ?? r.invoice_date).slice(0, 10);
      const contact = r.customer ?? "";
      return {
        number: r.ref ?? String(r.id), contact, due, daysOver: Math.round((day(today) - day(due)) / 86_400_000),
        amountDue: Number(r.balance), from: "servicetitan" as const, ...segOf(unit(r.business_unit), contact),
      };
    });
}

/**
 * Everything customers owe, with whether it's real estate or domestic: Xero's
 * unpaid invoices from before ServiceTitan took over, and ServiceTitan's open
 * balances since (see ST_LEDGER_FROM). Null when neither answered; when only
 * one did, the other's part is missing and `partial` says which.
 *
 * Real estate or domestic is the job's business unit in ServiceTitan where
 * there is one ("Real Estate - Repairs"). Xero's older invoices mostly aren't
 * in ServiceTitan, or sit in its one "Imported Default" unit that says
 * nothing, so for those the customer's name decides. Commercial and
 * retirement-village work counts as domestic: it isn't agent work.
 */
export const owedInvoices = cache(async (): Promise<{ list: OwedInvoice[]; partial: "xero" | "servicetitan" | null } | null> => {
  const today = iso(localToday());
  const [inv, st] = await Promise.all([getUnpaidInvoices(), stOpen(today)]);
  if (!inv && !st) return null;
  const units = new Map<string, string>();
  const nums = [...new Set((inv ?? []).map((i) => i.number).filter((n) => /^[A-Za-z0-9-]+$/.test(n)))];
  for (let i = 0; i < nums.length; i += 150) {
    const rows = await sbSelect<{ ref: string | null; business_unit: string | null }>(
      "st_invoices", [q.select("ref:raw->>referenceNumber,business_unit"), `raw->>referenceNumber=in.(${nums.slice(i, i + 150).join(",")})`].join("&"),
    ).catch(() => []);
    for (const r of rows) { const u = unit(r.business_unit); if (r.ref && u) units.set(r.ref, u); }
  }
  // An invoice in both is counted once, from Xero.
  const inXero = new Set(nums);
  const list: OwedInvoice[] = [
    ...(inv ?? []).map((i) => ({ ...i, from: "xero" as const, ...segOf(units.get(i.number) ?? null, i.contact) })),
    ...(st ?? []).filter((i) => !inXero.has(i.number)),
  ];
  return { list, partial: !inv ? "xero" : !st ? "servicetitan" : null };
});

/* ---------------------------------------------------------------- cash */

export type CashCover = {
  bank: number | null;
  accounts: number;
  /** A month of running costs, split the way Cash to operate lists them. */
  wagesMonth: number | null;
  otherMonth: number | null;
  month: number | null;
  weekly: number | null;
  weeks: number | null;
  /** Why there's no bank figure, when there isn't. */
  bankWhy: "no-scope" | "no-xero" | null;
};

const isWageLine = (l: string) => /wage|salar|superannuation|\bsuper\b|workcover|payroll/i.test(l);

/**
 * How many weeks the money in the bank covers if the phone stopped ringing.
 *
 * Running costs are what goes out whether or not a job is on: every wage,
 * super and WorkCover line wherever Xero files it, plus every overhead. Parts,
 * materials and subbies in cost of sales are left out — they only happen when
 * there's a job, and counting them would make a quiet month look like it
 * burns as much cash as a busy one. Averaged over the last three full months
 * so one big bill doesn't swing it.
 */
export const cashCover = cache(async (): Promise<CashCover> => {
  const t = localToday();
  const y = t.getUTCFullYear(), m = t.getUTCMonth();
  const [bank, pl] = await Promise.all([
    getBankSummary(iso(new Date(Date.UTC(y, m, 1))), iso(t)).catch(() => null),
    getPLDetail(iso(new Date(Date.UTC(y, m - 3, 1))), iso(new Date(Date.UTC(y, m, 0)))).catch(() => null),
  ]);
  let wages = 0, other = 0;
  for (const sec of pl?.sections ?? []) {
    if (sec.kind !== "out") continue;
    const cogs = isCogs(sec.title);
    for (const l of sec.lines) {
      if (isWageLine(l.label)) wages += l.amount;
      else if (!cogs) other += l.amount;
    }
  }
  const month = pl && wages + other > 0 ? (wages + other) / 3 : null;
  const weekly = month != null ? (month * 12) / 52 : null;
  const b = bank && bank !== "no-scope" ? bank.closing : null;
  return {
    bank: b, accounts: bank && bank !== "no-scope" ? bank.accounts.length : 0,
    wagesMonth: month != null ? wages / 3 : null, otherMonth: month != null ? other / 3 : null,
    month, weekly, weeks: b != null && weekly && weekly > 0 ? b / weekly : null,
    bankWhy: bank === "no-scope" ? "no-scope" : bank == null ? "no-xero" : null,
  };
});

/* ---------------------------------------------------------------- spending */

export type SpendLine = { label: string; group: "jobs" | "overheads"; now: number; usual: number };

/** Every expense account in a P&L, as now-vs-before lines. */
export function spendLines(now: PLDetail, before: PLDetail | null): SpendLine[] {
  const pick = (d: PLDetail) => {
    const m = new Map<string, { group: SpendLine["group"]; amount: number }>();
    for (const sec of d.sections) {
      if (sec.kind !== "out") continue;
      const group = isCogs(sec.title) ? "jobs" : "overheads";
      for (const l of sec.lines) m.set(l.label, { group, amount: (m.get(l.label)?.amount ?? 0) + l.amount });
    }
    return m;
  };
  const a = pick(now), b = before ? pick(before) : new Map();
  const labels = new Set([...a.keys(), ...b.keys()]);
  return [...labels]
    .map((label) => ({ label, group: (a.get(label) ?? b.get(label)).group, now: a.get(label)?.amount ?? 0, usual: b.get(label)?.amount ?? 0 }))
    .filter((l) => Math.abs(l.now) > 0.5 || Math.abs(l.usual) > 0.5)
    .sort((x, y) => y.now - x.now);
}

/** Up, down or usual: more than 10% and $200 either way is a move. */
export function moveOf(l: SpendLine): "up" | "down" | "usual" {
  const d = l.now - l.usual;
  if (Math.abs(d) < 200 || (l.usual > 0 && Math.abs(d) / l.usual < 0.1)) return "usual";
  return d > 0 ? "up" : "down";
}
