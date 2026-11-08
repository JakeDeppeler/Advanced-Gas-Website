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
  hero?: { src: string; alt: string };
  blocks: PremiumBlock[];
  signer?: { name: string; role: string; photo: string | null };
  /** Absolute site URL, so images and links work in an inbox. */
  base: string;
  footer: { name: string; phone: string; phoneHref: string; address: string; site: string };
  /** A short line under the footer, e.g. the rating. */
  proof?: string;
};

const INK = "#16181d";
const MUTED = "#5b6068";
const LINE = "#e7e3dc";
const GROUND = "#f4f1ec";
const ORANGE = "#c2521a"; // --orange-deep: the shade white text stays readable on
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

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
      return `<tr><td class="pe-pad" style="${pad} 14px;font:400 26px/1.25 ${SERIF};color:${INK}">${inline(b.text)}</td></tr>`;
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
      return `<tr><td class="pe-pad" style="${pad} 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${GROUND};border-radius:16px"><tr>
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
        .map((i) => `<td class="pe-fact" width="${Math.floor(100 / b.items.length)}%" style="padding:18px 6px;vertical-align:top;text-align:center"><div style="font:400 26px/1.1 ${SERIF};color:${INK}">${esc(i.value)}</div><div style="padding-top:6px;font:400 12px/1.4 ${FONT};color:${MUTED}">${esc(i.label)}</div></td>`)
        .join("")}</tr></table></td></tr>`;
    case "list":
      return `<tr><td class="pe-pad" style="${pad} 16px">${b.items
        .map((i) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td width="22" style="vertical-align:top;padding:2px 0 10px;font:700 16px/1.6 ${FONT};color:${ORANGE}">&#10003;</td><td style="padding:0 0 10px;font:400 16px/1.6 ${FONT};color:${INK}">${inline(i)}</td></tr></table>`)
        .join("")}</td></tr>`;
    case "quote":
      return `<tr><td class="pe-pad" style="${pad} 22px"><div style="border-left:3px solid ${ORANGE};padding:2px 0 2px 18px"><div style="font:italic 400 18px/1.5 ${SERIF};color:${INK}">&ldquo;${inline(b.text)}&rdquo;</div><div style="padding-top:8px;font:400 13px/1.4 ${FONT};color:${MUTED}">${esc(b.who)}</div></div></td></tr>`;
    case "rule":
      return `<tr><td class="pe-pad" style="${pad} 22px"><div style="border-top:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</div></td></tr>`;
  }
}

export function premiumHtml(e: PremiumEmail): string {
  const { base, footer: f } = e;
  const hero = e.hero
    ? `<tr><td style="padding:0"><img class="pe-hero" src="${esc(abs(base, e.hero.src))}" width="600" alt="${esc(e.hero.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:20px 20px 0 0"></td></tr>`
    : "";
  const signer = e.signer
    ? `<tr><td class="pe-pad" style="padding:6px 40px 34px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:14px;vertical-align:middle">${avatar(base, e.signer.name, e.signer.photo, 52)}</td>
<td style="vertical-align:middle;font:400 14px/1.45 ${FONT};color:${MUTED}"><div style="font:600 15px/1.3 ${FONT};color:${INK}">${esc(e.signer.name)}</div>${esc(e.signer.role)}</td>
</tr></table></td></tr>`
    : `<tr><td style="padding:0 0 18px"></td></tr>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<style>
@media (max-width:620px){
  .pe-pad{padding-left:22px!important;padding-right:22px!important}
  .pe-card{display:block!important;width:100%!important;padding:0 0 18px!important;overflow:hidden}
  .pe-card img{float:left;width:104px!important;margin:0 16px 0 0}
  .pe-outer{padding:0!important}
  .pe-shell{border-radius:0!important}
  .pe-shell img.pe-hero{border-radius:0!important}
}
</style></head>
<body style="margin:0;padding:0;background:${GROUND}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${GROUND}">${esc(e.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND}"><tr><td class="pe-outer" align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td style="padding:0 6px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle"><img src="${esc(abs(base, "/email/logo.jpg"))}" width="150" alt="${esc(f.name)}" style="display:block;width:150px;height:auto;border:0;mix-blend-mode:multiply"></td>
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
