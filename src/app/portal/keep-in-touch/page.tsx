import { redirect } from "next/navigation";
import { KpiHead } from "@/components/portal/kit/Kit";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { KeepInTouchBoard } from "@/components/portal/KeepInTouchBoard";
import { dbConfigured } from "@/lib/portal/db";
import { meOf, officeIds, seesAll, teamPeople, todayMelbourne } from "@/lib/todos/store";
import { listContacts, touchesSince } from "@/lib/contacts/store";
import { isDue, touchState, type Contact, type Touch } from "@/lib/contacts/types";
import { firstName, shiftDay } from "@/lib/todos/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keep in touch · Team portal" };

/**
 * The people worth a call every month — builders, agents, suppliers,
 * referrers — who looks after each, and who's due.
 *
 * The office's list: the same people who see every to-do list work it, each
 * looking after their own share, and anyone past their month is flagged until
 * somebody logs that they reached out.
 */
export default async function KeepInTouchPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const ready = dbConfigured();
  if (ready && !(await seesAll(user))) return <Locked user={user} what="Keep in touch" forWhom="the office" />;

  const today = todayMelbourne();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [me, people, office, contacts, touches] = ready
    ? await Promise.all([
        meOf(user),
        teamPeople(),
        officeIds(),
        listContacts().catch(() => [] as Contact[]),
        touchesSince(shiftDay(today, -400)).catch(() => [] as Touch[]),
      ])
    : [null, [], [], [] as Contact[], [] as Touch[]];
  const meId = me?.id ?? null;
  const owners = people
    .filter((p) => office.includes(p.id))
    .sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : a.name.localeCompare(b.name)));

  const states = contacts.map((c) => ({ c, s: touchState(c, today) }));
  const due = states.filter((x) => isDue(x.s));
  const late = states.filter((x) => x.s === "overdue").length;
  const soon = states.filter((x) => x.s === "soon").length;
  const thisMonth = touches.filter((t) => t.on >= monthStart);
  const reachedPeople = new Set(thisMonth.map((t) => t.contactId)).size;
  const dueBy = new Map<string, number>();
  for (const { c } of due) {
    const n = firstName(people.find((p) => p.id === c.ownerId)?.name ?? "Nobody");
    dueBy.set(n, (dueBy.get(n) ?? 0) + 1);
  }
  const monthName = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", timeZone: "UTC" });

  return (
    <PortalShell user={user}>
      <KpiHead title={<>Keep<br />in touch</>} kpis={[
        { icon: "phone", fig: String(due.length), label: "Due a call now", badge: late ? `${late} overdue` : undefined, tone: "down" },
        { icon: "clock", fig: String(soon), label: "Due this week" },
        { icon: "trophy", fig: `${reachedPeople} of ${contacts.length}`, label: `Reached in ${monthName}` },
      ]} />
      <p className="pk-note td-intro">The people worth staying close to (builders, agents, suppliers, referrers) and who looks after each. Anyone past their day is flagged until somebody logs that they reached out.</p>

      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so there&rsquo;s no list to show.</div>
      ) : (
        <>
          <KeepInTouchBoard contacts={contacts} touches={touches} owners={owners} meId={meId} today={today} />
        </>
      )}
    </PortalShell>
  );
}
