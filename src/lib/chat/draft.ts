import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DRAFT_SCHEMA, parseDraft, transcript, type ChatMessage, type ChatSettings, type ChatThread, type DraftResult } from "./chatTypes";
import { RULES, knowledge, officeBlock } from "./knowledge";

/**
 * One draft reply from Claude.
 *
 * A single request, not an agent: the assistant has no tools and can't do
 * anything but hand back words, and a person reads those words before any
 * customer sees them. That is the whole safety design. It can't book, can't
 * look anybody up and can't send — so a customer who talks it into something
 * has talked it into a draft.
 *
 * The answer comes back as JSON held to DRAFT_SCHEMA, so the reply, the
 * hand-off reason and the details it noticed (a phone number given halfway
 * down the thread) arrive as fields rather than prose to pick apart.
 */

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

export class DraftError extends Error {}

export async function writeDraft(
  thread: ChatThread,
  messages: ChatMessage[],
  settings: ChatSettings,
  instruction?: string,
): Promise<DraftResult> {
  if (!aiConfigured()) throw new DraftError("Drafting is off: ANTHROPIC_API_KEY isn't set on the server.");

  const known = [
    thread.name && `Name: ${thread.name}`,
    thread.phone && `Phone: ${thread.phone}`,
    thread.email && `Email: ${thread.email}`,
    thread.suburb && `Suburb: ${thread.suburb}`,
  ].filter(Boolean);

  const lastIsOurs = messages.length > 0 && messages[messages.length - 1].direction === "out";
  const ask = [
    transcript(messages, thread.channel),
    known.length ? `<known_details>\n${known.join("\n")}\n</known_details>` : "",
    instruction ? `<office_instruction>${instruction}</office_instruction>\nThe office wants this draft written to that instruction; follow it unless it breaks a rule.` : "",
    lastIsOurs
      ? "The customer hasn't replied since our last message. Write a short, friendly follow-up only if one is warranted; otherwise a one-line check-in."
      : "Write our next reply to the customer.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await api().beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      // A classifier can decline a request it reads as risky; a customer
      // asking about gas leaks reads that way more often than it should. The
      // fallback re-runs it on the recommended model instead of leaving the
      // office with nothing.
      fallbacks: "default",
      // Chat replies are short and the facts are all in the prompt. Low effort
      // is plenty, and it keeps the draft inside the few seconds somebody is
      // willing to watch a spinner.
      output_config: { effort: "low", format: { type: "json_schema", schema: DRAFT_SCHEMA as unknown as Record<string, unknown> } },
      system: [
        // The rules and the knowledge are the same for every draft, so they
        // are cached; the office's notes change, so they go after the mark.
        { type: "text", text: `${RULES}\n\n<knowledge>\n${knowledge()}\n</knowledge>`, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: officeBlock(settings) },
      ],
      messages: [{ role: "user", content: ask }],
    });
  } catch (e) {
    // The SDK's error carries the status and a message about our request,
    // never the API key — but a person in the office needs to know what to do,
    // not what the API said.
    if (e instanceof Anthropic.AuthenticationError) throw new DraftError("Drafting is off: the Anthropic API key was refused.");
    if (e instanceof Anthropic.RateLimitError) throw new DraftError("Too many drafts at once. Try again in a minute.");
    if (e instanceof Anthropic.APIConnectionError) throw new DraftError("Couldn't reach the drafting service. Try again.");
    if (e instanceof Anthropic.APIError) throw new DraftError(`The drafting service had a problem (${e.status ?? "no status"}). Try again, or write this one yourself.`);
    throw new DraftError("The draft couldn't be written. Write this one yourself.");
  }

  if (res.stop_reason === "refusal") throw new DraftError("The assistant wouldn't draft this one. Write it yourself.");
  if (res.stop_reason === "max_tokens") throw new DraftError("The draft ran too long and was cut off. Try again.");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return parseDraft(text);
  } catch {
    throw new DraftError("The draft came back in a shape that couldn't be read. Try again.");
  }
}
