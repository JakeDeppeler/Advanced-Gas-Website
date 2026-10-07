import "server-only";
import { getPLDetail, getPeriodInvoices, localToday, type PeriodInvoices, type PLDetail } from "@/lib/portal/xero";
import { getSettings } from "@/lib/portal/db";
import { readYearGoal, standing, yearSpans } from "@/lib/portal/yearGoal";

/**
 * How a month or a week went, and why.
 *
 * The question this answers is the one the P&L alone can't: when profit is
 * thin, was it that there wasn't enough work, that a job's materials landed
 * this month, that the overheads ran high — or that it was a good month whose
 * money simply hasn't come in yet.
 *
 * Profit's movement against a normal period splits exactly into three parts,
 * so each can be put in dollars and they add back up:
 *
 *   Δ net = Δ income × usual gross margin      — more or less work
 *         − Δ cost-of-sales share × income      — materials and subbies
 *         − Δ overheads                         — the cost of being open
 *
 * "Normal" is the three months before (or the four weeks before), pro-rated
 * to the days elapsed when the period isn't over yet. Cash is a separate
 * question and is answered separately: invoices dated in the period, from
 * Xero, paid against still owed.
 */

export type Kind = "month" | "week";
export type Span = { from: string; to: string; label: string };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const noon = (s: string) => new Date(`${s}T12:00:00Z`);
const addDays = (s: string, n: number) => iso(new Date(noon(s).getTime() + n * 86_400_000));
const monthEnd = (y: number, m: number) => iso(new Date(Date.UTC(y, m + 1, 0, 12)));
const dayName = (s: string) => noon(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

export function todayIso(): string {
  return iso(localToday());
}

/** Monday of the week a day falls in. */
export function mondayOf(s: string): string {
  const dow = noon(s).getUTCDay(); // 0 Sun
  return addDays(s, -((dow + 6) % 7));
}

export function monthSpan(key: string): Span {
  const [y, m] = key.split("-").map(Number);
  return { from: `${key}-01`, to: monthEnd(y, m - 1), label: `${MONTHS[m - 1]} ${y}` };
}

export function weekSpan(monday: string): Span {
  const to = addDays(monday, 6);
  return { from: monday, to, label: `Week of ${dayName(monday)}` };
}

/** The last twelve months and twelve weeks, newest first, for the picker. */
export function periodChoices(today = todayIso()): { months: Array<{ key: string; label: string }>; weeks: Array<{ key: string; label: string }> } {
  const [y, m] = today.split("-").map(Number);
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1, 12));
    const key = iso(d).slice(0, 7);
    return { key, label: monthSpan(key).label };
  });
  const mon = mondayOf(today);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const key = addDays(mon, -7 * i);
    return { key, label: weekSpan(key).label };
  });
  return { months, weeks };
}

/** The spans "normal" is averaged over: three months, or four weeks, before. */
function before(kind: Kind, span: Span): Span[] {
  if (kind === "week") return [1, 2, 3, 4].map((i) => weekSpan(addDays(span.from, -7 * i)));
  const [y, m] = span.from.split("-").map(Number);
  return [1, 2, 3].map((i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1, 12));
    return monthSpan(iso(d).slice(0, 7));
  });
}

type PL = { income: number; cogs: number; opex: number; net: number; lines: Map<string, number>; cogsLines: Set<string> };

const COGS = /cost of (sales|goods)|direct cost|purchases/i;

function plOf(d: PLDetail): PL {
  const lines = new Map<string, number>();
  const cogsLines = new Set<string>();
  for (const s of d.sections) {
    if (s.kind !== "out") continue;
    for (const l of s.lines) {
      lines.set(l.label, (lines.get(l.label) ?? 0) + l.amount);
      if (COGS.test(s.title)) cogsLines.add(l.label);
    }
  }
  // Cost of sales as Xero files it; the rest of the outgoings are overheads.
  const cogs = d.costOfSales ?? d.sections.filter((s) => s.kind === "out" && COGS.test(s.title)).reduce((a, s) => a + s.total, 0);
  const opex = d.operatingExpenses ?? d.sections.filter((s) => s.kind === "out" && !COGS.test(s.title)).reduce((a, s) => a + s.total, 0);
  return { income: d.income ?? 0, cogs: cogs ?? 0, opex: opex ?? 0, net: d.netProfit ?? 0, lines, cogsLines };
}

