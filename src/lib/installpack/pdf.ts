// An install pack as a PDF, for the install job in ServiceTitan, in the
// website's colours: the full logo on white with the job number beside it, an
// orange rule, the address and booking in a cream box, then the scope of works
// sold word for word, the notes on the job and the contractors, then the
// equipment and the materials with a tick box each for loading the van, then
// the photos four to a page. The plain style Jake picked on 28 Oct from four
// mock-ups: headings with a short orange underline rather than boxes, and the
// long lists shaded every other row so a line can be followed across the page.
// Pure apart from pdf-lib, so it can be rendered from a fixture.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import type { Pack, PackLine, Photo } from "./build";
import { LOGO_FULL_JPG, LOGO_FULL_SIZE } from "./logo";
import { site } from "@/lib/site";

const W = 595.28;
const H = 841.89;
const M = 36;

// tailwind.config: navy-900, cyan-500 (sky), flame-500/600, warm-50/100/200.
const NAVY = rgb(5 / 255, 10 / 255, 48 / 255);
const SKY = rgb(0, 176 / 255, 237 / 255);
const ORANGE = rgb(243 / 255, 103 / 255, 34 / 255);
const CREAM = rgb(243 / 255, 239 / 255, 229 / 255);
const LINE = rgb(235 / 255, 230 / 255, 216 / 255);
const ZEBRA = rgb(0.985, 0.975, 0.955);
const INK = rgb(0.1, 0.11, 0.18);
const GREY = rgb(0.4, 0.42, 0.5);
// Not ordered / not sent: flame-700 and signal-600, dark enough to read as
// text on white. Each also says so in words; the colour only agrees.
const WAITING = rgb(168 / 255, 53 / 255, 20 / 255);
const MISSING = rgb(194 / 255, 32 / 255, 42 / 255);

/**
 * The standard fonts only carry Windows-1252, and a quote can hold anything
 * pasted into it. A character the font can't draw becomes "?" rather than
 * failing the pack.
 */
