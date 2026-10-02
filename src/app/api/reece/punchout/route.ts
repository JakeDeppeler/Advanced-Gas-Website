import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dashboardDbConfigured, q, sbInsert, sbUpdate } from "@/lib/dashboard/db";
import { serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { reeceCart, reeceConfig, type CartLine } from "@/lib/pricebook/reece";
import { buildMaterialIndex, findMaterial, loadMaterials, loadPricebookSettings, resolveVendor } from "@/lib/pricebook/stPricebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PunchOut hook: Reece redirects the user's browser here with a form POST
// (application/x-www-form-urlencoded) carrying `cartToken`, plus the
// customerNumber or customerToken we sent. We fetch the cart with our API
// credentials, store it, resolve each line to a ServiceTitan material, and show
// the user what came back — this response is what they see after Reece.
//
// Placing the order is a separate, deliberate call (/api/reece/order) because
// it needs a branch, a required-by time and a name on the order.

function authorised(req: Request): boolean {
  const secret = reeceConfig().punchoutSecret;
  const supplied = new URL(req.url).searchParams.get("s") ?? "";
  if (!secret || !supplied || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

type Resolved = CartLine & { materialId: number | null; materialCode: string | null };

function page(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
      `<style>body{font:16px/1.5 system-ui,sans-serif;margin:2rem auto;max-width:48rem;padding:0 1rem;color:#1a1a1a}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:.4rem .5rem;border-bottom:1px solid #ddd}th{font-weight:600}.muted{color:#666}.warn{color:#9a3412}</style>` +
      `<h1>${title}</h1>${body}`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

export async function POST(req: Request) {
  if (!authorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  if (!dashboardDbConfigured()) return page("Not configured", "<p>Supabase is not configured on this deployment.</p>", 503);

  const contentType = req.headers.get("content-type") ?? "";
  let fields: URLSearchParams;
  if (contentType.includes("application/json")) {
    fields = new URLSearchParams(Object.entries((await req.json()) as Record<string, string>));
  } else {
    fields = new URLSearchParams(await req.text());
  }
  const cartToken = fields.get("cartToken")?.trim();
  if (!cartToken) return page("No cart", "<p>Reece did not send a cart token.</p>", 400);

  const id = randomUUID();
  let lines: CartLine[];
  try {
    const cart = await reeceCart(cartToken);
    lines = cart.lines;
    await sbInsert("reece_punchout_carts", {
      id,
      cart: cart.raw,
      cart_token: cartToken,
      customer_number: fields.get("customerNumber"),
      status: "received",
    });
  } catch (e) {
    return page("Cart not retrieved", `<p class="warn">${esc((e as Error).message)}</p>`, 502);
  }

  let resolved: Resolved[] = lines.map((l) => ({ ...l, materialId: null, materialCode: null }));
  let note = "";
  if (serviceTitanConfigured() && lines.length) {
    try {
      const settings = await loadPricebookSettings();
      const vendor = await resolveVendor(settings.vendorName);
      const index = buildMaterialIndex(await loadMaterials(), vendor.id);
      resolved = lines.map((l) => {
        const m = findMaterial(index, String(l.productId), settings.codePrefix);
        return { ...l, materialId: m?.id ?? null, materialCode: m?.code ?? null };
      });
      const unresolved = resolved.filter((l) => l.materialId == null).length;
      await sbUpdate("reece_punchout_carts", q.eq("id", id), {
        status: "resolved",
        resolved_lines: resolved,
        error: unresolved ? `${unresolved} line(s) not in the pricebook` : null,
      });
      if (unresolved) note = `<p class="warn">${unresolved} line(s) are not in the ServiceTitan pricebook yet. Load a current price file and run the pricebook sync, or add them by hand.</p>`;
    } catch (e) {
      await sbUpdate("reece_punchout_carts", q.eq("id", id), { status: "error", error: (e as Error).message }).catch(() => undefined);
      note = `<p class="warn">Stored, but could not match lines to ServiceTitan: ${esc((e as Error).message)}</p>`;
    }
  }

  const total = resolved.reduce((s, l) => s + (l.unitPriceExcludingGst ?? 0) * l.quantity, 0);
  const rows = resolved
    .map(
      (l) =>
        `<tr><td>${esc(l.productId)}</td><td>${esc(l.description)}</td><td>${esc(l.quantity)} ${esc(l.unitOfMeasure ?? "")}</td>` +
        `<td>${l.unitPriceExcludingGst == null ? "—" : `$${l.unitPriceExcludingGst.toFixed(2)}`}</td>` +
        `<td>${l.materialCode ? esc(l.materialCode) : '<span class="warn">not in pricebook</span>'}</td></tr>`,
    )
    .join("");

  return page(
    "Reece cart received",
    `<p>Cart <code>${esc(id)}</code> with ${resolved.length} line(s), $${total.toFixed(2)} ex GST at your Reece pricing.</p>${note}` +
      `<table><thead><tr><th>Reece code</th><th>Description</th><th>Qty</th><th>Unit ex GST</th><th>ServiceTitan material</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<p class="muted">To place this with Reece, call <code>POST /api/reece/order</code> with this cart id, a pickup branch, a required-by time and who is ordering. See PRICEBOOK.md.</p>`,
  );
}
