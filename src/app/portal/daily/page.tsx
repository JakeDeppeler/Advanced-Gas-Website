import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead, Say, type Kpi } from "@/components/portal/kit/Kit";
import { portalNav } from "@/lib/portal/nav";
import { getBusiness } from "@/lib/portal/business";
import { buildSections, flatPages } from "@/lib/portal/sections";
import { DailyTools, type ToolLinks } from "@/components/portal/daily/DailyTools";
import { faultReach, greeting, inDays, nextTalk, writeupSummary } from "@/lib/daily/summary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily tools · Team portal" };

/**
 * Daily tools opens here: a box for each tool (Jake, 25 Nov), dressed as the
 * home screen is (28 Nov): the greeting over a big title, the tools' figures
 * beside it in round icons, and a card per tool saying where it's up to.
 * The cards are the area's own pages (sections.ts) this person can open, so
 * nobody sees a box that would turn them away.
 */
export default async function DailyToolsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const items = portalNav(user);
  const office = can(user, "overhead") || can(user, "manage_users");
  const area = buildSections(items, await getBusiness(), office).find((s) => s.id === "tools");
  const hrefs = new Set(flatPages(area?.pages ?? []).map((p) => p.href));
  const links: ToolLinks = {
    writeup: hrefs.has("/portal/jobs/write-up") ? "/portal/jobs/write-up" : undefined,
    ducted: hrefs.has("/portal/ducted") ? "/portal/ducted" : undefined,
    trade: hrefs.has("/portal/tools/fault-codes") ? "/portal/tools/fault-codes" : undefined,
    toolbox: hrefs.has("/portal/toolbox") ? "/portal/toolbox" : undefined,
  };
  const [writeups, talk] = await Promise.all([links.writeup ? writeupSummary() : null, links.toolbox ? nextTalk() : null]);
  const faults = faultReach();

  // Each figure only when its tool is open to this person and it was read.
  const kpis: Kpi[] = [];
  if (writeups) kpis.push({ icon: "doc", fig: String(writeups.month), label: `Write-ups in ${writeups.monthName}`, href: links.writeup });
  if (talk) kpis.push({ icon: "calendar", fig: talk.short, label: "Next toolbox talk", badge: inDays(talk.days), tone: "gold", href: links.toolbox });
  if (talk) kpis.push({ icon: "clock", fig: String(talk.held), label: "Toolbox topics on hold", href: links.toolbox });
  if (links.trade) kpis.push({ icon: "alert", fig: String(faults.codes), label: `Fault codes, ${faults.brands} brands`, href: "/portal/tools/fault-codes" });

  const any = Object.values(links).some(Boolean);
  return (
    <PortalShell user={user}>
      <div className="rp">
        <KpiHead hi={greeting(user.name)} title={<>Daily<br />tools</>} kpis={kpis} />
        {any ? <DailyTools links={links} writeups={writeups} talk={talk} faults={faults} /> : <Say>None of the daily tools are open to you yet. Ask the office.</Say>}
      </div>
    </PortalShell>
  );
}
