"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FocusEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { letterHtml } from "@/lib/email/premium";
import { emailContext } from "@/lib/email/context";
import { EMAIL_PHOTOS } from "@/lib/email/templates/photos";
import { resolveSigner } from "@/lib/email/templates/signer";
import {
  BLOCK_KINDS, GROUPS, PLACEHOLDERS, SERIES, SIGNER_CHOICES, UPLOADED, photoUrl, problems, renderTemplate, sampleValues,
  type BlockKind, type EmailTemplate, type SignerChoice, type TplBlock,
} from "@/lib/email/templates/types";
import { ANSWERS } from "@/lib/quotes/answerTypes";
import {
  deleteEmailTemplate, finishEmailPhotoUpload, resetEmailTemplate, restoreEmailVersion, saveEmailTemplate, sendEmailTest, startEmailPhotoUpload,
} from "@/app/portal/emails/actions";

/**
 * The editor for one customer email (Marketing › Customer emails): the words
 * on the left as blocks, the email on the right as the customer will see it,
 * filled in with Sarah's made-up details. Rendered by the same code that
 * sends it (lib/email/templates/types.ts › renderTemplate, then letterHtml),
 * so the preview can't drift from what goes.
 */

type Stored = EmailTemplate & { editedBy: string | null; editedAt: string | null };
type Version = { id: string; savedBy: string | null; savedAt: string; subject: string };
type Photo = { src: string; label: string; alt?: string; tall?: boolean; small?: boolean };
type Msg = { ok: boolean; text: string } | null;

/** A message that survives the editor being remounted with the saved copy after a save. */
let flash: Msg = null;

