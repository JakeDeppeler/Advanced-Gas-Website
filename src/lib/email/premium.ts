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
 * The words run the full width of the reading pane, as an email typed in
 * Outlook does (Jake, 8 Nov: "why is the wording not going the full length?").
 * Capped at 600px it sat in the left half of a wide window, which is what a
 * template looks like. Photos, figures and buttons keep their own sizes.
 *
 * White, with the brand's colour in the few places it earns it: the figures,
 * the buttons, bold words and the signature (Jake, 8 Nov: "remove the old
 * gray background and add some colour and clean stats"). It asks to stay
 * light: Apple Mail and iPhone honour that, so customers see it as written;
 * Outlook for Mac in dark mode still repaints it, and its sun button shows
 * the light version.
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
   * A few big figures, each with what it means underneath in words, so the
   * number is never the only thing carrying it. Two to a row, or three when
   * there are three.
   */
  | { kind: "stats"; items: { value: string; label: string }[]; note?: string }
  /** A small muted aside: where a message came from, what the portal did with it. */
  | { kind: "note"; text: string };

export type LetterEmail = {
  preheader: string;
  blocks: LetterBlock[];
  /** `contact`: lines under the name in place of our phone and website, when the message is from a customer. */
  signer: { name: string; role: string; photo: string | null; contact?: { text: string; href: string }[] };
  /** "Cheers," above the signature; null when the words already sign off. */
  signoff?: string | null;
  base: string;
  footer: PremiumEmail["footer"];
};

/** --navy and --orange-deep from the site: navy for words that matter, orange-deep where white text sits on it. */
const NAVY = "#050a30";
const BRAND = "#c2521a";
const BRAND_BRIGHT = "#f36722";
const LETTER_FONT = "font:400 15px/1.6 " + FONT;

/** Bold words in navy, so the thing being described stands out without shouting. */
const letterInline = (t: string) => inline(t).replace(/<strong>/g, `<strong style="color:${NAVY}">`);

function stats(b: Extract<LetterBlock, { kind: "stats" }>): string {
  const per = b.items.length === 3 ? 3 : 2;
  const rows: { value: string; label: string }[][] = [];
  for (let n = 0; n < b.items.length; n += per) rows.push(b.items.slice(n, n + per));
  const w = Math.floor(100 / per);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:4px 0 ${b.note ? 6 : 18}px">${rows
    .map((r) => `<tr>${r
      .map((s) => `<td width="${w}%" style="padding:0 14px 16px 0;vertical-align:top"><div style="border-top:3px solid ${BRAND_BRIGHT};padding-top:10px"><div style="font:700 24px/1.15 ${FONT};color:${NAVY}">${esc(s.value)}</div><div style="padding-top:4px;font:400 13px/1.45 ${FONT};color:${MUTED}">${esc(s.label)}</div></div></td>`)
      .join("")}${r.length < per ? `<td width="${w * (per - r.length)}%"></td>` : ""}</tr>`)
    .join("")}</table>${b.note ? `<p style="margin:0 0 18px;font:400 12px/1.45 ${FONT};color:${MUTED}">${letterInline(b.note)}</p>` : ""}`;
}

function letterBlock(b: LetterBlock, base: string): string {
  switch (b.kind) {
    case "p":
      return `<p style="margin:0 0 14px;${LETTER_FONT};color:${INK}">${letterInline(b.text)}</p>`;
    case "list":
      return `<ul style="margin:0 0 14px;padding:0 0 0 20px">${b.items.map((i) => `<li style="margin:0 0 8px;${LETTER_FONT};color:${INK}">${letterInline(i)}</li>`).join("")}</ul>`;
    case "photo":
      return `<div style="margin:4px 0 18px"><img src="${esc(abs(base, b.src))}"${b.fallback ? ` data-fallback="${esc(abs(base, b.fallback))}"` : ""} width="${b.width ?? 560}" alt="${esc(b.alt)}" style="display:block;width:100%;max-width:${b.width ?? 560}px;height:auto;border-radius:8px;border:0"></div>`;
    case "thumbs": {
      const w = Math.floor(100 / b.items.length);
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:2px 0 16px"><tr>${b.items
        .map((i) => `<td width="${w}%" style="padding:0 10px 0 0;vertical-align:top"><img src="${esc(abs(base, i.src))}" width="140" alt="${esc(i.alt)}" style="display:block;width:100%;max-width:140px;height:auto;border-radius:8px;border:0"><div style="padding-top:6px;font:600 13px/1.4 ${FONT};color:${NAVY}">${esc(i.caption)}</div></td>`)
        .join("")}</tr></table>`;
    }
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="background:${BRAND};border-radius:6px"><a href="${esc(b.href)}" style="display:inline-block;padding:13px 24px;font:600 15px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:6px">${esc(b.label)}</a></td></tr></table>`;
    case "choices":
      return `<div style="margin:2px 0 18px">${b.items
        .map((i) => `<a href="${esc(i.href)}" style="display:inline-block;margin:0 6px 8px 0;padding:11px 16px;border-radius:6px;font:600 14px/1 ${FONT};text-decoration:none;${i.primary ? `background:${BRAND};color:#ffffff;border:1px solid ${BRAND}` : `color:${NAVY};border:1px solid ${NAVY}`}">${esc(i.label)}</a>`)
        .join("")}</div>`;
    case "stats":
      return stats(b);
    case "note":
      return `<p style="margin:0 0 14px;font:400 13px/1.5 ${FONT};color:${MUTED}">${letterInline(b.text)}</p>`;
  }
}

/** Our phone and website under the name; a customer's own mobile and email when the message is theirs. */
function signatureLinks(e: Pick<LetterEmail, "footer" | "signer">): string {
  const f = e.footer;
  const links = e.signer.contact ?? [{ text: f.phone, href: f.phoneHref }, { text: f.site.replace(/^https?:\/\/(www\.)?/, ""), href: f.site }];
  return links.map((l, n) => `<a href="${esc(l.href)}" style="color:${n === 0 ? BRAND : MUTED};${n === 0 ? "font-weight:600;" : ""}text-decoration:none">${esc(l.text)}</a>`).join(" &middot; ");
}

export function letterHtml(e: LetterEmail): string {
  const f = e.footer;
  const signoff = e.signoff === undefined ? "Cheers," : e.signoff;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff"><tr><td style="padding:20px 18px">
<div>
${e.blocks.map((b) => letterBlock(b, e.base)).join("\n")}
${signoff ? `<p style="margin:0 0 10px;${LETTER_FONT};color:${INK}">${esc(signoff)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px"><tr>
<td style="padding-right:12px;vertical-align:top">${avatar(e.base, e.signer.name, e.signer.photo, 44)}</td>
<td style="vertical-align:top;font:400 14px/1.45 ${FONT};color:${MUTED}"><div style="font:700 15px/1.35 ${FONT};color:${NAVY}">${esc(e.signer.name)}</div>${esc(e.signer.role)}<br>${signatureLinks(e)}</td>
</tr></table>
</div></td></tr></table></body></html>`;
}

/* ------------------------------------------------------------ the showcase */

/**
 * The designed look, for the review request (Jake, 28 Nov, with Poppi, Gymshark,
 * Oura and Summer Fridays emails beside it: "this is how the email should show").
 * It reverses his 8 Nov "look like a real email" for this one email only; the
 * quote and job emails stay letters.
 *
 * One flow of colour from top to bottom, no bands (Jake, 28 Nov, on the Summer
 * Fridays one: "one full flow and no break in the colour"). The hero (logo, the
 * question as a headline with the tech's name picked out, the stars and the
 * button); the job's photo straight under it, edge to edge when it's a wide
 * one, otherwise centred on the hero's colour as it turns; then one stretch of
 * colour holding the words (centred, the greeting as a heading), the ask (no box
 * of its own), the signature, three points and the footer.
 *
 * The colours come from a theme, so the same email can be drawn several ways:
 * "blue" is the one Jake signed off ("this looks so much better"); the others
 * are the alternatives he asked to see. Off the brand's palette on purpose
 * ("we can go off brand a little bit").
 *
 * Gradients where the inbox draws them (Apple Mail, iPhone, Gmail, Outlook.com),
 * the solid colour at each end where it doesn't (Outlook on Windows). The stars
 * and icons are text, not images, so the ask reads with pictures blocked. Same
 * table-and-inline build as the others, light only.
 */
export type ShowcaseTheme = {
  /** Around the email. */
  ground: string;
  hero: { bg: string; text: string; sub: string; eyebrow: string; accent: string; stars: string; note: string; pillBg: string; pillText: string };
  /** The headline's face, weight, case and spacing. */
  head: { font: string; weight: number; upper: boolean; spacing: string };
  /** The stretch under the photo, top to bottom. */
  flowTop: string;
  flowEnd: string;
  text: string;
  muted: string;
  heading: string;
  rule: string;
  stars: string;
  pillBg: string;
  pillText: string;
  iconBg: string;
  iconText: string;
  /** The phone number under the signature. */
  link: string;
};

export type ShowcaseEmail = {
  preheader: string;
  /** Small caps over the headline. */
  eyebrow: string;
  headline: string;
  /** A word in the headline to pick out (the tech's name). */
  accent?: string;
  sub: string;
  cta: { label: string; href: string; note?: string };
  /** `width` under 560 (a tall photo): centred at that width rather than edge to edge. */
  photo?: { src: string; alt: string; fallback?: string; width?: number };
  /** The words. The first "button" block splits them: before it, the ask, then the rest. */
  blocks: LetterBlock[];
  /** Three short "what we stand for" points. */
  points: { title: string; text: string }[];
  signer: LetterEmail["signer"];
  signoff?: string | null;
  base: string;
  footer: PremiumEmail["footer"];
  /** Defaults to the blue one. */
  theme?: ShowcaseTheme;
};

/** The site's display face isn't in any inbox; this is the heaviest one most of them have. */
const DISPLAY = "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',Times,serif";

export const SHOWCASE_THEMES = {
  /** Navy into periwinkle into near-white (after Summer Fridays). The one in use. */
  blue: {
    ground: "#e9eef6",
    hero: { bg: NAVY, text: "#ffffff", sub: "#c9cbe0", eyebrow: BRAND_BRIGHT, accent: "#2cc5ff", stars: "#ffb648", note: "#9fa3c4", pillBg: "#ffffff", pillText: NAVY },
    head: { font: DISPLAY, weight: 900, upper: false, spacing: "-.02em" },
    flowTop: "#b9cbe8", flowEnd: "#f2f5fa",
    text: "#1f2a44", muted: "#4a5672", heading: NAVY, rule: "#9aa8c4", stars: "#f5a524",
    pillBg: NAVY, pillText: "#ffffff", iconBg: "#ffffff", iconText: NAVY, link: BRAND,
  },
  /** Near-black all the way down, sky and white on it (after Gymshark). */
  midnight: {
    ground: "#0a0c10",
    hero: { bg: "#0b0d12", text: "#ffffff", sub: "#a9b1c2", eyebrow: "#2cc5ff", accent: "#2cc5ff", stars: "#ffb648", note: "#7d8799", pillBg: "#ffffff", pillText: "#0b0d12" },
    head: { font: DISPLAY, weight: 900, upper: true, spacing: "-.01em" },
    flowTop: "#121722", flowEnd: "#0b0d12",
    text: "#dfe4ec", muted: "#97a1b3", heading: "#ffffff", rule: "#2a3344", stars: "#ffb648",
    pillBg: "#2cc5ff", pillText: "#0b0d12", iconBg: "#1c2330", iconText: "#2cc5ff", link: "#2cc5ff",
  },
  /** Cool grey into warm stone, serif headings (after Oura). */
  stone: {
    ground: "#e7e4df",
    hero: { bg: "#c8cdd7", text: "#1f2430", sub: "#4b5160", eyebrow: "#6b5a43", accent: "#3d5a8c", stars: "#a8823b", note: "#5d6372", pillBg: "#1f2430", pillText: "#ffffff" },
    head: { font: SERIF, weight: 400, upper: false, spacing: "-.01em" },
    flowTop: "#d8dce4", flowEnd: "#f1ece5",
    text: "#2b2c31", muted: "#5f6068", heading: "#1f2430", rule: "#b9b3a8", stars: "#a8823b",
    pillBg: "#1f2430", pillText: "#ffffff", iconBg: "#ffffff", iconText: "#1f2430", link: "#1f2430",
  },
  /** Coral into peach into cream (after Poppi). */
  sunset: {
    ground: "#fbe7da",
    hero: { bg: "#e4572e", text: "#ffffff", sub: "#ffe1d3", eyebrow: "#ffe08a", accent: "#ffe08a", stars: "#ffffff", note: "#ffd3bf", pillBg: "#ffffff", pillText: "#c23d17" },
    head: { font: DISPLAY, weight: 900, upper: false, spacing: "-.02em" },
    flowTop: "#f6a47f", flowEnd: "#fdf3ea",
    text: "#3b2219", muted: "#7a5246", heading: "#a8300f", rule: "#e3a88c", stars: "#e4572e",
    pillBg: "#e4572e", pillText: "#ffffff", iconBg: "#ffffff", iconText: "#e4572e", link: "#c23d17",
  },
} satisfies Record<string, ShowcaseTheme>;

export type ShowcaseThemeName = keyof typeof SHOWCASE_THEMES;

/** One per point: a house, a tick, a star. Text glyphs, not images, for blocked-image inboxes. */
const POINT_GLYPHS = ["&#8962;", "&#10003;", "&#9733;"];

/** A vertical gradient, with its first colour as the fallback for inboxes that don't draw gradients. */
const flow = (from: string, to: string) => `background-color:${from};background-image:linear-gradient(180deg,${from} 0%,${to} 100%)`;

const starsLink = (href: string, size: number, color: string) =>
  `<a href="${esc(href)}" style="text-decoration:none;color:${color};font:400 ${size}px/1 ${FONT};letter-spacing:${Math.round(size / 6)}px">&#9733;&#9733;&#9733;&#9733;&#9733;</a>`;

const pill = (label: string, href: string, bg: string, fg: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="border-radius:999px;background:${bg}"><a href="${esc(href)}" style="display:inline-block;padding:15px 30px;font:700 16px/1 ${FONT};color:${fg};text-decoration:none;border-radius:999px">${esc(label)} &rarr;</a></td></tr></table>`;

/** A centred column the width those emails keep their words to. */
const column = (inner: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="460" style="width:100%;max-width:460px"><tr><td align="center">${inner}</td></tr></table>`;

/** A heading inside the flow: the theme's face and case, a touch less tightly set than the headline. */
const headStyle = (t: ShowcaseTheme, size: number, lh: number) =>
  `font:${t.head.weight} ${t.head.upper ? Math.round(size * 0.9) : size}px/${lh} ${t.head.font};letter-spacing:-.01em;${t.head.upper ? "text-transform:uppercase;" : ""}color:${t.heading}`;

/** The words centred, in the theme's colours; a short "Hi Sarah," at the top becomes a heading. */
function showcaseWords(blocks: LetterBlock[], base: string, greet: boolean, t: ShowcaseTheme): string {
  const words = (s: string) => inline(s).replace(/<strong>/g, `<strong style="color:${t.heading}">`);
  return blocks
    .map((b, n) => {
      if (b.kind !== "p") return letterBlock(b, base).split(LETTER_FONT).join(`font:400 16px/1.7 ${FONT}`).split(`color:${INK}`).join(`color:${t.text}`).split(`color:${NAVY}`).join(`color:${t.heading}`);
      if (greet && n === 0 && b.text.length < 40 && /,\s*$/.test(b.text)) return `<div style="padding-bottom:14px;${headStyle(t, 28, 1.2)}">${words(b.text)}</div>`;
      return `<p style="margin:0 0 16px;font:400 16px/1.7 ${FONT};color:${t.text}">${words(b.text)}</p>`;
    })
    .join("\n");
}

/** A short centred rule between the parts of the flow, in place of a change of colour. */
const rule = (color: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td width="48" height="3" style="width:48px;height:3px;border-radius:2px;background:${color};font-size:0;line-height:0">&nbsp;</td></tr></table>`;

export function showcaseHtml(e: ShowcaseEmail): string {
  const t = e.theme ?? SHOWCASE_THEMES.blue;
  const h = t.hero;
  const f = e.footer;
  const signoff = e.signoff === undefined ? "Cheers," : e.signoff;
  // Escaped first, then the accent wrapped, so a name can't carry markup in.
  const headline = e.accent && e.headline.includes(e.accent)
    ? esc(e.headline).replace(esc(e.accent), `<span style="color:${h.accent}">${esc(e.accent)}</span>`)
    : esc(e.headline);
  const img = (w: number, edge: boolean) => e.photo
    ? `<img src="${esc(abs(e.base, e.photo.src))}"${e.photo.fallback ? ` data-fallback="${esc(abs(e.base, e.photo.fallback))}"` : ""} width="${w}" alt="${esc(e.photo.alt)}" style="display:block;width:100%;max-width:${w}px;height:auto;border:0${edge ? "" : ";border-radius:18px"}">`
    : "";
  // A wide photo runs edge to edge, as in the mock; a tall one sits centred on the hero's colour as it turns.
  const wide = (e.photo?.width ?? 600) >= 560;
  const photo = !e.photo ? "" : wide
    ? `<tr><td style="padding:0;background:${h.bg}">${img(600, true)}</td></tr>`
    : `<tr><td class="sc-pad" align="center" style="${flow(h.bg, t.flowTop)};padding:4px 40px 0">${img(e.photo.width ?? 420, false)}</td></tr>`;
  // The words split at the button: what leads up to the ask, the ask, what follows it.
  const at = e.blocks.findIndex((b) => b.kind === "button");
  const ask = at >= 0 ? (e.blocks[at] as Extract<LetterBlock, { kind: "button" }>) : { label: e.cta.label, href: e.cta.href };
  const before = at >= 0 ? e.blocks.slice(0, at) : e.blocks;
  const after = at >= 0 ? e.blocks.slice(at + 1) : [];
  const w = Math.floor(100 / Math.max(1, e.points.length));
  const points = e.points.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px"><tr>${e.points
        .map((p, n) => `<td class="sc-pt" width="${w}%" align="center" style="padding:0 8px 18px;vertical-align:top">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td width="46" height="46" align="center" style="width:46px;height:46px;border-radius:50%;background:${t.iconBg};font:700 20px/46px ${FONT};color:${t.iconText}">${POINT_GLYPHS[n % POINT_GLYPHS.length]}</td></tr></table>
<div style="padding-top:12px;${headStyle(t, 16, 1.3)}">${esc(p.title)}</div>
<div style="padding-top:5px;font:400 14px/1.5 ${FONT};color:${t.muted}">${esc(p.text)}</div></td>`)
        .join("")}</tr></table>`
    : "";
  const sig = (e.signer.contact ?? [{ text: f.phone, href: f.phoneHref }, { text: f.site.replace(/^https?:\/\/(www\.)?/, ""), href: f.site }])
    .map((l, n) => `<a href="${esc(l.href)}" style="color:${n === 0 ? t.link : t.muted};${n === 0 ? "font-weight:600;" : ""}text-decoration:none">${esc(l.text)}</a>`)
    .join(" &middot; ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<style>
@media (max-width:620px){
  .sc-outer{padding:0!important}
  .sc-shell{border-radius:0!important}
  .sc-pad{padding-left:22px!important;padding-right:22px!important}
  .sc-h1{font-size:32px!important}
  .sc-pt{display:block!important;width:100%!important;padding:0 0 22px!important}
}
</style></head>
<body style="margin:0;padding:0;background:${t.ground}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${t.ground}"><tr><td class="sc-outer" align="center" style="padding:24px 12px">
<table class="sc-shell" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${t.flowEnd};border-radius:20px;overflow:hidden">
<tr><td class="sc-pad" align="center" style="background:${h.bg};padding:28px 40px 8px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#ffffff;border-radius:12px;padding:8px 12px"><img src="${esc(abs(e.base, "/email/logo.jpg"))}" width="132" alt="${esc(f.name)}" style="display:block;width:132px;height:auto;border:0"></td></tr></table>
<div style="padding-top:30px;font:700 12px/1.4 ${FONT};letter-spacing:.18em;text-transform:uppercase;color:${h.eyebrow}">${esc(e.eyebrow)}</div>
<div class="sc-h1" style="padding-top:12px;font:${t.head.weight} ${t.head.upper ? 36 : 40}px/1.08 ${t.head.font};letter-spacing:${t.head.spacing};${t.head.upper ? "text-transform:uppercase;" : ""}color:${h.text}">${headline}</div>
<div style="padding-top:12px;font:400 17px/1.5 ${FONT};color:${h.sub}">${esc(e.sub)}</div>
<div style="padding:22px 0 18px">${starsLink(e.cta.href, 34, h.stars)}</div>
${pill(e.cta.label, e.cta.href, h.pillBg, h.pillText)}
${e.cta.note ? `<div style="padding:12px 0 30px;font:400 13px/1.4 ${FONT};color:${h.note}">${esc(e.cta.note)}</div>` : `<div style="padding-bottom:30px"></div>`}
</td></tr>
${photo}
<tr><td class="sc-pad" align="center" style="${flow(t.flowTop, t.flowEnd)};padding:44px 40px 34px">
${column(showcaseWords(before, e.base, true, t))}
<div style="padding:18px 0 22px">${rule(t.rule)}</div>
<div style="padding-bottom:12px">${starsLink(ask.href, 40, t.stars)}</div>
<div style="padding-bottom:8px;${headStyle(t, 26, 1.2)}">Rate your job on Google</div>
<div style="padding-bottom:22px;font:400 15px/1.6 ${FONT};color:${t.text}">${e.cta.note ? `${esc(e.cta.note)}. ` : ""}It helps the next family find us.</div>
${pill(ask.label, ask.href, t.pillBg, t.pillText)}
<div style="padding:30px 0 26px">${rule(t.rule)}</div>
${column(`${showcaseWords(after, e.base, false, t)}
${signoff ? `<p style="margin:0 0 18px;font:400 16px/1.7 ${FONT};color:${t.text}">${esc(signoff)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">${avatar(e.base, e.signer.name, e.signer.photo, 64)}</td></tr></table>
<div style="padding-top:10px;font:700 17px/1.35 ${FONT};color:${t.heading}">${esc(e.signer.name)}</div>
<div style="font:400 14px/1.6 ${FONT};color:${t.muted}">${esc(e.signer.role)}<br>${sig}</div>`)}
${points}
<div style="padding:10px 0 18px">${rule(t.rule)}</div>
<div style="font:700 14px/1.5 ${FONT};color:${t.heading}">${esc(f.name)}</div>
<div style="font:400 13px/1.7 ${FONT};color:${t.muted}">${esc(f.address)}<br>
<a href="${esc(f.phoneHref)}" style="color:${t.heading};text-decoration:none">${esc(f.phone)}</a> &middot; <a href="${esc(f.site)}" style="color:${t.heading};text-decoration:none">${esc(f.site.replace(/^https?:\/\/(www\.)?/, ""))}</a></div>
</td></tr>
</table>
</td></tr></table></body></html>`;
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
      case "stats": return [`${b.items.map((s) => `- ${s.value}: ${s.label}`).join("\n")}${b.note ? `\n${plain(b.note)}` : ""}`];
      case "note": return [plain(b.text)];
    }
  });
  const signoff = e.signoff === undefined ? "Cheers," : e.signoff;
  const contact = e.signer.contact ? e.signer.contact.map((l) => l.text).join(" · ") : `${e.footer.phone} · ${e.footer.site}`;
  out.push(`${signoff ? `${signoff}\n` : ""}${e.signer.name}\n${e.signer.role}\n${contact}`);
  return out.join("\n\n");
}
