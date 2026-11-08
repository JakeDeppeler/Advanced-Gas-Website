/**
 * The look of the emails customers get from us (review requests, quote
 * follow-ups): a photo across the top, a person rather than a logo signing
 * it, and plenty of white. Jake, 8 Nov: "stand out more, more personal, more
 * photos and high end".
 *
 * Pure, so the check scripts can render it. Tables and inline styles because
 * that's what Outlook and Gmail both draw the same way; JPGs because Outlook
 * on Windows doesn't show WebP. Every image has alt text and the words carry
 * the meaning on their own, since plenty of inboxes block images until asked.
 */

export type PremiumBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  /** A small label above a heading, "WHY RECLAIM". */
  | { kind: "eyebrow"; text: string }
  | { kind: "button"; label: string; href: string; note?: string }
  | { kind: "buttons"; items: { label: string; href: string; solid?: boolean }[] }
  | { kind: "image"; src: string; alt: string; caption?: string }
  /** The person who did the job or wrote the quote, with their photo when we have one. */
  | { kind: "person"; name: string; line: string; photo: string | null }
  /** Two or three side by side, each with a photo: brands, options. Stacks on a phone. */
  | { kind: "cards"; items: { src: string; alt: string; title: string; tag?: string; text: string }[] }
  /** Three big numbers in a row. */
  | { kind: "facts"; items: { value: string; label: string }[] }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string; who: string }
  | { kind: "rule" };

export type PremiumEmail = {
  /** The line inboxes show next to the subject. */
  preheader: string;
  /** `fallback`: the stock photo to use if `src` (a job photo) can't be fetched. */
  hero?: { src: string; alt: string; fallback?: string };
  blocks: PremiumBlock[];
  signer?: { name: string; role: string; photo: string | null };
  /** Absolute site URL, so images and links work in an inbox. */
  base: string;
  footer: { name: string; phone: string; phoneHref: string; address: string; site: string };
  /** A short line under the footer, e.g. the rating. */
  proof?: string;
};

const INK = "#111111";
const MUTED = "#555a60";
const LINE = "#e7e3dc";
const GROUND = "#f4f1ec";
/** The panel behind a person inside the white card: GROUND's colour, its own value so dark mode can tell them apart. */
const TINT = "#f4f1ed";
const ORANGE = "#c2521a"; // --orange-deep: the shade white text stays readable on
/** The font Outlook writes in (Aptos, then Segoe/Helvetica/Arial): it should read like an email from a person, not a brochure. */
const FONT = "Aptos,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const abs = (base: string, src: string) => (/^https?:\/\//.test(src) ? src : `${base.replace(/\/$/, "")}${src.startsWith("/") ? "" : "/"}${src.split("/").map(encodeURIComponent).join("/").replace(/%2F/g, "/")}`);

/** **bold** and line breaks, nothing else: the words come from settings people type into. */
const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");

