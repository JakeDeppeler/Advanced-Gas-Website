import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { PipelineBoard } from "@/components/portal/PipelineBoard";
import { dbConfigured, listUsers } from "@/lib/portal/db";
import { officeIds } from "@/lib/todos/store";
import { loadPipeline, type Pipeline } from "@/lib/pipeline/store";
import { daysBetween } from "@/lib/pipeline/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quote pipeline — Team portal" };

const k0 = (n: number) => (n >= 10_000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n).toLocaleString("en-AU")}`);

/**
 * Every quote that's out, in the column that says what to do about it, for
 * the whole office to work from: who to ring today, who's been rung and when
 * to try again, and what's been won.
 *
 * Open to anyone with the Quote pipeline switch (the office levels have it)
 * as well as managers — it shows quotes and calls, never costs or wages.
 */
export default async function PipelinePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!(can(user, "quotes") || can(user, "overhead"))) return <Locked user={user} what="The quote pipeline" forWhom="the office" />;

  const ready = dbConfigured();
  const [pipe, users, office] = ready
    ? await Promise.all([
        loadPipeline().catch(() => null),
        listUsers().catch(() => []),
        officeIds().catch(() => [] as string[]),
      ])
    : [null, [], [] as string[]];
  const officeNames = users.filter((u) => u.active && u.id && office.includes(u.id)).map((u) => u.name);
  if (!officeNames.includes(user.name)) officeNames.unshift(user.name);

  const p: Pipeline = pipe ?? { quotes: [], stale: [], today: new Date().toISOString().slice(0, 10) };
  const open = p.quotes.filter((q) => q.stage === "new" || q.stage === "due" || q.stage === "waiting");
  const due = p.quotes.filter((q) => q.stage === "due");
  // Of the quotes written in the last 30 days that have an answer, or are still out: how many sold.
  const month = p.quotes.filter((q) => daysBetween(q.quotedOn, p.today) <= 30);
  const wonMonth = month.filter((q) => q.stage === "won");

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Quote pipeline</h1>
        <p>Every quote that&rsquo;s out, and who&rsquo;s chasing it. Quotes come in from ServiceTitan; the calls are logged here. Open means priced in the last 60 days and not yet sold or lost; values include GST, and a quote with several options counts at their average.</p>
      </div>

      {!pipe ? (
        <p className="pt-note pt-note--warn">ServiceTitan&rsquo;s quotes couldn&rsquo;t be read just now. Try again in a minute.</p>
      ) : (
        <>
          <p className="pt-pipe__line" role="status">
            <span><strong>{open.length}</strong> out · {k0(open.reduce((n, q) => n + q.value, 0))}</span>
            <span className={due.length ? "is-due" : undefined}><strong>{due.length}</strong> to ring today</span>
            {month.length > 0 && <span><strong>{Math.round((wonMonth.length / month.length) * 100)}%</strong> of the last 30 days&rsquo; quotes sold</span>}
          </p>
          <PipelineBoard quotes={p.quotes} stale={p.stale} today={p.today} office={officeNames} me={user.name} canCustomer={can(user, "overhead")} />
        </>
      )}
    </PortalShell>
  );
}
