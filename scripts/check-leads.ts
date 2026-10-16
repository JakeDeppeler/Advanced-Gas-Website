/**
 * The call-now alert's rules, and Facebook's side of the feed.
 *
 * Two things here cannot be tested any other way. A webhook only fires when
 * somebody really enquires on a Facebook page, so the only way to exercise the
 * parsing twice is to hand it Meta's own documented payloads — which is what
 * the fixtures below are. And the alert's copy decides what a room four metres
 * away is told to do with a phone number, where a missing field printed as a
 * gap, or a number regrouped wrongly, is invisible in a typecheck.
 */
import { createHmac } from "node:crypto";
import { CALL_WITHIN_SEC, alertable, leadCopy, phonePretty, secondsLeft, sourceLabel, type NewLead } from "../src/lib/leads/newLeadTypes";
import { conversationKey, leadFromFields, melbourneDay, metaTime, parseMetaBody, signatureOk, verifyChallenge } from "../src/lib/leads/metaTypes";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const lead = (over: Partial<NewLead> = {}): NewLead => ({
  id: "11111111-2222-3333-4444-555555555555",
  at: "2026-10-16T03:15:00.000Z",
  source: "website",
  kind: "quote",
  name: "Sarah Mitchell",
  phone: "0412345678",
  email: null,
  headline: "Heat pump hot water",
  service: "hp",
  suburb: null,
  postcode: "3810",
  summary: "Brand: Thermann · Size: 275 – 300 L",
  ...over,
});

console.log("-- which enquiries take the wall --");
ok("a website quote with a number does", alertable(lead()));
ok("a Facebook lead form does", alertable(lead({ source: "facebook" })));
ok("a Facebook message does, with no number at all", alertable(lead({ source: "facebook-message", phone: null, email: null })));
ok("an enquiry with only an email does", alertable(lead({ phone: null, email: "them@example.com" })));
// Somebody tapping the number in the header is recorded as a lead and is not
// one: there is nobody to ring, and they are already dialling.
ok("a tap on the phone number does not", !alertable(lead({ kind: "call", source: "header", phone: null, email: null, name: null })));
ok("an enquiry with no way to answer it does not", !alertable(lead({ phone: null, email: null })));
ok("a blank number is not a number", !alertable(lead({ phone: "   ", email: null })));

console.log("\n-- the number, as somebody reads it out --");
ok("mobile", phonePretty("0412345678") === "0412 345 678", phonePretty("0412345678"));
ok("mobile with spaces already in it", phonePretty("0412 345 678") === "0412 345 678");
ok("landline", phonePretty("0397041234") === "03 9704 1234", phonePretty("0397041234"));
ok("+61 mobile", phonePretty("+61412345678") === "0412 345 678", phonePretty("+61412345678"));
ok("(03) 9704 1234", phonePretty("(03) 9704 1234") === "03 9704 1234", phonePretty("(03) 9704 1234"));
// Anything it has not understood is printed exactly as the customer typed it.
// A board that rearranges a number it cannot read gets somebody dialled wrong.
ok("an extension is left alone", phonePretty("03 9704 1234 ext 2") === "03 9704 1234 ext 2");
ok("an overseas number is left alone", phonePretty("+64 21 555 0199") === "+64 21 555 0199");
ok("too few digits is left alone", phonePretty("9704 1234") === "9704 1234");
ok("nothing is null", phonePretty("") === null && phonePretty(null) === null);

console.log("\n-- what the room is told --");
{
  const c = leadCopy(lead(), "2:15 pm");
  ok("the number leads", c.call === "0412 345 678" && c.dialable, c);
  ok("the postcode says it is a postcode", c.where === "Postcode 3810", c.where);
  ok("the source is named", c.eyebrow === "Website enquiry · 2:15 pm", c.eyebrow);
}
{
  // Most of this patch's postcodes cover several suburbs — 3977 covers seven —
  // so a suburb is only ever shown when the lead actually carries one.
  const c = leadCopy(lead({ suburb: "Officer", postcode: "3809" }), "2:15 pm");
  ok("a real suburb wins over the postcode", c.where === "Officer", c.where);
}
{
  const c = leadCopy(lead({ suburb: null, postcode: null }), "2:15 pm");
  ok("no place at all is no line, not an empty one", c.where === null);
}
{
  const c = leadCopy(lead({ name: null, headline: null, service: null }), "2:15 pm");
  ok("a nameless enquiry is Someone, not blank", c.who === "Someone");
  ok("it falls back to the summary for what they want", c.what.startsWith("Brand:"), c.what);
}
{
  const c = leadCopy(lead({ source: "facebook-message", phone: null, email: null }), "9:02 pm");
  ok("a message says to reply, not to ring", c.call === "Reply in Messenger" && !c.dialable, c.call);
}
{
  const c = leadCopy(lead({ phone: null, email: "them@example.com" }), "2:15 pm");
  ok("email only says so", c.call === "Email them back" && !c.dialable, c.call);
}
{
  const c = leadCopy(lead({ email: "them@example.com" }), "2:15 pm");
  ok("the email rides under a number, not instead of it", c.call === "0412 345 678" && c.also === "them@example.com");
}
ok("an unknown source prints itself rather than 'Other'", sourceLabel("google-ads") === "google-ads");