const initials = (name: string) => name.split(/\s+/).filter((w) => w && !/^the$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

function avatar(base: string, name: string, photo: string | null, size: number): string {
  if (photo) return `<img src="${esc(abs(base, photo))}" width="${size}" height="${size}" alt="${esc(name)}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:0">`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${INK};color:#ffffff;font:600 ${Math.round(size / 2.6)}px/${size}px ${FONT};text-align:center">${esc(initials(name))}</div>`;
}

function block(b: PremiumBlock, base: string): string {
  const pad = "padding:0 40px";
  switch (b.kind) {
    case "p":
      return `<tr><td class="pe-pad" style="${pad} 16px;font:400 16px/1.65 ${FONT};color:${INK}">${inline(b.text)}</td></tr>`;
    case "eyebrow":
      return `<tr><td class="pe-pad" style="${pad} 8px;font:700 11px/1.4 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${ORANGE}">${esc(b.text)}</td></tr>`;
    case "h":
      return `<tr><td class="pe-pad" style="${pad} 14px;font:700 22px/1.3 ${FONT};color:${INK}">${inline(b.text)}</td></tr>`;
    case "button":
      return `<tr><td class="pe-pad" style="${pad} 24px;padding-top:8px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:999px;background:${INK}"><a href="${esc(b.href)}" style="display:inline-block;padding:16px 30px;font:700 16px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:999px">${esc(b.label)}</a></td></tr></table>
${b.note ? `<div style="padding-top:10px;font:400 13px/1.5 ${FONT};color:${MUTED}">${inline(b.note)}</div>` : ""}</td></tr>`;
    case "buttons":
      return `<tr><td class="pe-pad" style="${pad} 20px">${b.items
        .map((i) => `<a href="${esc(i.href)}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 22px;border-radius:999px;font:700 14px/1 ${FONT};text-decoration:none;${i.solid ? `background:${INK};color:#ffffff;border:2px solid ${INK}` : `color:${INK};border:2px solid ${INK}`}">${esc(i.label)}</a>`)
        .join("")}</td></tr>`;
    case "image":
      return `<tr><td class="pe-pad" style="${pad} 22px"><img src="${esc(abs(base, b.src))}" width="520" alt="${esc(b.alt)}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:14px;border:0">${b.caption ? `<div style="padding-top:8px;font:400 13px/1.5 ${FONT};color:${MUTED}">${inline(b.caption)}</div>` : ""}</td></tr>`;
    case "person":
      return `<tr><td class="pe-pad" style="${pad} 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${TINT};border-radius:16px"><tr>
<td width="88" style="padding:18px 0 18px 20px;vertical-align:middle">${avatar(base, b.name, b.photo, 64)}</td>
<td style="padding:18px 20px 18px 14px;vertical-align:middle;font:400 14px/1.5 ${FONT};color:${MUTED}"><div style="font:600 16px/1.3 ${FONT};color:${INK}">${esc(b.name)}</div>${inline(b.line)}</td>
</tr></table></td></tr>`;
    case "cards": {
      const w = Math.floor(100 / b.items.length);
      return `<tr><td class="pe-pad" style="padding:0 32px 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${b.items
        .map(
          (i) => `<td class="pe-card" width="${w}%" style="padding:0 8px 12px;vertical-align:top">
<img src="${esc(abs(base, i.src))}" width="160" alt="${esc(i.alt)}" style="display:block;width:100%;height:auto;border-radius:12px;border:0">
${i.tag ? `<div style="padding-top:10px;font:700 10px/1.4 ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${ORANGE}">${esc(i.tag)}</div>` : ""}
<div style="padding-top:${i.tag ? 2 : 10}px;font:600 15px/1.3 ${FONT};color:${INK}">${esc(i.title)}</div>
<div style="padding-top:4px;font:400 13px/1.5 ${FONT};color:${MUTED}">${inline(i.text)}</div></td>`,
        )
        .join("")}</tr></table></td></tr>`;
    }
    case "facts":
      return `<tr><td class="pe-pad" style="${pad} 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}"><tr>${b.items
        .map((i) => `<td class="pe-fact" width="${Math.floor(100 / b.items.length)}%" style="padding:18px 6px;vertical-align:top;text-align:center"><div style="font:700 22px/1.15 ${FONT};color:${INK}">${esc(i.value)}</div><div style="padding-top:6px;font:400 12px/1.4 ${FONT};color:${MUTED}">${esc(i.label)}</div></td>`)
        .join("")}</tr></table></td></tr>`;
    case "list":
      return `<tr><td class="pe-pad" style="${pad} 16px">${b.items
        .map((i) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="22" style="vertical-align:top;padding:2px 0 10px;font:700 16px/1.6 ${FONT};color:${ORANGE}">&#10003;</td><td style="padding:0 0 10px;font:400 16px/1.6 ${FONT};color:${INK}">${inline(i)}</td></tr></table>`)
        .join("")}</td></tr>`;
    case "quote":
      return `<tr><td class="pe-pad" style="${pad} 22px"><div style="border-left:3px solid ${ORANGE};padding:2px 0 2px 18px"><div style="font:italic 400 17px/1.55 ${FONT};color:${INK}">&ldquo;${inline(b.text)}&rdquo;</div><div style="padding-top:8px;font:400 13px/1.4 ${FONT};color:${MUTED}">${esc(b.who)}</div></div></td></tr>`;
    case "rule":
      return `<tr><td class="pe-pad" style="${pad} 22px"><div style="border-top:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</div></td></tr>`;
  }
}

