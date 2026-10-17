import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { xeroStatus, getPLDetail, getBankSummary, getMonthlyActuals, getOwedBills, redirectUri } from "@/lib/portal/xero";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { jobProfits } from "@/lib/dashboard/jobProfit";
import { hourJobCosts } from "@/lib/portal/cover/load";
import { journalHealth } from "@/lib/journals/read";
import { standing, yearSpans } from "@/lib/portal/yearGoal";
import { ago } from "@/components/portal/Figs";
import { getGoals } from "@/lib/portal/goals";
import { savedGoal } from "@/lib/portal/office";
import { summarisePL } from "@/lib/portal/run/pl";
import { money, pc } from "@/lib/portal/run/month";
import { cashCover, moveOf, owedInvoices, spendLines } from "@/lib/portal/run/money";
import { BENCH } from "@/lib/portal/benchmarks";
import { PERIODS, periodItems, periodSpans, periodWords, readPeriod, type PeriodKey } from "@/lib/portal/run/period";
import { Bad, Card, Grid, Head, Lh, PeriodTabs, Say, Sum, Tile, none, status, type Status } from "@/components/portal/kit/Kit";
import { Diff, XeroOff } from "@/components/portal/finance/Parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit & finance · Team portal" };

const INFO: [string, string][] = [
  ["Net profit", "What’s left after every bill, wage and cost is paid, what the business actually made."],
  ["Gross margin", "Out of every $100 we charge, what’s left after the parts and the tech’s time on the job."],
  ["In the bank", "Every bank account in Xero, and how many weeks of wages and overheads it would cover if the phone stopped."],
  ["Owed to us", "Invoices sent but not paid yet. Overdue means past the day they agreed to pay."],
];

/**
 * Profit & finance › Overview: the four figures that say whether the business
 * is healthy, then every page of the section summed up in one card each — the
 * whole tab at a glance, rather than a piece of each page laid out at length.
 */
