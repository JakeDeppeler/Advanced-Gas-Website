import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceOverview } from "@/components/portal/FinanceOverview";
import { FinancePlanner } from "@/components/portal/FinancePlanner";
import { PLSummary } from "@/components/portal/PLSummary";
import { xeroStatus, getProfitAndLoss, getMoneySeries, getPLDetail, rangeSpans, localToday, MONEY_RANGES, type MoneyRange, redirectUri } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance — Team portal" };

// Every span is anchored to today's date in Melbourne, not the server's UTC
// clock — before 10am local the two disagree, which is what made "today" read a
// day behind and, on the first of a month, made "this month" show last month.
function ranges() {
  const now = localToday();
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
  const today = iso(now);
  const dow = (now.getUTCDay() + 6) % 7; // Monday = 0
  return {
    today: { label: "Today", from: today, to: today },
    week: { label: "This week", from: iso(new Date(Date.UTC(y, m, d - dow))), to: today },
    month: { label: "This month", from: iso(new Date(Date.UTC(y, m, 1))), to: today },
    lastMonth: { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) },
    year: { label: "This year", from: iso(new Date(Date.UTC(y, 0, 1))), to: today },
  };
}

export default async function FinancePage({ searchParams }: { searchParams: { tf?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const tf: MoneyRange = (MONEY_RANGES as readonly string[]).includes(searchParams?.tf ?? "") ? (searchParams!.tf as MoneyRange) : "12m";
  const { status, tenantName } = await xeroStatus();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Finance</div>
        <h1>Where we&rsquo;re at.</h1>
        <p>A plain read on how the business is tracking — this month, this year, and what&rsquo;s going well versus what to watch.</p>
      </div>

      {status === "not-configured" && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Connect Xero — one-time setup</h2>
          <p className="pt-panel__sub">The app credentials aren&rsquo;t set yet. Create a Xero app, then add its keys to the server:</p>
          <ol className="pt-fin__steps">
            <li>Go to <strong>developer.xero.com</strong> → <strong>My Apps</strong> → <strong>New app</strong> (Web app).</li>
            <li>Set the <strong>redirect URI</strong> to exactly:<br /><code className="pt-fin__code">{redirectUri()}</code></li>
            <li>Copy the <strong>Client ID</strong> and generate a <strong>Client Secret</strong>.</li>
            <li>Add them to the server as <code>XERO_CLIENT_ID</code> and <code>XERO_CLIENT_SECRET</code>, then redeploy.</li>
          </ol>
        </section>
      )}

      {status === "not-connected" && (
        <section className="pt-panel pt-fin__connect">
          <h2 className="pt-panel__h">Connect your Xero organisation</h2>
          <p className="pt-panel__sub">You&rsquo;re set up — now link the Xero org. You&rsquo;ll sign in to Xero and pick the organisation; nothing is changed in Xero, we only read reports.</p>
          <a href="/api/xero/connect" className="pt-btn pt-btn--orange">Connect Xero →</a>
        </section>
      )}

      {status === "connected" && <ConnectedView tenantName={tenantName ?? null} tf={tf} />}
    </PortalShell>
  );
}

async function ConnectedView({ tenantName, tf }: { tenantName: string | null; tf: MoneyRange }) {
  const r = ranges();
  const pl = rangeSpans(tf);
  const [today, week, month, lastMonth, year, series, plNow, plBefore] = await Promise.all([
    getProfitAndLoss(r.today.from, r.today.to),
    getProfitAndLoss(r.week.from, r.week.to),
    getProfitAndLoss(r.month.from, r.month.to),
    getProfitAndLoss(r.lastMonth.from, r.lastMonth.to),
    getProfitAndLoss(r.year.from, r.year.to),
    getMoneySeries(tf),
    getPLDetail(pl.now.from, pl.now.to),
    getPLDetail(pl.before.from, pl.before.to),
  ]);

  const anyData = [today, week, month, year].some((p) => p !== null);
  const pulledAt = new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="pt-fin">
      <div className="pt-fin__bar">
        <span className="pt-fin__org">Live from <strong>{tenantName || "Xero"}</strong> · read at {pulledAt}</span>
        <form action="/api/xero/disconnect" method="post"><button type="submit" className="pt-btn pt-btn--ghost pt-btn--sm">Disconnect</button></form>
      </div>

      {!anyData && (
        <div className="pt-note pt-note--warn"><strong>Couldn&rsquo;t read the reports.</strong> The connection may have expired — try Disconnect and connect again.</div>
      )}

      <FinanceOverview
        today={today} week={week} month={month} lastMonth={lastMonth} year={year} series={series} tf={tf}
        plSummary={plNow ? <PLSummary now={plNow} before={plBefore} nowLabel={pl.now.label} beforeLabel={pl.before.label} /> : null}
      />

      <FinancePlanner yearProfit={year?.netProfit ?? null} />
    </div>
  );
}
