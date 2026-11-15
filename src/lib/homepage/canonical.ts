import { CATS, type System } from "@/lib/homepage/data";

/**
 * The system whose product pages are the canonical copy of this one's.
 *
 * "Reverse-cycle split" under Heating and "Split system" under Cooling sell
 * the same two units (both use SPLIT_TIERS), so /find/reverse-cycle-split/
 * essential and /find/split-system/essential rendered the same page with
 * "Heating" in place of "Cooling": 99% identical text, identical meta
 * description. Two indexable copies of one page split whatever links and
 * clicks it earns, and Google picks which to show rather than us.
 *
 * Both stay live, because the heating menu should land on a page that says
 * heating, but the second points its canonical at the first and stays out of
 * the sitemap. The system overview pages (/find/<system>) are NOT merged:
 * their copy differs, heating against cooling.
 *
 * Shared by reference, not by name, so any future pair of systems built on
 * one tier list is caught without a list to keep up to date. The first in
 * CATS order wins, which puts Cooling ahead of Heating.
 */
export function canonicalProductSystem(sys: System): System {
  for (const c of CATS) for (const s of c.systems) if (s.tiers === sys.tiers) return s;
  return sys;
}
