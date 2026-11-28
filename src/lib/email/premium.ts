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
 * The designed look, for the review request (Jake, 28 Nov, with Poppi, Gymshark
 * and Oura emails beside it: "this is how the email should show"). It reverses
 * his 8 Nov "look like a real email" for this one email only; the quote and job
 * emails stay letters.
 *
 * Top to bottom: a navy hero (logo, the question as a headline with the tech's
 * name in the site's sky blue, the stars and the button), then sections the way
 * those emails run (Jake, 28 Nov: "the header looks great but the bottom half
 * doesn't look [like] the email ... we can go off brand a little bit"): the
 * job's photo on a soft blue, the words centred with the greeting as a heading,
 * the ask in a peach block of its own, the rest of the words and the signature
 * centred, three tiles of what we stand for, and a navy footer. The photo came
 * off navy because he didn't like the colour with it. The stars and the tile
 * icons are text, not images, so the ask still reads in an inbox that blocks
 * pictures. Same table-and-inline build as the others, light only (Apple Mail
 * and iPhone honour that).
 */
export type ShowcaseEmail = {
  preheader: string;
  /** Small caps over the headline. */
  eyebrow: string;
  headline: string;
  /** A word in the headline to colour (the tech's name). */
  accent?: string;
  sub: string;
  cta: { label: string; href: string; note?: string };
  photo?: { src: string; alt: string; fallback?: string; width?: number };
  /** The words. The first "button" block splits them: before it, the ask's own block, then the rest. */
  blocks: LetterBlock[];
  /** Three short "what we stand for" points. */
  points: { title: string; text: string }[];
  signer: LetterEmail["signer"];
  signoff?: string | null;
  base: string;
  footer: PremiumEmail["footer"];
};

const SKY = "#2cc5ff";
const GOLD = "#ffb648";
/* Off the brand's own palette on purpose (Jake: "we can go off brand a little bit"): the soft
   blues, peaches and sands those emails sit on, with navy and orange kept for words and buttons. */
const SC_GROUND = "#eef0f4";
const SC_BLUE = "#e3ecf6";
const SC_PEACH = "#fde9db";
const SC_SAND = "#f6f1ea";
const SC_TEXT = "#2b2f3a";
/** The site's display face isn't in any inbox; this is the heaviest one most of them have. */
const DISPLAY = "'Arial Black','Helvetica Neue',Helvetica,Arial,sans-serif";
/** One per tile: a house, a tick, a star. Text glyphs, not images, for blocked-image inboxes. */
const TILE_GLYPHS = ["&#8962;", "&#10003;", "&#9733;"];

const starsLink = (href: string, size: number) =>
  `<a href="${esc(href)}" style="text-decoration:none;color:${GOLD};font:400 ${size}px/1 ${FONT};letter-spacing:${Math.round(size / 6)}px">&#9733;&#9733;&#9733;&#9733;&#9733;</a>`;

const pill = (label: string, href: string, solid: boolean) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="border-radius:999px;background:${solid ? BRAND : "#ffffff"}"><a href="${esc(href)}" style="display:inline-block;padding:15px 30px;font:700 16px/1 ${FONT};color:${solid ? "#ffffff" : NAVY};text-decoration:none;border-radius:999px">${esc(label)} &rarr;</a></td></tr></table>`;

/** A centred column the width those emails keep their words to. */
const column = (inner: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="460" style="width:100%;max-width:460px"><tr><td align="center">${inner}</td></tr></table>`;

/** The words centred; a short "Hi Sarah," at the top becomes the section's heading. */
function showcaseWords(blocks: LetterBlock[], base: string, greet: boolean): string {
  return blocks
    .map((b, n) => {
      if (b.kind !== "p") return letterBlock(b, base).split(LETTER_FONT).join(`font:400 16px/1.7 ${FONT}`);
      if (greet && n === 0 && b.text.length < 40 && /,\s*$/.test(b.text)) return `<div style="padding-bottom:14px;font:900 26px/1.2 ${DISPLAY};letter-spacing:-.01em;color:${NAVY}">${letterInline(b.text)}</div>`;
      return `<p style="margin:0 0 16px;font:400 16px/1.7 ${FONT};color:${SC_TEXT}">${letterInline(b.text)}</p>`;
    })
    .join("\n");
}

/** The ask on a peach block of its own: the stars, a heading, a line, the button. */
function showcaseAsk(label: string, href: string, note: string | undefined): string {
  return `<tr><td class="sc-pad" align="center" style="background:${SC_PEACH};padding:38px 40px 36px">
<div style="padding-bottom:12px">${starsLink(href, 40)}</div>
<div style="padding-bottom:8px;font:900 26px/1.2 ${DISPLAY};letter-spacing:-.01em;color:${NAVY}">Rate your job on Google</div>
<div style="padding-bottom:22px;font:400 15px/1.6 ${FONT};color:${SC_TEXT}">${note ? `${esc(note)}. ` : ""}It helps the next family find us.</div>
${pill(label, href, true)}
</td></tr>`;
}

export function showcaseHtml(e: ShowcaseEmail): string {
  const f = e.footer;
  const signoff = e.signoff === undefined ? "Cheers," : e.signoff;
  // Escaped first, then the accent wrapped, so a name can't carry markup in.
  const headline = e.accent && e.headline.includes(e.accent)
    ? esc(e.headline).replace(esc(e.accent), `<span style="color:${SKY}">${esc(e.accent)}</span>`)
    : esc(e.headline);
  const pw = Math.min(e.photo?.width ?? 460, 460);
  const photo = e.photo
    ? `<tr><td class="sc-pad" align="center" style="background:${SC_BLUE};padding:34px 40px">${column(`<img src="${esc(abs(e.base, e.photo.src))}"${e.photo.fallback ? ` data-fallback="${esc(abs(e.base, e.photo.fallback))}"` : ""} width="${pw}" alt="${esc(e.photo.alt)}" style="display:block;width:100%;max-width:${pw}px;height:auto;border-radius:18px;border:0">`)}</td></tr>`
    : "";
  // The words split at the button: what leads up to the ask, the ask, what follows it.
  const at = e.blocks.findIndex((b) => b.kind === "button");
  const ask = at >= 0 ? (e.blocks[at] as Extract<LetterBlock, { kind: "button" }>) : { label: e.cta.label, href: e.cta.href };
  const before = at >= 0 ? e.blocks.slice(0, at) : e.blocks;
  const after = at >= 0 ? e.blocks.slice(at + 1) : [];
  const w = Math.floor(100 / Math.max(1, e.points.length));
  const tiles = e.points.length
    ? `<tr><td class="sc-pad" style="background:${SC_SAND};padding:30px 28px 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${e.points
        .map((p, n) => `<td class="sc-pt" width="${w}%" style="padding:0 6px 12px;vertical-align:top"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px"><tr><td align="center" style="padding:22px 14px 20px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td width="44" height="44" align="center" style="width:44px;height:44px;border-radius:50%;background:${SC_PEACH};font:700 20px/44px ${FONT};color:${BRAND}">${TILE_GLYPHS[n % TILE_GLYPHS.length]}</td></tr></table>
<div style="padding-top:12px;font:900 16px/1.3 ${DISPLAY};color:${NAVY}">${esc(p.title)}</div>
<div style="padding-top:5px;font:400 14px/1.5 ${FONT};color:${MUTED}">${esc(p.text)}</div>
</td></tr></table></td>`)
        .join("")}</tr></table></td></tr>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<style>
@media (max-width:620px){
  .sc-outer{padding:0!important}
  .sc-shell{border-radius:0!important}
  .sc-pad{padding-left:22px!important;padding-right:22px!important}
  .sc-h1{font-size:32px!important}
  .sc-pt{display:block!important;width:100%!important;padding:0 0 12px!important}
}
</style></head>
<body style="margin:0;padding:0;background:${SC_GROUND}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(e.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SC_GROUND}"><tr><td class="sc-outer" align="center" style="padding:24px 12px">
<table class="sc-shell" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td class="sc-pad" align="center" style="background:${NAVY};padding:28px 40px 8px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#ffffff;border-radius:12px;padding:8px 12px"><img src="${esc(abs(e.base, "/email/logo.jpg"))}" width="132" alt="${esc(f.name)}" style="display:block;width:132px;height:auto;border:0"></td></tr></table>
<div style="padding-top:30px;font:700 12px/1.4 ${FONT};letter-spacing:.18em;text-transform:uppercase;color:${BRAND_BRIGHT}">${esc(e.eyebrow)}</div>
<div class="sc-h1" style="padding-top:12px;font:900 40px/1.08 ${DISPLAY};letter-spacing:-.02em;color:#ffffff">${headline}</div>
<div style="padding-top:12px;font:400 17px/1.5 ${FONT};color:#c9cbe0">${esc(e.sub)}</div>
<div style="padding:22px 0 18px">${starsLink(e.cta.href, 34)}</div>
${pill(e.cta.label, e.cta.href, false)}
${e.cta.note ? `<div style="padding:12px 0 26px;font:400 13px/1.4 ${FONT};color:#9fa3c4">${esc(e.cta.note)}</div>` : `<div style="padding-bottom:26px"></div>`}
</td></tr>
${photo}
<tr><td class="sc-pad" align="center" style="padding:40px 40px 22px">${column(showcaseWords(before, e.base, true))}</td></tr>
${showcaseAsk(ask.label, ask.href, e.cta.note)}
<tr><td class="sc-pad" align="center" style="padding:38px 40px 36px">${column(`${showcaseWords(after, e.base, false)}
${signoff ? `<p style="margin:0 0 18px;font:400 16px/1.7 ${FONT};color:${SC_TEXT}">${esc(signoff)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center">${avatar(e.base, e.signer.name, e.signer.photo, 64)}</td></tr></table>
<div style="padding-top:10px;font:700 17px/1.35 ${FONT};color:${NAVY}">${esc(e.signer.name)}</div>
<div style="font:400 14px/1.6 ${FONT};color:${MUTED}">${esc(e.signer.role)}<br>${signatureLinks(e)}</div>`)}</td></tr>
${tiles}
<tr><td class="sc-pad" align="center" style="background:${NAVY};padding:26px 40px 28px;font:400 13px/1.7 ${FONT};color:#9fa3c4">
<div style="font:700 14px/1.4 ${FONT};color:#ffffff;padding-bottom:4px">${esc(f.name)}</div>
${esc(f.address)}<br>
<a href="${esc(f.phoneHref)}" style="color:#ffffff;text-decoration:none">${esc(f.phone)}</a> &middot; <a href="${esc(f.site)}" style="color:#ffffff;text-decoration:none">${esc(f.site.replace(/^https?:\/\/(www\.)?/, ""))}</a>
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
