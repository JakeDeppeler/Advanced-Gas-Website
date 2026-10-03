import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { PortalBack } from "@/components/portal/PortalBack";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalSizing } from "@/components/portal/tools/PortalSizing";
import { PortalVeu } from "@/components/portal/tools/PortalVeu";
import { PortalRunning } from "@/components/portal/tools/PortalRunning";
import { PortalFaults } from "@/components/portal/tools/PortalFaults";

export const dynamic = "force-dynamic";

/**
 * Tools, to Tools.dc.html: one page with a tab per tool.
 *
 * The portal used to render the public site's calculators here, in the public
 * site's clothes. These are the design's own versions — steppers, a card per
 * compressor, the answer on navy — running the same maths as the public
 * calculators, which live in lib/tools so the two can't disagree.
 */
const TOOLS: Record<string, { tab: string; title: string; lede: string; el: ReactNode }> = {
  "heat-pump-sizing": { tab: "Heat pump sizing", title: "Heat pump sizing", lede: "Size a tank off shower draw-off, not bedroom count.", el: <PortalSizing /> },
  "veu-rebate-estimator": { tab: "VEU rebate", title: "VEU rebate estimator", lede: "Ballpark the rebate before a site visit.", el: <PortalVeu /> },
  "running-cost-calculator": { tab: "Running cost", title: "Running cost", lede: "Heat pump vs gas running costs, for the quote.", el: <PortalRunning /> },
  "fault-codes": { tab: "Fault codes", title: "Fault-code finder", lede: "Look up a brand and fault code on site.", el: <PortalFaults /> },
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
      <div className="ptl">
        <div className="pt-head">
          {/* Home: the tabs are siblings, and the strip below moves between them. */}
          <PortalBack href="/portal" label="Home" />
          <h1>{t.title}</h1>
          <p>{t.lede}</p>
        </div>

        <nav className="pt-tabs" aria-label="Tools">
          {Object.entries(TOOLS).map(([slug, x]) => {
            const on = slug === params.tool;
            return (
              <Link key={slug} href={`/portal/tools/${slug}`} aria-current={on ? "page" : undefined} className={`pt-tab${on ? " is-on" : ""}`}>
                {x.tab}
              </Link>
            );
          })}
          <a href="/pricing" target="_blank" rel="noopener" className="pt-tab">Price list ↗</a>
        </nav>

        {t.el}
      </div>
    </PortalShell>
  );
}
