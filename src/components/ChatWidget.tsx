"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { openingHours, site } from "@/lib/site";
import "./ChatWidget.css";

/**
 * The website's chat.
 *
 * Every reply is written (or approved) by a person in the office, so this is
 * not an instant answer box and it doesn't pretend to be one. It asks for a
 * name and a way to reach them before the first message, because a reply that
 * arrives after the visitor has closed the tab has to go somewhere — it is
 * emailed to them when they left an address, and the office rings the number
 * when they left one of those.
 *
 * Off until the office turns it on in the portal (Customer chats → Settings);
 * it asks /api/chat/config after the page loads, so the setting never makes a
 * static page dynamic.
 */

type Msg = { id: string; at: string; from: "you" | "us"; body: string };
type Stored = { t: string; seen?: string };

const KEY = "ag-chat";
const HIDDEN = /^\/(portal|trade|screen|tv)(\/|$)/;

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

export function ChatWidget() {
  const pathname = usePathname() ?? "/";
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [trap, setTrap] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const replyField = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);

  // Is it on? A visitor who already has a conversation keeps the button even
  // if the office has since turned the chat off, so a reply can still reach them.
  useEffect(() => {
    const stored = load();
    if (stored) {
      setToken(stored.t);
      setEnabled(true);
    }
    let cancelled = false;
    fetch("/api/chat/config")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j: { enabled?: boolean }) => {
        if (!cancelled && j.enabled) setEnabled(true);
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
    const t = touch ? 0 : window.setTimeout(() => (token ? replyField.current : firstField.current)?.focus(), 50);
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
  }, [open, token]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  if (!enabled || HIDDEN.test(pathname)) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!text.trim()) return setError("Type a message first.");
    if (!token && (!name.trim() || !contact.trim())) return setError("Your name and a mobile or email, so we can reply.");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { t: token, text } : { name, contact, text, website: trap }),
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

  return (
    <div className={`agchat${open ? " is-open" : ""}`}>
      {open && (
        <div className="agchat__panel" role="dialog" aria-label="Chat with Advanced Gas" aria-modal="false">
          <div className="agchat__head">
            <div>
              <strong>Chat with the team</strong>
              <span>{staffed ? "In the office now · a real person replies" : `Closed now · open ${openingHours()}`}</span>
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
            <div className="agchat__msg is-us">
              <p>
                Hi! Ask us about aircon, heat pumps, hot water or gas. {token ? "" : "Leave your name and a mobile or email so we can get back to you even if you close this page."}
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

          <form className="agchat__form" onSubmit={send}>
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
                  maxLength={1500}
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
        <span className="agchat__label">Chat with us</span>
        {unread && <i className="agchat__dot" aria-hidden="true" />}
      </button>
    </div>
  );
}
