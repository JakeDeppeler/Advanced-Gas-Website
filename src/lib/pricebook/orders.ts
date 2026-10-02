/**
 * Orders sent to Reece, as something the office can read.
 *
 * Every field below comes from Reece's documented PunchOut and order-gateway
 * payloads — `CartLine` in `reece.ts` is the cart shape, and `reece_order` is
 * what the order gateway returned when the cart was placed. Nothing here
 * guesses at field names.
 *
 * Nothing here touches the network or the database either. The reads live in
 * `ordersDb.ts`; this half is imported by the client component that draws the
 * table, and a `server-only` module in that import graph fails the build.
 */

import type { CartLine } from "@/lib/pricebook/reece";

/**
 * `received` → the cart is stored but its lines are not matched yet.
 * `resolved` → every line has been looked up against the pricebook.
 * `ordered`  → the cart was placed with Reece and has an order number.
 * `error`    → something failed; `error` says what.
 */
export type OrderStatus = "received" | "resolved" | "ordered" | "error";

export const ORDER_STATUSES: OrderStatus[] = ["received", "resolved", "ordered", "error"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Received",
  resolved: "Matched",
  ordered: "Ordered",
  error: "Needs a look",
};

/** What each status means, written for someone who did not build this. */
export const STATUS_BLURB: Record<OrderStatus, string> = {
  received: "The cart came back from maX. Its lines haven't been matched to the pricebook yet.",
  resolved: "Every line has been looked up in the ServiceTitan pricebook. Not ordered yet.",
  ordered: "Placed with Reece. The order number is on the order.",
  error: "Something went wrong with this cart. The reason is on the order.",
};

export type OrderLine = {
  productId: number;
  description: string | null;
  quantity: number;
  unitOfMeasure: string | null;
  /** Ex GST, as Reece prices it. */
  unitPriceExGst: number | null;
  /** quantity × unit price. Null when the line carried no price. */
  lineTotalExGst: number | null;
  /** The ServiceTitan material this product matched, once resolved. */
  materialId: number | null;
  materialCode: string | null;
};

export type SupplyOrder = {
  id: string;
  receivedAt: string;
  status: OrderStatus;
  /** Reece's cart token — the reference until the order is placed. */
  cartToken: string | null;
  /** Reece's order number, once placed. The reference everyone will quote. */
  reeceOrderId: number | null;
  /** Where it is going: the pickup branch, named when we can resolve it. */
  location: string | null;
  /** The job it was bought for, where the order carried one. */
  jobName: string | null;
  /** Our own order number on the Reece order, if one was given. */
  orderNumber: string | null;
  /** Who put their name on the order. */
  orderedBy: string | null;
  /** Ex GST, added up from the lines. Null when nothing carried a price. */
  amount: number | null;
  lines: OrderLine[];
  /**
   * Whether the lines have been looked up against the pricebook at all.
   * A cart that errored before resolution ran has no verdict on its lines —
   * reporting those as "not in the pricebook" blames the wrong thing, and
   * sends somebody looking for a material that may well be there.
   */
  matched: boolean;
  /** Lines the lookup ran on and found nothing for. Zero until it has run. */
  unresolved: number;
  stPurchaseOrderId: number | null;
  stJobId: number | null;
  error: string | null;
  /** The cart and the order exactly as Reece sent them. */
  raw: { cart: unknown; order: unknown };
};

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};
const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export type CartRow = {
  id: string;
  received_at: string;
  status: string;
  cart: Raw | null;
  resolved_lines: Array<CartLine & { materialId?: number | null; materialCode?: string | null }> | null;
  cart_token: string | null;
  reece_order_id: number | null;
  reece_order: Raw | null;
  st_purchase_order_id: number | null;
  st_job_id: number | null;
  error: string | null;
};

function isStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(v);
}

/**
 * The cart's products, straight off the stored payload.
 *
 * Only reached for a cart that errored before `resolved_lines` was written —
 * the resolved list is the same shape plus the material ids, so it wins
 * whenever it exists.
 */