function drawable(font: PDFFont, s: string): string {
  let out = "";
  for (const ch of s.replace(/\t/g, "    ")) {
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

/**
 * The bytes as an array of their own. pdf-lib reads a JPEG through
 * `new DataView(bytes.buffer)`, from the start of the underlying buffer, and
 * ignores where in it the image begins. A Buffer handed out from Node's shared
 * pool starts part-way into a bigger one, and pdf-lib then reads someone
 * else's bytes and stops at "SOI not found in JPEG". On 28 Oct that failed
 * seven packs in a row on the server while every local render passed.
 */
const own = (bytes: Uint8Array) => (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice());

export async function packPdf(pack: Pack, photos: PackPhoto[], meta: PackMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pack.title);
  doc.setAuthor("Advanced Gas & Aircon");
  doc.setCreator("Advanced Gas team portal");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  // A logo that won't embed costs the pack its logo, not the pack: the name
  // goes in its place.
  const logo = await doc.embedJpg(own(Buffer.from(LOGO_FULL_JPG, "base64"))).catch(() => null);

  let page!: PDFPage;
  let y = 0;
  const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) =>
    page.drawText(drawable(f, s), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size: number, f: PDFFont, color = INK) => {
    const t = drawable(f, s);
    page.drawText(t, { x: xRight - f.widthOfTextAtSize(t, size), y, size, font: f, color });
  };

  /* ---- the header, on every page: the logo, and the job number */
  const BAND = 70;
  const band = (first: boolean) => {
    page = doc.addPage([W, H]);
    const lw = 140;
    const lh = (lw * LOGO_FULL_SIZE.height) / LOGO_FULL_SIZE.width;
    if (logo) page.drawImage(logo, { x: M, y: H - BAND / 2 - lh / 2 + 2, width: lw, height: lh });
    else { y = H - BAND / 2 - 4; text("Advanced Gas & Aircon", M, 16, bold, NAVY); }
    page.drawRectangle({ x: 0, y: H - BAND - 3, width: W, height: 3, color: ORANGE });
    y = H - BAND / 2 + 9;
    right(first ? "INSTALL PACK · JOB" : "INSTALL PACK, CONTINUED · JOB", W - M, 8.5, bold, SKY);
    y -= 22;
    right(pack.jobNumber, W - M, 22, bold, NAVY);
    y = H - BAND - 3 - 24;
  };
  /*
   * Every section has a heading: navy, with a short orange underline and a
   * hairline to the margin. A section that runs over a page carries on under
   * "(continued)" on the next, so a list is never left without its heading.
   */
  const LIMIT = M + 28;
  const IN = M + 12;
  const IN_R = W - M - 12;
  let card: { title: string; note?: string } | null = null;
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
    if (card) strip(`${card.title} (continued)`, card.note);
  };
  const open = (title: string, note?: string) => {
    card = null;
    room(80);
    card = { title, note };
    strip(title, note);
  };
  const close = () => {
    card = null;
    y -= 16;
  };

  band(true);

  /* ---- what the job is, then the site and booking in a cream box */
  if (pack.jobType) { text(pack.jobType, M, 13, bold, NAVY); y -= 16; }
  if (pack.customer) { text(pack.customer, M, 10.5, font, GREY); y -= 10; }
  y -= 6;

  const BOX_X = M;
  const BOX_W = W - 2 * M;
  const PAD = 12;
  const addr = pack.address ? wrap(bold, 14, pack.address, BOX_W - 2 * PAD) : [];
  const COL = (BOX_W - 2 * PAD) / 2;
  const cells = pack.facts.map(([k, v]) => ({ k, v: wrap(font, 10, v, COL - 10) }));
  const rowsH: number[] = [];
  for (let i = 0; i < cells.length; i += 2) rowsH.push(Math.max(...cells.slice(i, i + 2).map((c) => 11 + c.v.length * 12.5)) + 8);
  const boxH = PAD + (addr.length ? 10 + addr.length * 17 + 6 : 0) + rowsH.reduce((a, b) => a + b, 0) + PAD - 8;
  const boxTop = y;
  page.drawRectangle({ x: BOX_X, y: y - boxH, width: BOX_W, height: boxH, color: CREAM });
  page.drawRectangle({ x: BOX_X, y: y - boxH, width: 4, height: boxH, color: ORANGE });
  y -= PAD + 8;
  if (addr.length) {
    text("SITE", BOX_X + PAD, 7.5, bold, GREY);
    y -= 16;
    for (const l of addr) { text(l, BOX_X + PAD, 14, bold, NAVY); y -= 17; }
    y -= 6;
  }
  for (let i = 0; i < cells.length; i += 2) {
    const top = y;
    cells.slice(i, i + 2).forEach((c, j) => {
      y = top;
      const x = BOX_X + PAD + j * COL;
      text(c.k.toUpperCase(), x, 7.5, bold, GREY);
      y -= 12.5;
      for (const l of c.v) { text(l, x, 10, font, INK); y -= 12.5; }
    });
    y = top - rowsH[i / 2];
  }
  y = boxTop - boxH - 14;

  const para = (s: string) => {
    for (const l of wrap(font, 10.5, s, IN_R - IN)) { room(13.5); text(l, IN, 10.5); y -= 13.5; }
  };

  /* ---- the scope first, under the site: what was sold, before what to bring */
  if (pack.scope) { open("Scope of works sold"); para(pack.scope); close(); }
  // The office's own notes next, under the scope they add to (Jake, 28 Oct).
  if (pack.jobNotes) { open("Notes on the job"); para(pack.jobNotes); close(); }
  // Who else is on the job and whether they've been told, before the gear
  // (Jake, 28 Oct). The labour lines on the quote are left off: they're the
  // price breakdown, and the scope above already says what the work is.
  const bullets = (items: string[]) => {
    for (const it of items) {
      const lines = wrap(font, 10.5, it, IN_R - IN - 16);
      room(lines.length * 13.5);
      page.drawRectangle({ x: IN + 1, y: y + 1.5, width: 5, height: 5, color: SKY });
      for (const l of lines) { text(l, IN + 16, 10.5); y -= 13.5; }
    }
  };
  if (pack.contractors.length) { open("Contractors"); bullets(pack.contractors); close(); }

  /* ---- equipment and materials: a tick box, qty, the item, and whether it's ordered */
  const BOX = 10;
  const QTY_X = IN + BOX + 10;
  const ITEM_X = QTY_X + 34;
  const ORD_W = 120;
  const ORD_X = IN_R - ORD_W;
  const ITEM_W = ORD_X - ITEM_X - 12;
  const table = (rows: PackLine[]) => {
    room(16);
    text("QTY", QTY_X, 7.5, bold, GREY);
    text("ITEM", ITEM_X, 7.5, bold, GREY);
    text("ORDERED", ORD_X, 7.5, bold, GREY);
    y -= 15;
    rows.forEach((r, i) => {
      const name = wrap(font, 10.5, r.name, ITEM_W);
      const ordFont = r.state === "sent" ? font : bold;
      const ord = wrap(ordFont, 9, r.ordered, ORD_W);
      const h = Math.max(name.length * 13, ord.length * 11.5);
      room(h + 9);
      const top = y;
      // Every other row shaded, to follow a line across to its order status.
      if (i % 2 === 0) page.drawRectangle({ x: M, y: top - h + 3, width: W - 2 * M, height: h + 9, color: ZEBRA });
      // An empty box to tick when it's in the van, with a pen on the printout
      // or on a tablet.
      page.drawRectangle({ x: IN, y: top - 2, width: BOX, height: BOX, borderColor: NAVY, borderWidth: 0.9 });
      text(r.qty, QTY_X, 10.5, bold, NAVY);
      for (const l of name) { text(l, ITEM_X, 10.5); y -= 13; }
      y = top;
      const colour = r.state === "sent" ? GREY : r.state === "waiting" ? WAITING : MISSING;
      for (const l of ord) { text(l, ORD_X, 9, ordFont, colour); y -= 11.5; }
      y = top - h;
      y -= 9;
    });
    y += 8;
  };

  // The gear starts a page of its own (Jake, 28 Oct), so the list someone
  // ticks off while loading the van isn't split from its heading by the scope
  // and notes; on most jobs equipment and materials then fit on one sheet.
  card = null;
  band(false);
  const tickNote = "Tick each one as it goes in the van";
  open("Equipment", pack.units.length ? tickNote : undefined);
  if (pack.units.length) table(pack.units); else { text("No equipment on the quote.", IN, 10, font, GREY); y -= 14; }
  close();

  open("Materials", pack.materials.length ? tickNote : undefined);
  if (pack.materials.length) table(pack.materials); else { text("No materials on the quote.", IN, 10, font, GREY); y -= 14; }
  close();


  /* ---- photos, four to a page */
  const embedded: { img: PDFImage; p: Photo }[] = [];
  let failed = 0;
  for (const ph of photos) {
    try {
      const img = /\.png$/i.test(ph.photo.name) ? await doc.embedPng(own(ph.bytes)) : await doc.embedJpg(own(ph.bytes));
      embedded.push({ img, p: ph.photo });
    } catch {
      failed++;
    }
  }
  const unshown = meta.notShown + failed;
  if (embedded.length || unshown) {
    // Photos on pages of their own, after the gear rather than under it.
    band(false);
    strip("Photos", [
      embedded.length ? `${embedded.length} photo${embedded.length === 1 ? "" : "s"}, newest first` : "No photos could go in",
      unshown ? `${unshown} more on the job in ServiceTitan` : null,
    ].filter(Boolean).join(" · "));
    y += 6;
  }
  // Two across, two rows to a page: sized so the first photo page, under its
  // heading, holds four like the rest.
  const GAP = 12;
  const CAP = 14;
  const cellW = (W - 2 * M - GAP) / 2;
  // The first row starts under the heading: band leaves y 27 below the header
  // band, the heading takes 42 and the grid starts 6 back up from there.
  const firstTop = H - BAND - 27 - 42 + 6;
  const cellH = Math.floor((firstTop - (M + 28) - GAP) / 2 - CAP);
  let yTop = y;
  embedded.forEach(({ img, p }, i) => {
    const col = i % 2;
    if (col === 0) {
      if (i > 0) yTop -= cellH + CAP + GAP;
      if (yTop - cellH - CAP < M + 28) { band(false); yTop = y + 6; }
    }
    const x0 = M + col * (cellW + GAP);
    page.drawRectangle({ x: x0, y: yTop - cellH, width: cellW, height: cellH, color: CREAM });
    const scale = Math.min(cellW / img.width, cellH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: x0 + (cellW - w) / 2, y: yTop - cellH + (cellH - h) / 2, width: w, height: h });
    y = yTop - cellH - 10;
    const when = p.at ? new Date(p.at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" }) : null;
    const cap = wrap(font, 7.5, [p.quoteVisit ? "Quote visit" : "This job", when, p.name].filter(Boolean).join(" · "), cellW)[0] ?? "";
    text(cap, x0, 7.5, font, GREY);
  });

  /* ---- footer on every page */
  const pages = doc.getPages();
  const made = meta.madeAt.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: M + 4 }, end: { x: W - M, y: M + 4 }, thickness: 0.6, color: LINE });
    pg.drawText(drawable(bold, `Advanced Gas & Aircon · ${site.phone}`), { x: M, y: M - 8, size: 7.5, font: bold, color: NAVY });
    const r = drawable(font, `${meta.version ? `Version ${meta.version}` : "Preview, not on the job"} · made ${made} from ServiceTitan · replaces any earlier version · page ${i + 1} of ${pages.length}`);
    pg.drawText(r, { x: W - M - font.widthOfTextAtSize(r, 7.5), y: M - 8, size: 7.5, font, color: GREY });
  });

  return doc.save();
}
