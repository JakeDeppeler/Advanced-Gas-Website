import Link from "next/link";

/**
 * Future planning's tabs: where the business is headed, the crew and its
 * rate, and the pay plan. Quotes used to be a fourth, as a hand-typed log; the
 * quote pipeline reads them all from ServiceTitan now, so it went. Adding a
 * tab is adding a row to TABS.
 */
const TABS = [
  { href: "/portal/finance/planning", label: "Where we're headed", sub: "Profit target, what-ifs" },
  { href: "/portal/finance/planning/crew", label: "Crew & rate", sub: "Add or take off people, pay, your cut" },
  { href: "/portal/finance/planning/commission", label: "Pay plan", sub: "$45 + commission, from January" },
];

export function PlanningTabs({ current }: { current: string }) {
  return (
    <nav className="pt-ptabs" aria-label="Future planning">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`pt-ptab${t.href === current ? " is-on" : ""}`}
          aria-current={t.href === current ? "page" : undefined}
        >
          <strong>{t.label}</strong>
          <span>{t.sub}</span>
        </Link>
      ))}
    </nav>
  );
}
