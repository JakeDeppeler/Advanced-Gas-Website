/**
 * The quote tag plan (quoteStage.planTags): forward only, except To Be
 * Booked on a quote that isn't sold, which goes to Awaiting Quote Approval
 * (Jake, 19 Nov: "if a quote has been sent with no sold its tag should be
 * awaiting quote approval vs the to be booked").
 */
import { planTags } from "../src/lib/automation/quoteStage";

let bad = 0;
const ok = (name: string, got: unknown, want: unknown) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) bad++;
  console.log(`${pass ? "ok  " : "FAIL"}  ${name}${pass ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

// Tag ids as in ServiceTitan; 99 is some other tag of the office's.
const ids = { toQuote: 1, draft: 2, sent: 3, toBook: 4 };

ok("To Be Booked on an unsold quote → Awaiting, other tags kept", planTags([4, 99], "draft", ids), { tags: [99, 3], add: 3, drop: [4] });
ok("To Be Booked and Quote In Draft on an unsold quote → Awaiting", planTags([2, 4], "draft", ids), { tags: [3], add: 3, drop: [2, 4] });
ok("To Be Booked and Awaiting on an unsold quote → just Awaiting", planTags([4, 3], "draft", ids), { tags: [3], add: null, drop: [4] });
ok("a sold quote keeps To Be Booked", planTags([4, 99], "toBook", ids), null);
ok("a work order with no quote keeps To Be Booked", planTags([4, 99], "toQuote", ids), null);
ok("no Awaiting tag in ServiceTitan: left as it is", planTags([4, 99], "draft", { toQuote: 1, draft: 2, toBook: 4 }), null);
ok("Awaiting isn't put back to Quote In Draft", planTags([3, 99], "draft", ids), null);
ok("Quotation Required → Quote In Draft, as before", planTags([1, 99], "draft", ids), { tags: [99, 2], add: 2, drop: [1] });
ok("Awaiting → To Be Booked once sold, as before", planTags([3], "toBook", ids), { tags: [4], add: 4, drop: [3] });

console.log(bad ? `\n${bad} failed` : "\nall passed");
if (bad) process.exit(1);
