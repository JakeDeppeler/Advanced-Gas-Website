"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { suburbCoords } from "@/lib/suburbCoords";
import type { Metrics, SourceState } from "@/lib/dashboard/metrics";
import { Gauge } from "./screen/Gauge";
import { Celebration, type Sale } from "./screen/Celebration";

type Snapshot = {
  computedAt: string;
  metrics: Metrics;
  sources: Record<string, { state: SourceState; detail?: string; at?: string }>;
};

// Re-fetches JSON on a timer rather than reloading the page. A kiosk browser
// left on this URL for months would leak memory and flash white on every
// location.reload(); swapping state in place does neither.
const REFRESH_MS = 30_000;
// How often the board asks the server to recompute, matching the poll so the
// wall is never more than a minute behind the replica. The endpoint recomputes
// the snapshot on every one of these — cheap, it only reads the replica — but
// pulls from ServiceTitan on its own slower floor, because a tenant does not
// want an export request every thirty seconds all day.
const RESYNC_MS = 30_000;
const PAGE_MS = 20_000;
const PAGES = ["Today", "Pace", "Quotes", "Team", "Performance", "Areas"] as const;

/**
 * The line beside each page name: what the figures below it are measuring.
 *
 * Pace names where its targets came from, because "63%" on a wall invites the
 * question and the answer is the whole point of the board.
 */
const SUBTITLES: Record<(typeof PAGES)[number], (m: Metrics) => string> = {
  Today: () => "",
  Pace: (m) => {
    const day = `day ${m.workingDaysTotal - m.workingDaysLeft + 1} of ${m.workingDaysTotal}`;
    if (m.revenueTargetYear == null) return `Monthly targets · ${day}`;
    const goal = m.marginGoal != null ? `${money(m.revenueTargetYear)} at ${pct(m.marginGoal)}` : money(m.revenueTargetYear);
    return `Targets from the ${goal} goal · ${day}`;
  },
  Quotes: () => "Written today, and what's still out",
  Team: () => "Sold, out of quoted",
  Performance: (m) => `${monthName(new Date())} so far · by job type`,
  Areas: () => "Where the work is · last 90 days",
};

const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-AU")}`;
};

/** Full digits. Used wherever a figure is read off the wall and acted on. */
const plain = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-AU")}`;

const count = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-AU"));
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);

/**
 * ServiceTitan-derived figures, gated on the source actually being connected.
 *
 * With no connection every one of these computes to 0 — no jobs, no invoices,
 * no estimates — and a zero is indistinguishable from a measurement. The board
 * said "Quotes out $0" to someone who had sent quotes that morning, which is
 * precisely how a wall board loses the room. Unknown reads as "—".
 *
 * `stale` still shows values: those were measured, just not recently, and the
 * footer already says so.
 */
type Live = { st: boolean };
const NA = "—";

/**
 * The class for a figure, dash-aware.
 *
 * A dash set at hero size is as wide as a progress bar and gets read as one
 * from across the room, so an unavailable figure drops to caption size
 * wherever it appears rather than only in the cards that remembered to ask.
 */
const vcls = (v: string, extra = "") => `tile__value ${v === NA ? "tile__value--na" : extra}`;

const st = {
  money: (n: number | null | undefined, l: Live) => (l.st ? money(n) : NA),
  plain: (n: number | null | undefined, l: Live) => (l.st ? plain(n) : NA),
  count: (n: number | null | undefined, l: Live) => (l.st ? count(n) : NA),
  pct: (n: number | null | undefined, l: Live) => (l.st ? pct(n) : NA),
  sub: (text: string, l: Live) => (l.st ? text : "ServiceTitan not connected"),
};

