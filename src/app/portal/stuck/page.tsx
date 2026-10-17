import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Stuck } from "@/components/portal/Stuck";
import { dbConfigured } from "@/lib/portal/db";
import { stuckView } from "@/lib/portal/stuck";
import { emptyBanded, type StuckView } from "@/lib/portal/stuckTypes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Where the money's stuck · Team portal" };

const EMPTY: StuckView = {
  unbilled: { bands: emptyBanded(), oldest: [], unknownType: 0, noCharge: 0, quoteVisits: 0 },
  owed: { bands: emptyBanded(), notDueYet: { count: 0, value: 0 }, oldest: [] },
  held: null,
  sinceDays: 180,
};

/**
 * Everything that has stopped between finishing a job and banking the money.
 *
 * Three bands in the order the money moves — finished and never billed, billed
 * and not paid, and jobs that stopped before either — each cut the same way by
 * how long it has been sitting.
 */
export default async function StuckPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The money" forWhom="managers" />;

  const ready = dbConfigured();
  const v = ready ? await stuckView().catch(() => EMPTY) : EMPTY;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/money" label="Money" />
      <div className="pt-head">
        <h1>Where the money&rsquo;s stuck</h1>
        <p>
          Between finishing a job and banking the money there are three places it stops: the work is done and nobody
          has billed it, the invoice is out and nobody has paid it, or the job itself has stopped. This is all three,
          cut the same way by how long each has been sitting, so the only question that matters, whether it is getting
          worse, is asked the same way three times.
        </p>
      </div>
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected,</strong> so there is nothing to count yet.
        </div>
      )}
      <Stuck v={v} />
    </PortalShell>
  );
}
