// An install pack as a PDF, for the install job in ServiceTitan, in the layout
// of the packs made by hand for jobs 20801 and 20881 (Jake, 22 Nov): a navy
// header with the logo, "Install Pack." and the job's chips, a rebate badge on
// a rebate job; an alert when one thing is easy to miss; the job summary;
// arrival and contractors; where each unit goes; the unit and materials with
// where each was ordered; extra information; the photos to take and what to do
// before leaving, the often-missed lines marked; then the photos on the job,
// a plan drawn whole. Headings numbered, with a short orange underline.
// Pure apart from pdf-lib, so it can be rendered from a fixture.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage, type RGB } from "pdf-lib";
import type { Check, Pack, PackLine, Photo } from "./build";
import { NOT_PLACED } from "./summaryText";
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
// The rebate badge (status green, used for nothing else in the pack), the
// summary's tint, the cards' cream and the often-missed lines' dark orange.
const GREEN = rgb(34 / 255, 181 / 255, 115 / 255);
const SUMMARY_BG = rgb(242 / 255, 249 / 255, 253 / 255);
const CARD = rgb(246 / 255, 244 / 255, 239 / 255);
const MUST = rgb(196 / 255, 80 / 255, 15 / 255);

/**
 * The standard fonts only carry Windows-1252, and a quote can hold anything
 * pasted into it. A character the font can't draw becomes "?" rather than
 * failing the pack.
 */
export function drawable(font: PDFFont, s: string): string {
  let out = "";
  for (const ch of s.replace(/\t/g, "    ")) {
    try { font.encodeText(ch); out += ch; } catch { out += "?"; }
  }
  return out;
}

export function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
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
export const own = (bytes: Uint8Array) => (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength ? bytes : bytes.slice());

