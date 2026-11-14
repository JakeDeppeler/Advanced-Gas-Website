/**
 * The instant answers' log: every question asked in "Ask us anything" and the
 * answer it got, in chat_answers (migration 0115), for the portal's Chat
 * answers page.
 *
 * Server-only, through the same service-role REST helpers as the rest of the
 * portal. Writing is best-effort: a visitor's answer is never held up or lost
 * because the log couldn't be written, so a failed write is reported to the
 * server log and the reply goes out regardless.
 */

import "server-only";
import { dashboardDbConfigured, q, sbInsert, sbSelect } from "@/lib/dashboard/db";
import type { AskReply } from "./types";

export type AnswerRow = {
  id: string;
  created_at: string;
  session: string;
  page: string | null;
  question: string;
  answer: string;
  answered_by: "ai" | "site";
  kind: AskReply["kind"];
  link: string | null;
  about: string | null;
};

/** A session id from the widget: a UUID, or the short fallback it makes without crypto. */
export const cleanSession = (v: unknown): string | null =>
  typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;

/** The page they asked from, as a path. Anything else (a full URL, a query string) is dropped. */
export const cleanPage = (v: unknown): string | null =>
  typeof v === "string" && /^\/[A-Za-z0-9\-/_.]{0,200}$/.test(v) ? v : null;

export async function logAnswer(p: { session: string; page: string | null; question: string; reply: AskReply; ipHash: string | null }): Promise<void> {
  if (!dashboardDbConfigured()) return;
  try {
    await sbInsert("chat_answers", {
      session: p.session,
      page: p.page,
      question: p.question,
      answer: p.reply.text,
      answered_by: p.reply.by,
      kind: p.reply.kind,
      link: p.reply.link?.href ?? null,
      about: p.reply.about ?? null,
      ip_hash: p.ipHash,
    });
  } catch (e) {
    // The status only: the body could echo the question back into the log.
    console.error("chat_answers write failed", e instanceof Error ? e.message.split(":")[0] : "unknown");
  }
}

export type AnswerFilter = "all" | "unsure";

/**
 * The most recent questions, newest first, capped so the page stays quick.
 * "unsure" is the list worth reading for content gaps: what the site had
 * nothing on.
 */
export async function recentAnswers(filter: AnswerFilter, days = 30, cap = 500): Promise<AnswerRow[]> {
  if (!dashboardDbConfigured()) return [];
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const parts = [
    q.select("id,created_at,session,page,question,answer,answered_by,kind,link,about"),
    q.gte("created_at", since),
    ...(filter === "unsure" ? [q.eq("kind", "unsure")] : []),
    q.order("created_at", "desc"),
    `limit=${cap}`,
  ];
  return sbSelect<AnswerRow>("chat_answers", parts.join("&"));
}
