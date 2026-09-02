import Script from "next/script";

/**
 * Analytics, all of it optional and all of it off by default.
 *
 * The site had none. Vercel Speed Insights was wired up, but that
 * measures how fast a page loads, not whether anyone visited it, so
 * there was no way to answer "did that change bring in any work".
 *
 * Three separate things, because they answer different questions:
 *
 *   Vercel Analytics (always on)
 *     Page views and referrers. About 1 KB, no cookies, so no consent
 *     banner. Enough to see which pages people actually land on.
 *
 *   Google Analytics 4 (only when NEXT_PUBLIC_GA_ID is set)
 *     The funnel. Which page someone was on when they asked for a
 *     quote, and where they came from. Costs about 45 KB, which is why
 *     it stays off until someone decides they want it. This is also
 *     what Google Ads conversion tracking hangs off, so it becomes
 *     necessary the day the first ad runs.
 *
 * Nothing here loads unless the matching env var exists, so a missing
 * key is a no-op rather than a broken page.
 */

export function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  if (!ga) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${ga}');
        `}
      </Script>
    </>
  );
}

/**
 * Fires a conversion when a lead is submitted.
 *
 * Called from the quote form rather than inferred from a /thanks
 * pageview, because a pageview can't tell you which form produced it
 * and someone can land on /thanks by accident.
 *
 * Safe to call when nothing is configured: if gtag isn't on the page
 * this does nothing at all.
 */
export function trackLead(source: string) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.("event", "generate_lead", { source });
}
