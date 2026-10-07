import Link from "next/link";

/**
 * To-do and Keep in touch, as two tabs of one place: both are the office
 * staying on top of things, and both hang off the To-do link in the side bar.
 */
export function TodoTabs({ on, contactsDue }: { on: "todo" | "contacts"; contactsDue: number }) {
  return (
    <nav className="pt-seg pt-todotabs" aria-label="To-do and keep in touch">
      <Link href="/portal/todo" className={`pt-seg__b${on === "todo" ? " is-on" : ""}`} aria-current={on === "todo" ? "page" : undefined}>To-do</Link>
      <Link href="/portal/keep-in-touch" className={`pt-seg__b${on === "contacts" ? " is-on" : ""}`} aria-current={on === "contacts" ? "page" : undefined}>
        Keep in touch{contactsDue > 0 && <span className="pt-kit__segn" aria-label={`${contactsDue} due`}>{contactsDue}</span>}
      </Link>
    </nav>
  );
}
