/**
 * The Outlook drafts' rules, run against hand-built messages.
 *
 * The only real input is an email landing in a live mailbox, so this is where
 * the decisions get exercised: which emails get a draft, which mailbox names
 * are accepted, how the thread reads to the model, and how the reply sits in
 * the HTML Outlook made. None of it would fail a typecheck if it were wrong.
 */
import {
  answeredReason,
  insertIntoBody,
  mailboxesFrom,
  parseMailDraft,
  plainText,
  repliedSince,
  untouched,
  replyHtml,
  enquirySubject,
  signoffFor,
  skipReason,
  threadText,
  type GraphMessage,
} from "../src/lib/outlook/outlookTypes";
import { mightConfirmBooking, parseBooking, swapTag, tagWords as bookingWords } from "../src/lib/outlook/bookingTypes";
import { stSaid, tenantAddresses, tenantContacts, tenantGreeting, tenantLabel, tenantPhones } from "../src/lib/outlook/workOrderTypes";
import { DEFAULT_NEVER, DEFAULT_PROTECTED, filingSettingsFrom, flaggedWord, folderForAgency, isNever, kindOf, learnHomes, pickFolder, waitReason, wordsFromText, type DraftRecord, type Folder } from "../src/lib/outlook/filingTypes";
import { approvalFor, approvalHeading, bareStreet, followUpFor, followUpHeading, numberKey, type SiteJob } from "../src/lib/outlook/workOrderTypes";
import { DEFAULT_TENANT_BODY, DEFAULT_TENANT_SUBJECT, addressKey, bookingSummary, dedupeKey, fillTemplate, isTeamForward, siteKey, streetWord, agencyMatches, jobNumbersIn, namesSite, namesStreet, placeholderDay, melbourneInstant, mightBeWorkOrder, parseWorkOrder, stage, tenantAddress, workOrderSettingsFrom, worthListing, type WorkOrderRow } from "../src/lib/outlook/workOrderTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const BOX = "admin@advancedgas.com.au";
const NOW = Date.parse("2026-11-04T01:00:00Z");
const from = (address: string, name = "") => ({ emailAddress: { address, name } });
const msg = (over: Partial<GraphMessage> = {}): GraphMessage => ({
  id: "m1",
  subject: "Hot water not working",
  from: from("sarah.k@gmail.com", "Sarah King"),
  receivedDateTime: "2026-11-04T00:30:00Z",
  internetMessageHeaders: [{ name: "Received", value: "from x" }],
  uniqueBody: { contentType: "text", content: "Hi, our hot water stopped this morning. Can someone come out?" },
  ...over,
});

// --- mailboxes and sign-offs
ok("mailboxes: our domain only, deduped, lower-cased", JSON.stringify(mailboxesFrom("Admin@advancedgas.com.au, jake@advancedgas.com.au;someone@gmail.com admin@advancedgas.com.au")) === JSON.stringify(["admin@advancedgas.com.au", "jake@advancedgas.com.au"]));
ok("mailboxes: unset is none", mailboxesFrom(undefined).length === 0);
ok("sign-off: shared box is the business", signoffFor("admin@advancedgas.com.au") === "The Advanced Gas team");
ok("sign-off: a person's box is their name", signoffFor("jake@advancedgas.com.au") === "Jake");
ok("sign-off: a dotted name falls back to the business", signoffFor("jake.d@advancedgas.com.au") === "The Advanced Gas team");

// --- what gets a draft
ok("customer email gets a draft", skipReason(msg(), BOX, NOW) === null);
ok("draft is skipped", skipReason(msg({ isDraft: true }), BOX, NOW) === "a draft");
ok("meeting invite is skipped", skipReason(msg({ "@odata.type": "#microsoft.graph.eventMessageRequest" }), BOX, NOW) !== null);
ok("from the team is skipped", skipReason(msg({ from: from("dean@advancedgas.com.au") }), BOX, NOW) === "from the team");
ok("from the team, any case", skipReason(msg({ from: from("Dean@AdvancedGas.com.au") }), BOX, NOW) === "from the team");
for (const a of ["noreply@xero.com", "no-reply@servicetitan.com", "donotreply@reece.com.au", "MAILER-DAEMON@outlook.com", "notifications@github.com", "bounce+abc@mail.x.com"]) {
  ok(`no-reply sender skipped: ${a}`, skipReason(msg({ from: from(a) }), BOX, NOW) === "from a no-reply address");
}
for (const a of ["noreen@gmail.com", "newsagent.pakenham@gmail.com", "alertsmith@bigpond.com"]) {
  ok(`ordinary sender not mistaken for no-reply: ${a}`, skipReason(msg({ from: from(a) }), BOX, NOW) === null);
}
const withHeader = (name: string, value: string) => msg({ internetMessageHeaders: [{ name, value }] });
ok("auto-reply skipped", skipReason(withHeader("Auto-Submitted", "auto-replied"), BOX, NOW) === "an automatic message");
ok("Auto-Submitted: no is a person", skipReason(withHeader("Auto-Submitted", "no"), BOX, NOW) === null);
ok("newsletter skipped", skipReason(withHeader("List-Unsubscribe", "<mailto:x@y>"), BOX, NOW) === "a mailing list or newsletter");
ok("bulk precedence skipped", skipReason(withHeader("Precedence", "bulk"), BOX, NOW) === "bulk mail");
ok("x-autoreply skipped", skipReason(withHeader("X-Autoreply", "yes"), BOX, NOW) === "an automatic message");
ok("four days old is skipped", skipReason(msg({ receivedDateTime: "2026-10-31T00:00:00Z" }), BOX, NOW) === "older than three days");
ok("catch-up reaches further back", skipReason(msg({ receivedDateTime: "2026-10-31T00:00:00Z" }), BOX, NOW, 8 * 86_400_000) === null);
ok("but not past its own window", skipReason(msg({ receivedDateTime: "2026-10-20T00:00:00Z" }), BOX, NOW, 8 * 86_400_000) === "older than the catch-up reaches");
ok("no sender is skipped", skipReason(msg({ from: null, sender: null }), BOX, NOW) === "no sender");
ok("sender used when from is missing", skipReason(msg({ from: null, sender: from("sarah.k@gmail.com") }), BOX, NOW) === null);

// --- already answered
const m = msg();
const sent = (over: Partial<GraphMessage>) => ({ id: "s", from: from(BOX), sentDateTime: "2026-11-04T00:45:00Z", ...over });
ok("unanswered thread needs a draft", answeredReason(m, [m], BOX) === null);
ok("reply sent since: no draft", answeredReason(m, [m, sent({})], BOX) === "already replied");
ok("reply by a colleague since: no draft", answeredReason(m, [m, sent({ from: from("jake@advancedgas.com.au") })], BOX) === "already replied");
ok("a draft already started: no second one", answeredReason(m, [m, sent({ isDraft: true })], BOX) === "there's already a draft in this thread");
ok("our earlier reply doesn't count", answeredReason(m, [m, sent({ sentDateTime: "2026-11-03T00:00:00Z" })], BOX) === null);

