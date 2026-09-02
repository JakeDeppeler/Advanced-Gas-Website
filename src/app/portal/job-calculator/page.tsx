import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { JobCalculator } from "@/components/portal/JobCalculator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job calculator — Team portal" };

export default async function JobCalculatorPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Job calculator</div>
        <h1>Price a job by the hours.</h1>
        <p>Put in how many are on the tools and for how long, add materials, and it works out the labour and a price to quote from — using your charge-out rate.</p>
      </div>
      <JobCalculator />
    </PortalShell>
  );
}
