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
import { money, pct } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scoreboard — Team portal" };

/**
 * The month and the year in numbers. Every figure is the wall board's own,
 * from its latest snapshot, plus Xero's profit — so this page and the TV in
 * the office can't disagree, and each block goes to the page that explains it.
 */
export default async function ScoreboardPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The Scoreboard" forWhom="managers" />;

  const [board, goal, profit] = await Promise.all([latestBoard(), savedGoal(), xeroProfit()]);
  const m = board?.metrics ?? null;
  const target = m?.revenueTargetMonthly ?? null;
  const monthMargin = profit.month && profit.month.income > 0 ? profit.month.netProfit / profit.month.income : null;

  const month: Fig[] = [
    {
      label: "Sold", feature: true, href: "/portal/pipeline",
      value: m ? money(m.soldMtd) : null,
      sub: m ? `${m.soldCountMonth} ${m.soldCountMonth === 1 ? "job" : "jobs"}${m.closeRate30d != null ? ` · ${pct(m.closeRate30d)} close rate over 30 days` : ""}` : undefined,
      bar: m && m.salesTargetMonthly ? m.soldMtd / m.salesTargetMonthly : null,
      needs: "Waiting on the board's first snapshot",
    },
    {
      label: "Invoiced", href: "/portal/money",
      value: m ? money(m.revenueInvoicedMtd) : null,
      sub: m ? (target ? `${pct(m.revenueInvoicedMtd / target)} of the ${money(target)} monthly target` : "No monthly target — set the year goal") : undefined,
      bar: m && target ? m.revenueInvoicedMtd / target : null,
      needs: "Waiting on the board's first snapshot",
    },
    {
      label: "Quotes out", href: "/portal/pipeline",
      value: m ? money(m.estimatesOpenValue) : null,
      sub: m ? `${m.estimatesOpenCount} waiting on a yes` : undefined,
      needs: "Waiting on the board's first snapshot",
    },
    {
      label: "Overdue", href: "/portal/money",
      value: m && m.overdueTotal != null ? money(m.overdueTotal) : null,
      sub: m && m.overdueCount != null ? `${m.overdueCount} ${m.overdueCount === 1 ? "invoice" : "invoices"} past due, from Xero` : undefined,
      needs: "Needs Xero connected",
    },
    { label: "Hours billed", href: "/portal/hours", value: null, needs: "Needs timesheets from ServiceTitan" },
    {
      label: "Profit", href: "/portal/finance",
      value: monthMargin == null ? null : pct(monthMargin),
      sub: profit.month ? `${money(profit.month.netProfit)} from Xero${goal?.profitPct ? ` · goal ${goal.profitPct}%` : ""}` : undefined,
      needs: "Needs Xero connected",
    },
  ];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>Scoreboard</h1>
          <p>
            The month and the year in numbers — the same figures as the wall board
            {board ? `, as of ${ago(board.computedAt)}` : ""}. Each one opens the page behind it.
          </p>
        </div>
        <Link href="/portal/board" className="pt-btn pt-btn--ghost">The wall board</Link>
      </div>

      <h2 className="pt-sech">{monthName()}</h2>
      <Figs items={month} cols={3} />

      <h2 className="pt-sech">This year</h2>
      <YearFigs m={m} goal={goal} profit={profit.year} endLabel={yearEndLabel(goal)} />
    </PortalShell>
  );
}
