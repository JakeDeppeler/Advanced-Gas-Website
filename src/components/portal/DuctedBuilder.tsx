"use client";

import { useMemo, useState, useTransition } from "react";
import { buildDucted, DUCT_SIZES, DUCTED, GROUPS, standardLayout, type DuctSize, type DuctedCatalogue, type DuctedInput, type DuctedQuote, type Group, type Outlet, type Zone } from "@/lib/ducted/plan";
import { buildFromDesign, matchUnit, type DesignOptions } from "@/lib/ducted/design";
import { readTakeoff, type DesignTakeoff } from "@/lib/ducted/takeoff";
import type { PlanRead } from "@/lib/ducted/planShape";
import { lookUpJob, putQuoteOnJob, readDuctPlan, type PutResult, type QuoteSource } from "@/app/portal/ducted/actions";

type PlanZones = PlanRead["zones"];
import type { QuoteJob } from "@/lib/ducted/stQuote";

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hrs = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")} h`;
/** The designer's model code when there is one ("PEA-M125HAA"), else the unit as the notes named it ("Mitsubishi 16kW ducted"). */
const unitLabel = (s: string | null) => {
  const last = s?.trim().split(/\s+/).pop() ?? "";
  return !s ? "—" : /^[A-Z]{2,}[\w-]*\d/.test(last) ? last : s.trim();
};
const GROUP_LABEL: Record<Group, string> = { unit: "Unit", controls: "Zone controller", install: "Installation", extra: "Certificate" };

/**
 * Daily tools › Ducted quote. Two ways in: a Trust Trade plan (its drawing,
 * read by Claude with the office's notes, or its exact materials CSV), or the
 * house laid out by hand. Either way the quote is priced live from the
 * pricebook as it changes, and goes onto a job in ServiceTitan by its number.
 */
export function DuctedBuilder({ cat }: { cat: DuctedCatalogue }) {
  const [mode, setMode] = useState<"design" | "hand">("design");
  return (
    <>
      <div className="pk-seg pk-du-mode" role="tablist" aria-label="How to build the quote">
        <button type="button" role="tab" aria-selected={mode === "design"} className={mode === "design" ? "on" : ""} onClick={() => setMode("design")}>From a duct plan</button>
        <button type="button" role="tab" aria-selected={mode === "hand"} className={mode === "hand" ? "on" : ""} onClick={() => setMode("hand")}>By hand</button>
      </div>
      {mode === "design" ? <DesignQuote cat={cat} /> : <HandQuote cat={cat} />}
    </>
  );
}

/* ------------------------------------------------------------------ design */

type Picked = { name: string; kind: "csv" | "drawing"; text?: string; data?: string; mime?: string; preview?: string };

/** A drawing shrunk to 2400px on its long side and sent as JPEG: Claude reads it as well, and it uploads in a moment. */
async function shrink(f: File): Promise<{ data: string; mime: string; preview: string }> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("not an image")); i.src = url; });
    const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const jpeg = c.toDataURL("image/jpeg", 0.9);
    return { data: jpeg.split(",")[1], mime: "image/jpeg", preview: jpeg };
  } finally { URL.revokeObjectURL(url); }
}
const base64 = (f: File) => new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] ?? ""); r.onerror = () => bad(r.error); r.readAsDataURL(f); });

