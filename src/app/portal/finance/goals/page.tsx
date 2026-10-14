import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getSettings, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { Bad, Btn, Card, Empty, Good, Grid, Head, Kv, Note, Pill, Say, Tile, Two, none, status, type Status } from "@/components/portal/kit/Kit";
import { GoalBars, InOutChart, type GoalBar } from "@/components/portal/kit/HoverCharts";
import { XeroOff } from "@/components/portal/finance/Parts";
import { getMoneySeries, getMonthlyActuals, localToday, xeroStatus } from "@/lib/portal/xero";
import { monthOnMonth, overheadStanding, periodLabel, readYearGoal, standing, yearSpans, type MonthActual, type YearGoal } from "@/lib/portal/yearGoal";
import { money } from "@/lib/portal/run/month";
import { Locked } from "@/components/portal/Locked";
import { PaceTabs } from "@/components/portal/run/RunTabs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Year goal — Team portal" };

const ahead = (d: number | null, flip = false): Status => {
  if (d == null) return none("No figure");
  if (Math.abs(d) < 1) return { k: "good", w: "Level" };
  const good = flip ? d < 0 : d > 0;
  return good ? { k: "good", w: flip ? "Under" : "Ahead" } : { k: "bad", w: flip ? "Over" : "Behind" };
};

/**
 * Profit & finance › Year goal: invoiced against the goal, a month at a time,
 * coloured by whether each month made it — and the twelve months of sales
 * against costs beside it, both charts you can point at for the figures.
 */
