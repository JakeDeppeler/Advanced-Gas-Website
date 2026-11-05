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
  signoffFor,
  skipReason,
  threadText,
  type GraphMessage,
} from "../src/lib/outlook/outlookTypes";
import { mightConfirmBooking, parseBooking, swapTag, tagWords as bookingWords } from "../src/lib/outlook/bookingTypes";
import { DEFAULT_TENANT_BODY, DEFAULT_TENANT_SUBJECT, addressKey, bookingSummary, dedupeKey, fillTemplate, isTeamForward, siteKey, streetWord, agencyMatches, jobNumbersIn, namesStreet, placeholderDay, melbourneInstant, mightBeWorkOrder, parseWorkOrder, stage, tenantAddress, workOrderSettingsFrom, worthListing, type WorkOrderRow } from "../src/lib/outlook/workOrderTypes";

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

if (bad) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log("\nall passed");
