import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { getAccessMap, dbConfigured } from "@/lib/portal/db";
import { DEFAULT_ACCESS } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { AccessEditor } from "@/components/portal/AccessEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Access levels — Team portal" };

export default async function AccessPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) redirect("/portal?denied=1");

  const map = dbConfigured() ? await getAccessMap() : DEFAULT_ACCESS;

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/admin" label="Admin" />
        <div className="pt-head__eyebrow">Admin · Access levels</div>
        <h1>Who can see what.</h1>
        <p>Set what each crew level gets access to. Change someone&rsquo;s level on the Team page and their access follows automatically.</p>
      </div>
      <AccessEditor initial={map as unknown as Record<string, string[]>} />
    </PortalShell>
  );
}
