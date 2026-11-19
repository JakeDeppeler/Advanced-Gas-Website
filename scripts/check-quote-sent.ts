/**
 * The "quote sent" rule (Jake, 19 Nov): ServiceTitan's note on the job,
 * "Estimate emailed to <address>", moves it from Quote In Draft to Awaiting
 * Quote Approval. Only that note; an office note about emailing one later
 * doesn't. And a job at Awaiting is never put back.
 */
import { emailedAt, planTags, SENT_NOTE } from "../src/lib/automation/quoteStage";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  if (!pass) bad++;
  console.log(`${pass ? "ok  " : "FAIL"}  ${name}${pass ? "" : `  ${JSON.stringify(extra)}`}`);
};

ok("ServiceTitan's note", SENT_NOTE.test("Estimate emailed to someone@example.com"));
ok("any case", SENT_NOTE.test("estimate emailed to someone@example.com"));
ok("not a plan to email one", !SENT_NOTE.test("Need to email estimate to the customer tomorrow"));
ok("not an estimate written", !SENT_NOTE.test("Estimate written, customer to be emailed"));
ok("not a work order emailed", !SENT_NOTE.test("Work order emailed to the electrician"));
ok("no notes, no time", emailedAt([]) === null);
ok("the newest note's time", emailedAt([
  { text: "Estimate emailed to a@b.com", createdOn: "2026-11-10T01:00:00Z" },
  { text: "Called the customer", createdOn: "2026-11-18T01:00:00Z" },
  { text: "Estimate emailed to a@b.com", createdOn: "2026-11-15T01:00:00Z" },
]) === "2026-11-15T01:00:00Z");
ok("a note without a date still counts", emailedAt([{ text: "Estimate emailed to a@b.com" }]) === "");

// The tag ids as they'd be in ServiceTitan.
const ids = { toQuote: 1, draft: 2, sent: 3, toBook: 4 };
ok("a job at Awaiting isn't put back to draft", planTags([3, 99], "draft", ids) === null);
ok("a sold quote still goes on to To Be Booked", JSON.stringify(planTags([3, 99], "toBook", ids)) === JSON.stringify({ tags: [99, 4], add: 4, drop: [3] }), planTags([3, 99], "toBook", ids));

console.log(bad ? `\n${bad} failed` : "\nall passed");
if (bad) process.exit(1);