export function ScreenBoard({
  initial,
  token,
  theme = "light",
}: {
  initial: Snapshot;
  token: string;
  theme?: "dark" | "light";
}) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState(0);
  const [queue, setQueue] = useState<Sale[]>([]);

  // Seeded from the first snapshot so the board doesn't open by cheering every
  // sale already on the books.
  const seen = useRef<Set<number>>(new Set(initial.metrics.recentSales?.map((s) => s.id) ?? []));

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    const rotate = setInterval(() => setPage((p) => (p + 1) % PAGES.length), PAGE_MS);
    return () => {
      clearInterval(clock);
      clearInterval(rotate);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/screen?k=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!res.ok) return; // keep the last good numbers on screen
        const next = (await res.json()) as Snapshot;
        if (cancelled) return;

        const fresh = (next.metrics.recentSales ?? []).filter((s) => !seen.current.has(s.id));
        for (const s of fresh) seen.current.add(s.id);
        if (fresh.length) setQueue((qd) => [...qd, ...fresh]);

        setSnap(next);
      } catch {
        // Network blip — the board keeps showing the previous snapshot.
      }
    }

    async function resync() {
      try {
        const res = await fetch(`/api/screen/refresh?k=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!res.ok) return;
        const { refreshed } = (await res.json()) as { refreshed?: boolean };
        if (refreshed && !cancelled) await poll();
      } catch {
        // The board carries on showing the snapshot it has.
      }
    }

    void resync();
    const timer = setInterval(poll, REFRESH_MS);
    const resyncTimer = setInterval(resync, RESYNC_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearInterval(resyncTimer);
    };
  }, [token]);

  const m = snap.metrics;
  const celebrating = queue[0];
  const name = PAGES[page];
  // Anything downstream of ServiceTitan is unknown rather than zero until the
  // sync has actually talked to it.
  const live: Live = { st: snap.sources.servicetitan?.state !== "not-configured" };

  const degraded = Object.entries(snap.sources).filter(([, s]) => s.state !== "ok");

  /**
   * The light at the bottom of the wall, which is the only thing anybody checks
   * before believing a figure.
   *
   * Green means the snapshot is current AND every feed answered; amber means one
   * of those is not true, and the words next to it say which. A clock face was
   * there before — "Synced 4 min ago" — which asks the room to do the judging.
   *
   * Two minutes is generous against a thirty-second refresh, so one missed poll
   * on a flaky connection doesn't flick the board to amber.
   */
  const ageMs = now.getTime() - Date.parse(snap.computedAt);
  const fresh = Number.isFinite(ageMs) && ageMs < 2 * 60_000;
  const healthy = fresh && degraded.length === 0;

  return (
    <div
      className={`screen ${theme === "dark" ? "screen--dark" : ""}`}
      style={{ "--page-ms": `${PAGE_MS}ms` } as CSSProperties}
    >
      {celebrating && (
        <Celebration key={celebrating.id} sale={celebrating} onDone={() => setQueue((qd) => qd.slice(1))} />
      )}

      <div className="screen__bar">
        <span className="screen__title">{name}</span>
        <span className="screen__subtitle">
          {name === "Today"
            ? `${now.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Australia/Melbourne",
              })} · ${now.toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Australia/Melbourne",
              })}`
            : SUBTITLES[name](m)}
        </span>

        {/* Six dashes and a line of words, in place of the tab strip the board
            used to carry.
            
            The strip spelled out all six page names at every moment, which is
            six things to read to answer one question — where are we up to. The
            dashes answer it without reading, and the line underneath names only
            the page that matters next. It also matches the portal, which is the
            point of the exercise. */}
        <nav className="screen__pager" aria-label="Board pages">
          <span className="screen__dashes" aria-hidden="true">
            {PAGES.map((p, i) => (
              <span key={p} className={`screen__dash ${i === page ? "is-on" : ""}`} />
            ))}
          </span>
          <span className="screen__pagertxt">
            {page + 1} of {PAGES.length} · next: {PAGES[(page + 1) % PAGES.length]}
          </span>
        </nav>
      </div>

      {/* The rule under the header is the progress through the cycle: its
          orange run is this page's share of the six. It replaces the sweeping
          ring, which re-rendered to animate and was a second thing saying the
          same thing as the dashes. */}
      <div className="screen__rule" aria-hidden="true">
        <span style={{ width: `${((page + 1) / PAGES.length) * 100}%` }} />
      </div>

      <div className={`screen__grid ${["screen__grid--today", "screen__grid--pace", "screen__grid--quotes", "screen__grid--team", "screen__grid--perf", "screen__grid--areas"][page]}`}>
        {page === 0 && <TodayPage m={m} live={live} />}
        {page === 1 && <PacePage m={m} live={live} now={now} />}
        {page === 2 && <QuotesPage m={m} live={live} />}
        {page === 3 && <TeamPage m={m} live={live} />}
        {page === 4 && <PerformancePage m={m} live={live} />}
        {page === 5 && <AreasPage m={m} live={live} />}
      </div>

      <div className="screen__foot">
        <span className="screen__feed">
          <span className={`screen__dot ${healthy ? "" : "screen__dot--stale"}`} aria-hidden />
          <b>{healthy ? "Live" : "Catching up"}</b>
        </span>
        <span>
          {degraded.length === 0
            ? fresh
              ? "All feeds connected"
              : "Waiting on a refresh"
            : degraded.map(([n, sc]) => `${n} ${sc.state}${sc.detail ? ` — ${sc.detail}` : ""}`).join(" · ")}
        </span>
        <span className="screen__right">
          <span className="screen__brand">
            Advanced <em>Gas &amp; Aircon</em>
          </span>
          <span>
            {now.toLocaleTimeString("en-AU", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Australia/Melbourne",
            })}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ /01 Today */
/**
 * Today: three figures, then three more with their context.
 *
 * Eleven tiles became six. The page had grown a tile per available number —
 * leads, jobs booked, jobs completed, quotes out, overdue, service mix, three
 * rates — and at that density nothing on it was bigger than anything else,
 * which is the one thing a wall read from four metres needs. The design cuts
 * it to two rows of three, and the figures that left are not lost: jobs
 * completed is the line under Invoiced, the lead count is the line under Jobs
 * booked, quotes out has a page of its own, and the service mix is the job-type
 * table on Performance.
 *
 * Booking rate and cancel rate went with them, and did not come back. Nothing
 * syncs the calls behind a booking rate (ServiceTitan's Telecom scope) and
 * nothing pulls cancellations at all, so both cards had sat there reading "—"
 * for months. A tile that has never once shown a number is not holding a place,
 * it is taking one. See DASHBOARD.md.
 */
function TodayPage({ m, live }: { m: Metrics; live: Live }) {
  const soldJobs = live.st ? m.soldCountToday : null;
  const doneJobs = live.st ? m.jobsCompletedToday : null;

  return (
    <>
      <HeroCard
        navy
        label="Sold today"
        value={st.plain(m.soldToday, live)}
        foot={soldJobs == null ? undefined : `${count(soldJobs)} ${soldJobs === 1 ? "job" : "jobs"} sold`}
      />
      <HeroCard
        label="Invoiced today"
        value={st.plain(m.revenueToday, live)}
        foot={doneJobs == null ? undefined : `${count(doneJobs)} ${doneJobs === 1 ? "job" : "jobs"} completed`}
      />
      <HeroCard
        label="Jobs booked today"
        value={st.count(m.bookingsToday, live)}
        foot={`from ${count(m.leadsToday)} ${m.leadsToday === 1 ? "lead" : "leads"} · ${count(m.leadsWeek)} this week`}
      />

      {/* The second row is the same card three times: what it is and the two
          figures that put it in context on the left, the number itself on the
          right at the size the room reads. */}
      <RateCard
        label="Quoted today"
        lines={[
          `${count(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "quote" : "quotes"} written`,
          `${count(m.quotesCreatedTodaySold)} already closed`,
        ]}
        value={st.plain(m.quotesCreatedTodayValue, live)}
      />
      <RateCard
        label="Close rate"
        lines={
          live.st
            ? [`${count(m.closeRate30dSold)} of ${count(m.closeRate30dQuotes)} quotes`, `last ${m.outstandingDays ?? 30} days`]
            : ["ServiceTitan not connected"]
        }
        value={live.st ? pct(m.closeRate30d) : NA}
      />
      <RateCard
        label="Overdue"
        lines={
          m.overdueTotal == null
            ? ["Not read from Xero yet"]
            : m.receivablesTotal == null
              ? [`${money(m.overdueTotal)} owed`]
              : [`${money(m.overdueTotal)} owed`, `of ${money(m.receivablesTotal)} on the books`]
        }
        value={m.overdueCount == null ? NA : count(m.overdueCount)}
        accent={(m.overdueCount ?? 0) > 0}
      />
    </>
  );
}

/**
 * Pace: today against today's share, the month against its target, and the
 * year against the goal the whole thing is pointed at.
 *
 * Three bands with their names down the left margin, because "63%" means three
 * different things on this page and the row it is in is what says which. The
 * year strip at the foot is the one figure the business is actually driving
 * at; without it the page paced the month against a target whose own reason
 * for existing was off-screen.
 */
function PacePage({ m, live, now }: { m: Metrics; live: Live; now: Date }) {
  const progress = m.workingDaysTotal > 0 ? (m.workingDaysTotal - m.workingDaysLeft) / m.workingDaysTotal : 0;
  const today = dayProgress(now);

  return (
    <>
      <span className="band band--today">Today</span>
      <DailyCard
        label="Sold"
        achieved={live.st ? m.soldToday : null}
        target={m.dailySalesTarget}
        dayProgress={today}
      />
      <DailyCard
        label="Invoiced"
        achieved={live.st ? m.revenueToday : null}
        target={m.dailyTarget}
        dayProgress={today}
      />
      <DailyCard
        label="Jobs booked"
        achieved={live.st ? m.bookingsToday : null}
        target={m.dailyBookingsTarget}
        plainNumber
        dayProgress={today}
      />

      <span className="band band--month">{monthName(now)}</span>
      <Gauge
        label="Sold"
        achieved={live.st ? m.soldMtd : null}
        target={m.salesTargetMonthly}
        progress={progress}
        format={money}
      />
      <Gauge
        label="Invoiced"
        achieved={live.st ? m.revenueInvoicedMtd : null}
        target={m.revenueTargetMonthly}
        progress={progress}
        format={money}
      />
      <Gauge
        label="Profit"
        achieved={live.st ? m.profitMtd : null}
        target={m.profitTargetMonthly}
        progress={progress}
        format={money}
        unavailable={live.st && m.profitMtd == null ? "No cost on any invoice" : undefined}
      />
      <Gauge
        label="Jobs booked"
        achieved={live.st ? m.bookingsMonth : null}
        target={m.bookingsTargetMonthly}
        progress={progress}
        format={(n) => count(n)}
      />

      <span className="band band--year">This year</span>
      <YearStrip m={m} />
    </>
  );
}

/** The month the board is pacing, named rather than numbered. */
const monthName = (now: Date) =>
  now.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });

/**
 * The year goal, as one navy strip: where we are, where the goal says we should
 * be by now, and the two figures that decide whether getting there is worth it.
 *
 * Blank with a reason when no goal is set. A progress bar against an unset
 * target is a bar that always looks the same, which is worse than a sentence.
 */
function YearStrip({ m }: { m: Metrics }) {
  const have = m.revenueInvoicedYtd;
  const goal = m.revenueTargetYear;
  const byNow = m.revenueYearByNow;

  if (goal == null || have == null) {
    return (
      <div className="year">
        <span className="year__none">
          No year goal set. The board paces the month on its own targets until one is.
        </span>
      </div>
    );
  }

  const done = Math.min(100, (have / goal) * 100);
  const mark = byNow == null ? null : Math.min(100, (byNow / goal) * 100);
  const behind = byNow != null && have < byNow;

  return (
    <div className="year">
      <div className="year__main">
        <div className="year__nums">
          <span className="year__have">
            {money(have)} <em>of {money(goal)}</em>
          </span>
          {byNow != null && (
            <span className={`year__bynow ${behind ? "is-behind" : "is-ahead"}`}>
              {money(byNow)} by now
            </span>
          )}
        </div>
        <span className="year__track">
          <span className="year__fill" style={{ width: `${done}%` }} />
          {/* Where the goal says we should be. The bar alone says how far we
              have come; this says whether that is far enough. */}
          {mark != null && <span className="year__mark" style={{ left: `${mark}%` }} />}
        </span>
      </div>
      <div className="year__side">
        <span className="year__k">Margin</span>
        <span className="year__v">
          {m.marginPct == null ? NA : pct(m.marginPct)}
          {m.marginGoal != null && m.marginPct != null ? <em> of {pct(m.marginGoal)}</em> : null}
        </span>
      </div>
      <div className="year__side">
        <span className="year__k">Jobs a week</span>
        <span className="year__v">{m.jobsPerWeek == null ? NA : count(m.jobsPerWeek)}</span>
      </div>
    </div>
  );
}

function QuotesPage({ m, live }: { m: Metrics; live: Live }) {
  if (!live.st) return <NotConnected what="quotes written, still out, or closed" />;

  return (
    <>
      <div className="tile tile--head" style={{ gridColumn: "1 / span 4", gridRow: 1 }}>
        <span className="tile__label">Quoted today</span>
        <span className={vcls(plain(m.quotesCreatedTodayValue))}>{plain(m.quotesCreatedTodayValue)}</span>
        <span className="tile__foot">
          {count(m.quotesCreatedTodayCount)} {m.quotesCreatedTodayCount === 1 ? "quote" : "quotes"}
        </span>
      </div>

      <div className="tile tile--navy tile--head" style={{ gridColumn: "5 / span 4", gridRow: 1 }}>
        <span className="tile__label">Sold today</span>
        <span className={vcls(plain(m.soldToday))}>{plain(m.soldToday)}</span>
        <span className="tile__foot">
          {count(m.quotesCreatedTodaySold)} of {count(m.quotesCreatedTodayCount)} written today
        </span>
      </div>

      {/* The average option rather than a close rate: a rate off ten quotes is
          mostly noise, and the size of what is being written is the thing a
          slow day actually shows up in first. */}
      <div className="tile tile--head" style={{ gridColumn: "9 / span 4", gridRow: 1 }}>
        <span className="tile__label">Average quote</span>
        <span className={vcls(plain(m.avgQuoteToday))}>{plain(m.avgQuoteToday)}</span>
        <span className="tile__foot">
          {m.avgQuoteMonth != null ? `${money(m.avgQuoteMonth)} this month` : "today"}
        </span>
      </div>

      <div className="tile" style={{ gridColumn: "1 / span 7", gridRow: "2 / span 2" }}>
        <div className="tile__head">
          <span className="tile__title">Written today</span>
          <span className="screen__feed tile__sub">
            <span className="screen__dot" aria-hidden />
            Newest first
          </span>
        </div>
        {m.quotesToday.length === 0 ? (
          <span className="tile__sub">No quotes written today yet</span>
        ) : (
          <div className="quotes">
            {m.quotesToday.map((qr) => (
              <div className="quote" key={qr.id}>
                <span className="quote__at">
                  {new Date(qr.at).toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Australia/Melbourne",
                  })}
                </span>
                <span className="quote__label">
                  {qr.label}
                  {qr.who ? <span className="quote__who">{qr.who}</span> : null}
                </span>
                <span className="quote__value">{plain(qr.value)}</span>
                <span className={`quote__state ${qr.sold ? "status status--ahead" : "status status--quiet"}`}>
                  {qr.sold ? "Sold" : "Open"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tile" style={{ gridColumn: "8 / span 5", gridRow: "2 / span 2" }}>
        <div className="tile__head">
          <span className="tile__title">Still out</span>
          <span className="tile__sub">
            {count(m.estimatesOpenCount)} · {money(m.estimatesOpenValue)} · last {m.outstandingDays ?? 30} days
            {m.estimatesStaleCount > 0 && <> · {count(m.estimatesStaleCount)} older, to close off</>}
          </span>
        </div>
        {m.quotesOutstanding.length === 0 ? (
          <span className="tile__sub">Nothing outstanding</span>
        ) : (
          <div className="quotes">
            {m.quotesOutstanding.map((qr) => (
              <div className="quote quote--stack" key={qr.id}>
                <span className="quote__label">{qr.label}</span>
                <span className="quote__value">{plain(qr.value)}</span>
                <span className={`quote__age ${qr.ageDays >= 7 ? "quote__age--late" : ""}`}>
                  {qr.ageDays === 0 ? "Today" : `${qr.ageDays} days${qr.ageDays >= 7 ? " · follow up" : ""}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Team: what each person sold, out of what they wrote.
 *
 * Sold is the headline and quoted is the line under it. It used to be the other
 * way round, on the grounds that too little closed work carried a seller for a
 * sold column to be anything but zeroes — but the bonus-tier bar beside it was
 * always measured on sold, so the page showed one figure big and ranked on
 * another. Attribution is thin rather than absent (a quarter of this month's
 * closed work names who closed it), so the honest fix is to lead with sold and
 * say on the page how much of the month it accounts for.
 *
 * The calls column has gone. It needs ServiceTitan's Telecom scope, which is
 * not granted, so it had shown a dash for every person since the day it was
 * added. See DASHBOARD.md.
 */
function TeamPage({ m, live }: { m: Metrics; live: Live }) {
  if (!live.st) return <NotConnected what="who has sold what" />;

  // Connected, but nothing sold has a seller on it. Saying "not connected" here
  // sent somebody to check the integration, which was fine.
  if (m.salesLeaderboard.length === 0) {
    return (
      <div className="tile c12 screen__notice">
        <span className="tile__sub tile__sub--body">
          No sales this month carry a seller yet. ServiceTitan records who sold a
          quote on the estimate, so the leaderboard fills as quotes are closed
          against a named employee.
        </span>
      </div>
    );
  }

  const totals = m.salesLeaderboard.reduce(
    (a, r) => ({
      today: a.today + r.soldToday,
      week: a.week + r.soldWeek,
      month: a.month + r.sold,
      quoted: a.quoted + r.quoted,
      options: a.options + r.quotes,
    }),
    { today: 0, week: 0, month: 0, quoted: 0, options: 0 },
  );

  /**
   * How much of the month's closed work this table actually accounts for.
   *
   * Only shown when it is short, and then it is the first thing under the
   * heading: a board that silently ranks a quarter of the month is a board that
   * gets somebody a quiet word they did not earn.
   */
  const covered = m.soldMtd > 0 ? totals.month / m.soldMtd : 1;
  const thin = covered < 0.9 && m.soldMtd > 0;

  return (
    <div className="tile c12">
      <div className="tbl">
        <div className="tbl__head">
          <span />
          <span>Tech</span>
          <span>Today</span>
          <span>This week</span>
          <span>{monthName(new Date())}</span>
          <span>Next bonus tier</span>
        </div>

        {m.salesLeaderboard.map((r, i) => (
          <div className={`tbl__row ${i === 0 ? "tbl__row--leader" : ""}`} key={r.name}>
            <span className={`tbl__rank ${i === 0 ? "tbl__rank--leader" : ""}`}>{i + 1}</span>
            <span>
              <span className="tbl__name" style={{ display: "block" }}>
                {r.name}
              </span>
              <span className={`tbl__note ${i === 0 ? "tbl__note--leader" : ""}`}>
                {i === 0
                  ? "Leading the month"
                  : `${count(r.quotes)} ${r.quotes === 1 ? "option" : "options"} written`}
              </span>
            </span>
            <span className="tbl__fig">
              <b>{plain(r.soldToday)}</b>
              <span>of {plain(r.quotedToday)}</span>
            </span>
            <span className="tbl__fig">
              <b>{plain(r.soldWeek)}</b>
              <span>of {plain(r.quotedWeek)}</span>
            </span>
            <span className="tbl__fig">
              <b>{plain(r.sold)}</b>
              <span>of {plain(r.quoted)}</span>
            </span>
            <span className="tiers">
              <span className="tiers__bar">
                <span
                  className={`tiers__fill ${i === 0 ? "is-leader" : ""}`}
                  style={{ width: `${tierProgress(r)}%` }}
                />
              </span>
              {r.toNextTier != null && (
                <span className={`tiers__note ${i === 0 ? "tiers__note--leader" : ""}`}>
                  {money(r.toNextTier)} to tier {(r.tier ?? 0) + 1}
                </span>
              )}
            </span>
          </div>
        ))}

        <div className="tbl__row tbl__row--total">
          <span />
          <span className="tbl__name">Team</span>
          <span className="tbl__fig">
            <b>{plain(totals.today)}</b>
            <span>of {plain(totals.quoted ? m.quotesCreatedTodayValue : 0)}</span>
          </span>
          <span className="tbl__fig">
            <b>{plain(totals.week)}</b>
            <span>of {plain(m.quotesCreatedWeekValue)}</span>
          </span>
          <span className="tbl__fig">
            <b>{plain(totals.month)}</b>
            <span>
              {thin
                ? `of ${plain(m.soldMtd)} sold this month · the rest names no seller`
                : `of ${plain(totals.quoted)} quoted`}
            </span>
          </span>
          <span className="tiers__note">
            {m.commissionTiers.length === 0
              ? "no tiers configured"
              : `Tiers ${m.commissionTiers.map((t) => money(t.from)).join(" · ")} a month`}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * How far along the run to the next tier somebody is, as one bar.
 *
 * Three segments before, which read as three separate things to fill rather
 * than one run with milestones on it — and the middle one was drawn 45% full
 * whatever the actual figure, which is a bar that means nothing.
 */
function tierProgress(r: Metrics["salesLeaderboard"][number]): number {
  if (r.toNextTier == null || r.toNextTier <= 0) return 100;
  const next = r.sold + r.toNextTier;
  return next > 0 ? Math.max(2, Math.min(100, (r.sold / next) * 100)) : 0;
}

/* ------------------------------------------------------------ /05 Performance */
/**
 * Performance: what the month's work was worth, by the kind of job it was.
 *
 * One table, not two panels. The second panel here used to be top suburbs by
 * website lead, which is a different question on a page about job profitability
 * and is answered properly by the heat map on Areas — off thousands of jobs
 * rather than the thirty-odd rows the web form has ever produced.
 *
 * The goal line on each margin bar is the month's own target: profit target
 * over revenue target, both set on the board's settings page. No target set
 * means no line, rather than a line at a number nobody chose.
 */
function PerformancePage({ m, live }: { m: Metrics; live: Live }) {
  const goal =
    m.profitTargetMonthly && m.revenueTargetMonthly && m.revenueTargetMonthly > 0
      ? m.profitTargetMonthly / m.revenueTargetMonthly
      : null;

  const rows = m.topJobTypes.map((t) => ({
    ...t,
    margin: t.profit != null && t.revenue > 0 ? t.profit / t.revenue : null,
  }));

  return (
    <>
      <HeadCard label="Jobs" value={st.count(m.bookingsMonth, live)} />
      <HeadCard label="Invoiced" value={st.money(m.revenueInvoicedMtd, live)} />
      <HeadCard
        label="Profit"
        value={st.money(m.profitMtd, live)}
        foot={live.st && m.profitMtd == null ? "no cost on any invoice" : undefined}
      />
      <HeadCard
        navy
        label="Margin"
        value={live.st ? pct(m.marginPct) : NA}
        suffix={goal != null && m.marginPct != null ? `of ${pct(goal)}` : undefined}
        foot={m.marginPct == null && live.st ? "no cost data in ServiceTitan" : undefined}
      />

      <div className="tile c12">
        <div className="tile__head">
          <span className="tile__title">Job types</span>
          {/* The set-aside count is on the wall, not buried: a ranking that
              quietly omits most of the invoices is a ranking you can't trust. */}
          <span className="tile__sub">
            last 90 days
            {m.jobTypeUnclassified > 0 ? ` · ${count(m.jobTypeUnclassified)} untyped` : ""}
          </span>
        </div>
        {rows.length === 0 ? (
          <span className="tile__sub">{st.sub("No invoiced work in the last 90 days", live)}</span>
        ) : (
          <div className="jt">
            <div className="jt__head">
              <span />
              <span>Jobs</span>
              <span>Revenue</span>
              <span>Profit</span>
              <span className="jt__marginhead">
                Margin{goal != null ? ` · line is the ${pct(goal)} goal` : ""}
              </span>
              <span />
            </div>
            {rows.map((t) => {
              const under = goal != null && t.margin != null && t.margin < goal;
              return (
                <div className="jt__row" key={t.jobType}>
                  <span className="jt__name">{t.jobType}</span>
                  <span className="jt__n">{count(t.jobs)}</span>
                  <span className="jt__n">{money(t.revenue)}</span>
                  <span className="jt__n">{t.profit == null ? NA : money(t.profit)}</span>
                  <span className="jt__bar">
                    {t.margin == null ? null : (
                      <>
                        {/* Scaled to twice the goal, so a bar at the goal sits
                            mid-track and the line has somewhere to be. Without
                            a goal the scale is the best margin on the page. */}
                        <span
                          className={`jt__fill ${under ? "is-under" : "is-over"}`}
                          style={{
                            width: `${Math.min(100, (t.margin / (goal != null ? goal * 2 : Math.max(0.01, ...rows.map((r) => r.margin ?? 0)))) * 100)}%`,
                          }}
                        />
                        {goal != null && <span className="jt__goal" />}
                      </>
                    )}
                  </span>
                  <span className={`jt__pct ${t.margin == null ? "" : under ? "is-under" : "is-over"}`}>
                    {t.margin == null ? NA : pct(t.margin)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Where the work actually is, drawn on the corridor rather than in a grid.
 *
 * The grid of tiles this replaces was a bar chart wearing a map's name: it
 * ranked suburbs but said nothing about where they are, which is the only
 * reason to put geography on a wall. These positions are the real township
 * centres from `suburbCoords`, projected into the box — so the shape on the
 * screen is the shape of the run.
 *
 * No roads and no coastline. The design sketches both, and either would have to
 * be hand-drawn from memory — a wrong coastline on a wall in Pakenham would be
 * noticed by everyone in the room. The blobs carry the whole message.
 */
function SuburbHeat({ places }: { places: Metrics["topJobSuburbs"] }) {
  const located = places.map((p) => ({ ...p, at: suburbCoords[slugForSuburb(p.suburb)] }));
  const pts = located.filter((p): p is typeof p & { at: readonly [number, number] } => !!p.at);
  // A suburb we have no coordinate for would otherwise vanish from the map
  // along with its jobs. It gets named under it instead.
  const offMap = located.filter((p) => !p.at);

  if (pts.length < 2) {
    // One point is not a map. Fall back to naming what there is.
    return (
      <div className="heat__none">
        {places.length === 0
          ? "No completed jobs recorded yet"
          : `${places.map((p) => `${p.suburb} ${p.count}`).join(" · ")}`}
      </div>
    );
  }

  const lats = pts.map((p) => p.at[0]);
  const lngs = pts.map((p) => p.at[1]);
  // A little air around the outermost suburbs so no label sits on the edge.
  const pad = 0.035;
  const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad, maxLng = Math.max(...lngs) + pad;
  const max = Math.max(1, ...pts.map((p) => p.count));

  // Longitude east is right; latitude north is up, so the y axis inverts.
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * 100;

  return (
    <div className="heat">
      {pts.map((p) => {
        const t = p.count / max;
        return (
          <span
            className="heat__blob"
            key={p.suburb}
            style={{
              left: `${x(p.at[1])}%`,
              top: `${y(p.at[0])}%`,
              // Area, not radius, tracks the count: a suburb with four times
              // the jobs should look four times the place, and scaling the
              // radius would make it sixteen.
              "--r": `${6 + Math.sqrt(t) * 13}vw`,
              "--o": String(0.18 + t * 0.62),
            } as CSSProperties}
          />
        );
      })}
      {pts.map((p) => {
        const lead = p.count === max;
        // Past two-thirds across, the label goes on the left of its dot — at
        // the right-hand edge it ran off the box and lost its last word.
        const flip = x(p.at[1]) > 66;
        return (
          <span
            className={`heat__pin ${lead ? "is-lead" : ""} ${flip ? "is-flip" : ""}`}
            key={`${p.suburb}-pin`}
            style={{ left: `${x(p.at[1])}%`, top: `${y(p.at[0])}%` }}
          >
            <span className="heat__dot" aria-hidden="true" />
            <span className="heat__tag">
              {p.suburb} <b>{p.count}</b>
            </span>
          </span>
        );
      })}
      {offMap.length > 0 && (
        <span className="heat__off">
          Also {offMap.map((p) => `${p.suburb} ${p.count}`).join(" · ")}
        </span>
      )}
    </div>
  );
}

/** suburbCoords is keyed by slug; the board carries the display name. */
const slugForSuburb = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "-");

function AreasPage({ m }: { m: Metrics; live: Live }) {
  // Jobs, not website leads. The leads table holds about thirty rows in total,
  // so the map drew the whole catchment from a trickle and named whichever two
  // suburbs had filled in the web form. Completed jobs carry the same suburb
  // column and there are thousands of them.
  const places = m.topJobSuburbs ?? [];
  // Four, not five: the fifth ran off the bottom of the card at 1080p.
  const oldest = [...m.quotesOutstanding].sort((a, b) => b.ageDays - a.ageDays).slice(0, 4);
  /**
   * The best average ticket, over suburbs with enough jobs to mean something.
   * One $14,800 job in a suburb that has had one job is not an average, it is
   * that job — and on a wall it reads as a place worth chasing.
   */
  const best = places
    .filter((p) => p.count >= 3 && p.avg != null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];

  return (
    <>
      <div className="tile" style={{ gridColumn: "1 / span 8", gridRow: "1 / span 3" }}>
        <div className="tile__head">
          <span className="tile__title">Jobs by suburb</span>
          <span className="heat__legend">
            Fewer
            <span className="heat__ramp" />
            More
          </span>
        </div>
        {places.length === 0 ? (
          <span className="tile__sub">No completed jobs recorded yet</span>
        ) : (
          <SuburbHeat places={places} />
        )}
      </div>

      <div className="tile tile--navy" style={{ gridColumn: "9 / span 4", gridRow: 1 }}>
        <span className="tile__label">Highest ticket</span>
        <span className={vcls(m.highestTicket ? plain(m.highestTicket.value) : NA, "tile__value--hero")}>
          {m.highestTicket ? plain(m.highestTicket.value) : NA}
        </span>
        <span className="tile__sub">
          {m.highestTicket
            ? [m.highestTicket.jobType, m.highestTicket.suburb].filter(Boolean).join(" · ") || "last 90 days"
            : "No completed jobs yet"}
        </span>
      </div>

      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: 2 }}>
        <span className="tile__label">Best average ticket</span>
        <span className={vcls(best ? plain(best.avg) : NA, "tile__value--hero")}>
          {best ? plain(best.avg) : NA}
        </span>
        <span className="tile__sub">
          {best ? `${best.suburb} · ${count(best.count)} ${best.count === 1 ? "job" : "jobs"}` : "Not enough jobs to rank"}
        </span>
      </div>

      {/* Going cold, not biggest: the Quotes page already ranks what is out by
          value, and the question this page answers is which ones are aging. */}
      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: 3 }}>
        <div className="tile__head">
          <span className="tile__title">Going cold</span>
          <span className="tile__sub">last 60 days</span>
        </div>
        {oldest.length === 0 ? (
          <span className="tile__sub">Nothing outstanding</span>
        ) : (
          <div className="quotes">
            {oldest.map((qr) => (
              <div className="quote quote--stack" key={qr.id}>
                <span className="quote__label">{qr.label}</span>
                <span className="quote__value">{plain(qr.value)}</span>
                <span className={`quote__age ${qr.ageDays >= 7 ? "quote__age--late" : ""}`}>
                  {qr.ageDays === 0 ? "Today" : `${qr.ageDays} days${qr.ageDays >= 7 ? " · follow up" : ""}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}



/* ------------------------------------------------------------------- pieces */
/**
 * The small card across the top of a page: what it is, then the figure.
 *
 * Label above and figure below, rather than the label-left/figure-right the
 * board used before — at four across, the right-aligned figures landed at four
 * different distances from their labels and stopped reading as one row.
 */
function HeadCard({ label, value, suffix, foot, navy }: {
  label: string; value: string; suffix?: string; foot?: string; navy?: boolean;
}) {
  return (
    <div className={`tile tile--head c3 ${navy ? "tile--navy" : ""}`}>
      <span className="tile__label">{label}</span>
      <span className={vcls(value)}>
        {value}
        {suffix ? <em className="tile__suffix">{suffix}</em> : null}
      </span>
      {foot ? <span className="tile__foot">{foot}</span> : null}
    </div>
  );
}

/**
 * A figure at the size the room reads it, with its label above and one line of
 * context under it. The three across the top of Today.
 */
function HeroCard({ label, value, foot, navy }: { label: string; value: string; foot?: string; navy?: boolean }) {
  return (
    <div className={`tile tile--hero c4 ${navy ? "tile--navy" : ""}`}>
      <span className="tile__label">{label}</span>
      <span className={vcls(value, "tile__value--hero")}>{value}</span>
      {foot ? <span className="tile__foot">{foot}</span> : null}
    </div>
  );
}

/**
 * Label and its context on the left, the figure on the right. Two context
 * lines rather than one: a rate with nothing beside it invites the room to
 * guess what it is a rate of.
 */
function RateCard({ label, lines, value, accent }: { label: string; lines: string[]; value: string; accent?: boolean }) {
  return (
    <div className="tile tile--split c4">
      <div>
        <span className="tile__label">{label}</span>
        {lines.map((l) => (
          <span className="tile__sub" key={l}>{l}</span>
        ))}
      </div>
      <span
        className={`${vcls(value)} tile__value--rate`}
        style={accent && value !== NA ? { color: "var(--accent)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function DailyCard({
  label,
  achieved,
  target,
  plainNumber,
  dayProgress: elapsed,
}: {
  label: string;
  achieved: number | null;
  target: number | null;
  plainNumber?: boolean;
  /** Share of the 7am-5pm working day gone, drawn as the tick on the bar. */
  dayProgress?: number;
}) {
  const ratio = target && target > 0 && achieved != null ? achieved / target : null;
  const fmt = (n: number | null) => (plainNumber ? count(n) : plain(n));
  const state =
    ratio == null ? null : ratio >= 1 ? "Target hit" : elapsed != null && ratio >= elapsed ? "Ahead" : "Behind";

  return (
    <div className="tile c4">
      <div className="tile__head">
        <span className="tile__label">{label}</span>
        {state && <span className={`status status--${state === "Behind" ? "behind" : "ahead"}`}>{state}</span>}
      </div>
      <div className="tile__head">
        <span className={vcls(achieved == null ? NA : fmt(achieved))}>
          {achieved == null ? NA : fmt(achieved)}
        </span>
        <span className="tile__sub">{target == null ? "no daily target set" : `of ${fmt(target)}`}</span>
      </div>
      <div className="meter meter--ticked">
        <div className="meter__fill" style={{ width: `${Math.min(100, (ratio ?? 0) * 100)}%` }} />
        {elapsed != null && target != null && (
          <span className="meter__pace" style={{ left: `${elapsed * 100}%` }} />
        )}
      </div>
    </div>
  );
}

function dayProgress(now: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const at = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const mins = at("hour") * 60 + at("minute");
  return Math.min(1, Math.max(0, (mins - 7 * 60) / (10 * 60)));
}

const clockLabel = (now: Date) =>
  now.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  });

function NotConnected({ what }: { what: string }) {
  return (
    <div className="tile screen__notice c12">
      <span className="tile__value">{NA}</span>
      <span className="tile__sub tile__sub--body">
        ServiceTitan isn&apos;t connected yet, so the board can&apos;t see {what}. These are not zero —
        they are unknown. The figures appear as soon as the credentials are in.
      </span>
    </div>
  );
}

function relative(iso: string, now: Date) {
  const secs = Math.round((now.getTime() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(secs)) return "—";
  if (secs < 60) return `${secs} sec ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  return `${Math.floor(secs / 3600)} hr ago`;
}
