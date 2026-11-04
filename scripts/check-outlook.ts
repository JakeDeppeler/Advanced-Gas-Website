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
  replyHtml,
  signoffFor,
  skipReason,
  threadText,
  type GraphMessage,
} from "../src/lib/outlook/outlookTypes";

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

if (bad) {
  console.log(`\n${bad} failed`);
  process.exit(1);
}
console.log("\nall passed");
