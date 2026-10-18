import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { needsToday, type NeedLine } from "@/lib/portal/needs";
import { callStats, soldTodayPoints } from "@/lib/portal/run/data";
import { goalWords, melNow, money, plural, salesGoal } from "@/lib/portal/run/month";
import { BENCH, benchStatus } from "@/lib/portal/benchmarks";
import { Av, Bad, Card, Empty, Grid, Group, Head, Hero, Kv, Lh, Pair, Pill, Row, Say, Tile, Two, none, status, type Status } from "@/components/portal/kit/Kit";
import { SoldTodayChart } from "@/components/portal/kit/Charts";
import { TwoGoals } from "@/components/portal/kit/TwoGoals";
import { monthTrack } from "@/lib/portal/run/monthTrack";
import { personDays } from "@/lib/portal/cover/days";
import { coverBase } from "@/lib/portal/cover/load";
import { dbConfigured } from "@/lib/portal/db";
import { Icon } from "@/components/portal/shell/Sidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today · Team portal" };

/** Fewer inbound calls than this in the window and a booking rate is a coin toss. */
const MIN_CALLS = 30;

/** Which icon and word a "needs someone" line gets, by where it goes. */
function needLook(l: NeedLine): { icon: string; word: string } {
  const h = l.href;
  if (h.startsWith("/portal/pipeline")) return { icon: "run", word: "To ring" };
  if (h.startsWith("/portal/money")) return { icon: "pf", word: "Overdue" };
  if (h.startsWith("/portal/not-billed")) return { icon: "jobs", word: "Not billed" };
  if (h.startsWith("/portal/profit")) return { icon: "pf", word: "Lost money" };
  if (h.startsWith("/portal/journals")) return { icon: "pf", word: "Didn’t sync" };
  if (h.startsWith("/portal/todo")) return { icon: "todo", word: "Overdue" };
  if (h.startsWith("/portal/keep-in-touch")) return { icon: "todo", word: "Due a call" };
  if (h.startsWith("/portal/vehicles") || h.startsWith("/portal/stock")) return { icon: "van", word: "To sort" };
  if (h.startsWith("/portal/requests")) return { icon: "team", word: h.includes("incident") ? "Incident" : "Waiting" };
  return { icon: "run", word: "Look at it" };
}

/**
 * Run the company › Today, to the prototype: how today is going against a
 * usual day, the tiles, sold today hour by hour, and what needs someone.
 * Call booking is calls into booked jobs.
 */
