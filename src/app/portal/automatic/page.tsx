import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { PageHead } from "@/components/portal/kit/PageHead";
import Link from "next/link";
import { OfficeTo } from "@/components/portal/AutoSwitch";
import { ACTS, AutoLog, Item, ORDER_KINDS, TODOS, kindOf } from "@/components/portal/automation/AutoParts";
import { officeIds, teamPeople } from "@/lib/todos/store";
import { loadAutoLog, loadSwitches, type AutoKey } from "@/lib/automation/log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automatic · Team portal" };

/**
 * Settings › Automatic: what the portal does by itself, and everything it has
 * done, newest first, so nothing changes in ServiceTitan without a record of it.
 * Ordering's own (drafting, work orders, the tags, the install packs) are on
 * To order › Automation, beside the orders they act on.
 */
export default async function AutomaticPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "manage_users")) return <Locked user={user} what="Automatic" forWhom="the office" />;
  const [sw, all, people, office] = await Promise.all([loadSwitches(), loadAutoLog(), teamPeople(), officeIds()]);
  const log = all.filter((e) => !ORDER_KINDS.has(e.kind));
  const week = log.filter((e) => Date.now() - Date.parse(e.at) < 7 * 86_400_000);
  const count = (k: AutoKey) => week.filter((e) => e.kind === kindOf(k) && e.ok).length;
  const admin = can(user, "manage_users");
  const accountsTo = sw.accountsTo && people.some((p) => p.id === sw.accountsTo) ? sw.accountsTo : "";
  const officeTo = sw.officeTo && people.some((p) => p.id === sw.officeTo) ? sw.officeTo : people.find((p) => office.includes(p.id))?.id ?? people[0]?.id ?? "";
  return (
    <PortalShell user={user}>
      <div className="sx">
      <PageHead hi="Settings" title="Automatic" line="What the portal does by itself after each ServiceTitan sync, and a line for every time it did something." kpis={[
        { icon: "check", fig: String(week.filter((e) => e.ok).length), label: "Done in the last 7 days" },
        { icon: "alert", fig: String(week.filter((e) => !e.ok).length), label: "Couldn't be done, last 7 days" },
      ]} />

      <section className="pk-card pk-pad au-list">
        <h2 className="rv-h2">To-dos it writes</h2>
        <p className="au-sub">Each one is written once, due the day it&rsquo;s made, and lands on the To-do board like any other. Tick it off when it&rsquo;s done.</p>
        <div className="au-item au-office">
          <div>
            <b>The office&rsquo;s to-dos go to</b>
            <p>Anything below that doesn&rsquo;t belong to one person.</p>
          </div>
          <OfficeTo people={people} value={officeTo} canEdit={admin} />
        </div>
        <div className="au-item au-office">
          <div>
            <b>Invoice ready and Invoice overdue go to</b>
            <p>Jobs to invoice, and invoices to chase. Each on its own list on Account to-dos, for this person only.</p>
          </div>
          <OfficeTo people={people} value={accountsTo || officeTo} canEdit={admin} which="accountsTo" label="Who gets the invoicing to-dos" />
        </div>
        {TODOS.map((a) => <Item key={a.k} a={a} on={sw[a.k]} n={count(a.k)} admin={admin} />)}
      </section>

      <section className="pk-card pk-pad au-list">
        <h2 className="rv-h2">What it does itself</h2>
        {ACTS.map((a) => <Item key={a.k} a={a} on={sw[a.k]} n={count(a.k)} admin={admin} />)}
        <div className="au-item">
          <div>
            <b>Ordering</b>
            <p>Drafting the orders, sending work orders, telling a contractor a job moved, the ordered tags and the install packs, and who&rsquo;s told when it emails someone.</p>
          </div>
          <Link className="pt-btn pt-btn--ghost pt-btn--sm" href="/portal/supply/automation">To order › Automation</Link>
        </div>
      </section>

      <section className="pk-card pk-pad">
        <h2 className="rv-h2">What it&rsquo;s done</h2>
        <AutoLog log={log.slice(0, 200)} empty="Nothing yet. The first run is after the next ServiceTitan sync." />
      </section>
    </div>
    </PortalShell>
  );
}
