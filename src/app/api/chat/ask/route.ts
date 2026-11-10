import { NextResponse } from "next/server";
import { cleanText, hashIp } from "@/lib/chat/chatTypes";
import { isEmergency, localAnswer } from "@/lib/assistant/answer";
import { askClaude } from "@/lib/assistant/llm";
import { cleanPage, cleanSession, logAnswer } from "@/lib/assistant/log";
import { ASK_LIMITS, assistantEnabled, type AskReply, type AskTurn } from "@/lib/assistant/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The website chat's instant answers.
 *
 * Public and unauthenticated. Each question and its answer is written to
 * chat_answers (lib/assistant/log.ts) so the office can read what people ask
 * on the portal's Chat answers page; there is no person behind this chat any
 * more, so that log is how anyone sees it (Jake, Nov 2026). Nothing else is
 * written: no lead, no thread, and no name or number, because none is asked
 * for. The address is kept only as a salted hash. The guarding is about cost
 * and abuse: a body cap, a question cap, a per-address rate limit, and
 * generic errors.
 *
 * Claude answers when ANTHROPIC_API_KEY is set; otherwise, and whenever the
 * model fails or says something it mustn't (llm.ts), the site's own FAQ
 * matcher answers instead, so the chat never goes quiet.
 */

const noStore = { "Cache-Control": "no-store" };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: noStore });

/**
 * Per-address limit, in memory. Each serverless instance keeps its own count
 * and forgets it when it's recycled, so this stops one person hammering the
 * model from one tab, not a determined attack across many instances. Good
 * enough while the worst case is a few cents of Haiku; if it ever needs to
 * hold properly it belongs in the database alongside the chat's own limits.
 */
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing without end on a long-lived instance.
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
  return recent.length > PER_WINDOW;
}

const clientIp = (req: Request) => (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim() || "unknown";

function turns(v: unknown): AskTurn[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(-ASK_LIMITS.turns)
    .map((t) => (t && typeof t === "object" ? (t as Record<string, unknown>) : {}))
    .map((t) => ({ q: cleanText(t.q, ASK_LIMITS.turnChars), a: cleanText(t.a, ASK_LIMITS.turnChars) }))
    .filter((t) => t.q);
}

export async function POST(req: Request) {
  // Preview deployments only until it's signed off; see assistantEnabled.
  if (!assistantEnabled()) return bad("not found", 404);

  const raw = await req.text();
  if (raw.length > ASK_LIMITS.body) return bad("That's too long. Try a shorter question.", 413);
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return bad("bad request");
    body = parsed as Record<string, unknown>;
  } catch {
    return bad("bad request");
  }

  const question = cleanText(body.q, ASK_LIMITS.question);
  if (!question) return bad("Type a question first.");
  if (limited(clientIp(req))) return bad(`That's a lot of questions at once. Give it a minute, or call us.`, 429);

  const history = turns(body.history);
  const local = localAnswer(question, history);
  // Logged under the widget's id for this tab; a request without one (an old
  // tab, a script) is still answered and logged on its own.
  const record = (reply: AskReply) => logAnswer({
    session: cleanSession(body.session) ?? crypto.randomUUID(),
    page: cleanPage(body.page),
    question,
    reply,
    ipHash: hashIp(clientIp(req), process.env.SUPABASE_SERVICE_ROLE_KEY ?? "chat"),
  });

  // The gas safety lines are always the fixed ones: a safety message is not
  // something to have reworded.
  if (isEmergency(question)) {
    await record(local);
    return NextResponse.json({ reply: local }, { headers: noStore });
  }

  const ai = await askClaude(question, history);
  const reply: AskReply = "text" in ai ? { text: ai.text, link: local.kind === "answer" ? local.link : undefined, kind: "answer", by: "ai" } : local;
  await record(reply);
  return NextResponse.json({ reply }, { headers: noStore });
}
