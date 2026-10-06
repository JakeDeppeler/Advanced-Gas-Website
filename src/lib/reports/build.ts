import "server-only";
import type { Metrics } from "@/lib/dashboard/metrics";
import type { PaceCounts, Standing, Step } from "@/lib/dashboard/pace";
import type { ProfitSummary } from "@/lib/dashboard/jobProfit";
import { money } from "@/lib/portal/format";
import type { Report, ReportKind, ReportLine, ReportSection } from "@/lib/reports/types";

/**
 * A report's figures, from the board's own snapshot — the same numbers the
 * wall shows, so the email and the TV can't disagree.
 *
 * A figure the board doesn't have says so rather than reading nought, as on
 * the wall: "not measured" is not "none".
 */

const n = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("en-AU"));
const m$ = (v: number | null | undefined) => (v == null ? "—" : money(v));
const pct = (v: number | null | undefined, dp = 0) => (v == null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(dp)}%`);
const plural = (k: number | null | undefined, one: string, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;

const STEP_LABEL: Record<Step, string> = {
  leads: "Leads", booked: "Jobs booked", quoted: "Quotes written", quotedValue: "Quoted value",
  sold: "Jobs sold", completed: "Jobs done", invoiced: "Invoiced",
};
const isMoney = (s: Step) => s === "invoiced" || s === "quotedValue";

/** Done against where the goal says we should be, in words first. */
function standingLine(s: Step, st: Standing | undefined, end: boolean): ReportLine | null {
  if (!st || st.done == null) return null;
  const f = isMoney(s) ? m$ : n;
  const target = end ? st.need : st.byNow;
  if (target == null) return { label: STEP_LABEL[s], value: f(st.done), sub: "no target set" };
  const gap = st.done - target;
  const word = st.verdict === "ahead" ? "ahead" : st.verdict === "on" ? "on pace" : "behind";
  return {
    label: STEP_LABEL[s],
    value: f(st.done),
    sub: `${end ? "of the" : "against"} ${f(target)} ${end ? "the goal needed" : "needed by now"} · ${word}${gap && st.verdict !== "on" ? ` by ${f(Math.abs(gap))}` : ""}`,
    tone: st.verdict === "behind" ? "bad" : st.verdict ? "good" : null,
  };
}

function countsSection(title: string, c: PaceCounts | null | undefined, prev?: PaceCounts | null, prevLabel = "last week"): ReportSection {
  const was = (v: number | null | undefined, f: (x: number | null | undefined) => string) => (prev && v != null ? `${prevLabel} ${f(v)}` : undefined);
  return {
    title,
    lines: [
      { label: "Leads", value: n(c?.leads), sub: was(prev?.leads, n) },
      { label: "Jobs booked", value: n(c?.booked), sub: was(prev?.booked, n) },
      { label: "Quotes written", value: n(c?.quoted), sub: c?.quotedValue != null ? `${m$(c.quotedValue)} quoted` : undefined },
      { label: "Sold", value: m$(c?.soldValue), sub: c?.sold != null ? `${plural(c.sold, "job")}${prev?.soldValue != null ? ` · ${prevLabel} ${m$(prev.soldValue)}` : ""}` : undefined },
      { label: "Jobs done", value: n(c?.completed), sub: was(prev?.completed, n) },
      { label: "Invoiced", value: m$(c?.invoiced), sub: was(prev?.invoiced, m$) },
    ],
  };
}

function needsSection(m: Metrics): ReportSection {
  const lines: ReportLine[] = [];
  if ((m.overdueCount ?? 0) > 0) lines.push({ label: "Invoices overdue", value: m$(m.overdueTotal), sub: plural(m.overdueCount, "invoice"), tone: "bad" });
  if ((m.quotesQuietCount ?? 0) > 0) lines.push({ label: "Quotes gone quiet 7+ days", value: n(m.quotesQuietCount), sub: `${m$(m.quotesQuietValue)} between them` });
  if (m.journals && m.journals.errors > 0) lines.push({ label: "Journal entries that didn't reach Xero", value: n(m.journals.errors), tone: "bad" });
  if (!lines.length) lines.push({ label: "Nothing waiting", value: "✓", sub: "no overdue invoices, quiet quotes or Xero errors on the board" });
  return { title: "Needs someone", lines };
}

function profitSection(title: string, p: ProfitSummary | null | undefined, goalPct: number | null): ReportSection | null {
  if (!p || !p.costed) return null;
  return {
    title,
    lines: [
      {
        label: "Profit on the jobs invoiced", value: m$(p.profit),
        sub: `${pct(p.margin, 1)} of ${m$(p.revenue)} before GST${goalPct ? ` · goal ${goalPct}%` : ""} · ${plural(p.costed, "job")} costed`,
        tone: p.margin == null || goalPct == null ? null : p.margin >= goalPct / 100 ? "good" : "bad",
      },
      ...(p.losing > 0 ? [{ label: "Jobs that lost money", value: n(p.losing), sub: p.under > p.losing ? `${n(p.under)} under the goal's margin` : undefined, tone: "bad" as const }] : []),
    ],
  };
}

