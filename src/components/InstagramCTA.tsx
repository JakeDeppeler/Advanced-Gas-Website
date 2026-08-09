import { site } from "@/lib/site";

/**
 * "See the real thing" Instagram callout.
 *
 * The product photography across the site is manufacturer imagery — it
 * shows the buyer exactly which unit is being quoted, but it isn't our
 * work. Our actual install photos live on Instagram, so anywhere we show
 * manufacturer shots we point people at the real gallery rather than
 * implying the product renders are our jobs.
 *
 * Renders nothing when no Instagram URL is configured, so the section it
 * sits inside degrades cleanly rather than shipping a dead link.
 */
export function InstagramCTA({
  heading = "See our real installs on Instagram",
  body,
}: {
  heading?: string;
  body?: string;
}) {
  const href = site.social.instagram;
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ig-cta"
    >
      <span className="ig-cta__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="ig-cta__body">
        <span className="ig-cta__head">{heading}</span>
        {body && <span className="ig-cta__sub">{body}</span>}
      </span>
      <span className="ig-cta__go" aria-hidden="true">→</span>
    </a>
  );
}
