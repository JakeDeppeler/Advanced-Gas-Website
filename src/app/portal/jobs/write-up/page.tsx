import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { officeWork } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Empty, Head, Say } from "@/components/portal/kit/Kit";
import { JobWriteup, type DocView, type HistoryRow } from "@/components/portal/JobWriteup";
import { dbConfigured } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { loadJob } from "@/lib/jobwrite/load";
import { planOnePrice, type Doc } from "@/lib/jobwrite/lines";
import { plainText } from "@/lib/pricebook/wording";

export const dynamic = "force-dynamic";
// Reading the job from ServiceTitan, then Claude writing: the button's server
// action runs under this page's limit.
export const maxDuration = 60;
export const metadata = { title: "Job write-up · Team portal" };

function view(d: Doc | null): DocView | null {
  if (!d) return null;
  const p = planOnePrice(d);
  return {
    kind: d.kind, id: d.id, name: d.name, status: d.status, summary: plainText(d.summary) ?? "",
    lines: p.lines.map((l) => ({ id: l.id, name: l.name || l.code, code: l.code, role: l.role, qty: l.qty, total: l.total, newTotal: l.newTotal, merged: l.merged, target: l.target })),
    combined: p.combined, parts: p.parts, before: p.before, after: p.after, changes: p.changes, blockers: p.blockers, hasTarget: p.target != null,
  };
}

/**
 * Jobs › Write-up (Jake, 19 Nov): type a job number, and from its quote, the
 * tech's forms and the notes on it and the visits before it, get the quote's
 * and the invoice's summary and a labour line that carries the labour,
 * materials and electrical as one price. Nothing changes in ServiceTitan
 * until someone reads it and presses the button, and each press can be undone.
 */
export default async function WriteupPage({ searchParams }: { searchParams: { job?: string; quote?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!officeWork(user)) return <Locked user={user} what="Job write-up" forWhom="the office" />;

  const job = (searchParams.job ?? "").trim().replace(/^#/, "");
  const facts = job && dbConfigured() ? await loadJob(job).catch(() => null) : null;
  const quote = facts ? facts.quotes.find((x) => String(x.id) === searchParams.quote) ?? facts.quotes[0] ?? null : null;
  const history = facts
    ? await sbSelect<HistoryRow>("job_writeups", [q.select("id,doc_kind,status,note,created_by,created_at"), q.eq("job_id", String(facts.jobId)), "order=created_at.desc", "limit=8"].join("&")).catch(() => [])
    : [];
  const sources = facts ? [
    quote ? `the quote` : null,
    facts.invoice ? "the invoice" : null,
    facts.reports.length ? `${facts.reports.length} ${facts.reports.length === 1 ? "Condition Report" : "Condition Reports"}` : null,
    facts.notes.length ? `${facts.notes.length} ${facts.notes.length === 1 ? "note" : "notes"}` : null,
    facts.electricians.length ? "the electrician's booking" : null,
  ].filter(Boolean) as string[] : [];

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Job write-up" eyebrow="Jobs" sub="Type a job number. The portal reads its quote, invoice, forms and notes from ServiceTitan and writes the job summary and one labour line for both. Read them, change anything, then put them on." info={[
          ["One price", "The installation labour, the materials and the electrical work go under the main labour line, at what they come to together. The other lines stay on at $0 with their cost, so job profit still sees them. The equipment, the compliance certificate and the rebates keep their own lines, and the total doesn't change."],
          ["What it's written from", "The quote's lines and summary, the invoice, the Condition Report from the visit, the notes on this job and the visits before it at the same address, and the electrician booked. Call recordings aren't read yet."],
          ["Undo", "Each time it's put on, the summary and every line it changed are kept first. If ServiceTitan doesn't read back exactly as intended, it's put back straight away; otherwise Undo puts it back while nobody has changed it since."],
        ]} />
        <form className="jw-find" action="/portal/jobs/write-up" method="get">
          <label htmlFor="jw-job">Job number</label>
          <input id="jw-job" name="job" className="pk-in" inputMode="numeric" defaultValue={job} placeholder="e.g. 20912" autoComplete="off" />
          <button className="pk-btn" type="submit">Open</button>
        </form>
        {!job ? null : !facts ? (
          <Empty>{dbConfigured() ? `Job ${job} wasn't found. Check the number; a job made in the last few minutes may not have come across from ServiceTitan yet.` : "The database isn't set up here."}</Empty>
        ) : (
          <>
            <Say>
              Job <b>{facts.number}</b>{facts.type ? <>, {facts.type}</> : null}{facts.customer ? <> for {facts.customer}</> : null}. Read from {sources.length ? sources.join(", ") : "the job alone"}.
              {facts.missing.length ? <> Couldn&rsquo;t read {facts.missing.join(", ")}.</> : null}
            </Say>
            <JobWriteup
              job={facts.number ?? job}
              quotes={facts.quotes.map((x) => ({ id: x.id, name: x.name, status: x.status }))}
              quote={view(quote)}
              invoice={view(facts.invoice)}
              history={history}
            />
          </>
        )}
      </div>
    </PortalShell>
  );
}
