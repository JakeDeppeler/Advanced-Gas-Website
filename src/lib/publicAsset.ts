import fs from "node:fs";
import path from "node:path";

/**
 * Pick the first asset that actually exists in /public, at build time.
 *
 * We used <SafeImg> for this originally, which swaps src on the img's
 * onError. That has a hole: when the primary 404s during the initial
 * HTML parse the error fires before React has hydrated, so the handler
 * never runs and the reader gets a broken-image icon. Fine when the
 * primary usually exists; not fine on a page whose product photography
 * hasn't arrived yet.
 *
 * Resolving on the server removes the guesswork. Drop the real file into
 * /public and the next build picks it up with no code change.
 *
 * Server components only — it touches the filesystem.
 */
export function assetOrFallback(primary: string, fallback: string): string {
  const p = path.join(process.cwd(), "public", primary.replace(/^\//, ""));
  try {
    return fs.existsSync(p) ? primary : fallback;
  } catch {
    return fallback;
  }
}

/** True when the real product photo is on disk, so callers can adjust
 *  framing — a manufacturer shot wants contain, a diagram wants padding. */
export function hasAsset(src: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", src.replace(/^\//, "")));
  } catch {
    return false;
  }
}
