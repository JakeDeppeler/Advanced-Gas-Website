import { AutoSwitch } from "@/components/portal/AutoSwitch";
import type { AutoEntry, AutoKey } from "@/lib/automation/log";

/**
 * What the portal does by itself, said once for the two pages that show it:
 * Settings › Automatic has the to-dos it writes and the rest, and To order ›
 * Automation has ordering's own, the drafting, the work orders, the tags and
 * the install packs, beside the orders they act on.
 */

export const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

/** `short`, when there is one, is what shows; the full `what` folds under it. */
export type Auto = { k: AutoKey; title: string; what: string; to: string; note?: string; short?: string };

export const TODOS: Auto[] = [
  { k: "quoteToWrite", title: "Quote visit done, no quote written", what: "A Quotation job finished in the last 30 days with no quote in ServiceTitan for it. It comes off once the quote's in, and Follow up takes it from there.", to: "The office, on the Quoting list" },
  { k: "soldNotBooked", title: "Sold, nothing booked", what: "Every sold quote with nothing booked from it, from the day it sells. It comes off by itself once a visit is booked in ServiceTitan.", to: "The office, on the Jobs to Book list" },
  { k: "notInvoiced", title: "Finished but not invoiced by the next morning", what: "A job completed before today with no money on its invoice in ServiceTitan, back to 17 September, quote visits aside. It ticks itself off once the invoice is in.", to: "The accounts person, on the Invoice ready list" },
  { k: "jobsToClose", title: "Job left open after its last visit", what: "A job still In Progress or Scheduled in ServiceTitan with every visit in the past and nothing booked ahead, so it can't be invoiced. One card each for a last visit in the last 60 days, newest first; anything older is one card listing them. It comes off once the job's completed, rebooked or cancelled.", to: "Whoever was on the last visit, else the office, on the Service Titan list" },
  { k: "quoteFollow", title: "Quotes out, not sold", what: "Every quote that's gone out and hasn't sold, one card each, due the day the Pipeline says to ring: 2 days after the quote, then 4 days on, then a week on, or the next call someone booked. Logging the call moves the card's day on; it comes off when the quote's sold, lost, or past 60 days.", to: "Whoever's chasing it, or whoever wrote the quote, on the Follow up list" },
  { k: "overdueInv", title: "Invoices past their due date", what: "One to-do for each invoice that's overdue, with who owes it, how much and when it was due. It ticks itself off once the invoice is paid.", to: "The accounts person, on the Invoice overdue list" },
  { k: "keepInTouch", title: "Keep in touch gone overdue", what: "Someone on the Keep in touch list past their time.", to: "Whoever looks after that contact" },
  { k: "vanCheck", title: "Weekly van check not done by Monday 10 am", what: "A van with no weekly check this week.", to: "That van's driver", note: "Off until the crew have the trade iPads to do the check on." },
];

/** Not ordering's: they stay on Settings › Automatic. */
export const ACTS: Auto[] = [
  { k: "quoteTag", title: "Quote tags follow the quote", short: "“Quotation Required” once the visit’s done, “Awaiting Quote Approval” once the quote’s out, “To Be Booked” once it sells, and off once the work’s booked.", what: "In ServiceTitan, on the job the quote’s on. “Quotation Required” goes on a Quotation or Site Assessment job once the visit’s been, while nothing’s quoted. It becomes “Awaiting Quote Approval” once a quote with a price on it hasn’t been changed for a day: ServiceTitan doesn’t share its Draft tick, so that’s the nearest sign the quote’s gone out. Put “Quotation Required” back on one that’s still a draft and the job’s left alone until the quote sells. A sold quote with nothing booked from it becomes “To Be Booked”, and that comes off once the work’s booked or invoiced. The tag only ever moves forward, each step happens once, and the job’s other tags stay. A tag that’s the job’s only one can’t be taken off from here: ServiceTitan ignores that, so it’s listed below to take off by hand.", to: "" },
  { k: "accountFlow", title: "Won quotes follow through to booking", what: "A quote marked Won on Account to-dos waits on its list until ServiceTitan marks it sold, then moves to Jobs to Book. Once a visit is booked it comes off Jobs to Book, and anything else on that list naming a job that's booked comes off too. When the job's done and not invoiced, it goes on Invoice ready. Lost on the Pipeline ticks it off.", to: "" },
];

