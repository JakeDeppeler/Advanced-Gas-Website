import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { PageHead } from "@/components/portal/kit/PageHead";
import { AutoSwitch, OfficeTo } from "@/components/portal/AutoSwitch";
import { officeIds, teamPeople } from "@/lib/todos/store";
import { loadAutoLog, loadSwitches, type AutoKey } from "@/lib/automation/log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automatic · Team portal" };

const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

type Auto = { k: AutoKey; title: string; what: string; to: string; note?: string };

const TODOS: Auto[] = [
  { k: "soldNotBooked", title: "Sold but not booked after 3 days", what: "A sold quote with nothing booked from it three days on.", to: "The office, on the Jobs to Book list" },
  { k: "notInvoiced", title: "Finished but not invoiced by the next morning", what: "A job completed before today with no invoice in ServiceTitan.", to: "The accounts person, on the Accounts list" },
  { k: "quoteFollow", title: "Quote follow-ups as to-dos", what: "A quote due a follow-up call.", to: "Whoever's chasing it, or whoever wrote the quote", note: "Off: follow-ups are worked on the Pipeline, 2 days after the quote, then 4 days, then a week." },
  { k: "overdueInv", title: "Invoices 7, 14 or 30 days overdue", what: "One to-do listing every invoice that's just crossed one of those marks, so the chasing is done in one sitting.", to: "The accounts person, on the Accounts list" },
  { k: "keepInTouch", title: "Keep in touch gone overdue", what: "Someone on the Keep in touch list past their time.", to: "Whoever looks after that contact" },
  { k: "vanCheck", title: "Weekly van check not done by Monday 10 am", what: "A van with no weekly check this week.", to: "That van's driver", note: "Off until the crew have the trade iPads to do the check on." },
];

const ACTS: Auto[] = [
  { k: "quoteTag", title: "Take “Awaiting Quote Approval” off answered quotes", what: "When a job with that tag has been invoiced, is booked in for a visit to come, or has had a job booked from its quote, the tag comes off in ServiceTitan. Only that tag; the job’s other tags stay.", to: "" },
  { k: "factoryMin", title: "Low factory stock onto next week’s order", what: "A shelf line at or under its low mark, with nothing already on order, goes onto next week’s draft for the supplier it last came from, the same quantity as last time. It stays a draft until someone approves it. A line never ordered before becomes a to-do for the office instead.", to: "" },
  { k: "orderTags", title: "“Materials Ordered” and “System Ordered” on jobs", what: "The tags already go on when an order is sent. This tries again, a few each sync, for any order whose jobs ServiceTitan wouldn’t tag at the time.", to: "" },
];

function Item({ a, on, n, admin }: { a: Auto; on: boolean; n: number; admin: boolean }) {
  return (
    <div className="au-item">
      <div>
        <b>{a.title}</b>
        <p>{a.what}{a.to && <> <span className="au-to-who">Goes to: {a.to}.</span></>}</p>
        {(a.note || n > 0) && <p className="au-meta">{[a.note, n > 0 ? `${n} in the last 7 days` : null].filter(Boolean).join(" · ")}</p>}
      </div>
      <AutoSwitch k={a.k} on={on} canEdit={admin} label={a.title} />
    </div>
  );
}

/**
 * Settings › Automatic: what the portal does by itself, and everything it has
 * done, newest first, so nothing changes in ServiceTitan without a record of it.
 */
export default async function AutomaticPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "manage_users")) return <Locked user={user} what="Automatic" forWhom="the office" />;
  const [sw, log, people, office] = await Promise.all([loadSwitches(), loadAutoLog(), teamPeople(), officeIds()]);
  const week = log.filter((e) => Date.now() - Date.parse(e.at) < 7 * 86_400_000);
  const count = (k: AutoKey) => week.filter((e) => e.kind === (k === "quoteTag" ? "quote-tag" : k) && e.ok).length;
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
            <b>The Accounts list goes to</b>
            <p>Jobs to invoice and overdue money. They go on the Accounts list on the To-do board, for this person only.</p>
          </div>
          <OfficeTo people={people} value={accountsTo || officeTo} canEdit={admin} which="accountsTo" label="Who gets the Accounts list's to-dos" />
        </div>
        {TODOS.map((a) => <Item key={a.k} a={a} on={sw[a.k]} n={count(a.k)} admin={admin} />)}
      </section>

      <section className="pk-card pk-pad au-list">
        <h2 className="rv-h2">What it does itself</h2>
        {ACTS.map((a) => <Item key={a.k} a={a} on={sw[a.k]} n={count(a.k)} admin={admin} />)}
        <div className="au-item">
          <div>
            <b>Draft the orders</b>
            <p>Every sync drafts orders from the latest bookings, and To order checks every 10 minutes while it&rsquo;s open. Nothing goes to a supplier until it&rsquo;s approved.</p>
          </div>
          <span className="au-on">Always on</span>
        </div>
      </section>

      <section className="pk-card pk-pad">
        <h2 className="rv-h2">What it&rsquo;s done</h2>
        {log.length ? (
          <ul className="au-log">
            {log.slice(0, 200).map((e, i) => (
              <li key={`${e.at}-${i}`} className={e.ok ? undefined : "bad"}>
                <span className="au-when">{when(e.at)}</span>
                <span className="au-what">
                  <b>{e.ok ? "✓" : "!"} {e.title}</b>
                  {e.detail && <span>{e.detail}</span>}
                </span>
                {e.jobId ? <a className="jp-open" href={`https://go.servicetitan.com/#/Job/Index/${e.jobId}`} target="_blank" rel="noreferrer">ServiceTitan ↗</a> : null}
              </li>
            ))}
          </ul>
        ) : <p className="qp-note">Nothing yet. The first run is after the next ServiceTitan sync.</p>}
      </section>
    </div>
    </PortalShell>
  );
}
