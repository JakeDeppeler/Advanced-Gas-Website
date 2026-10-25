import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { TradeJobActions } from "@/components/portal/TradeJobActions";
import { myJobs, type MyJob } from "@/lib/portal/tradeJobs";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "My jobs — Trade portal" };

const when = (iso: string, withDay: boolean) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", ...(withDay ? { weekday: "short", day: "numeric", month: "short" } : {}), hour: "numeric", minute: "2-digit" });
const STATUS: Record<string, string> = { InProgress: "In progress", Scheduled: "Booked", Completed: "Completed", Hold: "On hold", Canceled: "Cancelled" };

function Job({ j, withDay, canDone }: { j: MyJob; withDay: boolean; canDone: boolean }) {
  return (
    <div className="tr-jobrow">
      <div className="tr-jobrow__k">
        <strong>{[j.customer ?? `Job ${j.jobNumber ?? j.jobId}`, j.suburb].filter(Boolean).join(", ")}</strong>
        <span>{[j.jobType, `#${j.jobNumber ?? j.jobId}`, `${withDay ? "visit " : ""}${when(j.visitAt, withDay)}`].filter(Boolean).join(" · ")}</span>
      </div>
      <span className={`tr-chip${j.status === "Completed" ? " tr-chip--good" : ""}`}>{STATUS[j.status] ?? j.status}</span>
      {j.status !== "Completed" && j.status !== "Canceled" && <TradeJobActions jobId={j.jobId} canDone={canDone} doneBy={j.doneBy?.by ?? null} />}
    </div>
  );
}

/**
 * My jobs: the visits ServiceTitan has you on. Today's, then any job whose
 * visit has been and gone but is still open, then the week ahead. The middle
 * list is the one that matters: a job nobody completes can't be invoiced.
 */
export default async function TradeJobs() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const jobs = await myJobs(user.name).catch(() => null);
  const today = isoDateMelbourne(new Date());

  return (
    <TradeShell user={user} active="home" title="My jobs" sub={new Date(`${today}T12:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })}>
      {!jobs ? (
        <section className="tr-card"><p className="tr-empty">Your jobs couldn&rsquo;t be read from ServiceTitan just now, or your name there doesn&rsquo;t match the portal. Tell the office.</p></section>
      ) : (
        <div className="tr-stack">
          {jobs.open.length > 0 && (
            <section className="tr-card tr-card--warnline">
              <div className="tr-card__h"><h2>Left open · {jobs.open.length}</h2></div>
              <p className="tr-small" style={{ marginTop: -4 }}>Your visit&rsquo;s been, but the job&rsquo;s still open in ServiceTitan with nothing booked after it, so it can&rsquo;t be invoiced. If the work&rsquo;s done, say so. If there&rsquo;s more to do, add a note saying what.</p>
              <div className="tr-jobrows">{jobs.open.map((j) => <Job key={j.jobId} j={j} withDay canDone />)}</div>
            </section>
          )}
          <section className="tr-card">
            <div className="tr-card__h"><h2>Today</h2></div>
            {jobs.today.length ? <div className="tr-jobrows">{jobs.today.map((j) => <Job key={j.jobId} j={j} withDay={false} canDone />)}</div> : <p className="tr-empty">Nothing booked for you today.</p>}
          </section>
          <section className="tr-card">
            <div className="tr-card__h"><h2>Coming up</h2></div>
            {jobs.coming.length ? <div className="tr-jobrows">{jobs.coming.map((j) => <Job key={j.jobId} j={j} withDay canDone={false} />)}</div> : <p className="tr-empty">Nothing booked for you in the next week.</p>}
          </section>
        </div>
      )}
    </TradeShell>
  );
}
