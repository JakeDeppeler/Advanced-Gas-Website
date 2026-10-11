import Link from "next/link";
import type { Metrics } from "@/lib/dashboard/metrics";
import type { ProfitLoss } from "@/lib/portal/xero";
import type { YearGoal } from "@/lib/portal/yearGoal";
import type { NavBand, NavItem } from "@/lib/portal/nav";
import { BAND_BLURB, BAND_LABEL, ICON, byBand } from "@/lib/portal/nav";
import type { NeedLine } from "@/lib/portal/needs";
import { money } from "@/lib/portal/format";

type Status = "good" | "mid" | "bad";
const WORD: Record<Status, string> = { good: "On track", mid: "Close", bad: "Behind" };

type Check = { name: string; status: Status | null; word: string; figure: string; bar: number | null; line: string; means: string; href: string };

const n0 = (n: number) => Math.round(n).toLocaleString("en-AU");
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const fromVerdict = (v: string | null | undefined): Status | null => (v === "ahead" || v === "on" ? "good" : v === "behind" ? "bad" : null);

const SECTION_ICON: Partial<Record<NavBand, string>> = {
  run: ICON.chart, profit: ICON.trend, board: ICON.screen, customers: ICON.chat, marketing: ICON.speaker,
  crew: ICON.truck, "how-we-work": ICON.book, settings: ICON.user,
};

/**
 * Home in the neutral look — the way in. How the month is going in a
 * sentence and four checks, what needs someone today, then a tile for every
 * section. Every figure is one the rest of the portal already shows, read
 * from the same snapshot and Xero, so Home can't tell a different story.
 */
