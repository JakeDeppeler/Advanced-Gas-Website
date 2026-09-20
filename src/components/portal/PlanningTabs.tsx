import Link from "next/link";

/**
 * The two halves of Future planning.
 *
 * Quotes & win rate used to be its own item in the Finance sidebar, sitting
 * between the website leads and the targets as if it were a third kind of
 * report. It is not. It is the same question Future planning asks — what is
 * coming, and how much of it lands — just measured on work that is already
 * out the door rather than work being imagined. So it is a tab here.
 *
 * Two tabs today. The division that will matter later is by horizon rather
 * than by subject: what is out now, this quarter, next year. Adding one is
 * adding a row to TABS.
 */
const TABS = [
  { href: "/portal/finance/planning", label: "Where we're headed", sub: "Profit target, what-ifs" },
  { href: "/portal/finance/quotes", label: "Quotes & win rate", sub: "What's out, what comes back" },
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
