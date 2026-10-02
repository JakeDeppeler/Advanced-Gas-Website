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
const PAGE_MS = 20_000;
const PAGES = ["Today", "Pace", "Quotes", "Team", "Performance"] as const;

const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-AU")}`;
};

// The daily number is read off the wall and acted on, so it keeps its digits
// rather than being compacted to "$8K". Rounded to the nearest $100 — nobody
// chases the last two dollars of a daily target.
const exact = (n: number | null | undefined) =>
  n == null ? "—" : `$${(Math.round(n / 100) * 100).toLocaleString("en-AU")}`;

// Full digits, no compacting. Used where two figures sit side by side and are
// meant to be read against each other: money() switches to "$15K" above ten
// thousand, so a pair straddling that threshold would render as "$15K" next to
// "$9,240" and stop looking like the same kind of number.
const plain = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-AU")}`;

const signed = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;

const count = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-AU"));

/**
 * ServiceTitan-derived figures, gated on the source actually being connected.
 *
 * With no connection every one of these computes to 0 — no jobs, no invoices,
 * no estimates — and a zero is indistinguishable from a measurement. The board
 * said "Quotes out $0" to someone who had sent quotes that morning, which is
 * precisely how a wall board loses the room. Unknown reads as "—".
 *
 * `stale` still shows values: those were measured, just not recently, and the
 * header dot already says so.
 */
type Live = { st: boolean };

const st = {
  money: (n: number | null | undefined, l: Live) => (l.st ? money(n) : "—"),
  plain: (n: number | null | undefined, l: Live) => (l.st ? plain(n) : "—"),
  count: (n: number | null | undefined, l: Live) => (l.st ? count(n) : "—"),
  pct: (n: number | null | undefined, l: Live) => (l.st && n != null ? `${Math.round(n * 100)}%` : "—"),
  sub: (text: string, l: Live) => (l.st ? text : "ServiceTitan not connected"),
};

export function ScreenBoard({
  initial,
  token,
  theme = "dark",
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

    const timer = setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  const m = snap.metrics;
  const celebrating = queue[0];
  // Anything downstream of ServiceTitan is unknown rather than zero until the
  // sync has actually talked to it.
  const live: Live = { st: snap.sources.servicetitan?.state !== "not-configured" };

  return (
    <div className={`screen ${theme === "light" ? "screen--light" : ""}`}>
      {celebrating && (
        <Celebration
          key={celebrating.id}
          sale={celebrating}
          onDone={() => setQueue((qd) => qd.slice(1))}
        />
      )}

      <div className="screen__bar">
        <span className="screen__title">
          Advanced Gas — {PAGES[page]}
          <span className="screen__pages" style={{ display: "inline-flex", marginLeft: "0.8vw" }}>
            {PAGES.map((p, i) => (
              <span key={p} className={`screen__pip ${i === page ? "screen__pip--on" : ""}`} />
            ))}
          </span>
        </span>
        <span className="screen__sources">
          {Object.entries(snap.sources).map(([name, s]) => (
            <span className="screen__source" key={name}>
              <span className={`screen__dot ${dotClass(s.state)}`} aria-hidden />
              {name}
              {s.state !== "ok" ? ` · ${s.state}` : ""}
            </span>
          ))}
          <span className="screen__source">updated {relative(snap.computedAt, now)}</span>
        </span>
        <span className="screen__clock">
          {now.toLocaleTimeString("en-AU", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Australia/Melbourne",
          })}
        </span>
      </div>

      <div className="screen__grid">
        {page === 0 && <TodayPage m={m} live={live} />}
        {page === 1 && <PacePage m={m} live={live} />}
        {page === 2 && <QuotesPage m={m} live={live} />}
        {page === 3 && <TeamPage m={m} live={live} />}
        {page === 4 && <PerformancePage m={m} live={live} />}
      </div>
    </div>
  );
}

