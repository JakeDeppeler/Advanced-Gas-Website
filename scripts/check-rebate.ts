/**
 * The Rebates → "Not On Alitsy" rule (src/lib/automation/rebateTagRules.ts).
 * Run: npx tsx scripts/check-rebate.ts
 */
import { NOT_ON_ALITSY, isRebateTag, rebateStep } from "../src/lib/automation/rebateTagRules";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  if (!pass) bad++;
  console.log(`${pass ? "ok  " : "FAIL"}  ${name}${pass || extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
};
// tagKey as stJobNotes.ts spells names (that module is server-only).
const tagKey = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();

const NOT_ON = 303186275;
const REBATE = 209602394;
const job = (status: string, tags: number[] = [REBATE]) => ({ id: 1, status, tags });

ok("Rebates 💰 is a rebate tag", isRebateTag(tagKey("Rebates 💰")));
ok("so is plain Rebate", isRebateTag(tagKey("Rebate")));
ok("Not On Alitsy isn't", !isRebateTag(tagKey(NOT_ON_ALITSY)) && tagKey(NOT_ON_ALITSY) === "not on alitsy");
ok("a word that starts the same isn't", !isRebateTag(tagKey("Rebateable Quote")));

// The first run (12 Nov): the open ones tagged, the completed ones left alone.
ok("first run, scheduled: tagged", rebateStep(job("Scheduled"), NOT_ON, false, true) === "tag");
ok("first run, in progress: tagged", rebateStep(job("InProgress"), NOT_ON, false, true) === "tag");
ok("first run, completed: left alone", rebateStep(job("Completed"), NOT_ON, false, true) === "leave");
ok("cancelled: never", rebateStep(job("Canceled"), NOT_ON, false, true) === "skip" && rebateStep(job("Canceled"), NOT_ON, false, false) === "skip");
// From then on, any status: the office often tags a rebate once the install's done.
ok("later, completed: tagged", rebateStep(job("Completed"), NOT_ON, false, false) === "tag");
ok("later, scheduled: tagged", rebateStep(job("Scheduled"), NOT_ON, false, false) === "tag");
// Once only: the office takes it off when the rebate's on Alitsy, and it stays off.
ok("already dealt with: left as the office has it", rebateStep(job("Completed", [REBATE]), NOT_ON, true, false) === "seen");
ok("already on (put on by hand): just remembered", rebateStep(job("Scheduled", [REBATE, NOT_ON]), NOT_ON, false, false) === "seen");

if (bad) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log("\nall passed");
