"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill } from "@/components/portal/kit/Kit";
import { money2 } from "@/lib/portal/format";
import { ROLE_WORD, type Role } from "@/lib/jobwrite/lines";
import { INVOICE_LABELS, QUOTE_LABELS, type InvoiceWords, type JobWords, type QuoteWords } from "@/lib/jobwrite/labels";
import { putWriteup, undoJobWriteup, writeJobWords } from "@/app/portal/jobs/write-up/actions";

export type DocView = {
  kind: "estimate" | "invoice";
  id: number;
  name: string | null;
  status: string | null;
  summary: string;
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

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
const STATUS_WORD: Record<string, { k: "good" | "mid" | "bad" | "none"; w: string }> = {
  done: { k: "good", w: "Put on" },
  undone: { k: "none", w: "Undone" },
  restored: { k: "mid", w: "Put back" },
  failed: { k: "bad", w: "Check it" },
  started: { k: "mid", w: "Didn't finish" },
};

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
              <td data-l="Line"><span className="jw-ln">{qty(l.qty)} × {l.name}</span>{l.code && l.code !== l.name ? <span className="jw-code">{l.code}</span> : null}</td>
              <td data-l="What it is">{l.target ? "Carries the one price" : l.merged ? `${ROLE_WORD[l.role]}, now in the one price` : ROLE_WORD[l.role]}</td>
              <td data-l="Now">{money2(l.total)}</td>
              <td data-l="One price"><b>{money2(l.newTotal)}</b></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><th scope="row" colSpan={2}>Total before GST</th><td>{money2(d.before)}</td><td><b>{money2(d.after)}</b></td></tr></tfoot>
      </table>
    </div>
  );
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="jw-copy" onClick={() => {
      navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => undefined);
    }}>{done ? "Copied" : "Copy"}</button>
  );
}

