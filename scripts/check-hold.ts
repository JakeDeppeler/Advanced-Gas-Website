/**
 * The On hold page's rules, against the office's own 44 tags.
 *
 * The whole page rests on deciding which of those tag names mean "this job is
 * waiting on something" — and getting it wrong in either direction is a wall
 * that lies: counting "Potential Member" would claim 63 held jobs that are not
 * held, and missing "Materials Not Ordered" would hide the 16 that are.
 */
import {
  blocksByDefault,
  holdRules,
  normaliseHoldTags,
  sideByDefault,
  agesOf,
  sortHeld,
  tagIds,
  worstSide,
  type HeldJob,
} from "../src/lib/dashboard/onHoldTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra ? `  ${extra}` : ""}`);
  if (!pass) bad++;
};

/** Every tag this office has, read off st_job_tags on 13 October 2026. */
const TAGS = [
  "AC Service Due 2026", "AC Serviced 2026", "Accounting", "Awaiting Further Instructions ⏳",
  "Awaiting Quote Approval 💭", "Bronze Membership Plan 🥉", "Cat 🐈‍⬛", "Collect Keys 🗝️",
  "Decommission ⚠️", "Do not auto-send invoice", "Do Not Service", "Dog 🐶", "Follow Up",
  "Gold Membership Plan🏅", "GTE Booked", "GTE Not Booked", "Harness / Height Safety Equipment🪢 ",
  "High Value Job 🔥", "Inspection 🔎", "Investigations 🕵️", "Invoice Ready 💲", "Key Safe 🧰",
  "Left A Voicemail", "Maintenance", "Materials Delivered", "Materials Not Ordered",
  "Materials Ordered", "Potential Member", "Potential Membership Renewal", "Problem",
  "Quotation Required", "Rebates 💰", "Repairs", "Repairs Flagged", "Replacement Opp",
  "Request SMS Opt In", "Rubbish Removal Booked🗑️", "Rubbish Removal Not Booked",
  "Silver Membership Plan 🥈", "SWMS Needed 📝", "System Not Ordered", "System Ordered ",
  "Urgent Attendance Required 🚨", "Vacant - not serviced",
];

/** What the default is meant to pick out of those 44, and whose move each is. */
const EXPECT: Record<string, "us" | "them"> = {
  "Awaiting Further Instructions ⏳": "them",
  "Awaiting Quote Approval 💭": "them",
  "Left A Voicemail": "them",
  "GTE Not Booked": "us",
  "Materials Not Ordered": "us",
  "Problem": "us",
  "Quotation Required": "us",
  "Rubbish Removal Not Booked": "us",
  "SWMS Needed 📝": "us",
  "System Not Ordered": "us",
  "Urgent Attendance Required 🚨": "us",
};

console.log("-- which of the 44 tags mean held --");
ok("every tag is classified one way or the other", TAGS.length === 44, `${TAGS.length} tags`);
const picked = TAGS.filter(blocksByDefault);
ok("eleven of them are holds", picked.length === 11, picked.join(" | "));
for (const t of Object.keys(EXPECT)) ok(`"${t}" is a hold`, blocksByDefault(t));
for (const t of TAGS.filter((x) => !(x in EXPECT))) ok(`"${t}" is not`, !blocksByDefault(t));

console.log("\n-- the two that would be easiest to get backwards --");
// "System Ordered " must not match the "not ordered" rule, and "Do not
// auto-send invoice" must not match on the bare word "not".
ok('"System Ordered " is not a hold', !blocksByDefault("System Ordered "));
ok('"Materials Ordered" is not a hold', !blocksByDefault("Materials Ordered"));
ok('"Do not auto-send invoice" is not a hold', !blocksByDefault("Do not auto-send invoice"));
ok('"Rubbish Removal Booked🗑️" is not a hold', !blocksByDefault("Rubbish Removal Booked🗑️"));

console.log("\n-- whose move it is --");
for (const [t, side] of Object.entries(EXPECT)) ok(`"${t}" is on ${side}`, sideByDefault(t) === side, sideByDefault(t));

console.log("\n-- a job tagged both ways is ours --");
// Job 301139767: Awaiting Quote Approval and four of ours. Filing it under the
// customer would park it behind a call nobody here can make.
ok("ours wins", worstSide(["them", "us", "them"]) === "us");
ok("theirs only when there is nothing of ours", worstSide(["them", "them"]) === "them");
ok("an untagged job has no side to pick", worstSide([]) === "them");

