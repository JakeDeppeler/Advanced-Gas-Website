import { redirect } from "next/navigation";
import { KpiHead } from "@/components/portal/kit/Kit";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { PlansBoard } from "@/components/portal/PlansBoard";
import { dbConfigured } from "@/lib/portal/db";
import { meOf, seesAll, todayMelbourne } from "@/lib/todos/store";
import { listContacts } from "@/lib/contacts/store";
import { isDue, touchState } from "@/lib/contacts/types";
import { listPlans } from "@/lib/plans/store";
import type { Plan } from "@/lib/plans/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Future planning · Team portal" };

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
      <KpiHead title={<>Future<br />planning</>} kpis={[
        { icon: "bars", fig: String(open.length), label: `On the plan · ${soon} in the next three months` },
        { icon: "trend", fig: String(doing), label: doing ? "Working on now" : "Nothing started yet" },
        { icon: "trophy", fig: String(doneThisYear), label: `Done in ${year}` },
      ]} />
      <p className="pk-note td-intro">The things that change how the business runs, not the day&rsquo;s jobs. Put each under when you&rsquo;d like to get to it and move it along as it happens. Only you see your list.</p>

      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so there&rsquo;s no list to show.</div>
      ) : !me ? (
        <div className="pt-note pt-note--warn"><strong>You&rsquo;re not on the team list,</strong> so there&rsquo;s nowhere to keep your plans. Ask an admin to add you.</div>
      ) : (
        <>
          <PlansBoard plans={plans} />
        </>
      )}
    </PortalShell>
  );
}
