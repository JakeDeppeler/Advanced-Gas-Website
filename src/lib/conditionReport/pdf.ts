// A Condition Report as a PDF, to go with a work order: the same look as the
// install pack (logo on white, orange rule, cream box, headings with a short
// orange underline) so the two read as one set. Pure apart from pdf-lib.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { drawable, own, wrap } from "@/lib/installpack/pdf";
import { LOGO_FULL_JPG, LOGO_FULL_SIZE } from "@/lib/installpack/logo";
import { site as business } from "@/lib/site";
import { LIGHT_WORD, type Light, type Report } from "./report";

const W = 595.28;
const H = 841.89;
const M = 36;

const NAVY = rgb(5 / 255, 10 / 255, 48 / 255);
const SKY = rgb(0, 176 / 255, 237 / 255);
const ORANGE = rgb(243 / 255, 103 / 255, 34 / 255);
const CREAM = rgb(243 / 255, 239 / 255, 229 / 255);
const LINE = rgb(235 / 255, 230 / 255, 216 / 255);
const INK = rgb(0.1, 0.11, 0.18);
const GREY = rgb(0.4, 0.42, 0.5);
// The light the tech picked. Colour is never the only signal: the lights sit
// in a fixed order (red, amber, green), the picked one is larger and ringed,
// and its name is written beside them.
const LIGHT_RGB: Record<Light, ReturnType<typeof rgb>> = {
  0: rgb(194 / 255, 32 / 255, 42 / 255),
  1: rgb(232 / 255, 160 / 255, 0),
  2: rgb(30 / 255, 140 / 255, 70 / 255),
};

