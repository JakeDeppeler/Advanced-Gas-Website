/**
 * A Trust Trade duct plan drawing, read by Claude, turned into the takeoff the
 * ducted quote prices (takeoff.ts › DesignTakeoff). Pure: the shape Claude is
 * asked for, the rules it reads by, and the conversion, so the conversion can
 * be held by `npm run check:ducted` without a call to Claude.
 *
 * Jake, 25 Nov: "i want to be able to upload this duct plan and i give it a
 * text box of information and it creates the quote". The drawing is the
 * designer's own plan image. It labels the trunk sizes, and its duct colours
 * are the designer's size palette (reports.js › DUCT in the Trusttrade.website
 * repo), so the runs to each outlet can be sized by colour. It gives no
 * lengths: those are measured off the drawing against its dimension strings,
 * and the quote says so.
 */

import { DUCT_SIZES } from "./plan";
import type { DesignTakeoff, TakeOff } from "./takeoff";

/** The designer's duct colours (reports.js › DUCT): ≤150 red, ≤200 blue, ≤250 yellow, ≤300 green, ≤350 grey, ≤400 magenta, else purple. */
export const DUCT_COLOURS = "red Ø150, blue Ø200, yellow Ø250, green Ø300, light grey Ø350, magenta/pink Ø400, purple Ø450";

export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    readable: { type: "boolean" },
    problem: { type: "string" },
    zones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          number: { type: "integer" },
          name: { type: "string" },
          damper: { type: "integer" },
          outlets: {
            type: "array",
            items: {
              type: "object",
              properties: { room: { type: "string" }, size: { type: "integer" }, metres: { type: "number" } },
              required: ["room", "size", "metres"],
              additionalProperties: false,
            },
          },
        },
        required: ["number", "name", "damper", "outlets"],
        additionalProperties: false,
      },
    },
    trunks: {
      type: "array",
      items: { type: "object", properties: { size: { type: "integer" }, metres: { type: "number" } }, required: ["size", "metres"], additionalProperties: false },
    },
    takeoffs: {
      type: "array",
      items: { type: "object", properties: { in: { type: "integer" }, outs: { type: "array", items: { type: "integer" } } }, required: ["in", "outs"], additionalProperties: false },
    },
    returnAir: {
      type: "object",
      properties: { ducts: { type: "integer" }, size: { type: "integer" }, metres: { type: "number" } },
      required: ["ducts", "size", "metres"],
      additionalProperties: false,
    },
    unitKw: { type: "number" },
    unitModel: { type: "string" },
    doubleStorey: { type: "boolean" },
    extraHours: { type: "number" },
    extraReason: { type: "string" },
    summaryNotes: { type: "string" },
    checks: { type: "array", items: { type: "string" } },
  },
  required: ["readable", "problem", "zones", "trunks", "takeoffs", "returnAir", "unitKw", "unitModel", "doubleStorey", "extraHours", "extraReason", "summaryNotes", "checks"],
  additionalProperties: false,
} as const;

export type PlanRead = {
  readable: boolean; problem: string;
  zones: { number: number; name: string; damper: number; outlets: { room: string; size: number; metres: number }[] }[];
  trunks: { size: number; metres: number }[];
  takeoffs: { in: number; outs: number[] }[];
  returnAir: { ducts: number; size: number; metres: number };
  unitKw: number; unitModel: string; doubleStorey: boolean; extraHours: number; extraReason: string; summaryNotes: string;
  checks: string[];
};

export const PLAN_RULES = `You read a ducted air conditioning plan drawn in the Trust Trade Pro HVAC designer, for Advanced Gas & Aircon in Melbourne, so the office can price it. You also read the office's notes about the job. You only report what's there: you never invent a room, a run or a size, and anything you can't read goes in "checks".

How the designer draws a plan:
- The fan coil is the black box marked FAN COIL; the outdoor unit is marked OUTDOOR.
- Each duct is a thick coloured line, and its colour is its diameter: ${DUCT_COLOURS}. Some runs are also labelled ("ø300"), which confirms the colour.
- A small square grid icon at the end of a run is a ceiling outlet (a round diffuser). Its size is the colour of the run feeding it.
- The black Y or branch fittings are take-offs. A take-off's inlet is the size of the duct coming from the fan coil side; its outlets are the sizes of the ducts leaving it.
- The small numbered coloured markers on the take-offs (1, 2, 3 …) are the zone dampers; the number is the zone. A damper's size is the duct size where the marker sits.
- Zone cards ("Zone 4 · 2.10 kW · 105 L/s · 19.8 m²") name each zone; rooms are shaded by zone. A zone with no card still counts if it has a damper marker.
- The long bar grille labelled "RA 2×Ø450" (or similar) is the return air: the number of return ducts and their size.
- The drawing is to scale: use its dimension strings (in millimetres) to measure each run along its drawn path, and add half a metre at each end for the drops. Round each run to the half metre.

What to report:
- "zones": every zone, with its number, its name from its card or its rooms, its damper size (0 if there isn't one), and every outlet in it: the room, the outlet's size, and the length of the run from its take-off to the outlet.
- "trunks": every other run, from the fan coil to a take-off or between take-offs, with its size and length.
- "takeoffs": every take-off, its inlet size and the sizes of its outlets.
- "returnAir": the number of return ducts, their size, and the length of one of them from the grille to the fan coil (0 if not shown).
- From the office's notes: "unitKw" and "unitModel" if they name the unit (0 and "" if not); "doubleStorey"; "extraHours" and "extraReason" only for extra work the notes describe (a tight roof, removing old ducting, a second storey run), with the hours the notes give, or 0; and "summaryNotes": one or two plain sentences for the quote's summary from anything the customer should see (what comes out, what stays, access), or "".
- "checks": anything uncertain, each as one short sentence the office can act on ("Zone 3 has no card: its rooms were read as Bathroom and PDR"). Also say if the total outlets or zones on the cards don't match what you counted.
- "readable": false only if the image isn't a duct plan or is too unclear to count outlets; then say why in "problem", otherwise "problem" is "".
- With no drawing attached, read only the notes: leave zones, trunks and takeoffs empty, returnAir all 0, and "readable" true.
Sizes are whole millimetres from 150, 200, 250, 300, 350, 400, 450.`;

