import Link from "next/link";
import type { NeedLine } from "@/lib/portal/needs";

/**
 * "Needs someone today", to the mock: one column of lines, each a count, what
 * it is and a way into it. Home and The numbers draw the same card from the
 * same list, so the two can't disagree about what's waiting.
 */
export function NeedsList({ lines, empty, aside }: {
  lines: NeedLine[];
  /** Said when the list is empty, after "Nothing waiting on anyone right now." */
  empty?: string;
  /** The header's right-hand side. Defaults to "See all →" to the notifications. */
  aside?: React.ReactNode;
}) {
  return (
    <section className="pt-wait" aria-labelledby="needs-h">
      <div className="pt-wait__head">
        <h2 id="needs-h">Needs someone today</h2>
        {aside ?? <Link href="/portal/notifications" className="pt-wait__all">See all →</Link>}
      </div>
      {lines.length === 0 ? (
        <p className="pt-wait__none">Nothing waiting on anyone right now.{empty ? ` ${empty}` : ""}</p>
      ) : (
        <ul className="pt-wait__list">
          {lines.map((l) => (
            <li key={l.text}>
              <Link href={l.href} className="pt-wait__row">
                <span className="pt-wait__n">{l.n.toLocaleString("en-AU")}</span>
                <span className="pt-wait__txt">{l.text}</span>
                <svg className="pt-wait__go" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
