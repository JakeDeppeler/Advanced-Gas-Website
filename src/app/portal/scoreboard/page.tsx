import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs, ago, type Fig } from "@/components/portal/Figs";
import { YearFigs } from "@/components/portal/YearFigs";
import { latestBoard, monthName, savedGoal, xeroProfit, yearEndLabel } from "@/lib/portal/office";
import { pipelineDue } from "@/lib/pipeline/store";
import { onTheTools } from "@/lib/portal/onTheTools";
import { money, pct } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scoreboard — Team portal" };

const count = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-AU"));

/**
 * How the company is going, on one page: the year against its goal, the month
 * as the steps the work moves through, and the handful of figures that say
 * whether it's paying. Every figure says where it's from and opens the page
 * that explains it.
 *
 * It replaced The numbers, which showed most of the same figures a second way
 * and called a different thing "profit". Here the two profits are named apart:
 * net profit is Xero's, after every cost; job margin is ServiceTitan's
 * job costing, before the overheads.
 */
export default async function ScoreboardPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The Scoreboard" forWhom="managers" />;

  const [board, goal, profit, pipe, tools] = await Promise.all([
    latestBoard(), savedGoal(), xeroProfit(), pipelineDue().catch(() => null), onTheTools().catch(() => null),
  ]);
  const m = board?.metrics ?? null;
  const mo = m?.paceData?.periods.month ?? null;
  const monthTarget = m?.pace?.month.invoiced.value ?? m?.revenueTargetMonthly ?? null;
  const mon = monthName();
  const monthMargin = profit.month && profit.month.income > 0 ? profit.month.netProfit / profit.month.income : null;
  const jp = m?.jobProfitRecent ?? null;
  const goalPct = goal?.profitPct ?? null;
  const st = `ServiceTitan · ${mon} so far · inc GST`;

  // The month as the work moves: asked, priced, sold, done, billed. A rate
  // only sits between two steps where one really is a share of the other.
  const steps: Array<{ k: string; v: string; sub: string; href: string; rate?: string }> = [
    { k: "Leads", v: count(mo?.leads), sub: mo?.booked != null ? `${count(mo.booked)} booked a visit or call` : "website and ServiceTitan", href: "/portal/leads" },
    { k: "Quotes sent", v: count(mo?.quoted), sub: mo?.quotedValue != null ? `${money(mo.quotedValue)} quoted` : "", href: "/portal/pipeline",
      rate: m?.closeRate30d != null ? `${pct(m.closeRate30d)} close` : undefined },
    { k: "Sold", v: mo?.soldValue != null ? money(mo.soldValue) : "—", sub: mo?.sold != null ? `${count(mo.sold)} ${mo.sold === 1 ? "job" : "jobs"}` : "", href: "/portal/pipeline" },
    { k: "Jobs done", v: count(mo?.completed), sub: "installs and service", href: "/portal/profit" },
    { k: "Invoiced", v: mo?.invoiced != null ? money(mo.invoiced) : "—",
      sub: mo?.invoiced != null && monthTarget ? `${pct(mo.invoiced / monthTarget)} of the ${money(monthTarget)} month target` : "", href: "/portal/money" },
  ];

  const health: Fig[] = [
    {
      label: "Net profit", feature: true, href: "/portal/finance",
      value: profit.month ? money(profit.month.netProfit) : null,
      sub: monthMargin != null ? `${pct(monthMargin)} of income${goalPct ? ` · goal ${goalPct}%` : ""}` : undefined,
      from: `Xero · ${mon} so far · before GST · after every cost`,
      parts: profit.month ? [
        { label: "Income", value: money(profit.month.income) },
        { label: "Less every cost", value: `−${money(profit.month.income - profit.month.netProfit)}` },
        { label: "Net profit", value: money(profit.month.netProfit) },
      ] : undefined,
      needs: "Needs Xero connected",
    },
    {
      label: "Job margin", href: "/portal/profit",
      value: jp?.margin != null ? pct(jp.margin) : null,
      sub: jp ? `${money(jp.profit)} on ${jp.costed} costed ${jp.costed === 1 ? "job" : "jobs"}` : undefined,
      from: "ServiceTitan job costing · last 30 days · before overheads",
      parts: jp ? [
        { label: "Work invoiced, ex GST", value: money(jp.revenue) },
        { label: "Less parts and labour", value: `−${money(jp.revenue - jp.profit)}` },
        { label: "Left on the jobs", value: money(jp.profit) },
      ] : undefined,
      needs: "No costed jobs in 30 days",
    },
    {
      label: "Quotes out", href: "/portal/pipeline",
      value: pipe ? money(pipe.openValue) : null,
      sub: pipe ? `${pipe.openCount} open · ${pipe.due} to follow up today` : undefined,
      from: "Quote pipeline · last 60 days · inc GST",
      needs: "The pipeline couldn't be read",
    },
    {
      label: "Overdue to us", href: "/portal/money",
      value: m && m.overdueTotal != null ? money(m.overdueTotal) : null,
      sub: m && m.overdueCount != null ? `${m.overdueCount} ${m.overdueCount === 1 ? "invoice" : "invoices"} past due` : undefined,
      from: "Xero · inc GST",
      needs: "Needs Xero connected",
    },
    {
      label: "On the tools", href: "/portal/hours",
      value: tools && tools.lastRoster > 0 ? pct(tools.lastOn / tools.lastRoster) : null,
      sub: tools && tools.lastRoster > 0 ? `${tools.lastOn.toFixed(0)} of ${tools.lastRoster} rostered hours on site last week` : undefined,
      from: "ServiceTitan clock-ins · last week",
      needs: "No clock-ins last week",
    },
  ];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>Scoreboard</h1>
          <p>
            How the company is going. Each figure says where it&rsquo;s from, and opens the page behind it
            {board ? ` · figures as of ${ago(board.computedAt)}` : ""}.
          </p>
        </div>
        <Link href="/portal/board" className="pt-btn pt-btn--ghost">The wall board</Link>
      </div>

      {!m && (
        <div className="pt-note pt-note--warn"><strong>No snapshot yet.</strong> The ServiceTitan figures here are the wall board&rsquo;s, and it hasn&rsquo;t taken one.</div>
      )}

      <h2 className="pt-sech">This year</h2>
      <YearFigs m={m} goal={goal} profit={profit.year} endLabel={yearEndLabel(goal)} yearFrom={profit.yearFrom} />

      <h2 className="pt-sech">{mon}, step by step <small>{st}</small></h2>
      <div className="pt-nbr">
      <ol className="pt-nbr__flow pt-nbr__flow--5">
        {steps.map((s, i) => (
          <li key={s.k} className="pt-nbr__stepwrap">
            <Link href={s.href} className="pt-nbr__step">
              <span className="pt-nbr__k">{i + 1} · {s.k}</span>
              <strong>{s.v}</strong>
              <span className="pt-nbr__sub">{s.sub}</span>
              <span className="pt-nbr__open">Open →</span>
            </Link>
            {i < steps.length - 1 && (
              <span className="pt-nbr__rate"><span aria-hidden="true">→</span>{s.rate && <em>{s.rate}</em>}</span>
            )}
          </li>
        ))}
      </ol>
      </div>

      <h2 className="pt-sech">Is it paying?</h2>
      <Figs items={health.slice(0, 2)} cols={2} />
      <Figs items={health.slice(2)} cols={3} />
    </PortalShell>
  );
}
