"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { openingHours, site } from "@/lib/site";
import { ASK_LIMITS, type AskReply } from "@/lib/assistant/types";
import "./ChatWidget.css";

/**
 * The website's chat.
 *
 * Two modes. "Talk to the team" is the human chat: every reply is written (or
 * approved) by a person in the office, so it asks for a name and a way to
 * reach them before the first message, because a reply that arrives after the
 * visitor has closed the tab has to go somewhere — it is emailed to them when
 * they left an address, and the office rings the number when they left one.
 *
 * "Instant answers" (only where `assistant` is on; see assistantEnabled)
 * sits in front of it: ask straight away, no details needed, and get an
 * answer from the site's own content. It is labelled as exactly that on every
 * answer, so nobody thinks a person typed it, and every answer offers the next
 * step: a quote, a call, or the team. Going to the team carries the questions
 * so far into the first message, so the office sees what was already asked.
 *
 * The human chat is off until the office turns it on in the portal (Customer
 * chats → Settings); it asks /api/chat/config after the page loads, so the
 * setting never makes a static page dynamic. Instant answers don't depend on
 * that setting: they need nobody in the office, which is the point of them at
 * 11pm. With the human chat off, "Talk to the team" offers the phone and the
 * quote form instead of a chat that would refuse the message.
 */

type Msg = { id: string; at: string; from: "you" | "us"; body: string };
type Stored = { t: string; seen?: string };
type Asked = { id: number; q: string; reply?: AskReply; failed?: boolean };

const KEY = "ag-chat";
const HIDDEN = /^\/(portal|trade|screen|tv)(\/|$)/;
/** The human chat's message cap, from /api/chat. The carried questions have to fit inside it. */
const TEAM_MAX = 1500;

function load(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Stored) : null;
    return v && typeof v.t === "string" && v.t ? v : null;
  } catch {
    return null;
  }
}
function save(v: Stored | null) {
  try {
    if (v) window.localStorage.setItem(KEY, JSON.stringify(v));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* Private mode: the chat still works for this page view. */
  }
}

