/**
 * Turning a board event into the alert the room sees.
 *
 * Its own module, with no React in it, so the arrangement can be checked
 * directly — see scripts/check-alerts.ts. This is where a missing suburb
 * becomes "· Officer" with nothing in front of it, and that class of bug is
 * invisible in a typecheck and easy to miss in a screenshot of the one case
 * that happens to have every field.
 */

import { isMessage, leadCopy, type NewLead } from "@/lib/leads/newLeadTypes";
import type { Metrics } from "./metrics";
import type { BoardAlert, SoldBar } from "@/components/screen/Alert";

const plain = (n: number | null | undefined) =>
  n == null ? "\u2014" : `$${Math.round(n).toLocaleString("en-AU")}`;

/**
 * One event, dressed as the alert the room sees.
 *
 * The three kinds arrange the same four facts differently: a quote or a
 * finished job leads with what the work is and puts who and where underneath,
 * a sale leads with who closed it and puts the work in the slab beside the
 * figure. Anything ServiceTitan has no answer for is dropped rather than
 * printed as a gap — "· Officer" with nothing before it is worse than
 * "Officer".
 */
export function alertFrom(e: Metrics["alertEvents"][number], m: Metrics): BoardAlert {
  const time = new Date(e.at).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  });
  const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(" · ");
  const work = e.jobType ?? "Job";

  if (e.kind === "sold") {
    /*
     * Only the bars that have something behind them.
     *
     * The design has two: the person's month against a bonus threshold, and
     * the team's week against its target. No commission tiers are configured,
     * so the first has no threshold to measure against and is left out
     * entirely rather than drawn against a number nobody set. The week's
     * target is real, so that bar is drawn.
     */
    const bars: SoldBar[] = [];
    /*
     * A commercial sale is cheered but not counted (see `counted` on the
     * event). The bar works by subtracting this sale's figure out of the week's
     * running total to find where the bar was standing a moment ago — which is
     * only true of a sale that total includes. Do it to a commercial one and
     * the bar slides backwards from a place the week never was, over a target
     * this sale is not working towards. No bar is the honest answer.
     */
    const weekTarget = e.counted === false ? null : m.pace?.week.sold.value ?? null;
    if (weekTarget && weekTarget > 0) {
      const now = m.paceData?.periods.week.soldValue ?? 0;
      const before = Math.max(0, now - e.amount);
      bars.push({
        label: "Team · this week",
        detail: `${plain(before)} → ${plain(now)} of ${plain(weekTarget)}`,
        from: Math.min(1, before / weekTarget),
        to: Math.min(1, now / weekTarget),
      });
    }
    return {
      kind: "sold",
      id: e.id,
      time,
      amount: e.amount,
      name: e.who ?? "Advanced Gas",
      where: join(e.jobType, e.suburb) || "Sold",
      bars,
      // No pronoun: the board does not know, and does not need to.
      //
      // Where the sale is outside the board's figures the line says so instead
      // of a tally, because the next thing anybody does is look at Sold today
      // and find it unmoved. Better the alert answers that than the room
      // decides one of the two is broken.
      note: e.counted === false
        ? "Commercial · not in the sold figures"
        : e.nth != null && e.nth > 1
          ? `${ordinal(e.nth)} sale this month`
          : null,
    };
  }

  return {
    kind: e.kind,
    id: e.id,
    time,
    amount: e.amount,
    name: work,
    // The place and the person. The options count used to ride on this dotted
    // line too, as "avg of 3 options" — true, but it explained the figure from
    // underneath a job name, and it never said what the three were. It has its
    // own line now, with the prices on it.
    where: join(e.suburb, e.who) || "Advanced Gas",
    options: e.kind === "quote" && e.optionAmounts && e.optionAmounts.length > 1 ? e.optionAmounts : null,
    chip:
      e.kind === "quote"
        ? "Follow up in 2 days if it hasn't closed"
        : // A finished job with no price is the whole reason the Invoices page
          // exists; a priced one is just ready to go out.
          e.amount > 0
          ? "Ready to bill"
          : "Price it, then bill it",
  };
}

/**
 * A new enquiry, dressed as the alert the room acts on.
 *
 * Separate from `alertFrom` above and fed from a different place: the other
 * three are read off the snapshot, which is twenty-five seconds old at best,
 * and this one comes from its own fast poll because the thing it is announcing
 * is measured in seconds. What they share is the pop-up itself.
 *
 * The chip never repeats the big line. A Facebook message already says "Reply
 * in Messenger" in letters a foot high; saying it again in the pill wastes the
 * one line that could say what to do after.
 */
export function leadAlertFrom(lead: NewLead): BoardAlert {
  const time = new Date(lead.at).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Melbourne",
  });
  const copy = leadCopy(lead, time);
  return {
    kind: "lead",
    // Namespaced, because the board keeps one set of seen ids for every alert
    // it has ever shown and a lead's uuid and a job's number are not drawn from
    // the same pot.
    id: `lead-${lead.id}`,
    time,
    // A lead has no figure. Zero is not one either, which is why nothing on
    // this alert renders it.
    amount: 0,
    name: copy.who,
    where: copy.what,
    lead: copy,
    chip: copy.dialable
      ? "Ring them before they ring somebody else"
      : isMessage(lead)
        ? "Answer it in the inbox, then get a number"
        : "No number given — email them straight back",
  };
}

/** 1st, 2nd, 3rd, 4th — for "3rd sale this month". */
export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

