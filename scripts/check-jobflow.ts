/**
 * The job tracker's stages: which list a job lands in, and the track drawn
 * under it.
 *
 * Each list is somebody's work for the morning. A job in the wrong list gets
 * the wrong person ringing the wrong customer; a job in no list is the job
 * this page exists to stop losing.
 */
import { daysSince, emailKey, openStage, phoneKeys, trackFor, unsentOwing, STAGES, type OpenJob } from "../src/lib/jobflow/types";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const NOW = Date.parse("2026-10-24T02:00:00Z");
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const ahead = (days: number) => new Date(NOW + days * 86_400_000).toISOString();
const job = (o: Partial<OpenJob>): OpenJob => ({ status: "Scheduled", quoteVisit: false, imported: false, lastVisit: null, nextVisit: null, quoted: false, ...o });

console.log("-- open jobs --");
ok("an imported job is a clean-up, whatever its status", openStage(job({ imported: true, status: "Hold", nextVisit: ahead(1) }), NOW) === "imported");
ok("hold is hold, tagged or not", openStage(job({ status: "Hold", lastVisit: ago(10) }), NOW) === "hold");
ok("a visit still to come is on track", openStage(job({ nextVisit: ahead(2), lastVisit: ago(9) }), NOW) === "booked");
ok("no appointment at all needs one booked", openStage(job({}), NOW) === "nodate");
ok("a quote visit that's been, not quoted, is to quote — even the same day", openStage(job({ quoteVisit: true, lastVisit: ago(0.1) }), NOW) === "toquote");
ok("a quote visit three weeks ago, not quoted, is still to quote", openStage(job({ quoteVisit: true, lastVisit: ago(21) }), NOW) === "toquote");
ok("quoted and the visit yesterday: still being finished", openStage(job({ quoteVisit: true, quoted: true, lastVisit: ago(1) }), NOW) === "booked");
ok("quoted and the visit three days ago: close it", openStage(job({ quoteVisit: true, quoted: true, lastVisit: ago(3) }), NOW) === "closevisit");
ok("work visited yesterday, open: still being finished", openStage(job({ status: "InProgress", lastVisit: ago(1) }), NOW) === "booked");
ok("work visited two days ago, open: left open", openStage(job({ status: "InProgress", lastVisit: ago(2) }), NOW) === "notclosed");
// The 27 work jobs still Scheduled with their appointment weeks gone are the
// ones a status count never sees: nobody started them in the app either.
ok("still Scheduled with the visit day long gone: left open", openStage(job({ status: "Scheduled", lastVisit: ago(20) }), NOW) === "notclosed");
ok("a return visit booked takes it off the not-closed list", openStage(job({ status: "InProgress", lastVisit: ago(20), nextVisit: ahead(3) }), NOW) === "booked");

console.log("\n-- days --");
ok("an hour ago is today", daysSince(ago(0.04), NOW) === 0);
ok("a time in the future is never negative", daysSince(ahead(2), NOW) === 0);
ok("thirty-six hours is one day", daysSince(ago(1.5), NOW) === 1);

console.log("\n-- not sent --");
ok("not sent with money owing", unsentOwing({ sent: "NotSent", balance: "120.00" }));
ok("not sent and paid on the day is fine", !unsentOwing({ sent: "NotSent", balance: "0" }));
ok("a few cents of rounding isn't owing", !unsentOwing({ sent: "NotSent", balance: 0.4 }));
ok("sent is sent", !unsentOwing({ sent: "Sent", balance: 500 }));
ok("opened is sent", !unsentOwing({ sent: "Opened", balance: 500 }));

console.log("\n-- the track --");
const line = (t: Record<string, string>) => Object.entries(t).map(([k, v]) => `${k}:${v}`).join(" ");
const tb = trackFor("tobill");
ok("done, not invoiced: stuck at invoiced", tb.done === "done" && tb.invoiced === "now" && tb.sent === "todo", line(tb));
ok("service work with no quote skips quoted and sold", tb.quoted === "skip" && tb.sold === "skip");
const tbq = trackFor("tobill", { quotePath: true });
ok("sold work keeps them, passed", tbq.quoted === "done" && tbq.sold === "done", line(tbq));
const tq = trackFor("toquote");
ok("to quote: visited, stuck at quoted", tq.visited === "done" && tq.quoted === "now" && tq.sold === "todo", line(tq));
const cv = trackFor("closevisit", { quotePath: true });
ok("a free quote visit stops at done: no bill, no payment of its own", cv.quoted === "done" && cv.done === "now" && cv.sold === "skip" && cv.invoiced === "skip" && cv.paid === "skip", line(cv));
const od = trackFor("overdue");
ok("overdue: everything but paid", od.sent === "done" && od.paid === "now", line(od));
ok("hold before anyone's been: stuck at the visit", trackFor("hold", { visited: false }).visited === "now");
ok("hold after a visit: stuck at done", trackFor("hold", { visited: true }).done === "now");
ok("exactly one step is where it's stuck, for every stage", STAGES.every((s) => Object.values(trackFor(s.k, { quotePath: true })).filter((v) => v === "now").length === 1));

console.log("\n-- matching an enquiry to ServiceTitan --");
ok("a mobile as typed", JSON.stringify(phoneKeys("0412 345 678")) === JSON.stringify(["0412345678", "412345678"]), phoneKeys("0412 345 678"));
ok("+61 comes back to 0", phoneKeys("+61 412 345 678")[0] === "0412345678");
ok("a mobile with the zero dropped", phoneKeys("412345678")[0] === "0412345678");
ok("a Melbourne landline also without its area code", phoneKeys("(03) 9701 2345").includes("97012345"), phoneKeys("(03) 9701 2345"));
ok("a mobile never matches on eight digits", !phoneKeys("0412345678").includes("12345678"));
ok("too short to be a number matches nothing", phoneKeys("1234").length === 0);
ok("nothing typed matches nothing", phoneKeys(null).length === 0);
ok("email trimmed and lowered", emailKey("  Jo@Example.COM ") === "jo@example.com");
ok("not an email", emailKey("jo at example") === null);

console.log(bad ? `\n${bad} failed` : "\nall good");
process.exit(bad ? 1 : 0);
