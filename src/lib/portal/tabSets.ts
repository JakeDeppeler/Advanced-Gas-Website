/**
 * Section tabs, which is where the sidebar's children went.
 *
 * Declared here beside the destinations rather than in the component, so the
 * orphan check — does anything link to this route? — has one place to look.
 */
export type Tab = { href: string; label: string; also?: string[] };
export type TabSetName = "finance" | "supply" | "website";

export const TAB_SETS: Record<TabSetName, Tab[]> = {
  finance: [
    { href: "/portal/finance", label: "Overview" },
    { href: "/portal/finance/goals", label: "The year" },
    { href: "/portal/finance/pl", label: "Profit & loss" },
    { href: "/portal/finance/capacity", label: "Costs & capacity" },
    { href: "/portal/finance/targets", label: "Targets" },
    // Quotes is a tab inside planning rather than a sibling: both ask about
    // work that has not happened yet.
    { href: "/portal/finance/planning", label: "Planning", also: ["/portal/finance/quotes"] },
  ],
  website: [
    { href: "/portal/website", label: "Enquiries" },
    { href: "/portal/website?tab=pages", label: "Pages" },
    { href: "/portal/website?tab=dropoff", label: "Drop-off" },
    { href: "/portal/finance/leads", label: "Every enquiry" },
  ],
  supply: [
    { href: "/portal/supply", label: "Overview" },
    { href: "/portal/supply/orders", label: "Orders" },
    { href: "/portal/supply/search", label: "Item search" },
    { href: "/portal/supply/syncs", label: "Sync history" },
    // The connection check is reached from the Overview's button rather than
    // a tab: it is an action that takes a few seconds, not a place.
    { href: "/portal/supply/pricing", label: "Pricing rules", also: ["/portal/supply/health"] },
  ],
};
