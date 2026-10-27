// An install pack as a PDF, for the install job in ServiceTitan: the job and
// booking, what's going in, the materials and where each was ordered, the
// work on the quote, the quote's scope word for word, then the photos two to a
// page. Pure apart from pdf-lib, so it can be rendered from a fixture.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import type { Pack, PackLine, Photo } from "./build";

const W = 595.28;
const H = 841.89;
const M = 40;
const INK = rgb(0.1, 0.1, 0.12);
const GREY = rgb(0.42, 0.42, 0.45);
const RULE = rgb(0.82, 0.82, 0.84);
const WARN = rgb(0.62, 0.22, 0.05);

/**
 * The standard fonts only carry Windows-1252, and a quote can hold anything
 * pasted into it. A character the font can't draw becomes "?" rather than
 * failing the pack.
 */
function drawable(font: PDFFont, s: string): string {
  let out = "";
  for (const ch of s.replace(/\t/g, "    ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")) {
    try { font.encodeText(ch); out += ch; } catch { out += "?"; }
  }
  return out;
}

function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
  const out: string[] = [];
  // Split before cleaning: a newline isn't in the font, and would print as "?".
  for (const para of text.split("\n").map((t) => drawable(font, t))) {
    let line = "";
    for (const w of para.split(/(\s+)/)) {
      const next = line + w;
      if (font.widthOfTextAtSize(next, size) <= width || !line.trim()) { line = next; continue; }
      out.push(line.trimEnd());
      line = w.trimStart();
    }
    out.push(line.trimEnd());
  }
  return out;
}

export type PackPhoto = { photo: Photo; bytes: Uint8Array };

export type PackMeta = {
  version: number;
  madeAt: Date;
  /** Photos on the jobs that couldn't go in: HEIC, or past the size the pack can carry. */
  notShown: number;
};

export async function packPdf(pack: Pack, photos: PackPhoto[], meta: PackMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pack.title);
  doc.setCreator("Advanced Gas team portal");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const room = (h: number) => { if (y - h < M + 24) newPage(); };
  const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) =>
    page.drawText(drawable(f, s), { x, y, size, font: f, color });

  /* ---- heading */
  text(pack.title, M, 20, bold);
  y -= 24;
  for (const h of pack.heading) {
    for (const l of wrap(font, 11, h, W - 2 * M)) { text(l, M, 11, font, GREY); y -= 14; }
  }
  y -= 6;

  /* ---- the facts: when, who, ring, which quote */
  for (const [k, v] of pack.facts) {
    const lines = wrap(font, 10, v, W - 2 * M - 80);
    room(lines.length * 13 + 2);
    text(k, M, 10, bold);
    for (const l of lines) { text(l, M + 80, 10); y -= 13; }
    y -= 2;
  }

  const heading = (s: string) => {
    room(40);
    y -= 12;
    page.drawLine({ start: { x: M, y: y + 14 }, end: { x: W - M, y: y + 14 }, thickness: 0.6, color: RULE });
    text(s, M, 13, bold);
    y -= 18;
  };

  /* ---- units and materials: qty, item (code under it), where it was ordered */
  const QTY = 34;
  const ITEM = 270;
  const ORD_X = M + QTY + ITEM + 10;
  const ORD_W = W - M - ORD_X;
  const table = (rows: PackLine[]) => {
    room(16);
    text("Qty", M, 8, bold, GREY);
    text("Item", M + QTY, 8, bold, GREY);
    text("Ordered", ORD_X, 8, bold, GREY);
    y -= 15;
    for (const r of rows) {
      const name = wrap(font, 10, r.name, ITEM);
      const code = r.code ? wrap(font, 8, r.code, ITEM) : [];
      const ord = wrap(font, 9, r.ordered, ORD_W);
      const h = Math.max(name.length * 12 + code.length * 10, ord.length * 11);
      room(h + 9);
      const top = y;
      text(r.qty, M, 10, bold);
      for (const l of name) { text(l, M + QTY, 10); y -= 12; }
      for (const l of code) { text(l, M + QTY, 8, font, GREY); y -= 10; }
      y = top;
      // "Not on an order" and anything not yet sent are in a darker red and
      // say so in words: the colour only agrees with what's written.
      const sent = /, sent /.test(r.ordered);
      for (const l of ord) { text(l, ORD_X, 9, sent ? font : bold, sent ? GREY : WARN); y -= 11; }
      // The rule sits under this row's descenders and clear of the next
      // row's capitals: y is a baseline, and text rises above it.
      y = top - h;
      page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.3, color: RULE });
      y -= 9;
    }
  };

  heading("Going in");
  if (pack.units.length) table(pack.units); else { text("No equipment on the quote.", M, 10, font, GREY); y -= 14; }

  heading("Materials");
  if (pack.materials.length) table(pack.materials); else { text("No materials on the quote.", M, 10, font, GREY); y -= 14; }

  const bullets = (items: string[]) => {
    for (const it of items) {
      const lines = wrap(font, 10, it, W - 2 * M - 12);
      room(lines.length * 13);
      text("•", M, 10);
      for (const l of lines) { text(l, M + 12, 10); y -= 13; }
    }
  };
  if (pack.work.length) { heading("Work on the quote"); bullets(pack.work); }
  if (pack.contractors.length) { heading("Contractors"); bullets(pack.contractors); }

  const para = (s: string) => {
    for (const l of wrap(font, 10, s, W - 2 * M)) { room(13); text(l, M, 10); y -= 13; }
  };
  if (pack.scope) { heading("Scope, from the sold quote"); para(pack.scope); }
  if (pack.jobNotes) { heading("Notes on the job"); para(pack.jobNotes); }

  /* ---- photos, two to a page */
  const embedded: { img: PDFImage; p: Photo }[] = [];
  let failed = 0;
  for (const ph of photos) {
    try {
      const img = /\.png$/i.test(ph.photo.name) ? await doc.embedPng(ph.bytes) : await doc.embedJpg(ph.bytes);
      embedded.push({ img, p: ph.photo });
    } catch {
      failed++;
    }
  }
  const unshown = meta.notShown + failed;
  if (embedded.length || unshown) {
    heading("Photos");
    text(
      `${embedded.length ? `${embedded.length} photo${embedded.length === 1 ? "" : "s"} on the following pages, newest first.` : "No photos could go in."}${unshown ? ` ${unshown} more on the job in ServiceTitan.` : ""}`,
      M, 10, font, GREY,
    );
    y -= 14;
  }
  const SLOT = (H - 2 * M - 24 - 2 * 18) / 2;
  embedded.forEach(({ img, p }, i) => {
    if (i % 2 === 0) newPage();
    const scale = Math.min((W - 2 * M) / img.width, (SLOT - 4) / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    const top = H - M - (i % 2) * (SLOT + 18);
    page.drawImage(img, { x: M + (W - 2 * M - w) / 2, y: top - h, width: w, height: h });
    y = top - SLOT - 12;
    const when = p.at ? new Date(p.at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" }) : null;
    text([p.quoteVisit ? "Quote visit" : "This job", when, p.name].filter(Boolean).join(" · "), M, 8, font, GREY);
  });

  /* ---- footer on every page */
  const pages = doc.getPages();
  const made = meta.madeAt.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
  pages.forEach((pg, i) => {
    pg.drawText(drawable(font, `Install pack ${meta.version ? `v${meta.version}` : "preview, not on the job"} · made ${made} from ServiceTitan · replaces any earlier version · page ${i + 1} of ${pages.length}`), {
      x: M, y: M - 16, size: 7.5, font, color: GREY,
    });
  });

  return doc.save();
}
