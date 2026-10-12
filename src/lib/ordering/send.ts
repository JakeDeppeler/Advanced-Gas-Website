import "server-only";
import { sbSelectOne, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getOrder, loadOrderingSettings, type PoWithLines, type PurchaseOrder } from "./db";
import { fillMitsubishiForm } from "./mitsubishiForm";
import { supplierOrderEmail, workOrderEmail, type EmailParts, type OrderingSettings, type Supplier } from "./plan";

export type SendResult = { ok: boolean; error?: string; note?: string };

/**
 * Who the orders come from. Suppliers and Geoff reply to it, and a supplier
 * order from onboarding@resend.dev — the fallback the portal's own emails use
 * — reads as spam and can't be replied to. So orders refuse to go unless the
 * sending address is on advancedgas.com.au, and always carry the business's
 * name rather than whatever the portal's own emails are labelled.
 */
function fromAddress(): string | null {
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const addr = (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim();
  if (!/@(?:[a-z0-9-]+\.)*advancedgas\.com\.au$/i.test(addr)) return null;
  return `Advanced Gas & Aircon <${addr}>`;
}

async function resend(body: Record<string, unknown>): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "RESEND_API_KEY isn't set";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return `Email didn't send (${res.status}): ${(await res.text().catch(() => "")).slice(0, 300)}`;
    return null;
  } catch (e) {
    return `Email didn't send: ${(e as Error).message}`;
  }
}

/**
 * Approve a draft and send it: emailed to the supplier (with Mitsubishi's
 * form attached), emailed to the electrician, or — for Reece, where nothing
 * can put lines into a maX cart — marked as entered by the office.
 *
 * The draft is claimed first (draft → approved, only if still a draft), so a
 * double-click or two people on the page send it once. If the email then
 * fails it goes back to draft with the reason on it, so it can be sent again.
 */
type Built = { po: PoWithLines; supplier: Supplier; settings: OrderingSettings; email: EmailParts | null; attachments?: { filename: string; content: string }[] };

/**
 * The email exactly as it would go — the same subject, body and, for
 * Mitsubishi, the same filled-in form — so a test send shows the real thing.
 * `email` is null for Reece, which is entered in maX rather than emailed.
 */
async function build(id: number): Promise<Built | { error: string }> {
  const po = await getOrder(id);
  if (!po) return { error: "That order isn't there any more — redraft the week." };
  if (!po.lines.length && po.kind !== "work_order") return { error: "Nothing on this order." };
  const supplier = await sbSelectOne<Supplier>("order_suppliers", `id=eq.${encodeURIComponent(po.supplier_id)}`);
  if (!supplier) return { error: "Unknown supplier." };
  const settings = await loadOrderingSettings();
  const delivery = po.delivery_address || settings.deliveryAddress;

  if (supplier.method === "work_order") {
    if (!po.details) return { error: "This work order has no booking details — redraft the week." };
    return { po, supplier, settings, email: workOrderEmail({ supplier, poNumber: po.po_number, details: po.details, settings }) };
  }
  if (supplier.method === "reece_cart") return { po, supplier, settings, email: null };

  let attachments: Built["attachments"];
  if (supplier.method === "email_form") {
    const [y, m, d] = isoDateMelbourne().split("-");
    const form = await fillMitsubishiForm({
      poNumber: po.po_number, orderDate: `${d}/${m}/${y}`, lines: po.lines, delivery, deliveryInstructions: po.delivery_instructions, settings,
    });
    if ("error" in form) return { error: form.error };
    attachments = [{ filename: `${po.po_number} Mitsubishi order form.pdf`, content: Buffer.from(form.pdf).toString("base64") }];
  }
  const email = supplierOrderEmail({
    supplier, poNumber: po.po_number, lines: po.lines, delivery, deliveryInstructions: po.delivery_instructions, settings, attached: !!attachments,
  });
  return { po, supplier, settings, email, attachments };
}

const NO_FROM = "Orders have to come from an advancedgas.com.au address. Set RESEND_FROM_EMAIL in Vercel to one (e.g. orders@advancedgas.com.au).";

/**
 * Approve a draft and send it: emailed to the supplier (with Mitsubishi's
 * form attached), emailed to the electrician, or — for Reece, where nothing
 * can put lines into a maX cart — marked as entered by the office.
 *
 * The draft is claimed first (draft → approved, only if still a draft), so a
 * double-click or two people on the page send it once. If the email then
 * fails it goes back to draft with the reason on it, so it can be sent again.
 */
