import Link from "next/link";
import type { ReactNode } from "react";
import { AutoSwitch, MarkSorted } from "@/components/portal/AutoSwitch";
import { Icon } from "@/components/portal/shell/Menu";
import type { AutoEntry, AutoKey } from "@/lib/automation/log";

/**
 * What the portal does by itself, said once for the two pages that show it:
 * Settings › Automatic has the to-dos it writes and the rest, and To order ›
 * Automation has ordering's own, the drafting, the work orders, the tags and
 * the install packs, beside the orders they act on.
 *
 * Each is one row: what it is in a line, where it stands, and its switch.
 * How it works, its settings and its last few runs fold under the row. They
 * used to sit open on the page, every rule in full, which is what made it
 * read as a wall: the full rules are for the day one surprises someone.
 */

export const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

const MEL = "Australia/Melbourne";
const dayOf = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: MEL });
/** "2:50 pm" today, "Thu 2:50 pm" this week, "Thu 22 Oct" before that. */
function shortWhen(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: MEL });
  if (dayOf(d) === dayOf(new Date())) return time;
  if (Date.now() - d.getTime() < 6 * 86_400_000) return `${d.toLocaleDateString("en-AU", { weekday: "short", timeZone: MEL })} ${time}`;
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: MEL });
}

/**
 * `short` is the row's one line; the full `what` folds under it. `offWhy`
 * stands where the last run would, while it's off for a known reason.
 */
/** `k` is "draft" for drafting the orders, which has no switch. */
export type Auto = { k: AutoKey | "draft"; title: string; what: string; to: string; note?: string; short?: string; icon: string; offWhy?: string };

export const TODOS: Auto[] = [
  { k: "quoteToWrite", icon: "quote", title: "Quote visit done, no quote written", short: "A quote visit finished with no quote in ServiceTitan.", what: "A Quotation job finished in the last 30 days with no quote in ServiceTitan for it. It comes off once the quote's in, and Follow up takes it from there.", to: "The office, on the Quoting list" },
  { k: "soldNotBooked", icon: "cal", title: "Sold, nothing booked", short: "Every sold quote with nothing booked from it.", what: "Every sold quote with nothing booked from it, from the day it sells. It comes off by itself once a visit is booked in ServiceTitan.", to: "The office, on the Jobs to Book list" },
  { k: "notInvoiced", icon: "cash", title: "Finished but not invoiced by the next morning", short: "A finished job with no money on its invoice.", what: "A job completed before today with no money on its invoice in ServiceTitan, back to 17 September, quote visits aside. It ticks itself off once the invoice is in.", to: "The accounts person, on the Invoice ready list" },
  { k: "jobsToClose", icon: "wrench", title: "Job left open after its last visit", short: "Every visit in the past, nothing booked ahead, so it can’t be invoiced.", what: "A job still In Progress or Scheduled in ServiceTitan with every visit in the past and nothing booked ahead, so it can't be invoiced. One card each for a last visit in the last 60 days, newest first; anything older is one card listing them. It comes off once the job's completed, rebooked or cancelled.", to: "Whoever was on the last visit, else the office, on the Service Titan list" },
  { k: "quoteFollow", icon: "phone", title: "Quotes out, not sold", short: "One card for each quote out, due the day the Pipeline says to ring.", what: "Every quote that's gone out and hasn't sold, one card each, due the day the Pipeline says to ring: 2 days after the quote, then 4 days on, then a week on, or the next call someone booked. Logging the call moves the card's day on; it comes off when the quote's sold, lost, or past 60 days.", to: "Whoever's chasing it, or whoever wrote the quote, on the Follow up list" },
  { k: "overdueInv", icon: "clock", title: "Invoices past their due date", short: "One for each overdue invoice: who owes it, how much, when it was due.", what: "One to-do for each invoice that's overdue, with who owes it, how much and when it was due. It ticks itself off once the invoice is paid.", to: "The accounts person, on the Invoice overdue list" },
  { k: "keepInTouch", icon: "team", title: "Keep in touch gone overdue", short: "Someone on the Keep in touch list past their time.", what: "Someone on the Keep in touch list past their time. One to-do each, and it comes off once they're contacted.", to: "Whoever looks after that contact" },
  { k: "vanCheck", icon: "van", title: "Weekly van check not done by Monday 10 am", short: "A van with no weekly check this week.", what: "A van with no weekly check this week.", to: "That van's driver", offWhy: "Off until the crew have iPads", note: "Off until the crew have the trade iPads to do the check on." },
];

