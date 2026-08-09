#!/usr/bin/env node
/**
 * Image intake — converts anything dropped into /public into web-ready WebP.
 *
 * Why this exists: photos come off phones as HEIC (often mislabelled .jpg,
 * which no browser will render) at 4-6 MB each. Both problems break the
 * site quietly — a broken image or a blown LCP budget. This turns the
 * fix into one command.
 *
 *   node scripts/optimise-images.mjs                 # report only
 *   node scripts/optimise-images.mjs --write         # convert
 *   node scripts/optimise-images.mjs --write --replace   # convert + delete source
 *
 * Flags:
 *   --write     actually write files (default is a dry run)
 *   --replace   delete the source file once converted
 *   --max=1800  longest-edge cap in px (default 1800)
 *   --quality=82
 *
 * Requires python3 with pillow + pillow-heif:
 *   pip install pillow pillow-heif
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";

const PUBLIC_DIR = "public";
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REPLACE = args.includes("--replace");
const MAX = Number(args.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 1800);
const QUALITY = Number(args.find((a) => a.startsWith("--quality="))?.split("=")[1] ?? 82);

/** Anything above this is worth converting even if it's already a valid JPEG. */
const SIZE_LIMIT_BYTES = 400 * 1024;
const RASTER = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif"]);

/** Sniff the real container — phones love naming HEIC files .jpg. */
function realFormat(path) {
  try {
    const out = execFileSync("file", ["-b", path], { encoding: "utf8" });
    if (/HEIF|HEIC/i.test(out)) return "heic";
    if (/JPEG/i.test(out)) return "jpeg";
    if (/PNG/i.test(out)) return "png";
    if (/WebP/i.test(out)) return "webp";
    return "other";
  } catch {
    return "unknown";
  }
}

const PY = `
import sys
from PIL import Image
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

src, dst, max_edge, quality = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src)
if im.mode not in ("RGB", "RGBA"):
    im = im.convert("RGB")
w, h = im.size
if max(w, h) > max_edge:
    if w >= h:
        nw, nh = max_edge, round(h * max_edge / w)
    else:
        nh, nw = max_edge, round(w * max_edge / h)
    im = im.resize((nw, nh), Image.LANCZOS)
im.save(dst, "WEBP", quality=quality, method=6)
print(f"{im.size[0]}x{im.size[1]}")
`;

const files = readdirSync(PUBLIC_DIR)
  .filter((f) => RASTER.has(extname(f).toLowerCase()))
  .map((f) => {
    const path = join(PUBLIC_DIR, f);
    return { file: f, path, bytes: statSync(path).size };
  });

const todo = files.filter((f) => {
  const fmt = realFormat(f.path);
  f.fmt = fmt;
  // HEIC always needs converting — browsers can't render it.
  if (fmt === "heic") return true;
  // Otherwise only if it's genuinely heavy.
  return f.bytes > SIZE_LIMIT_BYTES;
});

if (todo.length === 0) {
  console.log("✓ Nothing to do — every image in /public is web-ready.");
  process.exit(0);
}

console.log(
  `${WRITE ? "Converting" : "Would convert"} ${todo.length} file(s) ` +
  `(max ${MAX}px, quality ${QUALITY}):\n`,
);

let saved = 0;
for (const f of todo) {
  const out = join(PUBLIC_DIR, `${basename(f.file, extname(f.file))}.webp`);
  const reason = f.fmt === "heic" ? "HEIC — unrenderable in browsers" : "oversized";
  const kb = (n) => `${Math.round(n / 1024)} KB`;

  if (!WRITE) {
    console.log(`  ${f.file}\n    ${kb(f.bytes)} · ${reason} → ${basename(out)}`);
    continue;
  }

  if (existsSync(out) && out !== f.path) {
    console.log(`  ${f.file}\n    skipped — ${basename(out)} already exists`);
    continue;
  }

  try {
    const dims = execFileSync("python3", ["-c", PY, f.path, out, String(MAX), String(QUALITY)], {
      encoding: "utf8",
    }).trim();
    const after = statSync(out).size;
    saved += f.bytes - after;
    console.log(`  ✓ ${f.file}\n    ${kb(f.bytes)} → ${kb(after)} (${dims}) · ${reason}`);
    if (REPLACE && out !== f.path) {
      execFileSync("rm", ["-f", f.path]);
      console.log(`    removed source`);
    }
  } catch (err) {
    console.error(`  ✗ ${f.file} — ${err.message.split("\n")[0]}`);
    console.error(`    (needs: pip install pillow pillow-heif)`);
  }
}

if (WRITE && saved > 0) {
  console.log(`\n✓ Saved ${Math.round(saved / 1024 / 1024 * 10) / 10} MB total.`);
} else if (!WRITE) {
  console.log(`\nDry run. Re-run with --write to convert, --write --replace to also delete sources.`);
}
