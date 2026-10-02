"use client";

import { useEffect, useRef, useState } from "react";
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
// How often the board asks the server to go and fetch. The endpoint has its own
// eight-minute floor, so this only has to be more often than that; it exists
// because GitHub's scheduler does not reliably run the sync workflow.
const RESYNC_MS = 5 * 60_000;
const PAGE_MS = 20_000;
const PAGES = ["Today", "Pace", "Quotes", "Team", "Performance", "Areas"] as const;

const SUBTITLES: Record<(typeof PAGES)[number], (m: Metrics) => string> = {
  Today: () => "",
  Pace: (m) =>
    `${new Date().toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" })} · day ${
      m.workingDaysTotal - m.workingDaysLeft + 1
    } of ${m.workingDaysTotal} working days`,
  Quotes: () => "Today, as they're written",
  Team: () => "Leaderboard · ranked on month sold",
  Performance: () => "Month to date",
  Areas: () => "Where the work is · last 30 days",
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

  return (
    <div className={`screen ${theme === "dark" ? "screen--dark" : ""}`}>
      {celebrating && (
        <Celebration key={celebrating.id} sale={celebrating} onDone={() => setQueue((qd) => qd.slice(1))} />
      )}

      <div className="screen__bar">
        <span className="screen__brand">
          <b>Advanced</b>
          <em>Gas &amp; Aircon</em>
        </span>

        <span className="screen__page">
          <i>/{String(page + 1).padStart(2, "0")}</i>
          <strong>{name}</strong>
          <time>
            {name === "Today"
              ? now.toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "Australia/Melbourne",
                })
              : SUBTITLES[name](m)}
          </time>
        </span>

        {/* The tab strip doubles as the page indicator: the pill is the only
            thing that moves as the board rotates, so the room can see where it
            is in the cycle without reading. */}
        <nav className="screen__tabs" aria-label="Board pages">
          {PAGES.map((p, i) => (
            <span key={p} className={`screen__tab ${i === page ? "is-on" : ""}`}>
              {p}
            </span>
          ))}
        </nav>
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
          <span className="screen__dot" aria-hidden />
          <b>LIVE</b>
        </span>
        <span>Synced {relative(snap.computedAt, now)}</span>
        <span className="screen__feed">
          <span className={`screen__dot ${degraded.length ? "screen__dot--stale" : ""}`} aria-hidden />
          {degraded.length === 0
            ? "No issues · all feeds connected"
            : degraded.map(([n, s]) => `${n} ${s.state}${s.detail ? ` — ${s.detail}` : ""}`).join(" · ")}
        </span>
        <span className="screen__right">
          {now.toLocaleTimeString("en-AU", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Australia/Melbourne",
          })}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ /01 Today */
