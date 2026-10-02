import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { HeatPumpSizing } from "@/app/tools/heat-pump-sizing/HeatPumpSizing";
import { VeuRebateEstimator } from "@/app/tools/veu-rebate-estimator/VeuRebateEstimator";
import { RunningCostCalculator } from "@/app/tools/running-cost-calculator/RunningCostCalculator";
import { FaultCodeLookup } from "@/app/tools/fault-codes/FaultCodeLookup";
import "@/app/detail.css";
import "@/app/tools/tools.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tools — Trade portal" };

/**
 * The four tools, on site.
 *
 * The same components the public site and the office portal render — not a
 * trade-sized reimplementation of them. A sizing tool that gave a different
 * answer in the van than on the website would be found out by the first
 * customer who checked.
 *
 * Which one is open is in the URL, so a tech can keep the fault-code finder on
 * a home-screen shortcut.
 */
const TABS: { slug: string; label: string; blurb: string; el: ReactNode }[] = [
  { slug: "fault-codes", label: "Fault codes", blurb: "Look up a brand and fault code on site.", el: <FaultCodeLookup /> },
  { slug: "sizing", label: "Heat pump sizing", blurb: "Size a tank off shower draw-off, not bedroom count.", el: <HeatPumpSizing /> },
  { slug: "veu", label: "VEU rebate", blurb: "Ballpark the rebate before a site visit.", el: <VeuRebateEstimator /> },
  { slug: "running-cost", label: "Running cost", blurb: "Heat pump vs gas running costs, for the quote.", el: <RunningCostCalculator /> },
];

export default async function TradeTools({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const tab = TABS.find((t) => t.slug === searchParams.t) ?? TABS[0];

  return (
    <TradeShell user={user} active="/trade/tools" title="Tools" sub={tab.blurb}>
      <div className="tr-stack">
        <nav className="tr-pills" aria-label="Tools">
          {TABS.map((t) => (
            <Link key={t.slug} href={`/trade/tools?t=${t.slug}`} aria-current={t.slug === tab.slug ? "page" : undefined} className={`tr-pill${t.slug === tab.slug ? " is-on" : ""}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="tr-toolwrap">{tab.el}</div>
      </div>
    </TradeShell>
  );
}
