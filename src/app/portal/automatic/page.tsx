import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Head } from "@/components/portal/kit/Kit";
import { Icon } from "@/components/portal/shell/Menu";
import { OfficeTo } from "@/components/portal/AutoSwitch";
import { ACTS, AutoGroup, AutoLog, AutoRow, NeedsLook, ORDER_KINDS, SetRow, TODOS, kindOf, needsLook, type Auto } from "@/components/portal/automation/AutoParts";
import { officeIds, teamPeople } from "@/lib/todos/store";
import { loadAutoLog, loadSorted, loadSwitches, type AutoKey } from "@/lib/automation/log";
import { guessedSent } from "@/lib/automation/quoteDrafts";
import { GuessedQuotes } from "@/components/portal/automation/GuessedQuotes";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automatic · Team portal" };

/**
 * Settings › Automatic: what the portal does by itself after each sync. What
 * went wrong and hasn't been put right is first, then one row for each
 * automation with its switch (how it works, its settings and its last runs
 * fold under it), then everything it's done, newest first, so nothing
 * changes in ServiceTitan without a record of it. Ordering's own are on
 * To order › Automation, beside the orders they act on.
 */
export default async function AutomaticPage({ searchParams }: { searchParams: { log?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "manage_users")) return <Locked user={user} what="Automatic" forWhom="the office" />;
  const [sw, all, sorted, people, office, guessed] = await Promise.all([loadSwitches(), loadAutoLog(), loadSorted(), teamPeople(), officeIds(), guessedSent().catch(() => [])]);
  const log = all.filter((e) => !ORDER_KINDS.has(e.kind));
  const recent = log.filter((e) => Date.now() - Date.parse(e.at) < 14 * 86_400_000);
  const looks = needsLook(recent, sorted);
  const admin = can(user, "manage_users");
  const accountsTo = sw.accountsTo && people.some((p) => p.id === sw.accountsTo) ? sw.accountsTo : "";
  const officeTo = sw.officeTo && people.some((p) => p.id === sw.officeTo) ? sw.officeTo : people.find((p) => office.includes(p.id))?.id ?? people[0]?.id ?? "";
  const accountsName = people.find((p) => p.id === (accountsTo || officeTo))?.name ?? "the office";

  const settingsFor: Partial<Record<AutoKey, ReactNode>> = {
    notInvoiced: (
      <SetRow title="Goes to" line="On the Invoice ready list on Account to-dos. The same person gets Invoices past their due date.">
        <OfficeTo people={people} value={accountsTo || officeTo} canEdit={admin} which="accountsTo" label="Who gets the invoicing to-dos" />
      </SetRow>
    ),
    overdueInv: <p className="ar-note">Goes to whoever gets Finished but not invoiced, set under that one: <b>{accountsName}</b>.</p>,
  };
  const row = (a: Auto) => {
    const k = a.k as AutoKey;
    return <AutoRow key={k} a={a} on={sw[k]} mine={recent.filter((e) => e.kind === kindOf(k))} looks={looks.filter((l) => l.kind === kindOf(k)).length} admin={admin} settings={settingsFor[k]} />;
  };
  const every = [...TODOS, ...ACTS];
  const on = every.filter((a) => sw[a.k as AutoKey]).length;
  const titleOf = new Map(every.map((a) => [kindOf(a.k), a.title]));
  const shown = searchParams.log && titleOf.has(searchParams.log) ? searchParams.log : null;

  return (
    <PortalShell user={user}>
      <div className="ar-page">
        <div className="pk">
          <Head
            title="Automatic"
            sub={<>What the portal does by itself after each sync: {on} on, {every.length - on} off{looks.length ? <>, <Bad>{looks.length} {looks.length === 1 ? "needs" : "need"} a look</Bad></> : null}.</>}
            action={<a className="pk-btn g ar-donebtn" href="#done"><Icon name="todo" size={14} />What it&rsquo;s done</a>}
          />
        </div>

        <NeedsLook looks={looks} />

        <section className="pk-card ar-card" aria-label="What the portal does by itself">
          <AutoGroup
            title="To-dos it writes" on={TODOS.filter((a) => sw[a.k as AutoKey]).length} of={TODOS.length}
            intro={<>Each lands on the To-do board, due the day it&rsquo;s made. Anything that isn&rsquo;t one person&rsquo;s goes to <OfficeTo people={people} value={officeTo} canEdit={admin} /></>}
          >
            {TODOS.map(row)}
          </AutoGroup>
          <AutoGroup title="In ServiceTitan" on={ACTS.filter((a) => sw[a.k as AutoKey]).length} of={ACTS.length}>
            {ACTS.map(row)}
          </AutoGroup>
          <AutoGroup title="Ordering">
            <Link className="ar-link" href="/portal/supply/automation">
              <span className="ar-ic"><Icon name="box" size={16} /></span>
              <span className="ar-t"><b>Ordering&rsquo;s own</b><span>Drafting orders, work orders, the ordered tags and install packs: on To order › Automation.</span></span>
              <span className="ar-chev r" aria-hidden="true" />
            </Link>
          </AutoGroup>
        </section>

        {guessed.length > 0 && (
          <section className="pk-card pk-pad">
            <h2 className="rv-h2">Quotes to sort: draft or sent?</h2>
            <GuessedQuotes rows={guessed.map(({ jobId, jobNumber, customer, jobType, quotes, written }) => ({ jobId, jobNumber, customer, jobType, quotes, written }))} />
          </section>
        )}

        <section id="done" className="pk-card pk-pad" aria-labelledby="ar-done-h">
          <div className="au-sideh">
            <h2 className="rv-h2" id="ar-done-h">What it&rsquo;s done</h2>
            <span>{shown ? <>{titleOf.get(shown)} only · <a href="?#done">show all</a></> : "newest first"}</span>
          </div>
          <AutoLog log={(shown ? log.filter((e) => e.kind === shown) : log).slice(0, 200)} empty="Nothing yet. The first run is after the next ServiceTitan sync." />
        </section>
      </div>
    </PortalShell>
  );
}
