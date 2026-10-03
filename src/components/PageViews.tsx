"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackView } from "@/lib/track";

/**
 * Counts a read of every public page, for the portal's views figures.
 *
 * Keyed on the pathname rather than mounted once, because moving between pages
 * on this site is a client-side navigation: the layout — and anything in it —
 * stays mounted, and an effect that ran once would count the landing page and
 * nothing after it.
 */
export function PageViews() {
  const path = usePathname();
  useEffect(() => {
    if (path) trackView(path);
  }, [path]);
  return null;
}
