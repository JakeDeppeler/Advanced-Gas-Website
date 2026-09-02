#!/usr/bin/env node
/**
 * Finds the Google Place ID for the business so you can set
 * GOOGLE_PLACE_ID without hunting through Google's tools.
 *
 *   GOOGLE_PLACES_API_KEY=xxx node scripts/find-place-id.mjs
 *   GOOGLE_PLACES_API_KEY=xxx node scripts/find-place-id.mjs "Some Other Business Pakenham"
 *
 * Uses Places API (New) Text Search. Prints every match with its rating
 * and review count so you can confirm you've got the right listing before
 * committing the ID.
 */

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const QUERY = process.argv[2] ?? "Advanced Gas & Aircon Pakenham VIC";

if (!KEY) {
  console.error("✗ GOOGLE_PLACES_API_KEY is not set.\n");
  console.error("  Get one at https://console.cloud.google.com/apis/credentials");
  console.error("  and enable “Places API (New)” for the project.\n");
  console.error("  Then:  GOOGLE_PLACES_API_KEY=xxx node scripts/find-place-id.mjs");
  process.exit(1);
}

const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": KEY,
    "X-Goog-FieldMask":
      "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
  },
  body: JSON.stringify({ textQuery: QUERY }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`✗ Places API returned ${res.status}`);
  console.error(body.slice(0, 600));
  if (res.status === 403) {
    console.error("\n  403 usually means the key exists but “Places API (New)”");
    console.error("  isn't enabled on that project, or a key restriction is");
    console.error("  blocking it (check HTTP referrer / IP restrictions).");
  }
  process.exit(1);
}

const { places = [] } = await res.json();

if (places.length === 0) {
  console.log(`No matches for "${QUERY}". Try a more specific query.`);
  process.exit(0);
}

console.log(`Matches for "${QUERY}":\n`);
for (const p of places) {
  console.log(`  ${p.displayName?.text ?? "(no name)"}`);
  console.log(`    ${p.formattedAddress ?? ""}`);
  if (p.rating) console.log(`    ${p.rating} ★ · ${p.userRatingCount ?? 0} reviews`);
  console.log(`    GOOGLE_PLACE_ID=${p.id}\n`);
}

console.log("Copy the GOOGLE_PLACE_ID line for the right listing into your env vars.");
