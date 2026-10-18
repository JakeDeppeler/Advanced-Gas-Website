// An order as a one- or two-page PDF: who it's to, where it goes, and the
// lines job by job. For the orders that aren't sent as a PDF already (Reece,
// emailed suppliers), so any order can be saved and attached to the job in
// ServiceTitan. Pure apart from pdf-lib.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { byJob, jobHeading, type PlannedLine } from "./plan";

// The standard fonts only carry Windows-1252; anything else (an emoji in a
// customer's name) would throw, so it becomes "?".
const clean = (s: string) => s.replace(/[^\x20-\x7E -ÿ–—‘’“”•…]/g, "?");
const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Cut to fit a column, with an ellipsis, rather than run into the next one. */
function fit(text: string, font: PDFFont, size: number, width: number): string {
  let t = clean(text);
  if (font.widthOfTextAtSize(t, size) <= width) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > width) t = t.slice(0, -1);
  return `${t}…`;
}

export async function orderPdf(o: {
  poNumber: string;
  supplier: string;
  date: string;
  /** Where it goes, or that we're collecting it. */
  deliver: string;
  instructions: string | null;
  orderedBy: string;
  lines: PlannedLine[];
  /** Reece wants its product numbers; everyone else the model. */
  partLabel: string;
  part: (l: PlannedLine) => string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Order ${o.poNumber}`);
  doc.setAuthor("Advanced Gas & Aircon");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.11, 0.1), soft = rgb(0.42, 0.41, 0.4), line = rgb(0.85, 0.84, 0.82);
  const W = 595.28, H = 841.89, M = 44;
  // Qty, part, item, cost: the columns' left edges and the item's width.
  const cx = { qty: M, part: M + 44, item: M + 170, cost: W - M };
  const itemW = cx.cost - 70 - cx.item;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text = (t: string, x: number, size: number, f: PDFFont = reg, color = ink) => page.drawText(clean(t), { x, y, size, font: f, color });
  const right = (t: string, x: number, size: number, f: PDFFont = reg) => page.drawText(clean(t), { x: x - f.widthOfTextAtSize(clean(t), size), y, size, font: f, color: ink });
  const room = (need: number) => { if (y - need < M) { page = doc.addPage([W, H]); y = H - M; } };

  text("Advanced Gas & Aircon", M, 18, bold);
  right(`Order ${o.poNumber}`, W - M, 18, bold);
  y -= 24;
  text(`To ${o.supplier}`, M, 11);
  right(o.date, W - M, 11);
  y -= 16;
  text(o.deliver, M, 11);
  y -= 16;
  if (o.instructions) { text(fit(o.instructions, reg, 10, W - 2 * M), M, 10, reg, soft); y -= 15; }
  text(`Ordered by ${o.orderedBy}`, M, 10, reg, soft);
  y -= 22;

  const head = () => {
    text("QTY", cx.qty, 8.5, bold, soft);
    text(o.partLabel.toUpperCase(), cx.part, 8.5, bold, soft);
    text("ITEM", cx.item, 8.5, bold, soft);
    page.drawText("COST EX GST", { x: cx.cost - bold.widthOfTextAtSize("COST EX GST", 8.5), y, size: 8.5, font: bold, color: soft });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: line });
    y -= 13;
  };

  let total = 0;
  for (const g of byJob(o.lines)) {
    room(60);
    text(fit(jobHeading(g), bold, 11.5, W - 2 * M), M, 11.5, bold);
    y -= 16;
    head();
    for (const l of g.lines) {
      room(20);
      const name = l.sku_name ?? l.description ?? "";
      text(qty(l.qty), cx.qty, 10);
      text(fit(o.part(l), reg, 10, cx.item - cx.part - 8), cx.part, 10);
      text(fit(name, reg, 10, itemW), cx.item, 10);
      if (l.unit_cost != null) { const c = l.unit_cost * l.qty; total += c; right(money(c), cx.cost, 10); }
      y -= 15;
    }
    y -= 8;
  }
  room(30);
  page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.6, color: line });
  y -= 8;
  text(`${o.lines.length} line${o.lines.length === 1 ? "" : "s"}`, M, 10.5, bold);
  if (total > 0) right(money(total), cx.cost, 10.5, bold);
  return doc.save();
}