const SIZES = DUCT_SIZES as readonly number[];
const okSize = (n: unknown) => SIZES.includes(Number(n));
const metres = (n: unknown) => Math.max(0, Math.min(40, Math.round(Number(n) * 2) / 2 || 0));
/** A run is bought by the 6 m bag: each run its own, as the designer counts them (one bag per outlet run up to 6 m). */
const bags = (m: number) => Math.max(1, Math.ceil(m / 6));
const bump = (o: Record<number, number>, k: number, n: number) => { if (n > 0) o[k] = (o[k] ?? 0) + n; };

/** The plan as read, as the takeoff the quote is priced from. Anything outside the sizes the designer uses is said, not priced. */
export function planToTakeoff(r: PlanRead): DesignTakeoff {
  const t: DesignTakeoff = {
    indoor: r.unitModel?.trim() || null, outdoor: null, kw: r.unitKw > 0 ? r.unitKw : null,
    duct: {}, runMetres: {}, takeoffs: [], transitions: 0, diffusers: {}, otherOutlets: 0, returnGrilles: [], returnBoxes: 0,
    collars: {}, joiners: {}, dampers: {}, cables: 0, zones: null, itc: 0, kitLines: 0, unread: [], checks: [...(r.checks ?? [])],
    problem: r.readable ? null : r.problem?.trim() || "The drawing couldn't be read as a duct plan.",
  };
  const zones = (r.zones ?? []).filter((z) => z.outlets?.length || z.damper);
  for (const z of zones) {
    for (const o of z.outlets ?? []) {
      if (!okSize(o.size)) { t.checks!.push(`${o.room || `An outlet in zone ${z.number}`}: a Ø${o.size} outlet isn't a size the designer uses, so it isn't priced`); continue; }
      const m = metres(o.metres);
      bump(t.diffusers, o.size, 1);
      bump(t.duct, o.size, bags(m));
      bump(t.runMetres, o.size, m);
    }
    const largest = Math.max(0, ...(z.outlets ?? []).map((o) => Number(o.size)).filter(okSize));
    const damper = okSize(z.damper) ? z.damper : largest;
    if (damper) { bump(t.dampers, damper, 1); t.cables++; }
  }
  for (const tr of r.trunks ?? []) {
    if (!okSize(tr.size)) continue;
    const m = metres(tr.metres);
    if (m > 0) { bump(t.duct, tr.size, bags(m)); bump(t.runMetres, tr.size, m); }
  }
  const seen = new Map<string, TakeOff>();
  for (const f of r.takeoffs ?? []) {
    const outs = (f.outs ?? []).filter(okSize).sort((a, b) => b - a);
    if (!okSize(f.in) || outs.length < 2) { t.checks!.push(`A take-off read as Ø${f.in} → ${(f.outs ?? []).map((x) => `Ø${x}`).join(" · ")} can't be sized: add it by hand`); continue; }
    const key = `${f.in}:${outs.join(".")}`;
    const had = seen.get(key);
    if (had) had.qty++;
    else seen.set(key, { ways: outs.length, in: f.in, outs, qty: 1, text: `Ø${f.in} → ${outs.map((x) => `Ø${x}`).join(" · ")}` });
  }
  t.takeoffs = [...seen.values()];
  if (zones.length || t.takeoffs.length) t.transitions = 1;

  // Return air: its ducts and their starting collars from the plan. The grille's size isn't drawn, so it's
  // the bigger of the two the pricebook stocks for a two-duct or 400+ return, and the quote says so.
  const ra = r.returnAir ?? { ducts: 0, size: 0, metres: 0 };
  if (ra.ducts > 0 && okSize(ra.size)) {
    bump(t.duct, ra.size, ra.ducts * bags(metres(ra.metres) || 4));
    bump(t.collars, ra.size, ra.ducts);
    const big = ra.ducts >= 2 || ra.size >= 400;
    t.returnGrilles.push({ w: big ? 1200 : 600, h: 400, qty: 1 });
    t.checks!.push(`Return air grille: the plan doesn't size it, so it's ${big ? "1200" : "600"} × 400 for ${ra.ducts} × Ø${ra.size}. Check it suits`);
  }

  t.zones = zones.length || null;
  t.itc = zones.length;
  if (zones.length) t.checks!.push("Run lengths are measured off the drawing, not taken from the designer: check them before ordering");
  return t;
}

/** The job options the notes gave, for the builder's fields. */
export const planOptions = (r: PlanRead) => ({
  unitKw: r.unitKw > 0 ? r.unitKw : null,
  unitModel: r.unitModel?.trim() || null,
  doubleStorey: !!r.doubleStorey,
  extraHours: Math.max(0, Math.min(40, Number(r.extraHours) || 0)),
  extraReason: (r.extraReason ?? "").trim(),
  notes: (r.summaryNotes ?? "").trim(),
});