function average(pls: PL[], scale: number): PL {
  const n = Math.max(1, pls.length);
  const lines = new Map<string, number>();
  for (const p of pls) for (const [k, v] of p.lines) lines.set(k, (lines.get(k) ?? 0) + v);
  for (const [k, v] of lines) lines.set(k, (v / n) * scale);
  const avg = (f: (p: PL) => number) => (pls.reduce((a, p) => a + f(p), 0) / n) * scale;
  const cogsLines = new Set(pls.flatMap((p) => [...p.cogsLines]));
  return { income: avg((p) => p.income), cogs: avg((p) => p.cogs), opex: avg((p) => p.opex), net: avg((p) => p.net), lines, cogsLines };
}

export type Factor = {
  key: "work" | "materials" | "overheads";
  title: string;
  /** What it did to profit against a normal period. Negative cost profit. */
  impact: number;
  detail: string;
};

export type Review = {
  kind: Kind;
  span: Span;
  /** True while the period is still running: everything "normal" is pro-rated to the days gone. */
  partial: boolean;
  daysGone: number;
  daysTotal: number;
  now: PL | null;
  normal: PL | null;
  /** The month's (or week's share of the month's) revenue goal, pro-rated when partial. */
  goal: number | null;
  factors: Factor[];
  /** Expense lines that moved most against normal, biggest first. */
  moved: Array<{ label: string; now: number; normal: number; diff: number; cogs: boolean }>;
  sales: PeriodInvoices | null;
  bills: PeriodInvoices | null;
  headline: string;
  points: string[];
  tone: "good" | "warn" | "bad";
};

const m$ = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const pc = (n: number) => `${Math.round(n * 100)}%`;

