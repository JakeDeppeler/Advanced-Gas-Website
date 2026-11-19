import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured } from "@/lib/chat/draft";
import { WORDS_RULES, WORDS_SCHEMA, parseWords, wordsInput, type JobWords, type WordsInput } from "./words";

export { aiConfigured };

const MODEL = "claude-opus-5-5";
let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

/**
 * The quote's and the invoice's words for one job, from Claude. A single
 * request with no tools: it can only hand back words, which a person reads
 * and can change before anything is put on ServiceTitan. Throws with a
 * message for the office, never the API's own.
 */
export async function writeWords(w: WordsInput): Promise<{ words: JobWords; from: string[]; key: string }> {
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY isn't set on the server.");
  const input = wordsInput(w);
  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await api().beta.messages.create({
      model: MODEL,
      max_tokens: 3000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Reading a quote, a form and a few notes and saying what they say:
      // low effort keeps it well inside the page's minute.
      output_config: { effort: "low", format: { type: "json_schema", schema: WORDS_SCHEMA as unknown as Record<string, unknown> } },
      system: [{ type: "text", text: WORDS_RULES, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content: [{ type: "text", text: `${input.text}\n\nWrite the quote's and the invoice's words for this job.` }] }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("the Anthropic API key was refused");
    if (e instanceof Anthropic.RateLimitError) throw new Error("too many requests to Claude at once; try again in a minute");
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Claude couldn't be reached");
    if (e instanceof Anthropic.APIError) throw new Error(`Claude had a problem (${e.status ?? "no status"})`);
    throw new Error("the words couldn't be written");
  }
  if (res.stop_reason === "refusal") throw new Error("Claude wouldn't write this one");
  if (res.stop_reason === "max_tokens") throw new Error("the words ran too long");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return { words: parseWords(text), from: input.sources, key: input.key };
  } catch {
    throw new Error("the words came back in a shape that couldn't be read");
  }
}
