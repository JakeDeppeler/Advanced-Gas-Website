import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { MondayJobs } from "@/components/portal/MondayJobs";
import { mondayWeek } from "@/lib/portal/monday";
import { MONDAY_STEPS, type StepKey } from "@/components/portal/mondayJobs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Monday van jobs — Trade portal" };

const isStep = (v: string | undefined): v is StepKey => MONDAY_STEPS.some((s) => s.key === v);

export default async function TradeMonday({ searchParams }: { searchParams: { step?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const week = await mondayWeek(user.id);

  return (
    <TradeShell
      user={user}
      active="/trade/monday"
      title="Monday van jobs"
      sub={week.van ? `${week.van.name}${week.van.rego ? ` · ${week.van.rego}` : ""} · due by 8am` : "No van signed to you"}
      action={<span className="tr-count-badge">{week.done} of {week.steps.length} done</span>}
    >
      {week.van ? (
        <MondayJobs
          vanId={week.van.id}
          vanName={week.van.name}
          steps={week.steps}
          shot={week.shot}
          weeklyItems={week.weekly?.items ?? {}}
          weeklyNotes={week.weekly?.notes ?? ""}
          stockItems={week.stockItems ?? {}}
          lastKm={week.lastKm}
          // Carry on where the week is up to, unless a link asked for a step.
          start={isStep(searchParams.step) ? searchParams.step : week.next}
        />
      ) : (
        <div className="tr-card tr-stack">
          <h2>No van is signed to you yet</h2>
          <p style={{ margin: 0 }}>
            The Monday jobs are done on the van you&rsquo;re signed to, so there&rsquo;s nothing here until the office
            signs you one. Everything else in the portal works as normal.
          </p>
          <Link href="/trade" className="tr-btn" style={{ alignSelf: "flex-start" }}>Back to home</Link>
        </div>
      )}
    </TradeShell>
  );
}
