import Link from "next/link";

/**
 * The way back up a level, small and grey over the title: "‹ Customers".
 *
 * Back to Home, or to one of the old section landing pages, draws nothing:
 * the top bar is always there to go home or to an area, and a second way
 * there stacked above the title read as clutter in the mocks' layout.
 */
export function PortalBack({ href, label }: { href: string; label: string }) {
  if (href === "/portal" || href.startsWith("/portal/section/")) return null;
  return <Link href={href} className="pt-back pt-up">‹ {label}</Link>;
}