/*
 * Dark mode. Outlook, Apple Mail and Gmail repaint a light email in their own
 * dark colours when the reader's phone or Mac is in dark mode, which turned
 * the white card into a muddy grey (Jake's Outlook, 8 Nov). These give it a
 * dark version of its own instead: prefers-color-scheme for Apple Mail and
 * Outlook for Mac, [data-ogsc]/[data-ogsb] for Outlook.com and new Outlook.
 * The classes are added by darkClasses() from each element's light colours,
 * so the blocks above don't each have to remember to.
 */
const DARK = { ground: "#111215", shell: "#1c1e22", tint: "#272a30", ink: "#f2eee7", muted: "#a9adb4", line: "#33363c", orange: "#ff8f52" };
const DARK_RULES: [string[], string][] = [
  [[".pe-ground"], `background:${DARK.ground}!important`],
  [[".pe-shell"], `background:${DARK.shell}!important`],
  [[".pe-tint"], `background:${DARK.tint}!important`],
  [[".pe-ink"], `color:${DARK.ink}!important`],
  [[".pe-muted"], `color:${DARK.muted}!important`],
  [[".pe-orange"], `color:${DARK.orange}!important`],
  [[".pe-line"], `border-color:${DARK.line}!important`],
  [[".pe-btn"], `background:${DARK.ink}!important;color:#16181d!important;border-color:${DARK.ink}!important`],
  [[".pe-btn a", "a.pe-btn"], "color:#16181d!important"],
  [[".pe-ghost"], `color:${DARK.ink}!important;border-color:${DARK.ink}!important`],
];
/** Every selector in a rule gets the prefix, or "a.pe-btn" would leak into light mode (it did: a black button with black words). */
const scoped = (prefix: (sel: string, decl: string) => string) => DARK_RULES.map(([sels, decl]) => `${sels.map((x) => prefix(x, decl)).join(",")}{${decl}}`).join("\n");
const DARK_CSS = `@media (prefers-color-scheme:dark){\n${scoped((x) => `:root ${x}`)}\n}
${scoped((x, decl) => `${decl.startsWith("background") ? "[data-ogsb]" : "[data-ogsc]"} ${x}`)}`;

function darkClasses(html: string): string {
  return html.replace(/<(\w+)([^>]*?)\sstyle="([^"]*)"/g, (all, tag: string, attrs: string, style: string) => {
    const add: string[] = [];
    const bg = /background:(#[0-9a-f]{6})/i.exec(style)?.[1]?.toLowerCase();
    const fg = /(?:^|;)color:(#[0-9a-f]{6})/i.exec(style)?.[1]?.toLowerCase();
    if (bg === GROUND) add.push("pe-ground");
    else if (bg === TINT) add.push("pe-tint");
    else if (bg === INK) add.push("pe-btn");
    if (!add.includes("pe-btn")) {
      if (fg === INK) add.push(/border:2px solid/.test(style) ? "pe-ghost" : "pe-ink");
      else if (fg === MUTED) add.push("pe-muted");
      else if (fg === ORANGE) add.push("pe-orange");
    }
    if (style.includes(LINE)) add.push("pe-line");
    if (!add.length) return all;
    const cls = /\sclass="([^"]*)"/.exec(attrs);
    const attrs2 = cls ? attrs.replace(cls[0], ` class="${cls[1]} ${add.join(" ")}"`) : `${attrs} class="${add.join(" ")}"`;
    return `<${tag}${attrs2} style="${style}"`;
  });
}

export function premiumHtml(e: PremiumEmail): string {
  return darkClasses(premiumHtmlLight(e));
}

