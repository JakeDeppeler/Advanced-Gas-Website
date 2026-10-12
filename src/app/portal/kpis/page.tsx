import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { KpiStack } from "@/components/portal/KpiStack";
import { latestBoard, savedGoal } from "@/lib/portal/office";
import { getGoals } from "@/lib/portal/goals";
import { getPLDetail, localToday, xeroStatus } from "@/lib/portal/xero";
import { fyStart, summarisePL, type PLSummary } from "@/lib/portal/run/pl";
import { followupRate } from "@/lib/portal/run/data";
import { monthElapsed, money, pc, salesGoal } from "@/lib/portal/run/month";
import { onTheTools } from "@/lib/portal/onTheTools";
import { BENCH, benchStatus, type BenchKey } from "@/lib/portal/benchmarks";
import { Bad, Card, Empty, Good, Head, PeriodTabs, Pill, Say, Tabs, none, status, type Status } from "@/components/portal/kit/Kit";
import { PERIODS, periodSpans, periodWords, readPeriod } from "@/lib/portal/run/period";

export const dynamic = "force-dynamic";
export const metadata = { title: "Our KPIs — Team portal" };

/** Capitalised only when it starts the sentence. */
const cap = (t: string, first: boolean) => (first ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/** `pl`: the name is plural ("Overheads are"), for the sentence. */
type Kpi = { name: string; means: string; value: string; goal: string; st: Status; href?: string; pl?: boolean };
type TabKey = "overview" | "sell" | "work" | "paid" | "money" | "team";

/**
 * Run the company › Our KPIs: every number the business is measured by,
 * against its goal (Our numbers) and, where there is one, the benchmark for a
 * healthy service trade (fixed in code). Overview is the money top to bottom
 * from Xero for the financial year; each tab is one part of the business.
 */
export default async function KpisPage({ searchParams }: { searchParams: { tab?: string; p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Our KPIs" forWhom="the office" />;
  const tab = (["sell", "work", "paid", "money", "team"].includes(searchParams.tab ?? "") ? searchParams.tab : "overview") as TabKey;

  // The money tabs read Xero for the period picked; the rest are this month.
  const period = readPeriod(searchParams.p);
  const span = periodSpans(period).now;
  const from = span.from, to = span.to;
  const q = (t?: string) => `/portal/kpis${t ? `?tab=${t}` : ""}${period !== "fy" ? `${t ? "&" : "?"}p=${period}` : ""}`;
  const [board, goals, year, xero, follow, tools] = await Promise.all([
    latestBoard(),
    getGoals(),
    savedGoal(),
    xeroStatus().catch(() => ({ status: "not-configured" as const, tenantName: null })),
    followupRate().catch(() => null),
    onTheTools().catch(() => null),
  ]);
  const detail = xero.status === "connected" ? await getPLDetail(from, to).catch(() => null) : null;
  const pl: PLSummary | null = detail ? summarisePL(detail) : null;
  const m = board?.metrics ?? null;

  // ---- each KPI, against its goal
  const ng = (w = "No goal yet") => none(w);
  const g = m ? salesGoal(m) : { month: null, byNow: null };
  const f = m ? monthElapsed(m) : null;
  const sell: Kpi[] = m ? [
    { name: "Sold", means: "Work customers said yes to this month", value: money(m.soldMtd), goal: g.byNow != null ? `${money(g.byNow)} by now` : "—", st: g.byNow ? status(m.soldMtd, g.byNow) : ng(), href: "/portal/sales" },
    { name: "Quoted", means: "Value of quotes sent this month", value: money(m.quotesCreatedMonthValue), goal: m.quotedTargetMonthly && f != null ? `${money(m.quotedTargetMonthly * f)} by now` : "—", st: m.quotedTargetMonthly && f ? status(m.quotesCreatedMonthValue, m.quotedTargetMonthly * f) : ng(), href: "/portal/pipeline" },
    { pl: true, name: "Quotes sent", means: "How many quotes went out this month", value: String(m.quotesCreatedMonthCount), goal: goals.quotesMonth && f != null ? `${Math.round(goals.quotesMonth * f)} by now` : "—", st: goals.quotesMonth && f ? status(m.quotesCreatedMonthCount, goals.quotesMonth * f) : ng(), href: "/portal/pipeline" },
    ...(() => {
      const r = m.pace?.rates.closeRate;
      const v = r?.measured != null ? r.measured * 100 : null;
      const goal = year?.winRatePct ?? null;
      return [{ name: "Win rate", means: "Of every 100 quotes, how many said yes", value: v != null ? pc(v) : "—", goal: goal != null ? pc(goal) : "—", st: v != null && goal != null ? status(v, goal, { pts: true }) : ng(v == null ? "Not enough quotes" : undefined), href: "/portal/sales" }];
    })(),
    { name: "Average job", means: "What a sold job is worth, on average", value: m.avgSoldValue != null ? money(m.avgSoldValue) : "—", goal: goals.avgJob ? money(goals.avgJob) : "—", st: m.avgSoldValue != null && goals.avgJob ? status(m.avgSoldValue, goals.avgJob) : ng(), href: "/portal/sales" },
    { name: "Followed up in 2 days", means: "Quotes rung, texted or sold within two days", value: follow ? pc(follow.pct) : "—", goal: goals.followup ? pc(goals.followup) : "—", st: follow && goals.followup ? status(follow.pct, goals.followup, { pts: true }) : ng(follow ? undefined : "Too few quotes"), href: "/portal/pipeline" },
    { pl: true, name: "Leads", means: "Enquiries in this month", value: String(m.leadsMonth), goal: "—", st: ng(""), href: "/portal/leads" },
  ] : [];
  const done = m?.pace?.standing.month.completed;
  const work: Kpi[] = m ? [
    { pl: true, name: "Jobs done", means: "Jobs finished this month", value: String(done?.done ?? m.paceData?.periods.month.completed ?? 0), goal: goals.jobsMonth && f != null ? `${Math.round(goals.jobsMonth * f)} by now` : done?.byNow ? `${Math.round(done.byNow)} by now` : "—", st: goals.jobsMonth && f ? status(done?.done ?? 0, goals.jobsMonth * f) : done?.byNow ? status(done.done ?? 0, done.byNow) : ng(), href: "/portal/jobs" },
    { name: "Booked", means: "Jobs put in the diary this month", value: String(m.bookingsMonth), goal: m.bookingsTargetMonthly && f != null ? `${Math.round(m.bookingsTargetMonthly * f)} by now` : "—", st: m.bookingsTargetMonthly && f ? status(m.bookingsMonth, m.bookingsTargetMonthly * f) : ng(), href: "/portal/today" },
    { name: "Done, not billed", means: "Finished jobs with no invoice yet", value: String(m.toBillCount), goal: "0", st: m.toBillCount === 0 ? { k: "good", w: "All billed" } : (m.toBillOldestDays ?? 0) > 7 ? { k: "bad", w: "Too many" } : { k: "mid", w: "Bill them" }, href: "/portal/jobs?tab=notbilled" },
    { pl: true, name: "Jobs that lost money", means: "Last 30 days, once parts and hours are costed", value: String(m.jobProfitRecent?.losing ?? 0), goal: "0", st: (m.jobProfitRecent?.losing ?? 0) ? { k: "bad", w: "Look at them" } : { k: "good", w: "None" }, href: "/portal/profit" },
  ] : [];
  const paid: Kpi[] = m ? [
    { name: "Overdue", means: "Invoices past their due date", value: m.overdueTotal != null ? money(m.overdueTotal) : "—", goal: goals.overdue != null ? `${money(goals.overdue)} or less` : "—", st: m.overdueTotal != null && goals.overdue != null ? status(m.overdueTotal, Math.max(1, goals.overdue), { lower: true }) : ng(m.overdueTotal == null ? "Needs Xero" : undefined), href: "/portal/money" },
    { name: "Owed to us", means: "Everything invoiced and not yet paid", value: m.receivablesTotal != null ? money(m.receivablesTotal) : "—", goal: "—", st: ng(""), href: "/portal/money" },
    { name: "Over 30 days", means: "Owed for more than a month", value: m.receivablesAging ? money(m.receivablesAging.d30plus) : "—", goal: "$0", st: m.receivablesAging ? (m.receivablesAging.d30plus > 0 ? { k: "bad", w: "Chase it" } : { k: "good", w: "None" }) : ng("Needs Xero"), href: "/portal/money" },
    { name: "Paid this month", means: "Money in from customers", value: m.paidMonth != null ? money(m.paidMonth) : "—", goal: "—", st: ng(""), href: "/portal/finance/cash" },
  ] : [];
  const share = (n: number) => (pl ? (n / pl.revenue) * 100 : 0);
  const npGoal = year?.profitPct ?? null;
  const money2: Kpi[] = pl ? [
    { name: "Gross margin", means: "What’s left from sales after the cost of the jobs", value: pc(share(pl.gp), 1), goal: goals.gm != null ? `${goals.gm}% or more` : "—", st: goals.gm != null ? status(share(pl.gp), goals.gm, { pts: true }) : ng(), href: "/portal/finance/pl" },
    { pl: true, name: "Overheads", means: "Running the business, as a share of sales", value: pc(share(pl.overheads), 1), goal: goals.ovh != null ? `${goals.ovh}% or less` : "—", st: goals.ovh != null ? status(share(pl.overheads), goals.ovh, { pts: true, lower: true }) : ng(), href: "/portal/finance/pl" },
    { name: "Net profit", means: "What the business actually made", value: pc(share(pl.net), 1), goal: npGoal != null ? `${npGoal}% or more` : "—", st: npGoal != null ? status(share(pl.net), npGoal, { pts: true }) : ng(), href: "/portal/finance" },
    { pl: true, name: "Wages", means: "Wages, super and WorkCover, as a share of sales", value: pc(share(pl.wages), 1), goal: goals.wagesPct != null ? `${goals.wagesPct}% or less` : "—", st: goals.wagesPct != null ? status(share(pl.wages), goals.wagesPct, { pts: true, lower: true }) : ng(), href: "/portal/finance/pl" },
  ] : [];
  const onPct = tools && tools.lastRoster > 0 ? (tools.lastOn / tools.lastRoster) * 100 : null;
  const team: Kpi[] = [
    { name: "On the tools", means: "Hours on jobs last week, of the hours rostered", value: onPct != null ? pc(onPct) : "—", goal: goals.billable != null ? pc(goals.billable) : "—", st: onPct != null && goals.billable != null ? status(onPct, goals.billable, { pts: true }) : ng(onPct == null ? "No clock-ins" : undefined), href: "/portal/hours" },
    ...(m?.salesLeaderboard ?? []).slice(0, 6).map((p) => ({
      name: p.name, means: `${p.soldJobs} sold of ${p.quotedJobs} quoted this month`, value: money(p.sold), goal: p.closeRate != null ? `${Math.round(p.closeRate * 100)}% close rate` : "—", st: ng(""), href: "/portal/rates?tab=leaders",
    })),
  ];

  const red = (ks: Kpi[]) => ks.filter((k) => k.st.k === "bad").length;
  const tabs = (
    <Tabs on={tab} items={[
      { key: "overview", label: "Overview", href: q() },
      { key: "sell", label: "Selling", href: q("sell"), count: red(sell) || undefined, red: true },
      { key: "work", label: "Doing the work", href: q("work"), count: red(work) || undefined, red: true },
      { key: "paid", label: "Getting paid", href: q("paid"), count: red(paid) || undefined, red: true },
      { key: "money", label: "Making money", href: q("money"), count: red(money2) || undefined, red: true },
      { key: "team", label: "Team", href: q("team") },
    ]} />
  );
  const head = (
    <Head title="Our KPIs" sub={tab === "overview" || tab === "money" ? `${periodWords(period).charAt(0).toUpperCase()}${periodWords(period).slice(1)} · from Xero` : "This month · ServiceTitan and Xero"} info={[
      ["Goal", "What we aim for this year, set in Our numbers. Change it there and every page moves with it."],
      ["Benchmark", "What a healthy service trade looks like. Fixed, so it can’t be moved to suit a month."],
      ["No goal yet", "Nobody has set a goal for it, so it isn’t marked good or bad."],
    ]} />
  );

  const list = (ks: Kpi[], title: string, aside: string) => (
    <Card title={title} aside={aside}>
      {ks.length ? (
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>What</th><th>Now</th><th>Goal</th><th>How it’s going</th></tr></thead>
            <tbody>
              {ks.map((k) => (
                <tr key={k.name}>
                  <td>{k.href ? <Link href={k.href} style={{ color: "inherit", textDecoration: "none" }}><b>{k.name}</b></Link> : <b>{k.name}</b>}<div className="ks">{k.means}</div></td>
                  <td><b>{k.value}</b></td>
                  <td className="ks">{k.goal}</td>
                  <td>{k.st.w ? <Pill st={k.st} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty>{m ? "Nothing to show here yet." : "The board hasn’t made its first snapshot yet."}</Empty>}
    </Card>
  );

  let body: React.ReactNode;
  if (tab === "overview") {
    const bench: [string, BenchKey, number, boolean][] = pl ? [
      ["Gross margin", "gm", share(pl.gp), false],
      ["Overheads", "ovh", share(pl.overheads), true],
      ["Net profit", "np", share(pl.net), false],
      ["Wages as % of sales", "wages", share(pl.wages), true],
    ] : [];
    const kept = pl ? Math.round(share(pl.net)) : null;
    const worst = money2.find((k) => k.st.k === "bad") ?? money2.find((k) => k.st.k === "mid");
    body = (
      <>
        <Say>
          {pl ? (
            <>
              {period === "fy" ? "This year" : periodWords(period).charAt(0).toUpperCase() + periodWords(period).slice(1)} we’ve kept {kept} cents of every dollar after everything’s paid.{" "}
              {money2[0]?.st.k === "good" && <>Margin is on track{worst ? ", but " : "."}</>}
              {worst && <Bad>{worst.name.toLowerCase()} {worst.pl ? "are" : "is"} {worst.st.k === "bad" ? "off" : "close"} at {worst.value}</Bad>}
              {worst && "."}
            </>
          ) : xero.status === "connected" ? <>Xero didn’t send this year’s profit and loss, so there’s nothing to measure yet.</> : <>Connect Xero to see the money top to bottom.</>}
        </Say>
        {detail ? <KpiStack detail={detail} label={periodWords(period)} aims={{ gm: goals.gm, ovh: goals.ovh, np: npGoal }} /> : <Empty>{xero.status === "connected" ? "No profit and loss from Xero for this year yet." : <>Xero isn’t connected. <Link href="/portal/integrations">Connect it ›</Link></>}</Empty>}
        {pl && (
          <Card title="Against the benchmarks" aside="fixed for a service trade · not ours to change">
            {bench.map(([n, k, v, lower]) => (
              <div className="pk-kv" key={k}>
                <span className="t"><b>{n}</b><span>{BENCH[k].why}</span></span>
                <span className="band">{BENCH[k].words}</span>
                <span className="v">{pc(v, 1)}</span>
                <Pill st={benchStatus(k, v, lower)} />
              </div>
            ))}
            <p className="pk-note" style={{ marginTop: 10 }}>Our goals in Our numbers are what we aim for this year. The benchmark is what a healthy service trade looks like, and it stays put.</p>
          </Card>
        )}
      </>
    );
  } else {
    const ks = { sell, work, paid, money: money2, team }[tab];
    const bad = ks.filter((k) => k.st.k === "bad"), good = ks.filter((k) => k.st.k === "good");
    const title = { sell: "Selling", work: "Doing the work", paid: "Getting paid", money: "Making money", team: "Team" }[tab];
    body = (
      <>
        <Say>
          {good.length > 0 && <Good>{good.length} on track</Good>}
          {good.length > 0 && bad.length > 0 && ", but "}
          {bad.length > 0 && <Bad>{cap(bad.map((k) => k.name.toLowerCase()).join(" and "), good.length === 0)} {bad.length > 1 || bad[0].pl ? "need" : "needs"} work</Bad>}
          {!good.length && !bad.length && <>Nothing here is set against a goal yet; set them in Our numbers.</>}
          {(good.length > 0 || bad.length > 0) && "."}
        </Say>
        {list(ks, title, tab === "money" ? `${periodWords(period)} · Xero` : "this month")}
      </>
    );
  }

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head}
        {tabs}
        {(tab === "overview" || tab === "money") && <PeriodTabs on={period} items={PERIODS} href={(k) => `/portal/kpis${tab === "money" ? "?tab=money" : ""}${k !== "fy" ? `${tab === "money" ? "&" : "?"}p=${k}` : ""}`} />}
        {body}
      </div>
    </PortalShell>
  );
}