/** Whether somebody is in the office right now, Melbourne time. Mirrors site.hours. */
function inHours(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  if (day === "Sat" || day === "Sun") return false;
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  const [oh, om] = site.hours[0].open.split(":").map(Number);
  const [ch, cm] = site.hours[0].close.split(":").map(Number);
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * The visitor's message with the instant-answer questions behind it, inside
 * the human chat's cap. Newest questions kept first when they don't all fit;
 * the visitor's own words are never cut for them.
 */
function withContext(text: string, asked: Asked[]): string {
  const done = asked.filter((a) => a.reply);
  if (!done.length) return text;
  const head = "\n\n— Asked the website's instant answers first —";
  let room = TEAM_MAX - text.length - head.length;
  const lines: string[] = [];
  for (const a of [...done].reverse()) {
    const line = `\nQ: ${clip(a.q, 200)}\nA: ${clip(a.reply!.text.replace(/\s+/g, " "), 160)}`;
    if (line.length > room) break;
    lines.unshift(line);
    room -= line.length;
  }
  return lines.length ? `${text}${head}${lines.join("")}` : text;
}

const STARTERS = ["How long does a split system install take?", "How much is the VEU rebate?", "Do you service Berwick?"];

export function ChatWidget({ assistant = false }: { assistant?: boolean }) {
  const pathname = usePathname() ?? "/";
  const [humanOn, setHumanOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ask" | "team">(assistant ? "ask" : "team");
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [trap, setTrap] = useState("");
  const [asked, setAsked] = useState<Asked[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const replyField = useRef<HTMLTextAreaElement>(null);
  const askField = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const nextId = useRef(1);

  // Is it on? A visitor who already has a conversation keeps the button even
  // if the office has since turned the chat off, so a reply can still reach
  // them, and they land on that conversation rather than the instant answers.
  useEffect(() => {
    const stored = load();
    if (stored) {
      setToken(stored.t);
      setHumanOn(true);
      setMode("team");
    }
    let cancelled = false;
    fetch("/api/chat/config")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j: { enabled?: boolean }) => {
        if (!cancelled && j.enabled) setHumanOn(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/chat?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      if (r.status === 404) {
        // The conversation is gone (deleted in the portal). Start clean.
        save(null);
        setToken(null);
        setMessages([]);
        return;
      }
      if (!r.ok) return;
      const j = (await r.json()) as { messages: Msg[] };
      setMessages(j.messages);
      const lastUs = [...j.messages].reverse().find((m) => m.from === "us");
      const stored = load();
      if (lastUs && stored?.seen !== lastUs.id) {
        if (open) save({ t: token, seen: lastUs.id });
        else setUnread(true);
      }
    } catch {
      /* Offline for a moment; the next poll catches up. */
    }
  }, [token, open]);

  // Every 5 seconds while it's open, every 30 while it's closed — enough to
  // light the dot on the button when a reply lands, and no more.
  useEffect(() => {
    if (!token) return;
    poll();
    const id = window.setInterval(poll, open ? 5_000 : 30_000);
    return () => window.clearInterval(id);
  }, [token, open, poll]);

  useEffect(() => {
    if (!open) return;
    setUnread(false);
    // Not on a phone: focusing a field there throws the keyboard up over the
    // panel before the visitor has read what it says.
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    const t = touch ? 0 : window.setTimeout(() => (mode === "ask" ? askField.current : token ? replyField.current : firstField.current)?.focus(), 50);
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
  }, [open, token, mode]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, asked, open, mode]);

  if (!(humanOn || assistant) || HIDDEN.test(pathname)) return null;

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
        body: JSON.stringify({ q: clean.slice(0, ASK_LIMITS.question), history }),
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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!text.trim()) return setError("Type a message first.");
    if (!token && (!name.trim() || !contact.trim())) return setError("Your name and a mobile or email, so we can reply.");
    setBusy(true);
    try {
      // The first message of a new conversation carries the instant-answer questions.
      const body = token ? text : withContext(text.trim(), asked);
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { t: token, text: body } : { name, contact, text: body, website: trap }),
      });
      const j = (await r.json().catch(() => ({}))) as { token?: string; messages?: Msg[]; error?: string };
      if (r.status === 404 && token) {
        save(null);
        setToken(null);
        setMessages([]);
        setError("That chat has closed. Send your message again to start a new one.");
        return;
      }
      if (!r.ok) return setError(j.error ?? "That didn't send. Try again, or call us.");
      if (j.token) {
        save({ t: j.token });
        setToken(j.token);
      }
      if (j.messages) setMessages(j.messages);
      setText("");
    } catch {
      setError("That didn't send. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const waiting = messages.length > 0 && messages[messages.length - 1].from === "you";
  const staffed = inHours();
  const lastAnswered = [...asked].reverse().find((a) => a.reply)?.id;
  const carrying = !token && asked.some((a) => a.reply);
  // The team can only be messaged here when the office has the chat on, or
  // this visitor already has a conversation open.
  const teamChat = humanOn || !!token;

  const toTeam = () => {
    setMode("team");
    setError(null);
  };

  const nextSteps = (r: AskReply) => (
    <div className="agchat__next" role="group" aria-label="Next steps">
      {r.kind === "emergency" ? (
        <a className="agchat__btn is-call" href={`tel:${site.phoneE164}`}>Call {site.phone} now</a>
      ) : (
        <>
          <a className="agchat__btn is-quote" href="/quote">Get a free quote</a>
          <a className="agchat__btn" href={`tel:${site.phoneE164}`}>Call {site.phone}</a>
          <button type="button" className="agchat__btn" onClick={toTeam}>Talk to the team</button>
        </>
      )}
    </div>
  );

  return (
    <div className={`agchat${open ? " is-open" : ""}`}>
      {open && (
        <div className="agchat__panel" role="dialog" aria-label="Chat with Advanced Gas" aria-modal="false">
          <div className="agchat__head">
            <div>
              <strong>{mode === "ask" ? "Instant answers" : "Chat with the team"}</strong>
              <span>
                {mode === "ask"
                  ? "Instant answers from our site — for anything else, talk to the team"
                  : staffed
                    ? "In the office now · a real person replies"
                    : `Closed now · open ${openingHours()}`}
              </span>
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

          {assistant && (
            <div className="agchat__tabs" role="group" aria-label="Chat mode">
              <button type="button" aria-pressed={mode === "ask"} className="agchat__tab" onClick={() => setMode("ask")}>
                Instant answers
              </button>
              <button type="button" aria-pressed={mode === "team"} className="agchat__tab" onClick={toTeam}>
                Talk to the team
              </button>
            </div>
          )}

          {mode === "ask" ? (
            <>
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
                        {a.reply.link && !a.reply.link.href.startsWith("tel:") && (
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
            </>
          ) : (
            <>
              <div className="agchat__list" ref={listRef} aria-live="polite">
                <div className="agchat__msg is-us">
                  <p>
                    {teamChat
                      ? `Hi! Ask us about aircon, heat pumps, hot water or gas. ${token ? "" : "Leave your name and a mobile or email so we can get back to you even if you close this page."}`
                      : `The team's chat is closed right now. Call us on ${site.phone}, or send the quote form and we'll get back to you. ${staffed ? "" : `The office is open ${openingHours()}; emergencies are answered 24/7.`}`}
                  </p>
                </div>
                {messages.map((m) => (
                  <div key={m.id} className={`agchat__msg ${m.from === "us" ? "is-us" : "is-you"}`}>
                    <p>{m.body}</p>
                    <time dateTime={m.at}>{time(m.at)}</time>
                  </div>
                ))}
                {waiting && (
                  <p className="agchat__note">
                    {staffed ? "Sent. Someone will reply here shortly." : "Sent. We're off the tools right now, we'll reply first thing next business day."}
                  </p>
                )}
              </div>

              {teamChat ? (
                <form className="agchat__form" onSubmit={send}>
                  {carrying && <p className="agchat__carry">Your questions from the instant answers go with your message, so the team sees what you asked.</p>}
                  {!token && (
                    <div className="agchat__who">
                      <label>
                        <span className="sr-only">Your name</span>
                        <input ref={firstField} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={80} />
                      </label>
                      <label>
                        <span className="sr-only">Mobile or email</span>
                        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Mobile or email" autoComplete="tel" maxLength={120} />
                      </label>
                      {/* Hidden from people, irresistible to bots. */}
                      <input className="agchat__trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
                    </div>
                  )}
                  <div className="agchat__send">
                    <label className="agchat__text">
                      <span className="sr-only">Message</span>
                      <textarea
                        ref={replyField}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                          }
                        }}
                        rows={2}
                        maxLength={TEAM_MAX}
                        placeholder={token ? "Type a message" : "What can we help with?"}
                      />
                    </label>
                    <button type="submit" className="agchat__go" disabled={busy} aria-label="Send">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                  {error && <p className="agchat__err" role="alert">{error}</p>}
                  <p className="agchat__sos">
                    Smell gas or an emergency? <a href={`tel:${site.phoneE164}`}>Call {site.phone}</a>, 24/7.
                  </p>
                </form>
              ) : (
                <div className="agchat__form">
                  <div className="agchat__next">
                    <a className="agchat__btn is-quote" href="/quote">Get a free quote</a>
                    <a className="agchat__btn" href={`tel:${site.phoneE164}`}>Call {site.phone}</a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        ref={launcher}
        type="button"
        className="agchat__launch"
        aria-expanded={open}
        aria-label={open ? "Close chat" : unread ? "Chat with us, new reply" : "Chat with us"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
        <span className="agchat__label">{assistant ? "Ask us anything" : "Chat with us"}</span>
        {unread && <i className="agchat__dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
