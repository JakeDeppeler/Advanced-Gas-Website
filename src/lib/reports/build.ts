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
const share = (a: number | null | undefined, b: number | null | undefined) => (a == null || !b || b <= 0 ? null : Math.max(0, a / b));

const STEP_LABEL: Record<Step, string> = {
  leads: "Leads", booked: "Jobs booked", quoted: "Quotes written", quotedValue: "Quoted value",
  sold: "Jobs sold", completed: "Jobs done", invoiced: "Invoiced",
};
const isMoney = (s: Step) => s === "invoiced" || s === "quotedValue";

/*
 * Invoiced, in these reports, is the period's jobs by their invoice date — the
 * date Xero carries, and what the board's Pace page counts. "Invoiced today"
 * is the other thing: everything the office billed today, whichever day the
 * job was. Side by side without saying so, a morning spent billing last week's
 * work made today read bigger than the week it's in — so each says which it is.
 */

/**
 * Whether the period is over, as far as the goal is concerned: where it says
 * we should be by now is the whole of what it needed. A report sent on the
 * last working day reads "of what the goal needed"; a preview mid-week reads
 * "needed by now". Taken from the standing itself rather than the kind of
 * report, so the same section can't compare a Tuesday against a Friday target.
 */
function periodOver(standing: Partial<Record<Step, Standing>>): boolean {
  const withNeed = Object.values(standing).filter((st): st is Standing => !!st && !!st.need && st.byNow != null);
  return withNeed.length > 0 && withNeed.every((st) => (st.byNow as number) >= (st.need as number) * 0.999);
}

/** Done against where the goal says we should be by now, in words first, with the bar the board draws. */
function standingLine(s: Step, st: Standing | undefined, over: boolean, periodWord: string, label = STEP_LABEL[s]): ReportLine | null {
  if (!st || st.done == null) return null;
  const f = isMoney(s) ? m$ : n;
  if (st.byNow == null || !st.need) return { label, value: f(st.done), sub: "no target set", status: "No target" };
  const gap = st.done - st.byNow;
  const status =
    st.verdict === "on" ? "On pace"
      : st.verdict === "ahead" ? `Ahead by ${f(Math.abs(gap))}`
        : st.verdict === "behind" ? `Behind by ${f(Math.abs(gap))}`
          : "";
  return {
    label,
    value: f(st.done),
    sub: over ? `of ${f(st.need)} the goal needed for the ${periodWord}` : `${f(st.byNow)} needed by now · ${f(st.need)} for the ${periodWord}`,
    tone: st.verdict === "behind" ? "bad" : st.verdict ? "good" : null,
    bar: share(st.done, st.need),
    mark: over ? null : share(st.byNow, st.need),
    status,
  };
}

function paceSection(standing: Partial<Record<Step, Standing>>, steps: Step[], periodWord: string): ReportSection | null {
  const over = periodOver(standing);
  const lines = steps
    .map((s) => standingLine(s, standing[s], over, periodWord, s === "invoiced" ? `Invoiced for the ${periodWord}'s jobs` : STEP_LABEL[s]))
    .filter(Boolean) as ReportLine[];
  if (!lines.length) return null;
  return {
    title: over ? `Against what the goal needed this ${periodWord}` : `The ${periodWord} so far, against the goal`,
    layout: "pace",
    lines,
    note: `${over ? "" : "The mark on each bar is where the goal says we should be by now. "}Invoiced counts the ${periodWord}'s jobs by invoice date, the date Xero carries, so billing done today for an earlier ${periodWord}'s job counts in that ${periodWord}.`,
  };
}

/** The small figures under the hero, two to a row, each against last week where there is one. */
function tilesSection(c: PaceCounts | null | undefined, prev: PaceCounts | null | undefined, prevLabel: string): ReportSection {
  const was = (v: number | null | undefined, f: (x: number | null | undefined) => string) => (prev && v != null ? `${prevLabel} ${f(v)}` : undefined);
  return {
    title: "The numbers",
    layout: "tiles",
    lines: [
      { label: "Leads", value: n(c?.leads), sub: was(prev?.leads, n) },
      { label: "Jobs booked", value: n(c?.booked), sub: was(prev?.booked, n) },
      { label: "Quotes written", value: m$(c?.quotedValue), sub: c?.quoted != null ? `${plural(c.quoted, "job")}${prev?.quoted != null ? ` · ${prevLabel} ${n(prev.quoted)}` : ""}` : undefined },
      { label: "Jobs done", value: n(c?.completed), sub: was(prev?.completed, n) },
    ],
  };
}