// --- the thread as the model reads it
const t = threadText([
  msg({ id: "b", receivedDateTime: "2026-11-04T00:30:00Z", uniqueBody: { contentType: "text", content: "Thanks, Tuesday works." } }),
  { id: "a", from: from(BOX, "Advanced Gas"), sentDateTime: "2026-11-03T22:00:00Z", subject: "RE: Hot water", uniqueBody: { contentType: "text", content: "We can come Tuesday." } },
  { id: "d", isDraft: true, from: from(BOX), sentDateTime: "2026-11-04T00:50:00Z", uniqueBody: { contentType: "text", content: "half-written" } },
], BOX);
ok("thread oldest first", t.indexOf("We can come Tuesday") < t.indexOf("Tuesday works"));
ok("thread marks who wrote what", t.includes('<email from="us">') && t.includes('<email from="them">') && t.includes("Sarah King <sarah.k@gmail.com>"));
ok("thread leaves drafts out", !t.includes("half-written"));
ok("thread times are Melbourne's", t.includes("Wed, 4 Nov") && /11:30\s?am/i.test(t), t.match(/Sent: .*/g));
ok("long message is cut", threadText([msg({ uniqueBody: { contentType: "text", content: "x".repeat(9000) } })], BOX).includes("[…cut]"));
ok("html part read as text", plainText({ contentType: "html", content: "<p>Hi&nbsp;there</p><style>p{}</style><div>Line&amp;two</div>" }) === "Hi there\nLine&two");

// --- the model's answer
const d = parseMailDraft(JSON.stringify({ reply_needed: true, why_not: "", reply: "Hi Sarah,\n\nThanks.\n\nKind regards,\nThe Advanced Gas team", handoff: "" }));
ok("draft parsed", d.replyNeeded && d.reply.startsWith("Hi Sarah"));
ok("no-reply decision parsed", parseMailDraft(JSON.stringify({ reply_needed: false, why_not: "Supplier invoice", reply: "", handoff: "" })).whyNot === "Supplier invoice");
let threw = false;
try { parseMailDraft(JSON.stringify({ reply_needed: true, why_not: "", reply: "  ", handoff: "" })); } catch { threw = true; }
ok("reply needed but empty is refused", threw);
threw = false;
try { parseMailDraft(JSON.stringify({ reply: "hi" })); } catch { threw = true; }
ok("no decision is refused", threw);

// --- the draft's HTML
const h = replyHtml("Hi Sarah,\n\nWe'll be there <Tuesday> & ready.\nSee you then.\n\nKind regards,\nJake");
ok("reply escaped", h.includes("&lt;Tuesday&gt; &amp; ready") && !h.includes("<Tuesday>"));
ok("paragraphs and line breaks kept", (h.match(/<p /g) ?? []).length === 3 && h.includes("ready.<br>See you then.") && h.includes("Kind regards,<br>Jake"));
const outlook = '<html><head><meta charset="utf-8"></head><body dir="ltr"><div id="divRplyFwdMsg">From: Sarah</div><div>original</div></body></html>';
const merged = insertIntoBody(outlook, "<div>REPLY</div>");
ok("reply goes above the quoted email", merged.indexOf("REPLY") < merged.indexOf("divRplyFwdMsg") && merged.indexOf("REPLY") > merged.indexOf("<body"));
ok("no body tag: reply goes first", insertIntoBody("<div>q</div>", "R").startsWith("R"));

// --- Needs a person comes off once a reply has gone
const tagged = "2026-11-04T00:30:00Z";
ok("no reply yet: tag stays", !repliedSince([msg()], BOX, tagged));
ok("reply sent after: tag off", repliedSince([msg(), sent({})], BOX, tagged));
ok("a colleague's reply counts", repliedSince([sent({ from: from("jake@advancedgas.com.au") })], BOX, tagged));
ok("only a draft: tag stays", !repliedSince([sent({ isDraft: true })], BOX, tagged));
ok("our reply from before it arrived: tag stays", !repliedSince([sent({ sentDateTime: "2026-11-03T22:00:00Z" })], BOX, tagged));
ok("the customer writing again: tag stays", !repliedSince([msg({ id: "m2", receivedDateTime: "2026-11-04T02:00:00Z" })], BOX, tagged));
ok("sent on behalf of the shared box counts", repliedSince([sent({ from: from(BOX), sender: from("jake@advancedgas.com.au") })], BOX, tagged));

// --- an older draft is only deleted if nobody has worked on it
ok("draft as we left it: untouched", untouched("2026-11-05T00:00:00Z", "2026-11-05T00:00:04Z"));
ok("draft saved later: edited, kept", !untouched("2026-11-05T00:00:00Z", "2026-11-05T00:20:00Z"));
ok("dates missing: treated as edited, kept", !untouched(null, "2026-11-05T00:00:04Z"));

// --- work orders: which emails are read for one
const wo = (address: string, subject: string) => msg({ from: from(address), subject });
for (const [a, subj] of [
  ["pakenhamrentals@email.propertyme.com", "Barry Plant Pakenham work order - Job #18943 - 33 Willslie Cres, Berwick VIC 3806"],
  ["hi@tapihq.com", "Reminder: [TAPI-00819-3] URGENT: New urgent work order at 14 Bellevue Ct, Boronia, VIC"],
  ["hi@tapihq.com", "Provide a quote for 1/183 High Street, BERWICK, VIC"],
  ["someone@ljhooker.com.au", "Re: Work order for 5 Owen Court"],
  ["pm@raywhite.com", "Request for Quotation – 7/12-14 Fairfield St, Cranbourne VIC 3977"],
]) ok(`read for a work order: ${subj.slice(0, 40)}`, mightBeWorkOrder(wo(a, subj), ""));
ok("an ordinary customer email isn't", !mightBeWorkOrder(msg(), "Hi, our hot water stopped this morning."));
ok("a supplier invoice isn't", !mightBeWorkOrder(wo("accounts@rinnai.com.au", "Rinnai Invoice For PO AGA-261102"), "Please find attached your invoice."));
ok("work order in the body counts", mightBeWorkOrder(wo("pm@agency.com.au", "4 Nanea Path"), "Please find attached work order 17760 for the property."));
ok("team forward: Fw:", isTeamForward(msg({ from: from("dean@advancedgas.com.au"), subject: "FW: Work order 22 Smith St" })));
ok("team forward: Fwd:", isTeamForward(msg({ from: from("jake@advancedgas.com.au"), subject: "Fwd: job" })));
ok("a customer's Fw: isn't a team forward", !isTeamForward(msg({ from: from("tenant@gmail.com"), subject: "Fw: leak" })));
ok("a team email that isn't a forward isn't", !isTeamForward(msg({ from: from("dean@advancedgas.com.au"), subject: "Work order 22 Smith St" })));