console.log("\n-- the minute --");
ok("it opens at sixty", secondsLeft(0, 0) === CALL_WITHIN_SEC);
ok("half a minute in", secondsLeft(0, 30_000) === 30);
ok("it stops at zero rather than going negative", secondsLeft(0, 120_000) === 0);
// A board whose clock jumps backwards — a television correcting its time — must
// not show more than a minute left on a minute.
ok("a clock that jumps back cannot show more than sixty", secondsLeft(10_000, 0) === CALL_WITHIN_SEC);

console.log("\n-- is it really from Facebook --");
{
  const secret = "s3cr3t";
  const body = JSON.stringify({ object: "page", entry: [] });
  const sig = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
  ok("a signed body passes", signatureOk(body, sig, secret));
  ok("the same signature on a changed body fails", !signatureOk(body + " ", sig, secret));
  ok("the right body with the wrong secret fails", !signatureOk(body, sig, "other"));
  ok("no signature fails", !signatureOk(body, null, secret));
  ok("with no secret configured, nothing passes", !signatureOk(body, sig, ""));
  ok("a signature that isn't hex fails rather than throws", !signatureOk(body, "sha256=zzzz", secret));
  ok("a short signature fails", !signatureOk(body, "sha256=ab", secret));
  ok("the sha256= prefix is optional", signatureOk(body, sig.slice(7), secret));
}

console.log("\n-- the subscription handshake --");
{
  const p = (s: string) => new URLSearchParams(s);
  ok("the right token echoes the challenge",
    verifyChallenge(p("hub.mode=subscribe&hub.verify_token=tok&hub.challenge=1158201444"), "tok") === "1158201444");
  ok("a wrong token refuses", verifyChallenge(p("hub.mode=subscribe&hub.verify_token=no&hub.challenge=x"), "tok") === null);
  ok("no token configured refuses", verifyChallenge(p("hub.mode=subscribe&hub.verify_token=&hub.challenge=x"), "") === null);
  ok("a mode that isn't subscribe refuses", verifyChallenge(p("hub.mode=unsubscribe&hub.verify_token=tok&hub.challenge=x"), "tok") === null);
}

console.log("\n-- what Facebook sends --");
// Meta's documented lead-ads payload.
const LEADGEN = {
  object: "page",
  entry: [{
    id: "102938475610",
    time: 1792113300000,
    changes: [{
      field: "leadgen",
      value: { ad_id: "444", form_id: "555", leadgen_id: "666", created_time: 1792113295, page_id: "102938475610" },
    }],
  }],
};
{
  const events = parseMetaBody(LEADGEN);
  ok("one lead", events.length === 1 && events[0].kind === "leadgen");
  ok("keyed on Meta's own lead id, so a retry writes nothing", events[0].id === "fb-lead:666", events[0].id);
  ok("the lead's time, not the delivery's", events[0].at === "2026-10-16T01:14:55.000Z", events[0].at);
}

