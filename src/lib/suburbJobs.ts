import type { Suburb } from "@/lib/suburbs";
import { REVIEWS, type Review } from "@/lib/reviews";

/**
 * The system pages a suburb page should link to, read from what that
 * suburb's record says we install there.
 *
 * Suburb pages linked the same four service hubs whatever the suburb, so a
 * Cranbourne page whose record says "Mitsubishi splits and gas ducted
 * heating" sent nothing to the split or gas ducted pages. Matching the
 * suburb's own `commonInstall` sentence means each page links the jobs it
 * describes, in the order it describes them, and nothing it doesn't. Every
 * published suburb matches at least one.
 *
 * Gas storage hot water has no system page of its own; the gas-plumbing hub
 * the suburb page already links covers it.
 */
const JOBS: { re: RegExp; label: string; href: string }[] = [
  { re: /heat pump/i, label: "Heat pump hot water", href: "/services/heat-pump-installation" },
  { re: /split/i, label: "Split systems", href: "/services/air-conditioning-installation/split" },
  { re: /multi/i, label: "Multi-head splits", href: "/services/air-conditioning-installation/multi" },
  // "Ducted" on its own is the aircon; ducted gas heating is matched below.
  { re: /ducted\b(?! gas| heating)/i, label: "Ducted air conditioning", href: "/services/air-conditioning-installation/ducted" },
  { re: /gas ducted|ducted gas|ducted heating|central heating/i, label: "Gas ducted heating", href: "/services/gas-plumbing/gas-ducted" },
  { re: /continuous|instantaneous/i, label: "Continuous flow gas hot water", href: "/services/gas-plumbing/continuous-flow" },
  { re: /evap/i, label: "Evaporative cooling", href: "/services/air-conditioning-installation/evap" },
];

export function suburbJobs(sub: Suburb): { label: string; href: string }[] {
  return JOBS.map((j) => ({ ...j, at: sub.commonInstall.search(j.re) }))
    .filter((j) => j.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ label, href }) => ({ label, href }));
}

/**
 * Reviews in lib/reviews.ts whose job was in this suburb.
 *
 * Exact suburb match on the part of `what` before the " · ", so a
 * Cranbourne East job doesn't turn up on the Cranbourne page. The suburb's
 * own testimonial is left out when it's the same customer, since the page
 * already prints it.
 */
export function suburbReviews(sub: Suburb): Review[] {
  const shown = sub.testimonial?.who.split(",")[0].trim();
  return REVIEWS.filter((r) => r.what.split(" · ")[0].trim() === sub.name && r.who !== shown);
}
