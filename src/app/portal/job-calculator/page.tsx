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
  let costPerHrOnsite: number | null = null;
  if (dbConfigured()) {
    const [users, settings] = await Promise.all([listUsers(), getCapSettings()]);
    const people = users
      .filter((u) => u.active && u.id && u.level && LEVEL_BILLABLE[u.level as CrewLevel])
      .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
    // Both modes, priced at once. A job is either a mobile day or a day parked
    // on a site, and which one it is changes what the hour has to recover — so
    // the calculator carries both sets of rates and switches between them
    // rather than inheriting whatever the costing page was last left on.
    const base = settings ?? DEFAULT_SETTINGS;
    const capMobile = computeCapacity(people, { ...base, mode: "mobile" });
    const capOnsite = computeCapacity(people, { ...base, mode: "onsite" });
    const mob = new Map(capMobile.rates.map((r) => [r.id, r.rate]));
    const ons = new Map(capOnsite.rates.map((r) => [r.id, r.rate]));
    const round = (v: number | null | undefined) => (v != null ? Math.round(v) : null);
    // Anyone riding with a tech still comes through, listed but not chargeable —
    // seeing them greyed out is how the rule reads on the page.
    crew = people.map((p) => ({
      id: p.id, name: p.name, level: p.level,
      rate: round(mob.get(p.id)),
      rateOnsite: round(ons.get(p.id)),
    }));
    costPerHr = capMobile.totalBillHrs > 0 ? capMobile.costPerHr : null;
    costPerHrOnsite = capOnsite.totalBillHrs > 0 ? capOnsite.costPerHr : null;
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Job calculator</div>
        <h1>Price a job by who&rsquo;s on it.</h1>
        <p>Pick the job, who&rsquo;s on it and for how long. Each person prices at their own charge-out rate, and a day parked on one site prices differently to a day crossing the shire. Add travel and materials and it tells you what&rsquo;s actually left in it.</p>
      </div>
      <JobCalculator crew={crew} costPerHr={costPerHr} costPerHrOnsite={costPerHrOnsite} calloutFee={165} />
    </PortalShell>
  );
}
