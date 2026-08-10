#!/usr/bin/env node
/**
 * Turn a folder of photos into an album block for src/lib/albums.ts.
 *
 *   1. mkdir public/jobs/reclaim-berwick-changeover
 *   2. drop the photos and videos in
 *   3. node scripts/build-albums.mjs
 *   4. paste the printed block into ALBUMS and write the alt text
 *
 * Reads every folder under public/jobs/ and prints a block for each one
 * that isn't already in albums.ts. It never edits the file itself —
 * alt text needs a human, and silently appending half-finished entries
 * is how you end up shipping `alt=""`.
 */

import fs from "node:fs";
import path from "node:path";

const JOBS = "public/jobs";
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
const VIDEO = /\.(mp4|mov|webm)$/i;

if (!fs.existsSync(JOBS)) {
  console.log(`\nNo ${JOBS}/ folder yet.\n`);
  console.log("Make one and drop a job's photos in:");
  console.log("  mkdir -p public/jobs/reclaim-berwick-changeover");
  console.log("  (copy the photos in)");
  console.log("  node scripts/build-albums.mjs\n");
  process.exit(0);
}

const existing = fs.existsSync("src/lib/albums.ts")
  ? fs.readFileSync("src/lib/albums.ts", "utf8")
  : "";

const folders = fs
  .readdirSync(JOBS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (folders.length === 0) {
  console.log(`\n${JOBS}/ is empty. Drop a folder of photos in first.\n`);
  process.exit(0);
}

const titleFrom = (slug) =>
  slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

let printed = 0;
const warnings = [];

for (const slug of folders) {
  if (existing.includes(`slug: "${slug}"`)) {
    console.log(`  skip (already in albums.ts): ${slug}`);
    continue;
  }

  const dir = path.join(JOBS, slug);
  const files = fs.readdirSync(dir).filter((f) => IMAGE.test(f) || VIDEO.test(f)).sort();
  if (files.length === 0) {
    warnings.push(`${slug}: no images or videos found`);
    continue;
  }

  const posters = new Set(files.filter((f) => IMAGE.test(f)).map((f) => f.replace(IMAGE, "")));

  const lines = files.map((f) => {
    const src = `/jobs/${slug}/${f}`;
    if (VIDEO.test(f)) {
      const base = f.replace(VIDEO, "");
      const poster = posters.has(base) ? `/jobs/${slug}/${base}.jpg` : undefined;
      if (!poster) warnings.push(`${slug}/${f}: no poster frame — add ${base}.jpg beside it`);
      return `      { type: "video", src: "${src}", alt: "TODO describe the poster frame"${
        poster ? `, poster: "${poster}"` : ""
      } },`;
    }
    return `      { type: "image", src: "${src}", alt: "TODO describe what's in the shot" },`;
  });

  console.log(`\n  {
    slug: "${slug}",
    title: "${titleFrom(slug)}",
    // brand: "reclaim",          // optional — puts it on that brand page
    // service: "heat-pump-installation",
    // suburb: "Berwick",
    // date: "2026-08-01",
    items: [
${lines.join("\n")}
    ],
  },`);
  printed++;
}

if (warnings.length) {
  console.log("\n\nWarnings:");
  for (const w of warnings) console.log(`  ! ${w}`);
}

console.log(
  printed > 0
    ? `\n\n${printed} block(s) above — paste into ALBUMS in src/lib/albums.ts and replace the TODO alt text.\n`
    : "\n\nNothing new to add.\n",
);
