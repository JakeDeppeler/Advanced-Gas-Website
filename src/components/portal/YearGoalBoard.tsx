"use client";

import Link from "next/link";
import { money, pct } from "@/lib/portal/format";
import {
  monthOnMonth,
  overheadStanding,
  periodLabel,
  standing,
  yearSpans,
  type MonthActual,
  type YearGoal,
} from "@/lib/portal/yearGoal";

/**
 * The year on one page: the goal, how it breaks down, and where we actually
 * are — with the overhead line beside it, because a revenue year that lands
 * on an overhead year that ran 20% over is not the year anybody wanted.
 */

/** Written out, never left to colour alone. */
function Verdict({ delta, goodWhenPositive = true }: { delta: number | null; goodWhenPositive?: boolean }) {
  if (delta == null) return <span className="pt-yg__verdict">Not enough to say</span>;
  if (Math.abs(delta) < 1) return <span className="pt-yg__verdict">Level</span>;
  const good = goodWhenPositive ? delta > 0 : delta < 0;
  return (
    <span className={`pt-yg__verdict pt-yg__verdict--${good ? "good" : "bad"}`}>
      {money(Math.abs(delta))} {delta > 0 ? "ahead" : "behind"}
    </span>
  );
}

export function YearGoalBoard({
  goal,
  actuals,
  today,
  xero,
}: {
  goal: YearGoal;
  /** Twelve entries in period order. Any can be null — Xero didn't answer. */
  actuals: MonthActual[];
  /** Melbourne's today, resolved on the server so the server and the browser agree. */
  today: string;
  xero: "connected" | "not-connected" | "not-configured";
}) {
  const now = new Date(today + "T00:00:00Z");
  const year$ = standing(goal, actuals, now);
  const oh = overheadStanding(goal, year$);
  const mom = monthOnMonth(year$);
  const spans = yearSpans(goal.basis, goal.year);

  const noGoal = goal.revenue <= 0;
  const max = Math.max(...year$.months.map((m) => Math.max(m.goal, m.income ?? 0)), 1);

  return (
    <div className="pt-yg">
      {/* ---- the goal itself ---- */}
      <section className="pt-panel">
        <div className="pt-yg__head">
          <div>
            <h2 className="pt-panel__h">The goal — {periodLabel(goal)}</h2>
            <p className="pt-panel__sub">
              {goal.basis === "financial"
                ? "Financial year, 1 July to 30 June."
                : "Calendar year, January to December."}{" "}
              It is set on the Year goal page, and the wall board paces against the same figure.
            </p>
          </div>
          <Link href="/portal/goal" className="pt-btn pt-btn--ghost pt-btn--sm">
            {noGoal ? "Set the goal" : "Change the goal"}
          </Link>
        </div>

        {noGoal ? (
          <p className="pt-yg__none">
            No goal set for {periodLabel(goal)} yet. Everything below stays blank until there is one — a page that
            invents a target is worse than a page that admits it hasn&rsquo;t got one.
          </p>
        ) : (
          <div className="pt-yg__strip">
            <div className="pt-yg__cell">
              <span>Goal</span>
              <strong>{money(year$.goal)}</strong>
              <small>{money(year$.goal / 12)} a month on average</small>
            </div>
            <div className="pt-yg__cell">
              <span>Invoiced so far</span>
              <strong>{year$.banked == null ? "—" : money(year$.banked)}</strong>
              <small>
                {year$.progress == null ? "Xero hasn’t answered" : `${pct(year$.progress)} of the year`}
                {year$.missingMonths > 0
                  ? ` · ${year$.missingMonths} ${year$.missingMonths === 1 ? "month" : "months"} Xero didn’t answer for`
                  : ""}
              </small>
            </div>
            <div className="pt-yg__cell">
              <span>Against the pace</span>
              <strong>
                <Verdict delta={year$.delta} />
              </strong>
              <small>{money(year$.expectedToDate)} is where the year should be by today</small>
            </div>
            <div className="pt-yg__cell">
              <span>Left to do</span>
              <strong>
                {year$.neededPerRemainingMonth == null ? "—" : money(year$.neededPerRemainingMonth)}
              </strong>
              <small>
                a month, across the {year$.monthsLeft} {year$.monthsLeft === 1 ? "month" : "months"} still to come
              </small>
            </div>
          </div>
        )}
      </section>

      {xero !== "connected" && (
        <div className="pt-note">
          <strong>Xero isn&rsquo;t connected.</strong>{" "}
          {xero === "not-configured"
            ? "The app credentials aren’t set on the server, so there are no actuals to compare the goal against."
            : "Link the organisation on the Finance page and the actuals fill in by themselves."}
        </div>
      )}

      {/* ---- last month vs the one before ----
             Shown with or without a goal: "was last month better than the one
             before" is a fair question on its own, and the answer doesn't
             depend on what we were aiming at. */}
      {year$.hasActuals && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Last month</h2>
          <p className="pt-panel__sub">
            Complete months only. A month three days old against a whole one always reads as a collapse, which is the
            comparison people make by accident every time it&rsquo;s offered to them.
          </p>
          {mom.latest == null || mom.previous == null ? (
            <p className="pt-yg__none">
              Not enough complete months in {periodLabel(goal)} yet to compare one against another.
            </p>
          ) : (
            <div className="pt-yg__mom">
              <div className="pt-yg__momcell">
                <span>{mom.previous.label}</span>
                <strong>{mom.previous.income == null ? "—" : money(mom.previous.income)}</strong>
              </div>
              <div className="pt-yg__momarrow" aria-hidden="true">
                →
              </div>
              <div className="pt-yg__momcell">
                <span>{mom.latest.label}</span>
                <strong>{mom.latest.income == null ? "—" : money(mom.latest.income)}</strong>
              </div>
              <div className="pt-yg__momverdict">
                {mom.change == null ? (
                  <span className="pt-yg__verdict">Not enough to say</span>
                ) : (
                  <>
                    <span className={`pt-yg__verdict pt-yg__verdict--${mom.change >= 0 ? "good" : "bad"}`}>
                      {mom.change >= 0 ? "Up" : "Down"} {money(Math.abs(mom.change))}
                    </span>
                    {mom.changePct != null && <small>{pct(Math.abs(mom.changePct))} on {mom.previous.label}</small>}
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---- overheads ---- */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">Overheads</h2>
        <p className="pt-panel__sub">
          Everything out, straight from the filed accounts — the same figure the profit and loss reports, so the two
          can&rsquo;t drift apart.
        </p>
        <div className="pt-yg__strip">
          <div className="pt-yg__cell">
            <span>Spent so far</span>
            <strong>{oh.spent == null ? "—" : money(oh.spent)}</strong>
            <small>{oh.spent == null ? "Xero hasn’t answered" : `${periodLabel(goal)} to date`}</small>
          </div>
          <div className="pt-yg__cell">
            <span>Running at</span>
            <strong>{oh.perMonth == null ? "—" : money(oh.perMonth)}</strong>
            <small>a month, averaged over the complete months</small>
          </div>
          <div className="pt-yg__cell">
            <span>Expected by now</span>
            <strong>{oh.expectedToDate == null ? "—" : money(oh.expectedToDate)}</strong>
            <small>{oh.goal == null ? "No overhead figure set for the year" : `of ${money(oh.goal)} for the year`}</small>
          </div>
          <div className="pt-yg__cell">
            <span>Against that</span>
            <strong>
              {/* Overspending is the bad direction here, so the sense flips. */}
              {oh.delta == null ? (
                <span className="pt-yg__verdict">Not enough to say</span>
              ) : (
                <span className={`pt-yg__verdict pt-yg__verdict--${oh.delta <= 0 ? "good" : "bad"}`}>
                  {money(Math.abs(oh.delta))} {oh.delta > 0 ? "over" : "under"}
                </span>
              )}
            </strong>
            <small>{oh.goal == null ? "Set one above to track it" : "on the pro-rata share"}</small>
          </div>
        </div>
      </section>

      {/* ---- month by month ---- */}
      <section className="pt-panel">
        <h2 className="pt-panel__h">Month by month</h2>
        <p className="pt-panel__sub">
          {noGoal
            ? "What Xero has, month by month."
            : "The goal spread across the year, against what actually came in. A month that hasn’t started has no actual, and a month Xero couldn’t answer for says so rather than reading as a quiet one."}
        </p>
        <div className="pt-tgt__tablewrap">
          <table className="pt-tgt__table pt-yg__table">
            <thead>
              <tr>
                <th>Month</th>
                {!noGoal && <th>Goal</th>}
                <th>Invoiced</th>
                {!noGoal && <th>Against goal</th>}
                <th>Overheads</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {year$.months.map((m, i) => (
                <tr key={m.label} className={!m.started ? "pt-yg__future" : undefined}>
                  <th scope="row">
                    <strong>{m.label}</strong>
                    <span>
                      {spans[i].year}
                      {!m.started ? " · to come" : m.complete ? "" : " · in progress"}
                    </span>
                  </th>
                  {!noGoal && <td>{money(m.goal)}</td>}
                  <td>
                    {m.income == null ? (
                      <em className="pt-yg__dash">{m.started ? "no answer" : "—"}</em>
                    ) : (
                      money(m.income)
                    )}
                    {m.income != null && !noGoal && (
                      <div className="pt-yg__bar" aria-hidden="true">
                        <i style={{ width: `${Math.min(100, (m.income / max) * 100)}%` }} />
                        <b style={{ left: `${Math.min(100, (m.goal / max) * 100)}%` }} />
                      </div>
                    )}
                  </td>
                  {!noGoal && (
                    <td>
                      {/* Complete months only. Two days into October against a
                          whole month's goal reads as $32k behind, which is not
                          a fact about October — it is a fact about the date.
                          The pace tile at the top does the pro-rated version. */}
                      {m.complete && m.vsGoal != null ? (
                        <Verdict delta={m.vsGoal} />
                      ) : (
                        // A complete month Xero didn't answer for is not a
                        // part month — the invoiced cell beside it already
                        // says "no answer", so this one just stays empty.
                        <em className="pt-yg__dash">{m.started && !m.complete ? "part month" : "—"}</em>
                      )}
                    </td>
                  )}
                  <td>{m.expenses == null ? <em className="pt-yg__dash">—</em> : money(m.expenses)}</td>
                  <td>{m.netProfit == null ? <em className="pt-yg__dash">—</em> : money(m.netProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!noGoal && (
          <p className="pt-yg__legend">
            The bar is what came in; the tick on it is that month&rsquo;s goal.
          </p>
        )}
      </section>
    </div>
  );
}
