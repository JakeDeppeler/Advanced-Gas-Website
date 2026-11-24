"use client";

import { useState, useTransition } from "react";
import { saveEmailFilingAction } from "@/app/portal/email-filing/actions";
import { DEFAULT_PROTECTED, NOTIFICATIONS_FOLDER, type FilingMode } from "@/lib/outlook/filingTypes";

export type FilingFormValues = { mode: FilingMode; fileAfterReply: boolean; words: string; never: string[] };

const MODES: { k: FilingMode; label: string; what: string }[] = [
  { k: "off", label: "Off", what: "Nothing is read or moved." },
  { k: "trial", label: "Trial", what: "Works out where each email would go and lists it below. Nothing is moved." },
  { k: "on", label: "On", what: "Emails that need nothing are moved into their folder as they're dealt with. Nothing is ever deleted." },
];

export function EmailFilingForm({ initial, folders, canEdit }: { initial: FilingFormValues; folders: string[]; canEdit: boolean }) {
  const [s, setS] = useState<FilingFormValues>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const set = <K extends keyof FilingFormValues>(k: K, v: FilingFormValues[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setMsg(null);
  };
  // Folders saved on the never list that aren't there any more still show, so they can be taken off.
  const choices = [...new Set([...folders, ...s.never])].sort((a, b) => a.localeCompare(b));

  return (
    <form
      className="ch-settings"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveEmailFilingAction(s);
          setMsg(r.ok ? { ok: true, text: "Saved. The next run, within ten minutes, uses it." } : { ok: false, text: r.error ?? "Couldn't save." });
        });
      }}
    >
      <fieldset className="ef-modes" disabled={!canEdit}>
        <legend>Filing admin@</legend>
        {MODES.map((m) => (
          <label key={m.k} className="ch-switch">
            <input type="radio" name="mode" value={m.k} checked={s.mode === m.k} onChange={() => set("mode", m.k)} />
            <span>
              <strong>{m.label}</strong>
              <em>{m.what}</em>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="ch-switch">
        <input type="checkbox" checked={s.fileAfterReply} disabled={!canEdit} onChange={(e) => set("fileAfterReply", e.target.checked)} />
        <span>
          <strong>File an email once its reply has gone out</strong>
          <em>
            Then the Inbox empties as the work gets done. Off: only emails that never needed a reply are filed, and replied ones stay where they are.
          </em>
        </span>
      </label>

      <label className="pt-field">
        <span>
          Flagged words <em>· one per line</em>
        </span>
        <textarea rows={10} value={s.words} disabled={!canEdit} maxLength={6000} onChange={(e) => set("words", e.target.value)} />
        <small className="ch-hint">
          An email with any of these in its subject or its own words is never moved, whatever else is true. Matched from the start of a word in any
          case, so &ldquo;complain&rdquo; also catches &ldquo;complained&rdquo;. Use phrases rather than single words like &ldquo;legal&rdquo; or
          &ldquo;damage&rdquo;: they&rsquo;re in most agencies&rsquo; email disclaimers, and would keep everything in the Inbox.
        </small>
      </label>

      <fieldset className="ef-never" disabled={!canEdit}>
        <legend>Never filed into</legend>
        <small className="ch-hint">
          Nothing is ever moved into these, or into a folder inside them, and they aren&rsquo;t read to learn from. {NOTIFICATIONS_FOLDER} is made the
          first time a notification is filed, if there isn&rsquo;t one.
        </small>
        {choices.length ? (
          <div className="ef-never__grid">
            {choices.map((f) => (
              <label key={f}>
                <input
                  type="checkbox"
                  checked={s.never.some((n) => n.toLowerCase() === f.toLowerCase())}
                  onChange={(e) => set("never", e.target.checked ? [...s.never, f] : s.never.filter((n) => n.toLowerCase() !== f.toLowerCase()))}
                />
                <span>{f}</span>
              </label>
            ))}
          </div>
        ) : (
          <small className="ch-hint">The folders show here once they&rsquo;ve been read, on the first run after switching to Trial.</small>
        )}
      </fieldset>

      {canEdit && (
        <div className="ch-settings__save">
          <button type="submit" className="pt-btn pt-btn--orange" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="pt-btn" disabled={busy} onClick={() => set("words", DEFAULT_PROTECTED.join("\n"))}>
            Back to the standard flagged words
          </button>
          {msg && (
            <span role="status" className={msg.ok ? "ch-reply__done" : "ch-reply__err"}>
              {msg.text}
            </span>
          )}
        </div>
      )}
    </form>
  );
}