function rawProducts(cart: Raw | null): CartLine[] {
  const list = Array.isArray(cart?.products) ? (cart!.products as Raw[]) : [];
  return list.map((p) => ({
    productId: num(p.productId) ?? 0,
    description: str(p.productDescription ?? p.productTitle ?? p.description),
    quantity: num(p.quantity) ?? 1,
    unitOfMeasure: str(p.unitOfMeasure),
    unitPriceExcludingGst: num(p.unitPriceExcludingGst),
    unitPriceIncludingGst: num(p.unitPriceIncludingGst),
    gstRate: num(p.gstRate),
    quoteNumber: num(p.quoteNumber),
    quoteLineNumber: num(p.quoteLineNumber),
  }));
}

/**
 * One stored cart as an order.
 *
 * Pure, so the shape can be checked against a real payload without a database
 * or a browser. `branchNames` maps a Reece branch number to its name; without
 * it the branch number is shown, which is still an answer to "where is this
 * going" — just a worse one.
 */
export function normaliseOrder(row: CartRow, branchNames: Record<string, string> = {}): SupplyOrder {
  const order = row.reece_order ?? null;
  const resolved = Array.isArray(row.resolved_lines) ? row.resolved_lines : null;
  const source = resolved ?? rawProducts(row.cart);

  const lines: OrderLine[] = source.map((l) => {
    const unit = num(l.unitPriceExcludingGst);
    const qty = num(l.quantity) ?? 1;
    return {
      productId: num(l.productId) ?? 0,
      description: str(l.description),
      quantity: qty,
      unitOfMeasure: str(l.unitOfMeasure),
      unitPriceExGst: unit,
      lineTotalExGst: unit == null ? null : unit * qty,
      materialId: num((l as Raw).materialId),
      materialCode: str((l as Raw).materialCode),
    };
  });

  const amount = lines.reduce<number | null>(
    (a, l) => (l.lineTotalExGst == null ? a : (a ?? 0) + l.lineTotalExGst),
    null,
  );

  // The order gateway echoes the request back. Fulfilment is PICKUP, so the
  // place is the branch it gets collected from.
  const fulfil = (order?.fulfillment ?? null) as Raw | null;
  const branch = str(fulfil?.pickupBranch);
  const location = branch ? (branchNames[branch] ?? `Branch ${branch}`) : null;

  const stored = isStatus(row.status) ? row.status : "received";

  return {
    id: row.id,
    receivedAt: row.received_at,
    // A cart with a Reece order number against it is ordered, whatever the
    // column says — the order number is the fact, and the column only records
    // a step that may have been interrupted.
    status: row.reece_order_id != null ? "ordered" : stored,
    cartToken: str(row.cart_token),
    reeceOrderId: row.reece_order_id ?? null,
    location,
    jobName: str(order?.jobName),
    orderNumber: str(order?.orderNumber),
    orderedBy: str(order?.orderByName),
    amount,
    lines,
    matched: resolved !== null,
    unresolved: resolved ? lines.filter((l) => l.materialId == null).length : 0,
    stPurchaseOrderId: row.st_purchase_order_id ?? null,
    stJobId: row.st_job_id ?? null,
    error: str(row.error),
    raw: { cart: row.cart, order },
  };
}

/** What to call an order on screen, in descending order of usefulness. */
export function orderRef(o: SupplyOrder): string {
  if (o.reeceOrderId != null) return `Reece #${o.reeceOrderId}`;
  if (o.orderNumber) return o.orderNumber;
  if (o.cartToken) return `Cart ${o.cartToken.slice(0, 10)}`;
  return "Cart with no reference";
}

/** Totals for the strip above the table. */
export function orderTally(orders: SupplyOrder[]): {
  total: number;
  byStatus: Record<OrderStatus, number>;
  value: number | null;
  unresolvedLines: number;
} {
  const byStatus: Record<OrderStatus, number> = { received: 0, resolved: 0, ordered: 0, error: 0 };
  let value: number | null = null;
  let unresolvedLines = 0;
  for (const o of orders) {
    byStatus[o.status]++;
    if (o.amount != null) value = (value ?? 0) + o.amount;
    unresolvedLines += o.unresolved;
  }
  return { total: orders.length, byStatus, value, unresolvedLines };
}
