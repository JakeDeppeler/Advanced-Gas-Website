"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardDraft, draftReply, sendReply } from "@/app/portal/chats/actions";

/**
 * The reply box: the assistant's draft, editable, and nothing goes until a
 * person presses Send.
 *
 * The draft is written when the thread is opened rather than when the message
 * arrives. It is only worth paying for when somebody is about to read it, and
 * a draft written the moment a message lands is out of date by the time the
 * customer's second message ("in Pakenham btw") arrives a minute later.
 */
export function ChatReply({
  threadId,
  draft,
  flag,
  autoDraft,
  aiOn,
  landing,
  blocked,
}: {
  threadId: string;
  draft: string | null;
  flag: string | null;
  autoDraft: boolean;
  aiOn: boolean;
  landing: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(draft ?? "");
  const [fromDraft, setFromDraft] = useState(Boolean(draft));
  const [note, setNote] = useState<string | null>(flag);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [howTo, setHowTo] = useState("");
  const [sending, startSend] = useTransition();
  const asked = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);

  async function draftNow(instruction?: string) {
    setDrafting(true);
    setError(null);
    setDone(null);
    const r = await draftReply(threadId, instruction);
    setDrafting(false);
    if (!r.ok) return setError(r.error);
    setText(r.draft);
    setFromDraft(true);
    setNote(r.flag);
    setHowTo("");
    box.current?.focus();
  }

  useEffect(() => {
    if (autoDraft && !asked.current) {
      asked.current = true;
      void draftNow();
    }
    // Once per page load: a redraft is a button, not an effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDraft]);

  function send() {
    setError(null);
    setDone(null);
    startSend(async () => {
      const r = await sendReply(threadId, text, fromDraft);
      if (!r.ok) return setError(r.error);
      setText("");
      setFromDraft(false);
      setNote(null);
      setDone(r.note ?? "Sent.");
      router.refresh();
    });
  }

  return (
    <div className="ch-reply">
      {note && (
        <p className="ch-reply__flag" role="status">
          <strong>Needs a person:</strong> {note}
        </p>
      )}
      <label className="ch-reply__label" htmlFor={`reply-${threadId}`}>
        {drafting ? "The assistant is writing a draft…" : fromDraft ? "Draft reply. Change anything, then send." : "Your reply"}
      </label>
      <textarea
        id={`reply-${threadId}`}
        ref={box}
        className="ch-reply__box"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={2000}
        disabled={drafting}
        placeholder={drafting ? "" : aiOn ? "Write a reply, or ask for a draft below." : "Write a reply."}
      />
      <p className="ch-reply__landing">{landing}</p>
      <div className="ch-reply__acts">
        <button type="button" className="pt-btn pt-btn--orange" onClick={send} disabled={sending || drafting || !text.trim() || blocked}>
          {sending ? "Sending…" : "Send"}
        </button>
        {aiOn && (
          <form
            className="ch-reply__redraft"
            onSubmit={(e) => {
              e.preventDefault();
              void draftNow(howTo.trim() || undefined);
            }}
          >
            <label className="sr-only" htmlFor={`howto-${threadId}`}>What to change in the draft</label>
            <input
              id={`howto-${threadId}`}
              value={howTo}
              onChange={(e) => setHowTo(e.target.value)}
              placeholder={text ? "Change it: e.g. shorter, offer Tuesday" : "Optional: tell it what to say"}
              maxLength={400}
              disabled={drafting}
            />
            <button type="submit" className="pt-btn pt-btn--ghost" disabled={drafting}>
              {drafting ? "Drafting…" : text ? "Redraft" : "Draft a reply"}
            </button>
          </form>
        )}
        {fromDraft && text && !drafting && (
          <button
            type="button"
            className="pt-btn pt-btn--ghost"
            onClick={async () => {
              setText("");
              setFromDraft(false);
              setNote(null);
              await discardDraft(threadId);
            }}
          >
            Clear
          </button>
        )}
      </div>
      {error && <p className="ch-reply__err" role="alert">{error}</p>}
      {done && <p className="ch-reply__done" role="status">{done}</p>}
    </div>
  );
}
