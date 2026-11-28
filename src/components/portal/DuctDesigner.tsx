"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DUCTED, GROUPS, extraItcs, type DuctedCatalogue, type Group, type Sku } from "@/lib/ducted/plan";
import { buildFromDesign, type DesignOptions } from "@/lib/ducted/design";
import { readTakeoff } from "@/lib/ducted/takeoff";
import { applyPicks, unpriced, type PickItem, type Picks } from "@/lib/ducted/picks";
import { cleanSummary, designNotes, type DesignerSummary } from "@/lib/ducted/designSummary";
import { BASES, type Basis, type StandardItem } from "@/lib/ducted/standard";
import { openDesignJob, pickPart, putDesignQuote, saveJobDesign, saveJobImage, saveStandardList, type DesignPut, type Opened, type QuoteMode, type Quoted } from "@/app/portal/ducted/design/actions";

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const GROUP_LABEL: Record<Group, string> = { unit: "Unit", controls: "Zone controller", install: "Installation", extra: "Certificate" };
const when = (iso: string) => (iso ? new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const blobToBase64 = (b: Blob) => new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] ?? ""); r.onerror = () => bad(r.error); r.readAsDataURL(b); });

type Job = Extract<Opened, { ok: true }>["job"];
type FromDesigner = { csv: string; summary: DesignerSummary | null };

/**
 * Daily tools › Duct design (Jake, 28 Nov 2026): the Trust Trade designer for
 * a ServiceTitan job. The job's details go into the designer, the design is
 * kept against the job as it's drawn, and Build quote prices it here from the
 * pricebook and puts it on the job, or updates the quote it made last time.
 */
