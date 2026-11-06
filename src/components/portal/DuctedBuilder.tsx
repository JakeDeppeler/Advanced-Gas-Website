"use client";

import { useMemo, useState } from "react";
import { buildDucted, DUCT_SIZES, DUCTED, standardLayout, type DuctSize, type DuctedCatalogue, type DuctedInput, type Outlet, type Zone } from "@/lib/ducted/plan";

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hrs = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, "")} h`;

/**
 * The ducted builder: the house's outlets and zones in, the quote out, as you
 * type. Starts on a standard 8-outlet, 4-zone house marked as an example, so
 * the screen shows what it does before anything is entered.
 */
export function DuctedBuilder({ cat }: { cat: DuctedCatalogue }) {
  const start = standardLayout();
  const [unitSkuId, setUnit] = useState<number | null>(cat.units[0]?.skuId ?? null);
  const [outlets, setOutlets] = useState<Outlet[]>(start.outlets);
  const [zones, setZones] = useState<Zone[]>(start.zones);
  const [doubleStorey, setDouble] = useState(false);
  const [extraHours, setExtraHours] = useState("");
  const [extraReason, setExtraReason] = useState("");
  const [extraSensors, setSensors] = useState("");
  const [notes, setNotes] = useState("");
  const [edited, setEdited] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const input: DuctedInput = { unitSkuId, outlets, zones, doubleStorey, extraHours: Number(extraHours) || 0, extraReason, extraSensors: Number(extraSensors) || 0, notes };
  const q = useMemo(() => buildDucted(input, cat), [JSON.stringify(input), cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = () => setEdited(true);
  const setOutlet = (i: number, patch: Partial<Outlet>) => { touch(); setOutlets((os) => os.map((o, j) => (j === i ? { ...o, ...patch } : o))); };
  const setZone = (i: number, patch: Partial<Zone>) => { touch(); setZones((zs) => zs.map((z, j) => (j === i ? { ...z, ...patch } : z))); };
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied(null); }
  };
  const linesText = q.lines.map((l) => `${l.quantity} × ${l.name}${l.missing ? " (not in pricebook)" : ""}  ${money(l.quantity * l.unitPrice)}`).join("\n");

  return (
    <div className="pk-du">
      <section className="pk-card pk-pad">
        <div className="pk-card-h"><b>The house</b><span>{edited ? "your layout" : "example: a standard 8-outlet, 4-zone house, change it to the job"}</span></div>
        <div className="pk-du-row">
          <label className="pk-du-f grow" htmlFor="du-unit"><span>Unit</span>
            <select id="du-unit" className="pk-in" value={unitSkuId ?? ""} onChange={(e) => { touch(); setUnit(Number(e.target.value) || null); }}>
              {cat.units.length === 0 && <option value="">No ducted units in the pricebook</option>}
              {cat.units.map((u) => <option key={u.skuId} value={u.skuId}>{u.name} · {money(u.price)}</option>)}
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
        <button type="button" className="pk-btn g pk-du-add" onClick={() => { touch(); setZones((zs) => [...zs, { name: `Zone ${zs.length + 1}`, damper: 250 }]); }}>Add a zone</button>

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
          <label className="pk-du-f" htmlFor="du-xs"><span>Extra sensors</span><input id="du-xs" className="pk-in num" inputMode="numeric" placeholder="0" value={extraSensors} onChange={(e) => { touch(); setSensors(e.target.value.replace(/[^0-9]/g, "")); }} /></label>
        </div>
        <label className="pk-du-f" htmlFor="du-notes"><span>Notes for the summary (from the site visit, the Condition Report)</span>
          <textarea id="du-notes" className="pk-in" rows={3} value={notes} onChange={(e) => { touch(); setNotes(e.target.value); }} />
        </label>
      </section>

      <section className="pk-card pk-pad">
        <div className="pk-card-h"><b>The quote</b><span>before GST</span></div>
        <div className="pk-du-sum">
          <div><span>Labour</span><b>{hrs(q.hours.total)}</b><em>{money(q.labour)}</em></div>
          <div><span>Materials &amp; parts</span><b>{q.lines.filter((l) => l.group === "install" && l.sku?.skuType === "Material").length} lines</b><em>{money(q.lines.filter((l) => l.group === "install" && l.sku?.skuType === "Material").reduce((a, l) => a + l.quantity * l.unitPrice, 0))}</em></div>
          <div className="tot"><span>Total</span><b>{money(q.total)}</b><em>{money(q.total * 1.1)} with GST</em></div>
        </div>
        <p className="pk-note">
          Hours: {DUCTED.baseHours} base + {outlets.length} outlets × {DUCTED.perOutlet} + {Math.round(q.hours.zones / DUCTED.perZone)} zones × {DUCTED.perZone} = {hrs(q.hours.layout)}
          {q.hours.floor ? `, so the two-day minimum of ${DUCTED.minHours} h applies` : ""}
          {q.hours.doubleStorey ? `, + ${q.hours.doubleStorey} h double storey` : ""}
          {q.hours.extra ? `, + ${hrs(q.hours.extra)} ${extraReason.trim() || "extra"}` : ""}. Two people at {cat.rate ? money(cat.rate) : "Our hourly rate"} an hour.
        </p>
        {q.missing.length > 0 && <p className="pk-du-miss" role="status"><b>Not priced:</b> {q.missing.join(" · ")}</p>}
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>Line</th><th>Qty</th><th>Each</th><th>Total</th></tr></thead>
            <tbody>
              {(["unit", "install", "extra"] as const).map((g) => q.lines.filter((l) => l.group === g).map((l, i) => (
                <tr key={`${g}-${i}`} className={l.missing ? "pk-du-bad" : g === "install" && i > 0 ? "pk-du-kid" : undefined}>
                  <td>{l.name}{l.missing ? " · not in the pricebook" : ""}</td><td>{l.quantity}</td><td>{money(l.unitPrice)}</td><td>{money(l.quantity * l.unitPrice)}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        <h3 className="pk-du-h">Summary for the quote</h3>
        <p className="pk-du-text">{q.summary}</p>
        <div className="pk-btns" style={{ alignItems: "center" }}>
          <button type="button" className="pk-btn" onClick={() => copy(q.summary, "summary")}>Copy the summary</button>
          <button type="button" className="pk-btn g" onClick={() => copy(linesText, "lines")}>Copy the lines</button>
          {copied && <span className="pk-said" role="status">Copied the {copied}.</span>}
        </div>
      </section>
    </div>
  );
}
