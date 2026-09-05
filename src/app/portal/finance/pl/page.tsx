import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { ProfitChart } from "@/components/portal/ProfitChart";
import { PLStatement } from "@/components/portal/PLStatement";
import { xeroStatus, getPLDetail, getMoneySeries, localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit & loss — Team portal" };

const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

const PERIODS = [
  { k: "month", label: "This month" },
  { k: "lastmonth", label: "Last month" },
  { k: "3m", label: "Last 3 months" },
  { k: "year", label: "This year" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["k"];

type Span = { from: string; to: string; label: string };

/**
 * Each period is paired with the equivalent stretch before it, so the two are
 * genuinely comparable: five days into this month is measured against the first
 * five days of last month, not against a whole one.
 */
function spans(key: PeriodKey): { now: Span; before: Span } {
  const t = localToday();
  const y = t.getUTCFullYear(), m = t.getUTCMonth(), d = t.getUTCDate();
  const monthEnd = (yy: number, mm: number) => new Date(Date.UTC(yy, mm + 1, 0));
  const name = (yy: number, mm: number) => `${MON[((mm % 12) + 12) % 12]} ${mm < 0 ? yy - 1 : mm > 11 ? yy + 1 : yy}`;

  if (key === "lastmonth") {
    return {
      now: { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(monthEnd(y, m - 1)), label: name(y, m - 1) },
      before: { from: iso(new Date(Date.UTC(y, m - 2, 1))), to: iso(monthEnd(y, m - 2)), label: name(y, m - 2) },
    };
  }
  if (key === "3m") {
    // Whole months only — a part-finished month would drag the comparison down.
    return {
      now: { from: iso(new Date(Date.UTC(y, m - 3, 1))), to: iso(monthEnd(y, m - 1)), label: "the last 3 full months" },
      before: { from: iso(new Date(Date.UTC(y, m - 6, 1))), to: iso(monthEnd(y, m - 4)), label: "the 3 months before that" },
    };
  }
  if (key === "year") {
    return {
      now: { from: iso(new Date(Date.UTC(y, 0, 1))), to: iso(t), label: `${y} so far` },
      before: { from: iso(new Date(Date.UTC(y - 1, 0, 1))), to: iso(new Date(Date.UTC(y - 1, m, d))), label: `the same point in ${y - 1}` },
    };
  }
  // This month, against the same run of days last month.
  const lastMonthDays = monthEnd(y, m - 1).getUTCDate();
  return {
    now: { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(t), label: `${name(y, m)}, ${d} ${d === 1 ? "day" : "days"} in` },
    before: { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m - 1, Math.min(d, lastMonthDays)))), label: `the first ${Math.min(d, lastMonthDays)} days of ${name(y, m - 1)}` },
  };
}

export default async function ProfitLossPage({ searchParams }: { searchParams: { p?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const key: PeriodKey = (PERIODS as readonly { k: string }[]).some((o) => o.k === searchParams?.p)
    ? (searchParams!.p as PeriodKey) : "month";
  const { status } = await xeroStatus();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Profit &amp; loss</div>
        <h1>What we actually made.</h1>
        <p>The profit and loss straight out of Xero, account by account — and the same figures for the period before, so you can see exactly which lines moved and by how much.</p>
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

async function Report({ periodKey }: { periodKey: PeriodKey }) {
  const { now: nowSpan, before: beforeSpan } = spans(periodKey);
  const [now, before, series] = await Promise.all([
    getPLDetail(nowSpan.from, nowSpan.to),
    getPLDetail(beforeSpan.from, beforeSpan.to),
    getMoneySeries("12m"),
  ]);

  const points = series.map((p) => ({ label: p.label, full: p.full, netProfit: p.netProfit, ok: p.ok }));

  return (
    <div className="pt-fin">
      <div className="pt-ov__tf pt-pl__tf">
        {PERIODS.map((o) => (
          <Link key={o.k} href={`/portal/finance/pl?p=${o.k}`} scroll={false} className={`pt-ov__tfbtn${periodKey === o.k ? " is-on" : ""}`}>{o.label}</Link>
        ))}
      </div>

      {!now ? (
        <div className="pt-note pt-note--warn"><strong>Couldn&rsquo;t read the report.</strong> Xero didn&rsquo;t answer for {nowSpan.label} — reload in a minute, or reconnect from the Finance overview.</div>
      ) : (
        <>
          <section className="pt-panel">
            <h2 className="pt-panel__h">Profit month by month</h2>
            <p className="pt-panel__sub">What was left after everything, for each of the last 12 months.</p>
            <ProfitChart points={points} spanLabel="Last 12 months" />
          </section>

          <PLStatement now={now} before={before} nowLabel={nowSpan.label} beforeLabel={beforeSpan.label} />
        </>
      )}
    </div>
  );
}