// --- the same work order twice
ok("address spellings agree", addressKey("16 Kallista Circuit", "Officer") === addressKey("16 Kallista Cct", "OFFICER VIC 3809"));
ok("units kept apart", addressKey("10/1-3 Young Road", "Hallam") !== addressKey("11/1-3 Young Road", "Hallam"));
ok("a Tapi reminder is the same work order", dedupeKey("work_order", "TAPI-00819-3", "", "") === dedupeKey("work_order", "TAPI-00819", "", ""));
ok("Job #18943 and 18943 agree", dedupeKey("work_order", "Job #18943", "", "") === dedupeKey("work_order", "18943", "", ""));
ok("no number: the address decides", dedupeKey("quote_request", "", "5 Golden Green Street", "Pakenham") === dedupeKey("quote_request", "", "5 Golden Green St", "PAKENHAM"));
ok("quote request and acceptance are two visits", dedupeKey("quote_request", "", "5 Golden Green St", "Pakenham") !== dedupeKey("quote_accepted", "", "5 Golden Green St", "Pakenham"));

// --- the model's reading, and what the office sees
const read = parseWorkOrder(JSON.stringify({
  is_work_order: true, why_not: "", kind: "work_order", is_reminder: false, platform: "PropertyMe", agency: "Barry Plant Pakenham",
  property_manager: "Kate", pm_email: "pakenhamrentals@email.propertyme.com", pm_phone: "", number: "18943", street: "33 Willslie Cres",
  suburb: "Berwick", postcode: "3806", tenant_name: "Sam Lee", tenant_phone: "0412 345 678", tenant_email: "", job: "Gas stove burner not lighting",
  details: "Rear left burner won't light. Call tenant for access.", attend_by: "27/11/2026", urgent: false,
}));
ok("work order read", read.isWorkOrder && read.agency === "Barry Plant Pakenham" && read.postcode === "3806");
const sum = bookingSummary(read);
ok("booking says what it is and where from", sum.startsWith("Work order 18943 from Barry Plant Pakenham (PropertyMe): Gas stove burner not lighting"));
ok("booking carries the tenant and the date", sum.includes("Tenant: Sam Lee, 0412 345 678") && sum.includes("Attend by: 27/11/2026"));
ok("an unknown kind falls back to work order", parseWorkOrder(JSON.stringify({ ...JSON.parse(JSON.stringify({ is_work_order: true, kind: "mystery" })) })).kind === "work_order");
let woThrew = false;
try { parseWorkOrder(JSON.stringify({ kind: "work_order" })); } catch { woThrew = true; }
ok("no decision is refused", woThrew);

// --- the email to the tenant
const filled = fillTemplate(DEFAULT_TENANT_BODY, read, "(03) 5947 8000");
ok("tenant greeted by first name", filled.startsWith("Hi Sam,"));
ok("agency, address and job filled in", filled.includes("Barry Plant Pakenham has asked") && filled.includes("33 Willslie Cres, Berwick for: gas stove burner not lighting."));
ok("no braces left", !/\{\w+\}/.test(filled) && !/\{\w+\}/.test(fillTemplate(DEFAULT_TENANT_SUBJECT, read, "x")));
ok("no tenant name: 'Hi there'", fillTemplate("Hi {tenant},", { ...read, tenantName: "" }, "x") === "Hi there,");
ok("an unknown brace is left as typed", fillTemplate("{nope}", read, "x") === "{nope}");
const agencyFrom = "pakenhamrentals@email.propertyme.com";
ok("tenant's own email: sent", tenantAddress({ ...read, tenantEmail: "Sam.Lee@gmail.com" }, agencyFrom) === "sam.lee@gmail.com");
ok("the agent's email in the tenant's place: not sent", tenantAddress({ ...read, tenantEmail: "kate@barryplant.com.au", pmEmail: "kate@barryplant.com.au" }, agencyFrom) === null);
ok("same domain as the agent: not sent", tenantAddress({ ...read, tenantEmail: "rentals@barryplant.com.au", pmEmail: "kate@barryplant.com.au" }, agencyFrom) === null);
ok("a platform address: not sent", tenantAddress({ ...read, tenantEmail: "noreply@email.propertyme.com" }, "hi@tapihq.com") === null);
ok("one of ours: not sent", tenantAddress({ ...read, tenantEmail: "admin@advancedgas.com.au" }, agencyFrom) === null);
ok("not an address: not sent", tenantAddress({ ...read, tenantEmail: "call tenant" }, agencyFrom) === null);
ok("agent and tenant both on gmail: still sent", tenantAddress({ ...read, tenantEmail: "sam@gmail.com", pmEmail: "agentkate@gmail.com" }, "agentkate@gmail.com") === "sam@gmail.com");
ok("settings: on unless switched off", workOrderSettingsFrom(null).tenantEmail && !workOrderSettingsFrom({ tenantEmail: false }).tenantEmail);
ok("settings: blank wording falls back", workOrderSettingsFrom({ subject: "  ", body: "" }).body === DEFAULT_TENANT_BODY);

// --- what the page says
const base: WorkOrderRow = { id: "1", mailbox: BOX, source: "auto", status: "booked", reason: null, kind: "work_order", agency: "Barry Plant", wo_number: "18943", address: "33 Willslie Cres, Berwick", subject: null, from_address: agencyFrom, received_at: null, created_at: "2026-11-05T00:00:00Z", st_booking_id: "5551", st_job_number: null, attached_at: null, attach_error: null, tenant_email_to: null, tenant_emailed_at: null, tenant_email_note: null, details: null };
ok("booked, no job yet: in Bookings", stage(base).word === "In Bookings" && stage(base).line.includes("Booking 5551"));
ok("on its job", stage({ ...base, attached_at: "x", st_job_number: "20801" }).word === "On job 20801");
ok("refused: not booked yet", stage({ ...base, status: "failed", reason: "ServiceTitan said 400" }).tone === "bad");
ok("platform email judged not one: listed", worthListing({ status: "not", from_address: "hi@tapihq.com" }));
ok("a newsletter judged not one: not listed", !worthListing({ status: "not", from_address: "news@meta.com" }));

