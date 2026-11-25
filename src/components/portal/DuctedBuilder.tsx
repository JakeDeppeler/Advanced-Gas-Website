"use client";

import { useMemo, useState, useTransition } from "react";
import { buildDucted, DUCT_SIZES, DUCTED, GROUPS, standardLayout, type DuctSize, type DuctedCatalogue, type DuctedInput, type DuctedQuote, type Group, type Outlet, type Zone } from "@/lib/ducted/plan";
import { buildFromDesign, type DesignOptions } from "@/lib/ducted/design";
import { readTakeoff } from "@/lib/ducted/takeoff";
import { lookUpJob, putQuoteOnJob, type PutResult, type QuoteSource } from "@/app/portal/ducted/actions";
import type { QuoteJob } from "@/lib/ducted/stQuote";

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hrs = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")} h`;
const GROUP_LABEL: Record<Group, string> = { unit: "Unit", controls: "Zone controller", install: "Installation", extra: "Certificate" };

/**
 * Pipeline › Ducted quote. Two ways in: the Trust Trade designer's materials
 * list (the design's own sizes, take-offs and zones), or the house laid out by
 * hand. Either way the quote is priced live from the pricebook as it changes,
 * and goes onto a job in ServiceTitan by its number.
 */
export function DuctedBuilder({ cat }: { cat: DuctedCatalogue }) {
  const [mode, setMode] = useState<"design" | "hand">("design");
  return (
    <>
      <div className="pk-seg pk-du-mode" role="tablist" aria-label="How to build the quote">
        <button type="button" role="tab" aria-selected={mode === "design"} className={mode === "design" ? "on" : ""} onClick={() => setMode("design")}>From a Trust Trade design</button>
        <button type="button" role="tab" aria-selected={mode === "hand"} className={mode === "hand" ? "on" : ""} onClick={() => setMode("hand")}>By hand</button>
      </div>
      {mode === "design" ? <DesignQuote cat={cat} /> : <HandQuote cat={cat} />}
    </>
  );
}

/* ------------------------------------------------------------------ design */

