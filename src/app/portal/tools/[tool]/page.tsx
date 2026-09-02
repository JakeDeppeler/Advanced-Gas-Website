import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { HeatPumpSizing } from "@/app/tools/heat-pump-sizing/HeatPumpSizing";
import { VeuRebateEstimator } from "@/app/tools/veu-rebate-estimator/VeuRebateEstimator";
import { RunningCostCalculator } from "@/app/tools/running-cost-calculator/RunningCostCalculator";
import { FaultCodeLookup } from "@/app/tools/fault-codes/FaultCodeLookup";
import "@/app/detail.css";
import "@/app/tools/tools.css";

export const dynamic = "force-dynamic";

// The real calculators, rendered natively inside the portal shell.
const TOOLS: Record<string, { title: string; blurb: string; el: ReactNode }> = {
  "heat-pump-sizing": {
    title: "Heat pump sizing",
    blurb: "Size a tank off shower draw-off, not bedroom count.",
    el: <HeatPumpSizing />,
  },
  "veu-rebate-estimator": {
    title: "VEU rebate estimator",
    blurb: "Ballpark the rebate before a site visit.",
    el: <VeuRebateEstimator />,
  },
  "running-cost-calculator": {
    title: "Running cost calculator",
    blurb: "Heat pump vs gas running costs, for the quote.",
    el: <RunningCostCalculator />,
  },
  "fault-codes": {
    title: "Fault-code finder",
    blurb: "Look up a brand and fault code on site.",
    el: <FaultCodeLookup />,
  },
};

export function generateMetadata({ params }: { params: { tool: string } }) {
  const t = TOOLS[params.tool];
  return { title: t ? `${t.title} — Tools — Team portal` : "Tools — Team portal" };
}

export default async function PortalToolPage({ params }: { params: { tool: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const t = TOOLS[params.tool];
  if (!t) notFound();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">
          <Link href="/portal/tools" style={{ color: "inherit", textDecoration: "none" }}>Tools</Link> · {t.title}
        </div>
        <h1>{t.title}.</h1>
        <p>{t.blurb}</p>
      </div>
      <div className="pt-toolwrap">{t.el}</div>
    </PortalShell>
  );
}
