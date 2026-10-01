"use client";

import { useEffect, useState } from "react";
import type { Metrics, SourceState } from "@/lib/metrics";

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
const PAGES = ["Today", "Performance"] as const;

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

function duration(mins: number | null) {
  if (mins == null) return "—";
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function ScreenBoard({ initial, token }: { initial: Snapshot; token: string }) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => new Date());
  const [page, setPage] = useState(0);

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
        if (!cancelled) setSnap(next);
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

  return (
    <div className="screen">
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

      <div className="screen__grid">{page === 0 ? <TodayPage m={m} /> : <PerformancePage m={m} />}</div>
    </div>
  );
}

function TodayPage({ m }: { m: Metrics }) {
  const responseState =
    m.avgFirstResponseMins == null
      ? ""
      : m.avgFirstResponseMins <= 15
        ? "good"
        : m.avgFirstResponseMins <= 60
          ? "warning"
          : "critical";

  const leadDelta = m.leadsWeek - m.leadsPrevWeek;

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
        today={m.soldToday}
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
        today={m.revenueToday}
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

      <Tile
        label="Leads not yet called"
        value={count(m.uncontactedLeads)}
        state={m.uncontactedLeads === 0 ? "good" : m.uncontactedLeads <= 3 ? "warning" : "critical"}
        sub="last 30 days"
      />

      <Tile label="Avg time to first call" value={duration(m.avgFirstResponseMins)} state={responseState} sub="last 30 days" />

      <Tile label="Jobs completed" value={count(m.jobsCompletedWeek)} sub="this week" />

      <Tile label="Booked" value={count(m.jobsScheduledNext7)} sub="next 7 days" />

      <Tile label="Quotes out" value={money(m.estimatesOpenValue)} sub={`${count(m.estimatesOpenCount)} open`} />

      <Tile
        label="Overdue"
        value={money(m.overdueTotal)}
        state={(m.overdueTotal ?? 0) > 0 ? "critical" : "good"}
        sub={m.overdueCount ? `${m.overdueCount} invoices` : "nothing overdue"}
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
  today: number;
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

function PerformancePage({ m }: { m: Metrics }) {
  const maxSold = Math.max(1, ...m.salesLeaderboard.map((s) => s.sold));
  const jobTypeValue = (t: Metrics["topJobTypes"][number]) =>
    m.jobTypeBasis === "profit" ? (t.profit ?? 0) : t.revenue;
  const maxType = Math.max(1, ...m.topJobTypes.map(jobTypeValue));
  const maxSuburb = Math.max(1, ...m.topSuburbs.map((s) => s.count));

  return (
    <>
      <div className="tile tile--wide tile--tall">
        <span className="tile__label">Sold this month</span>
        {m.salesLeaderboard.length === 0 ? (
          <span className="tile__sub">No sold quotes recorded this month</span>
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
        <span className="tile__sub">by value of quotes closed</span>
      </div>

      <div className="tile tile--wide tile--tall">
        <span className="tile__label">
          Top job types · {m.jobTypeBasis === "profit" ? "gross profit" : "revenue"}
        </span>
        {m.topJobTypes.length === 0 ? (
          <span className="tile__sub">No invoiced work in the last 90 days</span>
        ) : (
          <div className="bars bars--money bars--lg">
            {m.topJobTypes.map((t) => (
              <div className="bars__row" key={t.jobType}>
                <span className="bars__name">{t.jobType}</span>
                <span className="bars__track">
                  <span
                    className="bars__fill"
                    style={{ display: "block", width: `${(jobTypeValue(t) / maxType) * 100}%` }}
                  />
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

      <div className="tile tile--wide">
        <span className="tile__label">Top suburbs · last 30 days</span>
        {m.topSuburbs.length === 0 ? (
          <span className="tile__sub">No leads recorded yet</span>
        ) : (
          <div className="bars">
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
      </div>

      <Tile label="Quotes out" value={money(m.estimatesOpenValue)} sub={`${count(m.estimatesOpenCount)} open`} />

      <Tile
        label="Close rate"
        value={m.closeRate30d == null ? "—" : `${Math.round(m.closeRate30d * 100)}%`}
        sub="quotes written, last 30 days"
      />
    </>
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
