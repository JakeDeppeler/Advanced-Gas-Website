import "server-only";
import { site } from "@/lib/site";
import type { ResendMessage } from "./send";

/**
 * Puts the photos inside the email instead of linking to them.
 *
 * Outlook (and plenty of others) won't load a picture from a website until
 * the reader presses "Download external images", so a customer saw grey
 * boxes and alt text where the photos should be (Jake's inbox, 8 Nov). A
 * picture attached to the email with a content id shows straight away.
 *
 * Only our own pictures: the /email/ ones, and a job photo shrunk by the
 * image optimiser (jobPhoto.ts), fetched from the live site because public/
 * isn't on the function's disk on Vercel. One that can't be fetched stays a
 * link, which is no worse than before.
 */

const cache = new Map<string, Promise<{ b64: string; type: string } | null>>();

function fetchBase64(url: string): Promise<{ b64: string; type: string } | null> {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      try {
        // Asking for JPEG or PNG only, so the optimiser doesn't hand back WebP, which Outlook can't show.
        const res = await fetch(url, { headers: { Accept: "image/jpeg,image/png" }, cache: "no-store" });
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null;
        return { b64: Buffer.from(await res.arrayBuffer()).toString("base64"), type: type.split(";")[0] };
      } catch {
        return null;
      }
    })());
  }
  return cache.get(url)!;
}

export async function withInlineImages(msg: ResendMessage): Promise<ResendMessage> {
  if (!msg.html) return msg;
  const root = site.url.replace(/\/$/, "");
  const ours = (s: string) => s.startsWith(`${root}/email/`) || s.startsWith(`${root}/_next/image?`);
  // As written in the HTML, so &amp; and all: that's what gets replaced.
  const srcs = [...new Set([...msg.html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]).filter(ours))];
  if (!srcs.length) return msg;
  let html = msg.html;
  const attachments = [...(msg.attachments ?? [])];
  await Promise.all(srcs.map(async (src, n) => {
    const url = src.replace(/&amp;/g, "&");
    const file = url.includes("/_next/image?") ? "job-photo.jpg" : decodeURIComponent(url.slice(`${root}/email/`.length)).replace(/[^\w.-]/g, "_");
    let got = await fetchBase64(url);
    let name = file;
    if (!got) {
      // A job photo that won't come through falls back to the stock photo
      // beside it, so a signed photo link never goes out in an email.
      const fb = new RegExp(`src="${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" data-fallback="([^"]+)"`).exec(html)?.[1];
      if (!fb || !ours(fb)) return;
      got = await fetchBase64(fb.replace(/&amp;/g, "&"));
      if (!got) { html = html.split(`src="${src}"`).join(`src="${fb}"`); return; }
      name = decodeURIComponent(fb.slice(`${root}/email/`.length)).replace(/[^\w.-]/g, "_");
    }
    const cid = `ag${n}-${name}`;
    attachments.push({ filename: name, content: got.b64, content_id: cid, content_type: got.type });
    html = html.split(`src="${src}"`).join(`src="cid:${cid}"`);
  }));
  return { ...msg, html, attachments };
}
