import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { getSettings } from "@/lib/portal/db";
import { readYearGoal } from "@/lib/portal/yearGoal";
import { getGoals } from "@/lib/portal/goals";
import { Head, Say } from "@/components/portal/kit/Kit";
import { GoalsForm } from "@/components/portal/numbers/GoalsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Goals — Team portal" };

const FY = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const CAL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Our numbers › Goals: every goal the portal measures against, in one place.
 * The year's sales and how they fall by month, the profit % and the win rate
 * are the year goal (the same record Pace and the wall board read); the rest
 * are portal_settings.goals.
 */
export default async function GoalsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Goals" forWhom="the office" />;

  const [row, goals] = await Promise.all([getSettings<unknown>("yeargoal").catch(() => null), getGoals()]);
  const now = new Date();
  const g = readYearGoal(row, now);
  const labels = g.basis === "calendar" ? CAL : FY;
  const shape = g.shape && g.shape.some((v) => v > 0) ? g.shape : Array(12).fill(1);
  const sum = shape.reduce((a: number, b: number) => a + b, 0) || 1;
  const months = shape.map((w: number) => (g.revenue * w) / sum);
  const m = Number(now.toLocaleDateString("en-AU", { month: "numeric", timeZone: "Australia/Melbourne" })) - 1;
  const current = g.basis === "calendar" ? m : (m + 6) % 12;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Goals" sub="The numbers the whole portal is built on · change one here and every page updates" info={[
          ["Goal", "What we aim for this year. Home, Our KPIs, Sales, Pace and the wall board measure against these."],
          ["No goal", "Leave a box empty and the pages that use it say “No goal yet” instead of marking it good or bad."],
          ["Benchmarks", "What a healthy service trade looks like. They’re fixed and shown beside these on Our KPIs."],
        ]} />
        <Say>These are the numbers every page is measured against. Change one and Home, Our KPIs, Sales, Pace and the wall board all update.</Say>
        <GoalsForm months={months} labels={labels} current={current} profitPct={g.profitPct} winRatePct={g.winRatePct} goals={goals} canSave={can(user, "overhead")} />
      </div>
    </PortalShell>
  );
}
