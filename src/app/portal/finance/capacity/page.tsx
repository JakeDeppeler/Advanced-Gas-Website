import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { CapacityCalc } from "@/components/portal/CapacityCalc";

export const metadata = { title: "Billable capacity — Team portal" };

export default async function CapacityPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Billable capacity</div>
        <h1>What an hour has to cover.</h1>
        <p>Work out the hours you can actually bill — after leave, sick, apprentice school, driving and admin — then stack every overhead on top to get a true charge-out rate.</p>
      </div>
      <CapacityCalc />
    </PortalShell>
  );
}