function leaders(title: string, rows: Array<{ name: string; v: number }>): ReportSection | null {
  const top = rows.filter((r) => r.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  if (!top.length) return null;
  return { title, lines: top.map((r, i) => ({ label: `${i + 1}. ${r.name}`, value: m$(r.v) })) };
}

export type Period = { key: string; from: string; to: string; label: string };

/** The report, minus who it went to: that's filled in when it's sent. */
export function buildReport(
  kind: ReportKind, period: Period, m: Metrics, figuresAt: string | null, extra: { weekProfit?: ProfitSummary | null } = {},
): Report {
  const pd = m.paceData ?? null;
  const pace = m.pace ?? null;
  const goalPct = pace?.profitPct ?? null;
  const sections: ReportSection[] = [];
  let headline = "";
  let title = "";

  if (kind === "daily") {
    title = `Today · ${period.label}`;
    const t = pd?.periods.today;
    sections.push({
      title: "Today",
      lines: [
        { label: "Sold", value: m$(m.soldToday), sub: t?.sold != null ? plural(t.sold, "job") : undefined },
        { label: "Invoiced", value: m$(m.revenueToday) },
        { label: "Paid", value: m.paidToday == null ? "—" : m$(m.paidToday), sub: m.paidToday == null ? "payments not synced yet" : m.paymentsToday != null ? plural(m.paymentsToday, "payment") : undefined },
        { label: "Jobs booked", value: n(m.bookingsToday) },
        { label: "Quotes written", value: m$(m.quotesCreatedTodayValue), sub: plural(m.quotesCreatedTodayCount, "job") },
        { label: "Leads", value: n(m.leadsToday) },
      ],
    });
    if (pace) {
      const lines = (["invoiced", "sold", "booked", "quoted"] as Step[]).map((s) => standingLine(s, pace.standing.week[s], false)).filter(Boolean) as ReportLine[];
      if (lines.length) sections.push({ title: "The week so far, against the goal", lines });
    }
    sections.push(needsSection(m));
    const top = leaders("Who sold today", m.salesLeaderboard.map((r) => ({ name: r.name, v: r.soldToday })));
    if (top) sections.push(top);
    headline = `Sold ${m$(m.soldToday)} · invoiced ${m$(m.revenueToday)} · ${plural(m.bookingsToday, "job")} booked`;
  } else if (kind === "weekly") {
    title = `The week · ${period.label}`;
    const w = pd?.periods.week;
    sections.push(countsSection("The week", w, pd?.periods.lastWeek));
    if (pace) {
      const lines = (["invoiced", "sold", "booked", "quoted", "completed"] as Step[]).map((s) => standingLine(s, pace.standing.week[s], true)).filter(Boolean) as ReportLine[];
      if (lines.length) sections.push({ title: "Against what the goal needed this week", lines });
    }
    const profit = profitSection("Profit", extra.weekProfit, goalPct);
    if (profit) sections.push(profit);
    const top = leaders("Who sold this week", m.salesLeaderboard.map((r) => ({ name: r.name, v: r.soldWeek })));
    if (top) sections.push(top);
    sections.push(needsSection(m));
    const st = pace?.standing.week.invoiced;
    headline = `Invoiced ${m$(w?.invoiced)} · sold ${m$(w?.soldValue)}${st?.verdict ? ` · ${st.verdict === "behind" ? "behind" : st.verdict === "on" ? "on pace" : "ahead"} on the week` : ""}`;
  } else {
    title = `The month · ${period.label}`;
    const mo = pd?.periods.month;
    sections.push(countsSection("The month", mo));
    if (pace) {
      const lines = (["invoiced", "sold", "booked", "quoted", "completed"] as Step[]).map((s) => standingLine(s, pace.standing.month[s], true)).filter(Boolean) as ReportLine[];
      if (lines.length) sections.push({ title: "Against what the goal needed this month", lines });
    }
    const profit = profitSection("Profit", m.jobProfitMonth, goalPct);
    if (profit) sections.push(profit);
    const y = pace?.yearView;
    if (y) {
      sections.push({
        title: `The year · ${y.label}`,
        lines: [
          { label: "Invoiced this year", value: m$(y.ytd), sub: `goal ${m$(y.goal)} · ${m$(y.byNow)} by now` },
          { label: y.gap >= 0 ? "Ahead of the goal" : "Behind the goal", value: m$(Math.abs(y.gap)), tone: y.gap >= 0 ? "good" : "bad" },
          ...(y.landing != null ? [{ label: "Where the year lands at the last four weeks' rate", value: m$(y.landing) }] : []),
        ],
      });
    }
    if (m.topJobTypes.length) {
      sections.push({
        title: "Kinds of work",
        lines: m.topJobTypes.slice(0, 5).map((t) => ({ label: t.jobType, value: m$(t.revenue), sub: `${plural(t.jobs, "job")} invoiced` })),
      });
    }
    const top = leaders("Who sold this month", m.salesLeaderboard.map((r) => ({ name: r.name, v: r.sold })));
    if (top) sections.push(top);
    sections.push(needsSection(m));
    headline = `Invoiced ${m$(mo?.invoiced)} · sold ${m$(mo?.soldValue)}${m.jobProfitMonth?.margin != null ? ` · ${pct(m.jobProfitMonth.margin, 1)} margin` : ""}`;
  }

  return {
    kind, key: `report:${kind}:${period.key}`, title, periodLabel: period.label, from: period.from, to: period.to,
    createdAt: new Date().toISOString(), figuresAt, headline, sections,
    status: "building", sentTo: [], sentAt: null, error: null,
  };
}
