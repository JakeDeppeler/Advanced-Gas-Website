import Link from "next/link";

/**
 * Today, Keep in touch and Future planning, as three tabs of one place: the
 * office staying on top of the day, the people, and where the business is
 * going. All three hang off the To-do link in the side bar.
 */
export function TodoTabs({ on, contactsDue }: { on: "todo" | "contacts" | "plans"; contactsDue: number }) {
  const tab = (key: typeof on, href: string, label: React.ReactNode) => (
    <Link href={href} className={`pt-seg__b${on === key ? " is-on" : ""}`} aria-current={on === key ? "page" : undefined}>{label}</Link>
  );
  return (
    <nav className="pt-seg pt-todotabs" aria-label="Today, keep in touch and future planning">
      {tab("todo", "/portal/todo", "Today")}
      {tab("contacts", "/portal/keep-in-touch", <>Keep in touch{contactsDue > 0 && <span className="pt-kit__segn" aria-label={`${contactsDue} due`}>{contactsDue}</span>}</>)}
      {tab("plans", "/portal/plans", "Future planning")}
    </nav>
  );
}
