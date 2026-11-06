import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Head } from "@/components/portal/kit/Kit";
import { ToolboxPlan } from "@/components/portal/ToolboxPlan";
import { loadSchedule, loadSessions, loadToolbox } from "@/lib/toolbox/store";
import { past, timeWords, upcoming } from "@/lib/toolbox/types";
import { teamPeople, todayMelbourne } from "@/lib/todos/store";
import { dbConfigured } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Toolbox talks · Team portal" };

/**
 * How far back to look for talks, and how many of the latest schedule dates
 * to list even with nothing on them, so a missed talk shows as missed
 * without a year of empty weeks under it.
 */
const LOOK_BACK = 52;
const RECENT = 3;

/**
 * To-do › Toolbox talks: a talk every week, fortnight or month. The next
 * talk and its topics, what's on hold for a later one, and the earlier
 * talks: the last few dates on the schedule and every one before them with
 * a topic or a record. A date the schedule has since moved off still shows
 * if something was saved on it.
 */
export default async function ToolboxPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const today = todayMelbourne();
  const [box, schedule, people] = await Promise.all([loadToolbox(), loadSchedule(today), dbConfigured() ? teamPeople().catch(() => []) : Promise.resolve([])]);
  const [current, next] = upcoming(schedule, today, 2);
  const back = past(schedule, current, LOOK_BACK);
  const sessions = await loadSessions(back[back.length - 1], next).catch(() => []);
  const earlier = [...new Set([...back.slice(0, RECENT), ...sessions.map((s) => s.on).filter((d) => d < current)])].sort().reverse();
  const cur = sessions.find((s) => s.on === current);
  const days = Math.round((Date.parse(`${current}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  // Whoever's looking can always tick themselves as there.
  const names = [...new Set([...people.map((p) => p.name), user.name])].sort();
  const longDay = new Date(`${current}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(",", "");
  const on = cur?.notes.length ?? 0;
  const held = box.topics.length;
  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Toolbox talks" sub={<>
          The next talk is {longDay}{schedule.time ? ` at ${timeWords(schedule.time)}` : ""}, {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`},{" "}
          with {on ? `${on} ${on === 1 ? "topic" : "topics"}` : "no topics yet"}.{held ? ` ${held} more ${held === 1 ? "is" : "are"} on hold.` : ""}
        </>} info={[
          ["Topics", "Write one with a heading and what to say, then put it on the next talk or on hold for a later one. Anyone can."],
          ["What was said", "After the talk, open “What was said” under it: type it up or load the transcript from an AI note-taker. It stays with the date as the record the crew was told."],
        ]} />
      </div>
      <ToolboxPlan schedule={schedule} today={today} current={current} next={next} earlier={earlier} sessions={sessions}
        topics={box.topics} people={names} me={user.name} canPlan={can(user, "overhead") || can(user, "manage_users")} />
    </PortalShell>
  );
}