function TodayPage({ m, live }: { m: Metrics; live: Live }) {
  const mixTotal = m.leadsByService.reduce((s, x) => s + x.count, 0);

  return (
    <>
      <div className="tile tile--navy c4">
        <span className="tile__label">Sold today</span>
        <span className={vcls(st.plain(m.soldToday, live), "tile__value--hero")}>{st.plain(m.soldToday, live)}</span>
        <span className="tile__sub">
          {live.st
            ? `${count(m.soldCountToday)} ${m.soldCountToday === 1 ? "job" : "jobs"} sold · avg ${money(m.avgSoldValue)}`
            : "ServiceTitan not connected"}
        </span>
      </div>

      <div className="tile c4">
        <span className="tile__label">Invoiced today</span>
        <span className={vcls(st.plain(m.revenueToday, live), "tile__value--hero")}>
          {st.plain(m.revenueToday, live)}
        </span>
        <span className="tile__sub">
          {live.st
            ? `${count(m.invoiceCountToday)} invoiced today · avg ${money(m.avgInvoiceValue)}`
            : "ServiceTitan not connected"}
        </span>
      </div>

      <div className="tile c4">
        <span className="tile__label">Leads</span>
        <div className="tile__inline">
          <span>
            <span className="tile__value tile__value--hero">{count(m.leadsToday)}</span>
            <span className="tile__sub" style={{ display: "block" }}>
              today
            </span>
          </span>
          <span style={{ marginLeft: "1.2vw" }}>
            <span className="tile__value tile__value--hero">{count(m.leadsWeek)}</span>
            <span className="tile__sub" style={{ display: "block" }}>
              this week
            </span>
          </span>
        </div>
        <span className="tile__sub">
          {m.leadsWeek - m.leadsPrevWeek >= 0 ? "+" : ""}
          {m.leadsWeek - m.leadsPrevWeek} vs last week
        </span>
      </div>

      {/* Booking and cancel rate need data nothing currently syncs — calls sit
          behind ServiceTitan's Telecom scope, and cancellations aren't pulled
          at all. The cards hold their place and say what they need rather than
          showing a rate derived from nothing. */}
      <RateCard
        label="Booking rate"
        context="needs the Telecom scope"
        value={null}
        note="Calls aren't synced, so booked-of-called can't be worked out."
      />
      <RateCard
        label="Close rate"
        context={live.st ? `${count(m.closeRate30dSold)} sold of ${count(m.closeRate30dQuotes)} quotes` : ""}
        value={live.st ? m.closeRate30d : null}
        note={live.st ? "Quotes written, last 30 days" : "ServiceTitan not connected"}
      />
      <RateCard
        label="Cancel rate"
        context="not synced"
        value={null}
        note="Job cancellations aren't pulled from ServiceTitan yet."
      />

      <Split label="Jobs booked" sub={st.sub("this month", live)} value={st.count(m.bookingsMonth, live)} />
      <Split label="Jobs completed" sub={st.sub("this week", live)} value={st.count(m.jobsCompletedWeek, live)} />
      <Split
        label="Quotes out"
        sub={live.st ? `${money(m.estimatesOpenValue)} open` : "ServiceTitan not connected"}
        value={st.count(m.estimatesOpenCount, live)}
      />
      <Split
        label="Overdue"
        sub={m.overdueTotal == null ? "Xero not connected" : m.overdueTotal > 0 ? "Needs closing out" : "Nothing overdue"}
        subAccent={(m.overdueTotal ?? 0) > 0}
        value={m.overdueCount == null ? NA : count(m.overdueCount)}
      />

      <div className="tile c12">
        <div className="tile__head">
          <span className="tile__title">What they&apos;re asking for</span>
          <span className="tile__sub">{count(mixTotal)} leads in the last 30 days</span>
        </div>
        {m.leadsByService.length === 0 ? (
          <span className="tile__sub">No leads in the last 30 days</span>
        ) : (
          <div className="mix">
            {m.leadsByService.map((x, i) => (
              <div className="mix__col" key={x.service}>
                <span className="mix__name">{x.service}</span>
                <span className="mix__figure">
                  <b>{x.count}</b>
                  <span>{mixTotal ? Math.round((x.count / mixTotal) * 100) : 0}%</span>
                </span>
                <div className="meter">
                  <div
                    className={`meter__fill ${i === 0 ? "meter__fill--accent" : ""}`}
                    style={{ width: `${mixTotal ? (x.count / mixTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- /02 Pace */
function PacePage({ m, live, now }: { m: Metrics; live: Live; now: Date }) {
  const progress = m.workingDaysTotal > 0 ? (m.workingDaysTotal - m.workingDaysLeft) / m.workingDaysTotal : 0;
  const today = dayProgress(now);

  return (
    <>
      <DailyCard
        label="Sold today"
        achieved={live.st ? m.soldToday : null}
        target={m.dailySalesTarget}
        unit="daily target"
        dayProgress={today}
      />
      <DailyCard
        label="Invoiced today"
        achieved={live.st ? m.revenueToday : null}
        target={m.dailyTarget}
        unit="daily target"
        dayProgress={today}
      />
      <div className="tile c4">
        <span className="tile__label">Leads today</span>
        <div className="tile__inline">
          <span className="tile__value">{count(m.leadsToday)}</span>
          <span className="tile__sub">
            <b>{count(m.leadsWeek)}</b> this week · {m.leadsWeek - m.leadsPrevWeek >= 0 ? "+" : ""}
            {m.leadsWeek - m.leadsPrevWeek} on last
          </span>
        </div>
      </div>

      <Gauge
        label="Revenue invoiced"
        achieved={live.st ? m.revenueInvoicedMtd : null}
        target={m.revenueTargetMonthly}
        progress={progress}
        format={money}
      />
      <Gauge
        label="Sold"
        achieved={live.st ? m.soldMtd : null}
        target={m.salesTargetMonthly}
        progress={progress}
        format={money}
      />
      <Gauge
        label="Gross profit"
        achieved={live.st ? m.profitMtd : null}
        target={m.profitTargetMonthly}
        progress={progress}
        format={money}
      />
      <Gauge
        label="Jobs booked"
        achieved={live.st ? m.bookingsMonth : null}
        target={m.bookingsTargetMonthly}
        progress={progress}
        format={(n) => count(n)}
      />

      <div className="screen__legend c12">
        <span className="tile__sub" style={{ display: "inline-flex", alignItems: "center", gap: "0.5vw" }}>
          <span style={{ width: "1.6vw", height: "0.45vw", borderRadius: 999, background: "var(--navy)" }} />
          Progress to the monthly target
        </span>
        <span className="tile__sub" style={{ display: "inline-flex", alignItems: "center", gap: "0.5vw" }}>
          <span style={{ width: "0.17vw", height: "0.9vw", background: "var(--accent)" }} />
          Where we should be by now — {clockLabel(now)} of a 7am&ndash;5pm day · {Math.round(progress * 100)}% of
          the month&apos;s working days
        </span>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- /03 Quotes */
function QuotesPage({ m, live }: { m: Metrics; live: Live }) {
  if (!live.st) return <NotConnected what="quotes written, still out, or closed" />;

  return (
    <>
      <div className="tile c3" style={{ gridColumn: "1 / span 3", gridRow: 1 }}>
        <span className="tile__label">Quoted today</span>
        <span className={vcls(plain(m.quotesCreatedTodayValue), "tile__value--hero")}>{plain(m.quotesCreatedTodayValue)}</span>
        <span className="tile__sub">{count(m.quotesCreatedTodayCount)} quotes written</span>
      </div>

      <div className="tile tile--navy c3" style={{ gridColumn: "1 / span 3", gridRow: 2 }}>
        <span className="tile__label">Turned to sold</span>
        <span className={vcls(plain(m.soldToday), "tile__value--hero")}>{plain(m.soldToday)}</span>
        <span className="tile__sub">
          {count(m.quotesCreatedTodaySold)} of {count(m.quotesCreatedTodayCount)} written today
        </span>
      </div>

      <div className="tile c3" style={{ gridColumn: "1 / span 3", gridRow: 3 }}>
        <span className="tile__label">Conversion today</span>
        <span className={vcls(pct(m.conversionTodayPct), "tile__value--hero")}>{pct(m.conversionTodayPct)}</span>
        <div className="meter">
          <div className="meter__fill meter__fill--accent" style={{ width: `${(m.conversionTodayPct ?? 0) * 100}%` }} />
        </div>
      </div>

      <div className="tile" style={{ gridColumn: "4 / span 5", gridRow: "1 / span 3" }}>
        <div className="tile__head">
          <span className="tile__title">Today&apos;s quotes</span>
          <span className="tile__sub">newest first</span>
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
                <span className="quote__label">{qr.label}</span>
                <span className="quote__value">{plain(qr.value)}</span>
                <span className={`pill ${qr.sold ? "pill--solid" : "pill--quiet"}`}>{qr.sold ? "Sold" : "Open"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: "1 / span 3" }}>
        <div className="tile__head">
          <span className="tile__title">Still out · largest</span>
          <span className="tile__sub">
            {count(m.estimatesOpenCount)} open · {money(m.estimatesOpenValue)}
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
                <span className={`pill ${qr.ageDays >= 7 ? "pill--behind" : "pill--quiet"}`}>
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

/* ------------------------------------------------------------------- /04 Team */
function TeamPage({ m, live }: { m: Metrics; live: Live }) {
  if (!live.st || m.salesLeaderboard.length === 0) {
    return <NotConnected what="who has sold what" />;
  }

  const totals = m.salesLeaderboard.reduce(
    (a, r) => ({ today: a.today + r.soldToday, week: a.week + r.soldWeek, month: a.month + r.sold }),
    { today: 0, week: 0, month: 0 },
  );
  const callsFor = (n: string) => m.callsByPerson.find((c) => c.name === n);
  const totalCalls = m.callsByPerson.reduce((s, c) => s + c.month, 0);

  return (
    <div className="tile c12">
      <div className="tbl">
        <div className="tbl__head">
          <span />
          <span>Tech</span>
          <span>Today</span>
          <span>This week</span>
          <span>Month</span>
          <span>Calls</span>
          <span>Next bonus tier</span>
        </div>

        {m.salesLeaderboard.map((r, i) => {
          const c = callsFor(r.name);
          return (
            <div className={`tbl__row ${i === 0 ? "tbl__row--leader" : ""}`} key={r.name}>
              <span className={`tbl__rank ${i === 0 ? "tbl__rank--leader" : ""}`}>{i + 1}</span>
              <span>
                <span className="tbl__name" style={{ display: "block" }}>
                  {r.name}
                </span>
                <span className={`pill ${i === 0 ? "pill--accent" : "pill--outline"}`}>
                  {r.tier == null ? "No tiers set" : r.tier === 0 ? "No tier yet" : `${i === 0 ? "Leader · " : ""}Tier ${r.tier}`}
                </span>
              </span>
              <span>
                <span className="tbl__fig" style={{ display: "block" }}>
                  {plain(r.soldToday)}
                </span>
              </span>
              <span>
                <span className="tbl__fig" style={{ display: "block" }}>
                  {plain(r.soldWeek)}
                </span>
              </span>
              <span>
                <span className="tbl__fig" style={{ display: "block" }}>
                  {plain(r.sold)}
                </span>
                <span className="tbl__of">{count(r.jobs)} sold</span>
              </span>
              <span className="tbl__calls">{c ? count(c.month) : NA}</span>
              <span>
                <div className={`tiers ${i === 0 ? "tiers--leader" : ""}`}>
                  {[0, 1, 2].map((seg) => (
                    <span key={seg}>
                      <i style={{ width: `${tierFill(r.tier, seg)}%` }} />
                    </span>
                  ))}
                </div>
                <span className="tbl__of">
                  {r.toNextTier == null ? "no tiers configured" : `${money(r.toNextTier)} to the next tier`}
                </span>
              </span>
            </div>
          );
        })}

        <div className="tbl__row tbl__row--total">
          <span />
          <span className="tbl__name">Team total</span>
          <span className="tbl__fig">{plain(totals.today)}</span>
          <span className="tbl__fig">{plain(totals.week)}</span>
          <span className="tbl__fig">{plain(totals.month)}</span>
          <span className="tbl__calls">{m.callsByPerson.length ? count(totalCalls) : NA}</span>
          <span className="tbl__of">
            {m.callsByPerson.length ? "" : "Calls need ServiceTitan's Telecom scope"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** A tier is reached or it isn't; the part-filled segment is the one in progress. */
function tierFill(tier: number | null, segment: number) {
  if (tier == null) return 0;
  if (segment < tier) return 100;
  if (segment === tier) return 45;
  return 0;
}

/* ------------------------------------------------------------ /05 Performance */
function PerformancePage({ m, live }: { m: Metrics; live: Live }) {
  const maxType = Math.max(1, ...m.topJobTypes.map((t) => (m.jobTypeBasis === "profit" ? t.profit ?? 0 : t.revenue)));
  const suburbs = m.topSuburbs.slice(0, 6);
  const maxSuburb = Math.max(1, ...suburbs.map((s) => s.count));

  return (
    <>
      <Split label="Jobs" sub={st.sub("booked this month", live)} value={st.count(m.bookingsMonth, live)} />
      <Split label="Invoiced" sub={st.sub("this month", live)} value={st.money(m.revenueInvoicedMtd, live)} />
      <Split label="Gross profit" sub={st.sub(`cost on ${Math.round(m.profitCoverage * 100)}% of invoices`, live)} value={st.money(m.profitMtd, live)} />
      <Split
        label="Margin"
        sub={m.marginPct == null ? "too few invoices carry cost" : "of invoices that carry cost"}
        value={live.st ? pct(m.marginPct) : NA}
      />

      <div className="tile c6">
        <div className="tile__head">
          <span className="tile__title">Job types by {m.jobTypeBasis === "profit" ? "gross profit" : "revenue"}</span>
          <span className="tile__sub">last 90 days</span>
        </div>
        {m.topJobTypes.length === 0 ? (
          <span className="tile__sub">{st.sub("No invoiced work in the last 90 days", live)}</span>
        ) : (
          <div className="rows">
            {m.topJobTypes.map((t, i) => {
              const v = m.jobTypeBasis === "profit" ? t.profit ?? 0 : t.revenue;
              return (
                <div className="row" key={t.jobType}>
                  <span className="row__idx">/{String(i + 1).padStart(2, "0")}</span>
                  <span className="row__name">{t.jobType}</span>
                  <span className="row__value">{money(v)}</span>
                  <span className="row__bar">
                    <span className="meter">
                      <span
                        className={`meter__fill ${i === 0 ? "meter__fill--accent" : ""}`}
                        style={{ display: "block", width: `${(v / maxType) * 100}%` }}
                      />
                    </span>
                    <span className="row__meta">{count(t.jobs)} jobs</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="tile c6">
        <div className="tile__head">
          <span className="tile__title">Top suburbs</span>
          <span className="tile__sub">by lead, last 30 days</span>
        </div>
        {suburbs.length === 0 ? (
          <span className="tile__sub">No leads recorded yet</span>
        ) : (
          <div className="rows">
            {suburbs.map((s, i) => (
              <div className="row" key={s.suburb}>
                <span className="row__idx">/{String(i + 1).padStart(2, "0")}</span>
                <span className="row__name">{s.suburb}</span>
                <span className="row__value">{count(s.count)}</span>
                <span className="row__bar">
                  <span className="meter">
                    <span
                      className={`meter__fill ${i === 0 ? "meter__fill--accent" : ""}`}
                      style={{ display: "block", width: `${(s.count / maxSuburb) * 100}%` }}
                    />
                  </span>
                  <span className="row__meta">{s.count === 1 ? "lead" : "leads"}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ /06 Areas */
function AreasPage({ m }: { m: Metrics; live: Live }) {
  const max = Math.max(1, ...m.topSuburbs.map((s) => s.count));
  const oldest = [...m.quotesOutstanding].sort((a, b) => b.ageDays - a.ageDays).slice(0, 6);

  return (
    <>
      <div className="tile" style={{ gridColumn: "1 / span 8", gridRow: "1 / span 2" }}>
        <div className="tile__head">
          <span className="tile__title">Leads by suburb</span>
          <span className="tile__sub">last 30 days · by lead postcode · not to scale</span>
        </div>
        {m.topSuburbs.length === 0 ? (
          <span className="tile__sub">No leads recorded yet</span>
        ) : (
          <>
            <div className="heat">
              {m.topSuburbs.map((s) => {
                // Light to navy by share of the busiest suburb. The label and the
                // number are inside every cell, so the ramp is reinforcement.
                const t = s.count / max;
                const bg = mixNavy(t);
                return (
                  <div className="heat__cell" key={s.suburb} style={{ background: bg, color: t > 0.55 ? "#fff" : "var(--navy)" }}>
                    <span className="heat__name">{s.suburb}</span>
                    <span className="heat__jobs">
                      {s.count} {s.count === 1 ? "lead" : "leads"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="heat__legend">
              <span>Fewer</span>
              <span className="heat__ramp" />
              <span>More</span>
            </div>
          </>
        )}
      </div>

      <div className="tile tile--navy" style={{ gridColumn: "9 / span 4", gridRow: 1 }}>
        <span className="tile__label">Biggest quote still out</span>
        <span className={vcls(m.quotesOutstanding[0] ? plain(m.quotesOutstanding[0].value) : NA, "tile__value--hero")}>
          {m.quotesOutstanding[0] ? plain(m.quotesOutstanding[0].value) : NA}
        </span>
        <span className="tile__sub">
          {m.quotesOutstanding[0]
            ? `${m.quotesOutstanding[0].label} · ${m.quotesOutstanding[0].ageDays} days out`
            : "Nothing outstanding"}
        </span>
      </div>

      {/* Going cold, not biggest: the Quotes page already ranks what is out by
          value, and the question this page answers is which ones are aging. */}
      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: 2 }}>
        <div className="tile__head">
          <span className="tile__title">Still out · oldest</span>
          <span className="tile__sub">longest since written</span>
        </div>
        {oldest.length === 0 ? (
          <span className="tile__sub">Nothing outstanding</span>
        ) : (
          <div className="quotes">
            {oldest.map((qr) => (
              <div className="quote quote--stack" key={qr.id}>
                <span className="quote__label">{qr.label}</span>
                <span className="quote__value">{plain(qr.value)}</span>
                <span className={`pill ${qr.ageDays >= 7 ? "pill--behind" : "pill--quiet"}`}>
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

/** Light cream to navy. Kept here so the ramp and the legend can't drift apart. */
function mixNavy(t: number) {
  const from = [226, 224, 221];
  const to = [5, 10, 48];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * Math.min(1, Math.max(0, t))));
  return `rgb(${c.join(",")})`;
}

/* ------------------------------------------------------------------- pieces */
function Split({
  label,
  sub,
  value,
  subAccent,
}: {
  label: string;
  sub: string;
  value: string;
  subAccent?: boolean;
}) {
  return (
    <div className="tile tile--split c3">
      <div>
        <span className="tile__label">{label}</span>
        <span className="tile__sub" style={subAccent ? { color: "var(--accent)", fontWeight: 700 } : undefined}>
          {sub}
        </span>
      </div>
      <span className={vcls(value)}>{value}</span>
    </div>
  );
}

function RateCard({
  label,
  context,
  value,
  note,
}: {
  label: string;
  context: string;
  value: number | null;
  note: string;
}) {
  return (
    <div className="tile c4">
      <div className="tile__head">
        <span className="tile__label">{label}</span>
        <span className="tile__sub">{context}</span>
      </div>
      <div className="tile__inline">
        <span className={`tile__value ${value == null ? "tile__value--na" : ""}`}>
          {value == null ? NA : pct(value)}
        </span>
        <span className="tile__sub">{note}</span>
      </div>
      {/* No bar for a rate we can't compute — an empty track implies zero. */}
      {value != null && (
        <div className="meter">
          <div className="meter__fill" style={{ width: `${value * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function DailyCard({
  label,
  achieved,
  target,
  unit,
  plainNumber,
  dayProgress: elapsed,
}: {
  label: string;
  achieved: number | null;
  target: number | null;
  unit: string;
  plainNumber?: boolean;
  /** Share of the 7am-5pm working day gone, drawn as the tick on the bar. */
  dayProgress?: number;
}) {
  const ratio = target && target > 0 && achieved != null ? achieved / target : null;
  const state = ratio == null ? null : ratio >= 1 ? "ahead" : ratio >= 0.85 ? "ahead" : "behind";

  return (
    <div className="tile c4">
      <div className="tile__head">
        <span className="tile__label">{label}</span>
        {state && (
          <span className={`pill pill--${state}`}>{ratio! >= 1 ? "Target hit" : "Behind pace"}</span>
        )}
      </div>
      <div className="tile__inline">
        <span className={vcls(ratio == null ? NA : pct(ratio))}>{ratio == null ? NA : pct(ratio)}</span>
        <span className="tile__sub">
          {achieved == null ? (
            unit
          ) : (
            <>
              <b>{plainNumber ? count(achieved) : plain(achieved)}</b>
              {target ? <> of {plainNumber ? count(target) : plain(target)} {unit}</> : <> · {unit}</>}
            </>
          )}
        </span>
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

/**
 * How much of the working day has gone, in Melbourne.
 *
 * A daily target is hit over a 7am-5pm day, so comparing takings against the
 * whole day's number at 9am reads as a disaster every morning. The tick says
 * where the day is up to; the clock is the one input here that needs no feed.
 */
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
