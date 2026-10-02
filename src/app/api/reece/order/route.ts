import { NextResponse } from "next/server";
import { dashboardDbConfigured, q, sbSelectOne, sbUpdate } from "@/lib/dashboard/db";
import { cronAuthorised, screenTokenValid } from "@/lib/dashboard/screenAuth";
import { reeceBranches, reeceConfigured, reeceOrder, type CartLine, type OrderRequest } from "@/lib/pricebook/reece";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Places (or previews) a Reece order from a stored PunchOut cart.
//
//   POST /api/reece/order
//   {
//     "cartId": "<uuid from the PunchOut page>",
//     "mode": "preview" | "check" | "create",      default "preview"
//     "orderByName": "Jake", "orderByPhone": "+61 4…", "orderByEmail": "…",
//     "pickupBranch": 3032,                           branch number — GET /api/reece/order lists them
//     "requiredByDateTime": "2026-10-03T07:00:00",    local time, must be in the future
//     "jobName": "ST job 1234", "orderNumber": "PO-1234", "comment": "…"
//   }
//
// Preview and check cost nothing and return Reece's pricing and validation.
// Create places the order for real and records Reece's order id on the cart.
// Guarded by the cron bearer or the screen token.

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!cronAuthorised(req) && !screenTokenValid(url.searchParams.get("k"))) return new NextResponse("Unauthorized", { status: 401 });
  if (!reeceConfigured()) return NextResponse.json({ ok: false, error: "Reece API not configured" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, branches: await reeceBranches() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

type Body = {
  cartId?: string;
  mode?: "preview" | "check" | "create";
  orderByName?: string;
  orderByPhone?: string;
  orderByEmail?: string;
  pickupBranch?: number;
  requiredByDateTime?: string;
  jobName?: string;
  orderNumber?: string;
  comment?: string;
};

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!cronAuthorised(req) && !screenTokenValid(url.searchParams.get("k"))) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  if (!reeceConfigured()) return NextResponse.json({ ok: false, error: "Reece API not configured" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as Body;
  const mode = b.mode === "create" || b.mode === "check" ? b.mode : "preview";
  const missing = (["cartId", "orderByName", "orderByPhone", "pickupBranch", "requiredByDateTime"] as const).filter((k) => !b[k]);
  if (missing.length) return NextResponse.json({ ok: false, error: `missing: ${missing.join(", ")}` }, { status: 400 });

  const cart = await sbSelectOne<{ id: string; status: string; resolved_lines: CartLine[] | null; cart: { products?: unknown[] }; reece_order_id: number | null }>(
    "reece_punchout_carts",
    [q.select("id,status,resolved_lines,cart,reece_order_id"), q.eq("id", b.cartId!)].join("&"),
  );
  if (!cart) return NextResponse.json({ ok: false, error: "cart not found" }, { status: 404 });
  if (mode === "create" && cart.reece_order_id) {
    return NextResponse.json({ ok: false, error: `cart already ordered as Reece order ${cart.reece_order_id}` }, { status: 409 });
  }

  const lines: CartLine[] = cart.resolved_lines ?? [];
  if (!lines.length) return NextResponse.json({ ok: false, error: "cart has no lines" }, { status: 400 });

  const order: OrderRequest = {
    jobName: b.jobName?.slice(0, 50),
    orderNumber: b.orderNumber?.slice(0, 50),
    orderByName: b.orderByName!.slice(0, 50),
    orderByPhone: b.orderByPhone!.slice(0, 20),
    orderByEmail: b.orderByEmail?.slice(0, 50),
    comment: b.comment?.slice(0, 1000),
    requiredByDateTime: b.requiredByDateTime!,
    notification: b.orderByEmail ? { email: b.orderByEmail } : undefined,
    fulfillment: { type: "PICKUP", pickupBranch: Number(b.pickupBranch) },
    products: lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitOfMeasure: l.unitOfMeasure ?? undefined,
      unitPriceExcludingGst: l.unitPriceExcludingGst ?? undefined,
      unitPriceIncludingGst: l.unitPriceIncludingGst ?? undefined,
      quoteNumber: l.quoteNumber ?? undefined,
      quoteLineNumber: l.quoteLineNumber ?? undefined,
    })),
  };

  try {
    const result = (await reeceOrder(mode, order)) as { id?: number; status?: string } | null;
    if (mode === "create") {
      await sbUpdate("reece_punchout_carts", q.eq("id", cart.id), {
        status: "ordered",
        reece_order_id: result?.id ?? null,
        reece_order: result,
      });
    }
    return NextResponse.json({ ok: true, mode, cartId: cart.id, result });
  } catch (e) {
    return NextResponse.json({ ok: false, mode, error: (e as Error).message }, { status: 502 });
  }
}
