import Link from "next/link";
import { site } from "@/lib/site";

/**
 * Full-width call-to-action band, dropped between sections.
 *
 * Lifted from the way Complete Home Filtration paces their pages — they
 * run a coloured band every few sections so the reader is never more
 * than one screen from a way to act. Ours is orange rather than their
 * green, and it says what actually happens next instead of "book a
 * consultation", because we don't do consultations, we do site visits.
 */
export function CtaBand({
  heading,
  blurb,
  cta = "Get a quote",
  href = "/quote",
}: {
  heading: string;
  blurb?: string;
  cta?: string;
  href?: string;
}) {
  return (
    <section className="ctaband">
      <div className="wrap ctaband__row">
        <div>
          <h2>{heading}</h2>
          {blurb && <p>{blurb}</p>}
        </div>
        <div className="ctaband__acts">
          <Link href={href} className="ds-btn ds-btn--lg ctaband__btn">{cta} →</Link>
          <a href={`tel:${site.phoneE164}`} className="ctaband__phone">
            or call <strong>{site.phone}</strong>
          </a>
        </div>
      </div>
    </section>
  );
}