export default async function FinancePage({ searchParams }: { searchParams: { p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Profit & finance" forWhom="managers" />;

  const period = readPeriod(searchParams.p);
  const { status: xs, tenantName } = await xeroStatus();
  const tabs = <PeriodTabs on={period} items={periodItems()} href={(k) => `/portal/finance${k === "fy" ? "" : `?p=${k}`}`} />;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Overview" sub={`${periodWords(period).replace(/^./, (c) => c.toUpperCase())} · from Xero${tenantName ? ` · ${tenantName}` : ""}`} info={INFO} />
        {xs === "connected" && tabs}

        {xs === "not-configured" && (
          <Card title="Connect Xero, one-time setup">
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
  const today = isoDateMelbourne(new Date());
  const monthFrom = `${today.slice(0, 7)}-01`;
  const [now, before, goals, year, cover, owedList, bills, bank, journals, yearRaw, crew] = await Promise.all([
    getPLDetail(spans.now.from, spans.now.to).catch(() => null),
    getPLDetail(spans.before.from, spans.before.to).catch(() => null),
    getGoals(),
    savedGoal(),
    cashCover(),
    owedInvoices().then((o) => o?.list ?? null).catch(() => null),
    getOwedBills().catch(() => null),
    getBankSummary(monthFrom, today).catch(() => null),
    journalHealth().catch(() => null),
    (async () => {
      const g = await savedGoal();
      return g ? { g, raw: await getMonthlyActuals(yearSpans(g.basis, g.year)).catch(() => null) } : null;
    })(),
    hourJobCosts().catch(() => null),
  ]);
  const s = now ? summarisePL(now) : null;
  const sb = before ? summarisePL(before) : null;
  const words = periodWords(period);
  const npGoal = year?.profitPct ?? null;

  if (!s) return <XeroOff state="no-answer" what={`the profit and loss for ${words}`} />;

  // Profit on every job, over the same stretch where the job page has one;
  // a year of jobs is too many to cost on an overview, so the longer periods
  // read the last 90 days and say so.
  const job = period === "month" ? { w: "month", from: monthFrom, to: today, words: "this month" }
    : period === "lastmonth" ? { w: "last", from: spans.now.from, to: spans.now.to, words: "last month" }
      : { w: "90", from: isoDateMelbourne(new Date(Date.now() - 89 * 86_400_000)), to: today, words: "the last 90 days" };
  const jp = await jobProfits(job.from, job.to, crew?.costPerHr ?? null, npGoal, crew?.crew ?? []).then((r) => r.summary).catch(() => null);

  const npPct = (s.net / s.revenue) * 100, gmPct = (s.gp / s.revenue) * 100, ohPct = (s.overheads / s.revenue) * 100;
  const npSt: Status = npGoal ? status(npPct, npGoal, { pts: true }) : none();
  const gmSt: Status = goals.gm != null ? status(gmPct, goals.gm, { pts: true }) : none();
  const weeks = cover.weeks;
  const bankSt: Status = weeks == null ? none("No figure") : weeks >= BENCH.cash.lo ? { k: "good", w: "Enough" } : weeks >= BENCH.cash.lo / 2 ? { k: "mid", w: "Getting low" } : { k: "bad", w: "Too low" };
  // ServiceTitan's open balances as well as Xero's: see ST_LEDGER_FROM.
  const owed = owedList ? owedList.reduce((a, i) => a + i.amountDue, 0) : null;
  const late = owedList?.filter((i) => i.daysOver > 0) ?? null;
  const overdue = late ? late.reduce((a, i) => a + i.amountDue, 0) : null;
  const owedSt: Status = overdue == null ? none("No figure") : goals.overdue != null ? status(overdue, goals.overdue, { lower: true }) : none();

  // Why it's short of the goal, in the words the prototype uses: whichever of
  // the two levers is further off its own goal.
  const gap = npGoal == null || npPct >= npGoal ? null
    : goals.ovh != null && ohPct > goals.ovh && (goals.gm == null || ohPct - goals.ovh >= goals.gm - gmPct) ? "overheads are the gap"
      : goals.gm != null && gmPct < goals.gm ? "the margin on jobs is the gap"
        : `that’s ${money(((npGoal - npPct) / 100) * s.revenue)} short`;

  // ---- one card per page of the section ----
  const salesD = sb ? s.revenue - sb.revenue : null;
  // Within 1% either way is level, not "up" by a rounding error.
  const plSt: Status = salesD == null || !sb ? none("Nothing to compare") : Math.abs(salesD) < sb.revenue * 0.01 ? none("About level") : salesD > 0 ? { k: "good", w: "Sales up" } : { k: "bad", w: "Sales down" };

  const b = bank && bank !== "no-scope" ? bank : null;
  const kept = b ? b.received - b.spent : null;
  const cashSt: Status = kept == null ? none(bank === "no-scope" ? "Needs permission" : "No figure") : kept >= 0 ? { k: "good", w: "More in" } : { k: "bad", w: "More out" };

  const oldest = late?.length ? Math.max(...late.map((i) => i.daysOver)) : null;
  const old60 = late ? late.filter((i) => i.daysOver > 60).reduce((a, i) => a + i.amountDue, 0) : null;

  const daysTo = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
  const billsLate = bills ? bills.filter((x) => daysTo(x.due) < 0).reduce((a, x) => a + x.amountDue, 0) : null;
  const billsWeek = bills ? bills.filter((x) => daysTo(x.due) >= 0 && daysTo(x.due) <= 7).reduce((a, x) => a + x.amountDue, 0) : null;
  const billsAll = bills ? bills.reduce((a, x) => a + x.amountDue, 0) : null;
  const oweSt: Status = billsLate == null ? none("No figure") : billsLate > 0 ? { k: "bad", w: "Bills late" } : { k: "good", w: "Nothing late" };

  const costs = s.cogs + s.overheads, costsB = sb ? sb.cogs + sb.overheads : null;
  const costD = costsB == null ? null : costs - costsB;
  const lines = spendLines(now!, before).filter((l) => moveOf(l) !== "usual").sort((a, c) => Math.abs(c.now - c.usual) - Math.abs(a.now - a.usual));
  const top = lines[0] ?? null;
  // Costs rising with sales is fine; rising faster than them is the warning.
  const spendSt: Status = costD == null || !sb ? none("Nothing to compare")
    : costs / s.revenue <= (costsB! / sb.revenue) + 0.005 ? { k: "good", w: "In line" } : { k: "mid", w: "Up on sales" };

  const jobGoal = npGoal != null ? npGoal / 100 : null;
  const jobSt: Status = jp?.margin == null || jp.costed < 5 ? none(jp ? "Too few costed" : "No figure") : jobGoal != null ? status(jp.margin * 100, npGoal!, { pts: true }) : none();

  const ys = yearRaw?.raw ? standing(yearRaw.g, yearRaw.raw.map((p) => ({ income: p?.income ?? null, expenses: p?.expenses ?? null, netProfit: p?.netProfit ?? null })), new Date()) : null;
  const yearSt: Status = !ys || ys.banked == null ? none(yearRaw ? "No figure" : "No goal yet") : status(ys.banked, ys.expectedToDate);

  const jSt: Status = !journals ? none("Not read yet") : journals.errors > 0 ? { k: "bad", w: "Didn’t sync" } : journals.waiting > 0 ? { k: "mid", w: "Waiting" } : { k: "good", w: "All in Xero" };

  const before$ = spans.before.label;

  return (
    <>
      <Say>
        {words.replace(/^./, (c) => c.toUpperCase())} made <b>{money(s.net)} profit</b>, {pc(npPct, 1)} of sales.{" "}
        {npGoal == null ? "There’s no profit goal yet, set one in Pricing & costs." : gap == null ? "That’s on goal." : <>The goal is {npGoal}%, <Bad>{gap}</Bad>.</>}
      </Say>
      <Grid cols={4}>
        <Tile label="Net profit" st={npSt} fig={money(s.net)} frac={npGoal ? npPct / npGoal : null} sub={`${pc(npPct, 1)} of sales${npGoal ? ` · goal ${npGoal}%` : ""}`} href="/portal/finance/pl" />
        <Tile label="Gross margin" st={gmSt} fig={pc(gmPct, 1)} frac={goals.gm ? gmPct / goals.gm : null} sub={goals.gm != null ? `goal ${goals.gm}% or more` : "no goal yet"} href="/portal/finance/pl" />
        <Tile label="In the bank" st={bankSt} fig={cover.bank != null ? money(cover.bank) : ""} frac={weeks != null ? weeks / BENCH.cash.lo : null}
          sub={cover.bank == null ? (cover.bankWhy === "no-scope" ? "Xero needs the bank permission" : "Xero didn’t answer") : weeks != null ? `${weeks.toFixed(1)} weeks of running costs · aim ${BENCH.cash.lo}+` : `${cover.accounts} accounts`} href="/portal/finance/cash?tab=operate" />
        <Tile label="Owed to us" st={owedSt} fig={owed != null ? money(owed) : ""} frac={owed && overdue != null ? 1 - overdue / owed : null}
          sub={overdue != null ? `${money(overdue)} overdue${goals.overdue != null ? ` · limit ${money(goals.overdue)}` : ""}` : "Xero and ServiceTitan didn’t answer"} href="/portal/money" />
      </Grid>

      <Lh>Across Money</Lh>
      <Grid cols={4}>
        <Sum title="Profit & loss" st={plSt} fig={money(s.revenue)} figSub={`sales ${words}`} href={`/portal/finance/pl${period === "fy" ? "" : `?p=${period}`}`} lines={[
          ["Profit", money(s.net)],
          ["Sales on before", salesD == null ? "" : <Diff d={salesD} />],
        ]} />
        <Sum title="Cash flow" st={cashSt} fig={kept == null ? "" : `${kept >= 0 ? "▲" : "▼"} ${money(Math.abs(kept))}`} figSub={kept == null ? "bank this month" : `the bank ${kept >= 0 ? "kept" : "lost"} this month`} href="/portal/finance/cash" lines={[
          ["Money in", b ? money(b.received) : ""],
          ["Money out", b ? money(b.spent) : ""],
        ]} />
        <Sum title="Owed to us" st={owedSt.k === "none" && overdue != null ? (overdue > 0 ? { k: "mid", w: `${late!.length} late` } : { k: "good", w: "None late" }) : owedSt}
          fig={overdue != null ? money(overdue) : ""} figSub="overdue" href="/portal/money" lines={[
            ["Oldest", oldest != null ? `${oldest} days over` : ""],
            ["Over 60 days", old60 != null ? money(old60) : ""],
          ]} />
        <Sum title="We owe" st={oweSt} fig={billsWeek != null ? money(billsWeek) : ""} figSub="bills due in the next 7 days" href="/portal/finance/owe" lines={[
          ["Late", billsLate != null ? money(billsLate) : ""],
          ["Every unpaid bill", billsAll != null ? money(billsAll) : ""],
        ]} />
        <Sum title="Spending" st={spendSt} fig={money(costs)} figSub={`costs ${words}`} href="/portal/finance/spend" lines={[
          ["Costs on before", costD == null ? "" : <Diff d={costD} lowerIsBetter />],
          [top ? `Most moved: ${top.label}` : "Most moved", top ? <Diff d={top.now - top.usual} lowerIsBetter /> : "nothing much"],
        ]} />
        <Sum title="Profit on every job" st={jobSt} fig={jp?.margin != null ? pc(jp.margin * 100) : ""} figSub={`margin on costed jobs, ${job.words}`} href={`/portal/profit?w=${job.w}`} lines={[
          [npGoal ? `Under ${npGoal}%` : "Under the goal", jp && npGoal ? String(jp.under) : ""],
          ["Losing money", jp ? String(jp.losing) : ""],
        ]} />
        <Sum title="Year goal" st={yearSt} fig={ys?.banked != null ? money(ys.banked) : ""} figSub={ys ? `invoiced of ${money(ys.goal)}` : "set the year goal in Pricing & costs"} href="/portal/finance/goals" lines={[
          ["Should be by now", ys ? money(ys.expectedToDate) : ""],
          ["Against the pace", ys?.delta != null ? <Diff d={ys.delta} /> : ""],
        ]} />
        <Sum title="Journal entries" st={jSt} fig={journals ? String(journals.errors) : ""} figSub="didn’t reach Xero" href="/portal/journals" lines={[
          ["Waiting to sync", journals ? String(journals.waiting) : ""],
          ["Last checked", journals?.checkedAt ? ago(journals.checkedAt) : ""],
        ]} />
      </Grid>
      <p className="pk-note" style={{ margin: "-4px 0 0 4px" }}>“Before” is {before$}.</p>
      {/* At the foot: the one control here that undoes something, needed about once a year. */}
      <form action="/api/xero/disconnect" method="post" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="pk-btn g">Disconnect Xero</button>
      </form>
    </>
  );
}
