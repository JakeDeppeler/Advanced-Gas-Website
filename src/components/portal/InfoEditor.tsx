"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetInfo, saveInfo } from "@/app/portal/information/actions";
import type { InfoBlockAs, InfoContentBlock } from "@/lib/portal/content";

const SHAPES: Array<{ k: InfoBlockAs; label: string }> = [
  { k: "rows", label: "Label and value list" },
  { k: "facts", label: "Three big facts" },
  { k: "stat", label: "One big figure" },
  { k: "price", label: "Price list" },
  { k: "copy", label: "Numbers to copy" },
  { k: "timeline", label: "Timeline" },
  { k: "people", label: "People" },
  { k: "chips", label: "Steps in a row" },
];
const HAS_ROWS = (as?: InfoBlockAs) => !as || ["rows", "facts", "stat", "price", "copy", "timeline"].includes(as);

/** A block as text boxes: one thing a line, parts of a line split by " | ". */
type Draft = { title: string; as: InfoBlockAs; span: string; navy: boolean; rows: string; people: string; chips: string; list: string; body: string };
const toDraft = (b: InfoContentBlock): Draft => ({
  title: b.title ?? "", as: b.as ?? "rows", span: b.span ?? "", navy: b.tone === "navy",
  rows: (b.rows ?? []).map((r) => [r.k, r.v, r.note ?? "", r.href ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n"),
  people: (b.people ?? []).map((p) => [p.name, p.role, p.detail].join(" | ")).join("\n"),
  chips: (b.chips ?? []).join("\n"),
  list: (b.list ?? []).join("\n"),
  body: (b.body ?? []).join("\n\n"),
});
const split = (l: string) => l.split("|").map((x) => x.trim());
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const fromDraft = (d: Draft): InfoContentBlock => ({
  title: d.title, as: d.as, span: (d.span || undefined) as InfoContentBlock["span"], tone: d.navy ? "navy" : undefined,
  rows: HAS_ROWS(d.as) ? lines(d.rows).map((l) => { const [k, v, note, href] = split(l); return { k, v: v ?? "", note: note || undefined, href: href || undefined }; }) : undefined,
  people: d.as === "people" ? lines(d.people).map((l) => { const [name, role, detail] = split(l); return { name, role: role ?? "", detail: detail ?? "" }; }) : undefined,
  chips: d.as === "chips" ? lines(d.chips) : undefined,
  list: lines(d.list),
  body: d.body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean),
});

/**
 * The owner's editor for one Information page: every block's title, its
 * shape and what's in it, in plain text boxes. Saved over the page as written;
 * "Put back the original" forgets the change.
 */
export function InfoEditor({ slug, intro, blocks, edited }: { slug: string; intro: string; blocks: InfoContentBlock[]; edited: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState(intro);
  const [ds, setDs] = useState<Draft[]>(() => blocks.map(toDraft));
  const [msg, setMsg] = useState<string | null>(null);
  const set = (i: number, p: Partial<Draft>) => setDs((x) => x.map((d, j) => (j === i ? { ...d, ...p } : d)));
  const move = (i: number, by: number) => setDs((x) => { const y = [...x]; const [d] = y.splice(i, 1); y.splice(Math.max(0, Math.min(y.length, i + by)), 0, d); return y; });

  if (!open) {
    return (
      <div className="ie-bar">
        <button type="button" className="qp-btn dark" onClick={() => { setDs(blocks.map(toDraft)); setLead(intro); setOpen(true); }}>Change this page</button>
        {edited && <span className="qp-note">Changed from the original.</span>}
      </div>
    );
  }
  return (
    <section className="pk-card pk-pad ie">
      <div className="ie-head">
        <h2 className="rl-h">Change this page</h2>
        <p className="qp-note">One thing a line. Where a line has parts, split them with a bar: <code>Label | Value | Note</code>.</p>
      </div>
      <label className="qp-field"><span>The line under the title</span><input id="ie-intro" value={lead} onChange={(e) => setLead(e.target.value)} maxLength={300} /></label>
      {ds.map((d, i) => (
        <fieldset key={i} className="ie-block">
          <legend>Block {i + 1}{d.title ? `: ${d.title}` : ""}</legend>
          <div className="ie-row">
            <label className="qp-field"><span>Heading</span><input id={`ie-t-${i}`} value={d.title} onChange={(e) => set(i, { title: e.target.value })} maxLength={120} /></label>
            <label className="qp-field"><span>Shape</span>
              <select id={`ie-as-${i}`} value={d.as} onChange={(e) => set(i, { as: e.target.value as InfoBlockAs })}>
                {SHAPES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
              </select>
            </label>
            <label className="qp-field"><span>Width</span>
              <select id={`ie-sp-${i}`} value={d.span} onChange={(e) => set(i, { span: e.target.value })}>
                <option value="">Half</option><option value="full">Full width</option><option value="tall">Tall</option>
              </select>
            </label>
          </div>
          {HAS_ROWS(d.as) && <label className="qp-field"><span>Lines <em>Label | Value | Note | link</em></span><textarea id={`ie-r-${i}`} rows={Math.min(12, Math.max(3, d.rows.split("\n").length + 1))} value={d.rows} onChange={(e) => set(i, { rows: e.target.value })} /></label>}
          {d.as === "people" && <label className="qp-field"><span>People <em>Name | Role | What they do</em></span><textarea id={`ie-p-${i}`} rows={5} value={d.people} onChange={(e) => set(i, { people: e.target.value })} /></label>}
          {d.as === "chips" && <label className="qp-field"><span>Steps <em>one a line</em></span><textarea id={`ie-c-${i}`} rows={4} value={d.chips} onChange={(e) => set(i, { chips: e.target.value })} /></label>}
          <label className="qp-field"><span>Dot points <em>one a line, optional</em></span><textarea id={`ie-l-${i}`} rows={Math.max(2, d.list.split("\n").length)} value={d.list} onChange={(e) => set(i, { list: e.target.value })} /></label>
          <label className="qp-field"><span>Paragraphs <em>a blank line between each, optional</em></span><textarea id={`ie-b-${i}`} rows={Math.max(2, d.body.split("\n").length)} value={d.body} onChange={(e) => set(i, { body: e.target.value })} /></label>
          <div className="ie-acts">
            <label className="ie-navy"><input type="checkbox" checked={d.navy} onChange={(e) => set(i, { navy: e.target.checked })} /> Dark card</label>
            <button type="button" className="qp-btn line" disabled={i === 0} onClick={() => move(i, -1)}>Move up</button>
            <button type="button" className="qp-btn line" disabled={i === ds.length - 1} onClick={() => move(i, 1)}>Move down</button>
            <button type="button" className="td-del" onClick={() => { if (confirm("Take this block off the page?")) setDs((x) => x.filter((_, j) => j !== i)); }}>Take it off</button>
          </div>
        </fieldset>
      ))}
      <button type="button" className="qp-drop ie-add" onClick={() => setDs((x) => [...x, toDraft({ title: "", as: "rows", rows: [] })])}>
        <span className="qp-dropi x" aria-hidden="true">+</span><b>Add a block</b>
      </button>
      <div className="qp-acts">
        <button type="button" className="qp-btn dark" disabled={pending} onClick={() => start(async () => {
          const r = await saveInfo(slug, { intro: lead, blocks: ds.map(fromDraft) });
          setMsg(r.ok ? "Saved." : r.error ?? "Couldn't save it.");
          if (r.ok) { setOpen(false); router.refresh(); }
        })}>Save the page</button>
        <button type="button" className="qp-btn" onClick={() => setOpen(false)}>Cancel</button>
        {edited && <button type="button" className="td-del" disabled={pending} onClick={() => { if (confirm("Put this page back to how it was first written? Your changes go.")) start(async () => { const r = await resetInfo(slug); setMsg(r.ok ? "Put back." : r.error ?? "Couldn't."); if (r.ok) { setOpen(false); router.refresh(); } }); }}>Put back the original</button>}
      </div>
      {msg && <p className="qp-toast" role="status">{msg}</p>}
    </section>
  );
}
