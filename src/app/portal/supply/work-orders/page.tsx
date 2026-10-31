import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Card, Empty, Good, Group, Head, Row, Say, Tabs } from "@/components/portal/kit/Kit";
import { Contractors, type ContractorRow } from "@/components/portal/ordering/Contractors";
import { WorkOrderForm } from "@/components/portal/ordering/WorkOrderForm";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { findJobs, jobForWork, listWorkOrders, loadSparkyAuto, loadWoContacts } from "@/lib/ordering/workOrders";
import { WorkOrderList } from "@/components/portal/ordering/WorkOrderList";
import { loadSuppliers } from "@/lib/ordering/db";
import { dayTimeLabel } from "@/lib/ordering/plan";
import { loadAutoLog, loadSwitches, NOTIFY_DEFAULT } from "@/lib/automation/log";

const at = (iso: string) => new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });

export const dynamic = "force-dynamic";
// Sending emails the electrician and then writes the note, the PDF and the tags to ServiceTitan.
export const maxDuration = 60;
export const metadata = { title: "Work orders · Team portal" };

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)).replace(/^24/, "00");


/**
 * To order › Work orders: every contractor's work order, the electrician's
 * and anyone else's. The list is the work: what hasn't gone, what's coming
 * up, what's done. Beside it, finding a job to send a new one (a switchboard
 * upgrade, water balancing, a circuit for a job that wasn't quoted with one)
 * and what went by itself. The weekly plan still drafts the installs' work
 * orders; they go by themselves once booked (To order › Automation).
 */
export default async function WorkOrdersPage({ searchParams }: { searchParams: { q?: string; job?: string; tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Work orders" forWhom="managers" />;

  const q = (searchParams?.q ?? "").slice(0, 60);
  const jobId = Number(searchParams?.job);
  const tab = searchParams?.tab === "contractors" ? "contractors" : "orders";
  const [hits, job, list, suppliers, contacts, autoLog, sw, sparkyAuto] = await Promise.all([
    q ? findJobs(q).catch(() => null) : Promise.resolve([]),
    Number.isInteger(jobId) && jobId > 0 ? jobForWork(jobId).catch(() => null) : Promise.resolve(null),
    listWorkOrders().catch(() => null),
    loadSuppliers().catch(() => []),
    loadWoContacts().catch(() => []),
    loadAutoLog().catch(() => []),
    loadSwitches().catch(() => null),
    loadSparkyAuto().catch(() => true),
  ]);
  // What went out by itself in the last fortnight: work orders sent once booked, and moved jobs passed on.
  const auto = autoLog.filter((e) => (e.kind === "workOrderSend" || e.kind === "orderMoves") && Date.now() - Date.parse(e.at) < 14 * 86_400_000).slice(0, 12);
  const sparky = suppliers.find((s) => s.method === "work_order" && s.active);
  const back = `/portal/supply/work-orders${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  const fortnight = (list ?? []).filter((w) => w.status === "sent" && w.sent_at && Date.now() - Date.parse(w.sent_at) < 14 * 86_400_000).length;
  const unsent = (list ?? []).filter((w) => w.status !== "sent");
  const failed = unsent.filter((w) => w.send_error).length;
  const sparkyTo = sparky ? { name: sparky.name.replace(/\s*\(.*\)\s*$/, "") || sparky.name, email: sparky.email } : null;
  const tomorrow = isoDateMelbourne(new Date(Date.now() + 86400000));

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head
          title="Work orders"
          sub="Every contractor's work order: open one to see where it went, or find a job to send a new one"
          info={[
            ["On the job", "Each one sent is noted on its job in ServiceTitan with the work order attached."],
            ["By itself", "A contractor set to Automatic gets theirs once the job's booked. Contractors says who's Automatic and who's By hand."],
          ]}
        />
        {list && (
          <Say>
            {fortnight} sent in the last two weeks
            {unsent.length ? <>, <Bad>{unsent.length} not sent yet{failed ? `, ${failed} of them didn't go` : ""}</Bad>.</> : <>. <Good>Nothing waiting.</Good></>}
          </Say>
        )}

        <div className="pk-btns" style={{ marginBottom: 14 }}>
          <Tabs on={tab} label="Work orders" items={[
            { key: "orders", label: "Work orders", href: "/portal/supply/work-orders" },
            { key: "contractors", label: "Contractors", href: "/portal/supply/work-orders?tab=contractors", count: contacts.length + (sparky ? 1 : 0) || undefined },
          ]} />
        </div>

        {tab === "contractors" ? (() => {
          // How many went to each in the last two months: the electrician's are the ones with no trade.
          const sent = (list ?? []).filter((w) => w.status === "sent");
          const tally = (pick: (w: (typeof sent)[number]) => boolean) => {
            const mine = sent.filter(pick);
            return { sent: mine.length, last: mine.map((w) => w.sent_at ?? "").sort().pop() || null };
          };
          const rows: ContractorRow[] = contacts.map((c) => ({ c, ...tally((w) => (w.sent_to ?? "").toLowerCase().includes(c.email.toLowerCase())) }));
          return (
            <Card title="Contractors" aside="who work orders go to">
              <Contractors
                sparky={sparky ? { name: sparky.name.replace(/\s*\(.*\)\s*$/, "") || sparky.name, email: sparky.email ?? "", auto: sparkyAuto, ...tally((w) => !w.details?.trade) } : null}
                rows={rows}
              />
            </Card>
          );
        })() : (
        <div className="nw-two">
          <div className="wo-main">
            {Number.isInteger(jobId) && jobId > 0 && !job && (
              <p className="pk-said bad">That job isn&rsquo;t in the synced ServiceTitan jobs. <a href={back}>Search again</a>.</p>
            )}
            {job && (
              sparkyTo ? (
                <WorkOrderForm
                  to={sparkyTo}
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
            <section className="pt-panel nw-check" aria-label="Work orders">
              {list === null ? (
                <p className="pk-said bad">The work orders couldn&rsquo;t be read just now.</p>
              ) : list.length === 0 ? (
                <Empty>No work orders yet.</Empty>
              ) : (
                <WorkOrderList list={list} contacts={contacts} sparky={sparkyTo} />
              )}
            </section>
          </div>

          <aside className="nw-side" aria-label="Send a new one, and what went by itself">
            {!job && (
              <Card title="Send a new one" aside="find the job">
                <form method="get" action="/portal/supply/work-orders" className="wo-findjob" role="search">
                  <input id="wo-q" name="q" defaultValue={q} className="pk-in" placeholder="Job number, customer or suburb" aria-label="Job number, customer or suburb" />
                  <button type="submit" className="pk-btn">Find</button>
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
            <Card title="Sent by itself" aside="last two weeks">
              {auto.length ? (
                <ul className="wo-auto wo-auto--side">
                  {auto.map((e, i) => (
                    <li key={`${e.at}-${i}`} className={e.ok ? undefined : "bad"}>
                      <span className="wo-auto__k">{e.ok ? (e.kind === "orderMoves" ? "✓ Move passed on" : "✓ Work order sent") : "! Didn't go"} · {at(e.at)}</span>
                      <span className="wo-auto__t"><b>{e.title}</b>{e.detail && <span>{e.detail}</span>}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Nothing in the last two weeks. Each one that goes by itself shows here, and {sw?.notifyTo ?? NOTIFY_DEFAULT} is emailed to say it went.</Empty>
              )}
            </Card>
          </aside>
        </div>
        )}
      </div>
    </PortalShell>
  );
}
