import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PageHead } from "@/components/portal/kit/PageHead";
import { Locked } from "@/components/portal/Locked";
import { StandardTimes } from "@/components/portal/StandardTimes";
import { dbConfigured } from "@/lib/portal/db";
import { readStandardTimes, readVeuRebate } from "@/lib/board/standardTimes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Standard times · Team portal" };

/**
 * How long each kind of job should take, which is what the wall board's Daily
 * pace page measures a tech's day against.
 */
export default async function StandardTimesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  const ready = dbConfigured();
  const { rows, set } = ready ? await readStandardTimes().catch(() => ({ rows: [], set: 0 })) : { rows: [], set: 0 };
  const rebate = ready ? await readVeuRebate().catch(() => null) : null;

  return (
    <PortalShell user={user}>
      <div className="sx">
      <PageHead hi="Wall board" title="Standard times" line="How long each kind of job should take, read from and saved to ServiceTitan's job types."
        kpis={[
          { icon: "clock", fig: `${rows.filter((r) => r.from === "servicetitan").length} of ${rows.length}`, label: "Job types with a time in ServiceTitan" },
          { icon: "alert", fig: String(rows.filter((r) => r.jobs > 0 && r.hours == null).length), label: "Booked lately with no time" },
        ]}
        info={<p>The Daily pace page measures each tech&rsquo;s hours against what the job should take. A job quoted in hours uses its own quote; these fill in the rest. Saving a time here changes the job type&rsquo;s duration in ServiceTitan, so dispatch books the same length of slot.</p>} />
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected,</strong> so nothing can be saved yet.
        </div>
      )}
      <StandardTimes rows={rows} set={set} rebate={rebate} />
    </div>
    </PortalShell>
  );
}