/** Ordering's own, on To order › Automation. */
export const ORDER_ACTS: Auto[] = [
  { k: "factoryMin", title: "Low factory stock onto next week’s order", short: "A shelf item at or under its low mark goes onto next week’s draft for the supplier it last came from.", what: "A shelf line at or under its low mark, with nothing already on order, goes onto next week’s draft for the supplier it last came from, the same quantity as last time. It stays a draft until someone approves it. A line never ordered before becomes a to-do for the office instead.", to: "" },
  { k: "workOrderSend", title: "Send work orders once the job's booked", short: "A contractor set to Automatic gets their work order by email once the job has a visit booked, with the note and PDF on the job.", what: "Every contractor's work order goes by itself: the electrician's drafted from a booking, and one made by hand for anyone (water balancing with Ross) and saved as a draft, once its job has a visit booked in ServiceTitan. With the note, the PDF and the tags on the job, as if someone had pressed Send. When a booking moves, a contractor's work order moves by as much and they're emailed the new day. Not system or material orders: those still wait on To order to be approved, because they spend money. Not a contractor set to By hand on Work orders › Contractors, not a draft changed in the last half hour, and not one for a day that's gone. The two below set when it waits. Weekdays and Saturday, 7 am to 6 pm.", to: "" },
  { k: "orderMoves", title: "Tell the contractor when a job moves", short: "A visit that moves after its work order went: the contractor is emailed the new day. Suppliers aren't emailed.", what: "A job that moves after its work order went keeps its work order, and the subcontractor it went to (GT Electrics, Ross and the rest) is emailed the new day, the office copied. Suppliers aren't emailed: a system or materials order stays as it is with its date moved to match, and you let the supplier know if a delivery has to change. Weekdays and Saturday, 7 am to 6 pm.", to: "" },
  { k: "orderTags", title: "“Materials Ordered” and “System Ordered” on jobs", short: "Tries the tags again on any job ServiceTitan wouldn’t tag when its order went.", what: "The tags already go on when an order is sent. This tries again, a few each sync, for any order whose jobs ServiceTitan wouldn’t tag at the time.", to: "" },
  { k: "installPack", title: "Install pack on each booked install", short: "A PDF on each booked install: the scope, what’s going in, where every item was ordered, and the photos.", what: "Every job with an Installation job type gets a PDF in its Photos & Attachments in ServiceTitan: the booking and crew, the scope of works from the job summary word for word, then what's going in and every material from the sold quote with where it was ordered (or that it isn't on an order yet), and the photos from the job and the quote visit. An install booked without a sold quote still gets one, saying there's no list. A new version goes on, with a note saying what changed, if the job summary, quote, booking, crew or orders change before the day.", to: "" },
];

/** Conditions on sending work orders, each its own switch, shown under that one. */
export const WO_RULES: Auto[] = [
  { k: "woNeedsTech", title: "Only once a tech is assigned", short: "Waits until someone is on the visit.", what: "A visit booked into ServiceTitan with nobody on it isn't settled yet. The work order waits until a tech is assigned to the visit, then goes.", to: "" },
  { k: "woNotToday", title: "Not for a job booked for today", short: "A job booked for today is left for you to send by hand.", what: "A job booked for today is left as a draft for you to send by hand, after checking the contractor can make it. You're emailed once to say it's waiting, and it's in the log below.", to: "" },
];

/** The log's kinds that are ordering's, so each page lists its own. */
export const ORDER_KINDS = new Set<string>(["factoryMin", "workOrderSend", "orderMoves", "orderTags", "installPack"]);

/** A log entry's kind for a switch: the quote tag logs under its older name. */
export const kindOf = (k: AutoKey) => (k === "quoteTag" ? "quote-tag" : k);

export function Item({ a, on, n, admin }: { a: Auto; on: boolean; n: number; admin: boolean }) {
  return (
    <div className="au-item">
      <div>
        <b>{a.title}</b>
        <p>{a.short ?? a.what}{a.to && <> <span className="au-to-who">Goes to: {a.to}.</span></>}</p>
        {a.short && (
          <details className="au-more">
            <summary>How it works</summary>
            <p>{a.what}</p>
          </details>
        )}
        {(a.note || n > 0) && <p className="au-meta">{[a.note, n > 0 ? `${n} in the last 7 days` : null].filter(Boolean).join(" · ")}</p>}
      </div>
      <AutoSwitch k={a.k} on={on} canEdit={admin} label={a.title} />
    </div>
  );
}

export function AutoLog({ log, empty }: { log: AutoEntry[]; empty: string }) {
  if (!log.length) return <p className="qp-note">{empty}</p>;
  return (
    <ul className="au-log">
      {log.map((e, i) => (
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
  );
}
