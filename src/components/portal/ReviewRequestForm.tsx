"use client";

import { useState, useTransition } from "react";
import { saveReviewSettingsAction, sendReviewTestAction } from "@/app/portal/marketing/actions";
import { DEFAULT_REVIEW_BODY, DEFAULT_REVIEW_SUBJECT, REVIEW_PLACEHOLDERS, type ReviewSettings } from "@/lib/reviews/requestTypes";
import { SIGNERS, signerKey } from "@/lib/email/team";

/**
 * The review email's settings: on or off, where the button goes, and the
 * words. Off until someone switches it on with a link, so nothing goes to a
 * customer before the office has seen it and sent itself a test.
 */
export function ReviewRequestForm({ initial, canEdit, linkFromPlaceId }: { initial: ReviewSettings; canEdit: boolean; linkFromPlaceId: boolean }) {
  const [s, setS] = useState<ReviewSettings>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const set = <K extends keyof ReviewSettings>(k: K, v: ReviewSettings[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setMsg(null);
  };

  return (
    <form
      className="ch-settings"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveReviewSettingsAction(s);
          setMsg(r.ok ? { ok: true, text: s.on ? "Saved. Review emails go out from the next run." : "Saved. It's off, so nothing is sent." } : { ok: false, text: r.error ?? "Couldn't save." });
        });
      }}
    >
      <label className="ch-switch">
        <input type="checkbox" checked={s.on} disabled={!canEdit} onChange={(e) => set("on", e.target.checked)} />
        <span>
          <strong>Email customers for a Google review</strong>
          <em>
            The day after a household job is finished and paid, between 9am and 7pm Monday to Saturday. Not real estate, retirement village,
            commercial or warranty jobs, and nobody more than once a year. Replies come to admin@. A job tagged Problem, or with a call-back
            booked, waits until that&rsquo;s sorted (21 days at most): everyone is asked, because Google and consumer law don&rsquo;t allow
            asking only the happy ones.
          </em>
        </span>
      </label>

      <label className="pt-field">
        <span>
          Google review link <em>· from your Google Business Profile: Ask for reviews, then copy the link</em>
        </span>
        <input type="url" value={s.link} disabled={!canEdit} maxLength={500} placeholder={linkFromPlaceId ? "Using the review link built from the saved place ID" : "https://g.page/r/…/review"} onChange={(e) => set("link", e.target.value.trim())} />
      </label>

      <label className="pt-field">
        <span>
          Signed by <em>· their name and photo go at the bottom; the tech who did the job is shown near the top</em>
        </span>
        <select value={s.signer} disabled={!canEdit} onChange={(e) => set("signer", signerKey(e.target.value))}>
          {(Object.keys(SIGNERS) as (keyof typeof SIGNERS)[]).map((k) => (
            <option key={k} value={k}>
              {SIGNERS[k].label}
            </option>
          ))}
        </select>
      </label>

      <label className="pt-field">
        <span>Subject</span>
        <input type="text" value={s.subject} disabled={!canEdit} maxLength={200} onChange={(e) => set("subject", e.target.value)} />
      </label>

      <label className="pt-field">
        <span>
          The email <em>· {REVIEW_PLACEHOLDERS.map((p) => `{${p}}`).join(" ")} are filled in from the job</em>
        </span>
        <textarea rows={13} value={s.body} disabled={!canEdit} maxLength={4000} onChange={(e) => set("body", e.target.value)} />
        <small className="ch-hint">
          {"{first}"} is their first name, {"{tech}"} who did the job, {"{job}"} what it was (&ldquo;split system service&rdquo;), {"{suburb}"} where,
          and {"{button}"} the &ldquo;Leave a Google review&rdquo; button, on a line of its own.
        </small>
      </label>

      {canEdit && (
        <div className="ch-settings__save">
          <button type="submit" className="pt-btn pt-btn--orange" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="pt-btn"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await sendReviewTestAction(s);
                setMsg(r.ok ? { ok: true, text: "Test sent to your email." } : { ok: false, text: r.error ?? "Couldn't send the test." });
              })
            }
          >
            Send me a test
          </button>
          <button
            type="button"
            className="pt-btn"
            disabled={busy}
            onClick={() => {
              set("subject", DEFAULT_REVIEW_SUBJECT);
              set("body", DEFAULT_REVIEW_BODY);
            }}
          >
            Back to the standard wording
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
