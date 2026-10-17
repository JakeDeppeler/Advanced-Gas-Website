import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { PipelineBoard } from "@/components/portal/PipelineBoard";
import { dbConfigured, listUsers } from "@/lib/portal/db";
import { officeIds } from "@/lib/todos/store";
import { loadPipeline, type Pipeline } from "@/lib/pipeline/store";
import { daysBetween, isSold } from "@/lib/pipeline/types";
import { KpiHead } from "@/components/portal/kit/Kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quote pipeline · Team portal" };

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const k1 = (n: number) => (n >= 10_000 ? `$${(n / 1000).toFixed(1)}K` : m0(n));

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
  const wonMonth = month.filter((q) => isSold(q.stage));
  const rate = month.length >= 10 ? wonMonth.length / month.length : null;
  const openValue = open.reduce((n, q) => n + q.value, 0);
  const dueValue = due.reduce((n, q) => n + q.value, 0);
  const late = due.some((q) => q.nextOn && q.nextOn < p.today);

  return (
    <PortalShell user={user}>
      {!pipe ? (
        <>
          <KpiHead title={<>Quote<br />pipeline</>} kpis={[]} />
          <p className="pt-note pt-note--warn">ServiceTitan&rsquo;s quotes couldn&rsquo;t be read just now. Try again in a minute.</p>
        </>
      ) : (
        <>
          <KpiHead title={<>Quote<br />pipeline</>} kpis={[
            { icon: "trophy", fig: m0(openValue), label: `Open · ${open.length} quotes out` },
            ...(rate != null ? [{ icon: "trend", fig: m0(openValue * rate), label: `Likely to sell, at the ${Math.round(rate * 100)}% we sell` }] : []),
            { icon: "phone", fig: String(due.length), label: "To ring today", badge: due.length ? k1(dueValue) : undefined, tone: (late ? "down" : "gold") as "down" | "gold" },
          ]} />
          <PipelineBoard quotes={p.quotes} stale={p.stale} today={p.today} office={officeNames} me={user.name} canCustomer={can(user, "overhead")} />
          <p className="pk-note qp-foot">Open means priced in the last 60 days and not yet sold or lost. Values include GST, and a quote with several options counts at their average. Quotes come in from ServiceTitan; the calls are logged here.</p>
        </>
      )}
    </PortalShell>
  );
}