// --- the site in ServiceTitan: real addresses from 5 Nov against their real locations
for (const [a, as, b, bs, bu] of [
  ["11/1-3 Young Road", "HALLAM", "1 Young Road", "Hallam", "Unit 11"],
  ["33 Willslie Cres", "Berwick VIC 3806", "33 Willslie Crescent", "Berwick", ""],
  ["16 Kallista Cct", "Officer", "16 Kallista Circuit", "Officer", ""],
  ["4/11 Reserve St", "Berwick", "11 Reserve Street", "Berwick", "004"],
  ["Unit 7, 15-17 Lyall St", "Cranbourne", "15-17 Lyall Street", "Cranbourne", "Unit 7"],
]) ok(`same site: ${a}`, siteKey(a, as) === siteKey(b, bs, bu), [siteKey(a, as), siteKey(b, bs, bu)]);
ok("unit 10 isn't unit 11", siteKey("10/1-3 Young Road", "Hallam") !== siteKey("1 Young Road", "Hallam", "Unit 11"));
ok("same street, other suburb isn't", siteKey("5 Young Road", "Hallam") !== siteKey("5 Young Road", "Drouin"));
ok("searched by the street's name", streetWord("11/1-3 Young Road") === "young" && streetWord("5 Golden Green Street") === "golden");
ok("agency by name", agencyMatches("Barry Plant Pakenham", "Barry Plant Pakenham 1") && agencyMatches("Stockdale & Leggo Pakenham", "Stockdale & Leggo (Pakenham)"));
ok("another branch isn't the agency", !agencyMatches("Barry Plant Pakenham", "Barry Plant Berwick - Matavier Pty Ltd"));
ok("one word is too little to go on", !agencyMatches("Tapi", "Tapi Pty Ltd"));

// --- follow-ups go on the job already there (Jake, 12 Nov), from the week's real ones
ok("Tapi numbers agree", numberKey("TAPI-25643-1") === numberKey("[TAPI-25643] ") && numberKey("TAPI-023197") === numberKey("tapi 23197"));
ok("Job #01895 is 1895", numberKey("Job #01895") === numberKey("1895") && numberKey("PO 428520") === numberKey("428520"));
ok("Ailo's work order and quote stay apart", numberKey("WO-1061") !== numberKey("QU-1061"));
ok("no number, or too short to count", numberKey("") === "" && numberKey("#7") === "");
const FU_NOW = Date.parse("2026-11-12T00:00:00Z");
const sj = (o: Partial<SiteJob>): SiteJob => ({ id: 1, jobNumber: "20796", status: "Scheduled", numbers: [], isQuote: false, createdOn: "2026-11-09T00:00:00Z", ...o });
const wf = (kind: "work_order" | "quote_request" | "quote_accepted", number: string, isReminder = false) => ({ kind, number, isReminder });
// 4 Bishop Pl: quote request 18969 (job 20796, open), then "quote accepted" 18969 made 20799; the office cancelled 20796.
const bishop = followUpFor(wf("quote_request", "18969", true), false, [sj({ numbers: ["18969"], isQuote: true })], FU_NOW);
ok("same number, job open: onto that job", bishop?.job.jobNumber === "20796", bishop);
// Quote approvals (Jake, 12 Nov): never a job; pinned on the job it belongs to, admin emailed.
ok("approved, the quote job open: onto it, no new job", approvalFor(wf("quote_accepted", "18969"), [sj({ numbers: ["18969"], isQuote: true })], FU_NOW)?.job?.jobNumber === "20796");
ok("approved, nothing there: still an approval, no job", (() => { const a = approvalFor(wf("quote_accepted", "TAPI-25643-1"), [], FU_NOW); return a !== null && a.job === null; })());
ok("not an approval: a work order", approvalFor(wf("work_order", "18000"), [sj({ status: "Completed", numbers: ["18000"] })], FU_NOW) === null);
ok("not an approval: a request to quote", approvalFor(wf("quote_request", ""), [], FU_NOW) === null);
// 1/19 Lyall St: Tapi's install work order under the number of the quote visit done (20341) is the approval.
ok("a work order under a done quote's number: an approval on that quote", approvalFor(wf("work_order", "TAPI-023197"), [sj({ jobNumber: "20341", status: "Completed", isQuote: true, numbers: ["TAPI-023197"], createdOn: "2026-10-14T00:00:00Z" })], FU_NOW)?.job?.jobNumber === "20341");
// 1 Grenaroff Walk: the office had sold the quote into 20806 by then.
ok("approved after the office sold it into a job: onto that job", approvalFor(wf("quote_accepted", ""), [sj({ jobNumber: "20384", status: "Completed", createdOn: "2026-10-16T00:00:00Z" }), sj({ jobNumber: "20806", createdOn: "2026-11-10T00:00:00Z" })], FU_NOW)?.job?.jobNumber === "20806");
ok("approved, no number, the quote done: onto the latest quote", approvalFor(wf("quote_accepted", ""), [sj({ jobNumber: "20498", status: "Completed", isQuote: true, createdOn: "2026-10-24T00:00:00Z" })], FU_NOW)?.job?.jobNumber === "20498");
ok("approval note says so", /^QUOTE APPROVED 18969 by Barry Plant Pakenham \(PropertyMe\)\. No new job made/.test(approvalHeading({ agency: "Barry Plant Pakenham", platform: "PropertyMe", number: "18969" })));
ok("approval on the page", stage({ ...base, status: "duplicate", st_booking_id: null, st_job_number: "20796", reason: "quote approved, on job 20796 (job 20796 is open there); admin emailed" }).word === "Approved, on job 20796");
// 5 Albany Cres: TAPI-25643-1 accepted (20774), then a reminder for it made 20804, cancelled.
ok("a reminder for a job already done: onto it", followUpFor(wf("work_order", "TAPI-25643-1", true), false, [sj({ jobNumber: "20774", status: "Completed", numbers: ["TAPI-25643-1"] })], FU_NOW)?.job.jobNumber === "20774");
// 30 Hackney Cct: "Reminder: [TAPI-023594]" onto 20788, which the replica hasn't got yet (status unknown).
ok("onto a job the portal made minutes ago", followUpFor(wf("work_order", "TAPI-023594", true), false, [sj({ jobNumber: "20788", status: null, numbers: ["TAPI-023594"] })], FU_NOW)?.job.jobNumber === "20788");
// 1/19 Lyall St: TAPI-023197 quote (20341, done), then the install for it: a job of its own (20783, kept).
ok("same number after a repair's done: new work, a new job", followUpFor(wf("work_order", "18000"), false, [sj({ status: "Completed", numbers: ["18000"] })], FU_NOW) === null);
ok("a cancelled job takes nothing", followUpFor(wf("work_order", "18969"), false, [sj({ status: "Canceled", numbers: ["18969"] })], FU_NOW) === null);
ok("another number at the same house: a new job", followUpFor(wf("work_order", "TAPI-023600"), false, [sj({ numbers: ["TAPI-023594"] })], FU_NOW) === null);
// 8/21 Pakenham Rd: LJ Hooker's "Re: Work order" WO-0801 asking for a quote to replace the unit went on 20390,
// the clean done in October, and no quote job was made (audit, 12 Nov).
ok("a reply asking for more after the job's done: a new job", followUpFor(wf("quote_request", "WO-0801"), true, [sj({ jobNumber: "20390", status: "Completed", numbers: ["WO-0801"], createdOn: "2026-10-19T00:00:00Z" })], FU_NOW) === null);
ok("a reply about an open job: onto it", followUpFor(wf("work_order", ""), true, [sj({ jobNumber: "20754", status: "InProgress", isQuote: true, createdOn: "2026-11-02T00:00:00Z" })], FU_NOW)?.job.jobNumber === "20754");
// New work after a finished job, and the office has made its job since.
const after = [sj({ jobNumber: "20390", status: "Completed", numbers: ["WO-0801"], createdOn: "2026-10-19T00:00:00Z" }), sj({ jobNumber: "20830", numbers: [], createdOn: "2026-11-11T22:00:00Z" })];
ok("the job's done, the work after it already a job: onto that", followUpFor(wf("quote_request", "WO-0801"), true, after, FU_NOW)?.job.jobNumber === "20830");
ok("...not one carrying another number", followUpFor(wf("quote_request", "WO-0801"), true, [after[0], sj({ jobNumber: "20831", numbers: ["WO-0999"] })], FU_NOW) === null);
ok("a reply after two months: a new job", followUpFor(wf("quote_request", ""), true, [sj({ status: "Completed", createdOn: "2026-09-02T00:00:00Z" })], FU_NOW) === null);
ok("a reply with another number: a new job", followUpFor(wf("work_order", "TAPI-023539"), true, [sj({ status: "Completed", numbers: ["TAPI-023378"], createdOn: "2026-10-26T00:00:00Z" })], FU_NOW) === null);
ok("no number, a job open there: onto it", followUpFor(wf("work_order", ""), false, [sj({ jobNumber: "20806" })], FU_NOW)?.job.jobNumber === "20806");
ok("no number, nothing open: a new job", followUpFor(wf("work_order", ""), false, [sj({ status: "Completed" })], FU_NOW) === null);
ok("the newest of two with the number", followUpFor(wf("work_order", "18969"), false, [sj({ id: 1, jobNumber: "old", numbers: ["18969"], createdOn: "2026-10-01T00:00:00Z" }), sj({ id: 2, jobNumber: "new", numbers: ["18969"] })], FU_NOW)?.job.jobNumber === "new");
ok("the note says what it is", /^WORK ORDER FOLLOW-UP, URGENT: Quote accepted 18969 from Barry Plant Pakenham \(PropertyMe\)\./.test(followUpHeading({ agency: "Barry Plant Pakenham", platform: "PropertyMe", kind: "quote_accepted", number: "18969", urgent: true, isReminder: false })));
ok("no number on the site: the street with it taken off", bareStreet(siteKey("4-10 Mullaly Close", "West Melbourne")) === siteKey("Mullaly Close", "West Melbourne"));
ok("a unit is never the whole street", bareStreet(siteKey("3/185 Camms Road", "Cranbourne")) === null && bareStreet(siteKey("Mullaly Close", "West Melbourne")) === null);
ok("follow-up on the page", stage({ ...base, status: "duplicate", st_booking_id: null, st_job_number: "20788", reason: "a follow-up, the same work order as job 20788: the email went on that job as a note" }).word === "Note on job 20788");
const thu = new Date("2026-11-05T05:00:00Z");
ok("placeholder: next weekday", placeholderDay("", thu) === "2026-11-06" && placeholderDay("", new Date("2026-11-06T05:00:00Z")) === "2026-11-09");
ok("placeholder: the attend-by date", placeholderDay("2026-11-27", thu) === "2026-11-27");
ok("placeholder: not a weekend or a past date", placeholderDay("2026-11-28", thu) === "2026-11-06" && placeholderDay("2026-11-04", thu) === "2026-11-06");
ok("8am Melbourne in daylight time", melbourneInstant("2026-11-06", "08:00") === "2026-11-05T21:00:00.000Z");
ok("8am Melbourne in winter", melbourneInstant("2026-06-15", "08:00") === "2026-06-14T22:00:00.000Z");
ok("page: a job on the tenant's site", stage({ ...base, st_booking_id: null, st_job_number: "20850", attached_at: "x", location_how: "existing site" }).word === "Job 20850");
ok("page: agency not set up", stage({ ...base, status: "needs_agency", reason: "Tapi isn't a customer" }).word === "Agency not set up");

