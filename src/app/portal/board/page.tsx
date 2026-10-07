import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Heads } from "@/components/portal/marketingParts";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { latestSnapshot, type Metrics } from "@/lib/dashboard/metrics";
import { money, pct } from "@/lib/portal/format";
import { LiveAge, RefreshEvery } from "@/components/portal/LiveAge";
import { Locked } from "@/components/portal/Locked";
import { currentPairing, prettyCode } from "@/lib/board/pairing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wall board — Team portal" };

const NA = "—";
const m$ = (n: number | null | undefined) => (n == null ? NA : money(n));
const n0 = (n: number | null | undefined) => (n == null ? NA : n.toLocaleString("en-AU"));
const p0 = (n: number | null | undefined) => (n == null ? NA : pct(n));


/** A figure, and the line under it that says what it's against. */
type Fig = { v: string; sub?: string };

/** Against a target, in words — or the plain fact that there is no target. */
function against(value: number | null | undefined, target: number | null | undefined, fmt: (n: number) => string): Fig {
  if (value == null) return { v: NA };
  if (!target) return { v: fmt(value), sub: "no target set" };
  return { v: fmt(value), sub: `${pct(value / target)} of ${fmt(target)}` };
}

type Card = { page: string; job: string; rows: [string, Fig][] };

/** The six pages, each as the three or four figures it leads with — the same fields the board reads. */
function cards(m: Metrics, st: boolean): Card[] {
  const lead = [...m.salesLeaderboard].sort((a, b) => b.sold - a.sold)[0];
  const top = m.topJobTypes[0];
  const suburb = m.topJobSuburbs[0];
  return [
    {
      page: "Today", job: "What has happened since this morning.",
      rows: [
        ["Sold today", { v: m$(m.soldToday) }],
        ["Invoiced today", { v: m$(m.revenueToday), sub: m.revenueTodayEarlier ? `everything billed today · ${m$(m.revenueTodayEarlier)} for jobs done earlier` : "everything billed today" }],
        ["Jobs booked today", { v: st ? n0(m.bookingsToday) : NA }],
        ["Overdue invoices", m.overdueCount == null ? { v: NA, sub: "not read from Xero yet" } : { v: n0(m.overdueCount), sub: `${m$(m.overdueTotal)} owed` }],
      ],
    },
    {
      page: "Pace", job: "Today against its share, the month against its targets, the year against the goal.",
      rows: [
        ["Sold this month", against(m.soldMtd, m.salesTargetMonthly, money)],
        ["Invoiced this month", against(m.revenueInvoicedMtd, m.revenueTargetMonthly, money)],
        ["Jobs booked", against(m.bookingsMonth, m.bookingsTargetMonthly, (n) => n.toLocaleString("en-AU"))],
        ["Working days left", { v: String(m.workingDaysLeft), sub: `of ${m.workingDaysTotal} this month` }],
      ],
    },
    {
      page: "Quotes", job: "What was written today, and what is still out.",
      rows: [
        ["Quoted today", { v: m$(m.quotesCreatedTodayValue), sub: `${n0(m.quotesCreatedTodayCount)} ${m.quotesCreatedTodayCount === 1 ? "job" : "jobs"}` }],
        ["Still out", { v: m$(m.estimatesOpenValue), sub: `${n0(m.estimatesOpenCount)} quotes` }],
        ["Average option", { v: m$(m.avgQuoteMonth), sub: "this month" }],
      ],
    },
    {
      page: "Team", job: "Sold, out of quoted, per person this month.",
      rows: [
        ["Leading", lead && lead.sold > 0 ? { v: lead.name, sub: `${money(lead.sold)} sold` } : { v: NA, sub: "no sale this month yet" }],
        ["People on it", { v: n0(m.salesLeaderboard.length) }],
        ["Commission tiers", m.commissionTiers.length ? { v: `${m.commissionTiers.length} set` } : { v: "None", sub: "no bonus bar is drawn" }],
      ],
    },
    {
      page: "Performance", job: "Jobs, revenue and margin by type of work.",
      rows: [
        ["Margin", m.marginPct == null ? { v: NA, sub: "no cost data in ServiceTitan" } : { v: p0(m.marginPct) }],
        ["Average invoice", { v: m$(m.avgInvoiceValue) }],
        ["Biggest type of work", top ? { v: top.jobType, sub: `${money(top.revenue)} this month` } : { v: NA }],
      ],
    },
    {
      page: "Areas", job: "Where the work is, over the last 60 days, on a map.",
      rows: [
        ["Busiest suburb", suburb ? { v: suburb.suburb, sub: `${suburb.count} ${suburb.count === 1 ? "job" : "jobs"}` } : { v: NA }],
        ["Suburbs with work", { v: n0(m.topJobSuburbs.length) }],
      ],
    },
  ];
}

