"use client";

import { useState, useTransition } from "react";

type Change = (input: { email: string; add: boolean }) => Promise<{ ok: boolean; error?: string; emails?: string[] }>;

/**
 * Who gets an email the portal sends: the list, a remove on each, and an add.
 * The saving is the page's own server action, handed in, so the journal
 * alerts and the reports keep separate lists with one way of editing them.
 */
export function EmailListEditor({ initial, change: save, empty, id }: {
  initial: string[];
  change: Change;
  /** Said when nobody is on the list: what that means for this list. */
  empty: string;
  /** For the add box's id, so two lists on one page don't share one. */
  id: string;
}) {
  const [emails, setEmails] = useState(initial);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function change(e: string, add: boolean) {
    start(async () => {
      const res = await save({ email: e, add });
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setEmails(res.emails ?? emails);
      if (add) setEmail("");
      setMsg({ ok: true, text: add ? `${e.trim()} will get the emails.` : `${e} won't get them any more.` });
    });
  }

  return (
    <div className="pt-jrn__who">
      {emails.length === 0 ? (
        <p className="pt-inline is-err">{empty}</p>
      ) : (
        <ul className="pt-jrn__list">
          {emails.map((e) => (
            <li key={e}>
              <span>{e}</span>
              <button type="button" className="pt-btn pt-btn--sm pt-btn--ghost" disabled={pending} onClick={() => change(e, false)} aria-label={`Take ${e} off the list`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="pt-jrn__add"
        onSubmit={(ev) => { ev.preventDefault(); if (email.trim()) change(email, true); }}
      >
        <label className="pt-field">
          <span>Add someone</span>
          <input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="name@advancedgas.com.au" />
        </label>
        <button type="submit" className="pt-btn pt-btn--orange" disabled={pending || !email.trim()}>{pending ? "Saving…" : "Add"}</button>
      </form>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
    </div>
  );
}
