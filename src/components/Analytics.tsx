import Script from "next/script";

/**
 * Analytics, all of it optional and all of it off by default.
 *
 * The site had none. Vercel Speed Insights was wired up, but that
 * measures how fast a page loads, not whether anyone visited it, so
 * there was no way to answer "did that change bring in any work".
 *
 * Four separate things, because they answer different questions:
 *
 *   Vercel Analytics (always on)
 *     Page views and referrers. About 1 KB, no cookies, so no consent
 *     banner. Enough to see which pages people actually land on.
 *
 *   Google Analytics 4 (only when NEXT_PUBLIC_GA_ID is set)
 *     The funnel. Which page someone was on when they asked for a
 *     quote, and where they came from. Costs about 45 KB, which is why
 *     it stays off until someone decides they want it.
 *
 *   Google Ads tag (only when NEXT_PUBLIC_GOOGLE_ADS_ID is set)
 *     Same gtag.js, second `config` line. Without it an ad click and
 *     the quote request it produced are two unrelated events, and the
 *     Ads account optimises toward clicks instead of enquiries. The
 *     conversions themselves fire from src/lib/track.ts (a lead, a
 *     phone tap), each against its own conversion label.
 *
 *   Meta pixel (only when NEXT_PUBLIC_META_PIXEL_ID is set)
 *     PageView here, Lead and Contact from src/lib/track.ts. Facebook
 *     can't report cost per lead, or build a retargeting audience from
 *     the people who read the heat pump page, without it.
 *
 * Nothing here loads unless the matching env var exists, so a missing
 * key is a no-op rather than a broken page.
 */

export function Analytics() {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const ads = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // gtag.js is one script whichever of the two Google IDs exist; it is
  // loaded under the first one and configured for both.
  const gtagId = ga || ads;
  const configs = [ga, ads].filter(Boolean).map((id) => `gtag('config', '${id}');`).join("\n          ");

  return (
    <>
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${configs}
        `}
          </Script>
        </>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixel}');
          fbq('track', 'PageView');
        `}
        </Script>
      )}
    </>
  );
}
