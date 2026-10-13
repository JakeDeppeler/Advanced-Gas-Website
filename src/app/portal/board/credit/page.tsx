import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { SaleCredit } from "@/components/portal/SaleCredit";
import { dbConfigured } from "@/lib/portal/db";
import { readSoldJobs } from "@/lib/board/saleCredit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Who sold it — Team portal" };

const EMPTY = { jobs: [], people: [], moves: 0 };

/** Moving a sold job's credit from one person to another. */
export default async function SaleCreditPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The wall board" forWhom="managers" />;

  const ready = dbConfigured();
  const { jobs, people, moves } = ready ? await readSoldJobs().catch(() => EMPTY) : EMPTY;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/board" label="Wall board" />
      <div className="pt-head">
        <h1>Who sold it</h1>
        <p>
          The board credits a job to whoever wrote the quote, because ServiceTitan only stamps a seller once an estimate
          closes — keyed on that, the leaderboard listed the two people who had closed something while six had been
          quoting. It is right nearly always. When it isn&rsquo;t — one person priced the job and somebody else went back
          and closed it — this is where the office says so.
        </p>
        <p>
          A move takes the <strong>whole job</strong>, the quote as well as the sale. Moving the sale on its own would
          give one person a sale against no quote and the other a quote that never closed, and the Team page&rsquo;s
          &ldquo;sold out of quoted&rdquo; would read as nonsense for both of them.
        </p>
        <p className="pt-credit__warn">
          This changes the leaderboard and the commission bands on it. Every move is kept with who made it and when.
        </p>
      </div>
      {!ready && (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected,</strong> so nothing can be saved yet.
        </div>
      )}
      <SaleCredit jobs={jobs} people={people} moves={moves} />
    </PortalShell>
  );
}