export async function approveAndSend(id: number, who: string): Promise<SendResult> {
  // Built before claiming, so a bad form doesn't leave an order stuck as
  // "approved" with nothing sent.
  const b = await build(id);
  if ("error" in b) return { ok: false, error: b.error };
  const { po, supplier, settings, email, attachments } = b;
  if (po.status !== "draft") return { ok: false, error: `Already ${po.status}.` };

  const from = fromAddress();
  if (email && !supplier.email) return { ok: false, error: `No email address for ${supplier.name}.` };
  if (email && !from) return { ok: false, error: NO_FROM };

  const now = new Date().toISOString();
  const claimed = await sbUpdateReturning<PurchaseOrder>("purchase_orders", `id=eq.${id}&status=eq.draft`, {
    status: "approved", approved_by: who, approved_at: now, send_error: null, updated_at: now,
  });
  if (!claimed.length) return { ok: false, error: "Someone else has just sent this." };

  if (!email) {
    await sbUpdate("purchase_orders", `id=eq.${id}`, { status: "sent", sent_at: now, sent_to: "Reece maX — entered by the office", updated_at: now });
    return { ok: true, note: "Marked as ordered in maX." };
  }

  const err = await resend({
    from,
    to: [supplier.email],
    // The office keeps a copy of everything that goes out, and replies come
    // back to the office rather than to whoever pressed the button.
    cc: [settings.replyTo],
    reply_to: settings.replyTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(attachments ? { attachments } : {}),
  });
  if (err) {
    await sbUpdate("purchase_orders", `id=eq.${id}`, {
      status: "draft", approved_by: null, approved_at: null, send_error: err, updated_at: new Date().toISOString(),
    });
    return { ok: false, error: err };
  }
  await sbUpdate("purchase_orders", `id=eq.${id}`, { status: "sent", sent_at: new Date().toISOString(), sent_to: supplier.email, updated_at: new Date().toISOString() });
  return { ok: true, note: `Sent to ${supplier.email}, copy to ${settings.replyTo}.` };
}

/**
 * Send the email this order would send — same body, same attachment — to one
 * address of the office's choosing, to see how it looks and that it arrives.
 * Changes nothing: the order stays a draft, the supplier gets nothing, and no
 * copy goes to the office inbox. The subject says TEST so a forwarded one
 * can't be mistaken for a real order.
 */
export async function sendTest(id: number, to: string): Promise<SendResult> {
  const b = await build(id);
  if ("error" in b) return { ok: false, error: b.error };
  const { po, supplier, settings, attachments } = b;
  // Reece isn't emailed for real, so show the list it would be entered from.
  const email = b.email ?? supplierOrderEmail({
    supplier, poNumber: po.po_number, lines: po.lines, delivery: po.delivery_address || settings.deliveryAddress,
    deliveryInstructions: po.delivery_instructions, settings, attached: false,
  });
  const from = fromAddress();
  if (!from) return { ok: false, error: NO_FROM };
  const banner = `<div style="background:#fbf1de;color:#8a5a12;padding:12px 16px;font:600 14px/20px -apple-system,Segoe UI,Arial,sans-serif;">TEST — this is what ${supplier.name}${supplier.email ? ` (${supplier.email})` : ""} would receive. Nothing has been sent to them.</div>`;
  const err = await resend({
    from,
    to: [to],
    reply_to: settings.replyTo,
    subject: `[TEST] ${email.subject}`,
    html: email.html.replace("<body style=\"margin:0;background:#f9f8f3;\">", `<body style="margin:0;background:#f9f8f3;">${banner}`),
    text: `TEST — this is what ${supplier.name} would receive. Nothing has been sent to them.\n\n${email.text}`,
    ...(attachments ? { attachments } : {}),
  });
  return err ? { ok: false, error: err } : { ok: true, note: `Test sent to ${to}${attachments ? " with the form attached" : ""}. The order is still a draft.` };
}

/** "Next week's orders are ready" to the office, after the Wednesday draft. */
export async function sendReadyNotice(parts: EmailParts, to: string): Promise<string | null> {
  const from = fromAddress() ?? (process.env.RESEND_FROM_EMAIL || "Advanced Gas Portal <onboarding@resend.dev>");
  return resend({ from, to: [to], subject: parts.subject, html: parts.html, text: parts.text });
}
