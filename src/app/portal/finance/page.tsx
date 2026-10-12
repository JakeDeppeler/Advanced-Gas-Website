import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { KpiStack } from "@/components/portal/KpiStack";
import { xeroStatus, getPLDetail, getMoneySeries, redirectUri } from "@/lib/portal/xero";
import { getGoals } from "@/lib/portal/goals";
import { savedGoal } from "@/lib/portal/office";
import { summarisePL } from "@/lib/portal/run/pl";
import { money, pc } from "@/lib/portal/run/month";
import { cashCover, moveOf, owedInvoices, spendLines } from "@/lib/portal/run/money";
import { BENCH } from "@/lib/portal/benchmarks";
import { PERIODS, periodSpans, periodWords, readPeriod, type PeriodKey } from "@/lib/portal/run/period";
import { Bad, Card, Empty, Grid, Group, Head, Lh, Note, PeriodTabs, Pill, Row, Say, Tile, Two, none, status, type Status } from "@/components/portal/kit/Kit";
import { ProfitBars } from "@/components/portal/kit/Charts";
import { XeroOff } from "@/components/portal/finance/Parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit & finance — Team portal" };

const INFO: [string, string][] = [
  ["Net profit", "What’s left after every bill, wage and cost is paid — what the business actually made."],
  ["Gross margin", "Out of every $100 we charge, what’s left after the parts and the tech’s time on the job."],
  ["In the bank", "Every bank account in Xero, and how many weeks of wages and overheads it would cover if the phone stopped."],
  ["Owed to us", "Invoices sent but not paid yet. Overdue means past the day they agreed to pay."],
];

/**
 * Profit & finance › Overview: the period's profit against the year goal's
 * profit %, the four figures that say whether the business is healthy, net
 * profit month by month, and what moved it against the same stretch before.
 */
