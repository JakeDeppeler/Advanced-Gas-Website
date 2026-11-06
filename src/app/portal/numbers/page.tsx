import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { getSettings } from "@/lib/portal/db";
import { readYearGoal } from "@/lib/portal/yearGoal";
import { getGoals } from "@/lib/portal/goals";
import { latestBoard, shortMoney } from "@/lib/portal/office";
import { BENCH } from "@/lib/portal/benchmarks";
import { Head, Say } from "@/components/portal/kit/Kit";
import { GoalsForm } from "@/components/portal/numbers/GoalsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Goals · Team portal" };

const FY = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const CAL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Pricing & costs › Goals: every goal the portal measures against, in one place.
 * The year's sales and how they fall by month, the profit % and the win rate
 * are the year goal (the same record Pace and the wall board read); the rest
 * are portal_settings.goals.
 */
export default async function GoalsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Goals" forWhom="the office" />;

  const [row, goals, board] = await Promise.all([getSettings<unknown>("yeargoal").catch(() => null), getGoals(), latestBoard()]);
  const now = new Date();
  const g = readYearGoal(row, now);
  const labels = g.basis === "calendar" ? CAL : FY;
  const shape = g.shape && g.shape.some((v) => v > 0) ? g.shape : Array(12).fill(1);
  const sum = shape.reduce((a: number, b: number) => a + b, 0) || 1;
  const months = shape.map((w: number) => (g.revenue * w) / sum);
  const m = Number(now.toLocaleDateString("en-AU", { month: "numeric", timeZone: "Australia/Melbourne" })) - 1;
  const current = g.basis === "calendar" ? m : (m + 6) % 12;
  // Every empty goal filled in at what the year goal needs: the Pace plan's
  // year, a month at a time, at the rates we really run at; the benchmark where
  // the plan has nothing to say. Shown, not saved, until somebody saves them.
  const pace = board?.metrics.pace ?? null;
  const goalWords = `to hit ${shortMoney(g.revenue)}`;
  const suggest: Record<string, { v: number; why: string }> = {};
  if (pace?.year.quoted.count) suggest.quotesMonth = { v: Math.round(pace.year.quoted.count / 12), why: goalWords };
  if (pace?.year.completed.count) suggest.jobsMonth = { v: Math.round(pace.year.completed.count / 12), why: goalWords };
  if (pace?.rates.avgSale.value) suggest.avgJob = { v: Math.round(pace.rates.avgSale.value / 10) * 10, why: "at the average the plan runs on" };
  suggest.wagesPct = { v: BENCH.wages.hi, why: "at the top of the healthy band" };
  suggest.profitPct = { v: BENCH.np.lo, why: "at the bottom of the healthy band" };

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Goals" sub="The numbers the whole portal is built on · change one here and every page updates" info={[
          ["Goal", "What we aim for this year. Home, Our KPIs, Sales, Pace and the wall board measure against these."],
          ["Win rate", "The rate to aim for. How many quotes the year needs is still worked out from the rate we’re really winning at, so a high aim doesn’t shrink the work the plan asks for."],
          ["No goal", "Leave a box empty and the pages that use it say “No goal yet” instead of marking it good or bad."],
          ["Benchmarks", "What a healthy service trade looks like. They’re fixed and shown beside these on Our KPIs."],
        ]} />
        <Say>These are the numbers every page is measured against. Change one and Home, Our KPIs, Sales, Pace and the wall board all update.</Say>
        <GoalsForm months={months} labels={labels} current={current} lower={g.floorRevenue} profitPct={g.profitPct} goals={goals} canSave={can(user, "overhead")} suggest={suggest} />
      </div>
    </PortalShell>
  );
}
