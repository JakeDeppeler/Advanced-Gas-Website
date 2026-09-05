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

const money = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString("en-AU")}`;
};

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

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(clock);
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
  const pace = m.revenuePacePct;
  const paceState = pace == null ? "" : pace >= 1 ? "good" : pace >= 0.85 ? "warning" : "critical";

  const leadDelta = m.leadsWeek - m.leadsPrevWeek;
  const maxSuburb = Math.max(1, ...m.topSuburbs.map((s) => s.count));

  const responseState =
    m.avgFirstResponseMins == null
      ? ""
      : m.avgFirstResponseMins <= 15
        ? "good"
        : m.avgFirstResponseMins <= 60
          ? "warning"
          : "critical";

  const uncontactedState = m.uncontactedLeads === 0 ? "good" : m.uncontactedLeads <= 3 ? "warning" : "critical";

  return (
    <div className="screen">
      <div className="screen__bar">
        <span className="screen__title">Advanced Gas — live</span>
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
        {/* The one hero figure on the board. */}
        <div className="tile tile--wide">
          <span className="tile__label">Invoiced this month</span>
          <span className="tile__value tile__value--hero">{money(m.revenueInvoicedMtd)}</span>
          <div className="meter">
            <div
              className={`meter__fill ${paceState ? `meter__fill--${paceState}` : ""}`}
              style={{ width: `${Math.min(100, ((pace ?? 0) * 100))}%` }}
            />
          </div>
          <span className="tile__sub">
            {m.revenueTargetMonthly
              ? `${money(m.revenueTargetMonthly)} target · ${pace == null ? "—" : `${Math.round(pace * 100)}% of pace`}`
              : "No monthly target set — add revenueTargetMonthly to portal_settings"}
          </span>
        </div>

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
          state={uncontactedState}
          sub="last 30 days"
        />

        <Tile
          label="Avg time to first call"
          value={duration(m.avgFirstResponseMins)}
          state={responseState}
          sub="last 30 days"
        />

        <Tile label="Jobs completed" value={count(m.jobsCompletedWeek)} sub="this week" />

        <Tile label="Booked" value={count(m.jobsScheduledNext7)} sub="next 7 days" />

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
                    <span
                      className="bars__fill"
                      style={{ display: "block", width: `${(s.count / maxSuburb) * 100}%` }}
                    />
                  </span>
                  <span className="bars__count">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tile
          label="Quotes out"
          value={money(m.estimatesOpenValue)}
          sub={`${count(m.estimatesOpenCount)} open · ${
            m.closeRate30d == null ? "—" : `${Math.round(m.closeRate30d * 100)}% close rate`
          }`}
        />

        <Tile
          label="Overdue"
          value={money(m.overdueTotal)}
          state={(m.overdueTotal ?? 0) > 0 ? "critical" : "good"}
          sub={m.overdueCount ? `${m.overdueCount} invoices` : "nothing overdue"}
        />
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
      ) : sub ? (
        <span className="tile__sub">{sub}</span>
      ) : (
        <span className="tile__sub" />
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
