import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, VanTabs } from "@/components/portal/TradeShell";
import { WeeklyCheck } from "@/components/portal/WeeklyCheck";
import { NoVan } from "@/components/portal/tradeVan";
import { mondayWeek } from "@/lib/portal/monday";
import { MONDAY_STEPS, isoDay, type StepKey } from "@/components/portal/mondayJobs";
import { mondayOf } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly van check — Trade portal" };

const isStep = (v: string | undefined): v is StepKey => MONDAY_STEPS.some((s) => s.key === v);

/**
 * The A1 weekly van check as a six-step stepper. Opens on the first step not
 * yet finished, unless a link asked for one.
 */
export default async function TradeWeeklyCheck({ searchParams }: { searchParams: { step?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const week = await mondayWeek(user.id);
  const monday = mondayOf(localToday());
  const weekLabel = `Week of ${monday.toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" })}`;

  return (
    <TradeShell
      user={user} active="van"
      title="Weekly van check"
      sub={week.van ? `${week.van.name}${week.van.rego ? ` · ${week.van.rego}` : ""} · A1 · due Monday by 8am` : "No van signed to you"}
    >
      <VanTabs on="check" />
      {week.van ? (
        <WeeklyCheck
          key={isoDay(monday)}
          weekLabel={weekLabel}
          steps={week.steps}
          shot={week.shot}
          photoKeys={week.photoKeys}
          weeklyItems={week.weekly?.items ?? {}}
          stockItems={week.stockItems ?? {}}
          lastKm={week.lastKm}
          km={week.km}
          start={isStep(searchParams.step) ? searchParams.step : week.next}
        />
      ) : (
        <NoVan />
      )}
    </TradeShell>
  );
}
