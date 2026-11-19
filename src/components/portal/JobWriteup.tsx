"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/portal/kit/Kit";
import { money2 } from "@/lib/portal/format";
import { ROLE_WORD, type Role } from "@/lib/jobwrite/lines";
import { putWriteup, saveJobNotes, undoJobWriteup, writeJobWords } from "@/app/portal/jobs/write-up/actions";

export type DocView = {
  kind: "estimate" | "invoice";
  id: number;
  name: string | null;
  status: string | null;
  /** On it now, a block of text a paragraph. */
  summary: string;
  /** The main labour line's words now, and what it's called. */
  labour: string;
  labourName: string | null;
  lines: Array<{ id: number; name: string; code: string; role: Role; qty: number; total: number; newTotal: number; merged: boolean; target: boolean }>;
  combined: number;
  parts: { labour: number; materials: number; electrical: number };
  before: number;
  after: number;
  changes: number;
  blockers: string[];
  hasTarget: boolean;
};

export type HistoryRow = { id: string; doc_kind: "estimate" | "invoice"; status: string; note: string | null; created_by: string | null; created_at: string };

type Msg = { ok: boolean; text: string } | null;
type Kind = "estimate" | "invoice";
type Draft = { summary: string; labour: string };

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
const STATUS_WORD: Record<string, { k: "good" | "mid" | "bad" | "none"; w: string }> = {
  done: { k: "good", w: "Put on" },
  undone: { k: "none", w: "Undone" },
  restored: { k: "mid", w: "Put back" },
  failed: { k: "bad", w: "Check it" },
  started: { k: "mid", w: "Didn't finish" },
};
const DOC_WORD: Record<Kind, string> = { estimate: "quote", invoice: "invoice" };
const rows = (text: string, min: number) => Math.max(min, text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 78)), 0) + 1);

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="jw-copy" disabled={!text.trim()} onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => undefined);
    }}>{done ? "Copied" : "Copy"}</button>
  );
}

