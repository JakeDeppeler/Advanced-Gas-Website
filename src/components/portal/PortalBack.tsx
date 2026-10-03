import Link from "next/link";

/**
 * "← Home": back up a level, as the design draws it.
 *
 * The arrow is drawn rather than typed: Manrope has no arrow glyph, so a typed
 * "←" fell back to whatever the device had and came out at half the size.
 */
export function PortalBack({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="pt-back">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 12H5M11 6l-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}