// Meta's documented messaging payload.
const MESSAGE = {
  object: "page",
  entry: [{
    id: "102938475610",
    time: 1792113300000,
    messaging: [{
      sender: { id: "PSID-1" },
      recipient: { id: "102938475610" },
      timestamp: 1792113300000,
      message: { mid: "m_abc", text: "Hi, do you do evaporative cooler services in Pakenham?" },
    }],
  }],
};
{
  const events = parseMetaBody(MESSAGE);
  ok("one message", events.length === 1 && events[0].kind === "message");
  ok("keyed on the person and the day, not the message", events[0].id === conversationKey("PSID-1", "2026-10-16T01:15:00.000Z"), events[0].id);
}
{
  // The page's own replies come back as events. Alerting on those would ring
  // the office every time the office answered somebody.
  const echo = { ...MESSAGE, entry: [{ ...MESSAGE.entry[0], messaging: [{ ...MESSAGE.entry[0].messaging[0], message: { mid: "m_x", text: "no worries", is_echo: true } }] }] };
  ok("the page's own replies are ignored", parseMetaBody(echo).length === 0);
}
{
  const fromPage = { ...MESSAGE, entry: [{ ...MESSAGE.entry[0], messaging: [{ ...MESSAGE.entry[0].messaging[0], sender: { id: "102938475610" } }] }] };
  ok("a message from the page's own id is ignored", parseMetaBody(fromPage).length === 0);
}
{
  const receipt = { object: "page", entry: [{ id: "1", time: 1, messaging: [{ sender: { id: "P" }, delivery: { mids: ["m_1"], watermark: 1 } }] }] };
  ok("delivery and read receipts are ignored", parseMetaBody(receipt).length === 0);
}
{
  const photo = { ...MESSAGE, entry: [{ ...MESSAGE.entry[0], messaging: [{ ...MESSAGE.entry[0].messaging[0], message: { mid: "m_p", attachments: [{ type: "image" }] }}] }] };
  const e = parseMetaBody(photo);
  // A photo of a rusted heater with no words is still somebody enquiring.
  ok("an attachment with no words is still an enquiry", e.length === 1 && e[0].kind === "message" && e[0].text.includes("photo"));
}
console.log("   (a conversation, in three messages a minute apart)");
{
  const at = (iso: string) => conversationKey("PSID-1", iso);
  ok("the second and third message share the first's key",
    at("2026-10-16T09:00:00+11:00") === at("2026-10-16T09:01:00+11:00") &&
    at("2026-10-16T09:00:00+11:00") === at("2026-10-16T21:30:00+11:00"));
  ok("the same person enquiring again tomorrow is a new enquiry",
    at("2026-10-16T09:00:00+11:00") !== at("2026-10-17T09:00:00+11:00"));
  // UTC rolls over at eleven in the morning here, which would split a
  // conversation that started before lunch and carried on after it.
  ok("the day is Melbourne's, not UTC's",
    melbourneDay("2026-10-16T01:00:00Z") === "2026-10-16" && melbourneDay("2026-10-15T23:00:00Z") === "2026-10-16");
}

console.log("\n-- a body nobody should trust --");
ok("not a page subscription", parseMetaBody({ object: "instagram", entry: [] }).length === 0);
ok("junk", parseMetaBody(null).length === 0 && parseMetaBody("hello").length === 0 && parseMetaBody([]).length === 0);
ok("an entry that is not an object", parseMetaBody({ object: "page", entry: ["x", null, 3] }).length === 0);
ok("a leadgen change with no id", parseMetaBody({ object: "page", entry: [{ id: "1", changes: [{ field: "leadgen", value: {} }] }] }).length === 0);
ok("a field nobody asked for", parseMetaBody({ object: "page", entry: [{ id: "1", changes: [{ field: "feed", value: { post_id: "p" } }] }] }).length === 0);
ok("a time that cannot be read falls back to now rather than to 1970",
  Date.parse(metaTime("nonsense", Date.parse("2026-10-16T00:00:00Z"))) === Date.parse("2026-10-16T00:00:00Z"));
ok("milliseconds and seconds are both understood",
  metaTime(1792113295) === metaTime(1792113295000));
{
  // Several entries in one delivery, which is how Meta batches under load.
  const batch = { object: "page", entry: [LEADGEN.entry[0], MESSAGE.entry[0]] };
  ok("a batch is read whole", parseMetaBody(batch).length === 2);
}

console.log("\n-- a lead form's answers --");
{
  const f = leadFromFields([
    { name: "full_name", values: ["Sarah Mitchell"] },
    { name: "phone_number", values: ["+61412345678"] },
    { name: "email", values: ["sarah@example.com"] },
    { name: "city", values: ["Pakenham"] },
    { name: "post_code", values: ["3810"] },
    { name: "which_brand?", values: ["Reclaim", "Thermann"] },
    { name: "when_do_you_need_it", values: ["Within a week"] },
  ]);
  ok("the standard questions land in their columns",
    f.name === "Sarah Mitchell" && f.phone === "+61412345678" && f.email === "sarah@example.com" && f.suburb === "Pakenham" && f.postcode === "3810", f);
  // The office's own questions are the most useful thing on some of these
  // forms and will never have a column. The label is kept with the answer,
  // because "Within a week" on its own means nothing.
  ok("the office's own questions are kept, with their labels",
    f.summary === "Which brand: Reclaim, Thermann · When do you need it: Within a week", f.summary);
}
{
  const f = leadFromFields([{ name: "first_name", values: ["Dave"] }, { name: "last_name", values: ["Rowe"] }]);
  ok("a first and last name become a name", f.name === "Dave Rowe", f.name);
}
{
  const f = leadFromFields([{ name: "email", values: [] }, { name: "", values: ["x"] }, "junk", null]);
  ok("empty answers and junk are dropped, not printed", f.email === null && f.summary === null && f.name === null, f);
}

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);
