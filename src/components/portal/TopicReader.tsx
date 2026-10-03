"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTopic } from "@/app/portal/handbook/actions";
import { parseProse, readingMinutes } from "@/lib/portal/prose";

/**
 * One handbook topic, read — and written, if you're allowed to.
 *
 * The reading view and the editor are the same component because they have to
 * agree: what the editor previews is what the page renders, parsed by the same
 * function. A separate preview is a second renderer and it drifts.
 */
export function TopicReader({
  shelf, shelfTitle, title, note, status, gap, body, updatedBy, updatedAt, canEdit, footer,
}: {
  /** Previous / next, drawn at the foot of the article as the design has it. */
  footer?: React.ReactNode;
  shelf: string;
  shelfTitle: string;
  title: string;
  note?: string;
  status: "have" | "write";
  gap?: string;
  body: string;
  updatedBy: string | null;
  updatedAt: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [msg, setMsg] = useState("");

  const blocks = parseProse(body);
  const written = body.trim().length > 0;

  function save() {
    setMsg("");
    start(async () => {
      const res = await saveTopic({ shelf, title, body: draft });
      if (!res.ok) { setMsg(res.error || "Couldn't save."); return; }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <article className="pt-panel pt-topic">
      <div className="pt-topic__crumb">Handbook · {shelf} · {shelfTitle}</div>
      <h1 className="pt-topic__h">{title}</h1>

      <div className="pt-topic__meta">
        <span className={`pt-chip ${written ? "is-ready" : status === "have" ? "is-have" : "is-write"}`}>
          {written ? "Ready" : status === "have" ? "Written, not loaded in" : "Still to write"}
        </span>
        {written && <span className="pt-topic__mins">{readingMinutes(body)} min read</span>}
        {updatedAt && (
          <span className="pt-topic__mins">
            Updated {new Date(updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            {updatedBy ? ` by ${updatedBy}` : ""}
          </span>
        )}
        {canEdit && !editing && (
          <button type="button" className="pt-btn pt-topic__edit" onClick={() => { setDraft(body); setEditing(true); }}>
            {written ? "Edit" : "Write it"}
          </button>
        )}
      </div>

      {note && !editing && <p className="pt-topic__note">{note}</p>}

      {editing ? (
        <>
          <textarea
            className="pt-topic__ta"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={20}
            placeholder={"Write the topic here.\n\nA blank line starts a new paragraph.\n\n## A heading looks like this\n\n- And a bullet looks like this"}
          />
          <p className="pt-topic__help">
            Blank line for a new paragraph, <code>## </code> for a heading, <code>- </code> for a bullet. That is the
            whole of it.
          </p>
          {msg && <div className="pt-note pt-note--warn">{msg}</div>}
          <div className="pt-topic__acts">
            <button type="button" className="pt-btn" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="pt-btn pt-btn--orange" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      ) : written ? (
        <div className="pt-prose">
          {blocks.map((b, i) =>
            b.kind === "h" ? <h2 key={i}>{b.text}</h2>
            : b.kind === "ul" ? <ul key={i}>{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
            : <p key={i}>{b.text}</p>,
          )}
        </div>
      ) : (
        <div className="pt-topic__empty">
          {status === "have" ? (
            <>
              <strong>This one is written — it just isn&rsquo;t in here yet.</strong>
              <span>
                It exists as a document somewhere. {canEdit ? "Paste it in and it is in the portal for good." : "Ask an admin to load it in."}
              </span>
            </>
          ) : (
            <>
              <strong>Still to write</strong>
              <span>{gap ? gap : "This topic is on the list. Until it’s written, ask Jake or Dean."}</span>
              {canEdit && !editing && (
                <button type="button" className="pt-btn pt-btn--navy" onClick={() => { setDraft(body); setEditing(true); }}>Write this topic</button>
              )}
            </>
          )}
        </div>
      )}
      {footer && <div className="pt-topic__foot">{footer}</div>}
    </article>
  );
}
