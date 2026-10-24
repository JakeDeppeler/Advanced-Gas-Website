import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Card, Empty, KpiHead } from "@/components/portal/kit/Kit";
import { TrackerView } from "@/components/portal/jobflow/TrackerView";
import { ImportedCard } from "@/components/portal/jobflow/ImportedCard";
import { dbConfigured } from "@/lib/portal/db";
import { loadJobFlow } from "@/lib/jobflow/load";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job tracker · Team portal" };

/**
 * Pipeline › Job tracker: every job from the enquiry to the money in the
 * bank, in the stage it's stuck at, with what to do about it.
 *
 * The stages come from what ServiceTitan records, never from tags: a job
 * nobody tagged still lands in one (see lib/jobflow/types.ts for the rules).
 * The flow across the top is the whole business on one screen; each stage
 * underneath is the list to work, oldest first.
 */
export default async function TrackerPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The job tracker" forWhom="the office" />;

  const nowMs = Date.now();
  const flow = dbConfigured() ? await loadJobFlow(nowMs).catch(() => null) : null;

  return (
    <PortalShell user={user}>
      {flow ? (
        <TrackerView flow={flow} imported={
          <Suspense fallback={<Card title="Old jobs still open"><Empty>Checking the jobs the old system left open against Xero…</Empty></Card>}>
            <ImportedCard nowMs={nowMs} />
          </Suspense>
        } />
      ) : (
        <div className="pk">
          <KpiHead title={<>Job<br />tracker</>} kpis={[]} />
          <Empty>ServiceTitan couldn&rsquo;t be read just now. Try again in a minute.</Empty>
        </div>
      )}
    </PortalShell>
  );
}