function heroSection(c: PaceCounts | null | undefined, prev: PaceCounts | null | undefined, prevLabel: string, periodWord: string): ReportSection {
  return {
    title: "Sold and invoiced",
    layout: "hero",
    lines: [
      {
        label: `Sold this ${periodWord}`, value: m$(c?.soldValue),
        sub: [c?.sold != null ? plural(c.sold, "job") : null, prev?.soldValue != null ? `${prevLabel} ${m$(prev.soldValue)}` : null].filter(Boolean).join(" · ") || undefined,
      },
      {
        label: `Invoiced for the ${periodWord}'s jobs`, value: m$(c?.invoiced),
        sub: prev?.invoiced != null ? `${prevLabel} ${m$(prev.invoiced)} · by invoice date` : "by invoice date, as Xero has it",
      },
    ],
  };
}

function needsSection(m: Metrics): ReportSection {
  const lines: ReportLine[] = [];
  if ((m.overdueCount ?? 0) > 0) lines.push({ label: "Invoices overdue", value: m$(m.overdueTotal), sub: `${plural(m.overdueCount, "invoice")} past due in Xero`, tone: "bad", status: "Chase" });
  if ((m.quotesQuietCount ?? 0) > 0) lines.push({ label: "Quotes gone quiet 7+ days", value: n(m.quotesQuietCount), sub: `${m$(m.quotesQuietValue)} between them`, status: "Follow up" });
  if (m.journals && m.journals.errors > 0) lines.push({ label: "Journal entries that didn't reach Xero", value: n(m.journals.errors), tone: "bad", status: "Fix" });
  if (!lines.length) lines.push({ label: "Nothing waiting", value: "✓", sub: "no overdue invoices, quiet quotes or Xero errors on the board", tone: "good", status: "Clear" });
  return { title: "Needs someone", layout: "alerts", lines };
}

function profitSection(title: string, p: ProfitSummary | null | undefined, goalPct: number | null): ReportSection | null {
  if (!p || !p.costed) return null;
  return {
    title,
    layout: "tiles",
    lines: [
      {
        label: "Profit on the jobs invoiced", value: m$(p.profit),
        sub: `${m$(p.revenue)} before GST · ${plural(p.costed, "job")} costed`,
      },
      {
        label: "Margin", value: pct(p.margin, 1),
        sub: goalPct ? `goal ${goalPct}%` : "no goal set",
        tone: p.margin == null || goalPct == null ? null : p.margin >= goalPct / 100 ? "good" : "bad",
      },
      ...(p.losing > 0 ? [{ label: "Jobs that lost money", value: n(p.losing), sub: p.under > p.losing ? `${n(p.under)} under the goal's margin` : undefined, tone: "bad" as const }] : []),
    ],
  };
}

