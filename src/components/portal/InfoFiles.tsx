"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeInfoFile, uploadInfoFile } from "@/app/portal/information/actions";

export type InfoFileView = { id: string; label: string; mime: string; bytes: number; at: string };

const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" });

/**
 * The documents under a card (the public liability certificate under Public
 * liability), or the page's own Documents when `card` is null: each opens in
 * a new tab or saves, and the owner can add a PDF or a photo, or take one off.
 */
export function InfoFiles({ slug, card, files, canEdit }: { slug: string; card: string | null; files: InfoFileView[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [label, setLabel] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const key = (card ?? "docs").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const href = (id: string, dl = false) => `/api/portal/info-file?slug=${encodeURIComponent(slug)}&id=${id}${dl ? "&dl=1" : ""}`;

  const send = (file: File) => start(async () => {
    setMsg(null);
    const form = new FormData();
    form.set("slug", slug);
    form.set("file", file);
    if (card) form.set("card", card);
    if (label.trim()) form.set("label", label.trim());
    const r = await uploadInfoFile(form);
    setMsg(r.ok ? { ok: true, text: `Added ${file.name}.` } : { ok: false, text: r.error ?? "Couldn't add it." });
    if (r.ok) { setLabel(""); router.refresh(); }
    if (input.current) input.current.value = "";
  });

  if (!files.length && !canEdit) return null;
  return (
    <div className={`pt-ifiles${card ? "" : " is-docs"}`}>
      {files.length > 0 && (
        <ul>
          {files.map((f) => (
            <li key={f.id}>
              <span className={`pt-ifiles__kind${f.mime === "application/pdf" ? "" : " is-img"}`} aria-hidden="true">{f.mime === "application/pdf" ? "PDF" : "IMG"}</span>
              <a className="pt-ifiles__name" href={href(f.id)} target="_blank" rel="noreferrer">{f.label}</a>
              <span className="pt-ifiles__meta">{size(f.bytes)} · added {day(f.at)}</span>
              <span className="pt-ifiles__acts">
                <a href={href(f.id)} target="_blank" rel="noreferrer" aria-label={`View ${f.label}`}>View</a>
                <a href={href(f.id, true)} aria-label={`Download ${f.label}`}>Download</a>
                {canEdit && (
                  <button type="button" disabled={busy} aria-label={`Take ${f.label} off`}
                    onClick={() => { if (confirm(`Take "${f.label}" off this page?`)) start(async () => { const r = await removeInfoFile(slug, f.id); setMsg(r.ok ? { ok: true, text: "Taken off." } : { ok: false, text: r.error ?? "Couldn't." }); router.refresh(); }); }}>
                    ×
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="pt-ifiles__add">
          {!card && <input id={`if-label-${key}`} className="pt-ifiles__label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What it is, e.g. WorkCover certificate 2026/27" aria-label="What the document is" maxLength={120} />}
          <button type="button" className="pt-ifiles__pick" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Adding…" : card ? "+ Add a PDF or photo" : "+ Add a document"}
          </button>
          <input ref={input} id={`if-file-${key}`} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden disabled={busy} aria-label={card ? `Add a PDF or photo to ${card}` : "Add a document"}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); }} />
        </div>
      )}
      {msg && <p className={`pt-ifiles__msg${msg.ok ? "" : " is-bad"}`} role="status">{msg.text}</p>}
    </div>
  );
}
