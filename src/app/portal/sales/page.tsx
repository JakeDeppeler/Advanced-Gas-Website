import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard, savedGoal } from "@/lib/portal/office";
import { getGoals } from "@/lib/portal/goals";
import { loadPipeline } from "@/lib/pipeline/store";
import { followupRate, invoicedByWeek, soldByType, soldByWeek } from "@/lib/portal/run/data";
import { goalWords, monthElapsed, melNow, money, pc, plural, salesGoal } from "@/lib/portal/run/month";
import { Av, Bad, Card, Empty, Grid, Group, Head, Hero, Lh, Pair, Row, Say, Tile, Two, none, status } from "@/components/portal/kit/Kit";
import { WeekBars } from "@/components/portal/kit/Charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sales · Team portal" };

const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Run the company › Sales: from the first quote to a yes. Overview is the
 * month against its goal, the quotes out, how well we sell, and the weeks;
 * Quotes and Leads are the pipeline and leads pages under the same tabs;
 * Job types is what sold this month, by kind of job.
 */
export default async function SalesPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Sales" forWhom="the office" />;
  const tab = searchParams.tab === "types" ? "types" : "overview";
  const now = melNow();

  const [board, goals, year] = await Promise.all([latestBoard(), getGoals(), savedGoal()]);
  const m = board?.metrics ?? null;
  const cold = m?.quotesQuietCount ?? 0;
  const head = (
    <Head title={tab === "types" ? "Job types" : "Sales"} eyebrow={tab === "types" ? "What we sell, by kind of job · ServiceTitan" : "From the first quote to a yes · ServiceTitan"} info={[
      ["Quotes out", "Quotes from the last 60 days nobody has said yes or no to."],
      ["Going cold", "Over a week with nothing back. Ring these first."],
      ["Win rate", "Of the jobs we quoted, how many said yes. One job with three options is one quote."],
      ["Followed up in 2 days", "Quotes with a call, text or note on the pipeline within two days of going out."],
      ["Sold and invoiced each week", "Bars are what sold that week. The line is what was invoiced for work done that week, completed jobs only. Invoicing also takes in service and repair work that was never quoted, so it can sit above sold even while quoted work is piling up; the work still to do is the better check."],
      ["Sold, still to do", "Sold quotes whose job isn’t finished: not booked yet, or booked and not completed."],
    ]} />
  );

  if (!m) {
    return <PortalShell user={user}><div className="pk">{head}<Empty>The board hasn’t made its first snapshot yet.</Empty></div></PortalShell>;
  }

  if (tab === "types") {
    const types = await soldByType();
    const tot = types.reduce((t, x) => t + x.value, 0);
    return (
      <PortalShell user={user}>
        <div className="pk">
          {head}
          <Say>{types.length ? <>{types[0].type} is the biggest earner in {now.month}, at {money(types[0].value)}.</> : <>Nothing has sold in {now.month} yet.</>}</Say>
          <Card title="Sold by job type" aside={`${now.month} so far`}>
            {types.length ? (
              <div className="pk-tbl-wrap">
                <table className="pk-tbl">
                  <thead><tr><th>Job type</th><th>Jobs</th><th>Average job</th><th>Sold</th><th className="l">Share</th></tr></thead>
                  <tbody>
                    {types.map((t) => (
                      <tr key={t.type}>
                        <td><b>{t.type}</b></td>
                        <td>{t.jobs}</td>
                        <td>{t.jobs ? money(t.value / t.jobs) : ""}</td>
                        <td><b>{money(t.value)}</b></td>
                        <td className="l" style={{ width: 180 }}><div className="pk-bar ink" style={{ margin: 0 }}><i style={{ width: `${tot ? (t.value / tot) * 100 : 0}%` }} /></div></td>
                      </tr>
                    ))}
                    <tr className="tot"><td>All up</td><td>{types.reduce((n, t) => n + t.jobs, 0)}</td><td /><td>{money(tot)}</td><td /></tr>
                  </tbody>
                </table>
              </div>
            ) : <Empty>No sales yet this month.</Empty>}
          </Card>
          <p className="pk-note">A job type comes from the job in ServiceTitan. Margin by job type is on Profit on every job.</p>
        </div>
      </PortalShell>
    );
  }

  const [weeks, follow, pipe] = await Promise.all([soldByWeek(8), followupRate().catch(() => null), loadPipeline({ detail: true }).catch(() => null)]);
  // A failed read leaves the line off rather than drawing a week of zeroes it never measured.
  const billed = await invoicedByWeek(weeks.map((w) => w.week)).catch(() => null);
  const soldSum = weeks.reduce((t, w) => t + w.value, 0);
  const billedSum = billed ? billed.reduce((t, v) => t + v, 0) : null;
  // Sold work not finished yet: the honest answer to "are we selling more than we get done".
  const toDo = (pipe?.quotes ?? []).filter((x) => x.stage === "won" || x.stage === "booked");
  const toBook = toDo.filter((x) => x.stage === "won");
  const toDoValue = toDo.reduce((t, x) => t + x.value, 0);
  const g = salesGoal(m);
  const sellSt = g.byNow ? status(m.soldMtd, g.byNow) : none();
  const f = monthElapsed(m);
  const weekGoal = m.pace?.week.sold.value ?? (g.month ? (g.month * 12) / 52 : null);
  const close = m.pace?.rates.closeRate.measured;
  const winGoal = goals.winRate ?? null;
  const fresh = Math.max(0, (m.estimatesOpenCount ?? 0) - cold);
  const open = (pipe?.quotes ?? []).filter((x) => !x.soldOn && !x.lostReason && !x.dismissed).sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head}
        <Say>
          {g.byNow ? <>{now.month} is {sellSt.k === "good" ? "on track" : sellSt.k === "mid" ? "a little behind" : "behind"}. </> : <>No sales goal is set for {now.month}. </>}
          {cold > 0 ? <><Bad>{plural(cold, "quote is", "quotes are")} going cold</Bad>{m.quotesQuietValue ? <>, with {money(m.quotesQuietValue)} waiting</> : null}.</> : <>No quotes have gone quiet.</>}
        </Say>
        <Pair>
          <Hero dark label="Sold this month" right={g.month ? goalWords(m, g.month) : "no goal set"} fig={money(m.soldMtd)} frac={g.month ? m.soldMtd / g.month : null}
            sub={g.byNow != null ? `goal by now ${money(g.byNow)} · ${sellSt.w.toLowerCase()}` : "set a year goal to see the pace"} />
          <Hero label="Quotes out" right={`${m.estimatesOpenCount} open`} fig={money(m.estimatesOpenValue)} frac={m.estimatesOpenCount ? fresh / m.estimatesOpenCount : null}
            sub={`${fresh} fresh or due a call · ${cold} going cold`} href="/portal/pipeline" />
        </Pair>
        <Grid>
          <Tile label="Win rate" st={close != null && winGoal != null ? status(close * 100, winGoal, { pts: true }) : none(close == null ? "Too few quotes" : undefined)} fig={close != null ? pc(close * 100) : ""} frac={close ?? null} sub={winGoal != null ? `goal ${winGoal}%` : "no goal set"} />
          <Tile label="Average job" st={m.avgSoldValue != null && goals.avgJob ? status(m.avgSoldValue, goals.avgJob) : none()} fig={m.avgSoldValue != null ? money(m.avgSoldValue) : ""} frac={m.avgSoldValue != null && goals.avgJob ? m.avgSoldValue / goals.avgJob : null} sub={goals.avgJob ? `goal ${money(goals.avgJob)}` : "no goal set"} />
          <Tile label="Quotes sent" st={goals.quotesMonth && f ? status(m.quotesCreatedMonthCount, goals.quotesMonth * f) : none()} fig={String(m.quotesCreatedMonthCount)} frac={goals.quotesMonth && f ? m.quotesCreatedMonthCount / (goals.quotesMonth * f) : null} sub={goals.quotesMonth && f != null ? `goal by now ${Math.round(goals.quotesMonth * f)}` : "this month · no goal set"} href="/portal/pipeline" />
          <Tile label="Followed up in 2 days" st={follow && goals.followup ? status(follow.pct, goals.followup, { pts: true }) : none(follow ? undefined : "Too few quotes")} fig={follow ? pc(follow.pct) : ""} frac={follow ? follow.pct / 100 : null} sub={follow ? `of ${follow.of} quotes${goals.followup ? ` · goal ${goals.followup}%` : ""}` : "needs ten quotes in the last month"} href="/portal/pipeline" />
        </Grid>
        <Two>
          <Card title="Sold and invoiced each week" aside={billed ? "bars sold · line invoiced" : "bars sold · invoiced couldn’t be read"}>
            <WeekBars weeks={weeks.map((w) => ({ label: shortDay(w.week), value: w.value }))} goal={weekGoal}
              line={billed ? { name: "Invoiced", values: billed } : null} />
            <p className="pk-note">
              {billedSum != null ? <>Last {weeks.length} weeks: sold <b>{money(soldSum)}</b>, invoiced <b>{money(billedSum)}</b>. </> : null}
              {pipe ? (
                toDo.length
                  ? <>Sold and still to do: <b>{money(toDoValue)}</b> across {plural(toDo.length, "job", "jobs")}{toBook.length ? <>, {toBook.length} not booked in yet</> : null}.</>
                  : <>No sold work is waiting to be done.</>
              ) : null}
              {weekGoal ? " Green bars beat the weekly goal; this week is still going." : ""}
            </p>
          </Card>
          <div>
            <Lh>Biggest quotes waiting</Lh>
            {open.length ? (
              <Group>
                {open.map((x) => (
                  <Row key={x.key} href="/portal/pipeline" lead={<Av name={x.quotedBy ?? x.customer ?? "?"} />}
                    title={[x.customer ?? "Customer", x.suburb].filter(Boolean).join(" · ")}
                    sub={`${x.what ?? "Quote"} · ${x.quietDays === 0 ? "sent today" : `${x.quietDays} days`}`}
                    end={<span className="v">{money(x.value)}</span>} />
                ))}
              </Group>
            ) : <Empty>No quotes out.</Empty>}
          </div>
        </Two>
      </div>
    </PortalShell>
  );
}
