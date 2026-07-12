import Link from "next/link";
import { site } from "@/lib/site";

/**
 * Sticky bottom action bar for phones. Two big thumb-friendly buttons:
 * Call and Free Quote. Hidden above 900px via CSS in design-system.css.
 */
export function StickyMobileCTA() {
  return (
    <div className="stickycta" aria-label="Quick actions">
      <a href={`tel:${site.phoneE164}`} className="stickycta__call" aria-label={`Call ${site.phone}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
        </svg>
        <span>
          <em>Call the team</em>
          <strong>{site.phone}</strong>
        </span>
      </a>
      <Link href="/quote" className="stickycta__quote">
        Free quote →
      </Link>
    </div>
  );
}