export async function packPdf(pack: Pack, photos: PackPhoto[], meta: PackMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pack.title);
  doc.setAuthor("Advanced Gas & Aircon");
  doc.setCreator("Advanced Gas team portal");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  // A logo that won't embed costs the pack its logo, not the pack.
  const logo = await doc.embedJpg(own(Buffer.from(LOGO_FULL_JPG, "base64"))).catch(() => null);

  const L = 40;
  const CW = W - 2 * L;
  const FOOT = 52;
  let page!: PDFPage;
  let y = 0;
  const newPage = () => { page = doc.addPage([W, H]); y = H - 44; };
  const ensure = (h: number) => { if (y - h < FOOT) newPage(); };
  const say = (t: string, x: number, yy: number, size: number, f: PDFFont, color: RGB) => page.drawText(drawable(f, t), { x, y: yy, size, font: f, color });
  const lines = (t: string, size: number, f: PDFFont, width: number) => wrap(f, size, t, width).filter((l, i, a) => l || i < a.length - 1);
  // A rectangle with round corners, its top left at (x, top).
  const round = (x: number, top: number, w: number, h: number, r: number, o: { fill?: RGB; border?: RGB; bw?: number; opacity?: number }) =>
    page.drawSvgPath(`M ${r},0 H ${w - r} Q ${w},0 ${w},${r} V ${h - r} Q ${w},${h} ${w - r},${h} H ${r} Q 0,${h} 0,${h - r} V ${r} Q 0,0 ${r},0 Z`,
      { x, y: top, color: o.fill, borderColor: o.border, borderWidth: o.border ? (o.bw ?? 0.8) : 0, opacity: o.opacity });

  /* ---- the header */
  newPage();
  const BAND = 196;
  page.drawRectangle({ x: 0, y: H - BAND, width: W, height: BAND, color: NAVY });
  page.drawCircle({ x: W - 40, y: H - 10, size: 150, borderColor: rgb(1, 1, 1), borderWidth: 46, borderOpacity: 0.035 });
  page.drawCircle({ x: W - 20, y: H + 10, size: 80, borderColor: rgb(1, 1, 1), borderWidth: 26, borderOpacity: 0.035 });
  round(L, H - 30, 118, 46, 8, { fill: rgb(1, 1, 1) });
  if (logo) {
    const lw = 100;
    const lh = (lw * LOGO_FULL_SIZE.height) / LOGO_FULL_SIZE.width;
    page.drawImage(logo, { x: L + 9, y: H - 30 - 23 - lh / 2, width: lw, height: lh });
  } else {
    say("Advanced Gas & Aircon", L + 10, H - 57, 10, bold, NAVY);
  }
  if (pack.rebates.length) {
    const t = "REBATE JOB";
    const tw = bold.widthOfTextAtSize(t, 11);
    round(W - L - tw - 30, H - 36, tw + 30, 28, 7, { fill: GREEN });
    say(t, W - L - tw - 15, H - 54, 11, bold, rgb(1, 1, 1));
  }
  const title = "Install Pack";
  say(title, L, H - 120, 38, bold, rgb(1, 1, 1));
  say(".", L + bold.widthOfTextAtSize(title, 38), H - 120, 38, bold, SKY);
  const sub = [pack.jobType, pack.address].filter(Boolean).join(" · ");
  let sy = H - 142;
  for (const l of lines(sub, 11.5, font, 400).slice(0, 2)) { say(l, L, sy, 11.5, font, rgb(0.9, 0.91, 0.95)); sy -= 15; }
  // The chips: the job, the main unit, internal use.
  let cx = L;
  const chip = (t: string, filled: boolean) => {
    const tt = t.length > 46 ? `${t.slice(0, 45)}…` : t;
    const w = (filled ? bold : font).widthOfTextAtSize(drawable(font, tt), 8.5) + 20;
    if (cx + w > W - L) return;
    round(cx, H - BAND + 32, w, 20, 10, filled ? { fill: ORANGE } : { border: rgb(0.75, 0.78, 0.86), bw: 0.8 });
    say(tt, cx + 10, H - BAND + 18.5, 8.5, filled ? bold : font, rgb(1, 1, 1));
    cx += w + 6;
  };
  chip(`Job ${pack.jobNumber}`, true);
  if (pack.units[0]) chip(pack.units[0].name, false);
  chip("Internal use only", false);
  page.drawRectangle({ x: 0, y: H - BAND - 5, width: W / 3, height: 5, color: ORANGE });
  page.drawRectangle({ x: W / 3, y: H - BAND - 5, width: (2 * W) / 3, height: 5, color: SKY });
  y = H - BAND - 5 - 18;

  /* ---- the alert, then the summary */
  const sm = pack.summary && "ok" in pack.summary ? pack.summary.ok : null;
  if (sm?.alert?.title) {
    const tl = lines(sm.alert.title, 12, bold, CW - 28);
    const xl = sm.alert.text ? lines(sm.alert.text, 9.5, font, CW - 28) : [];
    const h = 14 + tl.length * 15 + xl.length * 13 + 8;
    ensure(h);
    round(L, y, CW, h, 8, { fill: ORANGE });
    let yy = y - 22;
    for (const l of tl) { say(l, L + 14, yy, 12, bold, rgb(1, 1, 1)); yy -= 15; }
    for (const l of xl) { say(l, L + 14, yy + 1, 9.5, font, rgb(1, 1, 1)); yy -= 13; }
    y -= h + 10;
  }
  {
    const text = sm?.overview ?? pack.scope ?? "No job summary written in ServiceTitan.";
    const from = sm && pack.summary && "ok" in pack.summary ? `Written from ${pack.summary.from}.` : "The job summary from ServiceTitan.";
    const tl = lines(text, 9.5, font, CW - 30);
    const h = 30 + tl.length * 13 + 16;
    ensure(h);
    round(L, y, CW, h, 6, { fill: SUMMARY_BG });
    page.drawRectangle({ x: L, y: y - h, width: 4, height: h, color: SKY });
    say("JOB SUMMARY", L + 16, y - 16, 7.5, bold, SKY);
    let yy = y - 31;
    for (const l of tl) { say(l, L + 16, yy, 9.5, font, INK); yy -= 13; }
    say(from, L + 16, yy - 1, 7, font, GREY);
    y -= h + 10;
  }

  /* ---- arrival and contractors */
  {
    const gap = 12;
    const cw = (CW - gap) / 2;
    const left: [string, string][] = [
      ["Booked", pack.facts.find(([k]) => k === "Booked")?.[1] ?? ""],
      ["Site", pack.address ?? ""],
      ["Customer", pack.customer ? `${pack.customer}, phone on the job` : ""],
      ["Crew", pack.facts.find(([k]) => k === "Crew")?.[1] ?? ""],
    ].filter(([, v]) => v) as [string, string][];
    const right: [string, string][] = pack.contractors.length
      ? pack.contractors.map((c) => ["", c] as [string, string])
      : [["Quote", pack.facts.find(([k]) => k === "Quote")?.[1] ?? "No sold quote on this job"]];
    const rows = (rs: [string, string][]) => rs.map(([k, v]) => ({ k, l: lines(k ? `${k}: ${v}` : v, 9, font, cw - 26) }));
    const lr = rows(left);
    const rr = rows(right);
    const hOf = (r: { l: string[] }[]) => 28 + r.reduce((n, x) => n + x.l.length * 12.5, 0) + 10;
    const h = Math.max(hOf(lr), hOf(rr));
    ensure(h);
    const card = (x: number, label: string, rs: { k: string; l: string[] }[]) => {
      round(x, y, cw, h, 7, { fill: CARD, border: LINE });
      say(label, x + 13, y - 17, 7.5, bold, SKY);
      let yy = y - 32;
      for (const r of rs) {
        r.l.forEach((l, i) => {
          if (i === 0 && r.k && l.startsWith(`${r.k}:`)) {
            say(`${r.k}:`, x + 13, yy, 9, bold, INK);
            say(l.slice(r.k.length + 1), x + 13 + bold.widthOfTextAtSize(`${r.k}:`, 9), yy, 9, font, INK);
          } else say(l, x + 13, yy, 9, font, INK);
          yy -= 12.5;
        });
      }
    };
    card(L, "ARRIVAL & ACCESS", lr);
    card(L + cw + gap, pack.contractors.length ? "CONTRACTORS" : "QUOTE", rr);
    y -= h + 6;
  }

  /* ---- numbered sections */
  let n = 0;
  const heading = (t: string, lead?: string) => {
    ensure(70);
    n++;
    // Room above a heading that follows something on the page; none at the top of one.
    y -= y > H - 60 ? 16 : 28;
    const num = String(n).padStart(2, "0");
    say(num, L, y, 10, bold, ORANGE);
    say(t, L + bold.widthOfTextAtSize(num, 10) + 6, y, 16, bold, NAVY);
    page.drawRectangle({ x: L, y: y - 8, width: 34, height: 2, color: ORANGE });
    y -= 20;
    if (lead) { for (const l of lines(lead, 8.8, font, CW)) { say(l, L, y, 8.8, font, GREY); y -= 12; } y -= 2; }
    page.drawLine({ start: { x: L, y }, end: { x: W - L, y }, thickness: 0.5, color: LINE });
  };
  const checklist = (items: (Check & { right?: { t: string; c: RGB } })[]) => {
    for (const it of items) {
      const tag = it.must ? "OFTEN MISSED" : "";
      const tagW = tag ? bold.widthOfTextAtSize(tag, 6.8) + 12 : 0;
      const rw = it.right ? font.widthOfTextAtSize(drawable(font, it.right.t), 8) + 8 : 0;
      const tl = lines(it.text, 9.3, it.must ? bold : font, CW - 20 - rw - (tag ? tagW + 8 : 0));
      const h = tl.length * 12 + 9;
      ensure(h);
      page.drawRectangle({ x: L + 1, y: y - 14, width: 8.5, height: 8.5, borderColor: INK, borderWidth: 0.9, color: rgb(1, 1, 1) });
      let yy = y - 13;
      tl.forEach((l, i) => {
        say(l, L + 18, yy, 9.3, it.must ? bold : font, it.must ? MUST : INK);
        if (i === 0 && tag) {
          const tx = L + 18 + (it.must ? bold : font).widthOfTextAtSize(l, 9.3) + 8;
          round(tx, yy + 8, tagW, 11, 4, { fill: ORANGE });
          say(tag, tx + 6, yy + 0.5, 6.8, bold, rgb(1, 1, 1));
        }
        yy -= 12;
      });
      if (it.right) say(it.right.t, W - L - rw + 8, y - 13, 8, font, it.right.c);
      y -= h;
      page.drawLine({ start: { x: L, y }, end: { x: W - L, y }, thickness: 0.5, color: LINE });
    }
  };
  const orderRight = (l: PackLine) => ({ t: l.ordered, c: l.state === "none" ? MISSING : l.state === "waiting" ? WAITING : GREY });

  // 01 Where it goes. An all-in-one has no indoor unit (Jake, 22 Nov).
  const locs = pack.locations;
  if (locs.length) {
    heading("Where it goes");
    const gap = 12;
    const bw = (CW - gap) / 2;
    for (let i = 0; i < locs.length; i += 2) {
      const pair = locs.slice(i, i + 2).map((l) => ({ ...l, tl: lines(l.text, 9.2, l.text === NOT_PLACED ? bold : font, bw - 24) }));
      const h = 26 + Math.max(...pair.map((p) => p.tl.length)) * 12.5 + 8;
      y -= 8;
      ensure(h);
      pair.forEach((p, k) => {
        const x = L + k * (bw + gap);
        round(x, y, bw, h, 7, { border: LINE });
        say(p.label.toUpperCase(), x + 12, y - 16, 7.5, bold, ORANGE);
        let yy = y - 30;
        for (const l of p.tl) { say(l, x + 12, yy, 9.2, p.text === NOT_PLACED ? bold : font, p.text === NOT_PLACED ? WAITING : INK); yy -= 12.5; }
      });
      y -= h;
    }
    y -= 4;
  }

  // 02 Unit & materials, with where each was ordered.
  heading("Unit & materials", pack.quoted ? "Load up before heading out. Where each line was ordered is on the right." : undefined);
  if (!pack.quoted) {
    y -= 14;
    say("No sold quote on this job, so no list. Check with the office what's going in.", L, y, 9.3, font, GREY);
    y -= 8;
  } else {
    const all = [...pack.units, ...pack.materials];
    if (all.length) checklist(all.map((l) => ({ text: `${l.qty} × ${l.name}`, right: orderRight(l) })));
    else { y -= 14; say("No equipment or materials on the quote.", L, y, 9.3, font, GREY); y -= 8; }
  }

  // Ducted: the zoning and outlets on their own.
  if (pack.zoning.length) {
    const plan = photos.some((ph) => /plan|layout|drawing|design/i.test(ph.photo.name));
    heading("Zoning & outlets", plan ? "From the sold quote. The plan on the job is on the photo pages, drawn whole." : "From the sold quote.");
    checklist(pack.zoning.map((l) => ({ text: `${l.qty} × ${l.name}`, right: orderRight(l) })));
  }

  // Extra information: what's particular to the job, and the visit's own instructions.
  const extra: Check[] = [...(sm?.extra ?? []).map((text) => ({ text })), ...(pack.instructions ? [{ text: `Appointment instructions: ${pack.instructions}` }] : [])];
  if (extra.length) { heading("Extra information"); checklist(extra); }

  heading("Photos to take", pack.rebates.length ? `For the rebate (${pack.rebates.join(", ")} on the quote) and the job. Uploaded before leaving.` : "Uploaded to the job before leaving.");
  checklist(pack.toTake);
  heading("Before leaving");
  checklist(pack.leaving);

  /* ---- the photos on the job, a plan drawn whole */
  const embedded: { img: PDFImage; p: Photo; plan: boolean }[] = [];
  let failed = 0;
  for (const ph of photos) {
    try {
      const img = /\.png$/i.test(ph.photo.name) ? await doc.embedPng(own(ph.bytes)) : await doc.embedJpg(own(ph.bytes));
      embedded.push({ img, p: ph.photo, plan: /plan|layout|drawing|design/i.test(ph.photo.name) });
    } catch {
      failed++;
    }
  }
  embedded.sort((a, b) => Number(b.plan) - Number(a.plan));
  // One photo on its own is drawn as big as a plan.
  if (embedded.length === 1) embedded[0].plan = true;
  const unshown = meta.notShown + failed;
  if (embedded.length || unshown) {
    newPage();
    heading("Photos on the job", [embedded.length ? `${embedded.length} photo${embedded.length === 1 ? "" : "s"}` : "No photos could go in", unshown ? `${unshown} more on the job in ServiceTitan` : null].filter(Boolean).join(" · "));
    y -= 8;
    const gap = 12;
    const cellW = (CW - gap) / 2;
    const cellH = 168;
    const CAP = 13;
    let col = 0;
    for (const e of embedded) {
      const caption = [e.p.label ?? (e.p.quoteVisit ? "Quote visit" : "This job"), e.p.at ? new Date(e.p.at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Melbourne" }) : null, e.p.name].filter(Boolean).join(" · ");
      if (e.plan || col === 0) { if (col !== 0) { y -= cellH + CAP + gap; col = 0; } }
      const w0 = e.plan ? CW : cellW;
      const h0 = e.plan ? Math.min(330, (CW * e.img.height) / e.img.width) : cellH;
      ensure(h0 + CAP + 4);
      const x0 = L + (e.plan ? 0 : col * (cellW + gap));
      round(x0, y, w0, h0, 6, { fill: CARD, border: LINE });
      const sc = Math.min((w0 - 4) / e.img.width, (h0 - 4) / e.img.height, 1);
      const iw = e.img.width * sc;
      const ih = e.img.height * sc;
      page.drawImage(e.img, { x: x0 + (w0 - iw) / 2, y: y - h0 + (h0 - ih) / 2, width: iw, height: ih });
      say(lines(caption, 7.5, font, w0)[0] ?? "", x0, y - h0 - 10, 7.5, font, GREY);
      if (e.plan) { y -= h0 + CAP + gap; col = 0; }
      else if (col === 1) { y -= cellH + CAP + gap; col = 0; }
      else col = 1;
    }
  }

  /* ---- footer on every page */
  const pages = doc.getPages();
  const made = meta.madeAt.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: L, y: 36 }, end: { x: W - L, y: 36 }, thickness: 0.6, color: LINE });
    const left = drawable(bold, `Advanced Gas & Aircon · Job ${pack.jobNumber} Install Pack`);
    pg.drawText(left, { x: L, y: 24, size: 7.5, font: bold, color: NAVY });
    const r = drawable(font, `${meta.version ? `Version ${meta.version}` : "Preview, not on the job"} · made ${made} · ${site.phone} · page ${i + 1} of ${pages.length}`);
    pg.drawText(r, { x: W - L - font.widthOfTextAtSize(r, 7.5), y: 24, size: 7.5, font, color: GREY });
  });

  return doc.save();
}