/** Not ordering's: they stay on Settings › Automatic. */
export const ACTS: Auto[] = [
  { k: "quoteTag", icon: "tag", title: "Quote tags follow the quote", short: "Quotation Required, then Quote In Draft, then To Be Booked, then off. Awaiting Quote Approval is yours to put on.", what: "In ServiceTitan, on the job the quote’s on. “Quotation Required” goes on a Quotation, Site Assessment or Diagnostics job once the visit’s been, while nothing’s quoted. A Diagnostics job that was fixed on the day gets it too: take it off and it stays off. Once a quote’s written it becomes “Quote In Draft”. ServiceTitan doesn’t tell the portal when a quote is sent, so when you send one, swap “Quote In Draft” for “Awaiting Quote Approval” yourself; it’s never moved back. A sold quote with nothing booked from it becomes “To Be Booked”, and that comes off once the work’s booked or invoiced. The tag only ever moves forward, each step happens once, and the job’s other tags stay. A tag that’s the job’s only one can’t be taken off from here: ServiceTitan ignores that, so it shows under Needs a look to take off by hand.", to: "" },
  { k: "accountFlow", icon: "check", title: "Won quotes follow through to booking", short: "A quote marked Won waits until ServiceTitan marks it sold, then moves to Jobs to Book.", what: "A quote marked Won on Account to-dos waits on its list until ServiceTitan marks it sold, then moves to Jobs to Book. Once a visit is booked it comes off Jobs to Book, and anything else on that list naming a job that's booked comes off too. When the job's done and not invoiced, it goes on Invoice ready. Lost on the Pipeline ticks it off.", to: "" },
];

/** Ordering's own, on To order › Automation. */
export const ORDER_ACTS: Auto[] = [
  { k: "factoryMin", icon: "tag", title: "Low factory stock onto next week’s order", short: "A shelf item at or under its low mark goes onto next week’s draft.", what: "A shelf line at or under its low mark, with nothing already on order, goes onto next week’s draft for the supplier it last came from, the same quantity as last time. It stays a draft until someone approves it. A line never ordered before becomes a to-do for the office instead.", to: "" },
  { k: "workOrderSend", icon: "send", title: "Send work orders once the job’s booked", short: "A contractor set to Automatic gets theirs by email once the visit’s booked.", what: "Every contractor's work order goes by itself: the electrician's drafted from a booking, and one made by hand for anyone (water balancing with Ross) and saved as a draft, once its job has a visit booked in ServiceTitan. With the note, the PDF and the tags on the job, as if someone had pressed Send. When a booking moves, a contractor's work order moves by as much and they're emailed the new day. Not system or material orders: those still wait on To order to be approved, because they spend money. Not a contractor set to By hand on Work orders › Contractors, not a draft changed in the last half hour, and not one for a day that's gone. Weekdays and Saturday, 7 am to 6 pm.", to: "" },
  { k: "orderMoves", icon: "clock", title: "Tell the contractor when a job moves", short: "The contractor is emailed the new day. Suppliers aren’t emailed.", what: "A job that moves after its work order went keeps its work order, and the subcontractor it went to (GT Electrics, Ross and the rest) is emailed the new day, the office copied. Suppliers aren't emailed: a system or materials order stays as it is with its date moved to match, and you let the supplier know if a delivery has to change. Weekdays and Saturday, 7 am to 6 pm.", to: "" },
  { k: "orderTags", icon: "tag", title: "“Materials Ordered” and “System Ordered” on jobs", short: "Tries the tags again on any job ServiceTitan wouldn’t tag when its order went.", what: "The tags already go on when an order is sent. This tries again, a few each sync, for any order whose jobs ServiceTitan wouldn’t tag at the time.", to: "" },
  { k: "installPack", icon: "file", title: "Install pack on each booked install", short: "A PDF on each install: the scope, what’s going in, where it was ordered, the photos.", what: "Every job with an Installation job type gets a PDF in its Photos & Attachments in ServiceTitan: the booking and crew, the scope of works from the job summary word for word, then what's going in and every material from the sold quote with where it was ordered (or that it isn't on an order yet), and the photos from the job and the quote visit. An install booked without a sold quote still gets one, saying there's no list. A new version goes on, with a note saying what changed, if the job summary, quote, booking, crew or orders change before the day.", to: "" },
];

