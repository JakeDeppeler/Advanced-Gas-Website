import Link from "next/link";

/** Small "← back up a level" link for portal sub-pages. */
export function PortalBack({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="pt-back">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}
