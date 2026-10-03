import Link from "next/link";
import type { PortalUser } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";

/**
 * A page this person's level can't open, said on the page they asked for.
 *
 * It used to bounce them to Home with a line across the top, which left them
 * wondering whether the link was broken. The design shows the door, shut, and
 * says who to ask.
 */
export function Locked({ user, what, forWhom = "admins" }: { user: PortalUser; what: string; forWhom?: string }) {
  return (
    <PortalShell user={user}>
      <div className="pt-state-wrap">
        <section className="pt-state">
          <span className="pt-state__lock" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </span>
          <strong className="pt-state__title">This one&rsquo;s for {forWhom}</strong>
          <span className="pt-state__body">{what} is switched off for your level. Ask Jake if you need something from it.</span>
          <Link href="/portal" className="pt-state__btn">Back to Home</Link>
        </section>
      </div>
    </PortalShell>
  );
}
