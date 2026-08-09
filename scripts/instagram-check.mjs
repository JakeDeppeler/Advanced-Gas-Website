#!/usr/bin/env node
/**
 * Instagram feed diagnostic.
 *
 * Answers the question "why isn't my Brivis post showing up?" without
 * guessing — it fetches the same posts the site does, applies the same
 * keyword filters, and prints what matched and what didn't.
 *
 *   node scripts/instagram-check.mjs <access-token>
 *
 * Prints:
 *   · how many posts came back, and how deep the paging went
 *   · any post that had to be dropped (no usable image), which is the
 *     failure mode that used to eat carousels silently
 *   · per brand and per service: the matching captions
 *   · the captions that matched nothing, so you can see which jobs need
 *     the brand name adding next time you post
 */

const GRAPH = "https://graph.instagram.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const FIELDS =
  "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_url,thumbnail_url,media_type}";

// Kept in step with src/lib/instagram.ts — if you change one, change both.
const BRAND_KEYWORDS = {
  "mitsubishi-electric": ["mitsubishi", "mitsi", "msz", "mxz", "pea-m", "pead"],
  reclaim: ["reclaim", "co2 split", "r290"],
  brivis: ["brivis", "wombat", "buffalo", "starpro"],
  kaden: ["kaden", "ksi", "kci", "kdm"],
  thermann: ["thermann", "g-series", "gseries"],
  istore: ["istore", "i-store"],
  zonemate: ["zonemate", "milieu"],
};

const SERVICE_KEYWORDS = {
  "air-conditioning-installation": [
    "split system", "split-system", "multi head", "multi-head", "multihead",
    "ducted air", "ducted aircon", "ducted a/c", "reverse cycle", "reverse-cycle",
    "aircon", "air con", "air-con", "evap", "evaporative", "mitsubishi", "kaden",
  ],
  "heat-pump-installation": [
    "heat pump", "heatpump", "reclaim", "istore", "i-store", "thermann",
    "co2", "veu", "hot water heat pump",
  ],
  "aircon-servicing-repairs": [
    "service", "serviced", "servicing", "repair", "repaired", "fault",
    "breakdown", "clean", "regas", "re-gas", "maintenance",
  ],
  "gas-plumbing": [
    "gas ducted", "gas heater", "gas heating", "ducted heater", "brivis",
    "wombat", "buffalo", "starpro", "continuous flow", "gas line", "gas fit",
    "carbon monoxide", "co test",
  ],
};

const token = process.argv[2];
if (!token) {
  console.error("Usage: node scripts/instagram-check.mjs <access-token>");
  process.exit(1);
}

function pickImage(m) {
  if (m.media_type === "VIDEO") return m.thumbnail_url ?? m.media_url;
  if (m.media_url) return m.media_url;
  for (const c of m.children?.data ?? []) {
    const img = c.media_type === "VIDEO" ? c.thumbnail_url ?? c.media_url : c.media_url;
    if (img) return img;
  }
  return undefined;
}

const firstLine = (c) => (c ?? "").split("\n")[0].trim().slice(0, 72) || "(no caption)";

let url = `${GRAPH}/me/media?fields=${FIELDS}&limit=${PAGE_SIZE}&access_token=${token}`;
const posts = [];
const dropped = [];
let pages = 0;

while (url && pages < MAX_PAGES) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.error(`\nAPI returned ${res.status} on page ${pages + 1}:\n${body}\n`);
    if (res.status === 400) {
      console.error("A 400 here is almost always an expired token. Refresh it with:");
      console.error("  node scripts/instagram-token.mjs --refresh <token>\n");
    }
    break;
  }
  const json = await res.json();
  const batch = json.data ?? [];
  pages++;
  for (const m of batch) {
    if (pickImage(m)) posts.push({ caption: m.caption ?? "", permalink: m.permalink, type: m.media_type });
    else dropped.push({ caption: firstLine(m.caption), type: m.media_type, permalink: m.permalink });
  }
  if (batch.length < PAGE_SIZE) break;
  url = json.paging?.next;
}

console.log(`\nFetched ${posts.length} usable posts across ${pages} page(s).`);

if (dropped.length) {
  console.log(`\n${dropped.length} post(s) had no usable image and were skipped:`);
  for (const d of dropped) console.log(`   [${d.type}] ${d.caption}\n      ${d.permalink}`);
}

const matched = new Set();

function report(title, groups) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 46 - title.length))}`);
  for (const [name, keywords] of Object.entries(groups)) {
    const hits = posts.filter((p) => {
      const c = p.caption.toLowerCase();
      return keywords.some((k) => c.includes(k));
    });
    hits.forEach((h) => matched.add(h.permalink));
    console.log(`\n  ${name} — ${hits.length} post(s)`);
    for (const h of hits.slice(0, 6)) console.log(`     · ${firstLine(h.caption)}`);
    if (hits.length > 6) console.log(`     … and ${hits.length - 6} more`);
    if (hits.length === 0) console.log(`     nothing matched: ${keywords.slice(0, 5).join(", ")}…`);
  }
}

report("BRANDS", BRAND_KEYWORDS);
report("SERVICES", SERVICE_KEYWORDS);

const orphans = posts.filter((p) => !matched.has(p.permalink));
console.log(`\n── UNMATCHED ${"─".repeat(35)}`);
console.log(`\n  ${orphans.length} post(s) match no brand or service.`);
console.log("  These show on /gallery but never on a brand or service page.");
console.log("  Naming the brand in the caption is all it takes to file them.\n");
for (const o of orphans.slice(0, 15)) console.log(`     · ${firstLine(o.caption)}`);
if (orphans.length > 15) console.log(`     … and ${orphans.length - 15} more`);
console.log("");
