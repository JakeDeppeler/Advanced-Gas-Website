import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Card, Empty, Group, Head, Row } from "@/components/portal/kit/Kit";
import { WorkOrderForm } from "@/components/portal/ordering/WorkOrderForm";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { findJobs, jobForWork, listWorkOrders, loadWoContacts } from "@/lib/ordering/workOrders";
import { WorkOrderList } from "@/components/portal/ordering/WorkOrderList";
import { loadSuppliers } from "@/lib/ordering/db";
import { dayTimeLabel } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
// Sending emails the electrician and then writes the note, the PDF and the tags to ServiceTitan.
export const maxDuration = 60;
export const metadata = { title: "Work orders · Team portal" };

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)).replace(/^24/, "00");


/**
 * Orders & stock › Work orders: the electrician for any job. Search a job,
 * say what's needed, send it to GTE. The weekly plan still drafts the
 * installs' work orders on To order; this is for everything else — a
 * switchboard upgrade, a circuit for a job that wasn't quoted with one.
 */
export default async function WorkOrdersPage({ searchParams }: { searchParams: { q?: string; job?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Work orders" forWhom="managers" />;

  const q = (searchParams?.q ?? "").slice(0, 60);
  const jobId = Number(searchParams?.job);
  const [hits, job, list, suppliers, contacts] = await Promise.all([
    q ? findJobs(q).catch(() => null) : Promise.resolve([]),
    Number.isInteger(jobId) && jobId > 0 ? jobForWork(jobId).catch(() => null) : Promise.resolve(null),
    listWorkOrders().catch(() => null),
    loadSuppliers().catch(() => []),
    loadWoContacts().catch(() => []),
  ]);
  const sparky = suppliers.find((s) => s.method === "work_order" && s.active);
  const back = `/portal/supply/work-orders${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  const tomorrow = isoDateMelbourne(new Date(Date.now() + 86400000));

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head
          title="Work orders"
          sub="The electrician, water balancing or anyone else for any job: find it, say what's needed, send it. It's noted on the job in ServiceTitan with the work order attached. Click one below to see where it went."
        />

        {!job && (
          <Card title="Find the job" aside="by job number, customer or suburb">
            <form method="get" action="/portal/supply/work-orders" className="pk-btns" style={{ alignItems: "center" }} role="search">
              <input id="wo-q" name="q" defaultValue={q} className="pk-in wide" placeholder="e.g. 20257, Smith, Berwick" aria-label="Job number, customer or suburb" autoFocus />
              <button type="submit" className="pk-btn">Search</button>
            </form>
            {q && hits === null && <p className="pk-said bad" style={{ marginTop: 10 }}>The jobs couldn&rsquo;t be read just now. Try again in a moment.</p>}
            {q && hits && hits.length === 0 && <Empty>No job matches &ldquo;{q}&rdquo;. Jobs come from ServiceTitan every few minutes, so a brand-new one may not be here yet.</Empty>}
            {hits && hits.length > 0 && (
              <Group>
                {hits.map((h) => (
                  <Row
                    key={h.id}
                    href={`/portal/supply/work-orders?q=${encodeURIComponent(q)}&job=${h.id}`}
                    title={`Job ${h.job_number}${h.customer_name ? ` · ${h.customer_name}` : ""}`}
                    sub={[h.job_type, h.suburb, h.status, h.next_visit ? `next visit ${dayTimeLabel(h.next_visit)}` : null].filter(Boolean).join(" · ")}
                  />
                ))}
              </Group>
            )}
          </Card>
        )}

        {Number.isInteger(jobId) && jobId > 0 && !job && (
          <p className="pk-said bad">That job isn&rsquo;t in the synced ServiceTitan jobs. <a href={back}>Search again</a>.</p>
        )}

        {job && (
          sparky ? (
            <WorkOrderForm
              to={{ name: sparky.name.replace(/\s*\(.*\)\s*$/, "") || sparky.name, email: sparky.email }}
              back={back}
              contacts={contacts}
              job={{
                id: job.id, job_number: job.job_number, job_type: job.job_type,
                date: job.start_at ? isoDateMelbourne(new Date(job.start_at)) : tomorrow,
                time: job.start_at ? hhmm(job.start_at) : "",
                site: job.site_address, customer: job.customer_name ?? "", phone: job.phone ?? "", email: job.email ?? "",
                crew: job.crew.join(", "),
              }}
            />
          ) : (
            <p className="pk-said bad">There&rsquo;s no electrician set up to send work orders to, add one under Supplier emails.</p>
          )
        )}

        <div style={{ marginTop: 18 }}>
          <Card title="Work orders" aside="the last two months and coming up">
            {list === null ? (
              <p className="pk-said bad">The work orders couldn&rsquo;t be read just now.</p>
            ) : list.length === 0 ? (
              <Empty>No work orders yet.</Empty>
            ) : (
              <WorkOrderList list={list} />
            )}
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
