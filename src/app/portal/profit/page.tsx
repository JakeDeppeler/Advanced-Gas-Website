import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { Needs } from "@/components/portal/marketingParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profit on every job — Team portal" };

/**
 * Margin, job by job. Not drawn, because nothing records what a job cost: the
 * replica's invoice cost column has never been written (0 of 5,399), there
 * are no hours per job and no materials against a job. A made-up margin on a
 * page called "profit on every job" is the number somebody would reprice off.
 * DASHBOARD.md has the long version.
 */
export default async function ProfitPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Profit on every job" forWhom="managers" />;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Profit on every job</h1>
        <p>What each job charged, what it cost in equipment, materials and hours, and the margin that fell out.</p>
      </div>

      <Figs
        cols={4}
        items={[
          { label: "Average margin", feature: true, value: null, needs: "target 25%" },
          { label: "Profit on these jobs", value: null, needs: "charged less every cost" },
          { label: "Under 25%", value: null, needs: "jobs" },
          { label: "Losing money", value: null, needs: "jobs" },
        ]}
      />

      <Needs
        title="What this needs"
        body="Every figure here is charged minus cost, and the cost half isn't recorded anywhere yet. In order of how much each would take:"
        bullets={[
          "Labour: hours on site per job from ServiceTitan. The cost per hour already exists on Costs & capacity, so hours alone give the labour cost",
          "Materials: Reece orders already carry a cost and a job reference — they need matching to the job they went onto",
          "Equipment: the pricebook knows what every unit costs us; it needs recording against the job it was installed on",
        ]}
      />
      <p className="pt-panel__sub">Company-wide profit, from the filed accounts, is on <Link href="/portal/finance">Finance</Link>.</p>
    </PortalShell>
  );
}