export default async function YearGoalPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const today = localToday();
  const stored = dbConfigured() ? await getSettings<Partial<YearGoal>>("yeargoal").catch(() => null) : null;
  // An unset goal still renders: the page shows the months Xero has and says
  // the goal is missing, rather than redirecting to a form.
  const goal: YearGoal = readYearGoal(stored, today);

  const { status: xs, tenantName } = await xeroStatus();
  const spans = yearSpans(goal.basis, goal.year);
  const [raw, rolling] = xs === "connected"
    ? await Promise.all([
      getMonthlyActuals(spans, today).catch(() => spans.map(() => null)),
      getMoneySeries("12m").catch(() => []),
    ])
    : [spans.map(() => null), []];
  const actuals: MonthActual[] = raw.map((p) => ({ income: p?.income ?? null, expenses: p?.expenses ?? null, netProfit: p?.netProfit ?? null }));

  const y = standing(goal, actuals, today);
  const oh = overheadStanding(goal, y);
  const mom = monthOnMonth(y);
  const noGoal = goal.revenue <= 0;
  const label = periodLabel(goal);

  const bars: GoalBar[] = y.months.map((m, i) => ({
    label: m.label.slice(0, 3),
    full: `${m.label} ${spans[i].year}`,
    value: m.started ? m.income : null,
    goal: noGoal ? null : m.goal,
    state: m.complete ? "done" : m.started ? "now" : "future",
  }));
  const made = y.months.filter((m) => m.complete && m.vsGoal != null && !noGoal);
  const hit = made.filter((m) => m.vsGoal! >= 0).length;
  const io = rolling.filter((p) => p.ok).map((p) => ({ label: p.label, full: p.full, in: p.income, out: p.expenses }));
  const ytdSt: Status = noGoal || y.banked == null ? none(noGoal ? "No goal yet" : "No figure") : status(y.banked, y.expectedToDate);
  const avgLeft = noGoal ? null : y.months.filter((m) => !m.complete).reduce((a, m) => a + m.goal, 0) / Math.max(1, y.monthsLeft);

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Year goal" sub={`${label} · goal from Pricing & costs · actuals from Xero${tenantName ? ` · ${tenantName}` : ""}`} info={[
          ["Goal by now", "Each month’s goal from Pricing & costs, added up to today. Busy months carry more of the year."],
          ["Invoiced", "What Xero says was invoiced each month, before GST."],
          ["Colours", "A month that made its goal is green with ▲; one that didn’t is red with ▼. This month is dashed until it’s over."],
          ["Change the goal", "Pricing & costs › Goals. Pace and the wall board read the same goal."],
        ]} />
        <PaceTabs on="year" />

        {xs !== "connected" ? <XeroOff state={xs} what="year to measure against the goal" /> : (
          <>
            <Say>
              {noGoal ? <>There’s no sales goal for {label} yet, so the months below are what Xero has with nothing to measure them against.</> : y.banked == null ? <>Xero didn’t answer for any month of {label}.</> : (
                <>
                  {label} has invoiced <b>{money(y.banked)}</b> of {money(y.goal)}. By today it should be at {money(y.expectedToDate)}, so it’s{" "}
                  {y.delta! >= 0 ? <Good>{money(y.delta!)} ahead</Good> : <Bad>{money(-y.delta!)} behind</Bad>}.{" "}
                  {made.length ? <>{hit} of {made.length} finished {made.length === 1 ? "month" : "months"} made {made.length === 1 ? "its" : "their"} goal.</> : null}
                </>
              )}
            </Say>

            <Grid cols={4}>
              <Tile label="Invoiced so far" st={ytdSt} fig={y.banked != null ? money(y.banked) : "—"} frac={y.progress}
                sub={noGoal ? "no goal yet" : `${Math.round((y.progress ?? 0) * 100)}% of ${money(y.goal)}${y.missingMonths ? ` · ${y.missingMonths} month${y.missingMonths === 1 ? "" : "s"} Xero didn’t answer` : ""}`} />
              <Tile label="Against the pace" st={noGoal ? none() : ahead(y.delta)} fig={y.delta == null || noGoal ? "—" : `${y.delta >= 0 ? "▲" : "▼"} ${money(Math.abs(y.delta))}`}
                frac={y.banked != null && y.expectedToDate > 0 ? y.banked / y.expectedToDate : null} sub={`${money(y.expectedToDate)} is where the year should be today`} />
              <Tile label="Needed a month" st={y.neededPerRemainingMonth == null || avgLeft == null || noGoal ? none(noGoal ? "No goal yet" : "No figure") : status(avgLeft, y.neededPerRemainingMonth)}
                fig={y.neededPerRemainingMonth == null || noGoal ? "—" : money(y.neededPerRemainingMonth)} frac={y.neededPerRemainingMonth && avgLeft ? avgLeft / y.neededPerRemainingMonth : null}
                sub={noGoal ? "no goal yet" : `over the ${y.monthsLeft} ${y.monthsLeft === 1 ? "month" : "months"} left${avgLeft != null ? ` · the goal has ${money(avgLeft)}` : ""}`} />
              <Tile label="Months that made it" st={made.length ? status(hit, made.length) : none("None finished yet")} fig={made.length ? `${hit} of ${made.length}` : "—"}
                frac={made.length ? hit / made.length : null} sub="finished months at or over their goal" />
            </Grid>

            <Card title="Invoiced against each month’s goal" aside={noGoal ? "no goal set" : "green ▲ made it · red ▼ short · dashed tick = goal · point at a month"}>
              {y.hasActuals || !noGoal ? <GoalBars months={bars} /> : <Empty>Xero hasn’t returned any months yet.</Empty>}
            </Card>

            <Two>
              <Card title="Last month" aside="finished months only">
                {mom.latest == null || mom.previous == null ? <Empty>Not enough finished months in {label} yet to compare.</Empty> : (
                  <>
                    <Kv t={mom.previous.label} v={mom.previous.income == null ? "—" : money(mom.previous.income)} />
                    <Kv t={mom.latest.label} v={mom.latest.income == null ? "—" : money(mom.latest.income)} />
                    <Kv t={<b>Change</b>} sub={mom.changePct != null ? `${Math.round(Math.abs(mom.changePct) * 100)}% on ${mom.previous.label}` : undefined}
                      v={mom.change == null ? "—" : <Pill st={mom.change >= 0 ? { k: "good", w: `Up ${money(mom.change)}` } : { k: "bad", w: `Down ${money(-mom.change)}` }} />} />
                    <Note>A part month against a whole one always reads as a collapse, so this month waits until it’s over.</Note>
                  </>
                )}
              </Card>
              <Card title="Overheads" aside="everything out, from the P&L">
                <Kv t="Spent so far" sub={`${label} to date`} v={oh.spent == null ? "—" : money(oh.spent)} />
                <Kv t="Running at" sub="a month, over the finished months" v={oh.perMonth == null ? "—" : money(oh.perMonth)} />
                <Kv t="Expected by now" sub={oh.goal == null ? "no overhead figure set for the year" : `of ${money(oh.goal)} for the year`} v={oh.expectedToDate == null ? "—" : money(oh.expectedToDate)} />
                <Kv t={<b>Against that</b>} v={oh.delta == null ? "—" : <Pill st={{ ...ahead(oh.delta, true), w: `${money(Math.abs(oh.delta))} ${oh.delta > 0 ? "over" : "under"}` }} />} />
              </Card>
            </Two>

            <Card title="Sales and costs, last 12 months" aside="solid = sales · dashed = costs · green where it made a profit · point at a month">
              {io.length >= 2 ? <InOutChart points={io} inLabel="Sales" outLabel="Costs" gap={["Profit", "Loss"]} /> : <Empty>Xero didn’t return enough months to draw.</Empty>}
            </Card>

            <Card title="Month by month" aside={<Btn href="/portal/numbers" quiet>Change the goal ›</Btn>}>
              <div className="pk-tbl-wrap">
                <table className="pk-tbl">
                  <thead><tr><th>Month</th>{!noGoal && <th>Goal</th>}<th>Invoiced</th>{!noGoal && <th>Against goal</th>}<th>Overheads</th><th>Net</th></tr></thead>
                  <tbody>
                    {y.months.map((m, i) => (
                      <tr key={m.label} style={!m.started ? { color: "var(--ink3)" } : undefined}>
                        <td><b>{m.label}</b> <span className="ks">{spans[i].year}{!m.started ? " · to come" : m.complete ? "" : " · so far"}</span></td>
                        {!noGoal && <td>{money(m.goal)}</td>}
                        <td>{m.income == null ? (m.started ? "no answer" : "—") : money(m.income)}</td>
                        {!noGoal && (
                          <td>
                            {/* Finished months only: two days of October against a whole
                                month's goal is a fact about the date, not about October. */}
                            {m.complete && m.vsGoal != null
                              ? <Pill st={{ ...ahead(m.vsGoal), w: `${money(Math.abs(m.vsGoal))} ${m.vsGoal >= 0 ? "over" : "short"}` }} />
                              : <span className="ks">{m.started && !m.complete ? "part month" : "—"}</span>}
                          </td>
                        )}
                        <td>{m.expenses == null ? "—" : money(m.expenses)}</td>
                        <td style={{ color: m.netProfit == null ? undefined : m.netProfit < 0 ? "var(--bad)" : undefined, fontWeight: m.netProfit != null && m.netProfit < 0 ? 700 : undefined }}>
                          {m.netProfit == null ? "—" : `${m.netProfit < 0 ? "▼ " : ""}${money(m.netProfit)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </PortalShell>
  );
}
