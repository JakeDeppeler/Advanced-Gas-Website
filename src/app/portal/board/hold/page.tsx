import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { HoldTags } from "@/components/portal/HoldTags";
import { dbConfigured } from "@/lib/portal/db";
import { readHoldTags } from "@/lib/board/holdTags";

export const dynamic = "force-dynamic";
export const metadata = { title: "Held work · Team portal" };

/**
 * Which job tags mean a job is waiting on something, which is what the
 * portal's Stuck page counts. The wall board carried it until the office
 * asked for the money owed and owing in its place; the rules did not move.
 */
export default async function HoldTagsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  const ready = dbConfigured();
  const { rows, configured, held } = ready
    ? await readHoldTags().catch(() => ({ rows: [], configured: false, held: 0 }))
    : { rows: [], configured: false, held: 0 };

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/board" label="Wall board" />
      <div className="pt-head">
        <h1>Held work</h1>
        <p>
          The portal&rsquo;s <strong>Stuck</strong> page counts open jobs that are waiting on something, and the
          only thing in ServiceTitan that says what they are waiting on is the tag. Half the tags aren&rsquo;t holds at
          all, <em>Potential Member</em> sits on sixty-odd open jobs, so this is where the office says which ones are.
        </p>
        <p>
          <strong>On us</strong> is work somebody here can move today; <strong>on them</strong> is a quote or an answer
          we are waiting on a customer for. They are shown apart, because they go to different people.
        </p>
      </div>
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected,</strong> so nothing can be saved yet.
        </div>
      )}
      <HoldTags rows={rows} configured={configured} held={held} />
    </PortalShell>
  );
}
