"use client";

import { useState, useTransition } from "react";
import { changeRecipient } from "@/app/portal/journals/actions";

/** Who gets the "didn't sync to Xero" emails: the list, a remove on each, and an add. */
export function JournalRecipients({ initial }: { initial: string[] }) {
  const [emails, setEmails] = useState(initial);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function change(e: string, add: boolean) {
    start(async () => {
      const res = await changeRecipient({ email: e, add });
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setEmails(res.emails ?? emails);
      if (add) setEmail("");
      setMsg({ ok: true, text: add ? `${e.trim()} will get the emails.` : `${e} won't get them any more.` });
    });
  }

  return (
    <div className="pt-jrn__who">
      {emails.length === 0 ? (
        <p className="pt-inline is-err">Nobody is on the list, so a failed journal entry shows on the board and here but isn&rsquo;t emailed.</p>
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
          <input id="journal-alert-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="name@advancedgas.com.au" />
        </label>
        <button type="submit" className="pt-btn pt-btn--orange" disabled={pending || !email.trim()}>{pending ? "Saving…" : "Add"}</button>
      </form>
      {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}
    </div>
  );
}
