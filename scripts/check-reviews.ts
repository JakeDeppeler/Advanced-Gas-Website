/**
 * Who gets asked for a Google review, when, and what the email says
 * (src/lib/reviews/requestTypes.ts).
 */
import { firstName, inSendingHours, jobWords, reviewEmail, reviewLink, reviewLinkOk, reviewSettingsFrom, techWords, whyNot, type Candidate } from "../src/lib/reviews/requestTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra !== "" ? `  ${typeof extra === "string" ? extra : JSON.stringify(extra)}` : ""}`);
  if (!pass) bad++;
};

// Saturday 7 Nov 2026, 11am in Melbourne (00:00Z).
const now = new Date("2026-11-07T00:00:00Z");
const base: Candidate = { jobId: 1, businessUnit: "Domestic - Maintenance", jobType: "Service - Split System", completedOn: "2026-11-06T02:00:00Z", invoiced: 220, owing: 0, email: "sarah@gmail.com", tags: [], lastAsked: null };

console.log("-- who is asked --");
ok("a paid household service yesterday", whyNot(base, now) === null, whyNot(base, now));
ok("real estate isn't", whyNot({ ...base, businessUnit: "Real Estate - Repairs" }, now) === "not a household job");
ok("retirement village isn't", whyNot({ ...base, businessUnit: "Retirement Village - Maintenance " }, now) === "not a household job");
ok("warranty & callbacks isn't", whyNot({ ...base, businessUnit: "Warranty & Callbacks" }, now) === "not a household job");
ok("a quote visit isn't", whyNot({ ...base, jobType: "Quotation" }, now) === "a quote visit or warranty job");
ok("$0 isn't", whyNot({ ...base, invoiced: 0 }, now) === "nothing charged");
ok("still owing isn't", whyNot({ ...base, owing: 99 }, now) === "not paid yet");
ok("tagged Problem isn't", whyNot({ ...base, tags: ["Dog 🐶", "Problem"] }, now) === "tagged Problem");
ok("finished an hour ago: not yet", whyNot({ ...base, completedOn: "2026-11-06T23:00:00Z" }, now) === "finished too recently");
ok("finished 9 days ago: too late", whyNot({ ...base, completedOn: "2026-10-29T00:00:00Z" }, now) === "finished too long ago");
ok("an agency's address isn't theirs", whyNot({ ...base, email: "x@tapihq.com" }, now) === "no email of their own");
ok("our own address isn't theirs", whyNot({ ...base, email: "admin@advancedgas.com.au" }, now) === "no email of their own");
ok("asked in March: not again", whyNot({ ...base, lastAsked: "2026-03-01T00:00:00Z" }, now) === "asked in the last year");
ok("asked 13 months ago: again", whyNot({ ...base, lastAsked: "2025-10-01T00:00:00Z" }, now) === null);

console.log("-- when --");
ok("Saturday 11am", inSendingHours(now));
ok("Sunday 11am, no", !inSendingHours(new Date("2026-11-08T00:00:00Z")));
ok("Friday 8:30pm, no", !inSendingHours(new Date("2026-11-06T09:30:00Z")));
ok("Monday 9:05am, yes", inSendingHours(new Date("2026-11-08T22:05:00Z")));

console.log("-- the link --");
ok("g.page review link", reviewLinkOk("https://g.page/r/CabcdEf123/review"));
ok("google share link", reviewLinkOk("https://share.google/Y5gbVEwoMu8dAr7vp"));
ok("anything else refused", !reviewLinkOk("https://evil.example.com/google.com") && !reviewLinkOk("http://g.page/r/x/review"));
ok("place id builds the write-a-review link", reviewLink(reviewSettingsFrom({}), "ChIJabcdefghijklmn") === "https://search.google.com/local/writereview?placeid=ChIJabcdefghijklmn");
ok("saved link wins", reviewLink(reviewSettingsFrom({ link: "https://g.page/r/X1/review" }), "ChIJabcdefghijklmn") === "https://g.page/r/X1/review");
ok("neither: null", reviewLink(reviewSettingsFrom({}), undefined) === null);
ok("off unless switched on", reviewSettingsFrom({}).on === false && reviewSettingsFrom({ on: "yes" }).on === false);

console.log("-- the words --");
ok("one tech", techWords(["Ray Kennedy"]) === "Ray");
ok("two techs", techWords(["Ray Kennedy", "Dean Winbanks"]) === "Ray and Dean");
ok("nobody assigned", techWords([]) === "the team");
ok("service job", jobWords("Service - Split System") === "split system service", jobWords("Service - Split System"));
ok("install job", jobWords("Installation - Gas Ducted Heater") === "gas ducted heater installation");
ok("diagnostics", jobWords("Diagnostics - Evaporative") === "evaporative service call");
ok("first name", firstName("Sarah Jones") === "Sarah" && firstName("Kylie Creelman & Mark Creelman") === "Kylie");
ok("a site name isn't greeted", firstName("Unit 092") === "there" && firstName("27 Eliza Terrace, Officer 3809") === "there");
const m = reviewEmail(reviewSettingsFrom({}), { customer: "Sarah Jones", techs: ["Ray Kennedy"], jobType: "Service - Split System", suburb: "Berwick", href: "https://www.advancedgas.com.au/r/abc" });
ok("subject", m.subject === "How did Ray go, Sarah?", m.subject);
ok("button in the html, once", (m.html.match(/Leave a Google review/g) ?? []).length === 1 && m.html.includes('href="https://www.advancedgas.com.au/r/abc"'));
ok("text has the link", m.text.includes("Leave a Google review: https://www.advancedgas.com.au/r/abc"));
ok("no placeholder left", !/\{\w+\}/.test(m.text + m.subject), m.text);
ok("the reply offer is there for everyone", m.text.includes("If anything wasn't right"));
const x = reviewEmail(reviewSettingsFrom({}), { customer: "<b>Evil</b>", techs: [], jobType: null, suburb: null, href: "https://x" });
ok("names can't inject html", !x.html.includes("<b>Evil"));

if (bad) { console.log(`\n${bad} failed`); process.exit(1); }
console.log("\nall passed");