/** Ordering's one that can't be turned off: nothing it drafts goes anywhere by itself. */
export const DRAFT: Auto = { k: "draft", icon: "box", title: "Draft the orders", short: "Every sync drafts orders from the latest bookings. Nothing goes until someone sends it on To order.", what: "Every sync drafts the week's supplier orders from the latest bookings in ServiceTitan, and the electrician's work orders. Nothing goes to a supplier until someone sends it on To order: system and material orders spend money.", to: "" };

/** Conditions on sending work orders, each its own switch, under that one's settings. */
export const WO_RULES: Auto[] = [
  { k: "woNeedsTech", icon: "team", title: "Only once a tech is assigned", short: "Waits until someone is on the visit.", what: "A visit booked into ServiceTitan with nobody on it isn't settled yet. The work order waits until a tech is assigned to the visit, then goes.", to: "" },
  { k: "woNotToday", icon: "cal", title: "Not for a job booked for today", short: "Left for you to send by hand, after checking they can make it.", what: "A job booked for today is left as a draft for you to send by hand, after checking the contractor can make it. You're emailed once to say it's waiting, and it's in the log.", to: "" },
];

/** The log's kinds that are ordering's, so each page lists its own. */
export const ORDER_KINDS = new Set<string>(["factoryMin", "workOrderSend", "orderMoves", "orderTags", "installPack"]);

/** A log entry's kind for a switch: the quote tag logs under its older name. */
export const kindOf = (k: string) => (k === "quoteTag" ? "quote-tag" : k);

const BY_KIND = new Map<string, Auto>([...TODOS, ...ACTS, ...ORDER_ACTS].map((a) => [kindOf(a.k), a]));

/* ------------------------------------------------------------ needs a look */

/** A failure not yet put right: the newest of its kind for one job, and how many times it's failed. */
export type Look = { key: string; kind: string; at: string; title: string; detail?: string; jobId?: number; po?: string; times: number };

/** One job's trouble with one automation, so repeats of it count as one. */
export const lookKey = (e: AutoEntry) => `${e.kind}|${e.jobId ?? e.po ?? e.title.slice(0, 120).replace(/\|/g, "/")}`;

/**
 * Failures in the last fortnight that nothing has put right since: no later
 * success for the same automation and job, and not marked sorted after it.
 * The log keeps every retry, and the quote tag retries daily, so one job's
 * trouble shows once with a count, not once a day.
 */
export function needsLook(log: AutoEntry[], sorted: Record<string, string>, days = 14): Look[] {
  const cut = Date.now() - days * 86_400_000;
  const settled = new Set<string>();
  const out = new Map<string, Look>();
  for (const e of [...log].sort((a, b) => b.at.localeCompare(a.at))) {
    if (Date.parse(e.at) < cut) break;
    const key = lookKey(e);
    if (settled.has(key)) continue;
    const had = out.get(key);
    if (e.ok) { if (!had) settled.add(key); continue; }
    if (had) { had.times++; continue; }
    if (sorted[key] && sorted[key] >= e.at) { settled.add(key); continue; }
    out.set(key, { key, kind: e.kind, at: e.at, title: e.title, detail: e.detail, jobId: e.jobId, po: e.po, times: 1 });
  }
  return [...out.values()];
}

const ST_JOB = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;

