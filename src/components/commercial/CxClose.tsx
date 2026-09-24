import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The panel every commercial sub-page closes on.
 *
 * The same orange the front page asks on, so the four branches end where the
 * front page ends rather than each inventing a finish. One action, and one
 * quieter alternative next to it for the reader who is not ready to send a
 * scope yet — which on a commercial page is most of them.
 */

export function CxClose({
  title,
  children,
  action = { href: "/commercial/contact", label: "Submit a scope →" },
  alt,
}: {
  title: string;
  children: ReactNode;
  action?: { href: string; label: string };
  alt?: { href: string; label: ReactNode; external?: boolean };
}) {
  return (
    <section className="cx-closesec cx-noprint" data-hide-sticky-cta>
      <div className="wrap">
        <div className="cx-close cx-rv">
          <div>
            <h2>{title}</h2>
            <p>{children}</p>
          </div>
          <div className="cx-close__btns">
            <Link href={action.href} className="ds-btn ds-btn--onorange ds-btn--lg">{action.label}</Link>
            {alt && (alt.external
              ? <a href={alt.href} className="cx-close__alt">{alt.label}</a>
              : <Link href={alt.href} className="cx-close__alt">{alt.label}</Link>)}
          </div>
        </div>
      </div>
    </section>
  );
}
