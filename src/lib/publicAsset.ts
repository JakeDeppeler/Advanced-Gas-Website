import fs from "node:fs";
import path from "node:path";

/**
 * Resolve a /public asset at build time, tolerating the extension.
 *
 * We used <SafeImg> for this originally, which swaps src on the img's
 * onError. That has a hole: when the primary 404s during the initial
 * HTML parse the error fires before React has hydrated, so the handler
 * never runs and the reader gets a broken-image icon. Fine when the
 * primary usually exists; not fine on a page whose product photography
 * hasn't arrived yet.
 *
 * Resolving on the server removes the guesswork. Drop the real file into
 * /public and the next build picks it up with no code change — and it no
 * longer has to be the exact extension the catalogue names. Product
 * shots turn up as .jpg or .png as often as .webp, and having the page
 * silently ignore a photo that is sitting right there because the
 * catalogue said .webp is a worse failure than a missing file.
 *
 * Server components only — it touches the filesystem.
 */

const EXTS = [".webp", ".avif", ".png", ".jpg", ".jpeg", ".JPG", ".PNG", ".JPEG"];

/** The real public path for `src`, or null when nothing matches. */
export function resolveAsset(src: string): string | null {
  const rel = src.replace(/^\//, "");
  const dir = path.join(process.cwd(), "public");
  const base = rel.replace(/\.[a-zA-Z0-9]+$/, "");
  try {
    if (fs.existsSync(path.join(dir, rel))) return "/" + rel;
    for (const ext of EXTS) {
      if (fs.existsSync(path.join(dir, base + ext))) return "/" + base + ext;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function assetOrFallback(primary: string, fallback: string): string {
  return resolveAsset(primary) ?? fallback;
}

/** True when the real product photo is on disk, so callers can adjust
 *  framing — a manufacturer shot wants contain, a diagram wants padding. */
export function hasAsset(src: string): boolean {
  return resolveAsset(src) !== null;
}
