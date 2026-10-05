import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs } from "@/components/portal/Figs";
import { dbConfigured } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { customerJobs } from "@/lib/portal/office";
import { money } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer — Team portal" };

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", year: "numeric" }) : "—";

type Event = { at: string; kind: string; what: string; amount?: number | null };

/**
 * One customer, lead to paid: every lead, call, job, quote and invoice
 * ServiceTitan has for them, in the order they happened.
 *
 * Quotes are grouped per job, as everywhere else: three options on one job is
 * one quote, shown at the range of what was offered.
 */
export default async function CustomerPage({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Customers" forWhom="managers" />;
  if (!/^\d+$/.test(params.id) || !dbConfigured()) notFound();
  const id = Number(params.id);

  const [jobs, ests, invs, leads, calls] = await Promise.all([
    customerJobs(id).catch(() => []),
    sbSelect<{ id: number; job_id: number | null; status: string | null; total: number | null; created_on: string | null; sold_on: string | null }>(
      "st_estimates", [q.select("id,job_id,status,total:total_inc,created_on,sold_on"), q.eq("customer_id", String(id))].join("&"),
    ).catch(() => []),
    sbSelect<{ id: number; invoice_number: string | null; invoice_date: string | null; total: number | null; job_type: string | null }>(
      "st_invoices", [q.select("id,invoice_number,invoice_date,total,job_type"), q.eq("customer_id", String(id))].join("&"),
    ).catch(() => []),
    sbSelect<{ id: number; campaign: string | null; created_on: string | null }>(
      "st_leads", [q.select("id,campaign,created_on"), q.eq("customer_id", String(id))].join("&"),
    ).catch(() => []),
    sbSelect<{ id: number; direction: string | null; campaign: string | null; received_on: string | null }>(
      "st_calls", [q.select("id,direction,campaign,received_on"), q.eq("customer_id", String(id))].join("&"),
    ).catch(() => []),
  ]);
  if (!jobs.length && !ests.length && !invs.length && !leads.length) notFound();

  const where = jobs.find((j) => j.suburb)?.suburb ?? null;
  const spend = invs.reduce((n, i) => n + Number(i.total ?? 0), 0);

  // Options grouped into the job they were written for.
  const byJob = new Map<string, { at: string; lo: number; hi: number; n: number; sold: string | null; status: string | null }>();
  for (const e of ests) {
    const key = e.job_id != null ? `j${e.job_id}` : `c${(e.created_on ?? "").slice(0, 10)}`;
    const v = Number(e.total ?? 0);
    const got = byJob.get(key);
    if (got) {
      got.lo = Math.min(got.lo, v); got.hi = Math.max(got.hi, v); got.n += 1;
      got.sold = got.sold ?? e.sold_on; if (e.created_on && e.created_on < got.at) got.at = e.created_on;
    } else {
      byJob.set(key, { at: e.created_on ?? "", lo: v, hi: v, n: 1, sold: e.sold_on, status: e.status });
    }
  }
  const range = (lo: number, hi: number) => (lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`);

  const events: Event[] = [
    ...leads.filter((l) => l.created_on).map((l) => ({ at: l.created_on!, kind: "Lead", what: l.campaign ? `Came in through ${l.campaign}` : "Lead entered in ServiceTitan" })),
    ...calls.filter((c) => c.received_on).map((c) => ({ at: c.received_on!, kind: "Call", what: `${c.direction ?? "Call"}${c.campaign ? ` · ${c.campaign}` : ""}` })),
    ...jobs.filter((j) => j.created_on).map((j) => ({ at: j.created_on!, kind: "Job booked", what: `${j.job_type || "Job"} · job ${j.job_number ?? j.id}${j.campaign ? ` · ${j.campaign}` : ""}` })),
    ...[...byJob.values()].filter((g) => g.at).map((g) => ({ at: g.at, kind: "Quoted", what: `${g.n} ${g.n === 1 ? "option" : "options"} at ${range(g.lo, g.hi)}${g.sold ? "" : g.status === "Dismissed" ? " · dismissed" : " · still open"}` })),
    ...[...byJob.values()].filter((g) => g.sold).map((g) => ({ at: g.sold!, kind: "Sold", what: "Quote accepted" })),
    ...jobs.filter((j) => j.completed_on).map((j) => ({ at: j.completed_on!, kind: "Job done", what: `${j.job_type || "Job"} · job ${j.job_number ?? j.id}` })),
    ...invs.filter((i) => i.invoice_date).map((i) => ({ at: `${i.invoice_date}T12:00:00Z`, kind: "Invoiced", what: `Invoice ${i.invoice_number ?? i.id}${i.job_type ? ` · ${i.job_type}` : ""}`, amount: Number(i.total ?? 0) })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/customers" label="Customers" />
      <div className="pt-head">
        <h1>Customer {id}</h1>
        <p>{where ? `${where} · ` : ""}everything ServiceTitan has on them, lead to paid. Their name and address are in ServiceTitan — the copy here holds the numbers only.</p>
      </div>

      <Figs
        cols={4}
        items={[
          { label: "Lifetime spend", feature: true, value: money(spend), sub: `${invs.length} ${invs.length === 1 ? "invoice" : "invoices"}` },
          { label: "Jobs", value: String(jobs.length), sub: `${jobs.filter((j) => j.completed_on).length} done` },
          { label: "Quotes", value: String(byJob.size), sub: `${[...byJob.values()].filter((g) => g.sold).length} accepted` },
          {
            label: "First seen",
            value: events[0] ? new Date(events[0].at).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" }) : "—",
            sub: events[0] ? `${new Date(events[0].at).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", year: "numeric" })} · ${events[0].kind.toLowerCase()}` : undefined,
          },
        ]}
      />

      <section className="pt-panel">
        <h2 className="pt-panel__h">Lead to paid</h2>
        <ol className="pt-tline">
          {events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="pt-tline__row">
              <span className="pt-tline__when">{day(e.at)}</span>
              <span className="pt-tline__kind">{e.kind}</span>
              <span className="pt-tline__what">{e.what}</span>
              <span className="pt-tline__amt">{e.amount != null ? money(e.amount) : ""}</span>
            </li>
          ))}
        </ol>
      </section>
    </PortalShell>
  );
}
