"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { ASK_LIMITS, type AskReply } from "@/lib/assistant/types";
import "./ChatWidget.css";

/**
 * The website's chat: "Ask us anything", instant answers only.
 *
 * Ask straight away, no details needed, and get an answer from the site's
 * own content, labelled as exactly that on every answer so nobody thinks a
 * person typed it. Every answer offers the next step: a quote or a call.
 *
 * There used to be a second mode, "Talk to the team", where a person in the
 * office replied. Jake took it out (Nov 2026): the answers are the chat. So
 * nothing here asks for a name or a number, and nothing waits on the office.
 * What gets asked is still seen: /api/chat/ask logs each question and its
 * answer, and the portal's Chat answers page lists them, so the office knows
 * what people want to know and where the site has nothing to say.
 *
 * Only where `assistant` is on (see assistantEnabled); with it off there is
 * no chat at all.
 */

type Asked = { id: number; q: string; reply?: AskReply; failed?: boolean };

const HIDDEN = /^\/(portal|trade|screen|tv)(\/|$)/;
const SESSION = "ag-ask";

let fallback: string | undefined;

/**
 * This tab's conversation id, so the log can put a follow-up under the
 * question before it. sessionStorage, not localStorage: a new tab or a visit
 * next week is a new conversation, and nothing identifies the person.
 */
function sessionId(): string {
  try {
    const have = window.sessionStorage.getItem(SESSION);
    if (have) return have;
    const made = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION, made);
    return made;
  } catch {
    // Private mode or an old browser: one id for this page view.
    return (fallback ??= Math.random().toString(36).slice(2) + Date.now().toString(36));
  }
}
const STARTERS = ["How long does a split system install take?", "How much is the VEU rebate?", "What does a service cost?"];

export function ChatWidget({ assistant = false }: { assistant?: boolean }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState<Asked[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const askField = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (!open) return;
    // Not on a phone: focusing a field there throws the keyboard up over the
    // panel before the visitor has read what it says.
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    const t = touch ? 0 : window.setTimeout(() => askField.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [asked, open]);

  if (!assistant || HIDDEN.test(pathname)) return null;

  async function ask(q: string) {
    const clean = q.trim();
    if (!clean || asking) return;
    const id = nextId.current++;
    const history = asked
      .filter((a) => a.reply)
      .slice(-ASK_LIMITS.turns)
      .map((a) => ({ q: a.q.slice(0, ASK_LIMITS.turnChars), a: a.reply!.text.slice(0, ASK_LIMITS.turnChars) }));
    setAsked((list) => [...list, { id, q: clean }]);
    setQuestion("");
    setAsking(true);
    try {
      const r = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: clean.slice(0, ASK_LIMITS.question), history, session: sessionId(), page: pathname }),
      });
      const j = (await r.json().catch(() => ({}))) as { reply?: AskReply; error?: string };
      setAsked((list) =>
        list.map((a) =>
          a.id !== id
            ? a
            : j.reply
              ? { ...a, reply: j.reply }
              : { ...a, failed: true, reply: { text: j.error ?? `That didn't go through. Try again, or call ${site.phone}.`, kind: "unsure", by: "site" } },
        ),
      );
    } catch {
      setAsked((list) => list.map((a) => (a.id === id ? { ...a, failed: true, reply: { text: "That didn't go through. Check your connection and try again.", kind: "unsure", by: "site" } } : a)));
    } finally {
      setAsking(false);
    }
  }

  const lastAnswered = [...asked].reverse().find((a) => a.reply)?.id;

  const nextSteps = (r: AskReply) => (
    <div className="agchat__next" role="group" aria-label="Next steps">
      {r.kind === "emergency" ? (
        <a className="agchat__btn is-call" href={`tel:${site.phoneE164}`}>Call {site.phone} now</a>
      ) : (
        <>
          <a className="agchat__btn is-quote" href="/quote">Get a free quote</a>
          <a className="agchat__btn" href={`tel:${site.phoneE164}`}>Call {site.phone}</a>
        </>
      )}
    </div>
  );

  return (
    <div className={`agchat${open ? " is-open" : ""}`}>
      {open && (
        <div className="agchat__panel" role="dialog" aria-label="Ask us anything" aria-modal="false">
          <div className="agchat__head">
            <div>
              <strong>Ask us anything</strong>
              <span>Instant answers from our website, day or night</span>
            </div>
            <button
              type="button"
              className="agchat__x"
              aria-label="Close chat"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="agchat__list" ref={listRef} aria-live="polite">
            <div className="agchat__msg is-bot">
              <span className="agchat__by">Instant answer</span>
              <p>Ask anything about air con, heating, hot water, gas, rebates or the areas we cover. You&apos;ll get an answer straight away from what&apos;s on our website, day or night.</p>
            </div>
            {asked.length === 0 && (
              <div className="agchat__starters" role="group" aria-label="Try asking">
                {STARTERS.map((s) => (
                  <button key={s} type="button" className="agchat__starter" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {asked.map((a) => (
              <div key={a.id} className="agchat__turn">
                <div className="agchat__msg is-you">
                  <p>{a.q}</p>
                </div>
                {a.reply ? (
                  <div className={`agchat__msg is-bot${a.reply.kind === "emergency" ? " is-alert" : ""}`}>
                    <span className="agchat__by">
                      {a.reply.kind === "emergency" ? "Gas safety · act now" : a.failed ? "Not sent" : a.reply.by === "ai" ? "Instant answer · written by AI from our website" : "Instant answer · from our website"}
                    </span>
                    {a.reply.about && <span className="agchat__about">Closest question on our site: {a.reply.about}</span>}
                    <p>{a.reply.text}</p>
                    {/* Not the quote form or the phone: the buttons below already are those. */}
                    {a.reply.link && !/^(tel:|\/quote$)/.test(a.reply.link.href) && (
                      <a className="agchat__more" href={a.reply.link.href}>
                        {a.reply.link.label} <span aria-hidden="true">→</span>
                      </a>
                    )}
                    {a.id === lastAnswered && nextSteps(a.reply)}
                  </div>
                ) : (
                  <div className="agchat__msg is-bot">
                    <span className="agchat__by">Instant answer</span>
                    <p className="agchat__typing">Finding an answer…</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <form
            className="agchat__form"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <div className="agchat__send">
              <label className="agchat__text">
                <span className="sr-only">Your question</span>
                <textarea
                  ref={askField}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={ASK_LIMITS.question}
                  placeholder="Ask a question"
                />
              </label>
              <button type="submit" className="agchat__go" disabled={asking || !question.trim()} aria-label="Ask">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <p className="agchat__sos">
              Smell gas or an emergency? <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a>, 24/7.
            </p>
          </form>
        </div>
      )}

      <button
        ref={launcher}
        type="button"
        className="agchat__launch"
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Ask us anything"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
        <span className="agchat__label">Ask us anything</span>
      </button>
    </div>
  );
}
