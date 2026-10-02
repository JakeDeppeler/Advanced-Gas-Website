import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { JobCalculator } from "@/components/portal/JobCalculator";
import { crewFigures } from "@/lib/portal/crewRates";
import { money2 } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job calculator — Team portal" };

export default async function JobCalculatorPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  // What an hour of each kind of person costs, and how much of that is the
  // shared overhead rather than their pay. Shown in the heading because it is
  // the arithmetic underneath every figure the calculator produces, and pricing
  // a job without it in front of you is guessing. Read from one place: the
  // trade portal's on-site calculator prices off the same figures.
  const { crew, costPerHr, costPerHrOnsite, figures } = await crewFigures();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Job calculator</div>
        <h1>Price a job by who&rsquo;s on it.</h1>
        <p>Pick the job, who&rsquo;s on it and for how long. Each person prices at their own charge-out rate, and a day parked on one site prices differently to a day crossing the shire. Add travel and materials and it tells you what&rsquo;s actually left in it.</p>
        {figures.length > 0 && (
          <div className="pt-head__figs">
            {figures.map((f) => (
              <div key={f.label} className="pt-head__fig">
                <span className="pt-head__figlbl">{f.label}</span>
                <strong className="pt-head__figval">
                  {f.mobile !== null ? <>{money2(f.mobile)}<em>/hr</em></> : "Not costed"}
                </strong>
                <span className="pt-head__figalt">
                  {f.onsite !== null ? `${money2(f.onsite)}/hr on site` : "no on-site figure yet"}
                </span>
                <span className="pt-head__figsub">{f.sub}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <JobCalculator crew={crew} costPerHr={costPerHr} costPerHrOnsite={costPerHrOnsite} calloutFee={165} />
    </PortalShell>
  );
}