function DesignQuote({ cat }: { cat: DuctedCatalogue }) {
  const [file, setFile] = useState<Picked | null>(null);
  const [info, setInfo] = useState("");
  const [read, setRead] = useState<{ takeoff: DesignTakeoff | null; zones: PlanZones } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [reading, startRead] = useTransition();
  const [unitSkuId, setUnit] = useState<number | null>(null);
  const [doubleStorey, setDouble] = useState(false);
  const [extraHours, setExtraHours] = useState("");
  const [extraReason, setExtraReason] = useState("");
  const [itcs, setItcs] = useState("");
  const [notes, setNotes] = useState("");
  const [drag, setDrag] = useState(false);

  // The designer's CSV reads here as it drops; a drawing is read by Claude when asked.
  const t: DesignTakeoff | null = useMemo(() => (file?.kind === "csv" && file.text ? readTakeoff(file.text) : read?.takeoff ?? null), [file, read]);
  const options: DesignOptions = { unitSkuId, doubleStorey, extraHours: Number(extraHours) || 0, extraReason, itcs: itcs === "" ? null : Number(itcs), notes };
  const q = useMemo(() => (t && !t.problem ? buildFromDesign(t, options, cat) : null), [t, JSON.stringify(options), cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const take = async (f: File | undefined | null) => {
    if (!f) return;
    setRead(null); setReadError(null); setUnit(null); setItcs("");
    if (/\.csv$/i.test(f.name) || f.type === "text/csv") {
      setFile(f.size > 300_000 ? { name: f.name, kind: "csv", text: "" } : { name: f.name, kind: "csv", text: await f.text() });
      return;
    }
    if (f.type === "application/pdf") {
      if (f.size > 5_000_000) { setReadError("That PDF is over 5 MB: export the plan as a PNG instead."); return; }
      setFile({ name: f.name, kind: "drawing", data: await base64(f), mime: "application/pdf" });
      return;
    }
    if (!f.type.startsWith("image/")) { setReadError("Drop the plan as a PNG, JPEG or PDF, or the designer's materials CSV."); return; }
    try { setFile({ name: f.name, kind: "drawing", ...(await shrink(f)) }); } catch { setReadError("That image couldn't be opened."); }
  };

  const readIt = () => startRead(async () => {
    setReadError(null);
    const r = await readDuctPlan({ file: file?.kind === "drawing" && file.data && file.mime ? { data: file.data, mime: file.mime } : null, notes: info });
    if (!r.ok) { setReadError(r.error); return; }
    setRead({ takeoff: r.takeoff ?? (file?.kind === "drawing" ? null : read?.takeoff ?? null), zones: r.zones });
    // What the notes said, into the fields, where they say something.
    const o = r.options;
    const unit = matchUnit({ indoor: o.unitModel, outdoor: null, kw: o.unitKw }, cat.units);
    if (unit && (o.unitKw || o.unitModel)) setUnit(unit.skuId);
    setDouble(o.doubleStorey);
    if (o.extraHours > 0) { setExtraHours(String(o.extraHours)); setExtraReason(o.extraReason); }
    if (o.notes) setNotes(o.notes);
  });
  const ductM = t ? Object.values(t.runMetres).reduce((a, n) => a + n, 0) : 0;
  const source: QuoteSource | null = !t ? null : file?.kind === "csv" && file.text
    ? { kind: "design", csv: file.text, fileName: file.name, options }
    : { kind: "plan", takeoff: t, fileName: file?.name ?? "", options };

  return (
    <div className="pk-du">
      <section className="pk-card pk-pad">
        <div className="pk-card-h"><b>The plan</b><span>the designer&rsquo;s drawing, or Outputs › Materials › CSV</span></div>
        <label
          htmlFor="du-file" className={`pk-du-drop${drag ? " on" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
        >
          <input id="du-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.csv,text/csv" onChange={(e) => take(e.target.files?.[0])} />
          {file?.preview && <img src={file.preview} alt="" className="pk-du-thumb" />}
          <b>{file ? file.name : "Drop the duct plan here"}</b>
          <span>{file ? "Drop another to replace it" : "the drawing (PNG, JPEG or PDF) or the materials CSV · or tap to choose"}</span>
        </label>
        <label className="pk-du-f pk-du-gap" htmlFor="du-info"><span>Information about the job</span>
          <textarea id="du-info" className="pk-in" rows={4} value={info} onChange={(e) => setInfo(e.target.value)}
            placeholder="e.g. Mitsubishi 16kW. Single storey, tile roof. Remove the old Brivis ducted heater and all its ducting. Customer wants it done before Christmas." />
        </label>
        <div className="pk-btns pk-du-gap" style={{ alignItems: "center" }}>
          <button type="button" className="pk-btn" disabled={reading || (!file && !info.trim()) || (file?.kind === "csv" && !info.trim())} onClick={readIt}>
            {reading ? "Reading the plan…" : file?.kind === "csv" ? "Read the notes" : "Read the plan"}
          </button>
          {reading && <span className="pk-du-dim" role="status">Counting outlets and following the runs: up to a minute.</span>}
        </div>
        {readError && <p className="pk-du-miss" role="alert">{readError}</p>}
        {t?.problem && <p className="pk-du-miss" role="alert">{t.problem}</p>}
        {file?.kind === "csv" && !file.text && <p className="pk-du-miss" role="alert">That file is too big to be the designer&rsquo;s materials list.</p>}

        {t && !t.problem && q && (
          <>
            <dl className="pk-du-read">
              <div><dt>Unit</dt><dd title={t.indoor ?? undefined}>{unitLabel(t.indoor)}{t.kw && !/kw/i.test(t.indoor ?? "") ? ` · ${t.kw} kW` : ""}</dd></div>
              <div><dt>Outlets</dt><dd>{q.outlets}</dd></div>
              <div><dt>Zones</dt><dd>{q.zones}</dd></div>
              <div><dt>Take-offs</dt><dd>{t.takeoffs.reduce((a, f) => a + f.qty, 0)}</dd></div>
              <div><dt>Duct runs</dt><dd>{Math.round(ductM)} m</dd></div>
            </dl>
            {read?.zones && read.zones.length > 0 && (
              <div className="pk-tbl-wrap pk-du-gap">
                <table className="pk-tbl pk-du-zones">
                  <thead><tr><th>Zone</th><th>Damper</th><th>Outlets read off the plan</th></tr></thead>
                  <tbody>
                    {read.zones.map((z) => (
                      <tr key={z.number}>
                        <td>{z.number} · {z.name}</td>
                        <td>{z.damper ? `Ø${z.damper}` : "—"}</td>
                        <td>{z.outlets.map((o) => `${o.room} Ø${o.size} · ${o.metres} m`).join("; ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="pk-du-h">On this job</h3>
            <div className="pk-du-row">
              <label className="pk-du-f grow" htmlFor="du-dunit"><span>Unit{q.suggested || unitSkuId ? "" : " · nothing matched: choose it"}</span>
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
            <label className="pk-du-f" htmlFor="du-dnotes"><span>Notes for the quote&rsquo;s summary</span>
              <textarea id="du-dnotes" className="pk-in" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </>
        )}
        {!file && <p className="pk-note pk-du-gap">Drop the designer&rsquo;s plan drawing and say what you know about the job: the plan is read for its outlets, duct sizes, take-offs and zones, and each is priced from the pricebook. The materials CSV from the designer works too, and is exact.</p>}
      </section>

      {q && source ? (
        <QuoteCard q={q} rate={cat.rate} source={source}
          hoursNote={`${DUCTED.baseHours} base + ${q.outlets} outlets × ${DUCTED.perOutlet} + ${q.zones} zones × ${DUCTED.perZone} = ${hrs(q.hours.layout)}`} extraReason={extraReason} />
      ) : (
        <section className="pk-card pk-pad"><div className="pk-card-h"><b>The quote</b><span>before GST</span></div><p className="pk-note">{file?.kind === "drawing" && !read ? "Read the plan and the quote follows." : "Drop the plan and the quote follows."}</p></section>
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
  const groupSum = (g: Group) => q.lines.filter((l) => l.group === g).reduce((a, l) => a + l.quantity * l.unitPrice, 0);
  // As ServiceTitan gets it: each line at its own price, in its group.
  const linesText = GROUPS.flatMap((g) => q.lines.filter((l) => l.group === g).map((l, i) =>
    `${i ? "    " : ""}${l.quantity} × ${l.name.trim()}${l.missing ? " (not in pricebook)" : ""}  ${money(l.quantity * l.unitPrice)}`)).join("\n");

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
        {q.hours.extra ? `, + ${hrs(q.hours.extra)} ${extraReason.trim() || "extra"}` : ""}. Two days&rsquo; labour is {money(DUCTED.twoDayPrice)}, and time past two days is {rate ? money(rate) : "Our hourly rate"} an hour.
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
              // As it lands in ServiceTitan (Jake, 25 Nov, job 20867): the customer sees the group's
              // total; inside it every line keeps its own price, so the materials' cost shows, with the
              // installation line at $0 and the temperature controls at $0.
              return [
                <tr key={`${g}-h`} className="pk-du-grp"><td colSpan={3}>{GROUP_LABEL[g]}</td><td>{money(groupSum(g))}</td></tr>,
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
