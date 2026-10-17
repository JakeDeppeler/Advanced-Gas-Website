import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PageHead } from "@/components/portal/kit/PageHead";
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
      <PageHead title="Who sold it" line="Move a sale to the person who really did the work. Changes the leaderboard, not ServiceTitan."
        info={<>
          <p>The board credits a job to whoever <em>wrote</em> the quote, because ServiceTitan only stamps a seller when an estimate is closed from the sell screen, and most are closed without one. That&rsquo;s right nearly always; this is for when it isn&rsquo;t.</p>
          <p>A move takes the <strong>whole job</strong>, the quote as well as the sale, so &ldquo;sold out of quoted&rdquo; stays true for both people. Every move is kept with who made it and when.</p>
        </>} />
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected,</strong> so nothing can be saved yet.
        </div>
      )}
      <SaleCredit jobs={jobs} people={people} moves={moves} totals={totals} days={days} />
    </PortalShell>
  );
}