export default async function FinancePage({ searchParams }: { searchParams: { p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Profit & finance" forWhom="managers" />;

  const period = readPeriod(searchParams.p);
  const { status: xs, tenantName } = await xeroStatus();
  const tabs = <PeriodTabs on={period} items={PERIODS} href={(k) => `/portal/finance${k === "fy" ? "" : `?p=${k}`}`} />;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Overview" sub={`${periodWords(period).replace(/^./, (c) => c.toUpperCase())} · from Xero${tenantName ? ` · ${tenantName}` : ""}`} info={INFO} />
        {xs === "connected" && tabs}

        {xs === "not-configured" && (
          <Card title="Connect Xero — one-time setup">
            <p className="pk-note">The app credentials aren’t set yet. Create a Xero app, then add its keys to the server:</p>
            <ol className="pk-note" style={{ lineHeight: 1.7, paddingLeft: 20 }}>
              <li>Go to <b>developer.xero.com</b> → <b>My Apps</b> → <b>New app</b> (Web app).</li>
              <li>Set the <b>redirect URI</b> to exactly: <code>{redirectUri()}</code></li>
              <li>Copy the <b>Client ID</b> and generate a <b>Client Secret</b>.</li>
              <li>Add them to the server as <code>XERO_CLIENT_ID</code> and <code>XERO_CLIENT_SECRET</code>, then redeploy.</li>
            </ol>
          </Card>
        )}
        {xs === "not-connected" && (
          <Card title="Connect your Xero organisation">
            <p className="pk-note" style={{ marginBottom: 12 }}>Sign in to Xero and pick the organisation. Nothing is changed in Xero; the portal only reads reports.</p>
            <a href="/api/xero/connect" className="pk-btn">Connect Xero ›</a>
          </Card>
        )}
        {xs === "connected" && <Connected period={period} />}
      </div>
    </PortalShell>
  );
}

async function Connected({ period }: { period: PeriodKey }) {
  const spans = periodSpans(period);
  const [now, before, goals, year, cover, owedList, series] = await Promise.all([
    getPLDetail(spans.now.from, spans.now.to).catch(() => null),
    getPLDetail(spans.before.from, spans.before.to).catch(() => null),
    getGoals(),
    savedGoal(),
    cashCover(),
    owedInvoices().then((o) => o?.list ?? null).catch(() => null),
    getMoneySeries("12m").catch(() => []),
  ]);
  const s = now ? summarisePL(now) : null;
  const sb = before ? summarisePL(before) : null;
  const words = periodWords(period);
  const npGoal = year?.profitPct ?? null;

  if (!s) return <XeroOff state="no-answer" what={`the profit and loss for ${words}`} />;

  const npPct = (s.net / s.revenue) * 100, gmPct = (s.gp / s.revenue) * 100, ohPct = (s.overheads / s.revenue) * 100;
  const npSt: Status = npGoal ? status(npPct, npGoal, { pts: true }) : none();
  const gmSt: Status = goals.gm != null ? status(gmPct, goals.gm, { pts: true }) : none();
  const weeks = cover.weeks;
  const bankSt: Status = weeks == null ? none("No figure") : weeks >= BENCH.cash.lo ? { k: "good", w: "Enough" } : weeks >= BENCH.cash.lo / 2 ? { k: "mid", w: "Getting low" } : { k: "bad", w: "Too low" };
  // ServiceTitan's open balances as well as Xero's: see ST_LEDGER_FROM.
  const owed = owedList ? owedList.reduce((a, i) => a + i.amountDue, 0) : null;
  const overdue = owedList ? owedList.filter((i) => i.daysOver > 0).reduce((a, i) => a + i.amountDue, 0) : null;
  const owedSt: Status = overdue == null ? none("No figure") : goals.overdue != null ? status(overdue, goals.overdue, { lower: true }) : none();

  // Why it's short of the goal, in the words the prototype uses: whichever of
  // the two levers is further off its own goal.
  const gap = npGoal == null || npPct >= npGoal ? null
    : goals.ovh != null && ohPct > goals.ovh && (goals.gm == null || ohPct - goals.ovh >= goals.gm - gmPct) ? "overheads are the gap"
      : goals.gm != null && gmPct < goals.gm ? "the margin on jobs is the gap"
        : `that’s ${money(((npGoal - npPct) / 100) * s.revenue)} short`;

  // What moved it: sales, then the costs that moved most against the same stretch before.
  const moved: { title: string; sub: string; st: Status }[] = [];
  if (sb) {
    const d = s.revenue - sb.revenue;
    if (Math.abs(d) >= 500) moved.push({ title: `Sales ${d > 0 ? "up" : "down"} ${money(Math.abs(d))}`, sub: `${money(s.revenue)} against ${money(sb.revenue)}`, st: d > 0 ? { k: "good", w: "Better" } : { k: "bad", w: "Worse" } });
  }
  const lines = spendLines(now!, before).filter((l) => moveOf(l) !== "usual").sort((a, b) => Math.abs(b.now - b.usual) - Math.abs(a.now - a.usual));
  for (const l of lines.slice(0, 4 - moved.length)) {
    const up = l.now > l.usual;
    moved.push({ title: `${l.label} ${up ? "up" : "down"} ${money(Math.abs(l.now - l.usual))}`, sub: `${money(l.now)} against ${money(l.usual)}`, st: up ? { k: "bad", w: "Worse" } : { k: "good", w: "Better" } });
  }

  const bars = series.filter((p) => p.ok).map((p) => ({ label: p.label, value: p.netProfit, goal: npGoal ? (p.income * npGoal) / 100 : null }));

  return (
    <>
      <Say>
        {words.replace(/^./, (c) => c.toUpperCase())} made <b>{money(s.net)} profit</b>, {pc(npPct, 1)} of sales.{" "}
        {npGoal == null ? "There’s no profit goal yet — set one in Our numbers." : gap == null ? "That’s on goal." : <>The goal is {npGoal}% — <Bad>{gap}</Bad>.</>}
      </Say>
      <Grid cols={4}>
        <Tile label="Net profit" st={npSt} fig={money(s.net)} frac={npGoal ? npPct / npGoal : null} sub={`${pc(npPct, 1)} of sales${npGoal ? ` · goal ${npGoal}%` : ""}`} href="/portal/finance/pl" />
        <Tile label="Gross margin" st={gmSt} fig={pc(gmPct, 1)} frac={goals.gm ? gmPct / goals.gm : null} sub={goals.gm != null ? `goal ${goals.gm}% or more` : "no goal yet"} href="/portal/finance/pl" />
        <Tile label="In the bank" st={bankSt} fig={cover.bank != null ? money(cover.bank) : "—"} frac={weeks != null ? weeks / BENCH.cash.lo : null}
          sub={cover.bank == null ? (cover.bankWhy === "no-scope" ? "Xero needs the bank permission" : "Xero didn’t answer") : weeks != null ? `${weeks.toFixed(1)} weeks of running costs · aim ${BENCH.cash.lo}+` : `${cover.accounts} accounts`} href="/portal/finance/cash?tab=operate" />
        <Tile label="Owed to us" st={owedSt} fig={owed != null ? money(owed) : "—"} frac={owed && overdue != null ? 1 - overdue / owed : null}
          sub={overdue != null ? `${money(overdue)} overdue${goals.overdue != null ? ` · limit ${money(goals.overdue)}` : ""}` : "Xero and ServiceTitan didn’t answer"} href="/portal/money" />
      </Grid>
      <Two>
        <Card title="Net profit by month" aside={npGoal ? `dashed line · ${npGoal}% of that month’s sales · ${bars.at(-1)?.label ?? "this month"} still going` : `last 12 months · ${bars.at(-1)?.label ?? "this month"} still going`}>
          {bars.length ? <ProfitBars months={bars} /> : <Empty>Xero didn’t return the months.</Empty>}
        </Card>
        <div>
          <Lh>What moved it</Lh>
          {moved.length ? <><Group>{moved.map((x) => <Row key={x.title} title={x.title} sub={x.sub} end={<Pill st={x.st} />} />)}</Group><div style={{ marginTop: 8 }}><Note>Each against {spans.before.label}.</Note></div></> : <Empty>Nothing moved much — sales and every cost are within 10% of {spans.before.label}.</Empty>}
        </div>
      </Two>
      <KpiStack detail={now!} label={words} aims={{ gm: goals.gm, ovh: goals.ovh, np: npGoal }} />
      {/* At the foot: the one control here that undoes something, needed about once a year. */}
      <form action="/api/xero/disconnect" method="post" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="pk-btn g">Disconnect Xero</button>
      </form>
    </>
  );
}
