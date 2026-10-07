/**
 * Turning a board event into the alert the room sees.
 *
 * Its own module, with no React in it, so the arrangement can be checked
 * directly — see scripts/check-alerts.ts. This is where a missing suburb
 * becomes "· Officer" with nothing in front of it, and that class of bug is
 * invisible in a typecheck and easy to miss in a screenshot of the one case
 * that happens to have every field.
 */

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
    const weekTarget = m.pace?.week.sold.value ?? null;
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
      note: e.nth != null && e.nth > 1 ? `${ordinal(e.nth)} sale this month` : null,
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

/** 1st, 2nd, 3rd, 4th — for "3rd sale this month". */
export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