export function DuctDesigner({ cat, designerUrl, start }: { cat: DuctedCatalogue; designerUrl: string; start: string }) {
  const [number, setNumber] = useState(start);
  const [opened, setOpened] = useState<Extract<Opened, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, begin] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fromDesigner, setFromDesigner] = useState<FromDesigner | null>(null);
  const [quoted, setQuoted] = useState<Quoted | null>(null);
  const [picks, setPicks] = useState<Picks>({});
  const [standard, setStandard] = useState<StandardItem[]>(cat.standard ?? []);
  const [standardSaved, setStandardSaved] = useState(!!cat.standardSaved);
  const live = useMemo(() => ({ ...cat, standard }), [cat, standard]);
  const frame = useRef<HTMLIFrameElement>(null);
  const quoteRef = useRef<HTMLElement>(null);
  const origin = useMemo(() => new URL(designerUrl).origin, [designerUrl]);
  const src = useMemo(() => { const u = new URL(designerUrl); u.searchParams.set("portal", "1"); return u.toString(); }, [designerUrl]);
  const stock = useMemo(() => [...new Map(cat.raGrilles.map((g) => [`${g.w}x${g.h}`, [Math.max(g.w, g.h), Math.min(g.w, g.h)]])).values()], [cat]);

  const open = (n: string) => begin(async () => {
    setError(null); setOpened(null); setFromDesigner(null); setSavedAt(null);
    const r = await openDesignJob(n);
    if (!r.ok) { setError(r.error); return; }
    setOpened(r); setQuoted(r.quoted); setPicks(r.picks);
    try { history.replaceState(null, "", `?job=${r.job.number}`); } catch { /* the address is a convenience */ }
  });
  useEffect(() => { if (/^\d{3,9}$/.test(start)) open(start); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The job into the designer: its details, the design kept on it, its plan images, the sizes we stock.
  const send = useCallback(async () => {
    const w = frame.current?.contentWindow;
    if (!w || !opened) return;
    const images: Record<string, Blob> = {};
    await Promise.all(Object.entries(opened.images).map(async ([name, url]) => {
      const b = await fetch(url).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
      if (b) images[name] = b;
    }));
    const q = quoted && quoted.state === "open" ? { estimateId: quoted.estimateId, total: quoted.total, at: quoted.at } : null;
    w.postMessage({
      type: "tt:open", job: { number: opened.job.number, customer: opened.job.customer, address: opened.job.address },
      project: opened.project, images, stock: { grilles: stock }, quoted: q,
    }, origin);
  }, [opened, quoted, stock, origin]);

  useEffect(() => {
    if (!opened) return;
    const job = { id: opened.job.id, number: opened.job.number };
    const on = async (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data as { type?: string; project?: unknown; name?: string; blob?: Blob; csv?: string; summary?: unknown };
      if (m?.type === "tt:ready") send();
      else if (m?.type === "tt:save" && m.project) {
        const r = await saveJobDesign(job, m.project);
        if (r.ok) { setSavedAt(new Date().toISOString()); setSaveError(null); } else setSaveError(r.error ?? "The design didn't save.");
      } else if (m?.type === "tt:image" && m.name && m.blob instanceof Blob) {
        const r = await saveJobImage(job.id, m.name, await blobToBase64(m.blob), m.blob.type || "image/png");
        if (!r.ok) setSaveError(`The plan image didn't save: ${r.error}`);
      } else if (m?.type === "tt:quote" && typeof m.csv === "string") {
        if (m.project) await saveJobDesign(job, m.project);
        setFromDesigner({ csv: m.csv, summary: cleanSummary(m.summary) });
        setTimeout(() => quoteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [opened, origin, send]);

  const told = (q: Quoted) => {
    setQuoted(q);
    frame.current?.contentWindow?.postMessage({ type: "tt:quoted", quoted: { estimateId: q.estimateId, total: q.total, at: q.at } }, origin);
  };

  return (
    <div className="pk-dd">
      <section className="pk-card pk-pad">
        <form className="pk-du-row" onSubmit={(e) => { e.preventDefault(); open(number); }}>
          <label className="pk-du-f" htmlFor="dd-job"><span>Job number</span>
            <input id="dd-job" className="pk-in num" inputMode="numeric" placeholder="20950" value={number} onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, ""))} />
          </label>
          <button type="submit" className="pk-btn" disabled={pending || number.length < 3}>{pending ? "Opening…" : "Open the design"}</button>
          {opened && (
            <p className="pk-dd-job">
              <b>Job {opened.job.number}</b>{opened.job.customer ? ` · ${opened.job.customer}` : ""}{opened.job.address ? ` · ${opened.job.address}` : ""}
              <span className="pk-du-dim">{opened.project ? "Design kept on this job" : "New design"}{savedAt ? ` · saved ${when(savedAt)}` : ""}{quoted ? ` · quote ${quoted.estimateId} ${quoted.state === "open" ? `${money(quoted.total)}` : `is ${quoted.state}`}` : ""}</span>
            </p>
          )}
        </form>
        {error && <p className="pk-du-miss" role="alert">{error}</p>}
        {saveError && <p className="pk-du-miss" role="alert">{saveError}</p>}
      </section>

      <StandardList items={standard} saved={standardSaved} pickable={cat.pickable ?? []} coils={(cat.coils ?? []).length}
        onSaved={(items) => { setStandard(items); setStandardSaved(true); }} />

      {opened && (
        <div className="pk-dd-frame">
          <iframe ref={frame} key={opened.job.id} src={src} title={`Duct design for job ${opened.job.number}`} onLoad={() => setTimeout(send, 400)} allow="fullscreen" />
        </div>
      )}

      {opened && fromDesigner && (
        <section ref={quoteRef}>
          <DesignQuote cat={live} job={opened.job} input={fromDesigner} saved={opened.options} quoted={quoted} picks={picks}
            onPick={(need, items) => setPicks((p) => ({ ...p, [need]: items }))} onDone={told} />
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ quote */

function DesignQuote({ cat, job, input, saved, quoted, picks, onPick, onDone }: {
  cat: DuctedCatalogue; job: Job; input: FromDesigner; saved: Partial<DesignOptions> | null; quoted: Quoted | null; picks: Picks;
  onPick: (need: string, items: PickItem[]) => void; onDone: (q: Quoted) => void;
}) {
  const t = useMemo(() => readTakeoff(input.csv), [input.csv]);
  const [unitSkuId, setUnit] = useState<number | null>(saved?.unitSkuId ?? null);
  const [doubleStorey, setDouble] = useState(saved?.doubleStorey ?? (input.summary?.storeys ?? 1) > 1);
  const [extraHours, setExtraHours] = useState(saved?.extraHours ? String(saved.extraHours) : "");
  const [extraReason, setExtraReason] = useState(saved?.extraReason ?? "");
  const [itcs, setItcs] = useState(saved?.itcs != null ? String(saved.itcs) : "");
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const [done, setDone] = useState<DesignPut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, begin] = useTransition();

  const options: DesignOptions = { unitSkuId, doubleStorey, extraHours: Number(extraHours) || 0, extraReason, itcs: itcs === "" ? null : Number(itcs), notes };
  const q = useMemo(() => (t.problem ? null : applyPicks(buildFromDesign(t, { ...options, standard: true, notes: designNotes(input.summary, notes) }, cat), picks, cat.pickable ?? [])),
    [t, JSON.stringify(options), picks, cat, input.summary]); // eslint-disable-line react-hooks/exhaustive-deps
  const gaps = q ? unpriced(q) : [];
  const gapText = new Set(gaps.map((l) => l.missing ?? l.name));
  const warnings = q ? q.missing.filter((m) => !gapText.has(m)) : [];
  const ready = !!q && gaps.length === 0 && q.lines.some((l) => l.group === "unit" && l.sku);
  const openQuote = quoted?.state === "open" ? quoted : null;

  const put = (mode: QuoteMode) => begin(async () => {
    setError(null); setDone(null);
    const r = await putDesignQuote({ jobNumber: job.number, csv: input.csv, summary: input.summary, options, mode });
    if (!r.ok) { setError(r.error); return; }
    setDone(r);
    onDone({ estimateId: r.estimateId, total: r.expected, at: new Date().toISOString(), by: null, state: "open" });
  });

  if (t.problem || !q) return <section className="pk-card pk-pad"><p className="pk-du-miss" role="alert">{t.problem ?? "The design's materials list couldn't be read."}</p></section>;
  const materials = q.lines.filter((l) => l.group === "install" && l.sku && l.sku.skuType !== "Service");
  const groupSum = (g: Group) => q.lines.filter((l) => l.group === g).reduce((a, l) => a + l.quantity * l.unitPrice, 0);

  return (
    <div className="pk-du">
      <section className="pk-card pk-pad">
        <div className="pk-card-h"><b>The quote for job {job.number}</b><span>from the design, at the pricebook&rsquo;s prices, before GST</span></div>
        <dl className="pk-du-read">
          <div><dt>Unit</dt><dd>{input.summary?.unit ?? t.indoor ?? "—"}</dd></div>
          <div><dt>Outlets</dt><dd>{q.outlets}</dd></div>
          <div><dt>Zones</dt><dd>{q.zones}</dd></div>
          <div><dt>Take-offs</dt><dd>{t.takeoffs.reduce((a, f) => a + f.qty, 0)}</dd></div>
        </dl>
        <div className="pk-du-row">
          <label className="pk-du-f grow" htmlFor="dd-unit"><span>Unit{q.suggested || unitSkuId ? "" : " · nothing matched: choose it"}</span>
            <select id="dd-unit" className="pk-in" value={q.unit?.skuId ?? ""} onChange={(e) => setUnit(Number(e.target.value) || null)}>
              {!q.unit && <option value="">Choose the unit</option>}
              {cat.units.map((u) => <option key={u.skuId} value={u.skuId}>{u.name.trim()} · {money(u.price)}{q.suggested?.skuId === u.skuId ? " · matches the design" : ""}</option>)}
            </select>
          </label>
          <label className="pk-du-check" htmlFor="dd-double"><input id="dd-double" type="checkbox" checked={doubleStorey} onChange={(e) => setDouble(e.target.checked)} /> Double storey <span className="pk-du-dim">+{DUCTED.doubleStorey} h</span></label>
        </div>
        <div className="pk-du-row">
          <label className="pk-du-f" htmlFor="dd-itc"><span>Extra temperature controls <span className="pk-du-dim">4 come with the controller</span></span><input id="dd-itc" className="pk-in num" inputMode="numeric" placeholder={String(extraItcs(t.itc || q.zones))} value={itcs} onChange={(e) => setItcs(e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <label className="pk-du-f" htmlFor="dd-xh"><span>Extra hours</span><input id="dd-xh" className="pk-in num" inputMode="decimal" placeholder="0" value={extraHours} onChange={(e) => setExtraHours(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
          <label className="pk-du-f grow" htmlFor="dd-xr"><span>For</span><input id="dd-xr" className="pk-in" placeholder="e.g. a tight roof space, or taking the old ducting out" value={extraReason} onChange={(e) => setExtraReason(e.target.value)} /></label>
        </div>
        <label className="pk-du-f" htmlFor="dd-notes"><span>Notes for the quote&rsquo;s summary</span>
          <textarea id="dd-notes" className="pk-in" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </section>

      <section className="pk-card pk-pad">
        <div className="pk-du-sum">
          <div><span>Labour</span><b>{q.hours.total} h</b><em>{money(q.labour)}</em></div>
          <div><span>Materials &amp; parts</span><b>{materials.length} lines</b><em>{money(materials.reduce((a, l) => a + l.quantity * l.unitPrice, 0))}</em></div>
          <div className="tot"><span>Total</span><b>{money(q.total)}</b><em>{money(q.total * 1.1)} with GST</em></div>
        </div>

        {gaps.length > 0 && (
          <div className="pk-du-warn" role="status">
            <b>{gaps.length} {gaps.length === 1 ? "part has" : "parts have"} no pricebook item: pick one for each</b>
            <p className="pk-du-dim">Your pick is remembered, so the same part is priced the same way on the next job.</p>
            {gaps.map((l) => <PickRow key={l.name} line={l} pickable={cat.pickable ?? []} onPick={onPick} />)}
          </div>
        )}
        {warnings.length > 0 && <div className="pk-du-warn" role="status"><b>Check before it goes on</b><ul>{warnings.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}

        <div className="pk-tbl-wrap">
          <table className="pk-tbl pk-du-lines">
            <thead><tr><th>Line</th><th>Qty</th><th>Each</th><th>Total</th></tr></thead>
            <tbody>
              {GROUPS.map((g) => {
                const ls = q.lines.filter((l) => l.group === g);
                if (!ls.length) return null;
                return [
                  <tr key={`${g}-h`} className="pk-du-grp"><td colSpan={3}>{GROUP_LABEL[g]}</td><td>{money(groupSum(g))}</td></tr>,
                  ...ls.map((l, i) => (
                    <tr key={`${g}-${i}`} className={!l.sku ? "pk-du-bad" : i > 0 ? "pk-du-kid" : undefined}>
                      <td>{l.name.trim()}{!l.sku ? " · pick an item" : ""}{l.note && <span className="pk-du-note">{l.note}</span>}</td>
                      <td>{l.quantity}</td><td>{money(l.unitPrice)}</td><td>{money(l.quantity * l.unitPrice)}</td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
        <h3 className="pk-du-h">Summary for the quote</h3>
        <p className="pk-du-text" style={{ whiteSpace: "pre-line" }}>{q.summary}</p>

        <div className="pk-du-st">
          {openQuote ? (
            <>
              <h3 className="pk-du-h">Quote {openQuote.estimateId} is on the job from this design ({money(openQuote.total)}{openQuote.at ? `, ${when(openQuote.at)}` : ""})</h3>
              <div className="pk-btns">
                <button type="button" className="pk-btn" disabled={pending || !ready} onClick={() => put("update")}>{pending ? "Working…" : `Update quote ${openQuote.estimateId}`}</button>
                <button type="button" className="pk-btn g" disabled={pending || !ready} onClick={() => put("new-dismiss")}>New quote, dismiss {openQuote.estimateId}</button>
              </div>
              <p className="pk-du-dim">Update swaps every line on that quote for these and rewrites its summary; the old lines only come off once the new ones are on. A new quote leaves the old one dismissed in ServiceTitan.</p>
            </>
          ) : (
            <>
              {quoted && <p className="pk-du-dim">Quote {quoted.estimateId} from this design is {quoted.state === "gone" ? "no longer in ServiceTitan" : quoted.state}, so this makes a new one.</p>}
              <button type="button" className="pk-btn" disabled={pending || !ready} onClick={() => put("new")}>{pending ? "Putting it on…" : `Put the quote on job ${job.number}`}</button>
            </>
          )}
          {!ready && <p className="pk-du-dim">{gaps.length ? "Pick an item for each part above first." : "Choose the unit first."}</p>}
          {done?.ok && (
            <div className={`pk-du-done${done.problems.length ? " warn" : ""}`} role="status">
              <p><b>{done.mode === "update" ? `Quote ${done.estimateId} updated` : `Quote ${done.estimateId} on job ${job.number}`}:</b> {money(done.expected)} before GST{done.landed != null && Math.abs(done.landed - done.expected) <= 0.5 ? ", and ServiceTitan shows the same" : ""}.{done.dismissed ? " The old quote was dismissed." : done.dismissed === false ? " The old quote couldn't be dismissed: do it in ServiceTitan." : ""}</p>
              {done.problems.length > 0 && <ul>{done.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
              <a className="pk-btn g" href={`https://go.servicetitan.com/#/Job/Index/${done.jobId}`} target="_blank" rel="noreferrer">Open the job in ServiceTitan</a>
            </div>
          )}
          {error && <p className="pk-du-miss" role="alert">{error}</p>}
        </div>
      </section>
    </div>
  );
}

/** A part with no pricebook match: search the pricebook, say how many for one of it, and keep the pick. */
function PickRow({ line, pickable, onPick }: { line: { name: string; quantity: number; missing?: string }; pickable: Sku[]; onPick: (need: string, items: PickItem[]) => void }) {
  const [find, setFind] = useState("");
  const [chosen, setChosen] = useState<(PickItem & { price: number })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, begin] = useTransition();
  const hits = useMemo(() => {
    const words = find.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return pickable.filter((s) => words.every((w) => s.name.toLowerCase().includes(w))).slice(0, 8);
  }, [find, pickable]);
  const need = line.name.trim();
  const keep = () => begin(async () => {
    setError(null);
    const items = chosen.map(({ skuId, skuType, name, per }) => ({ skuId, skuType, name, per }));
    const r = await pickPart(need, items);
    if (r.ok) onPick(need, items); else setError(r.error ?? "The pick didn't keep.");
  });
  return (
    <div className="pk-dd-pick">
      <p><b>{line.quantity} × {need}</b>{line.missing && line.missing !== need ? <span className="pk-du-dim"> · {line.missing}</span> : null}</p>
      <input className="pk-in" aria-label={`Search the pricebook for ${need}`} placeholder="Search the pricebook, e.g. return air box 1200" value={find} onChange={(e) => setFind(e.target.value)} />
      {hits.length > 0 && (
        <ul className="pk-dd-hits">
          {hits.map((s) => (
            <li key={`${s.skuType}:${s.skuId}`}>
              <button type="button" onClick={() => { setChosen((c) => c.some((x) => x.skuId === s.skuId && x.skuType === s.skuType) ? c : [...c, { skuId: s.skuId, skuType: s.skuType, name: s.name, per: 1, price: s.price }]); setFind(""); }}>
                {s.name.trim()} <span className="pk-du-dim">{money(s.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {chosen.length > 0 && (
        <div className="pk-dd-chosen">
          {chosen.map((c, i) => (
            <span key={`${c.skuType}:${c.skuId}`}>
              <input className="pk-in num" inputMode="decimal" aria-label={`How many ${c.name} for one`} value={String(c.per)} onChange={(e) => { const per = Number(e.target.value.replace(/[^0-9.]/g, "")) || 0; setChosen((cs) => cs.map((x, j) => (j === i ? { ...x, per } : x))); }} />
              × {c.name.trim()} <span className="pk-du-dim">for one</span>
              <button type="button" className="pk-du-x" aria-label={`Remove ${c.name}`} onClick={() => setChosen((cs) => cs.filter((_, j) => j !== i))}>×</button>
            </span>
          ))}
          <button type="button" className="pk-btn g" disabled={pending || chosen.some((c) => !(c.per > 0))} onClick={keep}>{pending ? "Keeping…" : "Use this, and remember it"}</button>
        </div>
      )}
      {error && <p className="pk-du-miss" role="alert">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------- standard materials */

/**
 * The standard install materials on every Duct design quote (Jake, 28 Nov):
 * each a pricebook item and how many, a job, a fan coil, by the drain's
 * metres or by what the design counts. Saved for everyone who quotes.
 */
function StandardList({ items, saved, pickable, coils, onSaved }: {
  items: StandardItem[]; saved: boolean; pickable: Sku[]; coils: number; onSaved: (items: StandardItem[]) => void;
}) {
  const [rows, setRows] = useState<StandardItem[]>(items);
  const [find, setFind] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, begin] = useTransition();
  const dirty = JSON.stringify(rows) !== JSON.stringify(items);
  const hits = useMemo(() => {
    const words = find.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return pickable.filter((s) => s.skuType === "Material" && words.every((w) => s.name.toLowerCase().includes(w)) && !rows.some((r) => r.skuId === s.skuId)).slice(0, 8);
  }, [find, pickable, rows]);
  const set = (i: number, patch: Partial<StandardItem>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = () => begin(async () => {
    setNote(null);
    const r = await saveStandardList(rows);
    if (r.ok) { onSaved(rows); setNote({ ok: true, text: "Saved. Every Duct design quote uses this list from now on." }); }
    else setNote({ ok: false, text: r.error ?? "The list didn't save." });
  });

  return (
    <details className="pk-card pk-pad pk-dd-std">
      <summary>
        <b>Standard install materials</b>
        <span className="pk-du-dim">{rows.length} items and the pair coil, on every Duct design quote{saved ? "" : " · the starting list, not saved yet"}</span>
      </summary>
      <p className="pk-du-dim">These go under the installation on each quote, in place of the unit&rsquo;s template kit, sized from the design: so many a job or a fan coil, one for every so many metres of condensate drain, or so many for each elbow or roll of tape the design counts.</p>
      <ul className="pk-dd-std-list">
        {rows.map((r, i) => (
          <li key={`${r.skuType}:${r.skuId}`}>
            <span className="nm">{r.name}</span>
            <input className="pk-in num" inputMode="decimal" aria-label={`How many ${r.name}`} value={String(r.n)} onChange={(e) => set(i, { n: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
            <select className="pk-in" aria-label={`${r.name}: counted how`} value={r.basis} onChange={(e) => set(i, { basis: e.target.value as Basis })}>
              {BASES.map((b) => <option key={b.basis} value={b.basis}>{b.label}</option>)}
            </select>
            <button type="button" className="pk-du-x" aria-label={`Take ${r.name} off the list`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
        <li className="coil">
          <span className="nm">Pair coil</span>
          <span className="pk-du-dim">the pricebook&rsquo;s coil at the design&rsquo;s pipe sizes, enough for the run{coils ? "" : " · no pair coils found in the pricebook"}</span>
        </li>
      </ul>
      <input className="pk-in" aria-label="Add an item from the pricebook" placeholder="Add from the pricebook, e.g. cable ties" value={find} onChange={(e) => setFind(e.target.value)} />
      {hits.length > 0 && (
        <ul className="pk-dd-hits">
          {hits.map((s) => (
            <li key={`${s.skuType}:${s.skuId}`}>
              <button type="button" onClick={() => { setRows((rs) => [...rs, { skuId: s.skuId, skuType: s.skuType, name: s.name.trim(), basis: "job", n: 1 }]); setFind(""); }}>
                {s.name.trim()} <span className="pk-du-dim">{money(s.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="pk-btns">
        <button type="button" className="pk-btn" disabled={pending || (!dirty && saved) || rows.some((r) => !(r.n > 0))} onClick={save}>{pending ? "Saving…" : saved || dirty ? "Save the list" : "Keep this list"}</button>
        {dirty && <button type="button" className="pk-btn g" disabled={pending} onClick={() => { setRows(items); setNote(null); }}>Undo changes</button>}
      </div>
      {note && <p className={note.ok ? "pk-du-dim" : "pk-du-miss"} role={note.ok ? "status" : "alert"}>{note.text}</p>}
    </details>
  );
}
