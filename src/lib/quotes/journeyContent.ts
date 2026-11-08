import type { LetterBlock } from "@/lib/email/premium";

/**
 * The emails that walk a customer through the job once they've said yes
 * (Jake, 8 Nov: "when they book or buy something they get an email explaining
 * the process, we want to make it an everything-taken-care-of process").
 *
 * Every step here is one the website already promises (the FAQs and the
 * About page: no subcontractors, compliance certificate on every job, we lodge
 * the rebate), and nothing about money. Pure, for the check script. The
 * wording is written here; sending it on the sale and on the booking is the
 * next piece, once the words are approved.
 */

const p = (text: string): LetterBlock => ({ kind: "p", text });

/** How it runs from "yes" to done, for the thank-you and the going-ahead reply. */
export function nextSteps(i: { what: string | null; phone: string | null }): string[] {
  return [
    `**We'll give you a call** on ${i.phone ?? "the number we have"} within the next business day to pick an install day that suits you.`,
    `**We order your ${i.what ?? "system"}** and line up anything else the job needs, like the electrician, so it's all ready for the day.`,
    "**On the day**, our own team does the work: the old unit goes, the new one's in and running, and we show you how it works before we leave. Most installs are done in the one day; if yours is bigger, we'll say so when we book it.",
    "**Afterwards**, we lodge any rebate paperwork for you and send through your compliance certificate and warranty details.",
  ];
}

export type SoldInput = {
  first: string;
  /** What they bought, in words ("Reclaim 300L"). */
  what: string | null;
  phone: string | null;
  officePhone: string;
};

/** Thanks for going ahead: the same steps, for a sale made on the phone or in person rather than by the button. */
export function soldEmail(i: SoldInput): { subject: string; preheader: string; blocks: LetterBlock[] } {
  return {
    subject: `Thanks for going ahead, ${i.first}: here's what happens next`,
    preheader: "We'll call you to pick a day. Here's how it runs from there.",
    blocks: [
      p(`Hi ${i.first},`),
      p(`Thanks for going ahead${i.what ? ` with the ${i.what}` : ""}. Here's how it runs from here, so you know what to expect:`),
      { kind: "list", items: nextSteps(i) },
      p(`Nothing you need to do for now. If anything comes up before then, give me a call on **${i.officePhone}** or just reply here.`),
    ],
  };
}

export type BookedInput = {
  first: string;
  what: string | null;
  /** Hot water installs turn the hot water off for a while; nothing else here does. */
  hotWater: boolean;
  /** "Thursday 20 November" */
  day: string;
  /** "7 and 8 am", as the arrival window is booked; null when none is. */
  window: string | null;
  /** The tech on the visit, first name, when one's assigned. */
  tech: string | null;
  officePhone: string;
};

/**
 * You're booked in: the day and the arrival window, who's coming, and the
 * handful of things that make the day go smoothly, asked for plainly. The
 * hot water line only on a hot water job, because it isn't true of the rest.
 */
export function bookedEmail(i: BookedInput): { subject: string; preheader: string; blocks: LetterBlock[] } {
  const who = i.tech ? `${i.tech} will be` : "Our team will be";
  return {
    subject: `You're booked in for ${i.day}, ${i.first}`,
    preheader: `${i.window ? `Arriving between ${i.window}. ` : ""}A few things that help on the day.`,
    blocks: [
      p(`Hi ${i.first},`),
      p(`You're booked in for **${i.day}**${i.window ? `, arriving between **${i.window}**` : ""}. ${who} doing the ${i.what ? `${i.what} install` : "install"}.`),
      p("A few things that help on the day:"),
      { kind: "list", items: [
        "**Clear a path** to the old unit and to where the new one's going, so the team can get straight to it.",
        "**Someone over 18 at home** when we arrive, to show us around and sign off at the end.",
        ...(i.hotWater ? ["**The hot water will be off** while we swap the units over, so a shower before we arrive is a good idea."] : []),
        "**Pets** inside or out the back while we're in and out, and we'll make sure the gates are shut behind us.",
      ] },
      p(`If that day doesn't work any more, give us a call on **${i.officePhone}** and we'll move it. Otherwise, see you then.`),
    ],
  };
}
