import Link from "next/link";

/**
 * What a portal page looks like while the server is still working on it.
 *
 * Without this, a click on a card did nothing visible until the whole next page
 * had been rendered — a second or more of the old page sitting there looking
 * like the click hadn't landed, which is what "the portal is slow" mostly was.
 * With it the bar and the page's outline appear at once, and Next prefetches
 * this much of every linked page so even that is instant.
 *
 * It can't know who is signed in or what the page holds, so it draws only the
 * furniture every page shares: the bar, a back link, a heading, two panels.
 */
export default function PortalLoading() {
  return (
    <div className="pt" data-no-reveal aria-busy="true">
      <header className="pt__bar">
        <Link href="/portal" className="pt__brand" aria-label="Portal home">
          <strong>Advanced</strong>
          <em>Gas &amp; Aircon · Team portal</em>
        </Link>
        <div className="pt-find"><div className="pt-find__box" aria-hidden="true" /></div>
        <div className="pt__right" />
      </header>
      <main className="pt__content">
        <p className="pt-sr" role="status">Loading…</p>
        <div className="pt-skel" aria-hidden="true">
          <span className="pt-skel__back" />
          <span className="pt-skel__h" />
          <span className="pt-skel__p" />
          <span className="pt-skel__panel" />
          <span className="pt-skel__panel pt-skel__panel--short" />
        </div>
      </main>
    </div>
  );
}
