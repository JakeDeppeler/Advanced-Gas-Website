import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { OrdersBoard } from "@/components/portal/OrdersBoard";
import { orderTally, ORDER_STATUSES, type OrderStatus, type SupplyOrder } from "@/lib/pricebook/orders";
import { listOrders } from "@/lib/pricebook/ordersDb";
import { money } from "@/lib/portal/format";
import { Locked } from "@/components/portal/Locked";
import { Grid, Head, Tile } from "@/components/portal/kit/Kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders · Team portal" };

const CAP = 500;

export default async function SupplyOrdersPage({ searchParams }: { searchParams: { s?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  // A failed read is not an empty list. `dbReady` carries the difference
  // through to the board, which says "can't tell" rather than "none".
  let orders: SupplyOrder[] = [];
  let dbReady = true;
  try {
    orders = await listOrders(CAP);
  } catch {
    dbReady = false;
  }
  const tally = orderTally(orders);
  const asked = searchParams?.s ?? "";
  const initialStatus: OrderStatus | "all" = (ORDER_STATUSES as string[]).includes(asked) ? (asked as OrderStatus) : "all";

  return (
    <PortalShell user={user}>
      <a href="/portal/supply" className="pt-back pt-up">‹ Suppliers</a>
      <div className="pk" style={{ marginBottom: 14 }}>
        <Head title="Everything we’ve ordered" sub="Every cart sent through Reece maX, what’s on it, where it’s going and what it came to" />
        {dbReady && orders.length > 0 && (
          <Grid cols={tally.unresolvedLines > 0 ? 4 : 3}>
            <Tile label="Orders" st={{ k: "none", w: "" }} fig={String(tally.total)} frac={null} />
            <Tile label="Value" st={{ k: "none", w: "" }} fig={tally.value == null ? "" : money(tally.value)} frac={null} sub="ex GST, of the orders that carried a price" />
            <Tile label="In ServiceTitan" st={tally.byStatus.ordered === tally.total ? { k: "good", w: "All raised" } : { k: "mid", w: `${tally.total - tally.byStatus.ordered} to raise` }} fig={String(tally.byStatus.ordered)} frac={tally.total ? tally.byStatus.ordered / tally.total : null} sub="purchase order raised" />
            {tally.unresolvedLines > 0 && <Tile label="Unmatched lines" st={{ k: "bad", w: "Match them" }} fig={String(tally.unresolvedLines)} frac={null} sub="not in the pricebook yet" />}
          </Grid>
        )}
      </div>

      <OrdersBoard orders={orders} dbReady={dbReady} capped={orders.length >= CAP} initialStatus={initialStatus} />
    </PortalShell>
  );
}
