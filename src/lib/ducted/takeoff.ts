/**
 * The materials list the Trust Trade designer exports (Outputs › Materials ›
 * CSV), read into what the ducted quote prices from. Pure, so the builder can
 * run it in the browser as the file is dropped and `npm run check:ducted` can
 * hold it against the designer's own output.
 *
 * Why the CSV and not the drawing: the drawing labels the trunk sizes but not
 * the runs to each outlet, and gives no lengths. The CSV is the designer's
 * engine's own takeoff, so every size, take-off and damper is exact (Jake,
 * 24 Nov: "it my tool … i could get it to give you a list to export").
 *
 * The lines are read by their wording, which comes from the engine
 * (engine.wasm in the Trusttrade.website repo). A line that isn't recognised
 * is kept and shown as not on the quote, never dropped, so a new kind of line
 * from a later version of the designer surfaces instead of vanishing.
 */

export type TakeoffRow = { group: string; item: string; detail: string; qty: number; unit: string };

export type TakeOff = { ways: number; in: number; outs: number[]; qty: number; text: string };

export type DesignTakeoff = {
  indoor: string | null;
  outdoor: string | null;
  /** The capacity the designer picked, from the outdoor unit's detail ("12.5 kW ducted split"). */
  kw: number | null;
  /** 6 m lengths by size: the supply runs and the return air duct together. */
  duct: Record<number, number>;
  /** Metres of supply run by size, as the designer measured them: for the summary and a sense check, not the price. */
  runMetres: Record<number, number>;
  takeoffs: TakeOff[];
  transitions: number;
  /** Round ceiling diffusers by size: each is a downjet on the quote. */
  diffusers: Record<number, number>;
  /** Linear slot diffusers, bar grilles, floor and bulkhead grilles: outlets for the hours, priced by hand. */
  otherOutlets: number;
  returnGrilles: { w: number; h: number; qty: number }[];
  returnBoxes: number;
  collars: Record<number, number>;
  joiners: Record<number, number>;
  dampers: Record<number, number>;
  cables: number;
  /** The zones the designer's controller line names ("Wall tablet + zone controller · 5 zones"). */
  zones: number | null;
  itc: number;
  /** Mounting, drainage, fixing and the pair coil: the unit's own kit in the pricebook covers these. */
  kitLines: number;
  /** Every line not read into the above, as the designer wrote it. */
  unread: TakeoffRow[];
  /** Set when the file isn't a ducted materials list at all. */
  problem: string | null;
};