export async function buildReview(kind: Kind, key: string | null): Promise<Review> {
  const today = todayIso();
  const span = kind === "week"
    ? weekSpan(key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? mondayOf(key) : mondayOf(today))
    : monthSpan(key && /^\d{4}-\d{2}$/.test(key) ? key : today.slice(0, 7));
  const to = span.to > today ? today : span.to;
  const daysTotal = Math.round((noon(span.to).getTime() - noon(span.from).getTime()) / 86_400_000) + 1;
  const daysGone = Math.max(1, Math.round((noon(to).getTime() - noon(span.from).getTime()) / 86_400_000) + 1);
  const partial = to < span.to;
  const scale = daysGone / daysTotal;

  const prior = before(kind, span);
  const [nowD, priorD, sales, bills, goalRow] = await Promise.all([
    getPLDetail(span.from, to),
    Promise.all(prior.map((s) => getPLDetail(s.from, s.to))),
    getPeriodInvoices("ACCREC", span.from, to),
    getPeriodInvoices("ACCPAY", span.from, to),
    getSettings<unknown>("yeargoal").catch(() => null),
  ]);
  const now = nowD ? plOf(nowD) : null;
  const priorPL = priorD.filter((d): d is PLDetail => !!d).map(plOf);
  const normal = priorPL.length ? average(priorPL, scale) : null;

  // The goal for the period, as the year page reckons a month's.
  let goal: number | null = null;
  if (goalRow) {
    const g = readYearGoal(goalRow, noon(today));
    const year = standing(g, [], noon(today));
    const [y, m] = span.from.split("-").map(Number);
    // The month's slot in the goal's year; a period outside that year has no goal to hold it to.
    const slot = yearSpans(g.basis, g.year).findIndex((x) => x.from.slice(0, 7) === span.from.slice(0, 7));
    const row = slot >= 0 ? year.months[slot] : null;
    if (row && row.goal > 0) {
      const monthDays = Number(monthEnd(y, m - 1).slice(8));
      goal = kind === "month" ? row.goal * scale : row.goal * (daysGone / monthDays);
    }
  }

  const factors: Factor[] = [];
  const moved: Review["moved"] = [];
  let headline = "";
  const points: string[] = [];
  let tone: Review["tone"] = "warn";

  if (now && normal) {
    const gmNormal = normal.income > 0 ? 1 - normal.cogs / normal.income : 0;
    const shareNow = now.income > 0 ? now.cogs / now.income : 0;
    const shareNormal = normal.income > 0 ? normal.cogs / normal.income : 0;
    const work = (now.income - normal.income) * gmNormal;
    const materials = -(shareNow - shareNormal) * now.income;
    const overheads = -(now.opex - normal.opex);
    factors.push(
      {
        key: "work", title: "The work", impact: work,
        detail: `${m$(now.income)} earned against a usual ${m$(normal.income)}${goal ? ` and ${m$(goal)} the goal needed` : ""}.`,
      },
      {
        key: "materials", title: "Materials & subbies", impact: materials,
        detail: `${pc(shareNow)} of sales went on cost of sales, against a usual ${pc(shareNormal)}.`,
      },
      {
        key: "overheads", title: "Overheads", impact: overheads,
        detail: `${m$(now.opex)} against a usual ${m$(normal.opex)}.`,
      },
    );
    const keys = new Set([...now.lines.keys(), ...normal.lines.keys()]);
    for (const k of keys) {
      const a = now.lines.get(k) ?? 0, b = normal.lines.get(k) ?? 0;
      if (Math.abs(a - b) >= 250) moved.push({ label: k, now: a, normal: b, diff: a - b, cogs: now.cogsLines.has(k) || normal.cogsLines.has(k) });
    }
    moved.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));

    const worst = [...factors].sort((a, b) => a.impact - b.impact)[0];
    const gap = now.net - normal.net;
    const owedShare = sales && sales.total > 0 ? sales.due / sales.total : 0;
    const what = kind === "month" ? (partial ? "This month so far" : span.label) : (partial ? "This week so far" : span.label);

    if (gap >= 0 || now.net >= normal.net * 0.95) {
      tone = "good";
      headline = `${what} made ${now.net < 0 ? "a loss of " : ""}${m$(now.net)}${now.net < 0 ? "" : " profit"} — ${gap >= 0 ? `${m$(gap)} better than usual` : "about usual"}.`;
      if (sales && owedShare >= 0.3) {
        tone = "warn";
        points.push(`A good ${kind} on paper, but ${m$(sales.due)} of the ${m$(sales.total)} invoiced is still owed${sales.overdue > 0 ? ` (${m$(sales.overdue)} of it overdue)` : ""} — the money hasn't come in yet.`);
      }
    } else {
      tone = now.net < 0 ? "bad" : "warn";
      headline = `${what} ${now.net < 0 ? `lost ${m$(now.net)}` : `made ${m$(now.net)}`} — ${m$(gap)} under a usual ${kind}. The biggest reason: ${
        worst.key === "work" ? "not enough work" : worst.key === "materials" ? "materials and subbies cost more than usual" : "the overheads ran high"
      }.`;
    }
    for (const f of [...factors].sort((a, b) => a.impact - b.impact)) {
      if (Math.abs(f.impact) < 500) continue;
      const dir = f.impact < 0 ? "cost" : "added";
      if (f.key === "work") points.push(`${f.impact < 0 ? "Less" : "More"} work than usual ${dir} ${m$(f.impact)} of profit: ${f.detail}`);
      if (f.key === "materials") {
        const big = bills?.byContact.slice(0, 2).map((c) => `${c.contact} ${m$(c.total)}`).join(", ");
        points.push(`Materials and subbies ${dir} ${m$(f.impact)}: ${f.detail}${f.impact < 0 && big ? ` Biggest bills: ${big}.` : ""}`);
      }
      if (f.key === "overheads") {
        const up = moved.filter((x) => x.diff > 0 && !x.cogs).slice(0, 2).map((x) => `${x.label} up ${m$(x.diff)}`).join(", ");
        points.push(`Overheads ${f.impact < 0 ? "ran" : "came in"} ${m$(f.impact)} ${f.impact < 0 ? "over" : "under"} usual${f.impact < 0 && up ? ` — ${up}` : ""}.`);
      }
    }
    if (sales && sales.top[0] && sales.total > 0 && sales.top[0].total / sales.total >= 0.25) {
      points.push(`One invoice was ${pc(sales.top[0].total / sales.total)} of everything invoiced: ${sales.top[0].contact}, ${m$(sales.top[0].total)}${sales.top[0].due > 0 ? `, still owing ${m$(sales.top[0].due)}` : ", paid"}.`);
    }
    if (tone !== "good" && sales && owedShare >= 0.3 && !points.some((p) => p.includes("still owed"))) {
      points.push(`On top of that, ${m$(sales.due)} of what was invoiced hasn't been paid yet${sales.overdue > 0 ? ` (${m$(sales.overdue)} overdue)` : ""}.`);
    }
  } else if (now) {
    headline = `${span.label}: ${now.net < 0 ? `a loss of ${m$(now.net)}` : `${m$(now.net)} profit`}. There's no earlier period in Xero to compare it with.`;
  } else {
    headline = "Xero didn't answer, so there's nothing to go on for this period.";
    tone = "warn";
  }

  return { kind, span: { ...span, to }, partial, daysGone, daysTotal, now, normal, goal, factors, moved: moved.slice(0, 8), sales, bills, headline, points, tone };
}
