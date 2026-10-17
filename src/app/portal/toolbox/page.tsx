import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead } from "@/components/portal/kit/Kit";
import { ToolboxBoard } from "@/components/portal/ToolboxBoard";
import { loadToolbox } from "@/lib/toolbox/store";
import { teamPeople, todayMelbourne } from "@/lib/todos/store";
import { dbConfigured } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toolbox talks · Team portal" };

/** To-do › Toolbox talks: what to talk the crew through, and a record of every talk given. */
export default async function ToolboxPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const today = todayMelbourne();
  const [box, people] = await Promise.all([loadToolbox(), dbConfigured() ? teamPeople().catch(() => []) : Promise.resolve([])]);
  const month = box.talks.filter((t) => t.on.slice(0, 7) === today.slice(0, 7)).length;
  const last = box.talks[0];
  return (
    <PortalShell user={user}>
      <KpiHead title={<>Toolbox<br />talks</>} kpis={[
        { icon: "doc", fig: String(box.topics.length), label: "Topics to talk through" },
        { icon: "trophy", fig: String(month), label: "Talks this month" },
        { icon: "clock", fig: last ? new Date(`${last.on}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }) : "None yet", label: "The last talk" },
      ]} />
      <p className="pk-note td-intro">Pick a topic, walk the crew through it, then save what was said: who was there, what came up and what was agreed. The record stays here.</p>
      <ToolboxBoard topics={box.topics} talks={box.talks} people={people.map((p) => p.name).sort()} me={user.name} today={today} />
    </PortalShell>
  );
}
