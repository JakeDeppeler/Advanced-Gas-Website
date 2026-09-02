#!/usr/bin/env node
/**
 * Brand install photo intake.
 *
 * Drop photos into public/brand-installs/ named after the brand, run this,
 * and it converts / resizes / sorts them and prints the code to paste into
 * src/lib/brandGallery.ts.
 *
 *   node scripts/sort-brand-photos.mjs            # preview
 *   node scripts/sort-brand-photos.mjs --write    # do it
 *
 * Handles the two things that break phone photos on the web:
 *   · HEIC files (iPhones shoot them, often saved as .jpg — no browser
 *     renders them). Detected by sniffing the container, not the extension.
 *   · 4-6 MB originals that would wreck the LCP budget.
 *
 * Requires: pip install pillow pillow-heif
 */

import { readdirSync, statSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";

const INBOX = "public/brand-installs";
const WRITE = process.argv.includes("--write");
const MAX = Number(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 1600);
const QUALITY = Number(process.argv.find((a) => a.startsWith("--quality="))?.split("=")[1] ?? 82);

/** Filename prefix → brand slug. Order matters: longest/most specific first. */
const BRAND_MATCHERS = [
  [/^mitsubishi|^mitsi\b|^me[-_ ]/i, "mitsubishi-electric"],
  [/^zonemate|^milieu/i,             "zonemate"],
  [/^reclaim/i,                      "reclaim"],
  [/^thermann/i,                     "thermann"],
  [/^brivis/i,                       "brivis"],
  [/^istore|^i[-_ ]store/i,          "istore"],
  [/^kaden/i,                        "kaden"],
];

const BRAND_NAMES = {
  "mitsubishi-electric": "Mitsubishi Electric",
  "reclaim": "Reclaim Energy",
  "thermann": "Thermann",
  "brivis": "Brivis",
  "istore": "iStore",
  "kaden": "Kaden",
  "zonemate": "Zonemate",
};

const RASTER = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"]);

function brandFor(filename) {
  for (const [re, slug] of BRAND_MATCHERS) if (re.test(filename)) return slug;
  return null;
}

function realFormat(path) {
  try {
    const out = execFileSync("file", ["-b", path], { encoding: "utf8" });
    if (/HEIF|HEIC/i.test(out)) return "heic";
    if (/JPEG/i.test(out)) return "jpeg";
    if (/PNG/i.test(out)) return "png";
    if (/WebP/i.test(out)) return "webp";
    return "other";
  } catch { return "unknown"; }
}

const PY = `
import sys
from PIL import Image
try:
    import pillow_heif; pillow_heif.register_heif_opener()
except ImportError: pass
src, dst, mx, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src)
if im.mode not in ("RGB", "RGBA"): im = im.convert("RGB")
w, h = im.size
if max(w, h) > mx:
    if w >= h: nw, nh = mx, round(h * mx / w)
    else:      nh, nw = mx, round(w * mx / h)
    im = im.resize((nw, nh), Image.LANCZOS)
im.save(dst, "WEBP", quality=q, method=6)
print(f"{im.size[0]}x{im.size[1]}")
`;

/** "reclaim-berwick-co2-split" → "berwick co2 split" */
function describe(stem, slug) {
  return stem
    .replace(new RegExp(`^${slug.split("-")[0]}[-_ ]*`, "i"), "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

if (!existsSync(INBOX)) {
  console.error(`✗ ${INBOX} doesn't exist.`);
  process.exit(1);
}

const files = readdirSync(INBOX)
  .filter((f) => RASTER.has(extname(f).toLowerCase()))
  .map((f) => ({ file: f, path: join(INBOX, f), bytes: statSync(join(INBOX, f)).size }));

if (files.length === 0) {
  console.log(`Nothing to do — ${INBOX}/ has no photos in it yet.\n`);
  console.log("Drop photos in named after the brand, e.g.:");
  console.log("  reclaim-berwick-co2-split.jpg");
  console.log("  brivis-wombat-cupboard.jpg\n");
  process.exit(0);
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
const matched = new Map();
const unmatched = [];
let saved = 0;

console.log(`${WRITE ? "Processing" : "Would process"} ${files.length} photo(s) — max ${MAX}px, quality ${QUALITY}\n`);

for (const f of files) {
  const slug = brandFor(f.file);
  if (!slug) { unmatched.push(f); continue; }

  const stem = basename(f.file, extname(f.file)).replace(/\s+/g, "-").toLowerCase();
  const outDir = join(INBOX, slug);
  const outPath = join(outDir, `${stem}.webp`);
  const webPath = `/${outPath.replace(/^public\//, "")}`;
  const fmt = realFormat(f.path);

  if (!WRITE) {
    const note = fmt === "heic" ? " · HEIC, must convert" : "";
    console.log(`  ${f.file}\n    → ${slug}/${stem}.webp  (${kb(f.bytes)}${note})`);
    if (!matched.has(slug)) matched.set(slug, []);
    matched.get(slug).push({ webPath, stem });
    continue;
  }

  mkdirSync(outDir, { recursive: true });
  try {
    const dims = execFileSync("python3", ["-c", PY, f.path, outPath, String(MAX), String(QUALITY)], { encoding: "utf8" }).trim();
    const after = statSync(outPath).size;
    saved += f.bytes - after;
    execFileSync("rm", ["-f", f.path]);
    console.log(`  ✓ ${f.file}\n    → ${slug}/${stem}.webp  ${kb(f.bytes)} → ${kb(after)} (${dims})`);
    if (!matched.has(slug)) matched.set(slug, []);
    matched.get(slug).push({ webPath, stem });
  } catch (err) {
    console.error(`  ✗ ${f.file} — ${String(err.message).split("\n")[0]}`);
    console.error(`    (needs: pip install pillow pillow-heif)`);
  }
}

if (unmatched.length > 0) {
  console.log(`\n⚠  ${unmatched.length} file(s) didn't match a brand — left in place:`);
  for (const u of unmatched) console.log(`     ${u.file}`);
  console.log(`   Rename them to start with the brand (reclaim… brivis… kaden…),`);
  console.log(`   or leave them and say which is which.`);
}

if (matched.size === 0) {
  console.log("\nNo files sorted.");
  process.exit(0);
}

// ---- generate the paste-in block ----
console.log(`\n${"─".repeat(64)}`);
console.log("Paste into src/lib/brandGallery.ts (replace the matching keys):\n");

for (const [slug, shots] of matched) {
  const key = slug.includes("-") ? `"${slug}"` : slug;
  console.log(`  ${key}: [`);
  for (const s of shots) {
    console.log(`    {`);
    console.log(`      src: "${s.webPath}",`);
    console.log(`      alt: "TODO — describe what's in the shot (${describe(s.stem, slug)})",`);
    console.log(`    },`);
  }
  console.log(`  ],\n`);
}

if (WRITE) {
  if (saved > 0) console.log(`✓ Saved ${Math.round((saved / 1024 / 1024) * 10) / 10} MB.`);
  console.log(`✓ ${[...matched].reduce((n, [, v]) => n + v.length, 0)} photo(s) sorted across ${matched.size} brand(s).`);
  console.log(`\nNext: fill in the alt text above, or push and I'll write it.`);
} else {
  console.log("Dry run — nothing written. Re-run with --write to do it.");
}
