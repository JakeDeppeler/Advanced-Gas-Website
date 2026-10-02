"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/portal/format";
import { ORDER_STATUSES, orderRef, STATUS_BLURB, STATUS_LABEL, type OrderStatus, type SupplyOrder } from "@/lib/pricebook/orders";

/**
 * Every order sent to Reece, with a box to find one in.
 *
 * Filtering happens here rather than on the server because the search has to
 * reach inside the line items: people look for "the one with the 20mm copper
 * on it" far more often than they remember a cart reference. That needs the
 * lines in hand, and they are already loaded for the counts.
 */

const MEL = "Australia/Melbourne";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: MEL, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** A dash, not a zero: the cart genuinely carried no price. */
const amount = (v: number | null) => (v == null ? "—" : money(v));

export function OrdersBoard({
  orders,
  dbReady,
  capped,
  initialStatus = "all",
}: {
  orders: SupplyOrder[];
  /** False when Supabase is unreachable. An empty list then means "we can't
   *  tell", which is a different sentence from "nothing has been ordered". */
  dbReady: boolean;
  /** True when the query hit its row cap, so the table is a prefix. */
  capped: boolean;
  /** Lets the overview deep-link straight to the orders that need a look. */
  initialStatus?: OrderStatus | "all";
}) {
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">(initialStatus);

  const tally = useMemo(() => {
    const by: Record<OrderStatus, number> = { received: 0, resolved: 0, ordered: 0, error: 0 };
    for (const o of orders) by[o.status]++;
    return by;
  }, [orders]);

  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!t) return true;
      const hay = [
        orderRef(o),
        o.location,
        o.jobName,
        o.orderNumber,
        o.orderedBy,
        o.cartToken,
        o.id,
        o.reeceOrderId == null ? null : String(o.reeceOrderId),
        o.stPurchaseOrderId == null ? null : `po ${o.stPurchaseOrderId}`,
        ...o.lines.flatMap((l) => [String(l.productId), l.description, l.materialCode]),
      ];
      return hay.some((h) => h && h.toLowerCase().includes(t));
    });
  }, [orders, term, status]);

  const shownValue = shown.reduce<number | null>((a, o) => (o.amount == null ? a : (a ?? 0) + o.amount), null);

  if (!dbReady) {
    return (
      <section className="pt-panel">
        <h2 className="pt-panel__h">Orders</h2>
        <p className="pt-panel__sub">
          The database isn&rsquo;t reachable from here, so this page can&rsquo;t say whether anything has been ordered.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="pt-sup__filters">
        <label className="pt-field pt-sup__search">
          <span>
            Find an order <em>order number, branch, job, product or description</em>
          </span>
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="20mm copper, Dandenong, Reece #1042…"
            autoComplete="off"
          />
        </label>
        <div className="pt-sup__stat" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={`pt-sup__statbtn${status === "all" ? " is-on" : ""}`}
            aria-pressed={status === "all"}
            onClick={() => setStatus("all")}
          >
            All <span>{orders.length}</span>
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`pt-sup__statbtn pt-sup__statbtn--${s}${status === s ? " is-on" : ""}`}
              aria-pressed={status === s}
              title={STATUS_BLURB[s]}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]} <span>{tally[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="pt-panel">
        <div className="pt-sup__tablehead">
          <h2 className="pt-panel__h">
            {shown.length === orders.length ? "Every order" : `${shown.length} of ${orders.length} orders`}
          </h2>
          <p className="pt-sup__tot">
            {shownValue == null ? "No prices on these" : `${money(shownValue)} ex GST`}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="pt-sup__empty">
            <p>
              <strong>No orders yet.</strong> Carts land here the moment maX PunchOut starts posting them back.
            </p>
            <p>
              That needs Reece to issue the integration credentials and the PunchOut return URL to be registered
              against this site — the two steps in <code>PRICEBOOK.md</code> §5 and §7. Until then there is genuinely
              nothing to show, which is why this page is empty rather than showing a zero.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="pt-sup__none">Nothing matches “{term}”{status !== "all" ? ` in ${STATUS_LABEL[status].toLowerCase()}` : ""}.</p>
        ) : (
          <div className="pt-tgt__tablewrap">
            <table className="pt-tgt__table pt-sup__table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Going to</th>
                  <th>Lines</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o.id}>
                    <th scope="row">
                      <strong>{orderRef(o)}</strong>
                      <span>
                        {when(o.receivedAt)}
                        {o.orderedBy ? ` · ${o.orderedBy}` : ""}
                        {o.jobName ? ` · ${o.jobName}` : ""}
                      </span>
                    </th>
                    <td className="pt-sup__place">{o.location ?? <em>Not ordered yet</em>}</td>
                    <td>
                      {o.lines.length}
                      {o.matched && o.unresolved > 0 && <em className="pt-sup__warn"> · {o.unresolved} unmatched</em>}
                    </td>
                    <td>{amount(o.amount)}</td>
                    <td>
                      <span className={`pt-sup__badge pt-sup__badge--${o.status}`}>{STATUS_LABEL[o.status]}</span>
                    </td>
                    <td>
                      <Link className="pt-sup__open" href={`/portal/supply/orders/${o.id}`}>
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {capped && (
          <p className="pt-sup__capnote">
            Showing the most recent {orders.length}. Older orders exist and aren&rsquo;t searched here.
          </p>
        )}
      </section>
    </>
  );
}
