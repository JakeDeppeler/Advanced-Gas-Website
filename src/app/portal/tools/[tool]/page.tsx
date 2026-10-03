import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PortalBack } from "@/components/portal/PortalBack";
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

/** The tab strip across the tools, in the design's order. The price list is
 *  the one that leaves the portal, and says so. */
const TABS: { href: string; label: string; out?: boolean }[] = [
  { href: "/portal/tools/heat-pump-sizing", label: "Heat pump sizing" },
  { href: "/portal/tools/veu-rebate-estimator", label: "VEU rebate" },
  { href: "/portal/tools/running-cost-calculator", label: "Running cost" },
  { href: "/portal/tools/fault-codes", label: "Fault codes" },
  { href: "/portal/job-calculator", label: "Job calculator" },
  { href: "/pricing", label: "Price list", out: true },
];

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
        <PortalBack href="/portal/tools" label="Tools" />
        <h1>{t.title}</h1>
        <p>{t.blurb}</p>
      </div>

      {/* Somebody on site moves between these all day — sizing, then the
          rebate, then the running cost for the same quote. Going back to the
          Tools page between each was three taps where this is one. */}
      <nav className="pt-tabs pt-tabs--inline" aria-label="Tools">
        {TABS.map((x) => {
          const on = x.href === `/portal/tools/${params.tool}`;
          return (
            <Link
              key={x.href}
              href={x.href}
              aria-current={on ? "page" : undefined}
              className={`pt-tab${on ? " is-on" : ""}`}
              {...(x.out ? { target: "_blank", rel: "noopener" } : {})}
            >
              {x.label}{x.out ? " ↗" : ""}
            </Link>
          );
        })}
      </nav>

      <div className="pt-toolwrap">{t.el}</div>
    </PortalShell>
  );
}
