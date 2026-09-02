import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceOverview } from "@/components/portal/FinanceOverview";
import { FinancePlanner } from "@/components/portal/FinancePlanner";
import { xeroStatus, getProfitAndLoss, getProfitAndLossSeries, redirectUri } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance — Team portal" };

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function ranges() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
  const today = iso(now);
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  return {
    today: { label: "Today", from: today, to: today },
    week: { label: "This week", from: iso(new Date(y, m, d - dow)), to: today },
    month: { label: "This month", from: iso(new Date(y, m, 1)), to: today },
    lastMonth: { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) },
    year: { label: "This year", from: iso(new Date(y, 0, 1)), to: today },
  };
}

export default async function FinancePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

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

      {status === "connected" && <ConnectedView tenantName={tenantName ?? null} />}
    </PortalShell>
  );
}

async function ConnectedView({ tenantName }: { tenantName: string | null }) {
  const r = ranges();
  const [today, week, month, lastMonth, year, series] = await Promise.all([
    getProfitAndLoss(r.today.from, r.today.to),
    getProfitAndLoss(r.week.from, r.week.to),
    getProfitAndLoss(r.month.from, r.month.to),
    getProfitAndLoss(r.lastMonth.from, r.lastMonth.to),
    getProfitAndLoss(r.year.from, r.year.to),
    getProfitAndLossSeries(12),
  ]);

  const cards = [
    { label: r.today.label, pl: today },
    { label: r.week.label, pl: week },
    { label: r.month.label, pl: month },
    { label: r.year.label, pl: year },
  ];
  const anyData = cards.some((c) => c.pl !== null);

  return (
    <>
      <div className="pt-fin__bar">
        <span className="pt-fin__org">Live from <strong>{tenantName || "Xero"}</strong></span>
        <form action="/api/xero/disconnect" method="post"><button type="submit" className="pt-btn pt-btn--ghost pt-btn--sm">Disconnect</button></form>
      </div>

      {!anyData && (
        <div className="pt-note pt-note--warn"><strong>Couldn&rsquo;t read the reports.</strong> The connection may have expired — try Disconnect and connect again.</div>
      )}

      <FinanceOverview month={month} lastMonth={lastMonth} year={year} series={series} />

      <div className="pt-fin__detailhead">The full breakdown</div>
      <div className="pt-fin__cards">
        {cards.map((c) => (
          <div key={c.label} className="pt-fin__card">
            <div className="pt-fin__cardlabel">{c.label}</div>
            <div className={`pt-fin__profit${c.pl && c.pl.netProfit < 0 ? " is-neg" : ""}`}>{c.pl ? money(c.pl.netProfit) : "—"}</div>
            <div className="pt-fin__cardsub">{c.pl ? <>Income {money(c.pl.income)} · Costs {money(c.pl.expenses)}</> : "No data"}</div>
          </div>
        ))}
      </div>

      <FinancePlanner yearProfit={year?.netProfit ?? null} />
    </>
  );
}
