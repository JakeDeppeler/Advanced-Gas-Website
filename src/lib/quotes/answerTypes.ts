/**
 * The one-tap answers at the bottom of a quote follow-up (Jake, 8 Nov: "super
 * clean and simple to click a button to go ahead or decline the job").
 * Pure, so the email and the check script share the wording.
 */
export const ANSWERS = {
  yes: { button: "Let's go ahead", heading: "Great, let's get it booked in.", ask: "Tap below and we'll give you a call to pick a day.", confirm: "Yes, book me in", done: "We'll give you a call shortly to pick a day.", note: null },
  question: { button: "I've got a question", heading: "Happy to help.", ask: "Pop your question in below if you like, and we'll give you a call.", confirm: "Call me back", done: "We'll give you a call soon.", note: "Your question (optional)" },
  no: { button: "Not this time", heading: "No worries at all.", ask: "Tap below and we'll close your quote off, so you won't get any more emails about it.", confirm: "Close my quote", done: "Done. Thanks for letting us know, and if anything changes, we're here.", note: "Mind telling us why? (optional)" },
} as const;

export type Answer = keyof typeof ANSWERS;

export const isAnswer = (v: unknown): v is Answer => typeof v === "string" && v in ANSWERS;

/** What the office is told, in the email to admin@. */
export function answerNotice(a: Answer, who: string, what: string, note: string | null): { subject: string; text: string } {
  const head = a === "yes" ? `${who} wants to go ahead` : a === "question" ? `${who} has a question` : `${who} isn't going ahead`;
  const next = a === "yes" ? "Ring them to book a day." : a === "question" ? "Ring them back." : "Their quote follow-ups have stopped. Nothing else to do.";
  return { subject: `${head}: ${what}`, text: `${head} on their ${what}, from the follow-up email.${note ? `\n\nThey wrote: "${note}"` : ""}\n\n${next}` };
}
