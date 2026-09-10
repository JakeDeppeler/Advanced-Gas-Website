"use client";

import { useEffect } from "react";
import { captureUtm, trackCall } from "@/lib/track";

/**
 * Counts phone taps anywhere on the site, and remembers what brought the
 * visitor in.
 *
 * One listener on the document rather than a handler on every number: the phone
 * number appears in the header, the footer, service pages and half the calls to
 * action, and any of them added later would otherwise go uncounted.
 */
export function CallTracking() {
  useEffect(() => {
    captureUtm();

    function onClick(e: MouseEvent) {
      const link = (e.target as HTMLElement | null)?.closest?.('a[href^="tel:"]');
      if (!link) return;
      const where = link.getAttribute("data-call-from")
        || link.closest("header") && "header"
        || link.closest("footer") && "footer"
        || "page";
      trackCall(String(where));
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
