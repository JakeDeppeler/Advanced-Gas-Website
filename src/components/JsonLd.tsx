/**
 * Structured data as a plain <script type="application/ld+json"> in the
 * server-rendered HTML.
 *
 * Every JSON-LD block on the site used to go through next/script. In the App
 * Router that does not print a script tag: the block rides inside the React
 * flight payload and is injected into the DOM after hydration. A crawl of all
 * 221 sitemap pages found zero ld+json tags in the HTML as served, so the
 * LocalBusiness record, every breadcrumb and every FAQPage existed only for a
 * crawler that runs the page's JavaScript and waits for it. Google's renderer
 * usually gets there eventually; Bing, Apple and the AI crawlers mostly don't,
 * and Google's own advice is to put the markup in the initial HTML. Next's docs
 * recommend exactly this element for JSON-LD.
 *
 * `<` is escaped because blog posts and reviews arrive from outside the code
 * (the portal, the Places API), and a "</script>" inside one of their strings
 * would otherwise end the tag early and turn the rest into live HTML.
 */
export function JsonLd({ data }: { data: object | null | undefined }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
