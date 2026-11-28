import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalSizing } from "@/components/portal/tools/PortalSizing";
import { PortalRunning } from "@/components/portal/tools/PortalRunning";
import { PortalFaults } from "@/components/portal/tools/PortalFaults";
import { KpiHead, type Kpi } from "@/components/portal/kit/Kit";
import { faultReach } from "@/lib/daily/summary";

export const dynamic = "force-dynamic";

/**
 * A trade tool, one to a page under Daily tools. The tools are found on the
 * Daily tools page and gone back to from there (Jake, 28 Nov: "we don't need
 * the sub tool, they can go back to the main page to get the main tools"), so
 * there is no row of them here. The VEU estimator went the same day; the
 * public site keeps its own, and an old link to the portal's lands on the
 * Daily tools page.
 *
 * These are the portal's own versions of the public calculators, dressed as
 * the Daily tools page is: white panels, the write-up's pill fields, and the
 * answer on forest. The maths lives in lib/tools so the two can't disagree.
 */
const TOOLS: Record<string, { title: string; lede: string; el: ReactNode }> = {
  "heat-pump-sizing": { title: "Heat pump sizing", lede: "The showers, and the tank that covers them.", el: <PortalSizing /> },
  "running-cost-calculator": { title: "Running cost", lede: "Aircon and hot water running costs, for the quote.", el: <PortalRunning /> },
  "fault-codes": { title: "Fault-code finder", lede: "Look up a brand and fault code on site.", el: <PortalFaults /> },
};

export function generateMetadata({ params }: { params: { tool: string } }) {
  const t = TOOLS[params.tool];
  return { title: t ? `${t.title}, Tools · Team portal` : "Tools · Team portal" };
}

export default async function PortalToolPage({ params }: { params: { tool: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  if (params.tool === "veu-rebate-estimator") redirect("/portal/daily");
  const t = TOOLS[params.tool];
  if (!t) notFound();
  // The finder's reach beside its title; the calculators carry their answer in the page.
  const reach = faultReach();
  const kpis: Kpi[] = params.tool === "fault-codes" ? [{ icon: "alert", fig: String(reach.codes), label: "Fault codes" }, { icon: "tag", fig: String(reach.brands), label: "Brands" }] : [];

  return (
    <PortalShell user={user}>
      <div className="rp">
        <KpiHead hi={`Daily tools · ${t.lede}`} title={t.title} kpis={kpis} />
      </div>
      <div className="ptl">
        {t.el}
      </div>
    </PortalShell>
  );
}
