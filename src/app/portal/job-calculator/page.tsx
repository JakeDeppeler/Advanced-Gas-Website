import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { JobCalculator, type CrewRate } from "@/components/portal/JobCalculator";
import { listUsers, getCapSettings, dbConfigured } from "@/lib/portal/db";
import { computeCapacity, DEFAULT_SETTINGS, LEVEL_BILLABLE, type CrewLevel } from "@/lib/portal/crew";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job calculator — Team portal" };

export default async function JobCalculatorPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  let crew: CrewRate[] = [];
  let costPerHr: number | null = null;
  if (dbConfigured()) {
    const [users, settings] = await Promise.all([listUsers(), getCapSettings()]);
    const people = users
      .filter((u) => u.active && u.id && u.level && LEVEL_BILLABLE[u.level as CrewLevel])
      .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
    const cap = computeCapacity(people, settings ?? DEFAULT_SETTINGS);
    const rate = new Map(cap.rates.map((r) => [r.id, r.rate]));
    // Anyone riding with a tech still comes through, listed but not chargeable —
    // seeing them greyed out is how the rule reads on the page.
    crew = people.map((p) => {
      const r = rate.get(p.id);
      return { id: p.id, name: p.name, level: p.level, rate: r != null ? Math.round(r) : null };
    });
    costPerHr = cap.totalBillHrs > 0 ? cap.costPerHr : null;
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Job calculator</div>
        <h1>Price a job by who&rsquo;s on it.</h1>
        <p>Pick the job, who&rsquo;s on it and for how long — each person prices at their own charge-out rate — then add travel and materials. It prices the job and tells you what&rsquo;s actually left in it.</p>
      </div>
      <JobCalculator crew={crew} costPerHr={costPerHr} calloutFee={165} />
    </PortalShell>
  );
}
