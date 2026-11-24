import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { officeWork } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Empty, Head } from "@/components/portal/kit/Kit";
import { JobWriteup, type DocView, type HistoryRow } from "@/components/portal/JobWriteup";
import { dbConfigured } from "@/lib/portal/db";
import { q, sbSelect, sbSelectOne } from "@/lib/dashboard/db";
import { loadJob } from "@/lib/jobwrite/load";
import { planOnePrice, type Doc } from "@/lib/jobwrite/lines";
import { plainText } from "@/lib/pricebook/wording";

export const dynamic = "force-dynamic";
// Reading the job from ServiceTitan, then Claude writing: the button's server
// action runs under this page's limit.
export const maxDuration = 60;
export const metadata = { title: "Job write-up · Team portal" };

/** ServiceTitan's paragraphs as blocks of text with a blank line between, for editing. */
const blocks = (html: string | null | undefined) => (plainText(html) ?? "").split("\n").filter(Boolean).join("\n\n");

function view(d: Doc | null): DocView | null {
  if (!d) return null;
  const p = planOnePrice(d);
  const labour = p.target ?? p.lines.filter((l) => l.role === "labour").sort((a, b) => b.total - a.total)[0] ?? null;
  return {
    kind: d.kind, id: d.id, name: d.name, status: d.status,
    summary: blocks(d.summary),
    labour: labour ? blocks(labour.description) : "",
    labourName: labour ? labour.name || labour.code : null,
    lines: p.lines.map((l) => ({ id: l.id, name: l.name || l.code, code: l.code, role: l.role, qty: l.qty, total: l.total, newTotal: l.newTotal, merged: l.merged, target: l.target })),
    combined: p.combined, parts: p.parts, before: p.before, after: p.after, changes: p.changes, blockers: p.blockers, hasTarget: p.target != null,
  };
}

/**
 * Jobs › Write-up (Jake, 19 Nov): type a job number, and from the office's
 * own notes, its quote, the tech's forms and the notes on it and the visits
 * before it, get the job summary and a labour line that carries the labour,
 * materials and electrical as one price, for the quote and for the invoice.
 * Nothing changes in ServiceTitan until someone reads it and presses the
 * button, and each press can be undone.
 */
export default async function WriteupPage({ searchParams }: { searchParams: { job?: string; quote?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!officeWork(user)) return <Locked user={user} what="Job write-up" forWhom="the office" />;

  const job = (searchParams.job ?? "").trim().replace(/^#/, "");
  const facts = job && dbConfigured() ? await loadJob(job).catch(() => null) : null;
  const quote = facts ? facts.quotes.find((x) => String(x.id) === searchParams.quote) ?? facts.quotes[0] ?? null : null;
  const [history, saved] = facts
    ? await Promise.all([
        sbSelect<HistoryRow>("job_writeups", [q.select("id,doc_kind,status,note,created_by,created_at"), q.eq("job_id", String(facts.jobId)), "order=created_at.desc", "limit=8"].join("&")).catch(() => []),
        sbSelectOne<{ notes: string; updated_by: string | null; updated_at: string }>("job_writeup_notes", [q.select("notes,updated_by,updated_at"), q.eq("job_id", String(facts.jobId))].join("&")).catch(() => null),
      ])
    : [[], null];
  // Short, for the tags under the job: what it was read from.
  const read = facts ? [
    quote ? "Quote" : null,
    facts.invoice ? "Invoice" : null,
    facts.reports.length ? `${facts.reports.length} ${facts.reports.length === 1 ? "Condition Report" : "Condition Reports"}` : null,
    facts.notes.length ? `${facts.notes.length} ${facts.notes.length === 1 ? "job note" : "job notes"}` : null,
    facts.electricians.length ? "Electrician booked" : null,
  ].filter(Boolean) as string[] : [];
  // A finished job is being invoiced; anything before that is still the quote.
  const start = facts?.invoice && /complete/i.test(facts.status ?? "") ? "invoice" : quote ? "estimate" : "invoice";

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Job write-up" eyebrow="Jobs" sub="The job summary and the labour line for a job's quote or invoice, written from your notes and what's in ServiceTitan." info={[
          ["Notes to write it from", "Only for writing: they aren't put on the job in ServiceTitan. Say how it's going in (a roof bracket, a pump), what's coming out, and anything that comes off the price if it isn't needed. Nothing is written until there are notes, and where they disagree with an older record, your notes win. They're kept here for whoever opens the job next."],
          ["One price", "The installation labour, the materials and the electrical work go under the main labour line, at what they come to together. The other lines stay on at $0 with their cost, so job profit still sees them. The equipment, the compliance certificate and the rebates keep their own lines, and the total doesn't change."],
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
          <JobWriteup
            key={`${facts.jobId}-${quote?.id ?? 0}`}
            job={facts.number ?? job}
            heading={{ number: facts.number, type: facts.type, customer: facts.customer, read, missing: facts.missing }}
            quotes={facts.quotes.map((x) => ({ id: x.id, name: x.name, status: x.status }))}
            quote={view(quote)}
            invoice={view(facts.invoice)}
            start={start}
            notes={saved?.notes ?? ""}
            notesBy={saved?.updated_by ? { by: saved.updated_by, at: saved.updated_at } : null}
            history={history}
          />
        )}
      </div>
    </PortalShell>
  );
}
