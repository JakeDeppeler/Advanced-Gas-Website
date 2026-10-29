import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Head, Say } from "@/components/portal/kit/Kit";
import { SentBoard } from "@/components/portal/SentBoard";
import { listSentOrders, loadSuppliers, type PoWithLines } from "@/lib/ordering/db";
import { linesTotal, type Supplier } from "@/lib/ordering/plan";
import { money } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sent orders · Team portal" };

/**
 * To order › Sent: every supplier order that's gone, a week at a time, searchable by job, customer, item or PO.
 * Work orders have their own tab, with the contractor's others.
 */
export default async function SentPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;
  let orders: PoWithLines[] = [];
  let suppliers: Supplier[] = [];
  let ready = true;
  try {
    [orders, suppliers] = await Promise.all([listSentOrders(), loadSuppliers()]);
  } catch {
    ready = false;
  }
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  // Supplier orders only: a work order is the contractor's, on Work orders.
  orders = orders.filter((o) => o.kind === "order");
  const month = orders.filter((o) => (o.sent_at ?? o.approved_at ?? "") >= monthAgo);
  const value = month.filter((o) => o.kind === "order").reduce((t, o) => t + linesTotal(o.lines), 0);
  const names = new Map(suppliers.map((s) => [s.id, s.name]));
  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Sent" sub="Every order that's gone to a supplier, newest first. Work orders are on Work orders." />
        {ready && (
          <Say>
            {month.length} {month.length === 1 ? "order" : "orders"} sent in the last 30 days, {value ? money(value) : "$0"} of gear ex GST
            from {new Set(month.map((o) => o.supplier_id)).size} {new Set(month.map((o) => o.supplier_id)).size === 1 ? "supplier" : "suppliers"}.
          </Say>
        )}
      </div>
      {!ready ? (
        <div className="pt-note pt-note--warn"><strong>The orders couldn&rsquo;t be read just now.</strong> Try again in a minute.</div>
      ) : (
        <SentBoard orders={orders.map((o) => ({
          id: o.id, po: o.po_number, supplier: names.get(o.supplier_id) ?? o.supplier_id, kind: o.kind, week: o.week_of,
          sentAt: o.sent_at ?? o.approved_at, sentTo: o.sent_to, by: o.approved_by, pickup: o.pickup,
          delivery: { address: o.delivery_address ?? "", toSite: o.delivery_to_site, instructions: o.delivery_instructions ?? "", deliverBy: o.deliver_by ?? "", note: o.supplier_note ?? "" },
          total: linesTotal(o.lines),
          lines: o.lines.map((l) => ({ id: l.id, qty: l.qty, item: l.supplier_model ?? l.sku_name ?? "", desc: l.description, job: l.job_number, customer: l.customer_name, cost: l.unit_cost == null ? null : l.unit_cost * l.qty, ahead: l.job_id == null && l.estimate_id != null })),
        }))} />
      )}
    </PortalShell>
  );
}
