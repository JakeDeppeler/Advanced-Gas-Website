import "server-only";

/**
 * Live Instagram feed via the Instagram Graph API.
 *
 * Why this exists: the site needs photos of real installs, and you're
 * already posting them to Instagram. Rather than maintaining a second
 * copy by hand, the site reads the feed — you post once, the website
 * updates itself.
 *
 * Called from server components, so images and captions are in the
 * server-rendered HTML: no client fetch, no layout shift, and crawlers
 * see the content. `next.revalidate` gives ISR at 6 h.
 *
 * ── SETUP ─────────────────────────────────────────────────────────
 * Needs a long-lived token. Once set up it auto-refreshes (see
 * scripts/instagram-token.mjs).
 *
 *   1. Instagram account must be Business or Creator (not Personal):
 *      Instagram app → Settings → Account type → Switch to professional
 *   2. Link it to a Facebook Page (Instagram → Settings → Linked accounts)
 *   3. Create an app at developers.facebook.com → Business type
 *   4. Add the "Instagram Graph API" product
 *   5. Generate a token, then run:
 *        node scripts/instagram-token.mjs <short-lived-token>
 *      to exchange it for a 60-day long-lived one
 *
 *   INSTAGRAM_ACCESS_TOKEN=...
 *   INSTAGRAM_USER_ID=...        (printed by the same script)
 *
 * Without them the feed renders nothing and the pages fall back to
 * whatever local photos exist — so the site never breaks over it.
 *
 * ── BRAND FILTERING ───────────────────────────────────────────────
 * The API has no concept of "brand". `mediaFor("brivis")` matches on the
 * caption, so a post captioned "...new Brivis Wombat in Berwick" or
 * tagged #brivis shows up on the Brivis page automatically. Mention the
 * brand in the caption and it files itself.
 */

const GRAPH = "https://graph.instagram.com";
const REVALIDATE_SECONDS = 60 * 60 * 6; // 6 h
const FIELDS = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";

export type InstagramPost = {
  id: string;
  caption: string;
  /** Displayable image URL — thumbnail for videos. */
  image: string;
  permalink: string;
  timestamp: string;
  isVideo: boolean;
};

type RawMedia = {
  id: string;
  caption?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

/**
 * Recent posts, newest first. Empty array when unconfigured or on any
 * failure — callers should treat empty as "no feed" and fall back.
 */
export async function getInstagramFeed(limit = 24): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return [];

  try {
    const url = `${GRAPH}/${userId}/media?fields=${FIELDS}&limit=${Math.min(100, limit * 3)}&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });

    if (!res.ok) {
      // 190 = token expired. Worth shouting about in logs since the fix
      // is a token refresh, not a code change.
      console.warn(`[instagram] Graph API ${res.status} — feed hidden. If 400/190, the token has expired: re-run scripts/instagram-token.mjs`);
      return [];
    }

    const { data = [] } = (await res.json()) as { data: RawMedia[] };

    return data
      .map((m): InstagramPost | null => {
        const image = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
        if (!image) return null;
        return {
          id: m.id,
          caption: (m.caption ?? "").trim(),
          image,
          permalink: m.permalink,
          timestamp: m.timestamp,
          isVideo: m.media_type === "VIDEO",
        };
      })
      .filter((p): p is InstagramPost => p !== null)
      .slice(0, limit);
  } catch (err) {
    console.warn("[instagram] fetch failed — feed hidden:", err);
    return [];
  }
}

/** Extra caption keywords per brand, beyond the brand name itself. */
const BRAND_KEYWORDS: Record<string, string[]> = {
  "mitsubishi-electric": ["mitsubishi", "mitsi", "msz", "mxz", "pea-m", "pead"],
  "reclaim": ["reclaim", "co2 split", "r290"],
  "brivis": ["brivis", "wombat", "buffalo", "starpro"],
  "kaden": ["kaden", "ksi", "kci", "kdm"],
  "thermann": ["thermann", "g-series", "gseries"],
  "istore": ["istore", "i-store"],
  "zonemate": ["zonemate", "milieu"],
};

/**
 * Posts whose caption mentions this brand. Case-insensitive, matches
 * hashtags too (#brivis contains "brivis").
 */
export async function getInstagramForBrand(brandSlug: string, limit = 8): Promise<InstagramPost[]> {
  const all = await getInstagramFeed(60);
  if (all.length === 0) return [];

  const keywords = BRAND_KEYWORDS[brandSlug] ?? [brandSlug.replace(/-/g, " ")];
  return all
    .filter((p) => {
      const c = p.caption.toLowerCase();
      return keywords.some((k) => c.includes(k.toLowerCase()));
    })
    .slice(0, limit);
}

/** First line of a caption, trimmed — captions run long with hashtags. */
export function captionSummary(caption: string, max = 110): string {
  const firstLine = caption.split("\n")[0].trim();
  const noTags = firstLine.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  const text = noTags || firstLine;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
