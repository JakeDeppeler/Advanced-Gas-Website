import "server-only";

import { REVIEWS as CURATED, RATING_SUMMARY as CURATED_SUMMARY, MIN_PUBLISHED_RATING, type Review } from "@/lib/reviews";

/**
 * Live Google reviews via the Places API (New).
 *
 * Called from server components only, so the review markup and the
 * schema.org AggregateRating are both server-rendered — no client fetch,
 * no layout shift, and Google's crawler sees the real content.
 *
 * Caching: `next.revalidate` gives us ISR at 24 h. That keeps pages
 * static-fast while staying well inside Google's caching terms (Places
 * content must not be cached beyond 30 days; place IDs are exempt).
 *
 * Setup — two env vars:
 *   GOOGLE_PLACES_API_KEY   Google Cloud key with "Places API (New)" enabled
 *   GOOGLE_PLACE_ID         the profile's place ID
 *                           (run: node scripts/find-place-id.mjs)
 *
 * Without them — or if the call fails — we fall back to the curated list
 * in reviews.ts. A page never breaks because an upstream API had a
 * moment; it just serves the last-known-good copy.
 *
 * KNOWN LIMIT: the Places API returns at most 5 reviews per place, and
 * you can't page for more. That's a Google constraint, not a bug here.
 * We merge live reviews first, then top up from the curated list so the
 * grid never looks thin.
 */

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places";
const REVALIDATE_SECONDS = 60 * 60 * 24; // 24 h

export type ReviewsPayload = {
  reviews: Review[];
  summary: { value: number; count: number; best: number };
  /** Where the data came from — surfaced in dev to make misconfig obvious. */
  source: "google" | "curated" | "google+curated";
};

type PlacesReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string };
  relativePublishTimeDescription?: string;
};

type PlacesResponse = {
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesReview[];
};

/** "Jess Mitchell" → "JM"; falls back to first two letters. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "??").toUpperCase();
}

/** Google reviews have no title, so lead with a short clause from the body. */
function deriveTitle(body: string): string {
  const firstSentence = body.split(/(?<=[.!?])\s/)[0] ?? body;
  const trimmed = firstSentence.replace(/[.!?]+$/, "").trim();
  if (trimmed.length <= 52) return trimmed;
  const cut = trimmed.slice(0, 52);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function normalise(r: PlacesReview): Review | null {
  const body = (r.text?.text ?? r.originalText?.text ?? "").trim();
  const who = r.authorAttribution?.displayName?.trim();
  const rating = typeof r.rating === "number" ? r.rating : 0;
  if (!body || !who || !rating) return null;
  return {
    title: deriveTitle(body),
    txt: body,
    who,
    // Google doesn't tell us the job type — use the review recency instead
    // so the card still has a second line of context.
    what: r.relativePublishTimeDescription ?? "Google review",
    a: initials(who),
    rating,
  };
}

export async function getReviews(limit = 12): Promise<ReviewsPayload> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  const fallback: ReviewsPayload = {
    reviews: CURATED.slice(0, limit),
    summary: { ...CURATED_SUMMARY },
    source: "curated",
  };

  if (!key || !placeId) return fallback;

  try {
    const res = await fetch(`${PLACES_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": key,
        // Field mask is mandatory on the New API and it's also what you're
        // billed on — request only what we render.
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      console.warn(`[googleReviews] Places API ${res.status} — serving curated reviews`);
      return fallback;
    }

    const data = (await res.json()) as PlacesResponse;

    const live = (data.reviews ?? [])
      .map(normalise)
      .filter((r): r is Review => r !== null)
      .filter((r) => r.rating >= MIN_PUBLISHED_RATING)
      .sort((a, b) => b.rating - a.rating);

    if (live.length === 0) return fallback;

    // Google caps at 5 reviews. Top up from the curated set so the grid
    // stays full, skipping any that duplicate a live reviewer.
    const liveNames = new Set(live.map((r) => r.who.toLowerCase()));
    const topUp = CURATED.filter((r) => !liveNames.has(r.who.toLowerCase()));
    const reviews = [...live, ...topUp].slice(0, limit);

    return {
      reviews,
      summary: {
        value: data.rating ?? CURATED_SUMMARY.value,
        count: data.userRatingCount ?? CURATED_SUMMARY.count,
        best: 5,
      },
      source: topUp.length > 0 && reviews.length > live.length ? "google+curated" : "google",
    };
  } catch (err) {
    console.warn("[googleReviews] fetch failed — serving curated reviews:", err);
    return fallback;
  }
}
