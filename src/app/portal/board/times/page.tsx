import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { StandardTimes } from "@/components/portal/StandardTimes";
import { dbConfigured } from "@/lib/portal/db";
import { readStandardTimes } from "@/lib/board/standardTimes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Standard times — Team portal" };

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

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/board" label="Wall board" />
      <div className="pt-head">
        <h1>Standard times</h1>
        <p>
          How long each kind of job should take. The wall board&rsquo;s <strong>Daily pace</strong> page measures each
          tech&rsquo;s hours against what the job was quoted to take — and most service work is billed without an hourly
          labour line, so without these the dial has nothing to measure against. A job that <em>was</em> quoted in hours
          still uses its own quote; this only fills in the ones that weren&rsquo;t.
        </p>
      </div>
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected,</strong> so nothing can be saved yet.
        </div>
      )}
      <StandardTimes rows={rows} set={set} />
    </PortalShell>
  );
}
