import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Card, Empty, Head } from "@/components/portal/kit/Kit";
import { JobNoteBox } from "@/components/portal/JobNoteBox";
import { TrackerView, type Open } from "@/components/portal/jobflow/TrackerView";
import { ImportedCard } from "@/components/portal/jobflow/ImportedCard";
import { dbConfigured } from "@/lib/portal/db";
import { loadJobFlow } from "@/lib/jobflow/load";
import { COLUMNS, STAGE, columnOf, type FlowStage } from "@/lib/jobflow/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job tracker · Team portal" };

/**
 * What's opened under the board, from the address: a column (?c=), the old
 * system's jobs (?c=old), or a stage (?s=, as links from before the board
 * still say), which opens the column it sits in.
 */
function pick(c: string | undefined, s: string | undefined): Open {
  if (c === "old" || s === "imported") return "old";
  const col = COLUMNS.find((x) => x.k === c);
  if (col) return col.k;
  return s && s in STAGE ? columnOf(s as FlowStage) : null;
}

/**
 * Pipeline › Job tracker: every job from the enquiry to the money in the
 * bank, in the stage it's stuck at, with what to do about it.
 *
 * The stages come from what ServiceTitan records, never from tags: a job
 * nobody tagged still lands in one (see lib/jobflow/types.ts for the rules).
 * A tile a step, and the picked step's jobs listed under them.
 */
export default async function TrackerPage({ searchParams }: { searchParams: { c?: string; s?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The job tracker" forWhom="the office" />;

  const nowMs = Date.now();
  const flow = dbConfigured() ? await loadJobFlow(nowMs).catch(() => null) : null;

  return (
    <PortalShell user={user}>
      {flow ? (
        <>
        <TrackerView flow={flow} open={pick(searchParams.c, searchParams.s)} imported={
          <Suspense fallback={<Card title="Old jobs still open"><Empty>Checking the jobs the old system left open against Xero…</Empty></Card>}>
            <ImportedCard nowMs={nowMs} />
          </Suspense>
        } />
        <div className="pk" style={{ marginTop: 18 }}>
          <Card title="Note on a job" aside="any job, by its number">
            <JobNoteBox idBase="trk-note" />
          </Card>
        </div>
        </>
      ) : (
        <div className="pk">
          <Head title="Job tracker" sub="Where every job is up to · ServiceTitan" />
          <Empty>ServiceTitan couldn&rsquo;t be read just now. Try again in a minute.</Empty>
        </div>
      )}
    </PortalShell>
  );
}