const thumbOf = (src: string) => (UPLOADED.test(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=384&q=60` : src);
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const same = (a: EmailTemplate, b: EmailTemplate) => JSON.stringify(a) === JSON.stringify(b);

function fresh(kind: BlockKind): TplBlock {
  const small = EMAIL_PHOTOS.filter((p) => p.small);
  switch (kind) {
    case "p": return { kind: "p", text: "" };
    case "list": return { kind: "list", items: [""] };
    case "photo": return { kind: "photo", src: EMAIL_PHOTOS[0].src, alt: EMAIL_PHOTOS[0].alt, ...(EMAIL_PHOTOS[0].tall ? { width: 300 } : {}) };
    case "thumbs": return { kind: "thumbs", items: small.slice(0, 2).map((p) => ({ src: p.src, alt: p.alt, caption: p.label })) };
    case "stats": return { kind: "stats", items: [{ value: "", label: "" }, { value: "", label: "" }] };
    case "answers": return { kind: "answers" };
  }
}

export function EmailTemplateEditor({ initial, versions, uploads, siblings, isNew }: {
  initial: Stored; versions: Version[]; uploads: Photo[]; siblings: EmailTemplate[]; isNew: boolean;
}) {
  const router = useRouter();
  const start: EmailTemplate = useMemo(() => {
    const { editedBy: _b, editedAt: _a, ...t } = initial;
    return t;
  }, [initial]);
  const [t, setT] = useState<EmailTemplate>(start);
  const [saved, setSaved] = useState<EmailTemplate>(start);
  const [msg, setMsg] = useState<Msg>(() => { const f = flash; flash = null; return f; });
  const [busy, run] = useTransition();
  const [phone, setPhone] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [picker, setPicker] = useState<null | { small: boolean; apply: (p: Photo) => void }>(null);
  const [photos, setPhotos] = useState<Photo[]>(uploads);
  const [origin, setOrigin] = useState("");
  const [focusNew, setFocusNew] = useState<number | null>(null);
  const active = useRef<{ el: HTMLInputElement | HTMLTextAreaElement; set: (v: string) => void } | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  const dirty = !same(t, saved);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (patch: Partial<EmailTemplate>) => { setT((x) => ({ ...x, ...patch })); setMsg(null); };
  const setBlock = (i: number, b: TplBlock) => set({ blocks: t.blocks.map((x, n) => (n === i ? b : x)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= t.blocks.length) return;
    const next = [...t.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set({ blocks: next });
  };
  const remove = (i: number) => set({ blocks: t.blocks.filter((_, n) => n !== i) });
  const add = (kind: BlockKind, at: number) => {
    const b = fresh(kind);
    const next = [...t.blocks.slice(0, at), b, ...t.blocks.slice(at)];
    set({ blocks: next });
    setInsertAt(null);
    setFocusNew(at);
    if (kind === "photo") setPicker({ small: false, apply: (p) => setT((x) => ({ ...x, blocks: x.blocks.map((y, n) => (n === at ? { kind: "photo", src: p.src, alt: p.alt ?? "", ...(p.tall ? { width: 300 } : {}) } : y)) })) });
  };

  /** Each text box says where a placeholder or bold should go when it's the one being typed in. */
  const reg = (setV: (v: string) => void) => ({ onFocus: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { active.current = { el: e.currentTarget, set: setV }; } });
  const insert = (wrap: [string, string]) => {
    const f = active.current;
    if (!f || !document.contains(f.el)) { setMsg({ ok: false, text: "Click into the words where it should go first." }); return; }
    const { el } = f;
    const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
    const v = el.value.slice(0, a) + wrap[0] + el.value.slice(a, b) + wrap[1] + el.value.slice(b);
    f.set(v);
    requestAnimationFrame(() => { el.focus(); const c = a + wrap[0].length + (b - a) + (wrap[1] ? wrap[1].length : 0); el.setSelectionRange(c, c); });
  };

  // The preview, a moment after typing stops, so it isn't redrawn on every key.
  const [shown, setShown] = useState(t);
  useEffect(() => { const h = setTimeout(() => setShown(t), 250); return () => clearTimeout(h); }, [t]);
  const preview = useMemo(() => {
    if (!origin) return null;
    const ctx = emailContext();
    const answers = shown.group === "followup" ? [
      { label: ANSWERS.yes.button, href: "#", primary: true }, { label: ANSWERS.question.button, href: "#" }, { label: ANSWERS.no.button, href: "#" },
    ] : undefined;
    const e = renderTemplate(shown, sampleValues(shown.group), { base: origin, answers });
    const html = letterHtml({ base: origin, footer: ctx.footer, preheader: e.preheader, blocks: e.blocks, signer: resolveSigner(shown.signer, "Jake Deppeler") });
    return { ...e, html };
  }, [shown, origin]);

  const issues = problems({ ...t, blocks: t.blocks }, siblings);
  const say = (r: { ok: boolean; error?: string; said?: string }, ok: string) => setMsg(r.ok ? { ok: true, text: r.said ?? ok } : { ok: false, text: r.error ?? "That didn't work." });

  const save = () => run(async () => {
    const r = await saveEmailTemplate(t.key, t);
    if (r.ok) { setSaved(t); flash = { ok: true, text: r.said ?? "Saved." }; router.refresh(); }
    say(r, "Saved.");
  });

  const kinds = BLOCK_KINDS.filter((k) => k.k !== "answers" || (t.group === "followup" && !t.blocks.some((b) => b.kind === "answers")));
  const addMenu = (at: number) => (
    <div className="em-addmenu" role="group" aria-label="Add a block">
      {kinds.map((k) => <button key={k.k} type="button" className="em-chip" title={k.what} onClick={() => add(k.k, at)}>+ {k.label}</button>)}
      {at < t.blocks.length && <button type="button" className="em-link" onClick={() => setInsertAt(null)}>Cancel</button>}
    </div>
  );

  const seriesLabel = t.series ? SERIES.find((s) => s.k === t.series)?.label : null;
  const dayTaken = t.group === "followup" && t.active && siblings.some((s) => s.key !== t.key && s.series === t.series && s.active && s.day === t.day);

  return (
    <div className="em-edit">
      <div className="pk-head">
        <div>
          <div className="pk-eyebrow">{seriesLabel ? `${GROUPS.followup.label} · ${seriesLabel}` : GROUPS[t.group].label}</div>
          <h1>{t.name || "Untitled"}</h1>
          <div className="pk-sub">
            {initial.editedAt ? `Edited by ${initial.editedBy ?? "someone"}, ${when(initial.editedAt)}` : t.builtIn ? "The standard wording" : "Added on this page"}
            {t.group === "followup" ? (t.active ? ` · goes ${t.day} day${t.day === 1 ? "" : "s"} after the quote` : " · switched off") : ` · ${GROUPS[t.group].when.toLowerCase()}`}
          </div>
        </div>
      </div>

      {isNew && !initial.editedAt && <div className="pt-note">A new email, switched off. Write it, give it a subject, send yourself a test, then switch it on and save.</div>}

      <div className="em-grid">
        <div className="em-form">
          <section className="pk-card pk-pad em-settings">
            <label className="pt-field">
              <span>Name <em>· what it&rsquo;s called on the list; customers don&rsquo;t see it</em></span>
              <input value={t.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
            </label>
            {t.group === "followup" && (
              <div className="em-row2">
                <label className="pt-field">
                  <span>Day <em>· after the quote</em></span>
                  <input type="number" min={1} max={60} value={t.day ?? ""} onChange={(e) => set({ day: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
                </label>
                <label className="em-switch">
                  <input type="checkbox" checked={t.active} onChange={(e) => set({ active: e.target.checked })} />
                  <span><b>{t.active ? "On" : "Off"}</b>{t.active ? "This one goes." : "Skipped: the series goes on without it."}</span>
                </label>
              </div>
            )}
            {dayTaken && <p className="em-warn">Another email in this series goes on day {t.day}. Pick another day.</p>}
            <label className="pt-field">
              <span>Signed by <em>· their name and photo go at the bottom</em></span>
              <select value={t.signer} onChange={(e) => set({ signer: e.target.value as SignerChoice })}>
                {SIGNER_CHOICES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
              </select>
            </label>
          </section>

          <section className="pk-card pk-pad">
            <div className="pk-card-h"><b>Subject</b></div>
            <label className="pt-field">
              <span>Subject line</span>
              <input value={t.subject} maxLength={200} placeholder="What it says in their inbox" onChange={(e) => set({ subject: e.target.value })} {...reg((v) => set({ subject: v }))} />
            </label>
            <label className="pt-field em-gap">
              <span>Preview text <em>· the grey line after the subject in most inboxes</em></span>
              <input value={t.preheader} maxLength={200} onChange={(e) => set({ preheader: e.target.value })} {...reg((v) => set({ preheader: v }))} />
            </label>
          </section>

          <section className="pk-card pk-pad em-body">
            <div className="pk-card-h"><b>The email</b><span>Top to bottom, as it reads</span></div>
            <div className="em-tools" role="toolbar" aria-label="Insert">
              <button type="button" className="em-chip em-chip--b" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(["**", "**"])} title="Make the selected words bold">B</button>
              {PLACEHOLDERS[t.group].map((p) => (
                <button key={p.key} type="button" className="em-chip" title={`${p.what}. In the preview: ${p.sample}`} onMouseDown={(e) => e.preventDefault()} onClick={() => insert([`{${p.key}}`, ""])}>{`{${p.key}}`}</button>
              ))}
            </div>
            <details className="em-help">
              <summary>What the words in braces become</summary>
              <ul>
                {PLACEHOLDERS[t.group].map((p) => <li key={p.key}><code>{`{${p.key}}`}</code> {p.what}.</li>)}
                <li>When we might not have it, put what to say instead after a bar: <code>{"{mobile|the number we have}"}</code>.</li>
                <li>A paragraph that&rsquo;s only an empty one, like <code>{"“{note}”"}</code> when they didn&rsquo;t type anything, is left out.</li>
              </ul>
            </details>

            <ol className="em-blocks">
              {t.blocks.map((b, i) => (
                <li key={i} className="em-block">
                  <div className="em-block__bar">
                    <span className="em-block__kind">{BLOCK_KINDS.find((k) => k.k === b.kind)?.label}</span>
                    <span className="em-block__acts">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                      <button type="button" aria-label="Move down" disabled={i === t.blocks.length - 1} onClick={() => move(i, 1)}>↓</button>
                      <button type="button" aria-label="Add a block under this one" onClick={() => setInsertAt(insertAt === i + 1 ? null : i + 1)}>+</button>
                      <button type="button" aria-label="Remove" className="em-x" onClick={() => remove(i)}>✕</button>
                    </span>
                  </div>
                  <BlockBody b={b} onChange={(nb) => setBlock(i, nb)} reg={reg} autoFocus={focusNew === i} openPicker={(small, apply) => setPicker({ small, apply })} />
                  {insertAt === i + 1 && addMenu(i + 1)}
                </li>
              ))}
            </ol>
            <div className="em-addend">
              <span>Add to the end:</span>
              {addMenu(t.blocks.length)}
            </div>
          </section>

          {versions.length > 0 && (
            <section className="pk-card pk-pad">
              <details>
                <summary className="em-hist-h"><b>Earlier versions</b> <span>{versions.length}, newest first</span></summary>
                <ul className="em-hist">
                  {versions.map((v) => (
                    <li key={v.id}>
                      <span><b>{when(v.savedAt)}</b>{v.savedBy ? ` · replaced by ${v.savedBy}` : ""}<br /><em>{v.subject || "No subject"}</em></span>
                      <button type="button" className="pt-btn pt-btn--ghost" disabled={busy} onClick={() => {
                        if (dirty && !confirm("You've got changes that aren't saved. Put this version back anyway?")) return;
                        run(async () => { const r = await restoreEmailVersion(t.key, v.id); if (r.ok) { flash = { ok: true, text: r.said ?? "Put back." }; router.refresh(); } say(r, "Put back."); });
                      }}>Put this one back</button>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}
        </div>

        <div className="em-preview">
          <div className="em-preview__bar">
            <b>Preview</b>
            <div className="pk-seg" role="group" aria-label="Screen">
              <button type="button" className={phone ? "" : "on"} onClick={() => setPhone(false)}>Computer</button>
              <button type="button" className={phone ? "on" : ""} onClick={() => setPhone(true)}>Phone</button>
            </div>
          </div>
          <div className="em-inbox">
            <span className="em-inbox__from">Advanced Gas &amp; Aircon</span>
            <span className="em-inbox__subj">{preview?.subject || <i>No subject yet</i>}</span>
            <span className="em-inbox__pre">{preview?.preheader}</span>
          </div>
          <div className={`em-frame${phone ? " em-frame--phone" : ""}`}>
            {preview ? <Frame html={preview.html} /> : <div className="em-frame__wait">Loading the preview…</div>}
          </div>
          <p className="em-preview__note">Filled in with Sarah&rsquo;s made-up details. The buttons don&rsquo;t go anywhere here; in a test they do.</p>
        </div>
      </div>

      <div className="em-bar">
        <div className="em-bar__in">
          <button type="button" className="pt-btn pt-btn--orange" disabled={busy || !dirty} onClick={save}>{busy ? "Working…" : dirty ? "Save" : "Saved"}</button>
          <button type="button" className="pt-btn" disabled={busy} onClick={() => run(async () => say(await sendEmailTest(t.key, t), "Test sent."))}>Send me a test</button>
          {t.builtIn && initial.editedAt && (
            <button type="button" className="pt-btn pt-btn--ghost" disabled={busy} onClick={() => {
              if (!confirm("Put back the standard wording? Your version is kept under Earlier versions.")) return;
              run(async () => { const r = await resetEmailTemplate(t.key); if (r.ok) { flash = { ok: true, text: r.said ?? "Back to the standard wording." }; router.refresh(); } say(r, "Back to the standard wording."); });
            }}>Back to the standard wording</button>
          )}
          {!t.builtIn && (
            <button type="button" className="pt-btn pt-btn--ghost em-del" disabled={busy} onClick={() => {
              if (!confirm("Delete this email? It comes out of the series.")) return;
              run(async () => { const r = await deleteEmailTemplate(t.key); if (r && !r.ok) say(r, ""); });
            }}>Delete</button>
          )}
          {dirty && !msg && <span className="em-bar__dirty">Not saved yet</span>}
          {msg && <span role="status" className={msg.ok ? "em-ok" : "em-err"}>{msg.text}</span>}
        </div>
        {issues.length > 0 && <ul className="em-issues">{issues.map((x) => <li key={x}>{x}</li>)}</ul>}
      </div>

      {picker && (
        <PhotoPicker
          photos={[...photos, ...EMAIL_PHOTOS]}
          small={picker.small}
          onClose={() => setPicker(null)}
          onPick={(p) => { picker.apply(p); setPicker(null); setMsg(null); }}
          onUploaded={(p) => setPhotos((xs) => [p, ...xs])}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- the blocks */

type Reg = (setV: (v: string) => void) => { onFocus: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void };

function BlockBody({ b, onChange, reg, autoFocus, openPicker }: {
  b: TplBlock; onChange: (b: TplBlock) => void; reg: Reg; autoFocus: boolean; openPicker: (small: boolean, apply: (p: Photo) => void) => void;
}): ReactNode {
  const rows = (s: string) => Math.min(14, Math.max(2, Math.ceil(s.length / 70) + (s.match(/\n/g)?.length ?? 0)));
  switch (b.kind) {
    case "p":
      return <textarea className="em-text" aria-label="Paragraph" rows={rows(b.text)} value={b.text} autoFocus={autoFocus} placeholder="Write here. **Bold** with two stars either side." onChange={(e) => onChange({ ...b, text: e.target.value })} {...reg((v) => onChange({ ...b, text: v }))} />;
    case "list": {
      const v = b.items.join("\n");
      return <textarea className="em-text" aria-label="Bullet list, one point per line" rows={Math.max(3, rows(v))} value={v} autoFocus={autoFocus} placeholder="One point per line" onChange={(e) => onChange({ ...b, items: e.target.value.split("\n") })} {...reg((nv) => onChange({ ...b, items: nv.split("\n") }))} />;
    }
    case "photo":
      return (
        <div className="em-photo">
          <button type="button" className="em-photo__pick" onClick={() => openPicker(false, (p) => onChange({ kind: "photo", src: p.src, alt: b.alt && b.alt !== EMAIL_PHOTOS.find((x) => x.src === b.src)?.alt ? b.alt : p.alt ?? "", ...(p.tall ? { width: 300 } : {}) }))}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbOf(b.src)} alt="" />
            <span>Change photo</span>
          </button>
          <div className="em-photo__f">
            <label className="pt-field">
              <span>Describe it <em>· shown when their email hides pictures</em></span>
              <input value={b.alt} maxLength={200} onChange={(e) => onChange({ ...b, alt: e.target.value })} />
            </label>
            <label className="pt-field">
              <span>Size</span>
              <select value={b.width ? "narrow" : "full"} onChange={(e) => onChange(e.target.value === "narrow" ? { ...b, width: 300 } : { kind: "photo", src: b.src, alt: b.alt })}>
                <option value="full">Across the email</option>
                <option value="narrow">Narrower, for a tall photo</option>
              </select>
            </label>
          </div>
        </div>
      );
    case "thumbs":
      return (
        <div className="em-thumbs">
          {b.items.map((it, n) => (
            <div key={n} className="em-thumb">
              <button type="button" className="em-photo__pick" onClick={() => openPicker(true, (p) => onChange({ ...b, items: b.items.map((x, m) => (m === n ? { src: p.src, alt: p.alt ?? "", caption: x.caption && x.caption !== EMAIL_PHOTOS.find((y) => y.src === x.src)?.label ? x.caption : p.label } : x)) }))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbOf(it.src)} alt="" />
                <span>Change</span>
              </button>
              <input aria-label="Name under the photo" value={it.caption} maxLength={60} onChange={(e) => onChange({ ...b, items: b.items.map((x, m) => (m === n ? { ...x, caption: e.target.value } : x)) })} {...reg((v) => onChange({ ...b, items: b.items.map((x, m) => (m === n ? { ...x, caption: v } : x)) }))} />
              {b.items.length > 1 && <button type="button" className="em-link" onClick={() => onChange({ ...b, items: b.items.filter((_, m) => m !== n) })}>Remove</button>}
            </div>
          ))}
          {b.items.length < 3 && (
            <button type="button" className="em-thumb em-thumb--add" onClick={() => openPicker(true, (p) => onChange({ ...b, items: [...b.items, { src: p.src, alt: p.alt ?? "", caption: p.label }] }))}>+ Add a photo</button>
          )}
        </div>
      );
    case "stats":
      return (
        <div className="em-stats">
          {b.items.map((it, n) => (
            <div key={n} className="em-stat">
              <input aria-label="Figure" className="em-stat__v" placeholder="$400–$900" value={it.value} maxLength={24} autoFocus={autoFocus && n === 0} onChange={(e) => onChange({ ...b, items: b.items.map((x, m) => (m === n ? { ...x, value: e.target.value } : x)) })} {...reg((v) => onChange({ ...b, items: b.items.map((x, m) => (m === n ? { ...x, value: v } : x)) }))} />
              <input aria-label="What it means" placeholder="saved a year, swapping from gas" value={it.label} maxLength={140} onChange={(e) => onChange({ ...b, items: b.items.map((x, m) => (m === n ? { ...x, label: e.target.value } : x)) })} {...reg((v) => onChange({ ...b, items: b.items.map((x, m) => (m === n ? { ...x, label: v } : x)) }))} />
              {b.items.length > 1 && <button type="button" className="em-x" aria-label="Remove this figure" onClick={() => onChange({ ...b, items: b.items.filter((_, m) => m !== n) })}>✕</button>}
            </div>
          ))}
          {b.items.length < 4 && <button type="button" className="em-link" onClick={() => onChange({ ...b, items: [...b.items, { value: "", label: "" }] })}>+ Add a figure</button>}
          <label className="pt-field em-gap">
            <span>Small print under them <em>· optional</em></span>
            <input value={b.note ?? ""} maxLength={300} onChange={(e) => onChange({ ...b, note: e.target.value })} {...reg((v) => onChange({ ...b, note: v }))} />
          </label>
        </div>
      );
    case "answers":
      return (
        <div className="em-answers">
          <span className="em-fake on">{ANSWERS.yes.button}</span><span className="em-fake">{ANSWERS.question.button}</span><span className="em-fake">{ANSWERS.no.button}</span>
          <p>Each opens a page to confirm. Then you get their message, and they get the reply for that button.</p>
        </div>
      );
  }
}

/* ------------------------------------------------------------- the preview */

function Frame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const ro = useRef<ResizeObserver | null>(null);
  const [h, setH] = useState(600);
  useEffect(() => () => ro.current?.disconnect(), []);
  return (
    <iframe
      ref={ref}
      title="The email as the customer sees it"
      srcDoc={html}
      sandbox="allow-same-origin"
      style={{ height: h }}
      onLoad={() => {
        const doc = ref.current?.contentDocument;
        if (!doc) return;
        ro.current?.disconnect();
        const fit = () => setH(Math.max(300, doc.documentElement.scrollHeight + 4));
        fit();
        ro.current = new ResizeObserver(fit);
        ro.current.observe(doc.body);
      }}
    />
  );
}

/* ------------------------------------------------------------- the photos */

function PhotoPicker({ photos, small, onClose, onPick, onUploaded }: {
  photos: Photo[]; small: boolean; onClose: () => void; onPick: (p: Photo) => void; onUploaded: (p: Photo) => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const upload = async (f: File) => {
    setErr(null);
    setBusy(true);
    try {
      const s = await startEmailPhotoUpload({ type: f.type, size: f.size });
      if (!s.ok || !s.url || !s.path) { setErr(s.error ?? "Couldn't start the upload."); return; }
      const body = new FormData();
      body.append("cacheControl", "31536000");
      body.append("", f);
      const res = await fetch(s.url, { method: "PUT", body, headers: { "x-upsert": "true" } });
      if (!res.ok) { setErr(`It didn't upload (${res.status}). Try it again.`); return; }
      const label = f.name.replace(/\.[^.]+$/, "");
      const r = await finishEmailPhotoUpload({ path: s.path, label });
      if (!r.ok || !r.src) { setErr(r.error ?? "Couldn't save it."); return; }
      const p = { src: r.src, label, alt: "" };
      onUploaded(p);
      onPick(p);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  const sorted = small ? [...photos.filter((p) => p.small || UPLOADED.test(p.src)), ...photos.filter((p) => !p.small && !UPLOADED.test(p.src))] : photos;
  return (
    <div className="em-modal" role="dialog" aria-modal="true" aria-label="Pick a photo" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="em-modal__in">
        <div className="em-modal__h">
          <b>Pick a photo</b>
          <span>
            <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
            <button type="button" className="pt-btn pt-btn--orange" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Uploading…" : "Upload a photo"}</button>
            <button type="button" className="pt-btn pt-btn--ghost" onClick={onClose}>Close</button>
          </span>
        </div>
        {err && <p className="em-err">{err}</p>}
        <p className="em-modal__note">Our own installs and the products we push. An uploaded photo goes out at email size, whatever came off the phone. JPG, PNG or WebP, up to 15MB.</p>
        <div className="em-pgrid">
          {sorted.map((p) => (
            <button key={p.src} type="button" className="em-pcell" onClick={() => onPick(p)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbOf(p.src)} alt="" loading="lazy" />
              <span>{p.label}{UPLOADED.test(p.src) ? " · uploaded" : ""}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