function DesignQuote({ cat }: { cat: DuctedCatalogue }) {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [unitSkuId, setUnit] = useState<number | null>(null);
  const [doubleStorey, setDouble] = useState(false);
  const [extraHours, setExtraHours] = useState("");
  const [extraReason, setExtraReason] = useState("");
  const [itcs, setItcs] = useState("");
  const [notes, setNotes] = useState("");
  const [drag, setDrag] = useState(false);

  const t = useMemo(() => (file ? readTakeoff(file.text) : null), [file]);
  const options: DesignOptions = { unitSkuId, doubleStorey, extraHours: Number(extraHours) || 0, extraReason, itcs: itcs === "" ? null : Number(itcs), notes };
  const q = useMemo(() => (t && !t.problem ? buildFromDesign(t, options, cat) : null), [t, JSON.stringify(options), cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const take = async (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > 300_000) { setFile({ name: f.name, text: "" }); return; }
    setFile({ name: f.name, text: await f.text() });
    setUnit(null); setItcs("");
  };
  const ductM = t ? Object.values(t.runMetres).reduce((a, n) => a + n, 0) : 0;

  return (
    <div className="pk-du">
      <section className="pk-card pk-pad">
        <div className="pk-card-h"><b>The design</b><span>in the designer: Outputs › Materials › CSV</span></div>
        <label
          htmlFor="du-file" className={`pk-du-drop${drag ? " on" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
        >
          <input id="du-file" type="file" accept=".csv,text/csv" onChange={(e) => take(e.target.files?.[0])} />
          <b>{file ? file.name : "Drop the materials CSV here"}</b>
          <span>{file ? "Drop another to replace it" : "or tap to choose it"}</span>
        </label>
        {t?.problem && <p className="pk-du-miss" role="alert">{t.problem}</p>}
        {file && !file.text && <p className="pk-du-miss" role="alert">That file is too big to be the designer&rsquo;s materials list.</p>}

        {t && !t.problem && q && (
          <>
            <dl className="pk-du-read">
              <div><dt>Unit</dt><dd title={t.indoor ?? undefined}>{t.indoor?.split(" ").pop() ?? "—"}{t.kw ? ` · ${t.kw} kW` : ""}</dd></div>
              <div><dt>Outlets</dt><dd>{q.outlets}</dd></div>
              <div><dt>Zones</dt><dd>{q.zones}</dd></div>
              <div><dt>Take-offs</dt><dd>{t.takeoffs.reduce((a, f) => a + f.qty, 0)}</dd></div>
              <div><dt>Duct runs</dt><dd>{Math.round(ductM)} m</dd></div>
            </dl>

            <h3 className="pk-du-h">On this job</h3>
            <div className="pk-du-row">
              <label className="pk-du-f grow" htmlFor="du-dunit"><span>Unit{q.suggested ? "" : " · nothing matched the design's"}</span>
                <select id="du-dunit" className="pk-in" value={q.unit?.skuId ?? ""} onChange={(e) => setUnit(Number(e.target.value) || null)}>
                  {!q.unit && <option value="">Choose the unit</option>}
                  {cat.units.map((u) => <option key={u.skuId} value={u.skuId}>{u.name.trim()} · {money(u.price)}{q.suggested?.skuId === u.skuId ? " · matches the design" : ""}</option>)}
                </select>
              </label>
              <label className="pk-du-check" htmlFor="du-ddouble"><input id="du-ddouble" type="checkbox" checked={doubleStorey} onChange={(e) => setDouble(e.target.checked)} /> Double storey <span className="pk-du-dim">+{DUCTED.doubleStorey} h</span></label>
            </div>
            <div className="pk-du-row">
              <label className="pk-du-f" htmlFor="du-ditc"><span>Temperature controls</span><input id="du-ditc" className="pk-in num" inputMode="numeric" placeholder={String(t.itc || q.zones)} value={itcs} onChange={(e) => setItcs(e.target.value.replace(/[^0-9]/g, ""))} /></label>
              <label className="pk-du-f" htmlFor="du-dxh"><span>Extra hours</span><input id="du-dxh" className="pk-in num" inputMode="decimal" placeholder="0" value={extraHours} onChange={(e) => setExtraHours(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
              <label className="pk-du-f grow" htmlFor="du-dxr"><span>For</span><input id="du-dxr" className="pk-in" placeholder="e.g. a tight roof space, or taking the old ducting out" value={extraReason} onChange={(e) => setExtraReason(e.target.value)} /></label>
            </div>
            <label className="pk-du-f" htmlFor="du-dnotes"><span>Notes for the summary (from the site visit, the Condition Report)</span>
              <textarea id="du-dnotes" className="pk-in" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </>
        )}
        {!file && <p className="pk-note pk-du-gap">The designer&rsquo;s materials list has every duct size, take-off, outlet and damper the design needs. Each is priced from the pricebook at its own size; the hours come from the outlets and zones, on the same rules as a quote by hand.</p>}
      </section>

      {q ? (
        <QuoteCard q={q} rate={cat.rate} source={{ kind: "design", csv: file!.text, fileName: file!.name, options }}
          hoursNote={`${DUCTED.baseHours} base + ${q.outlets} outlets × ${DUCTED.perOutlet} + ${q.zones} zones × ${DUCTED.perZone} = ${hrs(q.hours.layout)}`} extraReason={extraReason} />
      ) : (
        <section className="pk-card pk-pad"><div className="pk-card-h"><b>The quote</b><span>before GST</span></div><p className="pk-note">Drop the design&rsquo;s materials list and the quote follows.</p></section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- hand */

function HandQuote({ cat }: { cat: DuctedCatalogue }) {
  const start = standardLayout();
  const [unitSkuId, setUnit] = useState<number | null>(cat.units[0]?.skuId ?? null);
  const [outlets, setOutlets] = useState<Outlet[]>(start.outlets);
  const [zones, setZones] = useState<Zone[]>(start.zones);
  const [doubleStorey, setDouble] = useState(false);
  const [extraHours, setExtraHours] = useState("");
  const [extraReason, setExtraReason] = useState("");
  const [itcs, setItcs] = useState("");
  const [notes, setNotes] = useState("");
  const [edited, setEdited] = useState(false);

  const input: DuctedInput = { unitSkuId, outlets, zones, doubleStorey, extraHours: Number(extraHours) || 0, extraReason, itcs: itcs === "" ? null : Number(itcs), notes };
  const q = useMemo(() => buildDucted(input, cat), [JSON.stringify(input), cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = () => setEdited(true);
  const setOutlet = (i: number, patch: Partial<Outlet>) => { touch(); setOutlets((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o))); };
  const setZone = (i: number, patch: Partial<Zone>) => { touch(); setZones((zs) => zs.map((z, j) => (j === i ? { ...z, ...patch } : z))); };
  const zonesUsed = Math.round(q.hours.zones / DUCTED.perZone);

  return (
    <div className="pk-du">
      <section className="pk-card pk-pad">
        <div className="pk-card-h"><b>The house</b><span>{edited ? "your layout" : "example: a standard 8-outlet, 4-zone house, change it to the job"}</span></div>
        <div className="pk-du-row">
          <label className="pk-du-f grow" htmlFor="du-unit"><span>Unit</span>
            <select id="du-unit" className="pk-in" value={unitSkuId ?? ""} onChange={(e) => { touch(); setUnit(Number(e.target.value) || null); }}>
              {cat.units.length === 0 && <option value="">No ducted units in the pricebook</option>}
              {cat.units.map((u) => <option key={u.skuId} value={u.skuId}>{u.name.trim()} · {money(u.price)}</option>)}
            </select>
          </label>
          <label className="pk-du-check" htmlFor="du-double"><input id="du-double" type="checkbox" checked={doubleStorey} onChange={(e) => { touch(); setDouble(e.target.checked); }} /> Double storey <span className="pk-du-dim">+{DUCTED.doubleStorey} h</span></label>
        </div>

        <h3 className="pk-du-h">Zones</h3>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl pk-du-tbl">
            <thead><tr><th>#</th><th>Zone</th><th>Damper mm</th><th className="l">Outlets</th><th /></tr></thead>
            <tbody>
              {zones.map((z, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td><input id={`du-zn-${i}`} className="pk-in" value={z.name} aria-label={`Zone ${i + 1} name`} onChange={(e) => setZone(i, { name: e.target.value })} /></td>
                  <td><select id={`du-zd-${i}`} className="pk-in" value={z.damper} aria-label={`Zone ${i + 1} damper`} onChange={(e) => setZone(i, { damper: Number(e.target.value) as DuctSize })}>{DUCT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="l">{outlets.filter((o) => o.zone === i + 1).length}</td>
                  <td>{zones.length > 1 && <button type="button" className="pk-du-x" aria-label={`Remove zone ${i + 1}`} onClick={() => { touch(); setZones((zs) => zs.filter((_, j) => j !== i)); setOutlets((os) => os.map((o) => (o.zone === i + 1 ? { ...o, zone: 1 } : o.zone > i + 1 ? { ...o, zone: o.zone - 1 } : o))); }}>×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="pk-btn g pk-du-add" disabled={zones.length >= DUCTED.maxZones} onClick={() => { touch(); setZones((zs) => [...zs, { name: `Zone ${zs.length + 1}`, damper: 250 }]); }}>Add a zone</button>

        <h3 className="pk-du-h">Outlets</h3>
        <div className="pk-tbl-wrap">
          <table className="pk-tbl pk-du-tbl">
            <thead><tr><th>Room</th><th>Duct mm</th><th>Run</th><th>Zone</th><th /></tr></thead>
            <tbody>
              {outlets.map((o, i) => (
                <tr key={i}>
                  <td><input id={`du-or-${i}`} className="pk-in" value={o.room} aria-label={`Outlet ${i + 1} room`} onChange={(e) => setOutlet(i, { room: e.target.value })} /></td>
                  <td><select id={`du-os-${i}`} className="pk-in" value={o.size} aria-label={`Outlet ${i + 1} duct size`} onChange={(e) => setOutlet(i, { size: Number(e.target.value) as DuctSize })}>{DUCT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td><span className="pk-du-m"><input id={`du-om-${i}`} className="pk-in num" inputMode="decimal" value={String(o.metres)} aria-label={`Outlet ${i + 1} run in metres`} onChange={(e) => setOutlet(i, { metres: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} /> m</span></td>
                  <td><select id={`du-oz-${i}`} className="pk-in" value={o.zone} aria-label={`Outlet ${i + 1} zone`} onChange={(e) => setOutlet(i, { zone: Number(e.target.value) })}>{zones.map((z, j) => <option key={j} value={j + 1}>{j + 1} · {z.name || `Zone ${j + 1}`}</option>)}</select></td>
                  <td><button type="button" className="pk-du-x" aria-label={`Remove outlet ${i + 1}`} onClick={() => { touch(); setOutlets((os) => os.filter((_, j) => j !== i)); }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="pk-btn g pk-du-add" onClick={() => { touch(); setOutlets((os) => [...os, { room: "", size: 200, metres: 8, zone: 1 }]); }}>Add an outlet</button>

        <h3 className="pk-du-h">Anything harder</h3>
        <div className="pk-du-row">
          <label className="pk-du-f" htmlFor="du-xh"><span>Extra hours</span><input id="du-xh" className="pk-in num" inputMode="decimal" placeholder="0" value={extraHours} onChange={(e) => { touch(); setExtraHours(e.target.value.replace(/[^0-9.]/g, "")); }} /></label>
          <label className="pk-du-f grow" htmlFor="du-xr"><span>For</span><input id="du-xr" className="pk-in" placeholder="e.g. a tight roof space, or taking the old ducting out" value={extraReason} onChange={(e) => { touch(); setExtraReason(e.target.value); }} /></label>
          <label className="pk-du-f" htmlFor="du-xs"><span>Temperature controls</span><input id="du-xs" className="pk-in num" inputMode="numeric" placeholder={String(zonesUsed)} value={itcs} onChange={(e) => { touch(); setItcs(e.target.value.replace(/[^0-9]/g, "")); }} /></label>
        </div>
        <label className="pk-du-f" htmlFor="du-notes"><span>Notes for the summary (from the site visit, the Condition Report)</span>
          <textarea id="du-notes" className="pk-in" rows={3} value={notes} onChange={(e) => { touch(); setNotes(e.target.value); }} />
        </label>
      </section>

      <QuoteCard q={q} rate={cat.rate} source={{ kind: "layout", input }}
        hoursNote={`${DUCTED.baseHours} base + ${outlets.length} outlets × ${DUCTED.perOutlet} + ${zonesUsed} zones × ${DUCTED.perZone} = ${hrs(q.hours.layout)}`} extraReason={extraReason} />
    </div>
  );
}

/* ------------------------------------------------------------------- quote */

function QuoteCard({ q, rate, source, hoursNote, extraReason }: { q: DuctedQuote; rate: number | null; source: QuoteSource; hoursNote: string; extraReason: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied(null); }
  };
  // Everything under the installation head bar the services: the ITCs are equipment but sit with the materials.
  const materials = q.lines.filter((l) => l.group === "install" && l.sku && l.sku.skuType !== "Service");
  const linesText = q.lines.map((l) => `${l.quantity} × ${l.name}${l.missing ? " (not in pricebook)" : ""}  ${money(l.quantity * l.unitPrice)}`).join("\n");

  return (
    <section className="pk-card pk-pad">
      <div className="pk-card-h"><b>The quote</b><span>before GST</span></div>
      <div className="pk-du-sum">
        <div><span>Labour</span><b>{hrs(q.hours.total)}</b><em>{money(q.labour)}</em></div>
        <div><span>Materials &amp; parts</span><b>{materials.length} lines</b><em>{money(materials.reduce((a, l) => a + l.quantity * l.unitPrice, 0))}</em></div>
        <div className="tot"><span>Total</span><b>{money(q.total)}</b><em>{money(q.total * 1.1)} with GST</em></div>
      </div>
      <p className="pk-note">
        Hours: {hoursNote}
        {q.hours.floor ? `, so the two-day minimum of ${DUCTED.minHours} h applies` : ""}
        {q.hours.doubleStorey ? `, + ${q.hours.doubleStorey} h double storey` : ""}
        {q.hours.extra ? `, + ${hrs(q.hours.extra)} ${extraReason.trim() || "extra"}` : ""}. Two people at {rate ? money(rate) : "Our hourly rate"} an hour.
      </p>
      {q.missing.length > 0 && (
        <div className="pk-du-warn" role="status"><b>Check before it goes on</b><ul>{q.missing.map((m, i) => <li key={i}>{m}</li>)}</ul></div>
      )}
      <div className="pk-tbl-wrap">
        <table className="pk-tbl pk-du-lines">
          <thead><tr><th>Line</th><th>Qty</th><th>Each</th><th>Total</th></tr></thead>
          <tbody>
            {GROUPS.map((g) => {
              const ls = q.lines.filter((l) => l.group === g);
              if (!ls.length) return null;
              const sum = ls.reduce((a, l) => a + l.quantity * l.unitPrice, 0);
              return [
                <tr key={`${g}-h`} className="pk-du-grp"><td colSpan={3}>{GROUP_LABEL[g]}</td><td>{money(sum)}</td></tr>,
                ...ls.map((l, i) => (
                  <tr key={`${g}-${i}`} className={l.missing ? "pk-du-bad" : i > 0 ? "pk-du-kid" : undefined}>
                    <td>{l.name.trim()}{l.missing ? " · not in the pricebook" : ""}{l.note && <span className="pk-du-note">{l.note}</span>}</td>
                    <td>{l.quantity}</td><td>{money(l.unitPrice)}</td><td>{money(l.quantity * l.unitPrice)}</td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      <h3 className="pk-du-h">Summary for the quote</h3>
      <p className="pk-du-text">{q.summary}</p>
      <div className="pk-btns" style={{ alignItems: "center" }}>
        <button type="button" className="pk-btn g" onClick={() => copy(q.summary, "summary")}>Copy the summary</button>
        <button type="button" className="pk-btn g" onClick={() => copy(linesText, "lines")}>Copy the lines</button>
        {copied && <span className="pk-said" role="status">Copied the {copied}.</span>}
      </div>
      <SendToServiceTitan source={source} ready={q.lines.some((l) => l.group === "unit" && l.sku)} />
    </section>
  );
}

/* ---------------------------------------------------------- ServiceTitan */

function SendToServiceTitan({ source, ready }: { source: QuoteSource; ready: boolean }) {
  const [number, setNumber] = useState("");
  const [job, setJob] = useState<QuoteJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PutResult | null>(null);
  const [pending, start] = useTransition();

  const find = () => start(async () => {
    setError(null); setJob(null); setDone(null);
    const r = await lookUpJob(number);
    if (r.ok) setJob(r.job); else setError(r.error);
  });
  const put = () => start(async () => {
    setError(null);
    const r = await putQuoteOnJob(job!.number, source);
    if (r.ok) setDone(r); else setError(r.error);
  });

  return (
    <div className="pk-du-st">
      <h3 className="pk-du-h">Put it on a job in ServiceTitan</h3>
      <form className="pk-du-row" onSubmit={(e) => { e.preventDefault(); find(); }}>
        <label className="pk-du-f" htmlFor="du-job"><span>Job number</span>
          <input id="du-job" className="pk-in num" inputMode="numeric" placeholder="20950" value={number} onChange={(e) => { setNumber(e.target.value.replace(/[^0-9]/g, "")); setJob(null); setDone(null); setError(null); }} />
        </label>
        <button type="submit" className="pk-btn g" disabled={pending || number.length < 3}>{pending && !job ? "Finding…" : "Find the job"}</button>
      </form>
      {job && !done && (
        <div className="pk-du-job">
          <p><b>Job {job.number}</b>{job.customer ? ` · ${job.customer}` : ""}{job.address ? ` · ${job.address}` : ""}</p>
          <p className="pk-du-dim">{[job.type, job.status].filter(Boolean).join(" · ")}</p>
          <button type="button" className="pk-btn" disabled={pending || !ready} onClick={put}>{pending ? "Putting it on…" : `Create the quote on job ${job.number}`}</button>
          {!ready && <p className="pk-du-dim">Choose the unit first.</p>}
          <p className="pk-du-dim">It goes on as a quote the customer hasn&rsquo;t been sent, priced again from the pricebook as it is now.</p>
        </div>
      )}
      {done?.ok && (
        <div className={`pk-du-done${done.problems.length ? " warn" : ""}`} role="status">
          <p><b>On job {job?.number}:</b> &ldquo;{done.name}&rdquo;, {money(done.expected)} before GST{done.landed != null && Math.abs(done.landed - done.expected) <= 0.5 ? ", and ServiceTitan shows the same" : ""}. {done.heads} groups, {done.underLanded} of {done.under} lines under them.{done.noted ? " A note on the job says where it came from." : ""}</p>
          {done.problems.length > 0 && <ul>{done.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          <a className="pk-btn g" href={`https://go.servicetitan.com/#/Job/Index/${done.jobId}`} target="_blank" rel="noreferrer">Open the job in ServiceTitan</a>
        </div>
      )}
      {error && <p className="pk-du-miss" role="alert">{error}</p>}
    </div>
  );
}
