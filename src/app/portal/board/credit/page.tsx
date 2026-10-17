import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { SaleCredit } from "@/components/portal/SaleCredit";
import { dbConfigured } from "@/lib/portal/db";
import { readSoldJobs, windowDays } from "@/lib/board/saleCredit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Who sold it · Team portal" };

const EMPTY = { jobs: [], people: [], moves: 0, totals: [] };

/**
 * Every sale, who it is listed under, and how to change that.
 *
 * The window is a link rather than client state, so the page re-reads on the
 * server and a window somebody is looking at can be sent to somebody else.
 */
export default async function SaleCreditPage({ searchParams }: { searchParams?: { d?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  const days = windowDays(searchParams?.d);
  const ready = dbConfigured();
  const { jobs, people, moves, totals } = ready ? await readSoldJobs(days).catch(() => EMPTY) : EMPTY;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/board" label="Wall board" />
      <div className="pt-head">
        <h1>Who sold it</h1>
        <p>
          The board credits a job to whoever <em>wrote</em> the quote, because ServiceTitan only stamps a seller once an
          estimate is closed from the sell screen, and this office closes most of them without naming one, so keying on
          it listed the two people who had while six had been quoting. That is right nearly always. When it
          isn&rsquo;t, somebody starts a quote and doesn&rsquo;t do the work, this is where the office says so.
        </p>
        <p>
          A move takes the <strong>whole job</strong>, the quote as well as the sale. Moving the sale on its own would
          give one person a sale against no quote and the other a quote that never closed, and the Team page&rsquo;s
          &ldquo;sold out of quoted&rdquo; would read as nonsense for both of them.
        </p>
        <p className="pt-credit__warn">
          This changes the leaderboard and the commission bands on it. Every move is kept with who made it and when. It
          does not change anything in ServiceTitan.
        </p>
      </div>
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected,</strong> so nothing can be saved yet.
        </div>
      )}
      <SaleCredit jobs={jobs} people={people} moves={moves} totals={totals} days={days} />
    </PortalShell>
  );
}