function TodayPage({ m, live }: { m: Metrics; live: Live }) {
  const leadDelta = m.leadsWeek - m.leadsPrevWeek;
  const maxService = Math.max(1, ...m.leadsByService.map((x) => x.count));

  return (
    <>
      {/* The two daily numbers, given equal weight and identical shape because
          they are the same question asked of two teams. Selling is the half the
          room can still act on today; invoicing is the half already committed
          weeks ago. Ordered sold-then-invoiced so the actionable one is read
          first on a left-to-right scan. */}
      <HeroTile
        label="To sell per day"
        daily={m.dailySalesTarget}
        today={live.st ? m.soldToday : null}
        todayLabel="sold today"
        mtd={m.soldMtd}
        target={m.salesTargetMonthly}
        pacePct={m.salesPacePct}
        aheadBehind={m.salesAheadBehind}
        daysLeft={m.workingDaysLeft}
        noTarget="No monthly sales target set"
      />

      <HeroTile
        label="To invoice per day"
        daily={m.dailyTarget}
        today={live.st ? m.revenueToday : null}
        todayLabel="invoiced today"
        mtd={m.revenueInvoicedMtd}
        target={m.revenueTargetMonthly}
        pacePct={m.revenuePacePct}
        aheadBehind={m.aheadBehind}
        daysLeft={m.workingDaysLeft}
        noTarget="No monthly revenue target set"
      />

      <Tile label="Leads today" value={count(m.leadsToday)} />

      <Tile
        label="Leads this week"
        value={count(m.leadsWeek)}
        delta={leadDelta === 0 ? "level vs last week" : `${leadDelta > 0 ? "+" : ""}${leadDelta} vs last week`}
        deltaGood={leadDelta >= 0}
      />

      {/* What people are actually asking for. Every lead carries a service, so
          this is measured rather than inferred — unlike a response-time tile,
          which would need a contact timestamp nothing currently writes. */}
      <div className="tile tile--wide">
        <span className="tile__label">What they&apos;re asking for · last 30 days</span>
        {m.leadsByService.length === 0 ? (
          <span className="tile__sub">No leads in the last 30 days</span>
        ) : (
          <div className="bars bars--lg bars--wide-names">
            {m.leadsByService.map((x) => (
              <div className="bars__row" key={x.service}>
                <span className="bars__name">{x.service}</span>
                <span className="bars__track">
                  <span className="bars__fill" style={{ display: "block", width: `${(x.count / maxService) * 100}%` }} />
                </span>
                <span className="bars__count">{x.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Tile label="Jobs completed" value={st.count(m.jobsCompletedWeek, live)} sub={st.sub("this week", live)} />
      <Tile label="Booked" value={st.count(m.jobsScheduledNext7, live)} sub={st.sub("next 7 days", live)} />
      <Tile
        label="Quotes out"
        value={st.money(m.estimatesOpenValue, live)}
        sub={st.sub(`${count(m.estimatesOpenCount)} open`, live)}
      />

      <Tile
        label="Overdue"
        value={money(m.overdueTotal)}
        state={m.overdueTotal == null ? "" : m.overdueTotal > 0 ? "critical" : "good"}
        sub={
          m.overdueTotal == null
            ? "xero not connected"
            : m.overdueCount
              ? `${m.overdueCount} invoices`
              : "nothing overdue"
        }
      />
    </>
  );
}

/** Four gauges, one per thing the month is judged on. */
function PacePage({ m, live }: { m: Metrics; live: Live }) {
  return (
    <>
      <Gauge
        label="Revenue invoiced"
        value={st.money(m.revenueInvoicedMtd, live)}
        pacePct={m.revenuePacePct}
        target={m.revenueTargetMonthly ? money(m.revenueTargetMonthly) : null}
      />
      <Gauge
        label="Sold"
        value={st.money(m.soldMtd, live)}
        pacePct={m.salesPacePct}
        target={m.salesTargetMonthly ? money(m.salesTargetMonthly) : null}
      />
      <Gauge
        label="Gross profit"
        value={st.money(m.profitMtd, live)}
        pacePct={m.profitPacePct}
        target={m.profitTargetMonthly ? money(m.profitTargetMonthly) : null}
        footnote={
          m.profitCoverage >= 0.99
            ? undefined
            : `cost on ${Math.round(m.profitCoverage * 100)}% of invoices`
        }
      />
      <Gauge
        label="Jobs booked"
        value={st.count(m.bookingsMonth, live)}
        pacePct={m.bookingsPacePct}
        target={m.bookingsTargetMonthly ? count(m.bookingsTargetMonthly) : null}
      />

      <div className="tile tile--wide">
        <span className="tile__label">How to read these</span>
        <span className="tile__sub tile__sub--body">
          Each dial compares the month so far against where it should be by now, counted in
          <b> working days elapsed</b>, not calendar days. The needle sits in <b>behind</b>, <b>on track</b>
{" "}
          or <b>ahead</b>, and every dial says which in words — the zones sit in the same order on all
          four, so the needle&apos;s position tells you as much as the colour does.
        </span>
      </div>

      <Tile label="Working days left" value={count(m.workingDaysLeft)} sub={`of ${m.workingDaysTotal} this month`} />
      <Tile label="Close rate" value={st.pct(m.closeRate30d, live)} sub={st.sub("last 30 days", live)} />
      <Tile label="Sold today" value={st.plain(m.soldToday, live)} sub={st.sub("value of quotes closed", live)} />
      <Tile label="Invoiced today" value={st.plain(m.revenueToday, live)} sub={st.sub("billed today", live)} />
      <Tile
        label="Quotes out"
        value={st.money(m.estimatesOpenValue, live)}
        sub={st.sub(`${count(m.estimatesOpenCount)} open`, live)}
      />
      <Tile
        label="Overdue"
        value={money(m.overdueTotal)}
        state={m.overdueTotal == null ? "" : m.overdueTotal > 0 ? "critical" : "good"}
        sub={
          m.overdueTotal == null
            ? "xero not connected"
            : m.overdueCount
              ? `${m.overdueCount} invoices`
              : "nothing overdue"
        }
      />
    </>
  );
}

/** The quote funnel: written, still out, closed. */
function QuotesPage({ m, live }: { m: Metrics; live: Live }) {
  // Every figure on this page comes from ServiceTitan estimates. With no
  // connection the page is not "zero quotes", it is "we cannot see your quotes" —
  // so it says that once, plainly, instead of printing nine confident noughts.
  if (!live.st) {
    return (
      <div className="tile screen__notice">
        <span className="tile__label">Quotes</span>
        <span className="tile__value">—</span>
        <span className="tile__sub tile__sub--body">
          ServiceTitan isn&apos;t connected yet, so the board can&apos;t see quotes written, quotes
          still out, or quotes closed. These are not zero — they are unknown. The figures appear as
          soon as the tenant authorises the app.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="tile tile--wide">
        <span className="tile__label">Quotes written today</span>
        <span className="tile__value tile__value--hero">{plain(m.quotesCreatedTodayValue)}</span>
        <div className="hero__row">
          <span className="hero__stat">
            <b>{count(m.quotesCreatedTodayCount)}</b>
            <span>quotes today</span>
          </span>
          <span className="hero__stat">
            <b>
              {money(m.quotesCreatedWeekValue)} · {count(m.quotesCreatedWeekCount)}
            </b>
            <span>this week</span>
          </span>
          <span className="hero__stat">
            <b>
              {money(m.quotesCreatedMonthValue)} · {count(m.quotesCreatedMonthCount)}
            </b>
            <span>this month</span>
          </span>
        </div>
      </div>

      <div className="tile tile--wide">
        <span className="tile__label">Still out there</span>
        <span className="tile__value tile__value--hero">{money(m.estimatesOpenValue)}</span>
        <div className="hero__row">
          <span className="hero__stat">
            <b>{count(m.estimatesOpenCount)}</b>
            <span>quotes open</span>
          </span>
          <span className="hero__stat">
            <b>{money(m.soldMtd)}</b>
            <span>closed this month</span>
          </span>
          <span className="hero__stat">
            <b>{m.closeRate30d == null ? "—" : `${Math.round(m.closeRate30d * 100)}%`}</b>
            <span>close rate, 30 days</span>
          </span>
        </div>
      </div>

      <Tile label="Written this week" value={money(m.quotesCreatedWeekValue)} sub={`${count(m.quotesCreatedWeekCount)} quotes`} />
      <Tile label="Written this month" value={money(m.quotesCreatedMonthValue)} sub={`${count(m.quotesCreatedMonthCount)} quotes`} />
      <Tile label="Sold this month" value={money(m.soldMtd)} sub="value of quotes closed" />
      <Tile label="Sold today" value={plain(m.soldToday)} sub="value of quotes closed" />

      <div className="tile tile--wide">
        <span className="tile__label">Why both halves matter</span>
        <span className="tile__sub tile__sub--body">
          A thin pipeline means something different at each end. Little <b>written</b> is a lead or
          quoting problem; plenty written and little <b>closed</b> is a follow-up problem. Outstanding
          value on its own can&apos;t tell you which.
        </span>
      </div>
    </>
  );
}

/** Per person: calls, what they closed, and how far to the next commission tier. */
function TeamPage({ m, live }: { m: Metrics; live: Live }) {
  const maxSold = Math.max(1, ...m.salesLeaderboard.map((s) => s.sold));
  const maxCalls = Math.max(1, ...m.callsByPerson.map((c) => c.month));

  return (
    <>
      <div className="tile tile--wide tile--tall">
        <span className="tile__label">Sold this month</span>
        {m.salesLeaderboard.length === 0 ? (
          <span className="tile__sub tile__sub--body">
            {live.st
              ? "No sold quotes recorded this month"
              : "ServiceTitan isn't connected, so the board can't see who has sold what."}
          </span>
        ) : (
          <div className="bars bars--money bars--lg">
            {m.salesLeaderboard.map((s, i) => (
              <div className="bars__row" key={s.name}>
                <span className="bars__name">
                  <span className="bars__rank">{i + 1}. </span>
                  {s.name}
                </span>
                <span className="bars__track">
                  <span className="bars__fill" style={{ display: "block", width: `${(s.sold / maxSold) * 100}%` }} />
                </span>
                <span className="bars__count">{money(s.sold)}</span>
              </div>
            ))}
          </div>
        )}
        <span className="tile__sub">
          {m.salesLeaderboard[0]?.toNextTier
            ? `Leader is ${money(m.salesLeaderboard[0].toNextTier)} from the next tier`
            : "by value of quotes closed"}
        </span>
      </div>

      <div className="tile tile--wide tile--tall">
        <span className="tile__label">Calls this month</span>
        {m.callsByPerson.length === 0 ? (
          <span className="tile__sub tile__sub--body">
            Not connected. Call counts need ServiceTitan&apos;s <b>Telecom</b> scope, which has to be added
            to the app and re-authorised by the tenant — everything else on this page works without it.
          </span>
        ) : (
          <div className="bars bars--money bars--lg">
            {m.callsByPerson.map((c) => (
              <div className="bars__row" key={c.name}>
                <span className="bars__name">{c.name}</span>
                <span className="bars__track">
                  <span className="bars__fill" style={{ display: "block", width: `${(c.month / maxCalls) * 100}%` }} />
                </span>
                <span className="bars__count">{c.month}</span>
              </div>
            ))}
          </div>
        )}
        {m.callsByPerson.length > 0 && (
          <span className="tile__sub">
            today {m.callsByPerson.reduce((s, c) => s + c.today, 0)} · this week{" "}
            {m.callsByPerson.reduce((s, c) => s + c.week, 0)}
          </span>
        )}
      </div>

      <Tile
        label="Quotes out"
        value={st.money(m.estimatesOpenValue, live)}
        sub={st.sub(`${count(m.estimatesOpenCount)} open`, live)}
      />
      <Tile label="Sold this month" value={st.money(m.soldMtd, live)} sub={st.sub("whole team", live)} />
      <Tile label="Jobs completed" value={st.count(m.jobsCompletedWeek, live)} sub={st.sub("this week", live)} />
      <Tile label="Close rate" value={st.pct(m.closeRate30d, live)} sub={st.sub("quotes written, last 30 days", live)} />
    </>
  );
}

function PerformancePage({ m, live }: { m: Metrics; live: Live }) {
  const jobTypeValue = (t: Metrics["topJobTypes"][number]) =>
    m.jobTypeBasis === "profit" ? (t.profit ?? 0) : t.revenue;
  const maxType = Math.max(1, ...m.topJobTypes.map(jobTypeValue));
  const maxSuburb = Math.max(1, ...m.topSuburbs.map((s) => s.count));

  return (
    <>
      <div className="tile tile--wide tile--tall">
        <span className="tile__label">
          Top job types · {m.jobTypeBasis === "profit" ? "gross profit" : "revenue"}
        </span>
        {m.topJobTypes.length === 0 ? (
          <span className="tile__sub tile__sub--body">
            {live.st
              ? "No invoiced work in the last 90 days"
              : "ServiceTitan isn't connected, so there is no invoiced work to rank."}
          </span>
        ) : (
          <div className="bars bars--money bars--lg">
            {m.topJobTypes.map((t) => (
              <div className="bars__row" key={t.jobType}>
                <span className="bars__name">{t.jobType}</span>
                <span className="bars__track">
                  <span className="bars__fill" style={{ display: "block", width: `${(jobTypeValue(t) / maxType) * 100}%` }} />
                </span>
                <span className="bars__count">{money(jobTypeValue(t))}</span>
              </div>
            ))}
          </div>
        )}
        <span className="tile__sub">
          last 90 days
          {m.jobTypeBasis === "revenue" ? " · no cost data from ServiceTitan, ranked by revenue" : ""}
        </span>
      </div>

      <div className="tile tile--wide tile--tall">
        <span className="tile__label">Top suburbs · last 30 days</span>
        {m.topSuburbs.length === 0 ? (
          <span className="tile__sub">No leads recorded yet</span>
        ) : (
          <div className="bars bars--lg bars--wide-names">
            {m.topSuburbs.map((s) => (
              <div className="bars__row" key={s.suburb}>
                <span className="bars__name">{s.suburb}</span>
                <span className="bars__track">
                  <span className="bars__fill" style={{ display: "block", width: `${(s.count / maxSuburb) * 100}%` }} />
                </span>
                <span className="bars__count">{s.count}</span>
              </div>
            ))}
          </div>
        )}
        <span className="tile__sub">from the postcode on each lead</span>
      </div>

      <Tile
        label="Revenue this month"
        value={st.money(m.revenueInvoicedMtd, live)}
        sub={st.sub(m.revenueTargetMonthly ? `of ${money(m.revenueTargetMonthly)}` : "no target set", live)}
      />
      <Tile
        label="Gross profit"
        value={st.money(m.profitMtd, live)}
        sub={st.sub(`cost on ${Math.round(m.profitCoverage * 100)}% of invoices`, live)}
      />
      <Tile label="Receivables" value={money(m.receivablesTotal)} sub="owed to us" />
      <Tile
        label="Overdue"
        value={money(m.overdueTotal)}
        state={m.overdueTotal == null ? "" : m.overdueTotal > 0 ? "critical" : "good"}
        sub={
          m.overdueTotal == null
            ? "xero not connected"
            : m.overdueCount
              ? `${m.overdueCount} invoices`
              : "nothing overdue"
        }
      />
    </>
  );
}

/**
 * One of the two daily numbers.
 *
 * Both are rendered by the same component on purpose: identical shape is what
 * tells the room these are two measures of the same thing rather than one
 * headline and a footnote. A missing target blanks the figure and says so
 * instead of falling back to a number nobody agreed to.
 */
function HeroTile({
  label,
  daily,
  today,
  todayLabel,
  mtd,
  target,
  pacePct,
  aheadBehind,
  daysLeft,
  noTarget,
}: {
  label: string;
  daily: number | null;
  /** null when the source isn't connected — unknown, not zero. */
  today: number | null;
  todayLabel: string;
  mtd: number;
  target: number | null;
  pacePct: number | null;
  aheadBehind: number | null;
  daysLeft: number;
  noTarget: string;
}) {
  const paceState =
    pacePct == null ? "" : pacePct >= 1 ? "good" : pacePct >= 0.85 ? "warning" : "critical";
  const behind = aheadBehind != null && aheadBehind < 0;

  return (
    <div className="tile tile--wide">
      <span className="tile__label">
        {label} · {daysLeft} working {daysLeft === 1 ? "day" : "days"} left
      </span>

      <span className="tile__value tile__value--hero">
        {daily == null ? "—" : exact(daily)}
        {daily != null && <span className="hero__unit">/ day</span>}
      </span>

      <div className="meter">
        <div
          className={`meter__fill ${paceState ? `meter__fill--${paceState}` : ""}`}
          style={{ width: `${Math.min(100, (pacePct ?? 0) * 100)}%` }}
        />
      </div>

      <div className="hero__row">
        <span className="hero__stat">
          <b>{plain(today)}</b>
          <span>{todayLabel}</span>
        </span>
        {target == null ? (
          <span className="hero__stat">
            <b className="hero__stat--muted">{noTarget}</b>
            <span>the daily number needs one</span>
          </span>
        ) : (
          <>
            <span className="hero__stat">
              <b>
                {money(mtd)} of {money(target)}
              </b>
              <span>this month</span>
            </span>
            <span className="hero__stat">
              <b className={behind ? "tile__delta--bad" : "tile__delta--good"}>{signed(aheadBehind)}</b>
              <span>{behind ? "behind pace" : "ahead of pace"}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  delta,
  deltaGood,
  state,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaGood?: boolean;
  state?: string;
}) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className={`tile__value ${state ? `tile__value--${state}` : ""}`}>{value}</span>
      {delta ? (
        <span className={`tile__delta ${deltaGood ? "tile__delta--good" : "tile__delta--bad"}`}>{delta}</span>
      ) : (
        <span className="tile__sub">{sub ?? ""}</span>
      )}
    </div>
  );
}

function dotClass(state: SourceState) {
  if (state === "ok") return "";
  if (state === "stale") return "screen__dot--stale";
  if (state === "error") return "screen__dot--error";
  return "screen__dot--off";
}

function relative(iso: string, now: Date) {
  const mins = Math.round((now.getTime() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins)) return "—";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