/** The lines and where each one's price goes under one price. */
function PlanTable({ d }: { d: DocView }) {
  const shown = d.lines.filter((l) => l.qty !== 0 || l.total !== 0);
  return (
    <div className="pk-tbl-wrap">
      <table className="pk-tbl jw-plan">
        <thead><tr><th scope="col">Line</th><th scope="col">What it is</th><th scope="col">Now</th><th scope="col">One price</th></tr></thead>
        <tbody>
          {shown.map((l) => (
            <tr key={l.id} className={l.target ? "jw-target" : l.merged ? "jw-merged" : undefined}>
              <td><span className="jw-ln">{qty(l.qty)} × {l.name}</span>{l.code && l.code !== l.name ? <span className="jw-code">{l.code}</span> : null}</td>
              <td>{l.target ? "Carries the one price" : l.merged ? `${ROLE_WORD[l.role]}, in the one price` : ROLE_WORD[l.role]}</td>
              <td>{money2(l.total)}</td>
              <td><b>{money2(l.newTotal)}</b></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><th scope="row" colSpan={2}>Total before GST</th><td>{money2(d.before)}</td><td><b>{money2(d.after)}</b></td></tr></tfoot>
      </table>
    </div>
  );
}

/** "Labour $8,370 + materials $611 + electrical $1,000 = $9,981", the parts that are there. */
function OnePriceSum({ d }: { d: DocView }) {
  if (!d.hasTarget || d.blockers.length) return <p className="jw-sum jw-quiet">{d.blockers.length ? `One price can't be done on this ${DOC_WORD[d.kind]}: ${d.blockers.join(" ")}` : "No labour line to carry one price."}</p>;
  const parts = [["Labour", d.parts.labour], ["materials", d.parts.materials], ["electrical", d.parts.electrical]].filter(([, v]) => (v as number) !== 0) as [string, number][];
  return (
    <p className="jw-sum">
      {parts.map(([w, v], i) => <span key={w}>{i ? " + " : ""}{i ? w : w.charAt(0).toUpperCase() + w.slice(1)} {money2(v)}</span>)}
      {" = "}<b>{money2(d.combined)}</b>{d.changes === 0 ? " (already one price)" : ""}
    </p>
  );
}

type Stage = "now" | "new" | "put";
/** Where the words in a box stand, written on the tag so it isn't only a colour. */
const STAGE_TAG: Record<Stage, (doc: string) => { cls: string; w: string }> = {
  now: (doc) => ({ cls: "", w: `On the ${doc} now` }),
  new: () => ({ cls: "mid", w: "New, not put on yet" }),
  put: (doc) => ({ cls: "good", w: `Put on the ${doc}` }),
};

const Tick = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function JobWriteup({ job, heading, quotes, quote, invoice, start, notes: savedNotes, notesBy, history }: {
  job: string;
  heading: { number: string | null; type: string | null; customer: string | null; read: string[]; missing: string[] };
  quotes: Array<{ id: number; name: string | null; status: string | null }>;
  quote: DocView | null;
  invoice: DocView | null;
  start: Kind;
  notes: string;
  notesBy: { by: string; at: string } | null;
  history: HistoryRow[];
}) {
  const router = useRouter();
  const docs = { estimate: quote, invoice } as Record<Kind, DocView | null>;
  const [kind, setKind] = useState<Kind>(docs[start] ? start : quote ? "estimate" : "invoice");
  const d = docs[kind];
  const [drafts, setDrafts] = useState<Record<Kind, Draft>>({
    estimate: { summary: quote?.summary ?? "", labour: quote?.labour ?? "" },
    invoice: { summary: invoice?.summary ?? "", labour: invoice?.labour ?? "" },
  });
  const [stage, setStage] = useState<Record<Kind, Stage>>({ estimate: "now", invoice: "now" });
  const [written, setWritten] = useState<string[] | null>(null);
  const [notes, setNotes] = useState(savedNotes);
  const [writing, startWrite] = useTransition();
  const [saving, startSave] = useTransition();
  const [putting, startPut] = useTransition();
  const [undoing, startUndo] = useTransition();
  const [writeMsg, setWriteMsg] = useState<Msg>(null);
  const [putMsg, setPutMsg] = useState<Msg>(null);
  const [undoMsg, setUndoMsg] = useState<Msg>(null);
  const canMerge = !!d && d.blockers.length === 0 && d.hasTarget && d.changes > 0;
  const [onePrice, setOnePrice] = useState(true);
  const draft = drafts[kind];
  const set = (k: keyof Draft, v: string) => setDrafts({ ...drafts, [kind]: { ...draft, [k]: v } });
  const doc = DOC_WORD[kind];
  const tag = STAGE_TAG[stage[kind]](doc);

  const write = () => startWrite(async () => {
    setWriteMsg(null); setPutMsg(null);
    const r = await writeJobWords(job, quote?.id ?? null, notes);
    if (!r.ok) { setWriteMsg({ ok: false, text: r.error }); return; }
    setDrafts({
      estimate: { summary: r.words.quote.summary, labour: r.words.quote.labour },
      invoice: { summary: r.words.invoice.summary, labour: r.words.invoice.labour },
    });
    setStage({ estimate: "new", invoice: "new" });
    setWritten(r.from);
    // The notes were saved with it: the "Saved by" line catches up.
    router.refresh();
  });

  const put = () => startPut(async () => {
    if (!d) return;
    setPutMsg(null);
    const r = await putWriteup({ job, kind, docId: d.id, summary: draft.summary, labour: draft.labour, onePrice: onePrice && canMerge, expectCombined: onePrice && canMerge ? d.combined : null });
    setPutMsg(r.ok ? { ok: true, text: r.note } : { ok: false, text: r.error });
    if (r.ok) setStage({ ...stage, [kind]: "put" });
    router.refresh();
  });

  if (!d) return <p className="jw-quiet">Job {heading.number} has no quote or invoice to write for.</p>;

  return (
    <div className="jw">
      <section className="jw-card jw-top" aria-label={`Job ${heading.number}`}>
        <div className="jw-top-row">
          <div className="jw-id">
            <span className="jw-eyebrow">Job</span>
            <span className="jw-num">{heading.number}</span>
            <span className="jw-meta">{[heading.type, heading.customer].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="jw-seg" role="group" aria-label="Write for">
            {(["estimate", "invoice"] as Kind[]).map((k) => docs[k] && (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setPutMsg(null); }}>
                {k === "estimate" ? "Quote" : "Invoice"}{docs[k]!.status ? <span> · {docs[k]!.status}</span> : null}
              </button>
            ))}
          </div>
        </div>
        <ul className="jw-chips" aria-label="Read from ServiceTitan">
          {heading.read.map((r) => <li key={r}><Tick />{r}</li>)}
          {heading.missing.map((m) => <li key={m} className="bad">Couldn&rsquo;t read {m}</li>)}
        </ul>
        {kind === "estimate" && quotes.length > 1 && (
          <nav className="jw-quotes" aria-label="Which quote">
            {quotes.map((x) => (
              <Link key={x.id} href={`/portal/jobs/write-up?job=${encodeURIComponent(job)}&quote=${x.id}`} aria-current={quote?.id === x.id ? "true" : undefined}>
                {x.name || `Quote ${x.id}`}{x.status ? ` · ${x.status}` : ""}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section className="jw-card jw-notes" aria-labelledby="jw-n-h">
        <div className="jw-bh">
          <h2 id="jw-n-h"><span className="jw-n" aria-hidden="true">1</span>Notes to write it from</h2>
          {notesBy ? <span className="jw-quiet">Saved by {notesBy.by}, {when(notesBy.at)}</span> : null}
        </div>
        <p className="jw-quiet">How it&rsquo;s going in, what&rsquo;s coming out, and anything that comes off the price if it isn&rsquo;t needed. Only used for the writing; they aren&rsquo;t put on the job.</p>
        <textarea id="jw-notes" aria-labelledby="jw-n-h" className="jw-ta" rows={rows(notes, 3)} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder={"e.g. Outdoor unit on a roof bracket.\nCondensate pump on the indoor head. If we don't need it, it comes off the quoted price.\nRemoving the old Fujitsu split from the lounge."} />
        <div className="jw-row">
          {/* Written from the notes, so not without them (Jake, 19 Nov). */}
          <button className="pk-btn" type="button" onClick={write} disabled={writing || !notes.trim()}>{writing ? "Writing…" : written ? "Write it again" : "Write it"}</button>
          <button className="pk-btn g" type="button" disabled={saving || writing} onClick={() => startSave(async () => {
            const r = await saveJobNotes(job, notes);
            setWriteMsg(r.ok ? { ok: true, text: r.note } : { ok: false, text: r.error });
            router.refresh();
          })}>{saving ? "Saving…" : "Save notes"}</button>
          <span className="jw-quiet">{writing ? "Reading the job and writing: about half a minute." : !notes.trim() ? "Add your notes, then Write it." : written ? `Written from ${written.join(", ")}.` : "Writes the quote's and the invoice's words."}</span>
        </div>
        {writeMsg && <p className={`jw-msg ${writeMsg.ok ? "ok" : "bad"}`} role="status">{writeMsg.text}</p>}
      </section>

      <div className="jw-pair">
        <section className="jw-card" aria-labelledby="jw-s-h">
          <div className="jw-bh">
            <h2 id="jw-s-h"><span className="jw-n" aria-hidden="true">2</span>Job summary</h2>
            <span className="jw-end"><span className={`jw-tag ${tag.cls}`}>{tag.w}</span><Copy text={draft.summary} /></span>
          </div>
          <textarea id="jw-summary" aria-labelledby="jw-s-h" className="jw-ta" rows={rows(draft.summary, 6)} value={draft.summary} onChange={(e) => set("summary", e.target.value)} placeholder={kind === "estimate" ? "Supply and installation of …\n\nThe existing … will be removed …\n\nInstallation Details:\n\nMaster bedroom: …\n\nAll installations will be completed in accordance with manufacturer specifications and applicable industry requirements." : "Supplied and installed …\n\nThe existing … was removed …"} />
        </section>

        <section className="jw-card" aria-labelledby="jw-l-h">
          <div className="jw-bh">
            <h2 id="jw-l-h"><span className="jw-n" aria-hidden="true">3</span>Labour line</h2>
            <span className="jw-end"><span className={`jw-tag ${tag.cls}`}>{tag.w}</span><Copy text={draft.labour} /></span>
          </div>
          {d.labourName ? <p className="jw-quiet">On {d.labourName}</p> : null}
          <OnePriceSum d={d} />
          <textarea id="jw-labour" aria-labelledby="jw-l-h" className="jw-ta" rows={rows(draft.labour, 5)} value={draft.labour} onChange={(e) => set("labour", e.target.value)} placeholder="Installation of your new … This one price covers the installation labour, the materials and the electrical work." />
        </section>
      </div>

      <section className="jw-card jw-putbar" aria-label={`Put on the ${doc}`}>
        <div className="jw-row">
          {canMerge ? (
            <label className="jw-check">
              <input type="checkbox" checked={onePrice} onChange={(e) => setOnePrice(e.target.checked)} />
              <span>Put labour, materials and electrical under one price of <b>{money2(d.combined)}</b>. The total stays {money2(d.before)}.</span>
            </label>
          ) : <span className="jw-quiet jw-grow">Only the words change on the {doc}. The total stays {money2(d.before)}.</span>}
          <button className="pk-btn" type="button" disabled={putting || !draft.summary.trim()} onClick={put}>{putting ? "Putting it on…" : `Put on the ${doc}`}</button>
        </div>
        {putMsg && <p className={`jw-msg ${putMsg.ok ? "ok" : "bad"}`} role="status">{putMsg.text}</p>}
        <details className="jw-lines">
          <summary>See the lines on the {doc}{d.name ? `: ${d.name}` : ""}</summary>
          <PlanTable d={d} />
        </details>
      </section>

      {history.length > 0 && (
        <section className="jw-card" aria-labelledby="jw-h-h">
          <h2 id="jw-h-h" className="jw-h">Put on before</h2>
          <ul className="jw-hist">
            {history.map((h) => (
              <li key={h.id}>
                <Pill st={STATUS_WORD[h.status] ?? { k: "none", w: h.status }} />
                <span>{h.doc_kind === "estimate" ? "Quote" : "Invoice"}, {when(h.created_at)}{h.created_by ? `, ${h.created_by}` : ""}{h.note ? `: ${h.note}` : ""}</span>
                {h.status === "done" && (
                  <button type="button" className="jw-copy" disabled={undoing} onClick={() => startUndo(async () => {
                    setUndoMsg(null);
                    const r = await undoJobWriteup(h.id);
                    setUndoMsg(r.ok ? { ok: true, text: r.note } : { ok: false, text: r.error });
                    router.refresh();
                  })}>Undo</button>
                )}
              </li>
            ))}
          </ul>
          {undoMsg && <p className={`jw-msg ${undoMsg.ok ? "ok" : "bad"}`} role="status">{undoMsg.text}</p>}
        </section>
      )}
    </div>
  );
}
