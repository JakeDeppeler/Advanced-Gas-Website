import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Heads } from "@/components/portal/marketingParts";
import { KeepInTouchBoard } from "@/components/portal/KeepInTouchBoard";
import { TodoTabs } from "@/components/portal/TodoTabs";
import { dbConfigured } from "@/lib/portal/db";
import { meOf, officeIds, seesAll, teamPeople, todayMelbourne } from "@/lib/todos/store";
import { listContacts, touchesSince } from "@/lib/contacts/store";
import { isDue, touchState, type Contact, type Touch } from "@/lib/contacts/types";
import { firstName, shiftDay } from "@/lib/todos/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keep in touch — Team portal" };

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
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal/todo" label="To-do" />
          <h1>Keep in touch</h1>
          <p>
            The people worth staying close to — builders, agents, suppliers, referrers — and who looks after each.
            Reach out every month, or as often as each one is set to; anyone past their day is flagged until somebody
            logs that they did.
          </p>
        </div>
        <TodoTabs on="contacts" contactsDue={due.length} />
      </div>

      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so there&rsquo;s no list to show.</div>
      ) : (
        <>
          <Heads
            items={[
              {
                label: "Due now", value: String(due.length), feature: due.length > 0,
                sub: due.length ? `${late} overdue · ${[...dueBy.entries()].sort((a, b) => b[1] - a[1]).map(([n, k]) => `${n} ${k}`).join(" · ")}` : "everyone reached out to on time",
              },
              { label: "Due this week", value: String(soon), sub: "in the next seven days" },
              { label: `Reached in ${monthName}`, value: `${reachedPeople} of ${contacts.length}`, sub: `${thisMonth.length} ${thisMonth.length === 1 ? "call, text or visit" : "calls, texts and visits"} logged` },
              { label: "On the list", value: String(contacts.length), sub: `looked after by ${owners.map((p) => firstName(p.name)).join(", ") || "the office"}` },
            ]}
          />
          <KeepInTouchBoard contacts={contacts} touches={touches} owners={owners} meId={meId} today={today} />
        </>
      )}
    </PortalShell>
  );
}
