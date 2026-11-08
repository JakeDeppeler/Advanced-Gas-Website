import type { LetterBlock } from "@/lib/email/premium";

/**
 * The emails that walk a customer through the job once they've said yes
 * (Jake, 8 Nov: "when they book or buy something they get an email explaining
 * the process, we want to make it an everything-taken-care-of process").
 *
 * Every step here is one the website already promises (the FAQs and the
 * About page: no subcontractors, compliance certificate on every job, we lodge
 * the rebate), and nothing about money. Pure, for the check script.
 *
 * No "you're booked in" email: ServiceTitan sends its own booking
 * confirmation with the day and arrival window (Jake, 8 Nov), and a second
 * one from us would be noise. The steps say it's coming instead.
 */

const p = (text: string): LetterBlock => ({ kind: "p", text });

/** How it runs from "yes" to done, for the thank-you and the going-ahead reply. */
export function nextSteps(i: { what: string | null; phone: string | null }): string[] {
  return [
    `**We'll give you a call** on ${i.phone ?? "the number we have"} within the next business day to pick an install day that suits you. Once it's in, you'll get a confirmation with the day and arrival time.`,
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
