"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
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
    `Day ${m.workingDaysTotal - m.workingDaysLeft + 1} of ${m.workingDaysTotal} in ${new Date().toLocaleDateString(
      "en-AU",
      { month: "long", timeZone: "Australia/Melbourne" },
    )}`,
  Quotes: () => "Today",
  Team: () => "Sold this month",
  Performance: () => "Month to date",
  Areas: () => "Last 30 days",
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
            ? now.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Australia/Melbourne",
              })
            : SUBTITLES[name](m)}
        </span>

        {/* The tab strip doubles as the page indicator: the filled pill is the
            only thing that moves as the board rotates, so the room can see
            where it is in the cycle without reading. */}
        <nav className="screen__tabs" aria-label="Board pages">
          {PAGES.map((p, i) => (
            <span key={p} className={`screen__tab ${i === page ? "is-on" : ""}`}>
              {p}
            </span>
          ))}

          {/* How long this page has left. A CSS animation restarted by the key
              rather than a ticking state: the board runs for months on a kiosk,
              and re-rendering the whole tree once a second to sweep one ring is
              exactly the sort of thing that degrades it. */}
          <span className="screen__timer" key={page} title="Time to the next page">
            <svg viewBox="0 0 24 24" role="img" aria-label={`Next page in ${PAGE_MS / 1000} seconds`}>
              <circle className="screen__timer-track" cx="12" cy="12" r="10" />
              <circle className="screen__timer-hand" cx="12" cy="12" r="10" />
            </svg>
          </span>
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
          <span className={`screen__dot ${degraded.length ? "screen__dot--stale" : ""}`} aria-hidden />
          <b>Live</b>
        </span>
        <span>
          Synced {relative(snap.computedAt, now)}
          {degraded.length === 0
            ? " · No issues"
            : ` · ${degraded.map(([n, sc]) => `${n} ${sc.state}${sc.detail ? ` — ${sc.detail}` : ""}`).join(" · ")}`}
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
function TodayPage({ m, live }: { m: Metrics; live: Live }) {
  return (
    <>
      <div className="tile tile--navy tile--hero c4">
        <span className="tile__label">Sold today</span>
        <span className={vcls(st.plain(m.soldToday, live), "tile__value--hero")}>
          {st.plain(m.soldToday, live)}
        </span>
      </div>

      <div className="tile tile--hero c4">
        <span className="tile__label">Invoiced today</span>
        <span className={vcls(st.plain(m.revenueToday, live), "tile__value--hero")}>
          {st.plain(m.revenueToday, live)}
        </span>
      </div>

      {/* Today's leads are what anybody can still act on; the week is context,
          so it takes the quieter of the two figure colours. */}
      <div className="tile tile--hero c4">
        <span className="tile__label">Leads</span>
        <div className="pair">
          <span>
            <span className="tile__value tile__value--hero">{count(m.leadsToday)}</span>
            <span className="tile__sub">today</span>
          </span>
          <span>
            <span className="tile__value tile__value--hero tile__value--muted">{count(m.leadsWeek)}</span>
            <span className="tile__sub">this week</span>
          </span>
        </div>
      </div>

      {/* Booking and cancel rate need data nothing currently syncs — calls sit
          behind ServiceTitan's Telecom scope, and cancellations aren't pulled
          at all. The cards hold their place and say what they need rather than
          showing a rate derived from nothing. */}
      <RateCard label="Booking rate" sub="Needs the Telecom scope" value={null} />
      <RateCard
        label="Close rate"
        sub={
          live.st
            ? `${count(m.closeRate30dSold)} of ${count(m.closeRate30dQuotes)} quotes · last 30 days`
            : "ServiceTitan not connected"
        }
        value={live.st ? m.closeRate30d : null}
      />
      <RateCard label="Cancel rate" sub="Not pulled from ServiceTitan yet" value={null} />

      <Split label="Jobs booked" value={st.count(m.bookingsMonth, live)} />
      <Split label="Jobs completed" value={st.count(m.jobsCompletedWeek, live)} />
      <Split label="Quotes out" value={st.count(m.estimatesOpenCount, live)} />
      <Split
        label="Overdue"
        value={m.overdueCount == null ? NA : count(m.overdueCount)}
        accent={(m.overdueCount ?? 0) > 0}
      />

      <div className="tile tile--split c12">
        <span className="tile__label">Service mix</span>
        {m.leadsByService.length === 0 ? (
          <span className="tile__sub">No leads in the last 30 days</span>
        ) : (
          <div className="mix">
            {m.leadsByService.map((x) => (
              <div className="mix__col" key={x.service}>
                <span className="mix__count">{x.count}</span>
                <span className="mix__name">{x.service}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PacePage({ m, live, now }: { m: Metrics; live: Live; now: Date }) {
  const progress = m.workingDaysTotal > 0 ? (m.workingDaysTotal - m.workingDaysLeft) / m.workingDaysTotal : 0;
  const today = dayProgress(now);

  return (
    <>
      <DailyCard
        label="Sold today"
        achieved={live.st ? m.soldToday : null}
        target={m.dailySalesTarget}
        dayProgress={today}
      />
      <DailyCard
        label="Invoiced today"
        achieved={live.st ? m.revenueToday : null}
        target={m.dailyTarget}
        dayProgress={today}
      />
      <DailyCard
        label="Jobs booked today"
        achieved={live.st ? m.bookingsToday : null}
        target={m.dailyBookingsTarget}
        plainNumber
        dayProgress={today}
      />

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
        unavailable={live.st && m.profitMtd == null ? "No cost on any invoice" : undefined}
      />
      <Gauge
        label="Jobs booked"
        achieved={live.st ? m.bookingsMonth : null}
        target={m.bookingsTargetMonthly}
        progress={progress}
        format={(n) => count(n)}
      />
    </>
  );
}

function QuotesPage({ m, live }: { m: Metrics; live: Live }) {
  if (!live.st) return <NotConnected what="quotes written, still out, or closed" />;

  return (
    <>
      <div className="tile tile--hero c3" style={{ gridColumn: "1 / span 3", gridRow: 1 }}>
        <span className="tile__label">Quoted</span>
        <span className={vcls(plain(m.quotesCreatedTodayValue), "tile__value--hero")}>
          {plain(m.quotesCreatedTodayValue)}
        </span>
        <span className="tile__sub">{count(m.quotesCreatedTodayCount)} quotes</span>
      </div>

      <div className="tile tile--navy tile--hero c3" style={{ gridColumn: "1 / span 3", gridRow: 2 }}>
        <span className="tile__label">Sold</span>
        <span className={vcls(plain(m.soldToday), "tile__value--hero")}>{plain(m.soldToday)}</span>
        <span className="tile__sub">{count(m.quotesCreatedTodaySold)} quotes</span>
      </div>

      <div className="tile tile--hero c3" style={{ gridColumn: "1 / span 3", gridRow: 3 }}>
        <span className="tile__label">Close rate</span>
        <span className={vcls(pct(m.conversionTodayPct), "tile__value--hero")}>{pct(m.conversionTodayPct)}</span>
        <span className="tile__sub">
          {count(m.quotesCreatedTodaySold)} of {count(m.quotesCreatedTodayCount)}
        </span>
      </div>

      <div className="tile" style={{ gridColumn: "4 / span 5", gridRow: "1 / span 3" }}>
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

      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: "1 / span 3" }}>
        <div className="tile__head">
          <span className="tile__title">Still out</span>
          <span className="tile__sub">
            {count(m.estimatesOpenCount)} · {money(m.estimatesOpenValue)}
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
    (a, r) => ({ today: a.today + r.soldToday, week: a.week + r.soldWeek, month: a.month + r.sold }),
    { today: 0, week: 0, month: 0 },
  );
  const callsFor = (n: string) => m.callsByPerson.find((c) => c.name === n);
  // Calls come from ServiceTitan's Telecom module, which is a separate scope.
  // Without it the column is unknown, not zero — and saying so is the only way
  // anyone learns what would make it appear.
  const haveCalls = m.callsByPerson.length > 0;

  return (
    <div className="tile c12">
      <div className="tbl">
        <div className="tbl__head">
          <span />
          <span>Tech</span>
          <span>Today</span>
          <span>This week</span>
          <span>This month</span>
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
                {i === 0 && <span className="tbl__note tbl__note--leader">Leader</span>}
              </span>
              <span className="tbl__fig">
                <b>{plain(r.soldToday)}</b>
              </span>
              <span className="tbl__fig">
                <b>{plain(r.soldWeek)}</b>
              </span>
              <span className="tbl__fig">
                <b>{plain(r.sold)}</b>
                <span>{count(r.jobs)} sold</span>
              </span>
              <span className="tbl__fig">
                <b className={haveCalls ? undefined : "tile__value--na"}>{c ? count(c.month) : NA}</b>
                {!haveCalls && <span>needs Telecom</span>}
              </span>
              <span className="tiers">
                <span className="tiers__bar">
                  {[0, 1, 2].map((seg) => (
                    <span
                      key={seg}
                      className={`tiers__seg ${
                        r.tier != null && seg < r.tier ? (i === 0 ? "is-on-leader" : "is-on") : ""
                      }`}
                    />
                  ))}
                </span>
                <span className={`tiers__note ${i === 0 ? "tiers__note--leader" : ""}`}>
                  {r.toNextTier == null ? "no tiers configured" : `${money(r.toNextTier)} to the next tier`}
                </span>
              </span>
            </div>
          );
        })}

        <div className="tbl__row tbl__row--total">
          <span />
          <span className="tbl__name">Team</span>
          <span className="tbl__fig">
            <b>{plain(totals.today)}</b>
          </span>
          <span className="tbl__fig">
            <b>{plain(totals.week)}</b>
          </span>
          <span className="tbl__fig">
            <b>{plain(totals.month)}</b>
          </span>
          <span className="tbl__fig">
            <b className={haveCalls ? undefined : "tile__value--na"}>
              {haveCalls ? count(m.callsByPerson.reduce((s, c) => s + c.month, 0)) : NA}
            </b>
          </span>
          <span className="tiers__note">
            {m.commissionTiers.length === 0
              ? "no tiers configured"
              : `Tiers ${m.commissionTiers.map((t) => money(t.from)).join(" · ")}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function tierFill(tier: number | null, segment: number) {
  if (tier == null) return 0;
  if (segment < tier) return 100;
  if (segment === tier) return 45;
  return 0;
}

/* ------------------------------------------------------------ /05 Performance */
function PerformancePage({ m, live }: { m: Metrics; live: Live }) {
  const maxType = Math.max(1, ...m.topJobTypes.map((t) => (m.jobTypeBasis === "profit" ? (t.profit ?? 0) : t.revenue)));
  const suburbs = m.topSuburbs.slice(0, 6);
  const maxSuburb = Math.max(1, ...suburbs.map((s) => s.count));

  return (
    <>
      <Split label="Jobs" value={st.count(m.bookingsMonth, live)} />
      <Split label="Invoiced" value={st.money(m.revenueInvoicedMtd, live)} />
      <Split
        label="Gross profit"
        value={st.money(m.profitMtd, live)}
        sub={live.st && m.profitMtd == null ? "no cost on any invoice" : undefined}
      />
      <Split
        label="Margin"
        value={live.st ? pct(m.marginPct) : NA}
        sub={m.marginPct == null && live.st ? "no cost data in ServiceTitan" : undefined}
      />

      <div className="tile c6">
        <div className="tile__head">
          <span className="tile__title">
            Job types · {m.jobTypeBasis === "profit" ? "gross profit" : "revenue"}
          </span>
          {/* The set-aside count is on the wall, not buried: a ranking that
              quietly omits most of the invoices is a ranking you can't trust. */}
          <span className="tile__sub">
            last 90 days
            {m.jobTypeUnclassified > 0 ? ` · ${count(m.jobTypeUnclassified)} untyped` : ""}
          </span>
        </div>
        {m.topJobTypes.length === 0 ? (
          <span className="tile__sub">{st.sub("No invoiced work in the last 90 days", live)}</span>
        ) : (
          <div className="rows">
            {m.topJobTypes.map((t, i) => {
              const v = m.jobTypeBasis === "profit" ? (t.profit ?? 0) : t.revenue;
              return (
                <div className="row" key={t.jobType}>
                  <div className="row__top">
                    <span className="row__name">{t.jobType}</span>
                    <span className="row__right">
                      <span className="row__meta">{count(t.jobs)} jobs</span>
                      <span className="row__value">{money(v)}</span>
                    </span>
                  </div>
                  <span className="meter">
                    <span
                      className={`meter__fill ${i === 0 ? "meter__fill--accent" : ""}`}
                      style={{ display: "block", width: `${(v / maxType) * 100}%` }}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="tile c6">
        <div className="tile__head">
          <span className="tile__title">Top suburbs · leads</span>
          <span className="tile__sub">last 30 days</span>
        </div>
        {suburbs.length === 0 ? (
          <span className="tile__sub">No leads recorded yet</span>
        ) : (
          <div className="rows">
            {suburbs.map((s, i) => (
              <div className="row" key={s.suburb}>
                <div className="row__top">
                  <span className="row__name">{s.suburb}</span>
                  <span className="row__right">
                    <span className="row__value">{count(s.count)}</span>
                  </span>
                </div>
                <span className="meter">
                  <span
                    className={`meter__fill ${i === 0 ? "meter__fill--accent" : ""}`}
                    style={{ display: "block", width: `${(s.count / maxSuburb) * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AreasPage({ m }: { m: Metrics; live: Live }) {
  const max = Math.max(1, ...m.topSuburbs.map((s) => s.count));
  const oldest = [...m.quotesOutstanding].sort((a, b) => b.ageDays - a.ageDays).slice(0, 5);
  const biggest = m.quotesOutstanding[0];

  return (
    <>
      <div className="tile" style={{ gridColumn: "1 / span 8", gridRow: "1 / span 3" }}>
        <div className="tile__head">
          <span className="tile__title">Leads by suburb</span>
          <span className="heat__legend">
            Fewer
            <span className="heat__ramp" />
            More
          </span>
        </div>
        {m.topSuburbs.length === 0 ? (
          <span className="tile__sub">No leads recorded yet</span>
        ) : (
          <div className="heat">
            {m.topSuburbs.map((s) => {
              // Light to navy by share of the busiest suburb. The name and the
              // number are inside every cell, so the ramp is reinforcement.
              const t = s.count / max;
              return (
                <div
                  className="heat__cell"
                  key={s.suburb}
                  style={{ background: mixNavy(t), color: t > 0.55 ? "#fff" : "var(--navy)" }}
                >
                  <span className="heat__name">{s.suburb}</span>
                  <span className="heat__jobs">{s.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="tile tile--navy" style={{ gridColumn: "9 / span 4", gridRow: 1 }}>
        <span className="tile__label">Biggest quote still out</span>
        <span className={vcls(biggest ? plain(biggest.value) : NA, "tile__value--hero")}>
          {biggest ? plain(biggest.value) : NA}
        </span>
        <span className="tile__sub">
          {biggest ? `${biggest.label} · ${biggest.ageDays} days out` : "Nothing outstanding"}
        </span>
      </div>

      {/* Going cold, not biggest: the Quotes page already ranks what is out by
          value, and the question this page answers is which ones are aging. */}
      <div className="tile" style={{ gridColumn: "9 / span 4", gridRow: "2 / span 2" }}>
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

function mixNavy(t: number) {
  const from = [226, 224, 221];
  const to = [5, 10, 48];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * Math.min(1, Math.max(0, t))));
  return `rgb(${c.join(",")})`;
}

/* ------------------------------------------------------------------- pieces */
function Split({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="tile tile--split c3">
      <div>
        <span className="tile__label">{label}</span>
        {sub ? <span className="tile__sub">{sub}</span> : null}
      </div>
      <span className={vcls(value)} style={accent && value !== NA ? { color: "var(--accent)" } : undefined}>
        {value}
      </span>
    </div>
  );
}

function RateCard({ label, sub, value }: { label: string; sub: string; value: number | null }) {
  const shown = value == null ? NA : pct(value);
  return (
    <div className="tile tile--split c4">
      <div>
        <span className="tile__label">{label}</span>
        <span className="tile__sub">{sub}</span>
      </div>
      <span className={`${vcls(shown)} tile__value--rate`}>{shown}</span>
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
