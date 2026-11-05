/**
 * The morning to-do email's rules (src/lib/reminders/dailyTypes.ts), on the
 * office's real tag names as ServiceTitan has them, emoji and stray spaces and all.
 */
import { billingDays, callBackLine, telHref, jobLine, outstanding, spanLabel, subjectFor, visitLabel } from "../src/lib/reminders/dailyTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log("-- which groups a job is in --");
ok("bin not booked", same(outstanding(["Rubbish Removal Not Booked"]), ["rubbish"]));
ok("bin booked (emoji) clears it", same(outstanding(["Rubbish Removal Not Booked", "Rubbish Removal Booked🗑️"]), []));
ok("materials and system both outstanding", same(outstanding(["Rebates 💰", "GTE Not Booked", "Materials Not Ordered", "System Not Ordered"]), ["system", "materials", "electrician"]));
ok("a brand's System Ordered clears System Not Ordered", same(outstanding(["Materials Not Ordered", "System Not Ordered", "Brivis System Ordered"]), ["materials"]));
ok("trailing space: 'System Ordered '", same(outstanding(["System Not Ordered", "System Ordered "]), []));
ok("'Rinnai System Ordered ' counts", same(outstanding(["System Not Ordered", "Rinnai System Ordered "]), []));
ok("Materials Delivered clears materials", same(outstanding(["Materials Not Ordered", "Materials Delivered"]), []));
ok("GTE Booked clears GTE", same(outstanding(["GTE Booked", "Materials Not Ordered"]), ["materials"]));
ok("unrelated tags: nothing", same(outstanding(["Dog 🐶", "To Be Booked", "Quote In Draft"]), []));
ok("'System Not Ordered' is not read as done", same(outstanding(["System Not Ordered"]), ["system"]));

console.log("-- the billing days --");
ok("Thursday: Wednesday", same(billingDays("2026-11-05"), { from: "2026-11-04", to: "2026-11-04" }));
ok("Monday: Friday to Sunday", same(billingDays("2026-11-09"), { from: "2026-11-06", to: "2026-11-08" }));
ok("Tuesday: Monday", same(billingDays("2026-11-10"), { from: "2026-11-09", to: "2026-11-09" }));
ok("Monday over a month end", same(billingDays("2026-11-30"), { from: "2026-11-27", to: "2026-11-29" }));
ok("span label, one day", spanLabel({ from: "2026-11-04", to: "2026-11-04" }) === "Wed 4 Nov", spanLabel({ from: "2026-11-04", to: "2026-11-04" }));
ok("span label, weekend", spanLabel({ from: "2026-11-06", to: "2026-11-08" }) === "Fri 6 – Sun 8 Nov", spanLabel({ from: "2026-11-06", to: "2026-11-08" }));
ok("span label, across months", spanLabel({ from: "2026-10-30", to: "2026-11-01" }) === "Fri 30 Oct – Sun 1 Nov", spanLabel({ from: "2026-10-30", to: "2026-11-01" }));

console.log("-- the lines --");
// 20:00Z on 4 Nov is 7am on Thursday 5 Nov in Melbourne (AEDT).
ok("today", visitLabel("2026-11-04T20:00:00Z", "2026-11-05") === "Today 7:00am", visitLabel("2026-11-04T20:00:00Z", "2026-11-05"));
ok("tomorrow", visitLabel("2026-11-05T23:30:00Z", "2026-11-05") === "Tomorrow 10:30am", visitLabel("2026-11-05T23:30:00Z", "2026-11-05"));
ok("later in the week", visitLabel("2026-11-08T20:30:00Z", "2026-11-05") === "Mon 9 Nov 7:30am", visitLabel("2026-11-08T20:30:00Z", "2026-11-05"));
const line = jobLine({ id: 1, jobNumber: "20762", customer: "Amy Makin", where: "12 Smith St, Cranbourne North", jobType: "Repair - Evaporative Cooler", visit: "2026-11-04T20:00:00Z" }, "2026-11-05");
ok("job line", line === "Today 7:00am · Job 20762 · Amy Makin, 12 Smith St, Cranbourne North · Repair - Evaporative Cooler", line);
ok("billing line has no time", jobLine({ id: 2, jobNumber: "20700", customer: "Bob", where: "Berwick", jobType: null, visit: null }, "2026-11-05") === "Job 20700 · Bob, Berwick");
const subj = subjectFor([
  { key: "rubbish", title: "", jobs: [{} as never], later: 0 },
  { key: "materials", title: "", jobs: [{} as never, {} as never, {} as never], later: 0 },
  { key: "billing", title: "", jobs: [{} as never, {} as never], later: 0 },
]);
ok("subject", subj === "To do today: 1 rubbish removal to book, 3 materials to order, 2 to bill", subj);

console.log("-- call-backs --");
const cbl = callBackLine({ at: "2026-11-04T03:15:00Z", name: "Sarah Jones", phone: "0412 345 678", about: "quote for a heat pump", from: "s@x.com", mailbox: "admin@advancedgas.com.au", subject: "Heat pump" }, "2026-11-05");
ok("call-back line", cbl === "Asked yesterday 2:15pm · Sarah Jones · 0412 345 678 · quote for a heat pump", cbl);
const cbn = callBackLine({ at: "2026-11-05T01:00:00Z", name: null, phone: null, about: null, from: "s@x.com", mailbox: "admin@", subject: "Call me" }, "2026-11-05");
ok("no number, no name", cbn === "Asked today 12:00pm · s@x.com · no number given, see the email · Call me", cbn);
ok("tel link", telHref("0412 345 678") === "tel:0412345678" && telHref("+61 3 5941 0000") === "tel:+61359410000" && telHref("ask for Bob") === null);
ok("subject with call-backs first", subjectFor([{ key: "materials", title: "", jobs: [{} as never], later: 0 }], 2) === "To do today: 2 to call back, 1 materials to order");

if (bad) { console.log(`\n${bad} failed`); process.exit(1); }
console.log("\nall passed");