function premiumHtmlLight(e: PremiumEmail): string {
  const { base, footer: f } = e;
  const hero = e.hero
    ? `<tr><td style="padding:0"><img class="pe-hero" src="${esc(abs(base, e.hero.src))}"${e.hero.fallback ? ` data-fallback="${esc(abs(base, e.hero.fallback))}"` : ""} width="600" alt="${esc(e.hero.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:20px 20px 0 0"></td></tr>`
    : "";
  const signer = e.signer
    ? `<tr><td class="pe-pad" style="padding:6px 40px 34px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:14px;vertical-align:middle">${avatar(base, e.signer.name, e.signer.photo, 52)}</td>
<td style="vertical-align:middle;font:400 14px/1.45 ${FONT};color:${MUTED}"><div style="font:600 15px/1.3 ${FONT};color:${INK}">${esc(e.signer.name)}</div>${esc(e.signer.role)}</td>
</tr></table></td></tr>`
    : `<tr><td style="padding:0 0 18px"></td></tr>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>
@media (max-width:620px){
  .pe-pad{padding-left:22px!important;padding-right:22px!important}
  .pe-card{display:block!important;width:100%!important;padding:0 0 18px!important;overflow:hidden}
  .pe-card img{float:left;width:104px!important;margin:0 16px 0 0}
  .pe-outer{padding:0!important}
  .pe-head{padding:14px 16px!important}
  .pe-shell{border-radius:0!important}
  .pe-shell img.pe-hero{border-radius:0!important}
}
${DARK_CSS}
</style></head>
<body style="margin:0;padding:0;background:${GROUND}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${GROUND}">${esc(e.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND}"><tr><td class="pe-outer" align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td class="pe-head" style="padding:0 6px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#ffffff;border-radius:12px;padding:8px 12px"><img src="${esc(abs(base, "/email/logo.jpg"))}" width="140" alt="${esc(f.name)}" style="display:block;width:140px;height:auto;border:0"></td></tr></table></td>
<td align="right" style="vertical-align:middle;font:600 14px/1 ${FONT}"><a href="${esc(f.phoneHref)}" style="color:${INK};text-decoration:none">${esc(f.phone)}</a></td>
</tr></table></td></tr>
<tr><td class="pe-shell" style="background:#ffffff;border-radius:20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${hero}
<tr><td style="padding:34px 0 0"></td></tr>
${e.blocks.map((b) => block(b, base)).join("\n")}
${signer}
</table></td></tr>
<tr><td align="center" style="padding:22px 20px 8px;font:400 12px/1.6 ${FONT};color:${MUTED}">
${e.proof ? `<div style="padding-bottom:6px;color:${INK}">${inline(e.proof)}</div>` : ""}
${esc(f.name)} &middot; ${esc(f.address)}<br>
<a href="${esc(f.phoneHref)}" style="color:${MUTED}">${esc(f.phone)}</a> &middot; <a href="${esc(f.site)}" style="color:${MUTED}">${esc(f.site.replace(/^https?:\/\/(www\.)?/, ""))}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

/** The plain-text part, for inboxes that don't show HTML and for spam filters that like both. */
export function premiumText(e: PremiumEmail): string {
  const out: string[] = [];
  for (const b of e.blocks) {
    const plain = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1");
    if (b.kind === "p" || b.kind === "h") out.push(plain(b.text));
    else if (b.kind === "eyebrow") out.push(b.text.toUpperCase());
    else if (b.kind === "button") out.push(`${b.label}: ${b.href}${b.note ? `\n${plain(b.note)}` : ""}`);
    else if (b.kind === "buttons") out.push(b.items.map((i) => `${i.label}: ${i.href}`).join("\n"));
    else if (b.kind === "person") out.push(`${b.name} · ${plain(b.line)}`);
    else if (b.kind === "cards") out.push(b.items.map((i) => `- ${i.title}${i.tag ? ` (${i.tag})` : ""}: ${plain(i.text)}`).join("\n"));
    else if (b.kind === "facts") out.push(b.items.map((i) => `${i.value}: ${i.label}`).join("\n"));
    else if (b.kind === "list") out.push(b.items.map((i) => `- ${plain(i)}`).join("\n"));
    else if (b.kind === "quote") out.push(`"${plain(b.text)}" (${b.who})`);
    else if (b.kind === "image" && b.caption) out.push(plain(b.caption));
  }
  if (e.signer) out.push(`${e.signer.name}\n${e.signer.role}`);
  out.push(`${e.footer.name} · ${e.footer.phone} · ${e.footer.site}`);
  return out.join("\n\n");
}

/* ------------------------------------------------------------ the letter */

/**
 * An email that looks like someone at the office wrote it: no banner, no
 * headline, no labels, no address footer, just the words, a photo where it
 * helps and a signature. Every customer email uses it now (Jake, 8 Nov: "all
 * of these need to look like a real email, not like an automation email").
 *
 * Photos span the text and carry no caption: the sentence before says what
 * it is, as it would in an email someone typed. The buttons at the bottom
 * are small and plain ("super clean and simple to click").
 */
export type LetterBlock =
  | { kind: "p"; text: string }
  /** Plain bullets. **bold** works for the thing being described. */
  | { kind: "list"; items: string[] }
  /** Two or three small photos side by side, each named. */
  | { kind: "thumbs"; items: { src: string; alt: string; caption: string }[] }
  /**
   * `width`: narrower than the text for a tall photo (a hot water unit, or a
   * phone photo from the job), so the whole system fits on screen at once.
   */
  | { kind: "photo"; src: string; alt: string; fallback?: string; width?: number }
  /** The one thing to press (the review link). */
  | { kind: "button"; label: string; href: string }
  /** One-tap answers at the bottom: go ahead, a question, not this time. */
  | { kind: "choices"; items: { label: string; href: string; primary?: boolean }[] }
  /**
   * A small horizontal range chart: one series, so one colour and no legend
   * (the title names it), each bar labelled with its range in words, which
   * also carries it for anyone who can't see the colour or the images.
   */
  | { kind: "chart"; title: string; max: number; rows: { label: string; low: number; high: number; value: string }[]; ticks?: [string, string, string]; note?: string };

export type LetterEmail = {
  preheader: string;
  blocks: LetterBlock[];
  signer: { name: string; role: string; photo: string | null };
  /** "Cheers," above the signature; null when the words already sign off. */
  signoff?: string | null;
  base: string;
  footer: PremiumEmail["footer"];
};

const LETTER_FONT = "font:400 15px/1.6 " + FONT;

function chart(b: Extract<LetterBlock, { kind: "chart" }>): string {
  const pct = (n: number) => Math.max(0, Math.min(100, Math.round((n / b.max) * 100)));
  const bar = (w: number, fill: boolean) => `<td width="${w}%" style="${fill ? `background:${ORANGE};border-radius:4px;` : ""}font-size:0;line-height:0;height:14px">&nbsp;</td>`;
  const rows = b.rows.map((r) => {
    const a = pct(r.low), w = Math.max(2, pct(r.high) - a), rest = 100 - a - w;
    return `<tr><td style="padding:0 0 12px;vertical-align:top">
<div style="font:600 14px/1.4 ${FONT};color:${INK}">${esc(r.label)} <span style="font-weight:400;color:${MUTED}">&middot; ${esc(r.value)}</span></div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:6px;background:${TINT};border-radius:4px"><tr>${a ? bar(a, false) : ""}${bar(w, true)}${rest > 0 ? bar(rest, false) : ""}</tr></table></td></tr>`;
  }).join("");
  const ticks = b.ticks ? b.ticks.map((t, n) => `<td width="${n === 1 ? 34 : 33}%" style="font:400 12px/1.4 ${FONT};color:${MUTED};text-align:${["left", "center", "right"][n]}">${esc(t)}</td>`).join("") : "";
  return `<div style="margin:6px 0 18px;max-width:520px;border:1px solid ${LINE};border-radius:10px;padding:14px 16px 10px">
<div style="font:600 14px/1.4 ${FONT};color:${INK};padding-bottom:12px">${esc(b.title)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
${ticks ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${ticks}</tr></table>` : ""}
${b.note ? `<div style="padding-top:8px;font:400 12px/1.45 ${FONT};color:${MUTED}">${inline(b.note)}</div>` : ""}</div>`;
}

function letterBlock(b: LetterBlock, base: string): string {
  switch (b.kind) {
    case "p":
      return `<p style="margin:0 0 14px;${LETTER_FONT};color:${INK}">${inline(b.text)}</p>`;
    case "list":
      return `<ul style="margin:0 0 14px;padding:0 0 0 20px">${b.items.map((i) => `<li style="margin:0 0 8px;${LETTER_FONT};color:${INK}">${inline(i)}</li>`).join("")}</ul>`;
    case "photo":
      return `<div style="margin:4px 0 18px"><img src="${esc(abs(base, b.src))}"${b.fallback ? ` data-fallback="${esc(abs(base, b.fallback))}"` : ""} width="${b.width ?? 560}" alt="${esc(b.alt)}" style="display:block;width:100%;max-width:${b.width ?? 560}px;height:auto;border-radius:8px;border:0"></div>`;
    case "thumbs": {
      const w = Math.floor(100 / b.items.length);
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:2px 0 16px"><tr>${b.items
        .map((i) => `<td width="${w}%" style="padding:0 10px 0 0;vertical-align:top"><img src="${esc(abs(base, i.src))}" width="140" alt="${esc(i.alt)}" style="display:block;width:100%;max-width:140px;height:auto;border-radius:8px;border:0"><div style="padding-top:6px;font:400 13px/1.4 ${FONT};color:${MUTED}">${esc(i.caption)}</div></td>`)
        .join("")}</tr></table>`;
    }
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="background:${INK};border-radius:6px"><a href="${esc(b.href)}" style="display:inline-block;padding:12px 22px;font:600 15px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:6px">${esc(b.label)}</a></td></tr></table>`;
    case "choices":
      return `<div style="margin:2px 0 18px">${b.items
        .map((i) => `<a href="${esc(i.href)}" style="display:inline-block;margin:0 6px 8px 0;padding:10px 16px;border-radius:6px;font:600 14px/1 ${FONT};text-decoration:none;${i.primary ? `background:${INK};color:#ffffff;border:1px solid ${INK}` : `color:${INK};border:1px solid ${INK}`}">${esc(i.label)}</a>`)
        .join("")}</div>`;
    case "chart":
      return chart(b);
  }
}

export function letterHtml(e: LetterEmail): string {
  const f = e.footer;
  const signoff = e.signoff === undefined ? "Cheers," : e.signoff;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>${DARK_CSS}</style></head>
<body class="pe-shell" style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="pe-shell" style="background:#ffffff"><tr><td style="padding:20px 18px">
<div style="max-width:600px">
${e.blocks.map((b) => letterBlock(b, e.base)).join("\n")}
${signoff ? `<p style="margin:0 0 10px;${LETTER_FONT};color:${INK}">${esc(signoff)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px"><tr>
<td style="padding-right:12px;vertical-align:top">${avatar(e.base, e.signer.name, e.signer.photo, 44)}</td>
<td style="vertical-align:top;font:400 14px/1.45 ${FONT};color:${MUTED}"><div style="font:600 15px/1.35 ${FONT};color:${INK}">${esc(e.signer.name)}</div>${esc(e.signer.role)}<br><a href="${esc(f.phoneHref)}" style="color:${MUTED};text-decoration:none">${esc(f.phone)}</a> &middot; <a href="${esc(f.site)}" style="color:${MUTED};text-decoration:none">${esc(f.site.replace(/^https?:\/\/(www\.)?/, ""))}</a></td>
</tr></table>
</div></td></tr></table></body></html>`;
  return darkClasses(html);
}

export function letterText(e: LetterEmail): string {
  const plain = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1");
  const out = e.blocks.flatMap((b): string[] => {
    switch (b.kind) {
      case "p": return [plain(b.text)];
      case "list": return [b.items.map((i) => `- ${plain(i)}`).join("\n")];
      case "thumbs": return [b.items.map((i) => i.caption).join(" · ")];
      case "photo": return [];
      case "button": return [`${b.label}: ${b.href}`];
      case "choices": return [b.items.map((i) => `${i.label}: ${i.href}`).join("\n")];
      case "chart": return [`${b.title}\n${b.rows.map((r) => `- ${r.label}: ${r.value}`).join("\n")}${b.note ? `\n${plain(b.note)}` : ""}`];
    }
  });
  const signoff = e.signoff === undefined ? "Cheers," : e.signoff;
  out.push(`${signoff ? `${signoff}\n` : ""}${e.signer.name}\n${e.signer.role}\n${e.footer.phone} · ${e.footer.site}`);
  return out.join("\n\n");
}
