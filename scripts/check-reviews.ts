/**
 * Who gets asked for a Google review, when, and what the email says
 * (src/lib/reviews/requestTypes.ts).
 */
import { firstName, holdFor, inSendingHours, jobWords, reviewEmail, reviewHero, reviewLink, reviewLinkOk, reviewSettingsFrom, techWords, whyNot, type Candidate, type EmailContext } from "../src/lib/reviews/requestTypes";
import { SERIES_DAYS, followUpEmail, quoteKind, type FollowUpInput } from "../src/lib/quotes/followUpContent";
import { letterHtml, letterText, premiumHtml, type LetterBlock, type LetterEmail } from "../src/lib/email/premium";
import { ANSWERS, customerReply, officeMessage, optionWords, type AnswerContext } from "../src/lib/quotes/answerTypes";
import { soldEmail } from "../src/lib/quotes/journeyContent";
import { headshot } from "../src/lib/email/team";
import { existsSync } from "node:fs";

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
ok("tagged Problem still qualifies (it's held, not dropped)", whyNot({ ...base, tags: ["Dog 🐶", "Problem"] }, now) === null);
ok("tagged Problem is held", holdFor({ ...base, tags: ["Dog 🐶", "Problem"] })?.startsWith("tagged Problem") === true);
ok("call-back booked is held", holdFor({ ...base, returnVisitOpen: true })?.startsWith("a return visit") === true);
ok("nothing open: not held", holdFor(base) === null);
ok("a held job is still in time at 20 days", whyNot({ ...base, completedOn: "2026-10-18T00:00:00Z" }, now, 7 + 21 + 7) === null);
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
const ctx: EmailContext = { base: "https://www.advancedgas.com.au", footer: { name: "Advanced Gas & Aircon", phone: "(03) 5947 8000", phoneHref: "tel:+61359478000", address: "1 Sierra Circuit, Pakenham VIC 3810", site: "https://www.advancedgas.com.au" }, proof: "**★ 4.8** on Google" };
const m = reviewEmail(reviewSettingsFrom({}), { customer: "Sarah Jones", techs: ["Ray Kennedy"], jobType: "Service - Split System", suburb: "Berwick", href: "https://www.advancedgas.com.au/r/abc" }, ctx);
ok("subject", m.subject === "How did Ray go, Sarah?", m.subject);
ok("button in the html, once", (m.html.match(/Leave a Google review/g) ?? []).length === 1 && m.html.includes('href="https://www.advancedgas.com.au/r/abc"'));
ok("reads like an email: no card, no logo, the tech named in the words", !m.html.includes("/email/logo.jpg") && !m.html.includes(">RK<") && m.text.includes("having Ray out") && !m.text.includes("Cheers,\nJake") );
const j = reviewEmail(reviewSettingsFrom({ signer: "dean" }), { customer: "Sarah Jones", techs: ["Jye Stephens"], jobType: "Install - Heat Pump", suburb: null, href: "https://x" }, ctx);
ok("the signer's photo, and the job photo when there is one", j.html.includes("/email/tech-dean.jpg") && reviewEmail(reviewSettingsFrom({}), { customer: "Sarah", techs: ["Jye"], jobType: null, suburb: null, href: "https://x", photo: "https://www.advancedgas.com.au/_next/image?url=x" }, ctx).html.includes("data-fallback="));
ok("stock photo by job, showing the whole system", reviewHero("Service - Split System").src.includes("split") && reviewHero("Installation - Heat Pump").src.includes("hp-aio") && reviewHero("Installation - Heat Pump").width < 400 && reviewHero("Plumbing - Gas Leak").src.includes("team"));
ok("images are absolute", !/src="\//.test(j.html));
ok("every email image exists", [...new Set([...j.html.matchAll(/src="https:\/\/www\.advancedgas\.com\.au(\/[^"]+)"/g)].map((x) => x[1]))].every((p) => existsSync(`public${decodeURIComponent(p)}`)));
ok("headshot lookup", headshot(" jye  stephens ") === "/email/tech-jye.jpg" && headshot("Ray Kennedy") === null);
const noBtn = reviewEmail(reviewSettingsFrom({ body: "Hi {first}" }), { customer: "Sarah Jones", techs: [], jobType: null, suburb: null, href: "https://x" }, ctx);
ok("button added if the words lost it", noBtn.html.includes("Leave a Google review"));
ok("text has the link", /Leave a Google review[^:\n]*: https:\/\/www\.advancedgas\.com\.au\/r\/abc/.test(m.text));
ok("no placeholder left", !/\{\w+\}/.test(m.text + m.subject), m.text);
ok("the reply offer is there for everyone", /if anything wasn't right, just reply/i.test(m.text));
const x = reviewEmail(reviewSettingsFrom({}), { customer: "<b>Evil</b>", techs: ["<i>x</i>"], jobType: null, suburb: null, href: "https://x" }, ctx);
ok("names can't inject html", !x.html.includes("<b>Evil") && !x.html.includes("<i>x"));

console.log("-- quote follow-ups --");
ok("heat pump quote", quoteKind(["Reclaim 300L - Plug", "IStore 270L - Plug"]) === "heat-pump");
ok("panasonic split is hot water", quoteKind(["Panasonic Split SS 315L 6kw"]) === "heat-pump");
ok("split system quote", quoteKind(["Kaden 7.1kW Split System - Back to Back"]) === "split" && quoteKind(["Rinnai 11kw Multi Head Split System"]) === "split");
ok("ducted falls back for now", quoteKind(["Braemar Dominator Installation Internal"]) === "general");
const fin: FollowUpInput = { first: "Sarah", quoter: "Jake", quoterSigns: true, options: ["Reclaim 300L - Plug", "IStore 270L - Plug", "Thermann 285L - Plug"], phone: "(03) 5947 8000", answers: { yes: "https://www.advancedgas.com.au/q/1/yes?s=a", question: "https://www.advancedgas.com.au/q/1/question?s=b", no: "https://www.advancedgas.com.au/q/1/no?s=c" } };
const signer = { name: "Jake Deppeler", role: "Advanced Gas & Aircon", photo: "/email/tech-jake.jpg" };
for (const kind of ["heat-pump", "split", "general"] as const) for (let step = 1; step <= SERIES_DAYS[kind].length; step++) {
  const e = followUpEmail(kind, step, fin);
  const html = letterHtml({ ...ctx, preheader: e.preheader, blocks: e.blocks, signer });
  const text = letterText({ ...ctx, preheader: e.preheader, blocks: e.blocks, signer });
  ok(`${kind} ${step}: reads like a letter (Hi, no headline, asks them to call)`, e.blocks[0]?.kind === "p" && e.blocks[0].text === "Hi Sarah," && /give me a call on \(03\) 5947 8000/i.test(text) && !/<h\d|text-transform:uppercase/.test(html));
  // The closer is just a note from a person, and so is "did it come through"; the rest show our work.
  if (!e.subject.startsWith("Before I close off") && !(kind === "general" && step === 1) && !e.blocks.some((b) => b.kind === "stats")) ok(`${kind} ${step}: a photo in it`, /<img[^>]+\/email\/(hero|hp|opt|split)/.test(html));
  ok(`${kind} ${step}: the three answer buttons`, (html.match(/\/q\/1\/(yes|question|no)/g) ?? []).length === 3);
  ok(`${kind} ${step}: no captions under photos, no address footer`, !html.includes("Sierra Circuit"));
  ok(`${kind} ${step}: words, no gaps`, !!e.subject && !/\{\w+\}|undefined|  /.test(text), text.slice(0, 80));
  ok(`${kind} ${step}: images exist`, [...html.matchAll(/src="https:\/\/www\.advancedgas\.com\.au(\/[^"]+)"/g)].every((x) => existsSync(`public${decodeURIComponent(x[1])}`)));
}
ok("heat pump: check-in, savings (stats), brands, closer", /checking in/i.test(followUpEmail("heat-pump", 1, fin).subject) && followUpEmail("heat-pump", 2, fin).blocks.some((b) => b.kind === "stats") && /Reclaim/.test(followUpEmail("heat-pump", 3, fin).subject));
const hpBrands = letterText({ ...ctx, preheader: "", blocks: followUpEmail("heat-pump", 3, fin).blocks, signer });
ok("R290 300 L first, CO₂ split, iStore last, never Thermann", hpBrands.indexOf("R290") < hpBrands.indexOf("iStore") && !/thermann/i.test(hpBrands) && ["heat-pump"].every(() => SERIES_DAYS["heat-pump"].every((_, n) => !/thermann/i.test(letterText({ ...ctx, preheader: "", blocks: followUpEmail("heat-pump", n + 1, fin).blocks, signer })))));
ok("split: check-in, brands, running costs (stats), closer", /checking in/i.test(followUpEmail("split", 1, fin).subject) && followUpEmail("split", 3, fin).blocks.some((b) => b.kind === "stats"));
ok("the last one is the closer", ["heat-pump", "split", "general"].every((k) => followUpEmail(k as "split", SERIES_DAYS[k as "split"].length, fin).subject.startsWith("Before I close off")));
ok("someone else quoted: named", letterText({ ...ctx, preheader: "", blocks: followUpEmail("split", 1, { ...fin, quoter: "Jye", quoterSigns: false }).blocks, signer }).includes("since Jye was out"));
ok("no capital after a comma", ["heat-pump", "split", "general"].every((k) => SERIES_DAYS[k as "split"].every((_, n) => !/, Give me/.test(letterText({ ...ctx, preheader: "", blocks: followUpEmail(k as "split", n + 1, fin).blocks, signer })))));
console.log("-- the answers --");
const actx: AnswerContext = { customer: "Sarah Jones", first: "Sarah", email: "sarah@gmail.com", phone: "0412 345 678", suburb: "Berwick", jobNumber: "20999", option: "Reclaim 300L - Plug", total: 3060.5, quoterName: "Jake Deppeler", jobHref: "https://go.servicetitan.com/#/Job/Index/1", when: "Sat 8 Nov, 2:14 pm", note: null, officePhone: "(03) 5947 8000" };
const asText = (m: { preheader: string; blocks: LetterBlock[]; signer?: LetterEmail["signer"] }) => letterText({ ...ctx, preheader: m.preheader, blocks: m.blocks, signer: m.signer ?? signer });
const asHtml = (m: { preheader: string; blocks: LetterBlock[]; signer?: LetterEmail["signer"] }) => letterHtml({ ...ctx, preheader: m.preheader, blocks: m.blocks, signer: m.signer ?? signer });
const yes = officeMessage("yes", actx);
ok("yes to the office: subject names them and the option", yes.subject === "Sarah Jones wants to go ahead: Reclaim 300L (job 20999)", yes.subject);
ok("yes to the office: addressed to the quoter, in the customer's words, with the price and the mobile", /^Hi Jake,\n\nYes please, let's go ahead with the Reclaim 300L \(\$3,060\.50\) at Berwick\.\n\nGive me a call on 0412 345 678, or reply to this email to pick a day\./.test(asText(yes)), asText(yes).slice(0, 160));
ok("yes to the office: a button to the job, and the note says what to do and where it came from", asHtml(yes).includes("Open job 20999 in ServiceTitan") && /Ring them and book it in\. Written by the portal when Sarah tapped "Let's go ahead"/.test(asText(yes)));
ok("yes to the office: signed by the customer with their mobile and email, not our number", yes.signer.name === "Sarah Jones" && yes.signer.role === "Berwick · job 20999" && asText(yes).endsWith("0412 345 678 · sarah@gmail.com") && !asHtml(yes).includes("5947 8000"));
const qn = officeMessage("question", { ...actx, note: "Does it fit beside the meter box?" });
ok("question to the office: the question quoted, ring them", /I've got a question about the Reclaim 300L at Berwick:\n\n"Does it fit beside the meter box\?"\n\nCould you give me a call on 0412 345 678, or reply to this email\?/.test(asText(qn)), asText(qn).slice(0, 200));
const no = officeMessage("no", { ...actx, note: "Repairing the old one for now." });
ok("no to the office: says so, and that nothing's left to do", /not going ahead this time\.\n\n"Repairing the old one for now\."/.test(asText(no)) && /marked lost on the Pipeline\. Nothing else to do\./.test(asText(no)) && no.subject === "Sarah Jones isn't going ahead with Reclaim 300L (job 20999)");
const noPhone = officeMessage("yes", { ...actx, phone: null, email: null, jobHref: null, jobNumber: null, suburb: null, total: null });
ok("nothing known about them: still reads", /Yes please, let's go ahead with the Reclaim 300L\.\n\nI'm ready to pick a day\./.test(asText(noPhone)) && noPhone.signer.role === "Customer" && !/undefined|null/.test(asText(noPhone)), asText(noPhone));
ok("someone else quoted: addressed to them", asText(officeMessage("yes", { ...actx, quoterName: "Jye Stephens" })).startsWith("Hi Jye,") && asText(officeMessage("yes", { ...actx, quoterName: null })).startsWith("Hi team,"));

const r = customerReply("yes", actx);
ok("yes to the customer: what happens next, four steps, nothing to do", r.subject === "Great news, Sarah: here's what happens next" && r.blocks.some((b) => b.kind === "list" && b.items.length === 4) && /We'll give you a call on 0412 345 678/.test(asText(r)) && /We order your Reclaim 300L/.test(asText(r)) && /rebate paperwork/.test(asText(r)) && /Nothing you need to do for now/.test(asText(r)));
const rq = customerReply("question", { ...actx, note: "Does it fit?" });
ok("question to the customer: quoted back, we'll call", /I've got your question:\n\n"Does it fit\?"\n\nI'll give you a call on 0412 345 678/.test(asText(rq)), asText(rq).slice(0, 200));
const rn = customerReply("no", actx);
ok("no to the customer: closed off, door open", rn.subject === "No worries, Sarah" && /closed your quote for the Reclaim 300L off/.test(asText(rn)) && /pick it up where we left off/.test(asText(rn)));
ok("replies carry no buttons and no job links", (["yes", "question", "no"] as const).every((a) => { const h = asHtml(customerReply(a, actx)); return !h.includes("/q/") && !h.includes("servicetitan"); }));
ok("option words: the fitting code comes off", optionWords("Reclaim 300L - Plug") === "Reclaim 300L" && optionWords("Mitsubishi Electric 3.5kW Split System - Back to Back") === "Mitsubishi Electric 3.5kW Split System" && optionWords("Reclaim Split SS 315L V2") === "Reclaim Split SS 315L V2" && optionWords(null) === null);
ok("answer pages: yes says an email's coming", /email on its way/.test(ANSWERS.yes.done));

console.log("-- what happens next --");
const sold = soldEmail({ first: "Sarah", what: "Reclaim 300L", phone: "0412 345 678", officePhone: "(03) 5947 8000" });
ok("the steps say ServiceTitan's confirmation is coming", /you'll get a confirmation with the day and arrival time/.test(asText(sold)));
ok("letters run the window's width", !/max-width:600px/.test(asHtml(sold)));
ok("sold: thanks, the same four steps", sold.subject === "Thanks for going ahead, Sarah: here's what happens next" && sold.blocks.some((b) => b.kind === "list" && b.items.length === 4) && /with the Reclaim 300L\./.test(asText(sold)));
ok("journey emails: letters with no buttons", [sold].every((e) => e.blocks[0].kind === "p" && e.blocks[0].text === "Hi Sarah," && !asHtml(e).includes("/q/")));

const css = premiumHtml({ ...ctx, preheader: "", blocks: [] }).split("<style>")[1].split("</style>")[0];
ok("dark-mode colours never apply in light mode", css.split(/[{}]/).filter((_, k) => k % 2 === 0).flatMap((sel) => sel.split(",")).map((x) => x.trim()).filter((x) => /pe-(btn|ink|ground|shell|tint|muted|ghost|orange|line)/.test(x)).every((x) => /^(:root|\[data-ogs[bc]\])/.test(x)));

if (bad) { console.log(`\n${bad} failed`); process.exit(1); }
console.log("\nall passed");