export default async function TodayPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Today" forWhom="the office" />;

  // Team now went: Jobs today shows the same people on the same jobs.
  if (searchParams.tab === "team") redirect("/portal/jobs");
  const tab = searchParams.tab === "calls" ? "calls" : "overview";
  const isoMonth = new Date(Date.now() + 10 * 3_600_000).toISOString().slice(0, 7);
  const [board, lines, points, calls, track, crew, hour] = await Promise.all([
    latestBoard(),
    needsToday(user).catch(() => []),
    tab === "overview" ? soldTodayPoints() : Promise.resolve([] as [number, number][]),
    tab === "calls" ? callStats(7) : Promise.resolve(null),
    // Before the Reece bill: the gear in this month's sales, from the estimates as they're sold.
    tab === "overview" && dbConfigured() ? monthTrack(isoMonth).catch(() => null) : Promise.resolve(null),
    // How the crew worked this week: billed work a day against the hours we bill on.
    tab === "overview" && dbConfigured() ? personDays(7, 8).catch(() => null) : Promise.resolve(null),
    tab === "overview" ? coverBase().catch(() => null) : Promise.resolve(null),
  ]);
  const m = board?.metrics ?? null;
  const now = melNow();
  const techs = m?.daily?.techs ?? [];
  const over = techs.filter((t) => t.hoursQuoted != null && t.hoursTakenQuoted > t.hoursQuoted + 0.25);

  const head = (sub: string) => (
    <Head title={tab === "calls" ? "Call booking" : "Today"} sub={`${now.day} · ${now.time} · ${sub}`} info={[
      ["A usual day", "The month’s sales goal spread over its working days. Today is measured against it."],
      ["Sold", "Quotes a customer said yes to today. A quote re-sold for the same amount stays on the day it first sold."],
      ["Billed", "Everything invoiced today, whenever the job was done."],
    ]} />
  );

  if (!m) {
    return (
      <PortalShell user={user}>
        <div className="pk">{head("ServiceTitan")}<Empty>The board hasn’t made its first snapshot yet, so there’s nothing to show for today.</Empty></div>
      </PortalShell>
    );
  }

  if (tab === "calls" && calls) {
    const rate = calls.inbound ? Math.round((calls.booked / calls.inbound) * 100) : 0;
    const enough = calls.inbound >= MIN_CALLS;
    return (
      <PortalShell user={user}>
        <div className="pk">
          {head("ServiceTitan calls")}
          {enough ? (
            <>
              <Say><b>{rate}% of calls became a booked job</b> this week: {calls.booked} of {calls.inbound}.</Say>
              <Grid>
                <Tile label="Calls in" st={none("")} fig={String(calls.inbound)} frac={1} sub={`${calls.missed} not answered`} />
                <Tile label="Booked" st={benchStatus("book", rate)} fig={String(calls.booked)} frac={rate / 100} sub={`${rate}% booking rate · aim ${BENCH.book.words}`} />
                <Tile label="Didn’t book" st={none("")} fig={String(calls.inbound - calls.booked)} frac={(calls.inbound - calls.booked) / calls.inbound} sub="see the reasons below" />
                <Tile label="Missed calls" st={calls.missed ? { k: "mid", w: "Ring back" } : { k: "good", w: "None" }} fig={String(calls.missed)} frac={calls.missed / calls.inbound} sub="rang out, nobody picked up" />
              </Grid>
              <Pair>
                <Card title="Why they didn’t book" aside="the reason on the call">
                  {calls.reasons.length ? calls.reasons.map(([r, n]) => <Kv key={r} t={r} v={n} />) : <Empty>No reasons logged.</Empty>}
                </Card>
                <Card title="Who answered" aside="this week">
                  {calls.byWho.map((w) => <Kv key={w.name} t={w.name} sub={`${w.calls} calls`} v={`${Math.round((w.booked / Math.max(1, w.calls)) * 100)}% booked`} />)}
                </Card>
              </Pair>
            </>
          ) : (
            <>
              <Say>There’s no booking rate to show yet: {calls.inbound ? <>only {plural(calls.inbound, "inbound call")} are</> : <>no inbound calls are</>} in ServiceTitan’s phone log this week.</Say>
              <Card title="Why it’s blank" aside={`aim ${BENCH.book.words}`}>
                <p className="pk-note">
                  The booking rate is the calls that ended with a job in the diary. It needs every call in ServiceTitan’s phone log, and
                  this week it has {calls.inbound || "none"}, far fewer than the office takes. A rate off a handful of calls would swing wildly and
                  say nothing, so it stays off until there are at least {MIN_CALLS} calls a week. Logging calls through ServiceTitan
                  turns it on by itself.
                </p>
              </Card>
            </>
          )}
        </div>
      </PortalShell>
    );
  }

  // Overview
  // A weekend has no daily target: the day reads grey, and anything sold on
  // it is extra, on top of the week, not a shortfall against a usual day.
  const weekend = /^(Saturday|Sunday)/.test(now.day);
  const extra: Status = { k: "good", w: "Extra" };
  const usual = weekend ? null : m.dailySalesTarget ?? null;
  const sellSt = weekend ? (m.soldToday > 0 ? extra : none("Weekend")) : usual ? status(m.soldToday, usual) : none();
  const g = salesGoal(m);
  const notBilled = m.toBillCount ?? 0;
  // A usual day's quoting: set on the board, or what a usual day's sales need at our close rate.
  const quotedUsual = weekend ? null : m.dailyQuotedTarget ?? (usual && m.closeRate30d ? usual / m.closeRate30d : null);
  const levels = m.goalLevels ?? null;
  const monthSt = g.byNow ? status(m.soldMtd, g.byNow) : none();

  // Cost of goods. The month's sales so far: gear on the estimates as they're
  // sold, against the most a sale can carry and still pay its way. The last 30
  // days of finished jobs: gear and labour against the price — over 80% and
  // the 20% we price for is gone.
  const sales = track ? track.sold.reduce((a, j) => a + j.price, 0) : 0;
  const gear = track ? track.sold.reduce((a, j) => a + j.gear, 0) : 0;
  const gearShare = sales > 0 && gear > 0 ? gear / sales : null;
  const gearMax = track?.maxGear ?? null;
  const gearSt: Status = gearShare == null ? none("No costs yet") : gearMax != null ? status(gearShare * 100, gearMax * 100, { pts: true, lower: true }) : none();
  const jp = m.jobProfitRecent ?? null;
  const cogs = jp?.margin != null && jp.costed >= 5 ? 1 - jp.margin : null;
  const cogsSt: Status = cogs == null ? none("Too few costed") : cogs > 0.8 ? { k: "bad", w: "Over 80%" } : cogs > 0.75 ? { k: "mid", w: "Close to 80%" } : { k: "good", w: "Under 80%" };

  // The crew, last 7 days: hours of billed work a day per person, against the hours billed a day we price on.
  const target = hour?.i.billPerDay ?? 6;
  const people = (crew ?? []).filter((p) => p.days > 0 && p.onSiteTimed > 0);
  const work = people.reduce((a, p) => a + p.workHrs, 0);
  const days = people.reduce((a, p) => a + p.days, 0);
  const timed = people.reduce((a, p) => a + p.onSiteTimed, 0);
  const workDay = days > 0 ? work / days : null;
  const speed = timed > 0 ? work / timed : null;
  const effSt: Status = workDay == null ? none("No timesheets") : workDay >= target ? { k: "good", w: "On target" } : workDay >= target - 1.5 ? { k: "mid", w: "Under" } : { k: "bad", w: "Well under" };
  const daysIn = Math.max(1, (m.workingDaysTotal ?? 0) - (m.workingDaysLeft ?? 0));
  const leadsUsual = m.leadsMonth > 0 ? m.leadsMonth / daysIn : null;
  const team = m.daily?.team ?? null;

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head("ServiceTitan")}
        <Say>
          {weekend ? <>It&rsquo;s the weekend, so there&rsquo;s no daily target{m.soldToday > 0 ? <>; {money(m.soldToday)} sold today is extra. </> : ". "}</> : usual ? <>Selling is {sellSt.k === "good" ? "on track" : sellSt.k === "mid" ? "close to goal" : "behind"} today. </> : <>No sales goal is set, so today has nothing to be measured against. </>}
          {notBilled > 0 && <Bad>{plural(notBilled, "job is", "jobs are")} done but not billed.</Bad>}
        </Say>
        <Pair>
          <Hero dark st={usual || weekend ? sellSt : undefined} label="Sold today" right={weekend ? "weekend, no target" : usual ? goalWords(m, usual, "day") : "no goal set"} fig={money(m.soldToday)} frac={usual ? m.soldToday / usual : null}
            sub={<>{plural(m.soldCountToday, "job")} sold · {plural(m.quotesCreatedTodayCount, "quote")} sent{weekend ? null : <TwoGoals levels={levels} done={m.soldToday} need={usual} />}</>} />
          <Hero st={g.byNow ? monthSt : undefined} label={`${now.month} so far`} right={g.month ? goalWords(m, g.month) : "no goal set"} fig={money(m.soldMtd)} frac={g.month ? m.soldMtd / g.month : null}
            sub={<>{g.byNow != null ? `${money(g.byNow)} is where the goal says we should be by now` : "Set a year goal to see the pace"}<TwoGoals levels={levels} done={m.soldMtd} need={g.byNow} /></>} href="/portal/sales" />
        </Pair>
        <Grid>
          <Tile label="Quoted" st={weekend ? (m.quotesCreatedTodayValue > 0 ? extra : none("Weekend")) : quotedUsual ? status(m.quotesCreatedTodayValue, quotedUsual) : none()} fig={money(m.quotesCreatedTodayValue)} frac={quotedUsual ? m.quotesCreatedTodayValue / quotedUsual : null}
            sub={<>{plural(m.quotesCreatedTodayCount, "quote")}{quotedUsual ? ` · a usual day ${money(quotedUsual)}` : ""}{weekend ? null : <TwoGoals levels={levels} done={m.quotesCreatedTodayValue} need={quotedUsual} />}</>} href="/portal/pipeline" />
          <Tile label="Jobs done" st={team && team.jobsTotal ? (team.jobsDone >= team.jobsTotal ? { k: "good", w: "All done" } : none("Going")) : none("")}
            fig={team ? `${team.jobsDone} of ${team.jobsTotal}` : String(m.jobsCompletedToday)} frac={team && team.jobsTotal ? team.jobsDone / team.jobsTotal : null}
            sub={team ? `${team.jobsTotal - team.jobsDone} still on the go` : "finished today"} href="/portal/jobs" />
          <Tile label="Billed" st={notBilled ? { k: "mid", w: "To bill" } : { k: "good", w: "All billed" }} fig={money(m.revenueToday)} frac={m.revenueToday + m.toBillValue > 0 ? m.revenueToday / (m.revenueToday + m.toBillValue) : null}
            sub={notBilled ? (m.toBillValue ? `${money(m.toBillValue)} done, not billed` : `${plural(notBilled, "job")} done, not billed`) : "nothing waiting to bill"} href="/portal/jobs?tab=notbilled" />
          <Tile label="Leads" st={weekend ? (m.leadsToday > 0 ? extra : none("Weekend")) : leadsUsual ? status(m.leadsToday, leadsUsual) : none("")} fig={String(m.leadsToday)} frac={leadsUsual ? m.leadsToday / leadsUsual : null}
            sub={leadsUsual ? `usual ${leadsUsual.toFixed(leadsUsual < 10 ? 1 : 0)} a day` : "this month so far"} href="/portal/leads" />
        </Grid>
        <Lh>Before the Reece bill</Lh>
        <Grid cols={3}>
          <Tile label="Gear in this month's sales" st={gearSt} fig={gearShare != null ? `${Math.round(gearShare * 100)}%` : ""} frac={gearShare}
            sub={gearShare != null ? `${money(gear)} of ${money(sales)} sold${gearMax != null ? ` · most a sale can carry ${Math.round(gearMax * 100)}%` : ""}` : "nothing sold with costs yet this month"} href="/portal/pace?view=month" />
          <Tile label="Cost of goods, last 30 days" st={cogsSt} fig={cogs != null ? `${(Math.round(cogs * 1000) / 10).toFixed(1)}%` : ""} frac={cogs}
            sub={jp ? `gear and labour on ${jp.costed} finished jobs · keep it under 80%` : "no finished jobs costed yet"} href="/portal/profit" />
          <Tile label="Billed work a day, last 7 days" st={effSt} fig={workDay != null ? `${workDay.toFixed(1)} hrs` : ""} frac={workDay != null ? Math.min(1, workDay / 8) : null}
            sub={workDay != null ? `of every 8-hour day · aim ${target}${speed != null ? ` · done at ${Math.round(speed * 100)}% speed` : ""}` : "no timesheets this week"} href="/portal/finance/cover?t=days&p=7" />
        </Grid>
        <Two>
          <Card title="Sold today" aside={usual ? "dashed line · a usual day" : "no goal set"}>
            <SoldTodayChart points={points} usual={usual} nowHour={now.hour} />
          </Card>
          <div>
            <Lh>Needs someone</Lh>
            {lines.length ? (
              <Group>
                {lines.slice(0, 6).map((l) => {
                  const look = needLook(l);
                  const [what, ...rest] = l.text.split(" · ");
                  return <Row key={l.href + what} href={l.href} lead={<span className="pk-ico"><Icon name={look.icon} size={16} /></span>} title={`${l.n} ${what}`} sub={rest.join(" · ") || undefined} end={<Pill st={{ k: "bad", w: look.word }} />} />;
                })}
              </Group>
            ) : <Empty>Nothing waiting on anyone.</Empty>}
          </div>
        </Two>
      </div>
    </PortalShell>
  );
}
