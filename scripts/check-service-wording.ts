/**
 * The service and maintenance wording (serviceScopes.ts), held to Jake's rule
 * (19 Nov): it reads the same on a quote or an invoice, so nothing in it says
 * the work is done or still to do. And what ServiceTitan will hold reads back
 * as the text, line for line.
 */
import { SERVICE_SCOPES, scopeFlat, scopeHtml, scopeText } from "../src/lib/pricebook/serviceScopes";
import { plainText } from "../src/lib/pricebook/wording";
import { flatText } from "../src/lib/pricebook/summaryRule";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  if (!pass) bad++;
  console.log(`${pass ? "ok  " : "FAIL"}  ${name}${pass ? "" : `  ${typeof extra === "string" ? extra : JSON.stringify(extra)}`}`);
};

// Past tense ("cleaned", "inspected", "was provided") or the future ("we will", "to be") gives it away.
const TELLS = /\b(completed?|cleaned|inspected|tested|checked|replaced|adjusted|flushed|provided|carried out|was|were|has been|have been|will|we'll|to be (done|carried)|we|our)\b/i;
// "found" and "removed" read as states, not as having been done: "any concerns found", "with sludge removed".
const ALLOWED = /\b(found|removed|checked at the outlets|fitted|needed|required|applicable)\b/i;

for (const s of SERVICE_SCOPES) {
  const words = scopeFlat(s);
  const tells = words.split("\n").filter((l) => TELLS.test(l.replace(ALLOWED, "")));
  ok(`${s.name}: no tense`, tells.length === 0, tells);
  ok(`${s.name}: reads back as itself from ServiceTitan's HTML`, plainText(scopeHtml(s)) === flatText(scopeText(s)) && flatText(scopeText(s)) === words, { back: plainText(scopeHtml(s)), want: words });
  ok(`${s.name}: has the report`, /Service report\nA written report/.test(words));
  ok(`${s.name}: one id`, Boolean(s.skuId) !== Boolean(s.code));
  ok(`${s.name}: headings bold`, (scopeHtml(s).match(/<strong>/g) ?? []).length === s.sections.length);
}
ok("six items", SERVICE_SCOPES.length === 6);
ok("the deep clean has no 'not included' about deep cleaning", !/Not included/.test(scopeFlat(SERVICE_SCOPES.find((s) => /Deep Clean/.test(s.name))!)));
ok("double storey says the roof access", /double-storey/.test(scopeFlat(SERVICE_SCOPES.find((s) => /Double/.test(s.name))!)));

console.log(bad ? `\n${bad} failed` : "\nall passed");
if (bad) process.exit(1);
