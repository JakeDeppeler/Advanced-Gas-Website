import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { ProfitChart } from "@/components/portal/ProfitChart";
import { PLStatement } from "@/components/portal/PLStatement";
import { xeroStatus, getPLDetail, getMoneySeries, plSpans, PL_PERIODS, type PLPeriod } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit & loss — Team portal" };

export default async function ProfitLossPage({ searchParams }: { searchParams: { p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const key: PLPeriod = PL_PERIODS.some((o) => o.k === searchParams?.p) ? (searchParams!.p as PLPeriod) : "month";
  const { status } = await xeroStatus();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Profit &amp; loss</div>
        <h1>What we actually made.</h1>
        <p>Every account from Xero, next to the same figures for the period before — so you can see which lines moved and by how much.</p>
      </div>

      {status !== "connected" ? (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Xero isn&rsquo;t connected</h2>
          <p className="pt-panel__sub">This page reads the profit and loss report from Xero. Connect it on the Finance overview first.</p>
          <Link href="/portal/finance" className="pt-btn pt-btn--orange">Go to Finance →</Link>
        </section>
      ) : (
        <Report periodKey={key} />
      )}
    </PortalShell>
  );
}

async function Report({ periodKey }: { periodKey: PLPeriod }) {
  const { now: nowSpan, before: beforeSpan } = plSpans(periodKey);
  const [now, before, series] = await Promise.all([
    getPLDetail(nowSpan.from, nowSpan.to),
    getPLDetail(beforeSpan.from, beforeSpan.to),
    getMoneySeries("12m"),
  ]);

  const picker = (
    <div className="pt-ov__tf">
      {PL_PERIODS.map((o) => (
        <Link key={o.k} href={`/portal/finance/pl?p=${o.k}`} scroll={false} className={`pt-ov__tfbtn${periodKey === o.k ? " is-on" : ""}`}>{o.label}</Link>
      ))}
    </div>
  );

  if (!now) {
    return (
      <div className="pt-fin">
        <div className="pt-ov__charthead">{picker}</div>
        <div className="pt-note pt-note--warn">
          <strong>Couldn&rsquo;t read the report.</strong> Xero didn&rsquo;t answer for {nowSpan.label} — reload in a minute, or reconnect from the Finance overview.
        </div>
      </div>
    );
  }

  return (
    <div className="pt-fin">
      <PLStatement now={now} before={before} nowLabel={nowSpan.label} beforeLabel={beforeSpan.label} picker={picker} />

      <section className="pt-panel">
        <h2 className="pt-panel__h">Profit month by month</h2>
        <p className="pt-panel__sub">What was left after everything, for each of the last 12 months — the same view whichever period is picked above.</p>
        <ProfitChart points={series.map((p) => ({ label: p.label, full: p.full, netProfit: p.netProfit, ok: p.ok }))} spanLabel="Last 12 months" />
      </section>
    </div>
  );
}