/** RFC 4180 CSV: quoted fields, doubled quotes inside them, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

export function takeoffRows(text: string): TakeoffRow[] | null {
  const rows = parseCsv(text);
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const at = (name: string) => head.indexOf(name);
  const [g, it, d, q, u] = [at("group"), at("item"), at("detail"), at("qty"), at("unit")];
  if (it < 0 || q < 0) return null;
  return rows.slice(1).map((r) => ({
    group: (r[g] ?? "").trim(), item: (r[it] ?? "").trim(), detail: d < 0 ? "" : (r[d] ?? "").trim(),
    qty: Number((r[q] ?? "").replace(/[^0-9.]/g, "")) || 0, unit: u < 0 ? "" : (r[u] ?? "").trim(),
  })).filter((r) => r.item);
}

const mm = (s: string) => Number(/Ø\s*(\d{2,3})/.exec(s)?.[1] ?? NaN);
const bump = (m: Record<number, number>, k: number, n: number) => { if (Number.isFinite(k) && n > 0) m[k] = (m[k] ?? 0) + n; };

export function readTakeoff(text: string): DesignTakeoff {
  const out: DesignTakeoff = {
    indoor: null, outdoor: null, kw: null, duct: {}, runMetres: {}, takeoffs: [], transitions: 0, diffusers: {}, otherOutlets: 0,
    returnGrilles: [], returnBoxes: 0, collars: {}, joiners: {}, dampers: {}, cables: 0, zones: null, itc: 0, kitLines: 0, unread: [], problem: null,
  };
  const rows = takeoffRows(text);
  if (!rows) return { ...out, problem: "This isn't the designer's materials list: it needs the Group, Item and Qty columns. In the designer, Outputs › Materials › CSV." };
  if (!rows.length) return { ...out, problem: "The materials list is empty." };

  for (const r of rows) {
    const { item, detail, qty } = r;
    let m: RegExpExecArray | null;
    if ((m = /^Indoor unit \(ducted\) · (.+)$/i.exec(item))) out.indoor = m[1].trim();
    else if ((m = /^Outdoor unit · (.+)$/i.exec(item))) {
      out.outdoor = m[1].trim();
      const kw = /(\d+(?:\.\d+)?)\s*kW/i.exec(detail);
      if (kw) out.kw = Number(kw[1]);
    } else if (/^Insulated flex duct Ø/i.test(item) || /^Return air duct Ø/i.test(item)) {
      bump(out.duct, mm(item), qty);
      const metres = /^(\d+(?:\.\d+)?)\s*m\b/.exec(detail);
      if (metres && /^Insulated flex duct/i.test(item)) bump(out.runMetres, mm(item), Number(metres[1]));
    } else if ((m = /^Branch take-off, (\d)-way/i.exec(item))) {
      // "Ø350 in → Ø300 · Ø200": the outlet sizes are what pick the fitting.
      const legs = /Ø\s*(\d{2,3})\s*in\s*→\s*(.+)$/i.exec(detail);
      const outs = legs ? [...legs[2].matchAll(/Ø\s*(\d{2,3})/g)].map((x) => Number(x[1])) : [];
      const inlet = legs ? Number(legs[1]) : mm(item);
      if (!legs || outs.length < 2) out.unread.push(r);   // added by hand in the catalogue: no legs to size it by
      else out.takeoffs.push({ ways: outs.length, in: inlet, outs, qty, text: `${item} (${detail})` });
    } else if (/^Transition \(plenum\)|^Supply plenum with/i.test(item)) out.transitions += qty;
    else if (/^Round ceiling diffuser Ø/i.test(item)) bump(out.diffusers, mm(item), qty);
    else if (/^(Linear slot diffuser|Linear bar grille|Floor grille|Side-blow bar grille|Supply grille)/i.test(item)) { out.otherOutlets += qty; out.unread.push(r); }
    else if ((m = /^Return air (?:filter )?grille\b.*?(\d{3,4})\s*[×x]\s*(\d{3,4})/i.exec(item))) out.returnGrilles.push({ w: Number(m[1]), h: Number(m[2]), qty });
    else if (/^Return air box/i.test(item)) out.returnBoxes += qty;
    else if (/^Starting collar Ø/i.test(item)) bump(out.collars, mm(item), qty);
    else if (/^Flex duct joiner Ø/i.test(item)) bump(out.joiners, mm(item), qty);
    else if (/^Motorised zone damper Ø/i.test(item)) bump(out.dampers, mm(item), qty);
    else if (/^Zone damper cable/i.test(item)) out.cables += qty;
    else if (/^Wall tablet \+ zone controller/i.test(item)) { const z = /(\d+)\s*zones?/i.exec(detail); out.zones = z ? Number(z[1]) : null; }
    else if (/\(ITC\)$/i.test(item)) out.itc += qty;
    else if (/^(Mounting & drainage|Fixing & sealing)$/i.test(r.group) || /^Pair coil/i.test(item)) out.kitLines++;
    else out.unread.push(r);
  }

  if (!out.indoor && !Object.keys(out.diffusers).length && !out.takeoffs.length) {
    out.problem = /head|bulkhead|wall head|branch box/i.test(rows.map((r) => r.item).join(" "))
      ? "This is a multi-head split's materials list. The ducted quote needs a ducted design."
      : "Nothing in this file reads as a ducted design: no indoor unit, outlets or take-offs.";
  }
  return out;
}

export const outletCount = (t: DesignTakeoff) => Object.values(t.diffusers).reduce((a, n) => a + n, 0) + t.otherOutlets;
export const damperCount = (t: DesignTakeoff) => Object.values(t.dampers).reduce((a, n) => a + n, 0);
/** The zones the job is priced on: the controller's own count, else a zone per damper. */
export const zoneCount = (t: DesignTakeoff) => t.zones ?? damperCount(t);
