import Link from "next/link";
import type { Overview as Data } from "@/lib/portal/home/overview";
import { CountUp } from "./CountUp";

/**
 * Home's overview, after the Rapport dashboard: three headline figures, sold
 * each month against the goal, the quotes most worth a call, the year as a
 * ring, and where the open quotes sit — built around our work, in our words.
 *
 * Everything is drawn on the server and is complete as it lands; the motion
 * (cards rising in turn, the line drawing, the ring sweeping, bars growing,
 * figures counting) is CSS and one small counter, and all of it stops for
 * anyone who has asked their computer for less motion.
 */

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const short = (n: number) => (n >= 1e6 ? `$${(Math.round(n / 1e5) / 10).toLocaleString("en-AU")}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });

/** A smooth line through the points: Catmull-Rom turned into cubic Béziers. */
function smooth(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function niceMax(v: number): number {
  if (v <= 0) return 100_000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function Icon({ d }: { d: string }) {
  return (
    <span className="rp-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
}

export function Overview({ ov, first, when, closeRate, yearInvoiced, yearGoal, yearFloor, daysLeft, span }: {
  ov: Data; first: string; when: string; closeRate: number | null;
  yearInvoiced: number | null; yearGoal: number | null; yearFloor: number | null; daysLeft: number | null; span: 6 | 12;
}) {
  const vsLast = ov.lastToDate > 0 ? (ov.mtd - ov.lastToDate) / ov.lastToDate : null;

  // The chart: one scale for the line, the goal and the labels.
  const W = 720, H = 250, L = 52, R = 14, T = 16, B = 30;
  const top = niceMax(Math.max(...ov.months.map((m) => Math.max(m.sold, m.goal ?? 0)), 1) * 1.08);
  const x = (i: number) => L + (ov.months.length > 1 ? (i * (W - L - R)) / (ov.months.length - 1) : 0);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const pts = ov.months.map((m, i) => [x(i), y(m.sold)] as [number, number]);
  const line = smooth(pts);
  const area = line ? `${line} L${x(ov.months.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  const goalPts = ov.months.map((m, i) => (m.goal != null ? [x(i), y(m.goal)] as [number, number] : null)).filter(Boolean) as Array<[number, number]>;
  const goalLine = goalPts.length ? `M${goalPts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")}` : "";
  // The floor under the goal ($2.5M under $3.2M), the same months scaled down, as its own line.
  const floorRatio = yearFloor && yearGoal ? yearFloor / yearGoal : null;
  const floorLine = floorRatio && goalPts.length
    ? `M${ov.months.map((m, i) => (m.goal != null ? `${x(i).toFixed(1)},${y(m.goal * floorRatio).toFixed(1)}` : null)).filter(Boolean).join(" L")}`
    : "";
  const total = ov.months.reduce((a, m) => a + m.sold, 0);
  const done = ov.months.filter((m) => !m.current && m.goal != null);
  const hit = done.filter((m) => m.sold >= (m.goal as number)).length;
  const ticks = [0, top / 2, top];

  // The year ring.
  const yr = yearInvoiced != null && yearGoal ? Math.min(1, yearInvoiced / yearGoal) : null;
  const floorAt = yearFloor && yearGoal ? yearFloor / yearGoal : null;
  const RR = 74;

  const stTotal = ov.stages.filter((s) => s.k !== "won").reduce((a, s) => a + s.value, 0);
  const mixAll = ov.stages.reduce((a, s) => a + s.value, 0) || 1;

  return (
    <div className="rp">
      <header className="rp-top rp-card" style={{ ["--i" as string]: 0 }}>
        <div className="rp-title">
          <span className="rp-hi">G&rsquo;day {first} · {when}</span>
          <h1>Sales<br />overview</h1>
        </div>
        <div className="rp-kpis">
          <Link href="/portal/sales" className="rp-kpi">
            <Icon d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3" />
            <span><b><CountUp value={ov.mtd} /></b>{vsLast != null && <em className={`rp-badge ${vsLast >= 0 ? "up" : "down"}`}>{vsLast >= 0 ? "+" : "−"}{Math.abs(Math.round(vsLast * 100))}% vs last month</em>}<small>Sold this month</small></span>
          </Link>
          <Link href="/portal/pipeline" className="rp-kpi">
            <Icon d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            <span><b><CountUp value={ov.open.value} /></b><small>{ov.open.count} quotes out</small></span>
          </Link>
          <Link href="/portal/sales" className="rp-kpi">
            <Icon d="M12 3a9 9 0 1 0 9 9h-9V3ZM15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" />
            <span><b>{closeRate != null ? <CountUp value={closeRate * 100} kind="pct" /> : ""}</b><small>Close rate, last 30 days</small></span>
          </Link>
        </div>
      </header>

      <div className="rp-grid">
        <section className="rp-panel rp-sold rp-card" style={{ ["--i" as string]: 1 }} aria-labelledby="rp-sold-h">
          <div className="rp-panel-h">
            <b id="rp-sold-h">Sold</b>
            <span className="rp-tools">
              <span className="rp-seg" role="group" aria-label="How far back">
                <Link href="/portal?r=6" className={span === 6 ? "on" : undefined} aria-current={span === 6 ? "page" : undefined}>6M</Link>
                <Link href="/portal" className={span === 12 ? "on" : undefined} aria-current={span === 12 ? "page" : undefined}>12M</Link>
              </span>
              <Link href="/portal/sales" className="rp-round" aria-label="Open Sales">↗</Link>
            </span>
          </div>
          <div className="rp-big"><CountUp value={total} /><span>sold in {span} months · <b>{hit}</b> of {done.length} months at goal</span></div>
          <div className="rp-legend"><span><i className="dot" />Sold</span><span><i className="dash" />{yearGoal ? `${short(yearGoal)} goal` : "Month’s goal"}</span>{floorLine && yearFloor ? <span><i className="dash floor" />{short(yearFloor)} floor</span> : null}</div>
          <svg className="rp-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sold each month for ${span} months against the month's goal`}>
            <defs>
              <linearGradient id="rp-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--rp-accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--rp-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="rp-gridline" />
                <text x={L - 8} y={y(t) + 4} className="rp-axis" textAnchor="end">{short(t)}</text>
              </g>
            ))}
            {area && <path d={area} fill="url(#rp-fill)" className="rp-area" />}
            {floorLine && <path d={floorLine} className="rp-goal rp-floor" pathLength={1} />}
            {goalLine && <path d={goalLine} className="rp-goal" pathLength={1} />}
            {line && <path d={line} className="rp-line" pathLength={1} />}
            {ov.months.map((m, i) => (
              <g key={m.key} className="rp-col">
                <rect x={x(i) - (W - L - R) / (ov.months.length - 1 || 1) / 2} y={T} width={(W - L - R) / (ov.months.length - 1 || 1)} height={H - T - B} fill="transparent" />
                <circle cx={x(i)} cy={y(m.sold)} r={4.5} className="rp-pt" />
                <g className="rp-tip">
                  {(() => {
                    // Small and inside the chart: the month, what sold, and both goals for it.
                    const tw = 150, th = floorRatio && m.goal != null ? 50 : 38;
                    const tx = Math.min(W - R - tw, Math.max(L, x(i) - tw / 2)), ty = Math.max(T, y(m.sold) - th - 12);
                    return (
                      <>
                        <rect x={tx} y={ty} width={tw} height={th} rx={8} />
                        <text x={tx + 10} y={ty + 15}>{m.label} · {money(m.sold)}</text>
                        <text x={tx + 10} y={ty + 28} className="sub">{m.goal != null ? `${yearGoal ? `${short(yearGoal)} ` : ""}goal ${money(m.goal)}` : "no goal"}</text>
                        {floorRatio && m.goal != null && yearFloor ? <text x={tx + 10} y={ty + 41} className="sub">{short(yearFloor)} floor {money(m.goal * floorRatio)}</text> : null}
                      </>
                    );
                  })()}
                </g>
                <text x={x(i)} y={H - 8} className="rp-axis" textAnchor="middle">{m.label}</text>
              </g>
            ))}
          </svg>
        </section>

        <section className="rp-panel rp-hot rp-card" style={{ ["--i" as string]: 2 }} aria-labelledby="rp-hot-h">
          <div className="rp-panel-h">
            <span className="rp-hh"><b id="rp-hot-h">Quotes to chase</b><span className="rp-note">newest first</span></span>
            <Link href="/portal/pipeline" className="rp-round" aria-label="Open Quotes">↗</Link>
          </div>
          {ov.hot.length ? (
            <div className="rp-tiles">
              {ov.hot.map((h, k) => (
                <Link key={h.key} href="/portal/pipeline" className={`rp-tile${h.stage === "due" ? " due" : ""}`} style={{ ["--i" as string]: 3 + k }}>
                  <span className="rp-tile-h">
                    <span>{h.stage === "due" ? (h.nextOn && h.nextOn < new Date().toISOString().slice(0, 10) ? `Call was due ${day(h.nextOn)}` : "Call today") : h.nextOn ? `Next call ${day(h.nextOn)}` : `Quoted ${day(h.quotedOn)}`}</span>
                    <span className="rp-dots" aria-hidden="true">•••</span>
                  </span>
                  {/* Who and where, not what: a quote is often several options, and the office rings a person. */}
                  <span className="rp-tile-t">{h.customer ?? (h.jobNumber ? `Job #${h.jobNumber}` : "A customer")}</span>
                  <span className="rp-tile-c">{[h.suburb, h.jobNumber && h.customer ? `#${h.jobNumber}` : null].filter(Boolean).join(" · ") || "No suburb on the job"}</span>
                  <span className="rp-tile-f">
                    <b>{money(h.value)}</b>
                    <span>{h.options > 1 ? `${h.options} options · ` : ""}{h.quietDays === 0 ? "worked today" : `${h.quietDays} ${h.quietDays === 1 ? "day" : "days"} quiet`}</span>
                    {(h.owner ?? h.quotedBy) && <span className="rp-av" title={h.owner ?? h.quotedBy ?? ""}>{(h.owner ?? h.quotedBy ?? "?").slice(0, 1).toUpperCase()}</span>}
                  </span>
                </Link>
              ))}
            </div>
          ) : <p className="rp-empty">No open quotes in the last 60 days.</p>}
        </section>

        <section className="rp-panel rp-year rp-card" style={{ ["--i" as string]: 3 }} aria-labelledby="rp-year-h">
          <div className="rp-panel-h"><b id="rp-year-h">The year</b><Link href="/portal/finance/goals" className="rp-round" aria-label="Open the year">↗</Link></div>
          {yr != null ? (
            <>
              <div className="rp-ring">
                <svg viewBox="0 0 180 180" aria-hidden="true">
                  <circle cx="90" cy="90" r={RR} className="rp-ring-track" />
                  <circle cx="90" cy="90" r={RR} className="rp-ring-val" pathLength={1} style={{ ["--v" as string]: String(yr) }} transform="rotate(-90 90 90)" />
                  {floorAt != null && (
                    <line x1="90" y1={90 - RR - 9} x2="90" y2={90 - RR + 9} className="rp-ring-mark" transform={`rotate(${floorAt * 360} 90 90)`} />
                  )}
                </svg>
                <span className="rp-ring-in"><b><CountUp value={yr * 100} kind="pct" /></b><span>of {short(yearGoal as number)}</span></span>
              </div>
              <div className="rp-year-f">
                <span><small>Invoiced</small><b>{short(yearInvoiced as number)}</b></span>
                <span><small>Floor</small><b>{yearFloor ? short(yearFloor) : ""}</b></span>
                <span><small>Days left</small><b>{daysLeft ?? ""}</b></span>
              </div>
            </>
          ) : <p className="rp-empty">Set a year goal and connect Xero to see the year.</p>}
        </section>

        <section className="rp-panel rp-mix rp-card" style={{ ["--i" as string]: 4 }} aria-labelledby="rp-mix-h">
          <div className="rp-panel-h"><b id="rp-mix-h">Quote mix</b><Link href="/portal/pipeline" className="rp-round" aria-label="Open Quotes">↗</Link></div>
          <div className="rp-big sm"><CountUp value={stTotal} /><span>open across {ov.open.count} quotes</span></div>
          <div className="rp-mixbar" aria-hidden="true">
            {ov.stages.filter((s) => s.value > 0).map((s) => <i key={s.k} className={`s-${s.k}`} style={{ flexGrow: s.value }} />)}
          </div>
          <div className="rp-mixrows">
            {ov.stages.map((s) => (
              <div key={s.k} className="rp-mixrow">
                <span><i className={`s-${s.k}`} />{s.label}</span>
                <span>{s.count}</span>
                <span>{short(s.value)}</span>
                <span>{Math.round((s.value / mixAll) * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