// --- an email onto its job: the number and the street
ok("our job number found", JSON.stringify(jobNumbersIn("Re: Job 20772 - aircon")) === JSON.stringify(["20772"]));
ok("agency's number is found too (and needs backing up)", jobNumbersIn("Barry Plant work order - Job #18943").includes("18943"));
ok("money, dates, phones and sizes aren't job numbers", jobNumbersIn("Invoice $12345.00 on 12/11/2026, call 0412 345 678, 10000L tank, 24000 kw") .length === 0, jobNumbersIn("Invoice $12345.00 on 12/11/2026, call 0412 345 678, 10000L tank, 24000 kw"));
ok("postcodes (four digits) aren't", jobNumbersIn("Berwick VIC 3806").length === 0);
ok("street named", namesStreet("Re: Broken Air Conditioner at 24 Melzak Way, BERWICK", "24 Melzak Way"));
ok("other street not", !namesStreet("Re: aircon at 5 Golden Green St", "24 Melzak Way"));
ok("an email onto a job: the street with its number", namesSite("Re: Broken Air Conditioner at 24 Melzak Way, BERWICK", "24 Melzak Way") && namesSite("RE: 4/40 Army Road", "40 Army Road"));
ok("...or with its kind", namesSite("the unit at Emerald Ct", "11 Emerald Court") && namesSite("33 Willslie Cres", "33 Willslie Crescent"));
// Peake's email about 80 Inglis Road, with "Emerald" (a suburb) in it, went on job 20050 at 11 Emerald Court.
ok("...not the name alone", !namesSite("RE: 80 Inglis Road Unit 1, Berwick. Peake Real Estate, Berwick | Emerald", "11 Emerald Court"));
ok("O'Brien is OBrien", agencyMatches("O'Brien Real Estate Cranbourne", "OBrien Real Estate (Cranbourne)"));

// --- cancellations
ok("an agent's cancellation is read", mightBeWorkOrder(wo("pm@raywhite.com.au", "Please cancel the job at 5 Owen Court"), ""));
ok("a cancelled-order receipt from a supplier isn't", !mightBeWorkOrder(wo("orders@supplier.com.au", "Your order has been cancelled"), ""));
ok("a cancellation email is listed", worthListing({ status: "not", from_address: "pm@raywhite.com.au", reason: "cancellation: cancelled job 20772 at 24 Melzak Way" }));
ok("page: cancellation done", stage({ ...base, status: "not", reason: "cancellation: cancelled job 20772 at 24 Melzak Way" }).word === "Cancellation done");
ok("page: cancellation to check", stage({ ...base, status: "not", reason: "cancellation: cancellation for job 20772, which is InProgress, so it was left alone" }).tone === "bad");
ok("page: the cancelled work order", stage({ ...base, cancelled_at: "x", cancel_note: "Cancelled by Ray White by email" }).word === "Cancelled");
ok("reading: cancellation flag parsed", parseWorkOrder(JSON.stringify({ is_work_order: false, is_cancellation: true })).isCancellation);

