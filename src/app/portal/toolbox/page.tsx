import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead } from "@/components/portal/kit/Kit";
import { ToolboxList } from "@/components/portal/daily/ToolboxList";
import { dayWords, inDays, shortDate } from "@/lib/daily/summary";
import { loadSchedule, loadToolbox } from "@/lib/toolbox/store";
import { timeWords, upcoming } from "@/lib/toolbox/types";
import { todayMelbourne } from "@/lib/todos/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toolbox talks · Team portal" };

/**
 * Daily tools › Toolbox talks, as a list (Jake, 28 Nov: "just needs to be a
 * list to talk about, like the to-do"). What's to talk about, ticked off once
 * the crew's been through it, and what's been talked about, with the day.
 * The talk's day stays as it was set (weekly on Mondays); it only dates the
 * cards now.
 */
export default async function ToolboxPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const today = todayMelbourne();
  const [box, schedule] = await Promise.all([loadToolbox(), loadSchedule(today)]);
  const [next] = upcoming(schedule, today, 1);
  const days = next ? Math.round((Date.parse(`${next}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000) : null;
  const month = today.slice(0, 7);
  const thisMonth = box.talks.filter((t) => t.on.startsWith(month)).length;
  const monthName = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" });

  return (
    <PortalShell user={user}>
      <div className="rp">
        <KpiHead hi={`Daily tools · ${dayWords()}`} title="Toolbox talks" kpis={[
          ...(next && days != null ? [{ icon: "calendar", fig: shortDate(next), label: schedule.time ? `Next talk, ${timeWords(schedule.time)}` : "Next talk", badge: inDays(days), tone: "gold" as const }] : []),
          { icon: "doc", fig: String(box.topics.length), label: "To talk about" },
          { icon: "check", fig: String(thisMonth), label: `Talked about in ${monthName}` },
        ]} />
      </div>
      <ToolboxList topics={box.topics} talks={box.talks} next={next ? shortDate(next) : null} />
    </PortalShell>
  );
}
