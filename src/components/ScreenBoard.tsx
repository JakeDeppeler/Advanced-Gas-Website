"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { suburbCoords } from "@/lib/suburbCoords";
import { BoardSuburbMap } from "@/components/BoardSuburbMap";
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
const PAGE_MS = 30_000;
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
  // The money column is the month; the last three are thirty days, because a
  // quote written this week has not had a chance to close. Said once here
  // rather than three times in headers a column wide.
  Team: () => "Quoted and sold, today \u00b7 week \u00b7 month \u00b7 rates over 30 days",
  // Says which population the page counts, because it was read as jobs twice
  // and it is invoices — a job can carry more than one.
  Performance: () => `${monthName(new Date())} so far · booked and invoiced, by job type`,
  Areas: () => "Where the work is · last 60 days",
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
  safe = 0,
}: {
  initial: Snapshot;
  token: string;
  theme?: "dark" | "light";
  /** Percent to inset the whole board by, for a television that overscans. */
  safe?: number;
}) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState(0);
  const [queue, setQueue] = useState<Sale[]>([]);
  const [paused, setPaused] = useState(false);

  // Seeded from the first snapshot so the board doesn't open by cheering every
  // sale already on the books.
  const seen = useRef<Set<number>>(new Set(initial.metrics.recentSales?.map((s) => s.id) ?? []));

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(clock);
  }, []);

  /**
   * The rotation, which stops while the board is held.
   *
   * Separate from the clock above so holding a page does not also freeze the
   * time in the footer — a board that has stopped telling the time looks like a
   * board that has crashed.
   *
   * Polling is untouched either way: hold a page and its figures still update
   * underneath you. What stops is the page turning, which is the only thing
   * anybody holding it wants stopped.
   */
  useEffect(() => {
    if (paused) return;
    const rotate = setInterval(() => setPage((p) => (p + 1) % PAGES.length), PAGE_MS);
    return () => clearInterval(rotate);
  }, [paused]);

  const skip = () => setPage((p) => (p + 1) % PAGES.length);

  // Space holds, the right arrow skips. The guard keeps a press from firing
  // while one of the buttons has focus, which would act twice on one key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const onControl = !!el && (el.tagName === "BUTTON" || el.tagName === "INPUT");
      if (e.code === "Space" || e.key === " ") {
        // Space activates a focused button on its own, so letting it through
        // here as well would toggle twice on one press.
        if (onControl) return;
        e.preventDefault();
        setPaused((v) => !v);
        return;
      }
      if (e.key === "ArrowRight") {
        // No such clash for the arrow: it does nothing to a focused button, so
        // it has to keep working after somebody has clicked Skip once.
        e.preventDefault();
        // Skipping while held moves one page and stays held, which is what
        // somebody stepping through the board by hand wants.
        setPage((p) => (p + 1) % PAGES.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      style={{ "--page-ms": `${PAGE_MS}ms`, "--safe": safe } as CSSProperties}
    >
      {celebrating && (
        <Celebration key={celebrating.id} sale={celebrating} onDone={() => setQueue((qd) => qd.slice(1))} />
      )}

      <div className="screen__bar">
        {/* Keyed so the entrance replays with the page, like the tiles below.
            The subtitle is not: on Today it carries a clock that ticks every
            thirty seconds, and re-running the animation for a changed minute
            would make the header twitch on its own. */}
        <span className="screen__title" key={name}>{name}</span>
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
            {paused ? `${page + 1} of ${PAGES.length} · held` : `${page + 1} of ${PAGES.length} · next: ${PAGES[(page + 1) % PAGES.length]}`}
          </span>
        </nav>
        {/* Deliberately quiet: this sits on a wall all day and a control nobody
            is touching should not be competing with the figures. It only comes
            forward once it is holding something, because at that point the room
            needs to know the board stopped on purpose. */}
        <button
          type="button"
          className="screen__ctl screen__skip"
          onClick={skip}
          title="Next page (right arrow)"
        >
          <span className="screen__holdicon" aria-hidden>
            <svg viewBox="0 0 12 14" width="100%" height="100%">
              <path d="M1 1l8 6-8 6z" fill="currentColor" />
              <rect x="9.5" y="1" width="2" height="12" fill="currentColor" />
            </svg>
          </span>
          Skip
        </button>
        <button
          type="button"
          className={`screen__ctl screen__hold ${paused ? "is-on" : ""}`}
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          title={paused ? "Resume (space)" : "Hold this page (space)"}
        >
          <span className="screen__holdicon" aria-hidden>
            {paused ? (
              <svg viewBox="0 0 12 14" width="100%" height="100%"><path d="M1 1l10 6-10 6z" fill="currentColor" /></svg>
            ) : (
              <svg viewBox="0 0 12 14" width="100%" height="100%"><rect x="1" y="1" width="3.5" height="12" fill="currentColor" /><rect x="7.5" y="1" width="3.5" height="12" fill="currentColor" /></svg>
            )}
          </span>
          {paused ? "Held" : "Hold"}
        </button>
      </div>

      {/* The rule under the header is the clock for THIS page.
      
          It swept a sixth of the width per page, so it measured the cycle: a
          full bar meant the board was about to return to Today, which is not
          what anybody in the room wants to know. It now empties and refills over
          each page's thirty seconds, so the question it answers is "how long
          have I got on this one".

          A CSS animation restarted by the page key, not a ticking state — the
          board runs for months on a kiosk, and re-rendering the tree once a
          second to advance a bar is what degrades a display nobody reloads. */}
      <div className={`screen__rule ${paused ? "is-held" : ""}`} aria-hidden="true">
        <span key={page} />
      </div>

      {/* Keyed on the page so React replaces the subtree rather than patching
          it: the entrance animation below is on the tiles themselves, and it
          only replays on a fresh mount. */}
      <div
        key={page}
        className={`screen__grid ${["screen__grid--today", "screen__grid--pace", "screen__grid--quotes", "screen__grid--team", "screen__grid--perf", "screen__grid--areas"][page]}`}
      >
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
          `${count(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "job" : "jobs"}${
            m.quotesCreatedTodayOptions > m.quotesCreatedTodayCount
              ? ` · ${count(m.quotesCreatedTodayOptions)} options`
              : ""
          }`,
          `${count(m.quotesCreatedTodaySold)} already closed`,
        ]}
        value={st.plain(m.quotesCreatedTodayValue, live)}
      />
      {/* The rate on its own says how often we win. What a job was priced at
          says what winning one is worth, and the two together are the question
          the room actually asks. Both per job over the same thirty days — an
          average counted per option under a rate counted per job would be one
          sentence disagreeing with itself. */}
      <RateCard
        label="Close rate"
        lines={
          live.st
            ? [
                `${count(m.closeRate30dSold)} of ${count(m.closeRate30dQuotes)} jobs quoted`,
                // Options per job, not the raw count. "429 options" is a
                // number nobody can act on; "3.6 options per job" says whether
                // we are putting a choice in front of people, and it is the
                // thing that makes the close rate beside it a per-job figure
                // rather than a per-option one.
                `avg quote ${plain(m.avgQuote30d)}${
                  m.closeRate30dQuotes > 0
                    ? ` · ${(m.closeRate30dOptions / m.closeRate30dQuotes).toFixed(1)} options per job`
                    : ""
                }`,
                `last ${m.outstandingDays ?? 30} days`,
              ]
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
      {/* The page reads as the funnel it is, left to right: what we put in
          front of people, what came back, what that turned into on the
          calendar, the rate the first becomes the second, and what has
          actually been billed. It was sold / invoiced / profit / booked in no
          particular order, which is four figures rather than one story. */}
      <span className="band band--today">Today</span>
      {/* Same reason as the month card below: no daily quoted target exists, so
          a progress bar against nothing is a bar that never means anything. */}
      <RateCard
        label="Quoted"
        lines={
          live.st
            ? [
                `${count(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "job" : "jobs"}`,
                `${count(m.quotesCreatedTodayOptions)} options written`,
              ]
            : ["ServiceTitan not connected"]
        }
        value={st.plain(m.quotesCreatedTodayValue, live)}
        stack
      />
      <DailyCard
        label="Sold"
        achieved={live.st ? m.soldToday : null}
        target={m.dailySalesTarget}
        dayProgress={today}
      />
      <DailyCard
        label="Booked"
        achieved={live.st ? m.bookingsToday : null}
        target={m.dailyBookingsTarget}
        plainNumber
        dayProgress={today}
      />
      {/* Today's own conversion, not the thirty-day rate: both halves are
          today's quotes, so it answers "did what we wrote today come back
          today". It reads 0% on most days, which is the honest answer — the
          month's rate is the card below. */}
      <RateCard
        label="Win rate"
        lines={
          live.st
            ? [
                `${count(m.quotesCreatedTodaySold)} of ${count(m.quotesCreatedTodayCount)} quoted today`,
                "same-day only",
              ]
            : ["ServiceTitan not connected"]
        }
        value={live.st ? pct(m.conversionTodayPct) : NA}
        stack
      />
      <DailyCard
        label="Invoiced"
        achieved={live.st ? m.revenueToday : null}
        target={m.dailyTarget}
        dayProgress={today}
      />

      <span className="band band--month">{monthName(now)}</span>
      {/* A card, not a dial. There is no quoted target to pace against, and a
          dial with nothing to measure against is an empty arc with the figure
          shrunk underneath it — the one number on the tile made the smallest
          thing on it. */}
      <RateCard
        label="Quoted"
        lines={
          live.st
            ? [`${count(m.quotesCreatedMonthCount)} jobs`, `${count(m.closeRate30dOptions)} options written`]
            : ["ServiceTitan not connected"]
        }
        value={st.money(m.quotesCreatedMonthValue, live)}
        stack
      />
      <Gauge
        label="Sold"
        achieved={live.st ? m.soldMtd : null}
        target={m.salesTargetMonthly}
        progress={progress}
        format={money}
      />
      <Gauge
        label="Booked"
        achieved={live.st ? m.bookingsMonth : null}
        target={m.bookingsTargetMonthly}
        progress={progress}
        format={(n) => count(n)}
      />
      {/* Thirty days, not the month: on the third of the month almost nothing
          quoted this month has had time to come back, and the rate would read
          near zero every time the month turned over. Split by the side of the
          business, because an agent deciding for a landlord is a different sell
          from a householder spending their own money. */}
      <RateCard
        label="Win rate"
        lines={
          live.st
            ? [
                `${count(m.closeRate30dSold)} of ${count(m.closeRate30dQuotes)} jobs · last 30 days`,
                ...m.closeRateByUnit
                  .filter((u) => u.quoted > 0)
                  .map((u) => `${u.group} ${pct(u.rate)} · ${count(u.won)} of ${count(u.quoted)}`),
              ]
            : ["ServiceTitan not connected"]
        }
        value={live.st ? pct(m.closeRate30d) : NA}
        stack
      />
      <Gauge
        label="Invoiced"
        achieved={live.st ? m.revenueInvoicedMtd : null}
        target={m.revenueTargetMonthly}
        progress={progress}
        format={money}
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
          {count(m.quotesCreatedTodayCount)} {m.quotesCreatedTodayCount === 1 ? "job" : "jobs"}
          {m.quotesCreatedTodayOptions > m.quotesCreatedTodayCount ? ` · ${count(m.quotesCreatedTodayOptions)} options` : ""}
        </span>
      </div>

      <div className="tile tile--navy tile--head" style={{ gridColumn: "5 / span 4", gridRow: 1 }}>
        <span className="tile__label">Sold today</span>
        <span className={vcls(plain(m.soldToday))}>{plain(m.soldToday)}</span>
        <span className="tile__foot">
          {count(m.quotesCreatedTodaySold)} of {count(m.quotesCreatedTodayCount)} jobs quoted today
        </span>
      </div>

      {/* The average option rather than a close rate: a rate off ten quotes is
          mostly noise, and the size of what is being written is the thing a
          slow day actually shows up in first. */}
      <div className="tile tile--head" style={{ gridColumn: "9 / span 4", gridRow: 1 }}>
        <span className="tile__label">Average option</span>
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
                  {qr.ageDays === 0
                    ? "Today"
                    : `${qr.ageDays} ${qr.ageDays === 1 ? "day" : "days"}${qr.ageDays >= 7 ? " · follow up" : ""}`}
                </span>
                {/* Good, better and best are one quote and at most one of them
                    sells, so the figure is the average of the options rather
                    than their sum. It says so: an unlabelled average of three
                    prices reads as a total and understates the top option. */}
                <span className="quote__basis">{qr.options > 1 ? `avg of ${qr.options}` : ""}</span>
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
      quotedToday: a.quotedToday + r.quotedToday,
      quotedWeek: a.quotedWeek + r.quotedWeek,
      quotedJobs: a.quotedJobs + r.quotedJobs,
      options30: a.options30 + (r.avgOptions ?? 0) * r.quotedJobs,
      soldJobs: a.soldJobs + r.soldJobs,
      won: a.won + r.closeRateWon,
      // Summed, not averaged: a mean of five people's averages weights the one
      // who wrote a single quote the same as the one who wrote fifty.
      quotedValue: a.quotedValue + (r.avgQuote ?? 0) * r.quotedJobs,
      wonValue: a.wonValue + (r.avgTicket ?? 0) * r.soldJobs,
    }),
    {
      today: 0, week: 0, month: 0, quoted: 0, options: 0,
      quotedToday: 0, quotedWeek: 0, quotedJobs: 0, options30: 0,
      soldJobs: 0, won: 0, quotedValue: 0, wonValue: 0,
    },
  );
  const teamCloseRate = totals.quotedJobs ? totals.won / totals.quotedJobs : null;
  const teamAvgTicket = totals.soldJobs ? totals.wonValue / totals.soldJobs : null;
  const teamAvgQuote = totals.quotedJobs ? totals.quotedValue / totals.quotedJobs : null;

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
          <span>Quoted · {monthName(new Date())}</span>
          <span>Sold · {monthName(new Date())}</span>
          <span>Close rate</span>
          <span>Avg ticket</span>
          <span>Avg quote</span>
          <span>Next bonus tier</span>
        </div>

        {m.salesLeaderboard.map((r, i) => (
          <div className={`tbl__row ${i === 0 ? "tbl__row--leader" : ""}`} key={r.name}>
            <span className={`tbl__rank ${i === 0 ? "tbl__rank--leader" : ""}`}>{i + 1}</span>
            <span>
              <span className="tbl__name" style={{ display: "block" }}>
                {r.name}
              </span>
              {i === 0 && <span className="tbl__note tbl__note--leader">Leading</span>}
            </span>
            {/* Quoted and sold each get a column, each showing the month big
                with today and the week under it. Two lines, never three: a
                third line on every row is what pushed the Team totals off the
                bottom of the tile on a laptop. */}
            <span className="tbl__fig">
              <b>{plain(r.quoted)}</b>
              <span>
                today {plain(r.quotedToday)} · week {plain(r.quotedWeek)}
              </span>
            </span>
            <span className="tbl__fig">
              <b>{plain(r.sold)}</b>
              <span>
                today {plain(r.soldToday)} · week {plain(r.soldWeek)}
              </span>
            </span>
            {/* Per job, not per option — see the leaderboard fields. Each of the
                three carries its own denominator underneath, because a 50%
                close rate off two jobs and off twenty are different claims and
                the room cannot tell them apart from the percentage. */}
            <span className="tbl__fig">
              <b>{pct(r.closeRate)}</b>
              <span>{r.quotedJobs ? `${count(r.closeRateWon)} of ${count(r.quotedJobs)} jobs` : "none written"}</span>
            </span>
            <span className="tbl__fig">
              <b>{plain(r.avgTicket)}</b>
              <span>{r.soldJobs ? `${count(r.soldJobs)} won` : "none won"}</span>
            </span>
            <span className="tbl__fig">
              <b>{plain(r.avgQuote)}</b>
              <span>
                {r.quotedJobs
                  ? `${count(r.quotedJobs)} jobs · ${(r.avgOptions ?? 0).toFixed(1)} options each`
                  : "none written"}
              </span>
            </span>
            <span className="tiers">
              {/* No tiers configured means no run to be along, so there is no
                  bar — it drew full for everybody, which read as everybody
                  having hit the top one. */}
              {m.commissionTiers.length === 0 ? (
                <span className="tiers__note">No tiers set</span>
              ) : (
                <>
                  <span className="tiers__bar">
                    <span
                      className={`tiers__fill ${i === 0 ? "is-leader" : ""}`}
                      style={{ width: `${tierProgress(r)}%` }}
                    />
                  </span>
                  <span className={`tiers__note ${i === 0 ? "tiers__note--leader" : ""}`}>
                    {r.toNextTier != null
                      ? `${money(r.toNextTier)} to tier ${(r.tier ?? 0) + 1}`
                      : `Top tier · tier ${r.tier ?? m.commissionTiers.length}`}
                  </span>
                </>
              )}
            </span>
          </div>
        ))}

        <div className="tbl__row tbl__row--total">
          <span />
          <span className="tbl__name">Team</span>
          <span className="tbl__fig">
            <b>{plain(totals.quoted)}</b>
            <span>
              today {plain(totals.quotedToday)} · week {plain(totals.quotedWeek)}
            </span>
          </span>
          <span className="tbl__fig">
            <b>{plain(totals.month)}</b>
            <span>
              {thin
                ? `of ${plain(m.soldMtd)} · rest names no seller`
                : `today ${plain(totals.today)} · week ${plain(totals.week)}`}
            </span>
          </span>
          <span className="tbl__fig">
            <b>{pct(teamCloseRate)}</b>
            <span>{totals.quotedJobs ? `${count(totals.won)} of ${count(totals.quotedJobs)} jobs` : "—"}</span>
          </span>
          <span className="tbl__fig">
            <b>{plain(teamAvgTicket)}</b>
            <span>{totals.soldJobs ? `${count(totals.soldJobs)} won` : "—"}</span>
          </span>
          <span className="tbl__fig">
            <b>{plain(teamAvgQuote)}</b>
            <span>
              {totals.quotedJobs
                ? `${count(totals.quotedJobs)} jobs · ${(totals.options30 / totals.quotedJobs).toFixed(1)} options each`
                : "—"}
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
  // Nothing left to reach means the run is done. The caller only draws a bar
  // at all when tiers exist, so this is genuinely "at the top".
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
 * over revenue target, which is the year goal's profit percentage. No
 * percentage set means no line, rather than a line at a number nobody chose.
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
      {/* Three cards, and each says which population it counts. Jobs booked is
          jobs created this month; everything else on this page is invoices, and
          the two differ — 29 invoices against 20 jobs booked and 11 completed in
          the same month, because ServiceTitan bills a job when it is billed and
          one job can carry more than one invoice. The page was read as job
          counts twice; now it says. */}
      <HeadCard label="Jobs booked" value={st.count(m.bookingsMonth, live)} foot="jobs created this month" />
      <HeadCard
        label="Invoiced"
        value={st.money(m.revenueInvoicedMtd, live)}
        foot={live.st ? `${count(m.invoiceCountMonth)} invoices raised` : undefined}
      />
      {/* Profit came off: it has read "—" on every single day, because 0 of the
          29 invoices this month carry a cost. Margin stays because Jake asked
          for it, and it says why it is blank rather than showing a zero. */}
      <HeadCard
        navy
        label="Margin"
        value={live.st ? pct(m.marginPct) : NA}
        suffix={goal != null && m.marginPct != null ? `of ${pct(goal)}` : undefined}
        foot={m.marginPct == null && live.st ? "no cost on any invoice yet" : undefined}
      />

      <div className="tile c12">
        <div className="tile__head">
          <span className="tile__title">Job types</span>
          {/* The set-aside count is on the wall, not buried: a ranking that
              quietly omits most of the invoices is a ranking you can't trust. */}
          <span className="tile__sub">
            this month
            {m.jobTypeUnclassified > 0 ? ` · ${count(m.jobTypeUnclassified)} untyped` : ""}
          </span>
        </div>
        {rows.length === 0 ? (
          <span className="tile__sub">{st.sub("No invoiced work in the this month", live)}</span>
        ) : (
          <div className="jt">
            <div className="jt__head">
              <span />
              {/* Invoices, not jobs: the table is grouped from st_invoices, and
                  a job can carry more than one. 29 invoices against 11 jobs
                  completed this month is the kind of gap a wrong column heading
                  turns into an argument. */}
              {/* Booked leads invoiced: a month that takes a lot on and bills
                  little of it reads as quiet on the invoice column alone. */}
              <span>Booked</span>
              <span>Invoices</span>
              <span>Revenue</span>
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
                  <span className="jt__n">{count(t.booked)}</span>
                  <span className="jt__n">{count(t.jobs)}</span>
                  <span className="jt__n">{money(t.revenue)}</span>
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
            {/* The five rows are a ranking, not the month. Jake asked for the
                month's own totals under them because the obvious reading of a
                table is that it adds up, and these five came to a third of the
                invoiced figure in the tile above. Counted over every invoice,
                untyped ones included, so this line and "Invoiced" agree. */}
            <div className="jt__row jt__row--total">
              <span className="jt__name">All work this month</span>
              <span className="jt__n">{count(m.bookingsMonth)}</span>
              <span className="jt__n">{count(m.invoiceCountMonth)}</span>
              {/* Full digits, not $21K: this is the figure of the page and it
                  gets read off the wall and repeated. */}
              <span className="jt__n">{plain(m.revenueInvoicedMtd)}</span>
              <span />
              <span className={`jt__pct ${m.marginPct == null ? "" : goal != null && m.marginPct < goal ? "is-under" : "is-over"}`}>
                {m.marginPct == null ? NA : pct(m.marginPct)}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Where the work actually is, on the corridor.
 *
 * This was a grid of tiles, then blobs on a blank rectangle, and neither was a
 * map: the first ranked suburbs without saying where they are, and the second
 * put them in the right relative positions with nothing underneath to read
 * them against. Real tiles now, from `BoardSuburbMap`.
 *
 * A suburb with no coordinate on file is named under the map rather than
 * dropped, because its jobs happened whether or not we know where.
 */
function SuburbHeat({ places }: { places: Metrics["topJobSuburbs"] }) {
  const located = places.map((p) => ({ ...p, at: suburbCoords[slugForSuburb(p.suburb)] }));
  const pts = located
    .filter((p): p is typeof p & { at: readonly [number, number] } => !!p.at)
    .map((p) => ({ suburb: p.suburb, count: p.count, lat: p.at[0], lng: p.at[1] }));
  const offMap = located.filter((p) => !p.at);

  if (pts.length === 0) {
    return (
      <div className="heat__none">
        {places.length === 0
          ? "No completed jobs recorded yet"
          : places.map((p) => `${p.suburb} ${p.count}`).join(" · ")}
      </div>
    );
  }

  return (
    <div className="heat">
      <BoardSuburbMap places={pts} />
      {offMap.length > 0 && (
        <span className="heat__off">Also {offMap.map((p) => `${p.suburb} ${p.count}`).join(" · ")}</span>
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
            ? [m.highestTicket.jobType, m.highestTicket.suburb].filter(Boolean).join(" · ") || "last 60 days"
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
                  {qr.ageDays === 0
                    ? "Today"
                    : `${qr.ageDays} ${qr.ageDays === 1 ? "day" : "days"}${qr.ageDays >= 7 ? " · follow up" : ""}`}
                </span>
                {/* Good, better and best are one quote and at most one of them
                    sells, so the figure is the average of the options rather
                    than their sum. It says so: an unlabelled average of three
                    prices reads as a total and understates the top option. */}
                <span className="quote__basis">{qr.options > 1 ? `avg of ${qr.options}` : ""}</span>
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
/**
 * `stack` puts the figure above its lines instead of beside them. The split
 * layout wants a wide tile; in one of five columns on Pace it squeezed the
 * lines into two words a row.
 */
function RateCard({
  label,
  lines,
  value,
  accent,
  stack,
}: {
  label: string;
  lines: string[];
  value: string;
  accent?: boolean;
  stack?: boolean;
}) {
  return (
    <div className={`tile ${stack ? "tile--stackrate" : "tile--split"} c4`}>
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
