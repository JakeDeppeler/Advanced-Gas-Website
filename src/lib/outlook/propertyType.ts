import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { isUnitAddress, propertyTypeFrom, propertyWhyFrom } from "./workOrderTypes";

/**
 * Single storey, double storey or townhouse, for the site's Property Type
 * (Jake, 18 Nov: "we could google search the home"). The model looks the
 * address up on the web, where sales and rental listings say what the house
 * is, and answers only when a listing or record for that exact address says
 * so. Anything less sure is null, and the office fills it in as before.
 *
 * A unit is Unit without a search (stPlace.fillSiteDetails), and a shop or
 * lot isn't looked up either: no listing says what the office needs.
 * Whatever isn't found is Unknown on the site (Jake, 19 Nov).
 */
const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

const RULES = `You find out what kind of home is at an address in Victoria, Australia, for a heating and cooling business booking a visit there.

Search the web for the exact address: sales and rental listings (realestate.com.au, domain.com.au, property.com.au, onthehouse, allhomes, rent.com.au and the like) describe the home. When a result for that exact address doesn't say in its snippet, open the listing page and read it: the description, the floor plan, "single level", "double storey", "two-storey", "upstairs", "downstairs", "townhouse". Decide from what a listing or property record for that exact address says, with its street number: a single-level house, a two-storey house, or a townhouse. A listing for a different number in the same street, or a guess from the suburb, doesn't count.

End your answer with two lines:
WHY: what you found and where, in one short sentence (or why you couldn't tell)
ANSWER: exactly one of House - Single Storey, House - Double Storey, Townhouse, Unknown

Answer Unknown whenever you aren't sure.`;

/**
 * The type, or null, and a note of what was found or why not (kept on the
 * work order's row, so a blank can be told apart: 1 Bermer Court, 18 Nov).
 * It can open a listing as well as search (Jake, 19 Nov: "by what Google
 * lists the house has"), and is let carry on twice when a long search pauses.
 */
export async function lookUpPropertyType(street: string, suburb: string, postcode: string): Promise<{ type: string | null; note: string }> {
  if (!street.trim() || !suburb.trim()) return { type: null, note: "no street or suburb to look up" };
  if (isUnitAddress(street)) return { type: null, note: "a unit, shop or lot: not searched" };
  const address = [street.trim(), suburb.trim(), "VIC", postcode.trim()].filter(Boolean).join(" ");
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: `What kind of home is at ${address}?` }];
  let text = "";
  for (let turn = 0; turn < 3; turn++) {
    const res = await api().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: RULES,
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 4, user_location: { type: "approximate", country: "AU", region: "Victoria" } },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 3 },
      ],
      messages,
    });
    if (res.stop_reason === "refusal") return { type: null, note: "the lookup was declined" };
    text += res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    if (res.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: res.content });
  }
  const type = propertyTypeFrom(text);
  const why = propertyWhyFrom(text);
  return { type, note: `${type ?? "Unknown"}${why ? `: ${why}` : ""}`.slice(0, 240) };
}