const SOURCE_LABEL: Record<string, { name: string; feeds: string }> = {
  servicetitan: { name: "ServiceTitan", feeds: "Jobs, sales, quotes, team and areas" },
  xero: { name: "Xero", feeds: "Overdue invoices, receivables and the year to date" },
  leads: { name: "Website", feeds: "Leads under Jobs booked on Today" },
};
const STATE_WORD: Record<string, { word: string; tone: string }> = {
  ok: { word: "Live", tone: "ok" },
  stale: { word: "Behind — showing its last figures", tone: "warn" },
  error: { word: "Failing — showing its last figures", tone: "bad" },
  "not-configured": { word: "Not connected", tone: "none" },
};

/**
 * The wall board, from inside the portal: what it is showing, what it is
 * measured against, and how it gets its numbers.
 *
 * The board itself is a TV with no buttons, and the only page about it in here
 * was where its targets are typed in. Anyone wanting to know why a dial was
 * blank or how old a figure was had to walk over to the screen and read the
 * dots.
 */
export default async function BoardPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  // The code to type on the panel. Null when the settings store is unreachable,
  // which the card says rather than showing a code that cannot be redeemed.
  const pairing = dashboardDbConfigured() ? await currentPairing().catch(() => null) : null;

  const snap = dashboardDbConfigured() ? await latestSnapshot().catch(() => null) : null;
  const m = snap?.metrics ?? null;
  const st = Boolean(snap && snap.sources.servicetitan?.state !== "not-configured");

  const targets = m
    ? [
        { label: "Sold a month", v: m.salesTargetMonthly },
        { label: "Invoiced a month", v: m.revenueTargetMonthly },
        { label: "Profit a month", v: m.profitTargetMonthly },
        { label: "Jobs booked a month", v: m.bookingsTargetMonthly },
      ]
    : [];
  const set = targets.filter((t) => t.v).length;
  const sources = snap ? Object.entries(snap.sources) : [];
  const liveCount = sources.filter(([, s]) => s.state === "ok").length;
  const now = Date.now();
  const fresh = snap ? now - Date.parse(snap.computedAt) < 15 * 60_000 : false;

  return (
    <PortalShell user={user}>
      <RefreshEvery ms={25_000} poke="/portal/board/refresh" />
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>The wall board</h1>
          <p>
            What the office screen is showing right now, what each number is measured against, and where it comes from.
            The figures below are the board&rsquo;s own, from the same snapshot the screen reads.
          </p>
        </div>
        <div className="pt-vhead__acts">
          <a href="/portal/finance/board/open" target="_blank" rel="noreferrer" className="pt-btn pt-btn--ghost">Open it here ↗</a>
          <Link href="/portal/goal" className="pt-btn pt-btn--ghost">Year goal</Link>
          <Link href="/portal/finance/board" className="pt-btn pt-btn--ghost">Commission &amp; calendar</Link>
        </div>
      </div>

      <div className="pt-pair">
        <div className="pt-pair__say">
          <strong>Put the board on a screen</strong>
          <p>
            Type this on the television once. It signs that screen in for a year and the address becomes{" "}
            <code>advancedgas.com.au/tv</code> — nothing secret left on display. The code works once and dies in fifteen
            minutes; this page makes a new one when it does.
          </p>
        </div>
        {pairing ? (
          <div className="pt-pair__code">
            <span className="pt-pair__host">advancedgas.com.au/tv/</span>
            <b>{prettyCode(pairing.code)}</b>
          </div>
        ) : (
          <div className="pt-pair__code pt-pair__code--none">No code — the settings store is unreachable.</div>
        )}
      </div>

      {!snap ? (
        <div className="pt-note pt-note--warn">
          <strong>The board has no snapshot yet.</strong> It makes one the first time the screen is opened, or on the next
          scheduled sync.
        </div>
      ) : (
        <>
          <Heads
            items={[
              { label: "Last refreshed", value: <LiveAge at={snap.computedAt} now={now} />, sub: fresh ? "recomputed every 25 seconds while the TV or this page is open" : "catching up — the TV has been off", feature: true },
              { label: "Sources live", value: `${liveCount} of ${sources.length}`, sub: liveCount === sources.length ? "everything is coming through" : "see below for which" },
              { label: "Targets set", value: `${set} of ${targets.length}`, sub: set === targets.length ? "every dial has something to aim at" : "a dial with no target stays blank" },
              { label: "Pages", value: "6", sub: "each on screen for 20 seconds" },
            ]}
          />

          {set < targets.length && (
            <Link href="/portal/goal" className="pt-panel pt-linkpanel">
              <span>
                <strong>{targets.length - set} of the four monthly targets aren&rsquo;t set</strong>
                <em>
                  Not set: {targets.filter((t) => !t.v).map((t) => t.label.toLowerCase()).join(", ")}. Those dials on Pace say
                  &ldquo;no target&rdquo; rather than guess, and Performance draws no margin goal.
                </em>
              </span>
              <span className="pt-linkpanel__go">Set them →</span>
            </Link>
          )}

          <h2 className="pt-sech">On the board right now</h2>
          <div className="pt-bd">
            {cards(snap.metrics, st).map((c) => (
              <section key={c.page} className="pt-panel pt-bd__card">
                <h3>{c.page}</h3>
                <p>{c.job}</p>
                <dl>
                  {c.rows.map(([k, f]) => (
                    <div key={k}><dt>{k}</dt><dd>{f.v}{f.sub && <span>{f.sub}</span>}</dd></div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          <div className="pt-two">
            <section className="pt-panel">
              <h2 className="pt-panel__h">Where the numbers come from</h2>
              <div className="pt-bd__src">
                {sources.map(([k, s]) => {
                  const w = STATE_WORD[s.state] ?? { word: s.state, tone: "none" };
                  return (
                    <div key={k}>
                      <span>
                        <strong>{SOURCE_LABEL[k]?.name ?? k}</strong>
                        <em>{SOURCE_LABEL[k]?.feeds ?? ""}{s.detail ? ` · ${s.detail}` : ""}</em>
                      </span>
                      <span className="pt-bd__srcstate">
                        <span className={`pt-vstat pt-vstat--${w.tone}`}>{w.word}</span>
                        {s.at && <em><LiveAge at={s.at} now={now} /></em>}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="pt-panel__sub" style={{ margin: "14px 0 0" }}>
                <Link href="/portal/integrations">Every connection, in one place →</Link>
              </p>
            </section>

            <section className="pt-panel">
              <h2 className="pt-panel__h">How it works</h2>
              <ol className="pt-bd__how">
                <li><strong>ServiceTitan is copied into the database</strong> every couple of minutes while the screen or this page is open, and overnight by a scheduled job. The TV never talks to ServiceTitan or Xero itself.</li>
                <li><strong>Every 25 seconds the board recomputes</strong> one snapshot from that copy — every figure on all six pages comes from that one row, so no two tiles can disagree.</li>
                <li><strong>A source that fails keeps its last figures</strong> behind an amber dot in the board&rsquo;s header. It never blanks and never shows a zero it didn&rsquo;t measure.</li>
                <li><strong>A sale lands within about ten minutes</strong> of being closed — the rocket goes off on the sync after, not the moment it happens.</li>
                <li><strong>Every target comes from the year goal</strong>: this month&rsquo;s share of the year to invoice and to sell, profit at the goal&rsquo;s percentage, and the planned week&rsquo;s jobs spread over the month&rsquo;s working days. Change the goal and the board follows on its next refresh.</li>
              </ol>
            </section>
          </div>
        </>
      )}
    </PortalShell>
  );
}
