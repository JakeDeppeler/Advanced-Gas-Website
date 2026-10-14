import { Tabs } from "@/components/portal/kit/Kit";

/**
 * The sub-tabs of the rebuilt Run the company pages. Some tabs are pages of
 * their own that already existed — the quote pipeline, leads, not billed,
 * hours, our hourly rate — and draw the same row at their top, so moving
 * between them feels like one page, and the side bar files them under it.
 */

export function SalesTabs({ on, cold }: { on: "overview" | "quotes" | "leads" | "types"; cold?: number }) {
  return (
    <Tabs on={on} items={[
      { key: "overview", label: "Overview", href: "/portal/sales" },
      { key: "quotes", label: "Quotes", href: "/portal/pipeline", count: cold || undefined, red: true },
      { key: "leads", label: "Leads", href: "/portal/leads" },
      { key: "types", label: "Job types", href: "/portal/sales?tab=types" },
    ]} />
  );
}

export function JobsTabs({ on, notBilled, today }: { on: "today" | "profit" | "notbilled"; notBilled?: number; today?: number }) {
  return (
    <Tabs on={on} items={[
      { key: "today", label: "Today", href: "/portal/jobs", count: today || undefined },
      { key: "profit", label: "Job profit", href: "/portal/jobs?tab=profit" },
      { key: "notbilled", label: "Not billed", href: "/portal/jobs?tab=notbilled", count: notBilled || undefined, red: true },
    ]} />
  );
}

export function TeamTabs({ on }: { on: "rates" | "build" | "running" | "leaders" | "hours" }) {
  return (
    <Tabs on={on} items={[
      { key: "rates", label: "Labour rates", href: "/portal/rates" },
      { key: "build", label: "Build our rate", href: "/portal/finance/hourly" },
      { key: "running", label: "Running costs", href: "/portal/finance/running" },
      { key: "leaders", label: "Leaderboard", href: "/portal/rates?tab=leaders" },
      { key: "hours", label: "Hours", href: "/portal/hours" },
    ]} />
  );
}

export function PaceTabs({ on }: { on: "mix" | "funnel" }) {
  return (
    <Tabs on={on} items={[
      { key: "mix", label: "The mix", href: "/portal/goal" },
      { key: "funnel", label: "Step by step", href: "/portal/pace" },
    ]} />
  );
}