function LookRow({ l }: { l: Look }) {
  return (
    <li>
      <span className="ar-lt">
        <b>{l.title}</b>
        {l.detail && <span>{l.detail}</span>}
        <em>{when(l.at)}{l.times > 1 ? ` · tried ${l.times} times` : ""}</em>
      </span>
      <span className="ar-la">
        {l.jobId ? <a className="pk-btn g ar-b" href={ST_JOB(l.jobId)} target="_blank" rel="noreferrer">Open in ServiceTitan ↗</a>
          : l.po ? <Link className="pk-btn g ar-b" href="/portal/supply/work-orders">Open in Work orders</Link> : null}
        <MarkSorted keys={[l.key]} what={l.title} />
      </span>
    </li>
  );
}

/**
 * What went wrong and hasn't been put right, at the top of the page, by
 * automation. Three of each show; the rest fold under, since the quote tag
 * can leave thirty jobs at once and a list that long buries everything else.
 */
export function NeedsLook({ looks }: { looks: Look[] }) {
  if (!looks.length) return null;
  const groups = new Map<string, Look[]>();
  for (const l of looks) groups.set(l.kind, [...(groups.get(l.kind) ?? []), l]);
  return (
    <section className="pk-card ar-look" aria-labelledby="ar-look-h">
      <div className="ar-lookh">
        <h2 id="ar-look-h">Needs a look</h2>
        <span>clears when it next runs cleanly, or once you’ve sorted it</span>
      </div>
      {[...groups].map(([kind, ls]) => {
        const title = BY_KIND.get(kind)?.title ?? kind;
        return (
          <div className="ar-lg" key={kind}>
            <div className="ar-lgh">
              <span className="ar-ic bad"><Icon name="alert" size={16} /></span>
              <b>{title}</b>
              <span className="ar-n">{ls.length} to look at</span>
              {ls.length > 1 && <MarkSorted keys={ls.map((l) => l.key)} label="All sorted" what={title} />}
            </div>
            <ul className="ar-ll">{ls.slice(0, 3).map((l) => <LookRow key={l.key} l={l} />)}</ul>
            {ls.length > 3 && (
              <details className="ar-more">
                <summary>{ls.length - 3} more</summary>
                <ul className="ar-ll">{ls.slice(3).map((l) => <LookRow key={l.key} l={l} />)}</ul>
              </details>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* --------------------------------------------------------------- the rows */

/** One setting under an automation's row: what it does, then its control. */
export function SetRow({ title, line, children }: { title: string; line?: ReactNode; children: ReactNode }) {
  return (
    <div className="ar-set">
      <span><b>{title}</b>{line && <span>{line}</span>}</span>
      {children}
    </div>
  );
}

/** A sub-rule with a switch of its own, as the work orders' two are. */
export function RuleSwitch({ a, on, admin }: { a: Auto; on: boolean; admin: boolean }) {
  return <SetRow title={a.title} line={a.short}><AutoSwitch k={a.k as AutoKey} on={on} canEdit={admin} label={a.title} /></SetRow>;
}

/**
 * Where an automation stands, in the few words beside its switch: off and
 * why, what needs a look, or when it last did something. Only ever what the
 * log shows it did: nothing is written when a run finds nothing to do, so it
 * never claims a run it can't point to.
 */
function standing(a: Auto, on: boolean, always: boolean, mine: AutoEntry[], looks: number): { t: string; bad?: boolean } {
  if (!on && !always) return { t: a.offWhy ?? "Off" };
  if (looks) return { t: `${looks} ${looks === 1 ? "needs" : "need"} a look`, bad: true };
  const last = mine[0];
  // Drafting writes nothing to the log, so "nothing lately" would be wrong of
  // it; "Always on" beside it says all there is.
  if (!last) return { t: always ? "" : "Nothing in the last fortnight" };
  const week = mine.filter((e) => e.ok && Date.now() - Date.parse(e.at) < 7 * 86_400_000).length;
  return { t: `Last ${shortWhen(last.at)}${week ? ` · ${week} this week` : ""}` };
}

/**
 * One automation. The row is the summary of a <details>, so it opens with
 * no script; the switch sits over its right end rather than inside it, so
 * flicking it doesn't open the row as well.
 */
export function AutoRow({ a, on, mine, looks, admin, always = false, settings, below, open = false }: {
  a: Auto; on: boolean;
  /** This automation's log entries, newest first. */
  mine: AutoEntry[];
  /** How many of its failures need a look. */
  looks: number;
  admin: boolean;
  /** No switch: it can't be turned off. */
  always?: boolean;
  settings?: ReactNode;
  /** Full width under the three columns: the install packs' list. */
  below?: ReactNode;
  open?: boolean;
}) {
  const st = standing(a, on, always, mine, looks);
  const live = on || always;
  return (
    <div className={`ar${live ? "" : " off"}`}>
      <details className="ar-d" open={open || undefined}>
        <summary>
          <span className={`ar-ic${looks && live ? " bad" : ""}`}><Icon name={looks && live ? "alert" : a.icon} size={16} /></span>
          <span className="ar-t"><b>{a.title}</b><span>{a.short ?? a.what}</span></span>
          <span className={`ar-st${st.bad ? " bad" : ""}`}>{st.bad ? "! " : ""}{st.t}</span>
          <span className="ar-chev" aria-hidden="true" />
        </summary>
        <div className={`ar-body${settings ? "" : " two"}`}>
          <div className="ar-col">
            <h3>How it works</h3>
            <p>{a.what}</p>
            {a.to && <p><b>Goes to:</b> {a.to}.</p>}
            {a.note && <p className="ar-note">{a.note}</p>}
          </div>
          {settings && <div className="ar-col"><h3>Its settings</h3>{settings}</div>}
          <div className="ar-col">
            <h3>Last few times</h3>
            {mine.length ? (
              <ul className="ar-runs">
                {mine.slice(0, 4).map((e, i) => (
                  <li key={`${e.at}-${i}`} className={e.ok ? undefined : "bad"}>
                    <em>{when(e.at)}</em>
                    <b><span aria-hidden="true">{e.ok ? "✓" : "!"}</span> {e.title}</b>
                  </li>
                ))}
              </ul>
            ) : <p>Nothing in the last fortnight.</p>}
            {mine.length > 4 && <a className="ar-all" href={`?log=${encodeURIComponent(kindOf(a.k))}#done`}>All of its runs</a>}
          </div>
          {below && <div className="ar-below">{below}</div>}
        </div>
      </details>
      <div className="ar-sw">{always ? <span className="au-on">Always on</span> : <AutoSwitch k={a.k as AutoKey} on={on} canEdit={admin} label={a.title} />}</div>
    </div>
  );
}

/** A group of rows under a small heading with how many are on. */
export function AutoGroup({ title, on, of, intro, children }: { title: string; on?: number; of?: number; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="ar-g">
      <div className="ar-gh"><h2>{title}</h2>{of != null && <span>{on} of {of} on</span>}</div>
      {intro && <div className="ar-gi">{intro}</div>}
      {children}
    </div>
  );
}

const LogLines = ({ log }: { log: AutoEntry[] }) => (
  <ul className="au-log">
    {log.map((e, i) => (
      <li key={`${e.at}-${i}`} className={e.ok ? undefined : "bad"}>
        <span className="au-when">{when(e.at)}</span>
        <span className="au-what">
          <b>{e.ok ? "✓" : "!"} {e.title}</b>
          {e.detail && <span>{e.detail}</span>}
        </span>
        {e.jobId ? <a className="jp-open" href={ST_JOB(e.jobId)} target="_blank" rel="noreferrer">ServiceTitan ↗</a> : null}
      </li>
    ))}
  </ul>
);

/** Everything it did, newest first: the latest 25 open, the rest a click away so the page doesn't run on for metres. */
export function AutoLog({ log, empty }: { log: AutoEntry[]; empty: string }) {
  if (!log.length) return <p className="qp-note">{empty}</p>;
  const SHOWN = 25;
  return (
    <>
      <LogLines log={log.slice(0, SHOWN)} />
      {log.length > SHOWN && (
        <details className="ar-older">
          <summary>{log.length - SHOWN} older</summary>
          <LogLines log={log.slice(SHOWN)} />
        </details>
      )}
    </>
  );
}