console.log("-- call-backs --");
{
  const base = { reply_needed: true, why_not: "", reply: "Hi Sarah,\n\nSomeone will give you a call.\n\nKind regards,\nThe Advanced Gas team", handoff: "" };
  const cb = parseMailDraft(JSON.stringify({ ...base, call_back: { wanted: true, name: "Sarah", phone: "0412 345 678", about: "quote for a heat pump" } }));
  ok("call-back read", cb.callBack?.phone === "0412 345 678" && cb.callBack?.name === "Sarah", cb.callBack);
  ok("not wanted: none", parseMailDraft(JSON.stringify({ ...base, call_back: { wanted: false, name: "", phone: "", about: "" } })).callBack === null);
  ok("missing call_back: none, still parses", parseMailDraft(JSON.stringify(base)).callBack === null);
}

console.log("-- new leads --");
{
  const base = { reply_needed: true, why_not: "", reply: "Hi Sam,\n\nThanks for getting in touch.\n\nKind regards,\nThe Advanced Gas team", handoff: "" };
  const nl = (o: Record<string, unknown>) => ({ is_new: true, name: "Sam Lee", phone: "0400 111 222", email: "sam@example.com", address: "12 Main St", suburb: "Berwick", postcode: "3806", service: "Quote: 7kW split", summary: "Wants a split in the lounge.", ...o });
  const a = parseMailDraft(JSON.stringify({ ...base, new_lead: nl({}) }));
  ok("lead read", a.lead?.name === "Sam Lee" && a.lead?.postcode === "3806" && a.lead?.suburb === "Berwick", a.lead);
  ok("a reply is the same enquiry", enquirySubject("Re: RE: RFQ - WBC Mulgrave BBC - Refurbishment") === enquirySubject("RFQ - WBC Mulgrave BBC  - Refurbishment") && enquirySubject("Re: RFQ - Store Development - Durks Cafe") !== enquirySubject("RFQ - WBC Mulgrave BBC - Refurbishment"));
  ok("postcode found inside text", parseMailDraft(JSON.stringify({ ...base, new_lead: nl({ postcode: "VIC 3810" }) })).lead?.postcode === "3810");
  ok("postcode that isn't one is dropped", parseMailDraft(JSON.stringify({ ...base, new_lead: nl({ postcode: "38" }) })).lead?.postcode === "");
  ok("not new: none", parseMailDraft(JSON.stringify({ ...base, new_lead: nl({ is_new: false }) })).lead === null);
  ok("missing new_lead: none, still parses", parseMailDraft(JSON.stringify(base)).lead === null);
}

console.log("-- booking confirmations --");
{
  const from = (a: string) => ({ emailAddress: { address: a } });
  ok("Veolia confirmation", mightConfirmBooking({ from: from("donotreply@anz.veolia.com"), subject: "Your Veolia service booking is confirmed – Ref 02656845" }, ""));
  ok("Veolia holiday notice: no", !mightConfirmBooking({ from: from("noreply@veolia.com"), subject: "Action required: Update your Veolia waste services for the holiday period" }, "Please update your services over Christmas."));
  ok("electrician by words", mightConfirmBooking({ from: from("geoff@gtelectrics.com.au"), subject: "Re: Work order for the electrician: Job 20769" }, "All good, booked in for Thursday."));
  ok("a customer's booking question: no", !mightConfirmBooking({ from: from("sarah@gmail.com"), subject: "Heat pump" }, "Can you confirm the price?"));
  ok("skip bin from anyone, with booking words", mightConfirmBooking({ from: from("bookings@binsrus.com.au"), subject: "Skip bin booking confirmed" }, "Delivery Thu."));
  const r = parseBooking(JSON.stringify({ confirms_booking: true, kind: "rubbish_removal", job_number: "20525", street: "3 Surrey Street", suburb: "Box Hill South", when: "Thu 12 Nov" }));
  ok("read: rubbish removal, job number", r.confirms && r.kind === "rubbish_removal" && r.jobNumber === "20525", r);
  ok("their own reference isn't our job number", parseBooking(JSON.stringify({ confirms_booking: true, kind: "rubbish_removal", job_number: "02656845", street: "", suburb: "", when: "" })).jobNumber === "");
  ok("kind other: not a confirmation", !parseBooking(JSON.stringify({ confirms_booking: true, kind: "other", job_number: "", street: "", suburb: "", when: "" })).confirms);
  ok("swap: not off, booked on, others kept", JSON.stringify(swapTag([1, 2, 3], 2, 9)) === JSON.stringify([1, 3, 9]));
  ok("swap: already booked, nothing to do", swapTag([1, 9], 2, 9) === null);
  ok("swap: both on, not comes off", JSON.stringify(swapTag([2, 9], 2, 9)) === JSON.stringify([9]));
  ok("tag words drop the emoji", bookingWords("Rubbish Removal Booked🗑️") === "rubbish removal booked");
}

console.log("-- two tenants (6 Nov: 4 Kirrilee Ct, 9 Naomi St) --");
{
  const two = { tenantName: "Joshua Croucher; Christine Upton", tenantPhone: "0428 946 984; 0417 535 760", tenantEmail: "josh.croucher@yahoo.com; chrisupton34@yahoo.com.au" };
  const c = tenantContacts(two, "MobilePhone");
  ok("four contacts, one value each", c.length === 4 && c.every((x) => !x.value.includes(";")), c);
  ok("each number with its person", c[0].value === "0428 946 984" && c[0].memo === "Tenant: Joshua Croucher" && c[1].memo === "Tenant: Christine Upton", c.slice(0, 2));
  ok("emails split", c[2].value === "josh.croucher@yahoo.com" && c[3].value === "chrisupton34@yahoo.com.au");
  ok("site named for both", tenantLabel(two) === "Joshua Croucher & Christine Upton");
  ok("greeting both", tenantGreeting(two) === "Joshua and Christine");
  ok("one tenant unchanged", JSON.stringify(tenantContacts({ tenantName: "Sam Lee", tenantPhone: "0412 345 678", tenantEmail: "sam.lee@gmail.com" }, "Phone")) === JSON.stringify([{ type: "Phone", value: "0412 345 678", memo: "Tenant: Sam Lee" }, { type: "Email", value: "sam.lee@gmail.com", memo: "Tenant: Sam Lee" }]));
  ok("phones split on slash and 'or'", JSON.stringify(tenantPhones({ tenantPhone: "0425277986 / 0437217497 or (03) 5941 2222" })) === JSON.stringify(["0425277986", "0437217497", "(03) 5941 2222"]), tenantPhones({ tenantPhone: "0425277986 / 0437217497 or (03) 5941 2222" }));
  ok("junk phone dropped", tenantPhones({ tenantPhone: "ask the agent" }).length === 0);
  ok("one name, two numbers: both 'Tenant: name'", tenantContacts({ tenantName: "Karra Finlayson", tenantPhone: "0425277986; 0437217497", tenantEmail: "" }, "Phone").every((x) => x.memo === "Tenant: Karra Finlayson"));
  const w = { ...parseWorkOrder(JSON.stringify({ is_work_order: true, kind: "work_order", platform: "", agency: "Barry Plant Pakenham", property_manager: "", pm_email: "pakenhamrentals@barryplant.com.au", pm_phone: "", number: "18965", street: "9 Naomi St", suburb: "Pakenham", postcode: "3810", tenant_name: "Karra Finlayson; Leigh Lombard", tenant_phone: "", tenant_email: "karrafinlayson@outlook.com; leighlombard@hotmail.com", access: "", job: "Ducted heating not working", urgent: false, attend_by: "", job_type: "", is_cancellation: false, why: "" })) };
  ok("both tenants emailed", JSON.stringify(tenantAddresses(w, "pakenhamrentals@email.propertyme.com")) === JSON.stringify(["karrafinlayson@outlook.com", "leighlombard@hotmail.com"]), tenantAddresses(w, "x@y.com"));
  const said = stSaid(new Error('ServiceTitan POST jpm/v2/tenant/1/jobs failed: 409 Conflict — {"type":"https://tools.ietf.org/html/rfc7231#section-6.5.8","title":"\\u00220428 946 984; 0417 535 760\\u0022 is not a valid phone number","status":409,"traceId":"a56","errors":{"":["\\u00220428 946 984; 0417 535 760\\u0022 is not a valid phone number"]}}'));
  ok("refusal in words", said === 'ServiceTitan said 409 Conflict: "0428 946 984; 0417 535 760" is not a valid phone number', said);
  const cut = stSaid(new Error('ServiceTitan POST x failed: 409 Conflict — {"type":"https://x","title":"\\u0022a; b\\u0022 is not a valid email string","sta'));
  ok("refusal cut short still read", cut === 'ServiceTitan said 409 Conflict: "a; b" is not a valid email string', cut);
}

