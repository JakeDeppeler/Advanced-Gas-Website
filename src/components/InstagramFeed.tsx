import { site } from "@/lib/site";
import { captionSummary, type InstagramPost } from "@/lib/instagram";

/**
 * Instagram install-photo grid.
 *
 * Takes already-fetched posts so the calling page controls whether it's
 * the whole feed or a brand-filtered slice (see lib/instagram.ts).
 * Renders nothing when the list is empty, so pages fall back cleanly
 * when the feed isn't configured yet.
 */
export function InstagramFeed({
  posts,
  heading = "Straight from the feed",
  blurb,
  eyebrow = "Recent installs",
}: {
  posts: InstagramPost[];
  heading?: string;
  blurb?: string;
  eyebrow?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section className="igf">
      <div className="wrap">
        <div className="igf__head">
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> {eyebrow}</span>
            <h2>{heading}</h2>
            {blurb && <p>{blurb}</p>}
          </div>
          {site.social.instagram && (
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="igf__follow"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              Follow us
            </a>
          )}
        </div>

        <div className="igf__grid">
          {posts.map((p) => {
            const summary = captionSummary(p.caption);
            return (
              <a
                key={p.id}
                href={p.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="igf__cell"
              >
                {/* Instagram CDN URLs are signed and expire, so next/image
                    optimisation would break on stale entries — plain img
                    keeps it resilient. */}
                <img
                  src={p.image}
                  alt={summary || "Advanced Gas & Aircon install photo from Instagram"}
                  loading="lazy"
                  width="480"
                  height="480"
                />
                {p.isVideo && (
                  <span className="igf__video" aria-label="Video">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                )}
                {summary && <span className="igf__cap">{summary}</span>}
              </a>
            );
          })}
        </div>

        <p className="igf__attrib">Live from @{handleFrom(site.social.instagram)}</p>
      </div>
    </section>
  );
}

function handleFrom(url: string): string {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  return m ? m[1] : "advancedgasaircon";
}
