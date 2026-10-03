import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { OrdersBoard } from "@/components/portal/OrdersBoard";
import { orderTally, ORDER_STATUSES, type OrderStatus, type SupplyOrder } from "@/lib/pricebook/orders";
import { listOrders } from "@/lib/pricebook/ordersDb";
import { money } from "@/lib/portal/format";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders — Team portal" };

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
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Everything we&rsquo;ve ordered</h1>
        <p>Every cart sent through Reece maX — what&rsquo;s on it, where it&rsquo;s going and what it came to.</p>
        {dbReady && orders.length > 0 && (
          <div className="pt-head__figs">
            <div className="pt-head__fig">
              <div className="pt-head__figlbl">Orders</div>
              <div className="pt-head__figval">{tally.total}</div>
            </div>

            <div className="pt-head__fig">
              <div className="pt-head__figlbl">Value</div>
              <div className="pt-head__figval">{tally.value == null ? "—" : money(tally.value)}</div>
              <div className="pt-head__figsub">Ex GST, of the orders that carried a price</div>
            </div>
            <div className="pt-head__fig">
              <div className="pt-head__figlbl">In ServiceTitan</div>
              <div className="pt-head__figval">{tally.byStatus.ordered}</div>
              <div className="pt-head__figsub">Purchase order raised</div>
            </div>
            {tally.unresolvedLines > 0 && (
              <div className="pt-head__fig">
                <div className="pt-head__figlbl">Unmatched lines</div>
                <div className="pt-head__figval pt-head__figalt">{tally.unresolvedLines}</div>
                <div className="pt-head__figsub">Not in the pricebook yet</div>
              </div>
            )}
          </div>
        )}
      </div>

      <PortalTabs set="supply" />

      <OrdersBoard orders={orders} dbReady={dbReady} capped={orders.length >= CAP} initialStatus={initialStatus} />
    </PortalShell>
  );
}
