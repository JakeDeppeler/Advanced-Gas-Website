/**
 * Email that didn't arrive: the wording, and whether a webhook is really Resend's.
 *
 * The signature check is the only thing between a public URL and an alert on
 * the office wall, and a webhook cannot be exercised twice by hand — the only
 * way to make a real one fire is to send an email somewhere that bounces. So
 * it is checked here, against signatures built the way Svix builds them.
 */
import { createHmac } from "node:crypto";
import { emailAlertLine, isKind, isTrouble, kindLabel, statusFromResend, type EmailHealth } from "../src/lib/email/eventTypes";
import { svixOk } from "../src/lib/email/svix";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

const health = (over: Partial<EmailHealth> = {}): EmailHealth => ({
  trouble: 1, oldestHours: 2, worstKind: "quote-lead", toCustomer: false, ...over,
});

console.log("-- what the wall says --");
// Names what was lost, not what happened to it: somebody stands up for a
// website enquiry nobody got, and walks past "1 email event".
ok("one names the thing", emailAlertLine(health()) === "1 website enquiry never arrived · oldest 2h", emailAlertLine(health()));
ok("several count", emailAlertLine(health({ trouble: 3 })) === "3 emails never arrived · oldest 2h", emailAlertLine(health({ trouble: 3 })));
ok("minutes old reads as just now", emailAlertLine(health({ oldestHours: 0.2 })).endsWith("· just now"));
ok("days old reads in days", emailAlertLine(health({ oldestHours: 73 })).endsWith("· oldest 3 days"), emailAlertLine(health({ oldestHours: 73 })));
ok("47 hours is still hours", emailAlertLine(health({ oldestHours: 47 })).endsWith("· oldest 47h"));
ok("no age, no age clause", emailAlertLine(health({ oldestHours: null })) === "1 website enquiry never arrived");
// A kind nobody taught it about still reads as a sentence.
ok("an unknown kind falls back", emailAlertLine(health({ worstKind: "made-up" })) === "1 email never arrived · oldest 2h", emailAlertLine(health({ worstKind: "made-up" })));
ok("no kind at all falls back", emailAlertLine(health({ worstKind: null })).startsWith("1 email never arrived"));

console.log("\n-- which kinds are real --");
ok("the ones we send", isKind("quote-lead") && isKind("order") && isKind("report") && isKind("sign-in"));
ok("and nothing else", !isKind("nonsense") && !isKind("") && !isKind(null));
ok("labels read as English", kindLabel("quote-lead") === "Website enquiry" && kindLabel("order") === "Supplier order");

console.log("\n-- which statuses are trouble --");
ok("a refused send is", isTrouble("failed"));
ok("a bounce is", isTrouble("bounced"));
ok("a delivery is not", !isTrouble("delivered") && !isTrouble("sent"));
// Worth knowing, and not an undelivered message. One word for both would
// teach the room that the word means nothing in particular.
ok("a spam complaint is not", !isTrouble("complained"));

console.log("\n-- Resend's event names --");
ok("bounced", statusFromResend("email.bounced") === "bounced");
ok("complained", statusFromResend("email.complained") === "complained");
ok("delivered", statusFromResend("email.delivered") === "delivered");
ok("sent", statusFromResend("email.sent") === "sent");
// The provider is still trying. A board that cried about every slow mail
// server would be amber all week.
ok("a delay is not an event we act on", statusFromResend("email.delivery_delayed") === null);
ok("junk is not an event", statusFromResend("nonsense") === null && statusFromResend(undefined) === null);

console.log("\n-- is the webhook really Resend's --");
{
  const secret = `whsec_${Buffer.from("a-signing-secret-of-some-length").toString("base64")}`;
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "x" } });
  const id = "msg_2abc";
  const now = 1_792_113_300_000;
  const ts = String(Math.floor(now / 1000));
  const sign = (payload: string, sid = id, stamp = ts, key = secret) =>
    createHmac("sha256", Buffer.from(key.replace(/^whsec_/, ""), "base64")).update(`${sid}.${stamp}.${payload}`, "utf8").digest("base64");
  const h = (over: Partial<{ id: string; timestamp: string; signature: string }> = {}) => ({
    id, timestamp: ts, signature: `v1,${sign(body)}`, ...over,
  });

  ok("a signed delivery passes", svixOk(body, h(), secret, now));
  ok("the same signature on a changed body fails", !svixOk(body + " ", h(), secret, now));
  ok("a different message id fails", !svixOk(body, h({ id: "msg_other" }), secret, now));
  ok("the wrong secret fails", !svixOk(body, h(), `whsec_${Buffer.from("another-secret-entirely").toString("base64")}`, now));
  ok("no secret configured passes nothing", !svixOk(body, h(), ""));
  ok("a missing header fails", !svixOk(body, { id: null, timestamp: ts, signature: `v1,${sign(body)}` }, secret, now));
  // Replaying yesterday's delivery is not news, however well signed it is.
  ok("an old timestamp fails", !svixOk(body, h(), secret, now + 6 * 60_000));
  ok("a timestamp from the future fails", !svixOk(body, h(), secret, now - 6 * 60_000));
  ok("a timestamp that isn't a number fails", !svixOk(body, h({ timestamp: "soon" }), secret, now));
  // A secret mid-rotation signs with both, and either one matching is a pass.
  ok("one of several signatures matching is enough",
    svixOk(body, h({ signature: `v1,${sign(body, id, ts, `whsec_${Buffer.from("old-secret").toString("base64")}`)} v1,${sign(body)}` }), secret, now));
  ok("an unknown signature version alone fails", !svixOk(body, h({ signature: `v2,${sign(body)}` }), secret, now));
  ok("a signature that isn't base64 fails rather than throws", !svixOk(body, h({ signature: "v1,!!!!" }), secret, now));
}

console.log(bad === 0 ? "\nAll good." : `\n${bad} failed.`);
process.exit(bad === 0 ? 0 : 1);
