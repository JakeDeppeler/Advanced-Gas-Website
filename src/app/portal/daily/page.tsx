import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead, Say } from "@/components/portal/kit/Kit";
import { portalNav } from "@/lib/portal/nav";
import { getBusiness } from "@/lib/portal/business";
import { buildSections, flatPages } from "@/lib/portal/sections";
import { DailyTools, type ToolTile } from "@/components/portal/daily/DailyTools";
import { greeting } from "@/lib/daily/summary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily tools · Team portal" };

/**
 * Daily tools opens here: the one place to find a tool (Jake, 28 Nov). A tile
 * per tool, the four trade tools each their own, and a search over them. The
 * tiles follow the pages this person can open, so nobody sees a tile that
 * would turn them away.
 */
const ALL: Array<ToolTile & { gate: string }> = [
  { gate: "/portal/jobs/write-up", href: "/portal/jobs/write-up", name: "Job write-up", line: "The job summary and labour line, from the job and your notes", icon: "write", words: "quote invoice summary labour notes job" },
  { gate: "/portal/ducted", href: "/portal/ducted", name: "Ducted quote", line: "A ducted system priced from the duct plan, onto the job", icon: "duct", words: "ducted plan trust trade zones outlets quote" },
  { gate: "/portal/tools/fault-codes", href: "/portal/tools/fault-codes", name: "Fault codes", line: "Look up a brand and code on site", icon: "fault", words: "error code fault brand mitsubishi brivis rinnai" },
  { gate: "/portal/tools/fault-codes", href: "/portal/tools/heat-pump-sizing", name: "Heat pump sizing", line: "The showers, and the tank to fit", icon: "tank", words: "hot water tank size litres heat pump shower" },
  { gate: "/portal/tools/fault-codes", href: "/portal/tools/running-cost-calculator", name: "Running cost", line: "Aircon and hot water, for the quote", icon: "bolt", words: "running cost gas electric savings aircon heating hot water" },
  { gate: "/portal/toolbox", href: "/portal/toolbox", name: "Toolbox talks", line: "The list to talk the crew through", icon: "talk", words: "toolbox talk safety crew meeting topics" },
];

export default async function DailyToolsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const items = portalNav(user);
  const office = can(user, "overhead") || can(user, "manage_users");
  const area = buildSections(items, await getBusiness(), office).find((s) => s.id === "tools");
  // The area's tabs, and the pages this person can open that aren't a tab of
  // their own: the trade tools have no tab since the row of them went.
  const open = new Set([...flatPages(area?.pages ?? []).map((p) => p.href), ...items.map((i) => i.href)]);
  const tools = ALL.filter((t) => open.has(t.gate)).map(({ gate: _gate, ...t }) => t);

  return (
    <PortalShell user={user}>
      <div className="rp">
        <KpiHead hi={greeting(user.name)} title="Daily tools" kpis={[]} />
        {tools.length ? <DailyTools tools={tools} /> : <Say>None of the daily tools are open to you yet. Ask the office.</Say>}
      </div>
    </PortalShell>
  );
}
