import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { dashboardDbConfigured, q, sbInsert, sbUpdate } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { reeceConfig } from "@/lib/pricebook/reece";
import { buildMaterialIndex, findMaterial, loadMaterials, loadPricebookSettings, resolveVendor } from "@/lib/pricebook/stPricebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PunchOut return: maX posts the cart the user built back to this URL.
//
// Registered with Reece as the PunchOut webhook. Authenticated by a shared
// secret (REECE_PUNCHOUT_SECRET) presented either as an HMAC-SHA256 of the raw
// body in a signature header, or as a bearer token — which of the two Reece
// uses, and the header name, comes with their PunchOut documentation.
//
// The cart is stored verbatim first, then each line is resolved to a
// ServiceTitan material by Reece code, so the office (or the next step, a
// purchase order in ServiceTitan) works from ServiceTitan ids rather than
// re-matching. Creating the purchase order is not done here yet: ServiceTitan's
// inventory API needs a business unit and a job or inventory location per PO,
// and which to use is a decision for the person who built the cart.

const SIGNATURE_HEADERS = ["x-reece-signature", "x-signature", "x-hub-signature-256", "x-webhook-signature"];

function authorised(req: Request, rawBody: string): boolean {
  const secret = reeceConfig().punchoutSecret;
  if (!secret) return false;

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (bearer && bearer.length === secret.length && timingSafeEqual(Buffer.from(bearer), Buffer.from(secret))) return true;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  for (const h of SIGNATURE_HEADERS) {
    const supplied = (req.headers.get(h) ?? "").replace(/^sha256=/i, "").toLowerCase();
    if (supplied && supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return true;
  }
  return false;
}

type Raw = Record<string, unknown>;
const first = (r: Raw, ...keys: string[]): unknown => {
  for (const k of keys) if (r[k] != null && r[k] !== "") return r[k];
  return undefined;
};

/** The cart's line items, wherever the payload keeps them. */
function cartLines(cart: Raw): Array<{ code: string; description: string | null; quantity: number; unitPrice: number | null }> {
  const list = first(cart, "items", "lines", "lineItems", "cartItems", "products") ?? first((cart.cart as Raw) ?? {}, "items", "lines") ?? [];
  if (!Array.isArray(list)) return [];
  return list
    .map((l: Raw) => {
      const code = first(l, "productCode", "product_code", "code", "sku", "itemCode", "partNumber");
      const qty = Number(first(l, "quantity", "qty") ?? 1);
      const price = first(l, "unitPrice", "unit_price", "price", "yourPrice", "netPrice");
      return {
        code: code == null ? "" : String(code),
        description: (first(l, "description", "name", "title") as string | undefined) ?? null,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unitPrice: price == null || price === "" ? null : Number(price),
      };
    })
    .filter((l) => l.code);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!authorised(req, rawBody)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });

  let cart: Raw;
  try {
    cart = JSON.parse(rawBody) as Raw;
  } catch {
    return NextResponse.json({ ok: false, error: "body is not JSON" }, { status: 400 });
  }

  const row = { id: randomUUID() };
  try {
    await sbInsert("reece_punchout_carts", { id: row.id, cart });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  // Acknowledge even if resolution fails below — the cart is stored and can be
  // resolved later. Reece should never see a 5xx for something on our side.
  const lines = cartLines(cart);
  if (!serviceTitanConfigured() || lines.length === 0) {
    return NextResponse.json({ ok: true, id: row.id, status: "received", lines: lines.length });
  }

  try {
    const settings = await loadPricebookSettings();
    const vendor = await resolveVendor(settings.vendorName);
    const index = buildMaterialIndex(await loadMaterials(), vendor.id);
    const resolved = lines.map((l) => {
      const m = findMaterial(index, l.code, settings.codePrefix);
      return { ...l, materialId: m?.id ?? null, materialCode: m?.code ?? null };
    });
    const unresolved = resolved.filter((l) => l.materialId == null).length;
    await sbUpdate("reece_punchout_carts", q.eq("id", row.id), {
      status: "resolved",
      resolved_lines: resolved,
      error: unresolved ? `${unresolved} line(s) not in the pricebook` : null,
    });
    return NextResponse.json({ ok: true, id: row.id, status: "resolved", lines: lines.length, unresolved });
  } catch (e) {
    await sbUpdate("reece_punchout_carts", q.eq("id", row.id), { status: "error", error: (e as Error).message }).catch(() => undefined);
    return NextResponse.json({ ok: true, id: row.id, status: "received", lines: lines.length, warning: (e as Error).message });
  }
}
