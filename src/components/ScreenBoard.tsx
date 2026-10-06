"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { suburbCoords } from "@/lib/suburbCoords";
import { BoardSuburbMap } from "@/components/BoardSuburbMap";
import type { Metrics, SourceState } from "@/lib/dashboard/metrics";
import type { Step } from "@/lib/dashboard/pace";
import { Gauge, ZONES, ZONE_BAND, ZONE_LABEL, paceIndex, verdictOf, verdictText, type Verdict } from "./screen/Gauge";
import { Celebration, type Sale } from "./screen/Celebration";
import { Alert, previewAlert, type AlertKind } from "./screen/Alert";

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
    const cal = m.paceData?.calendar;
    const day = cal ? `week day ${Math.min(cal.week.total, cal.week.elapsed + 1)} of ${cal.week.total}` : "";
    if (!m.pace) return "No goal set for this year";
    const goal = m.pace.profitPct ? `${money(m.pace.goal)} at ${m.pace.profitPct}%` : money(m.pace.goal);
    return `What the ${goal} goal needs of every step${day ? ` · ${day}` : ""}`;
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
  preview,
}: {
  initial: Snapshot;
  token: string;
  theme?: "dark" | "light";
  /** Percent to inset the whole board by, for a television that overscans. */
  safe?: number;
  /** `?alert=…` — show one alert on a loop, on sample figures. */
  preview?: AlertKind;
}) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState(0);
  const [queue, setQueue] = useState<Sale[]>([]);
  const [paused, setPaused] = useState(false);
  // Bumped each time a previewed alert finishes, so it replays rather than
  // showing once and leaving the board behind it.
  const [previewRun, setPreviewRun] = useState(0);

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
  const journalAlert = !!m.journals && m.journals.errors > 0;

  return (
    <div
      className={`screen ${theme === "dark" ? "screen--dark" : ""}`}
      style={{ "--page-ms": `${PAGE_MS}ms`, "--safe": safe } as CSSProperties}
    >
      {preview ? (
        <Alert key={`${preview}-${previewRun}`} alert={previewAlert(preview)} onDone={() => setPreviewRun((n) => n + 1)} />
      ) : (
        celebrating && (
          <Celebration key={celebrating.id} sale={celebrating} onDone={() => setQueue((qd) => qd.slice(1))} />
        )
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

      <div className={`screen__foot${journalAlert ? " has-alert" : ""}`}>
        <span className="screen__feed">
          <span className={`screen__dot ${healthy ? "" : "screen__dot--stale"}`} aria-hidden />
          <b>{healthy ? "Live" : "Catching up"}</b>
        </span>
        {/* A journal entry ServiceTitan couldn't post to Xero. On every page,
            because it's the one thing on the board that needs the office
            rather than the crew — and gone the run after it's fixed. */}
        {journalAlert && m.journals && <JournalAlert j={m.journals} short={page === 1} />}
        {/* With the alert up and every feed fine, the green Live dot says what
            this line would, and the Pace page's key needs the room. */}
        {!(journalAlert && healthy) && <span>
          {degraded.length === 0
            ? fresh
              ? "All feeds connected"
              : "Waiting on a refresh"
            : degraded.map(([n, sc]) => `${n} ${sc.state}${sc.detail ? ` — ${sc.detail}` : ""}`).join(" · ")}
        </span>}
        {/* The dials' key, on the page that has dials. The words and dots are
            what let somebody who has never been told read the colours — and
            they are the reason the dials may use red and green at all. The
            bands beside them are what says how close Close is: the two rows
            quote their shortfall in different units, so neither of those
            numbers answers it. */}
        {page === 1 && (
          <span className="screen__legend">
            <b className="lg__head">Done of what the goal needs by now</b>
            {ZONES.map((z) => (
              <span key={z.k} className="lg">
                <i className={`lg__dot is-${z.k}`} aria-hidden />
                {ZONE_LABEL[z.k]} <em>{ZONE_BAND[z.k]}</em>
              </span>
            ))}
          </span>
        )}
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

  return (
    <>
      <HeroCard
        navy
        label="Sold today"
        value={st.plain(m.soldToday, live)}
        foot={soldJobs == null ? undefined : `${count(soldJobs)} ${soldJobs === 1 ? "job" : "jobs"} sold`}
      />
      {/* Everything billed today, whenever the job was done — the office
          catching up on Thursday's jobs on a Monday is Monday's invoicing. The
          line ages what went out by how long each job had been waiting, because
          "2 done on an earlier day" said there was a lag and nothing about its
          size, and the size is the whole point: two jobs billed a day late is
          keeping up, two billed a fortnight late is money that sat there. The
          four buckets always show, zeroes included, so the line is in the same
          shape every day and the room reads position rather than words. */}
      {/* The figure on the left, how long each job had waited on the right, with
          the rule between them — the same shape as Close rate and Money in
          below. The breakdown sat under the figure with the whole right half of
          the card empty beside it. */}
      <SideCard
        label="Invoiced today"
        value={st.plain(m.revenueToday, live)}
        rows={
          !live.st || m.jobsInvoicedToday === 0
            ? undefined
            : [
                { k: "Done today", v: count(m.jobsInvoicedTodayAge.sameDay) },
                { k: "1–3 days", v: count(m.jobsInvoicedTodayAge.days1to3) },
                { k: "4–7 days", v: count(m.jobsInvoicedTodayAge.days4to7) },
                { k: "Over a week", v: count(m.jobsInvoicedTodayAge.older) },
              ]
        }
        foot={
          !live.st
            ? undefined
            : m.jobsInvoicedToday === 0
              ? "nothing billed yet today"
              : `${count(m.jobsInvoicedToday)} ${m.jobsInvoicedToday === 1 ? "job" : "jobs"} billed, by how long each waited`
        }
      />
      {/* What the day's bookings actually are. "19 jobs booked" is a number;
          four split systems and a ducted heater is a day. */}
      <SideCard
        label="Jobs booked today"
        value={st.count(m.bookingsToday, live)}
        rows={
          !live.st || m.bookingsTodayTypes.length === 0
            ? undefined
            : m.bookingsTodayTypes.map((t) => ({ k: t.jobType, v: count(t.count) }))
        }
        foot={`from ${count(m.leadsToday)} ${m.leadsToday === 1 ? "lead" : "leads"} · ${count(m.leadsWeek)} this week`}
      />

      {/* The second row is the same card three times: what it is and the two
          figures that put it in context on the left, the number itself on the
          right at the size the room reads. */}
      <RateCard
        leading
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
      {/* Two halves rather than a figure with three lines under it: an agent
          deciding on behalf of a landlord is a different sell from a
          householder spending their own money, and the only reason to split
          the rate is so the two can be read against each other.

          The foot keeps what a job was priced at and how many ways — per job
          over the same thirty days as the rates above it, because an average
          counted per option under a rate counted per job would be one sentence
          disagreeing with itself. */}
      <SplitRateCard
        label="Close rate"
        note={live.st ? `last ${m.outstandingDays ?? 30} days` : undefined}
        halves={
          live.st && m.closeRateByUnit.length
            ? m.closeRateByUnit.map((u) => ({
                name: u.group,
                value: u.quoted > 0 ? pct(u.rate) : NA,
                sub: u.quoted > 0 ? `${count(u.won)} of ${count(u.quoted)} jobs` : "none quoted",
              }))
            : [
                { name: "Domestic", value: NA, sub: "ServiceTitan not connected" },
                { name: "Real Estate", value: NA, sub: "" },
              ]
        }
        foot={
          live.st
            ? `avg quote ${plain(m.avgQuote30d)}${
                m.closeRate30dQuotes > 0
                  ? ` · ${(m.closeRate30dOptions / m.closeRate30dQuotes).toFixed(1)} options per job`
                  : ""
              }`
            : undefined
        }
      />
      {/* Money in, both halves of it: what was banked today and what is still
          owed. They were two different cards' worth of figure and only one card
          between them, and they belong side by side anyway — a good day on the
          left is the thing that shrinks the number on the right. */}
      <SplitRateCard
        label="Money in"
        halves={[
          {
            name: "Paid today",
            value: m.paidToday == null ? NA : plain(m.paidToday),
            sub:
              m.paymentsToday == null
                ? "payments not synced yet"
                : m.paymentsToday === 0
                  ? "nothing banked yet"
                  : `${count(m.paymentsToday)} ${m.paymentsToday === 1 ? "payment" : "payments"}`,
          },
          {
            name: "Overdue",
            value: m.overdueTotal == null ? NA : money(m.overdueTotal),
            sub:
              m.overdueCount == null
                ? "not read from Xero yet"
                : `${count(m.overdueCount)} ${m.overdueCount === 1 ? "invoice" : "invoices"}`,
          },
        ]}
        foot={m.receivablesTotal == null ? undefined : `${money(m.receivablesTotal)} on the books all up`}
      />
    </>
  );
}

/**
 * Pace: is the year on, and is this week doing what the year needs?
 *
 * The year comes first because it is the question — on for the $3.2M or not,
 * better or worse than yesterday and last week, and what a week has to bring
 * from here to make up the gap. Under it, the six steps the money moves
 * through, each against what the goal needs of it this week and this month:
 * leads, booked, quoted, sold, completed, invoiced.
 *
 * Every need comes from pace.ts, the same arithmetic the portal's Pace page
 * runs, off the same snapshot. Leads carry their count but no verdict: phone
 * calls aren't recorded anywhere the board can read, so "behind" would be a
 * statement about the data rather than the phones.
 */
/**
 * The funnel across the page, one card a column.
 *
 * Leads came off. Nothing counts the phone calls behind a lead — ServiceTitan's
 * Telecom scope is a separate grant — so the card drew no verdict, said "calls
 * not counted" underneath, and took a sixth of the row to do it. In its place
 * is what the quoting was worth, which is the figure the quoting step is
 * actually judged on and the one anybody can act on before lunch.
 */
const STEP_KEYS: Array<{ k: Step; label: string }> = [
  { k: "booked", label: "Booked" },
  { k: "quoted", label: "Quoted" },
  { k: "quotedValue", label: "Quote value" },
  { k: "sold", label: "Sold" },
  { k: "completed", label: "Completed" },
  { k: "invoiced", label: "Invoiced" },
];

function PacePage({ m, live, now }: { m: Metrics; live: Live; now: Date }) {
  const p = m.pace;
  if (!live.st) return <NotConnected what="what each step has done against the goal" />;
  if (!p) {
    return (
      <div className="tile screen__notice c12">
        <span className="tile__value">{NA}</span>
        <span className="tile__sub tile__sub--body">
          No goal is set for this year, so there is nothing to pace against. Set it on the portal&apos;s Pace page
          and this page fills in from the next refresh.
        </span>
      </div>
    );
  }
  const y = p.yearView;
  const cal = m.paceData?.calendar;
  // Working days of the month gone, counting today's hours as they pass —
  // the same "by now" the step cards and the portal use.
  const monthProgress = cal && cal.month.total > 0 ? (cal.month.elapsed + (cal.todayWorking ? cal.dayFraction : 0)) / cal.month.total : 0;
  return (
    <>
      {/* The week first, the month under it, the year at the foot. Nearest
          first: the week is the one anybody can still change. */}
      <span className="band band--week">This week</span>
      {STEP_KEYS.map(({ k, label }) => (
        <StepDial key={`w-${k}`} label={label} stage={k} s={p.standing.week[k]} last={lastWeekOf(p.lastWeek, k)} />
      ))}

      {/* The month on the same dial as the week, so the two rows are one
          reading at two lengths rather than two kinds of chart. Each step is
          the same step in both — "Booked" means quote visits and service calls
          in every row, never all jobs in one and some in another. */}
      <span className="band band--month">This month</span>
      {STEP_KEYS.map(({ k, label }) => (
        <StepDial key={`m-${k}`} label={label} stage={k} s={p.standing.month[k]} progress={monthProgress} />
      ))}

      <span className="band band--year">This year</span>
      <YearPace y={y} margin={m.jobProfitMonth?.margin ?? null} costed={m.jobProfitMonth?.costed ?? 0} goalPct={p.profitPct} />
    </>
  );
}

/** Last week's figure for a step. Quote value is the one the counts don't hold. */
const lastWeekOf = (c: NonNullable<Metrics["pace"]>["lastWeek"], k: Step): number | null =>
  k === "quotedValue" ? c.quotedValue : c[k];

type StepStanding = NonNullable<Metrics["pace"]>["standing"]["week"]["leads"];

/** Whole jobs from ten up, a tenth under it; money in thousands. */
const isMoneyStep = (stage: string) => stage === "invoiced" || stage === "quotedValue";
const stepFig = (stage: string, n: number | null | undefined) => {
  if (n == null) return NA;
  if (isMoneyStep(stage)) return money(n);
  return n >= 10 ? Math.round(n).toLocaleString("en-AU") : (Math.round(n * 10) / 10).toLocaleString("en-AU");
};

/**
 * One step of the funnel, over a week or over a month.
 *
 * Both rows are the same card: what has been done of what the period needs, in
 * the middle of the dial, and the verdict with its percentage underneath. The
 * two differ only in the line at the foot — the week says what a day has to
 * bring to catch up, the month says where it lands at this rate — because the
 * week is still steerable and the month is mostly a forecast.
 *
 * The percentage beside the verdict is done ÷ by now, the same scale the zones
 * and the footer's key are in. It used to be the week's shortfall in jobs and
 * the month's in points of the month, which meant three numbers on one page in
 * three units and no way to tell which band any of them was in.
 */
function StepDial({
  label,
  stage,
  s,
  last,
  progress,
}: {
  label: string;
  stage: string;
  s: StepStanding;
  /** The week's card: what the same step did last week. */
  last?: number | null;
  /** The month's card: how much of it has gone, for the run-rate line. */
  progress?: number;
}) {
  const index = paceIndex(s.done, s.byNow);
  const verdict = s.need == null ? null : verdictOf(index);
  const over = (s.gap ?? 0) >= 0;

  // Where the month lands if the rest of it looks like the part so far.
  // Rounded before formatting: a projected job count of 64.308 is arithmetic
  // leaking onto the wall.
  const landing =
    progress != null && progress > 0 && s.done != null && s.need != null ? Math.round(s.done / progress) : null;

  return (
    <Gauge
      label={label}
      index={index}
      verdict={verdict}
      figure={stepFig(stage, s.done)}
      of={s.need == null ? "no target yet" : `of ${stepFig(stage, s.need)}`}
      status={verdictText(index, verdict)}
      foot={
        landing != null
          ? `Heading for ${stepFig(stage, landing)}`
          : !over && s.perDayLeft != null
            ? `${stepFig(stage, s.perDayLeft)} a day to catch up`
            : last != null
              ? `Last week ${stepFig(stage, last)}`
              : undefined
      }
    />
  );
}

/**
 * The year, as one navy strip: how far off the goal's line we are, whether
 * that got better or worse since yesterday and since last week, what a week
 * has to bring from here, and whether the jobs are keeping the margin.
 */
function YearPace({ y, margin, costed, goalPct }: {
  y: NonNullable<Metrics["pace"]>["yearView"];
  margin: number | null;
  costed: number;
  goalPct: number | null;
}) {
  if (!y) {
    return (
      <div className="year">
        <span className="year__none">The year&apos;s running total starts from the next refresh.</span>
      </div>
    );
  }
  const behind = y.gap < 0;
  const drift = (then: number | null) => {
    if (then == null) return { text: NA, cls: "" };
    const d = y.gap - then;
    if (Math.abs(d) < 1) return { text: "● No change", cls: "" };
    return d > 0 ? { text: `▲ ${money(d)} better`, cls: "is-up" } : { text: `▼ ${money(-d)} worse`, cls: "is-down" };
  };
  const wk = drift(y.gapLastWeek);
  /** This year to date against the same date last year. */
  const lastYear = (() => {
    const d = y.ytd - y.lastYearToDate;
    if (y.lastYearToDate <= 0) return { text: NA, cls: "" };
    if (Math.abs(d) < y.lastYearToDate * 0.01) return { text: "● Level", cls: "" };
    return d > 0 ? { text: `▲ ${money(d)} up`, cls: "is-up" } : { text: `▼ ${money(-d)} down`, cls: "is-down" };
  })();

  const pc = (n: number) => `${Math.min(100, Math.max(0, (n / y.goal) * 100))}%`;
  // Where the run rate lands, drawn as a dashed continuation of the bar rather
  // than as another figure: the gap between where the solid stops and where the
  // dashes stop is the whole argument of this strip.
  const landing = y.landing == null ? null : Math.max(y.ytd, y.landing);

  const marginVerdict =
    margin == null || goalPct == null ? null : margin >= goalPct / 100 ? "ahead" : margin >= goalPct / 100 - 0.02 ? "close" : "behind";

  return (
    <div className="year year--pace">
      <div className="year__main">
        {/* Where we are is the big figure and the gap is the note beside it.
            It was the other way round, which made the headline of the strip a
            number nobody banked — and on a wall the biggest thing on a card is
            read as the thing it is about. */}
        <span className="year__nums">
          <b className="year__gap">{money(y.ytd)}</b>
          <em className={`year__vs ${behind ? "is-behind" : "is-ahead"}`}>
            {Math.abs(y.gap) < y.goal * 0.005 ? "on pace" : behind ? `${money(-y.gap)} behind` : `${money(y.gap)} ahead`}
          </em>
        </span>
        <span className="year__track">
          {landing != null && (
            <span className="year__run" style={{ left: pc(y.ytd), width: `calc(${pc(landing)} - ${pc(y.ytd)})` }} />
          )}
          <span className="year__fill" style={{ width: pc(y.ytd) }} />
          {/* The line the goal says we should be on. */}
          <span className="year__mark" style={{ left: pc(y.byNow) }} />
        </span>
      </div>
      <div className="year__side">
        <span className="year__k">Tracking to · {endLabel(y.endsOn)}</span>
        <span className="year__v">
          {y.landing == null ? NA : money(y.landing)}
          <em> of {money(y.goal)}</em>
        </span>
      </div>
      {/* Where this year stands against the one before it, which is the goal
          the room actually feels: $1.9M was last year, and beating it is a
          different question from landing a $3.2M stretch. The pair reads as
          one sentence — up this much at this date, heading for that much by
          June — and the two can disagree, because a flat run rate off the last
          four weeks has no idea last year was back-loaded.

          It replaced "Since yesterday". A day's drift on a year-to-date figure
          is $1,346 of noise; "Since last week" beside it carries the same
          signal with a week of smoothing, and this is the number somebody
          repeats in the van. */}
      <div className="year__side">
        <span className="year__k">Last year · {money(y.lastYear)}</span>
        <span className={`year__v year__v--drift ${lastYear.cls}`}>{lastYear.text}</span>
      </div>
      <div className="year__side">
        <span className="year__k">Since last week</span>
        <span className={`year__v year__v--drift ${wk.cls}`}>{wk.text}</span>
      </div>
      <div className="year__side">
        <span className="year__k">{behind ? "To catch up" : "To stay on"}</span>
        <span className="year__v">
          {y.weekNeeded == null ? NA : money(y.weekNeeded)}
          <em> a week</em>
        </span>
      </div>
      <div className="year__side">
        {/* The sample size sits in the key line: a 34% margin over seven jobs is
            a different statement from a 34% margin over the month, and the strip
            has no room to say it twice. */}
        <span className="year__k">Job margin · {costed > 0 ? `${costed} ${costed === 1 ? "job" : "jobs"}` : "month"}</span>
        <span className={`year__v ${marginVerdict ? `is-${marginVerdict}` : ""}`}>
          {margin == null ? NA : pct(margin)}
          {margin != null && goalPct != null ? (
            <em>
              {" "}
              of {goalPct}%{marginVerdict ? ` · ${marginVerdict}` : ""}
            </em>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/** "30 June" — the day the goal's year runs to. */
const endLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "long", timeZone: "UTC" });

/** The month the board is pacing, named rather than numbered. */
const monthName = (now: Date) =>
  now.toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });

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
                  {/* ServiceTitan's own number, so a figure on the wall can be
                      looked up without hunting for it by customer and time. */}
                  {qr.jobNumber ? <span className="quote__job">#{qr.jobNumber}</span> : null}
                  {qr.who ? <span className="quote__who">{qr.who}</span> : null}
                </span>
                <span className="quote__value">
                  {plain(qr.value)}
                  {qr.options > 1 ? <span className="quote__basis">avg of {qr.options}</span> : null}
                </span>
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
                <span className="quote__label">
                  {qr.label}
                  {qr.jobNumber ? <span className="quote__job">#{qr.jobNumber}</span> : null}
                </span>
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
 * The goal line on each margin bar is the year goal's profit percentage. No
 * percentage set means no line, rather than a line at a number nobody chose.
 */
function PerformancePage({ m, live }: { m: Metrics; live: Live }) {
  const goal = m.marginGoal;

  const rows = m.topJobTypes.map((t) => ({
    ...t,
    margin: t.profit != null && t.revenue > 0 ? t.profit / t.revenue : null,
  }));

  /**
   * Margin, or — when there is none to show — each type's share of the month.
   *
   * The job-type table's margin comes off `st_invoices.cost`, and not one
   * invoice in the replica carries one: 0 of 5,415. So the column was five empty
   * grey tracks and a column of dashes, which from four metres reads as a broken
   * chart rather than as missing data, and Jake asked why the line was grey.
   *
   * A column that has never once held a figure is not holding a place, it is
   * taking one. Share of the month's invoicing goes there instead — measured,
   * and it answers what the table is actually read for, which is where the
   * month's money came from. The navy tile above still carries a real margin,
   * worked per job from equipment cost and hours (see jobProfit.ts), and this
   * column comes back on its own the day ServiceTitan starts sending a cost.
   */
  const anyMargin = rows.some((t) => t.margin != null);
  const share = (revenue: number) => (m.revenueInvoicedMtd > 0 ? revenue / m.revenueInvoicedMtd : null);

  // The tile's margin is the job-level one, not the invoice column's: the
  // invoice column has never once been populated, so a tile built on it read
  // "—" on every single day it has been up.
  const jp = m.jobProfitMonth;

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
      {/* What turned up against what was asked for. The row was three cards in a
          space built for four, with a quarter of it empty since profit came
          off, and this is the figure that was missing from the story: booked,
          invoiced, paid, and what was left of it. */}
      <HeadCard
        label="Paid"
        value={m.paidMonth == null ? NA : money(m.paidMonth)}
        foot={
          m.paidMonth == null
            ? "payments not synced yet"
            : m.revenueInvoicedMtd > 0
              ? `${pct(m.paidMonth / m.revenueInvoicedMtd)} of what was invoiced`
              : "banked this month"
        }
      />
      {/* Profit came off: it read "—" on every single day, because no invoice in
          the tenant carries a cost. Margin stays because Jake asked for it, and
          it is now the per-job figure — price before GST, less equipment and
          materials, less the hours at what an hour of the crew costs — with the
          jobs it could cost said underneath, so a margin off four jobs never
          passes as a margin off the month. */}
      <HeadCard
        navy
        label="Job margin"
        value={live.st ? pct(jp?.margin ?? null) : NA}
        suffix={goal != null && jp?.margin != null ? `of ${pct(goal)}` : undefined}
        foot={
          !live.st
            ? undefined
            : jp == null || jp.costed === 0
              ? "no job costed this month yet"
              : `over ${count(jp.costed)} of ${count(jp.jobs)} jobs billed`
        }
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
                {anyMargin ? `Margin${goal != null ? ` · line is the ${pct(goal)} goal` : ""}` : "Share of the month"}
              </span>
              <span />
            </div>
            {rows.map((t) => {
              const under = goal != null && t.margin != null && t.margin < goal;
              const part = anyMargin ? null : share(t.revenue);
              return (
                <div className="jt__row" key={t.jobType}>
                  <span className="jt__name">{t.jobType}</span>
                  <span className="jt__n">{count(t.booked)}</span>
                  <span className="jt__n">{count(t.jobs)}</span>
                  <span className="jt__n">{money(t.revenue)}</span>
                  <span className="jt__bar">
                    {anyMargin ? (
                      t.margin == null ? null : (
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
                      )
                    ) : part == null ? null : (
                      // Share of the whole month, so the bars sit against the
                      // figure in the tile above rather than against each other
                      // — the top row is not automatically a full track.
                      <span className="jt__fill" style={{ width: `${Math.min(100, part * 100)}%` }} />
                    )}
                  </span>
                  <span className={`jt__pct ${anyMargin ? (t.margin == null ? "" : under ? "is-under" : "is-over") : "jt__pct--quiet"}`}>
                    {anyMargin ? (t.margin == null ? NA : pct(t.margin)) : part == null ? NA : pct(part)}
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
              <span
                className={`jt__pct ${
                  anyMargin ? (m.marginPct == null ? "" : goal != null && m.marginPct < goal ? "is-under" : "is-over") : "jt__pct--quiet"
                }`}
              >
                {anyMargin ? (m.marginPct == null ? NA : pct(m.marginPct)) : "100%"}
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
                <span className="quote__label">
                  {qr.label}
                  {qr.jobNumber ? <span className="quote__job">#{qr.jobNumber}</span> : null}
                </span>
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
/**
 * A figure with its breakdown beside it, split down the middle.
 *
 * The same shape as the two rate cards below it on the page: label across the
 * top, a rule down the middle, and a foot under both. The breakdown sat under
 * the figure and left the whole right half of the card empty, which on a wall
 * reads as a card that has lost something.
 */
function SideCard({
  label,
  value,
  rows,
  foot,
}: {
  label: string;
  value: string;
  rows?: Array<{ k: string; v: string }>;
  foot?: string;
}) {
  return (
    <div className="tile c4">
      <span className="tile__label">{label}</span>
      <div className={`side ${rows?.length ? "" : "side--alone"}`}>
        <span className={vcls(value, "tile__value--hero")}>{value}</span>
        {rows?.length ? (
          <div className="rows">
            {rows.map((r) => (
              <span className="rows__one" key={r.k}>
                <span className="rows__k">{r.k}</span>
                <b className="rows__v">{r.v}</b>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {foot ? <span className="tile__foot">{foot}</span> : null}
    </div>
  );
}

function HeroCard({
  label,
  value,
  rows,
  foot,
  navy,
}: {
  label: string;
  value: string;
  /**
   * A short breakdown under the figure, stacked rather than run together.
   *
   * The invoice ageing was one line — "9 billed · today 1 · 1–3d 3 · 4–7d 5 ·
   * 7+ 0" — and at four metres that is a sentence to be read rather than a
   * shape to be glanced at. Stacked, with the counts on their own right-hand
   * edge, the tall bucket is the one that sticks out.
   */
  rows?: Array<{ k: string; v: string }>;
  foot?: string;
  navy?: boolean;
}) {
  return (
    <div className={`tile tile--hero c4 ${navy ? "tile--navy" : ""}`}>
      <span className="tile__label">{label}</span>
      <span className={vcls(value, "tile__value--hero")}>{value}</span>
      {rows?.length ? (
        <div className="rows">
          {rows.map((r) => (
            <span className="rows__one" key={r.k}>
              <span className="rows__k">{r.k}</span>
              <b className="rows__v">{r.v}</b>
            </span>
          ))}
        </div>
      ) : null}
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
 * One tile, two halves, a rule between them.
 *
 * The two sides of the business as three lines of text under a single figure
 * was a list; as two halves it is a comparison, which is the only reason the
 * split exists. Each half carries its own count, because real estate is eight
 * jobs deep and a percentage on its own would hide that.
 *
 * No combined figure on this tile on purpose. Domestic and real estate are 110
 * of the 118 jobs quoted — the rest are quotation and site-assessment units
 * that are not a side of the business — so an overall percentage sitting above
 * two that do not add up to it invites a question with a boring answer. The
 * one figure over everything is on Pace.
 */
function SplitRateCard({
  label,
  note,
  halves,
  foot,
}: {
  label: string;
  note?: string;
  halves: Array<{ name: string; value: string; sub: string }>;
  foot?: string;
}) {
  return (
    <div className="tile c4">
      <div className="tile__head">
        <span className="tile__label">{label}</span>
        {note && <span className="tile__sub">{note}</span>}
      </div>
      <div className="halves">
        {halves.map((h) => (
          <div className="halves__one" key={h.name}>
            <span className="halves__name">{h.name}</span>
            <span className={`halves__value ${h.value === NA ? "is-na" : ""}`}>{h.value}</span>
            <span className="halves__sub">{h.sub}</span>
          </div>
        ))}
      </div>
      {foot && <span className="tile__sub">{foot}</span>}
    </div>
  );
}

function RateCard({
  label,
  lines,
  value,
  accent,
  leading,
}: {
  label: string;
  lines: string[];
  value: string;
  accent?: boolean;
  /** The figure first, with its label and context to the right of it. */
  leading?: boolean;
}) {
  return (
    <div className={`tile tile--split c4 ${leading ? "tile--lead" : ""}`}>
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

const clockLabel = (now: Date) =>
  now.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  });

function JournalAlert({ j, short }: { j: NonNullable<Metrics["journals"]>; short?: boolean }) {
  const n = j.errors;
  const days = j.oldestErrorDays;
  return (
    <span className="screen__alert" role="status">
      <b className="screen__alerticon" aria-hidden="true">!</b>
      <span>
        <b>Xero</b> · {n} journal {n === 1 ? "entry" : "entries"} didn&rsquo;t sync
        {!short && days != null && days > 0 ? ` · oldest ${days} ${days === 1 ? "day" : "days"}` : ""}
      </span>
    </span>
  );
}

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
