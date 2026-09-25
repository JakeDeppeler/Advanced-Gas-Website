import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The panel every commercial sub-page closes on.
 *
 * The same orange the front page asks on, so the four branches end where the
 * front page ends rather than each inventing a finish. One action in white
 * — orange on orange would disappear — and one quieter alternative beside
 * it, because on a commercial page most readers are not ready to send a
 * scope yet and a single button makes that feel like a dead end.
 */

export function CxClose({
  eyebrow,
  title,
  children,
  action = { href: "/commercial/contact", label: "Submit a scope →" },
  second,
  alt,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: { href: string; label: string };
  /** A second button, ghosted. */
  second?: { href: string; label: string; external?: boolean };
  /** Or a plain text link, where a second button would be too loud. */
  alt?: { href: string; label: ReactNode; external?: boolean };
}) {
  return (
    <section className="cx-closesec cx-noprint" data-hide-sticky-cta>
      <div className="wrap">
        <div className="cx-close cx-rv">
          <div>
            <span className="cx-eye">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{children}</p>
          </div>
          <div className="cx-close__btns">
            <Link href={action.href} className="ds-btn ds-btn--onorange ds-btn--lg">{action.label}</Link>
            {second && (second.external
              ? <a href={second.href} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">{second.label}</a>
              : <Link href={second.href} className="ds-btn ds-btn--ghost-on-dark ds-btn--lg">{second.label}</Link>)}
            {alt && (alt.external
              ? <a href={alt.href} className="cx-close__alt">{alt.label}</a>
              : <Link href={alt.href} className="cx-close__alt">{alt.label}</Link>)}
          </div>
        </div>
      </div>
    </section>
  );
}