console.log("\n-- the saved list beats the default --");
const saved = normaliseHoldTags({ us: ["Rebates 💰"], them: ["Follow Up"] });
ok("it parses", !!saved && saved.us.length === 1 && saved.them.length === 1);
const r = holdRules(saved, TAGS);
ok("and it is the whole list: nothing of the default survives", r.side.size === 2, [...r.side.keys()].join(" | "));
ok('"Rebates 💰" is now a hold on us', r.side.get("Rebates 💰") === "us");
ok('"Awaiting Quote Approval 💭" is now not a hold', !r.side.has("Awaiting Quote Approval 💭"));
ok("and the page can say the office set this", r.configured);

const fallback = holdRules(null, TAGS);
ok("no saved list falls back to the default eleven", fallback.side.size === 11);
ok("and the page says so", !fallback.configured);

console.log("\n-- a tag in both lists is ours --");
const both = normaliseHoldTags({ us: ["Problem"], them: ["Problem", "Follow Up"] });
ok("deduplicated to ours", both?.us.includes("Problem") === true && both?.them.includes("Problem") === false);

console.log("\n-- a malformed row falls back rather than blanking the page --");
ok("null", normaliseHoldTags(null) === null);
ok("a string", normaliseHoldTags("Problem") === null);
ok("an object with neither key", normaliseHoldTags({ tags: ["Problem"] }) === null);
// But an empty list is a real choice and must be honoured, or the page would
// quietly come back to the defaults the office just cleared.
const empty = normaliseHoldTags({ us: [], them: [] });
ok("an empty saved list is honoured", !!empty && holdRules(empty, TAGS).side.size === 0);

console.log("\n-- the tag ids on a job, however they come back --");
// `raw->tagTypeIds` hands back a JSON array and `raw->>tagTypeIds` its text,
// and the difference is one character in a select string. Reading only one of
// them is a page that silently finds nothing held.
ok("a JSON array", tagIds([1161, 301122752]).join(",") === "1161,301122752");
ok("the same thing as text", tagIds("[1161, 301122752]").join(",") === "1161,301122752");
ok("ids that arrive as strings", tagIds(["1161", "301122752"]).join(",") === "1161,301122752");
ok("no tags at all", tagIds(null).length === 0 && tagIds(undefined).length === 0);
ok("a column that is not an array", tagIds({ a: 1 }).length === 0 && tagIds(7).length === 0);
ok("text that is not JSON", tagIds("not json").length === 0);
ok("and anything in it that is not a number is dropped", tagIds([1161, "x", null]).join(",") === "1161");

console.log("\n-- worst first --");
const job = (p: Partial<HeldJob> & { jobId: number }): HeldJob => ({
  jobNumber: null, what: "Quotation", who: null, where: null, ageDays: 1,
  value: null, reasons: [], side: "them", sold: false, ...p,
});
const order = [
  job({ jobId: 1, side: "them", ageDays: 90 }),
  job({ jobId: 2, side: "us", ageDays: 3 }),
  job({ jobId: 3, side: "us", ageDays: 24 }),
  job({ jobId: 4, side: "us", ageDays: 24, value: 15_000 }),
].sort(sortHeld);
ok("ours before theirs, however old theirs is", order.map((x) => x.jobId).join(",") === "4,3,2,1", order.map((x) => x.jobId).join(","));
// Age before money, deliberately: a $15K quote written on Friday is not the
// problem, and sorting by value would bury the one that has been sitting.
ok("and within a side, oldest before biggest", order[0].ageDays === 24 && order[2].ageDays === 3);

console.log("\n-- how long it has all been held --");
// The wall's strip reads like the AR summary on the Owed page: a band per age,
// the count and what it is worth. Measured on 14 October the real shape was
// 25 / 28 / 24 / 5 / 1 across the five bands.
const held = [
  job({ jobId: 1, ageDays: 2, value: 1000 }),
  job({ jobId: 2, ageDays: 7, value: 2000 }),
  job({ jobId: 3, ageDays: 8, value: 4000 }),
  job({ jobId: 4, ageDays: 30, value: 8000 }),
  job({ jobId: 5, ageDays: 31, value: 500 }),
  job({ jobId: 6, ageDays: 90, value: null }),
];
const ages = agesOf(held);
ok("a week and under is this week", ages.d0_7.count === 2 && ages.d0_7.value === 3000, JSON.stringify(ages.d0_7));
ok("eight opens the next band", ages.d8_14.count === 1);
ok("thirty is the last of 15–30", ages.d15_30.count === 1 && ages.d15_30.value === 8000);
ok("thirty-one is over a month", ages.d31_60.count === 1);
ok("ninety is the long grass", ages.d60plus.count === 1);
// A job with nothing quoted still has to be counted, or the band with the
// oldest work in it reads as empty.
ok("an unquoted job counts even though it adds no money", ages.d60plus.value === 0 && ages.d60plus.count === 1);
ok("every job lands in exactly one band",
   [ages.d0_7, ages.d8_14, ages.d15_30, ages.d31_60, ages.d60plus].reduce((t, x) => t + x.count, 0) === held.length);

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);
