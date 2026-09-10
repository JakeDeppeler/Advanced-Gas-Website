"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { sweepTo, type SweepKind } from "@/components/RouteMotion";

/**
 * A door with a themed transition behind it.
 *
 * Plain <Link> unless `sweep` is set, in which case the click is intercepted
 * and the route changes under a full-screen sweep — see RouteMotion. Modified
 * clicks (new tab, new window) are left alone so the door still behaves like
 * a link when someone wants it to.
 */
export function DoorLink({
  href, className, sweep, children,
}: {
  href: string; className?: string; sweep?: SweepKind; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (!sweep) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        sweepTo(() => router.push(href), sweep);
      }}
    >
      {children}
    </Link>
  );
}