{
  // Filing admin@ into its own folders (lib/outlook/filingTypes.ts).
  const off = filingSettingsFrom(null);
  ok("filing off until switched on", off.mode === "off" && !off.fileAfterReply && off.mailboxes.join() === "admin@advancedgas.com.au", off);
  ok("default never list", off.neverFolders.join("|") === DEFAULT_NEVER.join("|"));
  ok("default flagged words", off.protectedWords.length === DEFAULT_PROTECTED.length);
  ok("only our own mailboxes", filingSettingsFrom({ mailboxes: ["someone@gmail.com", "Admin@AdvancedGas.com.au"] }).mailboxes.join() === "admin@advancedgas.com.au");
  ok("words from the box", wordsFromText("gas leak\n Refund ,\n\nVCAT;x").join("|") === "gas leak|Refund|VCAT");

  ok("flagged word in the text", flaggedWord("Re: heater", "I can smell gas in the laundry", DEFAULT_PROTECTED) === "smell gas");
  ok("flagged word across a line break", flaggedWord("", "there may be a gas\nleak at the meter", DEFAULT_PROTECTED) === "gas leak");
  ok("flagged word in the subject, any case", flaggedWord("URGENT: New urgent work order at 9 Swift Dr", "", DEFAULT_PROTECTED) === "urgent");
  ok("word start, so complaints too", flaggedWord("", "We have had complaints from the tenant", ["complaint"]) === "complaint");
  ok("not inside another word", flaggedWord("", "Booked for Las Vegas", ["gas"]) === null);
  ok("a disclaimer isn't flagged", flaggedWord("Statement", "This email is confidential. We accept no liability for any damage caused by viruses.", DEFAULT_PROTECTED) === null);

  const d = (over: Partial<DraftRecord>): DraftRecord => ({ status: "skipped", reason: null, handoff: null, handoff_cleared_at: null, sent_at: null, callback_at: null, callback_done_at: null, ...over });
  ok("newsletter is done with", kindOf(d({ reason: "a mailing list or newsletter" })).kind === "machine");
  ok("no reply needed is done with", kindOf(d({ reason: "no reply needed: Supplier invoice from Reclaim Energy" })).kind === "no-reply-needed");
  ok("booked work order is done with", kindOf(d({ reason: "work order: booked into ServiceTitan" })).kind === "work-order-done");
  ok("failed work order waits", kindOf(d({ reason: "work order: booking failed (ServiceTitan said 409)" })).kind === "waiting");
  ok("agency not set up waits", kindOf(d({ reason: "work order: booking needs_agency (O'Brien isn't a customer)" })).kind === "waiting");
  ok("drafted waits", kindOf(d({ status: "drafted", handoff: "Needs Kellie" })).why === "needs a person");
  ok("drafted and sent is replied", kindOf(d({ status: "drafted", sent_at: "2026-11-05T01:00:00Z" })).kind === "replied");
  ok("call back waits", kindOf(d({ reason: "no reply needed: x", callback_at: "2026-11-05T01:00:00Z" })).kind === "waiting");
  ok("from the team waits", kindOf(d({ reason: "from the team" })).kind === "waiting");

  const facts = (over: Partial<Parameters<typeof waitReason>[0]> = {}) => ({ from: "noreply@cevalogistics.com", subject: "Delivery", categories: [] as string[], flagged: false, draft: d({ reason: "no reply needed: Freight delivery pre-alert" }), agency: null as string | null, ...over });
  const on = filingSettingsFrom({ mode: "trial" });
  ok("done with: no reason to wait", waitReason(facts(), on) === null);
  ok("flagged stays", waitReason(facts({ flagged: true }), on) === "flagged in Outlook");
  ok("hand category stays", (waitReason(facts({ categories: ["On a job", "Hirotec"] }), on) ?? "").includes("Hirotec"));
  ok("our category doesn't", waitReason(facts({ categories: ["On a job", "In ServiceTitan"] }), on) === null);
  ok("not read by the drafts stays", waitReason(facts({ draft: null }), on) === "not read by the drafts yet");
  ok("replied waits while after-reply is off", waitReason(facts({ draft: d({ reason: "already replied" }) }), on) !== null);
  ok("replied files once after-reply is on", waitReason(facts({ draft: d({ reason: "already replied" }) }), { ...on, fileAfterReply: true }) === null);

  const F = (id: string, path: string): Folder => ({ id, name: path.split("/").pop()!, path });
  const folders = [
    F("bpb", "Barry Plant Bayside"), F("bpp", "Barry Plant Ber, Pak, Drouin"), F("rwb", "Ray White Berwick"), F("rwp", "Ray White Pakenham"),
    F("ob", "Obrien Real Estate"), F("np", "Neilson Partners"), F("re", "Real Estate Odd Jobs"), F("pk", "Peake RE"), F("lj", "LJ Hooker"),
    F("acc", "Accounting"), F("rec", "Receipts"), F("leads", "New Leads"), F("kel", "Kellie"), F("adm", "Admin Team"), F("admq", "Admin Team/Quotes"), F("reece", "Reece"),
  ];
  const name = (a: string) => folderForAgency(a, folders)?.name ?? null;
  ok("agency: Barry Plant Pakenham", name("Barry Plant Pakenham") === "Barry Plant Ber, Pak, Drouin", name("Barry Plant Pakenham"));
  ok("agency: Barry Plant Berwick", name("Barry Plant Berwick") === "Barry Plant Ber, Pak, Drouin");
  ok("agency: Barry Plant Bayside", name("Barry Plant Bayside") === "Barry Plant Bayside");
  ok("agency: plain Barry Plant is a tie, so none", name("Barry Plant") === null);
  ok("agency: Ray White Pakenham", name("Ray White Pakenham") === "Ray White Pakenham");
  ok("agency: O'Brien with its apostrophe", name("O'Brien Real Estate Cranbourne") === "Obrien Real Estate");
  ok("agency: First National Neilson Partners", name("First National Neilson Partners") === "Neilson Partners");
  ok("agency: LJ Hooker Pakenham", name("LJ Hooker Pakenham") === "LJ Hooker");
  ok("agency: never the catch-all by name", name("Real Estate Odd Jobs") === null, name("Real Estate Odd Jobs"));
  ok("agency: unknown agency, none", name("Harcourts Packham") === null, name("Harcourts Packham"));

  ok("never: a never folder", isNever("Kellie", DEFAULT_NEVER));
  ok("never: under a never folder", isNever("Admin Team/Quotes", DEFAULT_NEVER));
  ok("never: an ordinary one", !isNever("Ray White Pakenham", DEFAULT_NEVER));

  const pick = (over: Parameters<typeof waitReason>[0], sender: { folderId: string; n: number; total: number } | null = null, domain: typeof sender = null) =>
    pickFolder(over, { folders, never: DEFAULT_NEVER, sender, domain });
  const pmEmail = facts({ from: "pakenhamrentals@email.propertyme.com", draft: d({ reason: "work order: booked into ServiceTitan" }), agency: "Barry Plant Pakenham" });
  ok("sender's own folder first", pick(pmEmail, { folderId: "rwp", n: 9, total: 10 }).folder?.id === "rwp");
  ok("a weak sender history doesn't count", pick(pmEmail, { folderId: "rwp", n: 2, total: 5 }).folder?.id === "bpp");
  ok("never a never folder, even learned", pick(facts({ from: "x@y.com.au" }), { folderId: "kel", n: 8, total: 8 }).folder?.id !== "kel");
  ok("domain when the sender is new", pick(facts({ from: "new.person@raywhite.com.au", draft: d({ reason: "no reply needed: FYI" }) }), null, { folderId: "rwb", n: 9, total: 10 }).folder?.id === "rwb");
  ok("supplier invoice stays to be entered", waitReason(facts({ from: "ar@metalflex.com.au", subject: "Tax Invoice 4471", draft: d({ reason: "no reply needed: Supplier invoice from Metalflex" }) }), on) === "supplier paperwork, still to be entered");
  ok("a receipt stays to be entered", waitReason(facts({ from: "billing@shop.com", subject: "Your receipt", draft: d({ reason: "from a no-reply address" }) }), on) !== null);
  ok("a customer's payment notice isn't paperwork", waitReason(facts({ from: "noreply@onservicetitan.com", subject: "Online Payment Received for Customer Barry Plant", draft: d({ reason: "from a no-reply address" }) }), on) === null);
  ok("a meeting invite stays", waitReason(facts({ from: "jyates@servicetitan.com", subject: "Invitation: Jake Deppeler and Jeremy Yates", draft: d({ reason: "a meeting invite or receipt, not an email" }) }), on) === "a meeting invite");
  ok("a Tapi job stays for Tapi", waitReason(facts({ from: "hi@tapihq.com", draft: d({ reason: "work order: booked into ServiceTitan" }) }), on) === "from Tapi: Tapi is updated by hand");
  ok("Tapi's please-confirm stays too", waitReason(facts({ from: "hi@tapihq.com", subject: "Please confirm work at 21 Union Ave, Pakenham", draft: d({ reason: "no reply needed: Automated Tapi job-confirmation request" }), agency: "Ray White Pakenham" }), on) === "from Tapi: Tapi is updated by hand");
  ok("no agency folder for a work order that wasn't booked", pick(facts({ from: "pm@agency.com.au", draft: d({ reason: "no reply needed: progress update" }), agency: "Ray White Pakenham" })).folder === null);
  const personNoReply = pick(facts({ from: "hi@tapihq.com", subject: "Please confirm work at 1 Nepeta Way", draft: d({ reason: "no reply needed: Automated Tapi job-confirmation request" }) }));
  ok("a person's no-reply email with no folder stays", personNoReply.folder === null && !personNoReply.create, personNoReply);
  const customerThanks = pick(facts({ from: "shenae@gmail.com", draft: d({ reason: "no reply needed: Customer's thank-you" }) }));
  ok("a customer's thanks never goes to Notifications", customerThanks.folder === null && !customerThanks.create);
  ok("a machine's domain history isn't used", pick(facts({ from: "donotreply@rinnai.com.au", draft: d({ reason: "from a no-reply address" }) }), null, { folderId: "rwb", n: 23, total: 23 }).create === "Notifications");
  ok("flagged: action required", flaggedWord("Action required: Update your Veolia waste services", "", filingSettingsFrom(null).protectedWords) === "action required");
  ok("flagged: expired", flaggedWord("A Compliance Requirement has Expired - Alert No 1", "", filingSettingsFrom(null).protectedWords) === "expired");
  const note = pick(facts({ draft: d({ reason: "from a no-reply address" }) }));
  ok("machine mail to a new Notifications folder", note.folder === null && note.create === "Notifications", note);
  ok("a lead to New Leads", pick(facts({ categories: ["New lead"], draft: d({ status: "drafted", sent_at: "x" }) })).folder?.id === "leads");
  const none = pick(facts({ from: "someone@newco.com.au", draft: d({ status: "drafted", sent_at: "x" }) }));
  ok("a replied email from a new sender stays", none.folder === null && !none.create, none);

  const homes = learnHomes([
    { folderId: "rwp", from: "pm@raywhite.com.au" }, { folderId: "rwp", from: "pm@raywhite.com.au" }, { folderId: "rwb", from: "other@raywhite.com.au" },
    { folderId: "acc", from: "ar@metalflex.com.au" }, { folderId: "acc", from: "kellie@advancedgas.com.au" }, { folderId: "rwp", from: "sarah@gmail.com" },
  ]);
  ok("learned: a sender's folder", homes.senders.get("pm@raywhite.com.au")?.folderId === "rwp" && homes.senders.get("pm@raywhite.com.au")?.n === 2);
  ok("learned: our own mail isn't counted", !homes.senders.has("kellie@advancedgas.com.au"));
  ok("learned: the domain split across branches", homes.domains.get("raywhite.com.au")?.total === 3 && homes.domains.get("raywhite.com.au")?.n === 2);
  ok("learned: no domain for gmail", !homes.domains.has("gmail.com"));
}

if (bad) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log("\nall passed");
