"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_SETS, type Tab, type TabSetName } from "@/lib/portal/nav";

/**
 * The strip across the top of a section.
 *
 * This is where the sidebar's children went. Losing the sidebar stranded four
 * Finance pages — costs & capacity, targets, planning and quotes had no link
 * anywhere in the app once it was gone — so this is not decoration; it is the
 * only way into half of Finance.
 *
 * A tab is current when the path matches it or sits beneath it, so a detail
 * page keeps its section lit rather than blanking the whole strip.
 */
export function PortalTabs({ set, tabs: given }: { set?: TabSetName; tabs?: Tab[] }) {
  const pathname = usePathname();
  // Sections whose children come from content rather than a fixed list — the
  // information sections, the handbook's shelves, the learning tracks — pass
  // their own. Everything else names one of the sets.
  const tabs = given ?? (set ? TAB_SETS[set] : []);

  // Longest match wins, so /portal/finance/goals lights "The year" rather than
  // "Overview", which every finance path starts with.
  const current = tabs.reduce<string | null>((best, t) => {
    const hit = pathname === t.href || pathname.startsWith(t.href + "/") || (t.also ?? []).some((a) => pathname.startsWith(a));
    if (!hit) return best;
    return best && best.length >= t.href.length ? best : t.href;
  }, null);

  return (
    <nav className="pt-tabs" aria-label="Section">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={t.href === current ? "is-on" : undefined} aria-current={t.href === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
