"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";

/**
 * Sticky bottom action bar for phones. Two big thumb-friendly buttons:
 * Call and Free Quote.
 *
 * Smart-hide: the bar disappears whenever the primary hero CTAs are on
 * screen (or when the user is within 400px of the bottom-of-page final
 * CTA). Prevents the double-up where the user sees the hero "Get a
 * fixed quote" AND the sticky "Free quote" at the same time.
 *
 * Detection uses IntersectionObserver keyed on `data-hide-sticky-cta`
 * attributes — any element on the page carrying that attribute is
 * watched, and while ANY of them is at least partially visible the
 * sticky bar is hidden.
 *
 * Hidden entirely above 900px via CSS.
 */
export function StickyMobileCTA() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Rescan the DOM on every route change / DOM update — we only run
    // once per mount, but re-attaching observers when the tagged
    // elements change is cheap and avoids stale references.
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-hide-sticky-cta]"),
    );
    if (targets.length === 0) {
      setHidden(false);
      return;
    }

    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setHidden(visible.size > 0);
      },
      { rootMargin: "0px", threshold: 0.05 },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={`stickycta${hidden ? " is-hidden" : ""}`} aria-label="Quick actions" aria-hidden={hidden}>
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
