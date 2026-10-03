import type { ReactNode } from "react";

/**
 * The portal's four states, to States.dc.html: nothing found, couldn't load,
 * not open to you, and loading. One component each so every page draws them
 * the same way.
 */

export function NoResults({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <section className="pt-state">
      <span className="pt-state__kicker">No results</span>
      <strong className="pt-state__title">{title}</strong>
      <span className="pt-state__body">{body}</span>
      {action}
    </section>
  );
}

export function CouldntLoad({ title, body, retryHref }: { title: string; body: string; retryHref?: string }) {
  return (
    <section className="pt-state">
      <span className="pt-state__kicker pt-state__kicker--bad">Couldn&rsquo;t load</span>
      <strong className="pt-state__title">{title}</strong>
      <span className="pt-state__body">{body}</span>
      {retryHref && <a href={retryHref} className="pt-state__btn pt-state__btn--navy">Try again</a>}
    </section>
  );
}

export function LoadingCard() {
  return (
    <section className="pt-state pt-state--loading" aria-label="Loading">
      <span className="pt-state__kicker">Loading</span>
      <span className="pt-skelbar" style={{ height: 40, width: "60%" }} />
      <span className="pt-skelbar" style={{ height: 16, width: "90%" }} />
      <span className="pt-skelbar" style={{ height: 16, width: "80%" }} />
      <span className="pt-skelbar" style={{ height: 120, width: "100%", borderRadius: 16 }} />
    </section>
  );
}
