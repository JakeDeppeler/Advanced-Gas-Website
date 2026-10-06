/**
 * The two rules that decide what the wall believes about Xero, exercised
 * together, because it is their combination that is the claim:
 *
 *   - the read gate (how often we may ask), and
 *   - the source state (how old an answer may be before the light turns).
 *
 * Neither is reachable except through a full recompute against live
 * credentials, and the failure mode of getting them wrong is a confidently
 * wrong figure on a wall — a reading from yesterday presented as current, or a
 * green light over a connection that died at lunchtime.
 *
 *   npm run check:xero
 *
 * It imports xeroFreshness.ts rather than metrics.ts on purpose: these rules
 * need no database, and going through metrics.ts meant the check broke the day
 * an unrelated feature put React in that file's import graph.
 */
import { XERO_GOOD_FOR_MS, xeroReadDue, xeroSourceState } from "../src/lib/dashboard/xeroFreshness";

let failed = 0;
function ok(cond: boolean, what: string, got?: unknown) {
  if (!cond) failed += 1;
  console.log(`${cond ? "ok  " : "FAIL"}  ${what}${cond || got === undefined ? "" : `  (got ${JSON.stringify(got)})`}`);
}

const now = new Date("2026-10-05T23:30:00.000Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const MIN = 60_000;

console.log("\n-- the read gate --");
ok(xeroReadDue(undefined, now), "never read before: due");
ok(!xeroReadDue(ago(1 * MIN), now), "read a minute ago: not due");
ok(!xeroReadDue(ago(4.9 * MIN), now), "read just under five minutes ago: not due");
ok(xeroReadDue(ago(5 * MIN), now), "read five minutes ago: due");
ok(xeroReadDue(ago(6 * MIN), now), "read six minutes ago: due");
ok(xeroReadDue("not a date", now), "unparseable timestamp: due");
ok(xeroReadDue(new Date(now.getTime() + 60 * MIN).toISOString(), now), "timestamp in the future: due");

/*
 * The gate suppresses a call at most once per interval, so a Xero that breaks
 * is retried promptly. Walk the board's own 25-second cycle forward from a
 * successful read and count what gets through.
 */
console.log("\n-- calls per hour on a 25-second recompute --");
let calls = 0;
let lastRead = ago(0);
for (let t = 0; t < 60 * MIN; t += 25_000) {
  const at = new Date(now.getTime() + t);
  if (xeroReadDue(lastRead, at)) {
    calls += 1;
    lastRead = at.toISOString(); // the read succeeds
  }
}
// 144 ticks an hour, one read each five minutes: eleven, the twelfth landing
// just past the hour. Before the gate it was one read per tick.
ok(calls === 11, "eleven reads an hour, not 144", calls);
ok(calls * 24 < 500, "under 500 a day, well inside the 5,000 tenant limit", calls * 24);

console.log("\n-- a skipped read, through the source state --");
// What computeSnapshot does on a skip: ok=false with a reason, the LAST
// SUCCESSFUL read's timestamp, and the carry-forward supplying the figures.
const skipped = xeroSourceState(false, ago(2 * MIN), now, "not due");
ok(skipped.state === "ok", "the footer light stays green", skipped.state);
ok(skipped.at === ago(2 * MIN), "and keeps the real read's time, not now", skipped.at);
ok(skipped.detail === undefined, "with nothing to explain away", skipped.detail);

console.log("\n-- a Xero that is genuinely broken --");
const brokenHours = (h: number) => xeroSourceState(false, ago(h * 60 * MIN), now, "xero 401 Unauthorized");
ok(brokenHours(6).state === "ok", "six hours old: still good enough for a wall", brokenHours(6).state);
ok(brokenHours(13).state === "stale", "thirteen hours old: admitted", brokenHours(13).state);
ok(brokenHours(13).detail === "last read 13 hours ago", "and says how old", brokenHours(13).detail);
ok(brokenHours(60).detail === "last read 3 days ago", "days once it is past two", brokenHours(60).detail);
ok(XERO_GOOD_FOR_MS === 12 * 60 * 60 * 1000, "the line is at twelve hours", XERO_GOOD_FOR_MS);

// Never read at all, and failing: there is no last value to stand behind.
const never = xeroSourceState(false, undefined, now, "xero not connected");
ok(never.state === "stale", "never read and failing: stale", never.state);
ok(never.detail === "xero not connected", "and carries the reason", never.detail);

console.log("\n-- a successful read --");
const good = xeroSourceState(true, ago(14 * 60 * MIN), now, "");
ok(good.state === "ok" && good.at === now.toISOString(), "green, stamped now", good);

console.log(failed ? `\n${failed} failed\n` : "\nall good\n");
process.exit(failed ? 1 : 0);
