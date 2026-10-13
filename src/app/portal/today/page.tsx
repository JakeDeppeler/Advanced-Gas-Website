import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { latestBoard } from "@/lib/portal/office";
import { needsToday, type NeedLine } from "@/lib/portal/needs";
import { callStats, soldTodayPoints } from "@/lib/portal/run/data";
import { melNow, money, plural, salesGoal } from "@/lib/portal/run/month";
import { BENCH, benchStatus } from "@/lib/portal/benchmarks";
import { Av, Bad, Card, Empty, Grid, Group, Head, Hero, Kv, Lh, Pair, Pill, Row, Say, Tabs, Tile, Two, none, status, type Status } from "@/components/portal/kit/Kit";
import { SoldTodayChart } from "@/components/portal/kit/Charts";
import { Icon } from "@/components/portal/shell/Sidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today — Team portal" };

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
 * Team now is each tech's day; Call booking is calls into booked jobs.
 */
export default async function TodayPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Today" forWhom="the office" />;

  const tab = ["team", "calls"].includes(searchParams.tab ?? "") ? (searchParams.tab as string) : "overview";
  const [board, lines, points, calls] = await Promise.all([
    latestBoard(),
    needsToday(user).catch(() => []),
    tab === "overview" ? soldTodayPoints() : Promise.resolve([] as [number, number][]),
    tab === "calls" ? callStats(7) : Promise.resolve(null),
  ]);
  const m = board?.metrics ?? null;
  const now = melNow();
  const techs = m?.daily?.techs ?? [];
  const over = techs.filter((t) => t.hoursQuoted != null && t.hoursTakenQuoted > t.hoursQuoted + 0.25);

  const tabs = (
    <Tabs on={tab} items={[
      { key: "overview", label: "Overview", href: "/portal/today" },
      { key: "team", label: "Team now", href: "/portal/today?tab=team", count: techs.length || undefined },
      { key: "calls", label: "Call booking", href: "/portal/today?tab=calls" },
    ]} />
  );
  const head = (sub: string) => (
    <Head title="Today" sub={`${now.day} · ${now.time} · ${sub}`} info={[
      ["A usual day", "The month’s sales goal spread over its working days. Today is measured against it."],
      ["Sold", "Quotes a customer said yes to today. A quote re-sold for the same amount stays on the day it first sold."],
      ["Billed", "Everything invoiced today, whenever the job was done."],
    ]} />
  );

  if (!m) {
    return (
      <PortalShell user={user}>
        <div className="pk">{head("ServiceTitan")}{tabs}<Empty>The board hasn’t made its first snapshot yet, so there’s nothing to show for today.</Empty></div>
      </PortalShell>
    );
  }

  if (tab === "team") {
    return (
      <PortalShell user={user}>
        <div className="pk">
          {head("ServiceTitan")}
          {tabs}
          <Say>
            {techs.length ? <>{plural(techs.length, "person", "people")} on jobs today. </> : <>Nobody has a job in ServiceTitan today. </>}
            {over.length > 0 && <Bad>{over.map((t) => t.tech.split(" ")[0]).join(" and ")} {over.length > 1 ? "are" : "is"} running over.</Bad>}
          </Say>
          {techs.length ? (
            <Grid>
              {techs.map((t) => {
                const st: Status = t.hoursQuoted == null ? none("No quoted time") : t.hoursTakenQuoted > t.hoursQuoted + 0.25 ? { k: "bad", w: "Over time" } : { k: "good", w: "On time" };
                const where = t.onNow ? [t.onNow.what, t.onNow.where].filter(Boolean).join(" · ") : t.jobsDone === t.jobsTotal ? "All done for today" : "Between jobs";
                return (
                  <Card key={t.tech}>
                    <div className="pk-tl" style={{ color: "var(--ink)" }}><span style={{ display: "flex", alignItems: "center", gap: 10 }}><Av name={t.tech} /><b style={{ fontSize: 16 }}>{t.tech.split(" ")[0]}</b></span><Pill st={st} /></div>
                    <div className="pk-ks" style={{ marginTop: 10 }}>{where}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                      <span className="pk-ks">{t.jobsDone} of {t.jobsTotal} jobs · {t.hoursTaken.toFixed(1)} hrs</span>
                      <b>{money(t.billedValue)} billed</b>
                    </div>
                  </Card>
                );
              })}
            </Grid>
          ) : <Empty>No jobs on the schedule today.</Empty>}
        </div>
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
          {tabs}
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
  const usual = m.dailySalesTarget ?? null;
  const sellSt = usual ? status(m.soldToday, usual) : none();
  const g = salesGoal(m);
  const notBilled = m.toBillCount ?? 0;
  const quotedUsual = m.dailyQuotedTarget ?? null;
  const daysIn = Math.max(1, (m.workingDaysTotal ?? 0) - (m.workingDaysLeft ?? 0));
  const leadsUsual = m.leadsMonth > 0 ? m.leadsMonth / daysIn : null;
  const team = m.daily?.team ?? null;

  return (
    <PortalShell user={user}>
      <div className="pk">
        {head("ServiceTitan")}
        {tabs}
        <Say>
          {usual ? <>Selling is {sellSt.k === "good" ? "on track" : sellSt.k === "mid" ? "close to goal" : "behind"} today. </> : <>No sales goal is set, so today has nothing to be measured against. </>}
          {notBilled > 0 && <Bad>{plural(notBilled, "job is", "jobs are")} done but not billed.</Bad>}
        </Say>
        <Pair>
          <Hero dark label="Sold today" right={usual ? `a usual day ${money(usual)}` : "no goal set"} fig={money(m.soldToday)} frac={usual ? m.soldToday / usual : null}
            sub={`${plural(m.soldCountToday, "job")} sold · ${plural(m.quotesCreatedTodayCount, "quote")} sent`} />
          <Hero label={`${now.month} so far`} right={g.month ? `goal ${money(g.month)}` : "no goal set"} fig={money(m.soldMtd)} frac={g.month ? m.soldMtd / g.month : null}
            sub={g.byNow != null ? `${money(g.byNow)} is where the goal says we should be by now` : "Set a year goal to see the pace"} href="/portal/sales" />
        </Pair>
        <Grid>
          <Tile label="Quoted" st={quotedUsual ? status(m.quotesCreatedTodayValue, quotedUsual) : none()} fig={money(m.quotesCreatedTodayValue)} frac={quotedUsual ? m.quotesCreatedTodayValue / quotedUsual : null}
            sub={`${plural(m.quotesCreatedTodayCount, "quote")}${quotedUsual ? ` · usual ${money(quotedUsual)}` : ""}`} href="/portal/pipeline" />
          <Tile label="Jobs done" st={team && team.jobsTotal ? (team.jobsDone >= team.jobsTotal ? { k: "good", w: "All done" } : none("Going")) : none("")}
            fig={team ? `${team.jobsDone} of ${team.jobsTotal}` : String(m.jobsCompletedToday)} frac={team && team.jobsTotal ? team.jobsDone / team.jobsTotal : null}
            sub={team ? `${team.jobsTotal - team.jobsDone} still on the go` : "finished today"} href="/portal/today?tab=team" />
          <Tile label="Billed" st={notBilled ? { k: "mid", w: "To bill" } : { k: "good", w: "All billed" }} fig={money(m.revenueToday)} frac={m.revenueToday + m.toBillValue > 0 ? m.revenueToday / (m.revenueToday + m.toBillValue) : null}
            sub={notBilled ? (m.toBillValue ? `${money(m.toBillValue)} done, not billed` : `${plural(notBilled, "job")} done, not billed`) : "nothing waiting to bill"} href="/portal/jobs?tab=notbilled" />
          <Tile label="Leads" st={leadsUsual ? status(m.leadsToday, leadsUsual) : none("")} fig={String(m.leadsToday)} frac={leadsUsual ? m.leadsToday / leadsUsual : null}
            sub={leadsUsual ? `usual ${leadsUsual.toFixed(leadsUsual < 10 ? 1 : 0)} a day` : "this month so far"} href="/portal/leads" />
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
