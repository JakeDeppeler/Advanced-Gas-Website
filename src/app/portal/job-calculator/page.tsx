import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { JobCalculator, type CrewRate } from "@/components/portal/JobCalculator";
import { listUsers, getCapSettings, dbConfigured } from "@/lib/portal/db";
import { computeCapacity, DEFAULT_SETTINGS, LEVEL_BILLABLE, LEVEL_LABEL, type CrewLevel } from "@/lib/portal/crew";
import { money2 } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job calculator — Team portal" };

export default async function JobCalculatorPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  let crew: CrewRate[] = [];
  let costPerHr: number | null = null;
  let costPerHrOnsite: number | null = null;
  // What an hour of each kind of person costs, and how much of that is the
  // shared overhead rather than their pay. Shown in the heading because it is
  // the arithmetic underneath every figure the calculator produces, and
  // pricing a job without it in front of you is guessing.
  let figures: { label: string; sub: string; mobile: number | null; onsite: number | null }[] = [];
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

    // An average across everyone on that level. Two tradesmen on different
    // wages give one figure for "a tradesman", which is what you want when the
    // question is what the hour costs rather than what Dave costs.
    const levelCost = (cap: typeof capMobile, level: CrewLevel) => {
      const ids = new Set(people.filter((p) => p.level === level).map((p) => p.id));
      const rows = cap.rates.filter((r) => ids.has(r.id) && r.costPerHr != null);
      if (!rows.length) return null;
      return rows.reduce((a, r) => a + (r.costPerHr as number), 0) / rows.length;
    };
    const oh = (cap: typeof capMobile) => (cap.totalBillHrs > 0 ? cap.sharedPerHr : null);
    // Two different figures wear the same "$/hr" label, and saying so matters.
    // Someone with their own van carries a share of the overhead in their hour.
    // Someone riding along does not: their cost is deliberately kept out of the
    // shared pool and comes back as an uplift on the crew they go out in, so
    // their figure is their whole cost spread over that van's hours.
    const ridesAlong = (lv: CrewLevel) =>
      people.filter((p) => p.level === lv).every((p) => !p.costing.ownVan);
    const levels: CrewLevel[] = ["tradesman", "apprentice"];
    figures = [
      ...levels
        .filter((lv) => people.some((p) => p.level === lv))
        .map((lv) => ({
          label: LEVEL_LABEL[lv],
          sub: ridesAlong(lv)
            ? "Their whole cost, over the hours of the van they ride in"
            : "Their pay, on-costs and their hour's share of overhead",
          mobile: levelCost(capMobile, lv),
          onsite: levelCost(capOnsite, lv),
        })),
      {
        label: "Overhead",
        sub: "The share sitting inside both figures above",
        mobile: oh(capMobile),
        onsite: oh(capOnsite),
      },
    ].filter((f) => f.mobile !== null || f.onsite !== null);
  }

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