export function NeutralHome({ first, today, m, profitMonth, goal, pipe, lines, items, computedAt }: {
  first: string;
  today: string;
  m: Metrics | null;
  profitMonth: ProfitLoss | null;
  goal: YearGoal | null;
  pipe: { due: number; late: number; openCount: number; openValue: number } | null;
  lines: NeedLine[];
  items: NavItem[];
  computedAt: string | null;
}) {
  const mon = new Date().toLocaleDateString("en-AU", { month: "long", timeZone: "Australia/Melbourne" });
  const st = m?.pace?.standing.month ?? null;
  const mo = m?.paceData?.periods.month ?? null;

  // Selling: what customers said yes to, against where the goal says we should be.
  const sold = st?.sold ?? null;
  const selling: Check = {
    name: "Selling", href: "/portal/pipeline",
    status: fromVerdict(sold?.verdict) === "bad" && sold?.byNow && sold.done != null && sold.done / sold.byNow >= 0.85 ? "mid" : fromVerdict(sold?.verdict),
    word: "", figure: mo?.soldValue != null ? money(mo.soldValue) : "—",
    bar: sold?.byNow ? clamp((sold.done ?? 0) / sold.byNow) : null,
    line: sold?.byNow != null ? `${n0(sold.done ?? 0)} jobs sold · goal by now ${n0(sold.byNow)}` : "sold this month · no goal set",
    means: "Work customers said yes to.",
  };
  // Doing the work: jobs finished, against the goal's pace.
  const done = st?.completed ?? null;
  const work: Check = {
    name: "Doing the work", href: "/portal/hours",
    status: fromVerdict(done?.verdict) === "bad" && done?.byNow && done.done != null && done.done / done.byNow >= 0.85 ? "mid" : fromVerdict(done?.verdict),
    word: "", figure: done?.done != null ? `${n0(done.done)} jobs` : mo?.completed != null ? `${n0(mo.completed)} jobs` : "—",
    bar: done?.byNow ? clamp((done.done ?? 0) / done.byNow) : null,
    line: done?.byNow != null ? `done this month · goal by now ${n0(done.byNow)}` : "done this month",
    means: "Jobs finished and closed off in ServiceTitan.",
  };
  // Getting paid: what's past its due date in Xero.
  const overdue = m?.overdueTotal ?? null;
  const oldest = m?.overdueList?.[0]?.days ?? null;
  const paid: Check = {
    name: "Getting paid", href: "/portal/money",
    status: overdue == null ? null : overdue <= 0 ? "good" : (oldest ?? 0) > 30 ? "bad" : "mid",
    word: "", figure: overdue != null ? money(overdue) : "—",
    bar: overdue != null && m?.receivablesTotal ? clamp(1 - overdue / m.receivablesTotal) : null,
    line: overdue != null ? `overdue · ${m?.overdueCount ?? 0} ${(m?.overdueCount ?? 0) === 1 ? "invoice" : "invoices"}${oldest ? ` · oldest ${oldest} days` : ""}` : "needs Xero connected",
    means: "Money we've earned but haven't got yet. Ring the oldest first.",
  };
  // Making money: Xero's net profit for the month, against the goal's margin.
  const margin = profitMonth && profitMonth.income > 0 ? profitMonth.netProfit / profitMonth.income : null;
  const goalPct = goal?.profitPct ?? null;
  const making: Check = {
    name: "Making money", href: "/portal/finance",
    status: margin == null ? null : margin < 0 ? "bad" : goalPct && margin * 100 >= goalPct ? "good" : "mid",
    word: "", figure: profitMonth ? money(profitMonth.netProfit) : "—",
    bar: margin != null && goalPct ? clamp((margin * 100) / goalPct) : null,
    line: margin != null ? `profit so far · ${Math.round(margin * 100)}% of income${goalPct ? ` · goal ${goalPct}%` : ""}` : "needs Xero connected",
    means: "What's left after every bill and wage.",
  };
  const checks = [selling, work, paid, making].map((c) => ({
    ...c,
    word: c.status == null ? (c === paid || c === making ? "No figures yet" : "No goal yet") : c === paid ? (c.status === "good" ? "On top of it" : c.status === "mid" ? "Watch it" : "Overdue") : c === making ? (c.status === "good" ? "On track" : c.status === "mid" ? "Under goal" : "Losing money") : WORD[c.status],
  }));

  // The sentence: lead with the answer, then the one thing to fix.
  const goods = checks.filter((c) => c.status === "good");
  const bads = checks.filter((c) => c.status === "bad");
  const mids = checks.filter((c) => c.status === "mid");
  const overall = bads.length >= 2 ? "is behind" : bads.length === 1 || mids.length >= 2 ? "is close" : "is going well";
  const worst = bads[0] ?? mids[0] ?? null;
  // Each check's trouble in words a person would say, not its status label.
  // Matched on the name: `checks` holds copies, so the originals never compare equal.
  const trouble = (c: Check): string =>
    c.name === paid.name ? `${paid.figure} is overdue`
      : c.name === making.name ? (c.status === "bad" ? `we're losing money, ${making.figure} so far` : `profit is under the goal at ${making.figure}`)
        : c.name === selling.name ? (c.status === "bad" ? "selling is behind" : "selling is a little short")
          : c.status === "bad" ? "jobs done are behind" : "jobs done are a little short";
  const praise = (c: Check): string =>
    c.name === paid.name ? "Nothing's overdue" : c.name === making.name ? `We're making ${making.figure}, on goal` : c.name === selling.name ? "Selling is on track" : "The vans are getting through the work";
  const worstText = worst ? trouble(worst) : null;
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const best = goods[0] ?? null;

  const needs: Array<{ n: number; what: string; sub: string; href: string; where: string }> = [];
  if (pipe) needs.push({ n: pipe.due, what: pipe.due === 1 ? "quote to follow up" : "quotes to follow up", sub: `${money(pipe.openValue)} out${pipe.late ? ` · ${pipe.late} late` : ""}`, href: "/portal/pipeline", where: "Run the company › Quote pipeline" });
  if (m) needs.push({ n: m.overdueCount ?? 0, what: (m.overdueCount ?? 0) === 1 ? "invoice overdue" : "invoices overdue", sub: overdue ? `${money(overdue)}${oldest ? ` · oldest ${oldest} days` : ""}` : "nothing overdue", href: "/portal/money", where: "Run the company › Money in" });
  if (m) needs.push({ n: m.toBillCount ?? 0, what: "jobs done, not billed", sub: m.toBillValue ? `${money(m.toBillValue)} we can put a price on${m.toBillOldestDays ? ` · oldest ${m.toBillOldestDays} days` : ""}` : m.toBillOldestDays ? `oldest ${m.toBillOldestDays} days` : "all billed", href: "/portal/not-billed", where: "Run the company › Not billed" });
  const jp = m?.jobProfitRecent ?? null;
  if (jp) needs.push({ n: jp.losing, what: jp.losing === 1 ? "job lost money" : "jobs lost money", sub: "in the last 30 days, once parts and hours are costed", href: "/portal/profit", where: "Profit & finance › Profit on every job" });

  const needByBand = new Map<NavBand, number>();
  for (const l of lines) if (l.band) needByBand.set(l.band, (needByBand.get(l.band) ?? 0) + 1);
  const statusLine = (band: NavBand): { tone: Status | null; text: string } => {
    if (band === "run" && mo?.soldValue != null) return { tone: selling.status, text: `Sold ${mon} so far ${money(mo.soldValue)}` };
    if (band === "profit" && profitMonth) return { tone: making.status, text: `Net profit ${money(profitMonth.netProfit)} this month` };
    if (band === "marketing" && m) return { tone: m.leadsWeek >= m.leadsPrevWeek ? "good" : "mid", text: `${m.leadsWeek} website leads this week · ${m.leadsPrevWeek} last week` };
    const n = needByBand.get(band) ?? 0;
    return n ? { tone: "bad", text: `${n} ${n === 1 ? "thing needs" : "things need"} someone` } : { tone: null, text: "Nothing waiting" };
  };
  const bands: NavBand[] = ["run", "profit", "board", "customers", "marketing", "crew", "how-we-work", "settings"];

  return (
    <div className="nh">
      <div>
        <h1 className="nh__title">G&rsquo;day {first}.</h1>
        <div className="nh__date">{today}</div>
      </div>

      <section className="nh__card nh__going" aria-labelledby="nh-going">
        <div className="nh__goinghead">
          <h2 id="nh-going" className="nh__lh">How we&rsquo;re going · {mon} so far</h2>
          <span className="nh__src">against the year goal · ServiceTitan · Xero{computedAt ? ` · ${new Date(computedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" })}` : ""}</span>
        </div>
        <p className="nh__say">
          {/* Nothing measured, nothing claimed: "going well" over four blanks
              would be the board inventing a verdict. */}
          {!goods.length && !bads.length && !mids.length ? <>The figures for {mon} aren&rsquo;t in yet, so there&rsquo;s nothing to say about it.</> : <>{mon} {overall}.{" "}</>}
          {(goods.length + bads.length + mids.length > 0) && best && <><b>{praise(best)}</b>{worstText ? ", but " : "."}</>}
          {(goods.length + bads.length + mids.length > 0) && worstText && <span className={worst?.status === "bad" ? "nh__bad" : undefined}>{best ? worstText : cap(worstText)}</span>}
          {(goods.length + bads.length + mids.length > 0) && worstText && "."}
        </p>
        <div className="nh__checks">
          {checks.map((c) => (
            <Link key={c.name} href={c.href} className="nh__check">
              <div className="nh__ctop">
                <span className="nh__cname">{c.name}</span>
                <span className={`nh__st is-${c.status ?? "none"}`}><i aria-hidden="true" />{c.word}</span>
              </div>
              <div className="nh__fig">{c.figure}</div>
              <div className="nh__bar" aria-hidden="true"><i className={`is-${c.status ?? "none"}`} style={{ width: `${(c.bar ?? 0) * 100}%` }} /></div>
              <div className="nh__ks">{c.line}</div>
              <div className="nh__means">{c.means}</div>
            </Link>
          ))}
        </div>
      </section>

      {needs.length > 0 && (
        <section aria-labelledby="nh-needs">
          <h2 id="nh-needs" className="nh__lh nh__lh--out">Needs someone today</h2>
          <div className="nh__needs">
            {needs.map((x) => (
              <Link key={x.what} href={x.href} className="nh__card nh__need">
                <div className="nh__needtop"><span className={`nh__needn${x.n ? " is-bad" : ""}`}>{x.n}</span><b>{x.what}</b></div>
                <div className="nh__ks">{x.sub}</div>
                <div className="nh__where">{x.where} ›</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="nh-go">
        <h2 id="nh-go" className="nh__lh nh__lh--out">Go to</h2>
        <div className="nh__go">
          {bands.map((band) => {
            const pages = byBand(items, band);
            if (!pages.length) return null;
            const s = statusLine(band);
            return (
              <div key={band} className="nh__card nh__sec">
                <Link href={`/portal/section/${band}`} className="nh__sechead">
                  <span className="nh__ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={SECTION_ICON[band] ?? ICON.grid} /></svg>
                  </span>
                  <b>{BAND_LABEL[band]}</b>
                  <span className="nh__chev" aria-hidden="true">›</span>
                </Link>
                <div className="nh__blurb">{BAND_BLURB[band]}</div>
                <div className={`nh__status is-${s.tone ?? "none"}`}><i aria-hidden="true" />{s.text}</div>
                <div className="nh__chips">
                  {pages.slice(0, 4).map((p) => <Link key={p.href} href={p.href} className="nh__chip">{p.short ?? p.label}</Link>)}
                  {pages.length > 4 && <Link href={`/portal/section/${band}`} className="nh__chip">+{pages.length - 4}</Link>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
