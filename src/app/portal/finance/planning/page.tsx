import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getCapSettings, getSettings, listQuotes, dbConfigured } from "@/lib/portal/db";
import { computeCapacity, overheadSplit, overheadTotal, scaleModel, DEFAULT_SETTINGS, type CrewLevel, type ScaleRow } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { ScenarioPlanner } from "@/components/portal/ScenarioPlanner";
import { FinancePlanner } from "@/components/portal/FinancePlanner";
import { RevenuePlanner } from "@/components/portal/RevenuePlanner";
import type { Targets, Capacity } from "@/lib/portal/targets";
import { VanScaling } from "@/components/portal/VanScaling";
import { xeroStatus, getProfitAndLoss, localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planning — Team portal" };

export default async function PlanningPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  // The year's profit so far, so the target has something to measure against.
  const { status } = await xeroStatus();
  const t = localToday();
  const yearProfit = status === "connected"
    ? (await getProfitAndLoss(
        new Date(Date.UTC(t.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10),
        t.toISOString().slice(0, 10),
      ))?.netProfit ?? null
    : null;

  let charge = 0, cost = 0;
  // What the crew can actually bill, so the target has something to be
  // measured against rather than just divided up.
  let capacity: Capacity | null = null;
  const targets = dbConfigured() ? await getSettings<Targets>("targets") : null;

  // What has actually happened, so the two assumptions in the planner have a
  // real number to start from rather than a guess that never gets revisited.
  let actual: { winRate: number | null; avgJob: number | null; won: number } = { winRate: null, avgJob: null, won: 0 };
  if (dbConfigured()) {
    const quotes = await listQuotes();
    const won = quotes.filter((q) => q.status === "won");
    const lost = quotes.filter((q) => q.status === "lost");
    const won$ = won.reduce((a, q) => a + q.amount, 0);
    const decided$ = won$ + lost.reduce((a, q) => a + q.amount, 0);
    actual = {
      winRate: decided$ > 0 ? Math.round((won$ / decided$) * 100) : null,
      avgJob: won.length > 0 ? Math.round(won$ / won.length) : null,
      won: won.length,
    };
  }
  // What another van does to the numbers. It used to be a tab on the costing
  // page, beside four tabs about the business as it stands; it is a question
  // about next year, so it lives here.
  let scale: ScaleRow[] = [];
  let split = { fixed: 0, perVan: 0 };
  let officeOh = 0, ohTotal = 0;
  if (dbConfigured()) {
    const [users, settings] = await Promise.all([listUsers(), getCapSettings()]);
    const s = settings ?? DEFAULT_SETTINGS;
    const people = users.filter((u) => u.active && u.id && u.level).map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
    const cap = computeCapacity(people, s);
    cost = Math.round(cap.costPerHr);
    charge = Math.round(cap.costPerHr * (1 + s.margin / 100));
    capacity = {
      billHrs: cap.totalBillHrs,
      chargePerHr: cap.costPerHr * (1 + s.margin / 100),
      weeksYear: s.weeksYear,
      vans: cap.vanCount,
    };
    scale = scaleModel(cap, s);
    split = overheadSplit(s);
    officeOh = cap.officeOh;
    ohTotal = overheadTotal(s) + cap.labourOh + cap.officeOh;
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Future planning</div>
        <h1>Where we&rsquo;re headed.</h1>
        <p>The profit you&rsquo;re aiming at and how the year is tracking against it, then what that means for a week: the work to finish, the hours it takes and the quoting it takes to win it. After that the what-ifs, what another billable person adds and what a more economical van saves. Nothing here changes your live numbers.</p>
      </div>
      <FinancePlanner yearProfit={yearProfit} />
      <RevenuePlanner initial={targets} cap={capacity} actual={actual} canSave={dbConfigured()} />
      <ScenarioPlanner defaultCharge={charge} defaultCost={cost} />
      {scale.length > 0 && (
        <VanScaling scale={scale} split={split} officeOh={officeOh} ohTotal={ohTotal} />
      )}
    </PortalShell>
  );
}
