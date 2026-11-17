import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { isUnitAddress, propertyTypeFrom } from "./workOrderTypes";

/**
 * Single storey, double storey or townhouse, for the site's Property Type
 * (Jake, 18 Nov: "we could google search the home"). The model looks the
 * address up on the web, where sales and rental listings say what the house
 * is, and answers only when a listing or record for that exact address says
 * so. Anything less sure is null, and the office fills it in as before.
 *
 * A unit or apartment isn't one of the office's three, so it isn't looked up.
 */
const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

const RULES = `You find out what kind of home is at an address in Victoria, Australia, for a heating and cooling business booking a visit there.

Search the web for the exact address: sales and rental listings (realestate.com.au, domain.com.au, onthehouse, property.com.au, allhomes and the like) describe the home. Decide from what a listing or property record for that exact address says, with its street number: a single-level house, a two-storey house, or a townhouse. A listing for a different number in the same street, or a guess from the suburb, doesn't count.

End your answer with one line, exactly one of:
ANSWER: House - Single Storey
ANSWER: House - Double Storey
ANSWER: Townhouse
ANSWER: Unknown

Answer Unknown whenever you aren't sure.`;

export async function lookUpPropertyType(street: string, suburb: string, postcode: string): Promise<string | null> {
  if (!street.trim() || !suburb.trim() || isUnitAddress(street)) return null;
  const address = [street.trim(), suburb.trim(), "VIC", postcode.trim()].filter(Boolean).join(" ");
  const res = await api().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: RULES,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "AU", region: "Victoria" } }],
    messages: [{ role: "user", content: `What kind of home is at ${address}?` }],
  });
  if (res.stop_reason === "refusal" || res.stop_reason === "pause_turn") return null;
  return propertyTypeFrom(res.content.map((b) => (b.type === "text" ? b.text : "")).join(""));
}
