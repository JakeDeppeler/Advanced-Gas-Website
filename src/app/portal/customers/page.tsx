import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { dbConfigured } from "@/lib/portal/db";
import { q, sbSelect } from "@/lib/dashboard/db";
import { money } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "One customer — Team portal" };

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Find a customer by a number somebody has in front of them — a job number,
 * an invoice number, or ServiceTitan's customer number — and open everything
 * on them, lead to paid.
 *
 * Not by name: the sync copies ServiceTitan's jobs without the customer's
 * name or address, and a page that searched names would be searching nothing.
 */
export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Customers" forWhom="managers" />;

  const term = (searchParams?.q ?? "").trim().replace(/^#/, "");
  const ready = dbConfigured();
  let miss = false;

  if (term && ready) {
    if (/^\d+$/.test(term)) {
      const [byJob, byInv, byCust] = await Promise.all([
        sbSelect<{ customer_id: number | null }>("st_jobs", [q.select("customer_id"), q.eq("job_number", term), "limit=1"].join("&")).catch(() => []),
        sbSelect<{ customer_id: number | null }>("st_invoices", [q.select("customer_id"), q.eq("invoice_number", term), "limit=1"].join("&")).catch(() => []),
        sbSelect<{ customer_id: number | null }>("st_jobs", [q.select("customer_id"), q.eq("customer_id", term), "limit=1"].join("&")).catch(() => []),
      ]);
      const hit = byJob[0]?.customer_id ?? byInv[0]?.customer_id ?? byCust[0]?.customer_id ?? null;
      if (hit != null) redirect(`/portal/customers/${hit}`);
    }
    miss = true;
  }

  const recent = ready
    ? await sbSelect<{ id: number; job_number: string | null; job_type: string | null; suburb: string | null; status: string | null; total: number | null; created_on: string | null; customer_id: number | null }>(
      "st_jobs",
      [q.select("id,job_number,job_type,suburb,status,total,created_on,customer_id"), q.order("created_on", "desc", "last"), "limit=25"].join("&"),
    ).catch(() => [])
    : [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>One customer</h1>
        <p>A job from lead to paid: the call, the quote, the work and the invoice, in the order they happened.</p>
      </div>

      <form method="get" className="pt-sbox pt-sbox--lg" role="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        <input type="search" name="q" defaultValue={term} inputMode="numeric" placeholder="Job number, invoice number or customer number" aria-label="Find a customer" autoComplete="off" />
      </form>
      {miss && <div className="pt-note">Nothing in ServiceTitan matches <strong>{term}</strong>. Job, invoice and customer numbers work; names don&rsquo;t, because the sync doesn&rsquo;t copy them.</div>}

      <section className="pt-panel">
        <h2 className="pt-panel__h">Latest jobs</h2>
        {recent.length === 0 ? (
          <p className="pt-rep__empty">No jobs in the copy of ServiceTitan yet.</p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>Job</th><th>Where</th><th>Status</th><th>Booked</th><th className="pt-otab__num">Total</th></tr></thead>
              <tbody>
                {recent.map((j) => (
                  <tr key={j.id}>
                    <td>
                      {j.customer_id != null
                        ? <Link href={`/portal/customers/${j.customer_id}`}><strong>{j.job_type || "Job"}</strong></Link>
                        : <strong>{j.job_type || "Job"}</strong>}
                      <span className="pt-fleet__sub">Job {j.job_number ?? j.id}</span>
                    </td>
                    <td>{j.suburb || "—"}</td>
                    <td>{j.status || "—"}</td>
                    <td>{day(j.created_on)}</td>
                    <td className="pt-otab__num">{j.total ? money(Number(j.total)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