function leaders(title: string, rows: Array<{ name: string; v: number }>): ReportSection | null {
  const top = rows.filter((r) => r.v > 0).sort((a, b) => b.v - a.v).slice(0, 5);
  if (!top.length) return null;
  return { title, layout: "rank", lines: top.map((r) => ({ label: r.name, value: m$(r.v), bar: r.v / top[0].v })) };
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
    const earlier = m.revenueTodayEarlier ?? null;
    sections.push({
      title: "Today",
      layout: "hero",
      lines: [
        {
          label: "Sold today", value: m$(m.soldToday),
          sub: t?.sold ? `${plural(t.sold, "job")} sold · avg ${m$(m.soldToday / t.sold)}` : t?.sold === 0 ? "nothing sold yet" : undefined,
        },
        {
          label: "Invoiced today", value: m$(m.revenueToday),
          sub: earlier != null && earlier !== 0
            ? `everything billed today · ${m$(m.revenueToday - earlier)} for today's jobs, ${m$(earlier)} for jobs done before today`
            : `everything billed today · ${plural(m.jobsInvoicedToday, "job")}`,
        },
      ],
    });
    sections.push({
      title: "The rest of today",
      layout: "tiles",
      lines: [
        { label: "Paid", value: m.paidToday == null ? "—" : m$(m.paidToday), sub: m.paidToday == null ? "payments not synced yet" : m.paymentsToday != null ? plural(m.paymentsToday, "payment") : undefined },
        { label: "Jobs booked", value: n(m.bookingsToday), sub: "today" },
        { label: "Quotes written", value: m$(m.quotesCreatedTodayValue), sub: plural(m.quotesCreatedTodayCount, "job") },
        { label: "Leads", value: n(m.leadsToday), sub: `${n(m.leadsWeek)} this week` },
      ],
    });
    if (pace) {
      const s = paceSection(pace.standing.week, ["invoiced", "sold", "booked", "quoted"], "week");
      if (s) sections.push(s);
    }
    sections.push(needsSection(m));
    const top = leaders("Who sold today", m.salesLeaderboard.map((r) => ({ name: r.name, v: r.soldToday })));
    if (top) sections.push(top);
    headline = `Sold ${m$(m.soldToday)} · invoiced ${m$(m.revenueToday)} · ${plural(m.bookingsToday, "job")} booked`;
  } else if (kind === "weekly") {
    title = `The week · ${period.label}`;
    const w = pd?.periods.week;
    sections.push(heroSection(w, pd?.periods.lastWeek, "last week", "week"));
    sections.push(tilesSection(w, pd?.periods.lastWeek, "last week"));
    if (pace) {
      const s = paceSection(pace.standing.week, ["invoiced", "sold", "booked", "quoted", "completed"], "week");
      if (s) sections.push(s);
    }
    const profit = profitSection("Profit on the week's jobs", extra.weekProfit, goalPct);
    if (profit) sections.push(profit);
    const top = leaders("Who sold this week", m.salesLeaderboard.map((r) => ({ name: r.name, v: r.soldWeek })));
    if (top) sections.push(top);
    sections.push(needsSection(m));
    const st = pace?.standing.week.invoiced;
    headline = `Invoiced ${m$(w?.invoiced)} · sold ${m$(w?.soldValue)}${st?.verdict ? ` · ${st.verdict === "behind" ? "behind" : st.verdict === "on" ? "on pace" : "ahead"} on the week` : ""}`;
  } else {
    title = `The month · ${period.label}`;
    const mo = pd?.periods.month;
    sections.push(heroSection(mo, null, "", "month"));
    sections.push(tilesSection(mo, null, ""));
    if (pace) {
      const s = paceSection(pace.standing.month, ["invoiced", "sold", "booked", "quoted", "completed"], "month");
      if (s) sections.push(s);
    }
    const profit = profitSection("Profit on the month's jobs", m.jobProfitMonth, goalPct);
    if (profit) sections.push(profit);
    const y = pace?.yearView;
    if (y) {
      sections.push({
        title: `The year · ${y.label}`,
        layout: "pace",
        lines: [
          {
            label: "Invoiced this year", value: m$(y.ytd),
            sub: `${m$(y.byNow)} needed by now · goal ${m$(y.goal)}${y.landing != null ? ` · lands at ${m$(y.landing)} at the last four weeks' rate` : ""}`,
            tone: y.gap >= 0 ? "good" : "bad",
            bar: share(y.ytd, y.goal),
            mark: share(y.byNow, y.goal),
            status: `${y.gap >= 0 ? "Ahead by" : "Behind by"} ${m$(Math.abs(y.gap))}`,
          },
        ],
        note: "The mark is where the goal says the year should be by now.",
      });
    }
    if (m.topJobTypes.length) {
      const top = m.topJobTypes.slice(0, 5);
      const most = Math.max(...top.map((t) => t.revenue), 1);
      sections.push({
        title: "Kinds of work",
        layout: "rank",
        lines: top.map((t) => ({ label: t.jobType, value: m$(t.revenue), sub: `${plural(t.jobs, "job")} invoiced`, bar: t.revenue / most })),
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
