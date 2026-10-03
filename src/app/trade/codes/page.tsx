import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { TradeFaults } from "@/components/portal/TradeFaults";
import { HeatPumpSizing } from "@/app/tools/heat-pump-sizing/HeatPumpSizing";
import { VeuRebateEstimator } from "@/app/tools/veu-rebate-estimator/VeuRebateEstimator";
import { RunningCostCalculator } from "@/app/tools/running-cost-calculator/RunningCostCalculator";
import "@/app/detail.css";
import "@/app/tools/tools.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Codes & sizing — Trade portal" };

/**
 * Fault codes, sizing, rebates and running cost — the same tools the public
 * site runs, not a trade-sized copy. A sizing answer in the van that differed
 * from the website's would be found out by the first customer who checked.
 */
const TABS: { slug: string; label: string; el: (q: string) => ReactNode }[] = [
  { slug: "faults", label: "Fault codes", el: (q) => <TradeFaults initial={q} /> },
  { slug: "sizing", label: "Heat pump sizing", el: () => <div className="tr-card tr-toolwrap"><HeatPumpSizing /></div> },
  { slug: "veu", label: "VEU rebate", el: () => <div className="tr-card tr-toolwrap"><VeuRebateEstimator /></div> },
  { slug: "running-cost", label: "Running cost", el: () => <div className="tr-card tr-toolwrap"><RunningCostCalculator /></div> },
];

export default async function TradeCodes({ searchParams }: { searchParams: { t?: string; q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const tab = TABS.find((t) => t.slug === searchParams.t) ?? TABS[0];

  return (
    <TradeShell user={user} active="tools" title="Codes & sizing" sub="Fault codes, sizing and rebates, on site">
      <nav className="tr-pills" aria-label="Codes and sizing">
        {TABS.map((t) => (
          <Link key={t.slug} href={`/trade/codes${t.slug === "faults" ? "" : `?t=${t.slug}`}`} aria-current={t.slug === tab.slug ? "page" : undefined} className={`tr-pill${t.slug === tab.slug ? " is-on" : ""}`}>{t.label}</Link>
        ))}
      </nav>
      {tab.el(searchParams.q ?? "")}
    </TradeShell>
  );
}
