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
 * Only our own /email/ pictures, fetched from the live site: public/ isn't
 * on the function's disk on Vercel. One that can't be fetched stays a link,
 * which is no worse than before.
 */

const cache = new Map<string, Promise<string | null>>();

function fetchBase64(url: string): Promise<string | null> {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok || !/^image\//.test(res.headers.get("content-type") ?? "")) return null;
        return Buffer.from(await res.arrayBuffer()).toString("base64");
      } catch {
        return null;
      }
    })());
  }
  return cache.get(url)!;
}

export async function withInlineImages(msg: ResendMessage): Promise<ResendMessage> {
  if (!msg.html) return msg;
  const prefix = `${site.url.replace(/\/$/, "")}/email/`;
  const srcs = [...new Set([...msg.html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]).filter((s) => s.startsWith(prefix)))];
  if (!srcs.length) return msg;
  let html = msg.html;
  const attachments = [...(msg.attachments ?? [])];
  await Promise.all(srcs.map(async (src, n) => {
    const file = decodeURIComponent(src.slice(prefix.length)).replace(/[^\w.-]/g, "_");
    const content = await fetchBase64(src);
    if (!content) return;
    const cid = `ag${n}-${file}`;
    attachments.push({ filename: file, content, content_id: cid, content_type: file.endsWith(".png") ? "image/png" : "image/jpeg" });
    html = html.split(`src="${src}"`).join(`src="cid:${cid}"`);
  }));
  return { ...msg, html, attachments };
}
