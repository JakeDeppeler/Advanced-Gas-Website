import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured } from "@/lib/outlook/draft";
import { PLAN_RULES, PLAN_SCHEMA, type PlanRead } from "./planShape";

/**
 * A duct plan drawing and the office's notes, read by Claude into the plan's
 * zones, outlets, take-offs and runs (planShape.ts). One request, no tools:
 * it can only hand back what it read, which the office sees before anything
 * is priced or put on a job.
 */
const MODEL = "claude-opus-5-5";
let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic());

export type PlanFile = { data: string; mime: string };
const IMAGE = /^image\/(png|jpeg|webp|gif)$/;

export async function readPlan(file: PlanFile | null, notes: string): Promise<PlanRead> {
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY isn't set on the server.");
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (file) {
    if (IMAGE.test(file.mime)) content.push({ type: "image", source: { type: "base64", media_type: file.mime as "image/png", data: file.data } });
    else if (file.mime === "application/pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } });
    else throw new Error("The plan needs to be a PNG, JPEG or PDF.");
  }
  content.push({
    type: "text",
    text: `${file ? "The duct plan is attached." : "No drawing is attached: read the notes only."}\n\n<office_notes>\n${notes.trim() || "(none)"}\n</office_notes>\n\nRead the plan for the quote.`,
  });

  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await api().beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Counting outlets and following runs on a drawing needs more care than
      // writing a summary, but the read has to fit the page's minute.
      output_config: { effort: "medium", format: { type: "json_schema", schema: PLAN_SCHEMA as unknown as Record<string, unknown> } },
      system: [{ type: "text", text: PLAN_RULES, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content }],
    }, { timeout: 50_000 });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error("the Anthropic API key was refused");
    if (e instanceof Anthropic.RateLimitError) throw new Error("too many requests to Claude at once: try again in a minute");
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new Error("reading the plan took too long: try again, or use the designer's materials CSV");
    if (e instanceof Anthropic.APIConnectionError) throw new Error("Claude couldn't be reached");
    if (e instanceof Anthropic.APIError) throw new Error(`Claude had a problem (${e.status ?? "no status"})`);
    throw new Error("the plan couldn't be read");
  }
  if (res.stop_reason === "refusal") throw new Error("Claude wouldn't read this one");
  if (res.stop_reason === "max_tokens") throw new Error("the plan ran too long to read in one go");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  try {
    return JSON.parse(text) as PlanRead;
  } catch {
    throw new Error("the plan came back in a shape that couldn't be read");
  }
}