function Field({ id, label, value, onChange, rows = 3 }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="jw-field">
      <div className="jw-fh"><label htmlFor={id}>{label}</label><Copy text={value} /></div>
      {/* Tall enough for what's in it: about 60 characters a line at the card's width. */}
      <textarea id={id} className="jw-ta" rows={Math.max(rows, Math.ceil(value.length / 60) + 1)} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** One document's words, its one price, and the button that puts them on. */
function DocPanel({ job, d, words, setWords }: {
  job: string; d: DocView; words: QuoteWords | InvoiceWords; setWords: (w: QuoteWords | InvoiceWords) => void;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const canMerge = d.blockers.length === 0 && d.hasTarget;
  const [onePrice, setOnePrice] = useState(canMerge && d.changes > 0);
  const what = d.kind === "estimate" ? "quote" : "invoice";
  const labels: Record<string, string> = d.kind === "estimate" ? QUOTE_LABELS : INVOICE_LABELS;
  const set = (k: string, v: string) => setWords({ ...words, [k]: v } as QuoteWords | InvoiceWords);

  return (
    <div className="jw-doc">
      {Object.entries(labels).map(([k, label]) => (
        <Field key={k} id={`jw-${d.kind}-${k}`} label={label.replace(/:$/, "")} value={(words as Record<string, string>)[k] ?? ""} onChange={(v) => set(k, v)} rows={2} />
      ))}
      <Field id={`jw-${d.kind}-labour`} label={d.hasTarget ? "Labour line (labour, materials and electrical)" : "Labour line"} value={words.labour} onChange={(v) => set("labour", v)} rows={4} />
      <div className="jw-put">
        {canMerge && d.changes > 0 ? (
          <label className="jw-check">
            <input type="checkbox" checked={onePrice} onChange={(e) => setOnePrice(e.target.checked)} />
            <span>Put labour, materials and electrical under one price of <b>{money2(d.combined)}</b></span>
          </label>
        ) : canMerge ? (
          <span className="jw-quiet">Already one price: only the words change.</span>
        ) : (
          <span className="jw-quiet">One price can&rsquo;t be done here: {d.blockers.join(" ")} The words can still go on.</span>
        )}
        <button className="pk-btn" type="button" disabled={busy} onClick={() => start(async () => {
          setMsg(null);
          const r = await putWriteup({ job, kind: d.kind, docId: d.id, words, onePrice: onePrice && canMerge, expectCombined: onePrice && canMerge ? d.combined : null });
          setMsg(r.ok ? { ok: true, text: r.note } : { ok: false, text: r.error });
          router.refresh();
        })}>{busy ? "Putting it on…" : `Put on the ${what}`}</button>
      </div>
      {msg && <p className={`jw-msg ${msg.ok ? "ok" : "bad"}`} role="status">{msg.text}</p>}
    </div>
  );
}

export function JobWriteup({ job, quotes, quote, invoice, history }: {
  job: string;
  quotes: Array<{ id: number; name: string | null; status: string | null }>;
  quote: DocView | null;
  invoice: DocView | null;
  history: HistoryRow[];
}) {
  const router = useRouter();
  const [words, setWords] = useState<JobWords | null>(null);
  const [from, setFrom] = useState<string[]>([]);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [undoMsg, setUndoMsg] = useState<Msg>(null);
  const [undoing, startUndo] = useTransition();

  const write = () => start(async () => {
    setMsg(null);
    const r = await writeJobWords(job, quote?.id ?? null);
    if (r.ok) { setWords(r.words); setFrom(r.from); } else setMsg({ ok: false, text: r.error });
  });

  return (
    <div className="jw">
      {quotes.length > 1 && (
        <nav className="jw-quotes" aria-label="Which quote">
          <span>Quote:</span>
          {quotes.map((x) => (
            <Link key={x.id} href={`/portal/jobs/write-up?job=${encodeURIComponent(job)}&quote=${x.id}`} aria-current={quote?.id === x.id ? "true" : undefined}>
              {x.name || `Quote ${x.id}`}{x.status ? ` · ${x.status}` : ""}
            </Link>
          ))}
        </nav>
      )}

      <div className="jw-write">
        <button className="pk-btn" type="button" onClick={write} disabled={busy || (!quote && !invoice)}>
          {busy ? "Reading the job and writing…" : words ? "Write them again" : "Write the job summary and labour line"}
        </button>
        <span className="jw-quiet">{busy ? "About half a minute." : words ? `Written from ${from.join(", ")}. Change anything before putting it on.` : !quote && !invoice ? "This job has no quote or invoice to write for." : "Nothing changes in ServiceTitan until you press Put on."}</span>
      </div>
      {msg && <p className="jw-msg bad" role="status">{msg.text}</p>}

      <div className="jw-cols">
        {[quote, invoice].map((d) => d && (
          <Card key={d.kind} title={d.kind === "estimate" ? `The quote${d.name ? `: ${d.name}` : ""}` : `The invoice${d.name ? ` ${d.name}` : ""}`} aside={d.status ?? undefined}>
            {words ? (
              <DocPanel job={job} d={d} words={d.kind === "estimate" ? words.quote : words.invoice}
                setWords={(w) => setWords(d.kind === "estimate" ? { ...words, quote: w as QuoteWords } : { ...words, invoice: w as InvoiceWords })} />
            ) : (
              <div className="jw-now"><b>Summary on it now</b><p>{d.summary || "None."}</p></div>
            )}
            <details className="jw-lines" open={!words}>
              <summary>
                {d.hasTarget && d.blockers.length === 0
                  ? <>Labour {money2(d.parts.labour)}, materials {money2(d.parts.materials)} and electrical {money2(d.parts.electrical)}: one price of <b>{money2(d.combined)}</b></>
                  : <>The lines{d.blockers.length ? ` (one price can't be done: ${d.blockers[0]})` : ""}</>}
              </summary>
              <PlanTable d={d} />
            </details>
          </Card>
        ))}
      </div>

      {history.length > 0 && (
        <Card title="Put on before">
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
        </Card>
      )}
    </div>
  );
}
