import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Heads } from "@/components/portal/marketingParts";
import { PlansBoard } from "@/components/portal/PlansBoard";
import { TodoTabs } from "@/components/portal/TodoTabs";
import { dbConfigured } from "@/lib/portal/db";
import { meOf, seesAll, todayMelbourne } from "@/lib/todos/store";
import { listContacts } from "@/lib/contacts/store";
import { isDue, touchState } from "@/lib/contacts/types";
import { listPlans } from "@/lib/plans/store";
import type { Plan } from "@/lib/plans/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Future planning — Team portal" };

/**
 * What you want to do for the business, away from the day's jobs and quotes:
 * a list of your own, grouped by when you'd like to get to it. Only you see it.
 */
export default async function PlansPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const ready = dbConfigured();
  if (ready && !(await seesAll(user))) return <Locked user={user} what="Future planning" forWhom="the office" />;

  const today = todayMelbourne();
  const me = ready ? await meOf(user) : null;
  const [plans, contacts] = me
    ? await Promise.all([listPlans(me.id).catch(() => [] as Plan[]), listContacts().catch(() => [])])
    : [[] as Plan[], []];
  const contactsDue = contacts.filter((c) => isDue(touchState(c, today))).length;

  const open = plans.filter((p) => p.status !== "done");
  const doing = open.filter((p) => p.status === "doing").length;
  const year = today.slice(0, 4);
  const doneThisYear = plans.filter((p) => p.status === "done" && (p.doneAt ?? "").startsWith(year)).length;
  const soon = open.filter((p) => p.horizon === "month" || p.horizon === "quarter").length;

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>Future planning</h1>
          <p>
            What you want to do for the business — not the day&rsquo;s jobs or quotes, but the things that change how it runs.
            Put each one under when you&rsquo;d like to get to it, and move it along as it happens. Only you see your list.
          </p>
        </div>
        <TodoTabs on="plans" contactsDue={contactsDue} />
      </div>

      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so there&rsquo;s no list to show.</div>
      ) : !me ? (
        <div className="pt-note pt-note--warn"><strong>You&rsquo;re not on the team list,</strong> so there&rsquo;s nowhere to keep your plans. Ask an admin to add you.</div>
      ) : (
        <>
          <Heads
            items={[
              { label: "On the plan", value: String(open.length), sub: `${soon} in the next three months`, feature: true },
              { label: "Working on", value: String(doing), sub: doing ? "under way now" : "nothing started yet" },
              { label: `Done in ${year}`, value: String(doneThisYear), sub: "ticked off this year" },
              { label: "Someday", value: String(open.filter((p) => p.horizon === "someday").length), sub: "kept, with no date" },
            ]}
          />
          <PlansBoard plans={plans} />
        </>
      )}
    </PortalShell>
  );
}
