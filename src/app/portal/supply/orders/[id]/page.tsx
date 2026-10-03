import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { orderRef, STATUS_BLURB, STATUS_LABEL } from "@/lib/pricebook/orders";
import { getOrder } from "@/lib/pricebook/ordersDb";
import { money, money2 } from "@/lib/portal/format";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order — Team portal" };

const MEL = "Australia/Melbourne";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", {
    timeZone: MEL,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function SupplyOrderPage({ params }: { params: { id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  const order = await getOrder(params.id).catch(() => null);
  if (!order) notFound();

  const priced = order.lines.filter((l) => l.lineTotalExGst != null);
  const linesTotal = priced.reduce((a, l) => a + (l.lineTotalExGst ?? 0), 0);
  const units = order.lines.reduce((a, l) => a + l.quantity, 0);

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/supply/orders" label="Orders" />
      <div className="pt-head">
        <div className="pt-head__eyebrow">Order</div>
        <h1>{orderRef(order)}</h1>
        <p>
          {when(order.receivedAt)}
          {order.orderedBy ? ` · ordered by ${order.orderedBy}` : ""}
          {order.jobName ? ` · for ${order.jobName}` : ""}
        </p>
        <div className="pt-head__figs">
          <div className="pt-head__fig">
            <div className="pt-head__figlbl">Status</div>
            <div className="pt-head__figval">
              <span className={`pt-sup__badge pt-sup__badge--${order.status}`}>{STATUS_LABEL[order.status]}</span>
            </div>
            <div className="pt-head__figsub">{STATUS_BLURB[order.status]}</div>
          </div>
          <div className="pt-head__fig">
            <div className="pt-head__figlbl">Going to</div>
            <div className="pt-head__figval pt-sup__figtxt">{order.location ?? "—"}</div>
            {!order.location && <div className="pt-head__figsub">Not placed with Reece yet, so no branch</div>}
          </div>
          <div className="pt-head__fig">
            <div className="pt-head__figlbl">Amount</div>
            <div className="pt-head__figval">{order.amount == null ? "—" : money(order.amount)}</div>
            <div className="pt-head__figsub">
              {order.amount == null ? "No line on this order carried a price" : "Ex GST, added up from the lines"}
            </div>
          </div>
          <div className="pt-head__fig">
            <div className="pt-head__figlbl">On the order</div>
            <div className="pt-head__figval">{order.lines.length}</div>
            <div className="pt-head__figsub">
              {order.lines.length === 1 ? "line" : "lines"} · {units.toLocaleString("en-AU")} units
            </div>
          </div>
        </div>
      </div>

      {order.error && (
        <div className="pt-note">
          <strong>This order needs a look.</strong> {order.error}
        </div>
      )}

      {order.matched && order.unresolved > 0 && (
        <div className="pt-note">
          {/* The entity has to be a literal character here, not `&rsquo;`:
              inside a JS string it is text, not markup, and renders raw. */}
          <strong>
            {order.unresolved} {order.unresolved === 1 ? "line isn’t" : "lines aren’t"} in the ServiceTitan pricebook.
          </strong>{" "}
          They&rsquo;re marked below. Either the code is new to us, or the material exists but isn&rsquo;t linked to
          the Reece vendor yet — a pricebook sync with <em>create missing</em> on will add the first kind.
        </div>
      )}

      <section className="pt-panel">
        <h2 className="pt-panel__h">What&rsquo;s on it</h2>
        <p className="pt-panel__sub">
          Prices are ex GST, the way Reece sends them and the way the pricebook stores them. ServiceTitan adds tax at
          the invoice line.
        </p>
        <div className="pt-tgt__tablewrap">
          <table className="pt-tgt__table pt-sup__lines">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Each</th>
                <th>Line</th>
                <th>In the pricebook</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={`${l.productId}-${i}`} className={order.matched && l.materialId == null ? "is-key" : undefined}>
                  <th scope="row">
                    <strong>{l.productId || "No product id"}</strong>
                    <span>{l.description ?? "No description sent"}</span>
                  </th>
                  <td>
                    {l.quantity.toLocaleString("en-AU")}
                    {l.unitOfMeasure ? <em className="pt-sup__uom"> {l.unitOfMeasure}</em> : null}
                  </td>
                  <td>{l.unitPriceExGst == null ? "—" : money2(l.unitPriceExGst)}</td>
                  <td>{l.lineTotalExGst == null ? "—" : money2(l.lineTotalExGst)}</td>
                  <td className="pt-sup__matched">
                    {l.materialId != null ? (
                      <span title={`ServiceTitan material ${l.materialId}`}>{l.materialCode ?? `#${l.materialId}`}</span>
                    ) : order.matched ? (
                      <em className="pt-sup__warn">Not found</em>
                    ) : (
                      <em>Not looked up yet</em>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {priced.length > 0 && (
              <tfoot>
                <tr>
                  <th scope="row">
                    <strong>Lines total</strong>
                    <span>
                      {priced.length === order.lines.length
                        ? "Every line priced"
                        : `${priced.length} of ${order.lines.length} lines carried a price`}
                    </span>
                  </th>
                  <td />
                  <td />
                  <td>{money2(linesTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {(order.reeceOrderId != null || order.stPurchaseOrderId != null || order.stJobId != null) && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">References</h2>
          <dl className="pt-sup__dl">
            {order.reeceOrderId != null && (
              <>
                <dt>Reece order</dt>
                <dd>#{order.reeceOrderId}</dd>
              </>
            )}
            {order.stPurchaseOrderId != null && (
              <>
                <dt>Purchase order</dt>
                <dd>#{order.stPurchaseOrderId}</dd>
              </>
            )}
            {order.stJobId != null && (
              <>
                <dt>Job</dt>
                <dd>#{order.stJobId}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {/* Last, collapsed, and worth keeping: until Reece's PunchOut docs are in
          hand this is the only way to see which field names a real cart used,
          and it is what the normaliser gets tightened against. */}
      <details className="pt-panel pt-sup__raw">
        <summary>Exactly what Reece sent</summary>
        <pre>{JSON.stringify(order.raw, null, 2)}</pre>
      </details>
    </PortalShell>
  );
}
