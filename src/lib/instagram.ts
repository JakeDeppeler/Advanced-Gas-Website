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
 * One env var: INSTAGRAM_ACCESS_TOKEN. The token identifies the account
 * by itself, so we call `/me/media` and skip the user ID entirely.
 *
 *   1. Instagram account must be Business or Creator (not Personal):
 *      Instagram app → Settings → Account type → Switch to professional
 *   2. developers.facebook.com → your app → Use cases → add
 *      "Manage messaging & content on Instagram" (grants
 *      instagram_business_basic, the media-read permission)
 *   3. The account needs a role on the app while it's unpublished:
 *      App roles → Roles → Instagram Testers → add the username, then
 *      accept at instagram.com/accounts/manage_access/
 *   4. Instagram → API setup with Instagram login → Generate token
 *
 * That button hands you a 60-day long-lived token — paste it straight in,
 * no exchange step. scripts/instagram-token.mjs is still there for the
 * short-lived OAuth case and for --refresh before the 60 days are up.
 *
 * INSTAGRAM_USER_ID remains supported but is optional; set it only to
 * read an account other than the token's own.
 *
 * Without a token the feed renders nothing and the pages fall back to
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

/**
 * `children` matters: a CAROUSEL_ALBUM often returns NO media_url on the
 * parent object — the images hang off the children edge. Without this
 * every multi-photo post resolves to no image and gets dropped, caption
 * and all. Trade accounts post before/after carousels constantly, so
 * that silently ate a large share of the feed.
 */
const FIELDS =
  "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_url,thumbnail_url,media_type}";

/** Posts fetched per API page. 100 is Instagram's ceiling. */
const PAGE_SIZE = 100;

/**
 * How deep brand/service filtering looks. One page only covers a couple
 * of months for an account that posts a few times a week, which meant
 * older Kaden and Brivis jobs simply weren't in the set being searched.
 */
const MAX_PAGES = 8;

export type InstagramPost = {
  id: string;
  caption: string;
  /** Displayable image URL — thumbnail for videos, first child for albums. */
  image: string;
  permalink: string;
  timestamp: string;
  isVideo: boolean;
};

type RawChild = {
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string;
};

type RawMedia = {
  id: string;
  caption?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  children?: { data?: RawChild[] };
};

/** Best displayable image for a post, across all three media types. */
function pickImage(m: RawMedia): string | undefined {
  if (m.media_type === "VIDEO") {
    // Reels sometimes come back with no thumbnail; media_url is the
    // video itself, which at least gives the browser something.
    return m.thumbnail_url ?? m.media_url;
  }
  if (m.media_url) return m.media_url;

  // Carousel: fall back to the first child that has an image.
  for (const c of m.children?.data ?? []) {
    const img = c.media_type === "VIDEO" ? c.thumbnail_url ?? c.media_url : c.media_url;
    if (img) return img;
  }
  return undefined;
}

function toPost(m: RawMedia): InstagramPost | null {
  const image = pickImage(m);
  if (!image) return null;
  return {
    id: m.id,
    caption: (m.caption ?? "").trim(),
    image,
    permalink: m.permalink,
    timestamp: m.timestamp,
    isVideo: m.media_type === "VIDEO",
  };
}

/**
 * Raw fetch, following `paging.next` up to `maxPages`. Each page URL is
 * stable, so ISR caches them individually.
 */
async function fetchPosts(maxPages: number): Promise<InstagramPost[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  // The token already identifies the account, so `me` works on its own.
  // INSTAGRAM_USER_ID stays supported for the multi-account case.
  const account = process.env.INSTAGRAM_USER_ID || "me";

  const out: InstagramPost[] = [];
  const seen = new Set<string>();
  let url: string | undefined =
    `${GRAPH}/${account}/media?fields=${FIELDS}&limit=${PAGE_SIZE}&access_token=${token}`;

  try {
    for (let page = 0; page < maxPages && url; page++) {
      const res: Response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });

      if (!res.ok) {
        // 190 = token expired. Worth shouting about in logs since the fix
        // is a token refresh, not a code change.
        console.warn(
          `[instagram] Graph API ${res.status} on page ${page + 1}, ` +
            `${out.length} posts so far. If 400/190, the token has expired: ` +
            `node scripts/instagram-token.mjs --refresh <token>`,
        );
        break;
      }

      const json = (await res.json()) as {
        data?: RawMedia[];
        paging?: { next?: string };
      };

      const batch = json.data ?? [];
      for (const m of batch) {
        const post = toPost(m);
        // Cursor paging can repeat an item across a page boundary.
        if (post && !seen.has(post.id)) {
          seen.add(post.id);
          out.push(post);
        }
      }

      // Stop only when Instagram says there is no next page.
      //
      // This used to break as soon as a page came back shorter than the
      // limit, which looks like the end of the account but isn't — the
      // API routinely returns a short page while still handing over a
      // valid cursor. That truncated the feed part-way through the
      // history, so some posts showed and some silently didn't.
      url = json.paging?.next;
    }
  } catch (err) {
    console.warn("[instagram] fetch failed:", err);
  }

  return out;
}

/**
 * Recent posts, newest first. Empty array when unconfigured or on any
 * failure — callers should treat empty as "no feed" and fall back.
 */
export async function getInstagramFeed(limit = 24): Promise<InstagramPost[]> {
  const pages = Math.max(1, Math.ceil(limit / PAGE_SIZE));
  return (await fetchPosts(pages)).slice(0, limit);
}

/**
 * The full set filtering searches over — as much history as MAX_PAGES
 * allows, rather than just the most recent screenful.
 */
async function getSearchCorpus(): Promise<InstagramPost[]> {
  return fetchPosts(MAX_PAGES);
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
  const all = await getSearchCorpus();
  if (all.length === 0) return [];

  const keywords = BRAND_KEYWORDS[brandSlug] ?? [brandSlug.replace(/-/g, " ")];
  return all
    .filter((p) => {
      const c = p.caption.toLowerCase();
      return keywords.some((k) => c.includes(k.toLowerCase()));
    })
    .slice(0, limit);
}

/**
 * System keywords per service page. These are the words that actually
 * appear in a job caption — "split system in Berwick", "gas ducted
 * changeover" — rather than the service's own slug, which nobody types.
 */
const SERVICE_KEYWORDS: Record<string, string[]> = {
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

/**
 * Generic "this is a job we did" markers. Used only as a fallback — if
 * they counted as a match on their own, every service page would show
 * the same feed, which is the opposite of the point.
 */
const INSTALL_KEYWORDS = ["install", "installed", "installation", "fitted", "changeover", "change over", "swap", "upgrade"];

function captionMatches(caption: string, keywords: string[]): boolean {
  const c = caption.toLowerCase();
  return keywords.some((k) => c.includes(k));
}

/**
 * Posts relevant to a service page. Matches the service's own system
 * words first; if none of the recent posts mention them, falls back to
 * anything that reads like a finished job so the section still has
 * something real in it rather than disappearing.
 */
export async function getInstagramForService(serviceSlug: string, limit = 8): Promise<InstagramPost[]> {
  const all = await getSearchCorpus();
  if (all.length === 0) return [];

  const keywords = SERVICE_KEYWORDS[serviceSlug];
  if (!keywords) return all.slice(0, limit);

  const onTopic = all.filter((p) => captionMatches(p.caption, keywords));
  if (onTopic.length > 0) return onTopic.slice(0, limit);

  return all.filter((p) => captionMatches(p.caption, INSTALL_KEYWORDS)).slice(0, limit);
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
