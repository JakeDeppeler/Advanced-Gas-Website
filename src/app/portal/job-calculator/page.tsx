import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { JobCalculator, type CrewRate } from "@/components/portal/JobCalculator";
import { listUsers, getCapSettings, dbConfigured } from "@/lib/portal/db";
import { computeCapacity, DEFAULT_SETTINGS, type CrewLevel } from "@/lib/portal/crew";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job calculator — Team portal" };

export default async function JobCalculatorPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  let crew: CrewRate[] = [];
  if (dbConfigured()) {
    const [users, settings] = await Promise.all([listUsers(), getCapSettings()]);
    const people = users
      .filter((u) => u.active && u.id && u.level)
      .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
    const cap = computeCapacity(people, settings ?? DEFAULT_SETTINGS);
    const rate = new Map(cap.rates.map((r) => [r.id, r.rate]));
    crew = people
      .filter((p) => rate.get(p.id) != null)
      .map((p) => ({ id: p.id, name: p.name, level: p.level, rate: Math.round(rate.get(p.id) as number) }));
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Job calculator</div>
        <h1>Price a job by who&rsquo;s on it.</h1>
        <p>Tick who&rsquo;s on the job and their hours — each person prices at their own charge-out rate — then add materials.</p>
      </div>
      <JobCalculator crew={crew} />
    </PortalShell>
  );
}