export async function reportPdf(r: Report, madeAt: Date): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${r.title}${r.jobNumber ? ` · job ${r.jobNumber}` : ""}`);
  doc.setAuthor("Advanced Gas & Aircon");
  doc.setCreator("Advanced Gas team portal");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedJpg(own(Buffer.from(LOGO_FULL_JPG, "base64"))).catch(() => null);

  let page!: PDFPage;
  let y = 0;
  const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) =>
    page.drawText(drawable(f, s), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size: number, f: PDFFont, color = INK) => {
    const t = drawable(f, s);
    page.drawText(t, { x: xRight - f.widthOfTextAtSize(t, size), y, size, font: f, color });
  };

  const BAND = 70;
  const band = (first: boolean) => {
    page = doc.addPage([W, H]);
    const lw = 140;
    const lh = (lw * LOGO_FULL_SIZE.height) / LOGO_FULL_SIZE.width;
    if (logo) page.drawImage(logo, { x: M, y: H - BAND / 2 - lh / 2 + 2, width: lw, height: lh });
    else { y = H - BAND / 2 - 4; text("Advanced Gas & Aircon", M, 16, bold, NAVY); }
    page.drawRectangle({ x: 0, y: H - BAND - 3, width: W, height: 3, color: ORANGE });
    y = H - BAND / 2 + 9;
    right(first ? "CONDITION REPORT · JOB" : "CONDITION REPORT, CONTINUED · JOB", W - M, 8.5, bold, SKY);
    y -= 22;
    right(r.jobNumber ?? "", W - M, 22, bold, NAVY);
    y = H - BAND - 3 - 24;
  };
  const LIMIT = M + 28;
  const IN = M + 12;
  const IN_R = W - M - 12;
  let heading: string | null = null;
  const strip = (title: string, note?: string) => {
    const top = y;
    y = top - 16;
    text(title, M, 12.5, bold, NAVY);
    if (note) right(note, W - M, 8, font, GREY);
    page.drawRectangle({ x: M, y: top - 24, width: 34, height: 2.5, color: ORANGE });
    page.drawLine({ start: { x: M + 34, y: top - 22.75 }, end: { x: W - M, y: top - 22.75 }, thickness: 0.6, color: LINE });
    y = top - 24 - 18;
  };
  const room = (h: number) => {
    if (y - h >= LIMIT) return;
    band(false);
    if (heading) strip(`${heading} (continued)`);
  };
  const open = (title: string, note?: string, need = 80) => {
    heading = null;
    room(need);
    heading = title;
    strip(title, note);
  };
  const close = () => { heading = null; y -= 14; };
  const para = (s: string, size = 10.5, f: PDFFont = font, color = INK) => {
    for (const l of wrap(f, size, s, IN_R - IN)) { room(size + 3); text(l, IN, size, f, color); y -= size + 3; }
  };

  band(true);

  /* ---- what was looked at, and where */
  text(r.equipment || r.title, M, 13, bold, NAVY);
  y -= 16;
  if (r.customer) { text(r.customer, M, 10.5, font, GREY); y -= 10; }
  y -= 6;

  const BOX_W = W - 2 * M;
  const PAD = 12;
  const COL = (BOX_W - 2 * PAD) / 2;
  const addr = r.site ? wrap(bold, 14, r.site, BOX_W - 2 * PAD) : [];
  const cells = r.facts.map(([k, v]) => ({ k, v: wrap(font, 10, v, COL - 10) }));
  const rowsH: number[] = [];
  for (let i = 0; i < cells.length; i += 2) rowsH.push(Math.max(...cells.slice(i, i + 2).map((c) => 11 + c.v.length * 12.5)) + 8);
  const boxH = PAD + (addr.length ? 10 + addr.length * 17 + 6 : 0) + rowsH.reduce((a, b) => a + b, 0) + PAD - 8;
  if (addr.length || cells.length) {
    const top = y;
    page.drawRectangle({ x: M, y: y - boxH, width: BOX_W, height: boxH, color: CREAM });
    page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: ORANGE });
    y -= PAD + 8;
    if (addr.length) {
      text("SITE", M + PAD, 7.5, bold, GREY);
      y -= 16;
      for (const l of addr) { text(l, M + PAD, 14, bold, NAVY); y -= 17; }
      y -= 6;
    }
    for (let i = 0; i < cells.length; i += 2) {
      const rowTop = y;
      cells.slice(i, i + 2).forEach((c, j) => {
        y = rowTop;
        const x = M + PAD + j * COL;
        text(c.k.toUpperCase(), x, 7.5, bold, GREY);
        y -= 12.5;
        for (const l of c.v) { text(l, x, 10, font, INK); y -= 12.5; }
      });
      y = rowTop - rowsH[i / 2];
    }
    y = top - boxH - 14;
  }

  /* ---- the traffic light(s) */
  if (r.lights.length) {
    open(r.lights.length === 1 ? r.lights[0].name || "Condition" : "Condition", undefined, 90);
    for (const l of r.lights) {
      room(56);
      if (r.lights.length > 1) { text(l.name, IN, 10, bold, NAVY); y -= 16; }
      const cy = y - 10;
      ([0, 1, 2] as Light[]).forEach((k, i) => {
        const cx = IN + 12 + i * 34;
        const on = l.light === k;
        if (on) page.drawCircle({ x: cx, y: cy, size: 14, borderColor: NAVY, borderWidth: 1.6 });
        // The ones not picked faint, still in their own colour, so the order
        // reads on screen; the name under each carries it on a grey printout.
        page.drawCircle({ x: cx, y: cy, size: on ? 11 : 8, color: LIGHT_RGB[k], opacity: on ? 1 : 0.22 });
        const name = LIGHT_WORD[k];
        const f = on ? bold : font;
        page.drawText(name, { x: cx - f.widthOfTextAtSize(name, 6.5) / 2, y: cy - 25, size: 6.5, font: f, color: on ? NAVY : GREY });
      });
      y = cy - 5;
      const word = l.light == null ? "Not answered" : LIGHT_WORD[l.light];
      text(word, IN + 12 + 3 * 34, 18, bold, l.light == null ? GREY : NAVY);
      y = cy - 36;
      if (l.comment) para(l.comment, 10, font, GREY);
      y -= 4;
    }
    close();
  }

  /* ---- what the tech wrote, and how many photos with it */
  for (const n of r.notes) {
    open(n.name, n.photos ? `${n.photos} photo${n.photos === 1 ? "" : "s"} taken with this, on the job in ServiceTitan` : undefined, 60);
    if (n.text) para(n.text);
    else { text("Photos only, no words.", IN, 10, font, GREY); y -= 14; }
    close();
  }

  /* ---- signed */
  if (r.signature) {
    open("Signed", undefined, 110);
    const sig = r.signature.png ? await doc.embedPng(own(Buffer.from(r.signature.png, "base64"))).catch(() => null) : null;
    if (sig) {
      const scale = Math.min(220 / sig.width, 70 / sig.height, 1);
      const w = sig.width * scale;
      const h = sig.height * scale;
      room(h + 30);
      page.drawImage(sig, { x: IN, y: y - h, width: w, height: h });
      y -= h + 6;
      page.drawLine({ start: { x: IN, y }, end: { x: IN + 220, y }, thickness: 0.6, color: GREY });
      y -= 12;
    } else if (r.signature.refused) {
      para(`Not signed: ${r.signature.refused}`, 10, font, GREY);
    } else {
      para("No signature on the report.", 10, font, GREY);
    }
    const line = [r.signature.by, r.submittedOn ? new Date(r.submittedOn).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" }) : null].filter(Boolean).join(" · ");
    if (line) { text(line, IN, 9, font, GREY); y -= 12; }
    close();
  }

  /* ---- footer on every page */
  const pages = doc.getPages();
  const made = madeAt.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: M + 4 }, end: { x: W - M, y: M + 4 }, thickness: 0.6, color: LINE });
    pg.drawText(drawable(bold, `Advanced Gas & Aircon · ${business.phone}`), { x: M, y: M - 8, size: 7.5, font: bold, color: NAVY });
    const t = drawable(font, `The tech's ${r.title} from ServiceTitan, made ${made} · page ${i + 1} of ${pages.length}`);
    pg.drawText(t, { x: W - M - font.widthOfTextAtSize(t, 7.5), y: M - 8, size: 7.5, font, color: GREY });
  });

  return doc.save();
}
