import { Figs, type Fig } from "@/components/portal/Figs";
import { money, pct } from "@/lib/portal/format";
import type { Metrics } from "@/lib/dashboard/metrics";
import type { ProfitLoss } from "@/lib/portal/xero";
import type { YearGoal } from "@/lib/portal/yearGoal";

/**
 * The year against its goal: invoiced so far, whether that is on track, what
 * is still to go, and profit. Shared by the Scoreboard and The numbers so the
 * two can't drift — and read from the wall board's own figures, so the board
 * can't disagree with either.
 */
export function YearFigs({ m, goal, profit, endLabel }: { m: Metrics | null; goal: YearGoal | null; profit: ProfitLoss | null; endLabel: string }) {
  const ytd = m?.revenueInvoicedYtd ?? null;
  const target = m?.revenueTargetYear ?? null;
  const byNow = m?.revenueYearByNow ?? null;
  const noGoal = "Set the year goal and this follows it";
  const margin = profit && profit.income > 0 ? profit.netProfit / profit.income : null;

  const items: Fig[] = [
    {
      label: "Invoiced this year", feature: true, href: "/portal/goal",
      value: ytd == null ? null : money(ytd),
      sub: target ? `goal ${money(target)}` : undefined,
      bar: ytd != null && target ? ytd / target : null,
      mark: byNow != null && target ? byNow / target : null,
      needs: noGoal,
    },
    {
      label: "On track", href: "/portal/goal",
      value: ytd != null && byNow ? pct(ytd / byNow) : null,
      sub: byNow != null ? `${money(byNow)} is where the goal says we should be by now` : undefined,
      needs: noGoal,
    },
    {
      label: "Still to go", href: "/portal/goal",
      value: ytd != null && target ? money(Math.max(0, target - ytd)) : null,
      sub: target ? `to ${money(target)} by ${endLabel}` : undefined,
      needs: noGoal,
    },
    {
      label: "Profit this year", href: "/portal/finance",
      value: margin == null ? null : pct(margin),
      sub: profit ? `${money(profit.netProfit)} from Xero${goal?.profitPct ? ` · goal ${goal.profitPct}%` : ""}` : undefined,
      needs: "Needs Xero connected",
    },
  ];
  return <Figs items={items} cols={4} />;
}
