import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Head, Say } from "@/components/portal/kit/Kit";
import { ToolboxPlan } from "@/components/portal/ToolboxPlan";
import { loadSchedule, loadSessions, loadToolbox } from "@/lib/toolbox/store";
import { EVERY_WORDS, WEEKDAYS, past, talkName, upcoming } from "@/lib/toolbox/types";
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
 * To-do › Toolbox talks: a talk every week, fortnight or month. The next two
 * dates on the schedule, each with its notes on what to talk about, then the
 * earlier talks: the last few dates on the schedule and every one before
 * them with a note or a record. A date the schedule has since moved off
 * still shows if something was saved on it.
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
  const recorded = sessions.filter((s) => s.record && s.on < current).length;
  // Whoever's looking can always tick themselves as there.
  const names = [...new Set([...people.map((p) => p.name), user.name])].sort();
  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Toolbox talks" sub={`${EVERY_WORDS[schedule.every]} ${schedule.every === "month" ? "on the first" : "on"} ${WEEKDAYS[schedule.day]}`} info={[
          ["Notes", "Put what you want to talk about on this talk or the one after, each under a heading. Anyone can add one."],
          ["What was said", "After the talk, type it up or load the transcript from an AI note-taker. It stays with the date as the record the crew was told."],
        ]} />
        <Say>
          The next talk is {talkName(schedule, current).replace(/^Week of/, "the week of").replace(/^Fortnight from/, "the fortnight from")},{" "}
          {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}, with {cur?.notes.length ? `${cur.notes.length} ${cur.notes.length === 1 ? "note" : "notes"}` : "no notes yet"}.{" "}
          {recorded ? `${recorded} ${recorded === 1 ? "talk" : "talks"} recorded so far.` : "None recorded yet."}
        </Say>
      </div>
      <ToolboxPlan schedule={schedule} today={today} current={current} next={next} earlier={earlier} sessions={sessions}
        topics={box.topics} people={names} me={user.name} canPlan={can(user, "overhead") || can(user, "manage_users")} />
    </PortalShell>
  );
}
