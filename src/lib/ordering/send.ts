import "server-only";
import { sbSelectOne, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getOrder, loadOrderingSettings, loadSamples, loadSignature, loadSuppliers, type PoWithLines, type PurchaseOrder } from "./db";
import { fillMitsubishiForm } from "./mitsubishiForm";
import { pushIfAuto } from "./stPurchaseOrders";
import { notesIfOn } from "./stJobNotes";
import {
  ccList, deliveryInstructionsFor, mitsubishiFormFilename, mitsubishiOrderEmail, nextWeek, poNumber, reeceListEmail, supplierOrderEmail, workOrderEmail,
  type EmailParts, type OrderingSettings, type PlannedLine, type Supplier,
} from "./plan";

export type SendResult = { ok: boolean; error?: string; note?: string };

/**
 * Who the orders come from: orders@ on the same domain the portal already
 * sends from (RESEND_FROM_EMAIL, today noreply@advancedgas.com.au).
 *
 * Resend lets any address on a verified domain send, so taking the domain
 * from the working sender and swapping the name in front of the @ means
 * suppliers see orders@ without a second setting in Vercel — and without
 * changing who the portal's sign-in emails come from. Replies go to admin@
 * either way (reply_to, below).
 *
 * Refuses unless that domain is advancedgas.com.au: a supplier order from
 * onboarding@resend.dev, the portal's fallback, reads as spam.
 */
function fromAddress(): string | null {
  const raw = (process.env.RESEND_FROM_EMAIL ?? "").trim();
  const addr = (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim();
  const domain = addr.split("@")[1]?.toLowerCase() ?? "";
  if (!/^(?:[a-z0-9-]+\.)*advancedgas\.com\.au$/.test(domain)) return null;
  return `Advanced Gas & Aircon <orders@${domain}>`;
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
  const instructions = deliveryInstructionsFor(po, settings);

  if (supplier.method === "work_order") {
    if (!po.details) return { error: "This work order has no booking details — redraft the week." };
    return { po, supplier, settings, email: workOrderEmail({ supplier, poNumber: po.po_number, details: po.details, settings }) };
  }
  if (supplier.method === "reece_cart") return { po, supplier, settings, email: null };

  if (supplier.method === "email_form") {
    const orderDate = todayDmy();
    const form = await fillMitsubishiForm({
      poNumber: po.po_number, orderDate, lines: po.lines, delivery, deliveryInstructions: instructions, settings,
      toSite: po.delivery_to_site, pickup: po.pickup, signaturePng: await loadSignature(),
    });
    if ("error" in form) return { error: form.error };
    const attachments = [{ filename: mitsubishiFormFilename(po.po_number), content: Buffer.from(form.pdf).toString("base64") }];
    const email = mitsubishiOrderEmail({
      supplier, poNumber: po.po_number, orderDate, lines: po.lines, delivery, deliveryInstructions: instructions, settings, attached: true, pickup: po.pickup,
    });
    return { po, supplier, settings, email, attachments };
  }
  const email = supplierOrderEmail({
    supplier, poNumber: po.po_number, lines: po.lines, delivery, deliveryInstructions: instructions, settings, attached: false, pickup: po.pickup,
  });
  return { po, supplier, settings, email };
}

/**
 * What a sent order said, for filing it on the job in ServiceTitan (stJobNotes):
 * built the same way the email was, so the copy on the job is the one that went.
 */
export async function orderDocument(id: number): Promise<{ subject: string; text: string; pdf?: { filename: string; base64: string } } | { error: string }> {
  const b = await build(id);
  if ("error" in b) return b;
  if (!b.email) return { error: "Reece orders are entered in maX, so there's no email to attach." };
  const form = b.attachments?.[0];
  return { subject: b.email.subject, text: b.email.text, ...(form ? { pdf: { filename: form.filename, base64: form.content } } : {}) };
}

const todayDmy = () => { const [y, m, d] = isoDateMelbourne().split("-"); return `${d}/${m}/${y}`; };

/**
 * Everyone copied on an order: the office (always), the people set on the
 * supplier, and any added to this one order. Deduplicated, and never the
 * address it is going to.
 */

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
    await pushIfAuto(id);
    await notesIfOn(id);
    return { ok: true, note: "Marked as ordered in maX." };
  }

  const err = await resend({
    from,
    to: [supplier.email],
    // The office keeps a copy of everything that goes out, and replies come
    // back to the office rather than to whoever pressed the button.
    cc: ccList(settings, supplier, po, supplier.email),
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
  await pushIfAuto(id);
  await notesIfOn(id);
  return { ok: true, note: `Sent to ${supplier.email}, copied to ${ccList(settings, supplier, po, supplier.email).join(", ")}.` };
}

/**
 * Ordered some other way — a phone call, the supplier's site, a counter
 * pickup. Recorded as sent, with nothing emailed, so its lines count as
 * ordered: they won't be drafted again, and if the job moves the move is
 * flagged like any other order's.
 */
export async function markOrderedManually(id: number, who: string, how: string): Promise<SendResult> {
  const now = new Date().toISOString();
  const claimed = await sbUpdateReturning<PurchaseOrder>("purchase_orders", `id=eq.${id}&status=eq.draft`, {
    status: "sent", approved_by: who, approved_at: now, sent_at: now, send_error: null, updated_at: now,
    sent_to: `Ordered manually${how ? ` — ${how}` : ""}`,
  });
  if (claimed.length) { await pushIfAuto(id); await notesIfOn(id); }
  return claimed.length ? { ok: true, note: "Marked as ordered. Nothing was emailed." } : { ok: false, error: "Only a draft can be marked — it may have just been sent." };
}

/**
 * Every draft on the page, one after another. Reece is left out: its lines
 * go into maX by hand, so marking it ordered is only true once someone has.
 * One failure doesn't stop the rest; each failed draft keeps its reason, as
 * it would from its own button.
 */
export async function approveAllDrafts(ids: number[], who: string): Promise<SendResult> {
  const sent: string[] = [];
  const failed: string[] = [];
  let skipped = 0;
  for (const id of ids) {
    const po = await sbSelectOne<{ status: string; supplier_id: string; kind: string; po_number: string }>("purchase_orders", `select=status,supplier_id,kind,po_number&id=eq.${id}`);
    if (!po || po.status !== "draft") continue;
    const supplier = await sbSelectOne<Supplier>("order_suppliers", `id=eq.${encodeURIComponent(po.supplier_id)}`);
    if (!supplier || supplier.method === "reece_cart") { skipped++; continue; }
    const r = await approveAndSend(id, who);
    const name = po.kind === "work_order" ? `${supplier.name} (${po.po_number})` : supplier.name;
    (r.ok ? sent : failed).push(r.ok ? name : `${name}: ${r.error}`);
  }
  if (!sent.length && !failed.length) return { ok: false, error: skipped ? "Only Reece is left — enter it in maX and mark it ordered." : "Nothing to send." };
  const note = [
    sent.length ? `Sent ${sent.length}: ${sent.join(", ")}.` : "",
    skipped ? "Reece left for maX." : "",
  ].filter(Boolean).join(" ");
  return failed.length ? { ok: false, error: `${note} Didn't send — ${failed.join("; ")}`.trim() } : { ok: true, note };
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
  const email = b.email ?? reeceListEmail({ supplier, poNumber: po.po_number, lines: po.lines, delivery: po.delivery_address || settings.deliveryAddress, settings, instructions: deliveryInstructionsFor(po, settings), pickup: po.pickup });
  const err = await sendMarked("TEST", supplier, email, to, settings, attachments);
  return err ? { ok: false, error: err } : { ok: true, note: `Test sent to ${to}${attachments ? " with the form attached" : ""}. The order is still a draft.` };
}

/** One email, marked as not the real thing, to one address. Nothing is recorded against any order. */
async function sendMarked(
  mark: "TEST" | "SAMPLE", supplier: Supplier, email: EmailParts, to: string, settings: OrderingSettings,
  attachments?: { filename: string; content: string }[],
): Promise<string | null> {
  const from = fromAddress();
  if (!from) return NO_FROM;
  const who = supplier.method === "reece_cart"
    ? "the list Kellie would enter in Reece maX (Reece isn't emailed)"
    : `what ${supplier.name}${supplier.email ? ` (${supplier.email})` : ""} would receive`;
  const line = `${mark} — this is ${who}. Nothing has been sent to them.`;
  const banner = `<div style="background:#fbf1de;color:#8a5a12;padding:12px 16px;font:600 14px/20px -apple-system,Segoe UI,Arial,sans-serif;">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`;
  return resend({
    from,
    to: [to],
    reply_to: settings.replyTo,
    subject: `[${mark}] ${email.subject}`,
    html: email.html.replace("<body style=\"margin:0;background:#f9f8f3;\">", `<body style="margin:0;background:#f9f8f3;">${banner}`),
    text: `${line}\n\n${email.text}`,
    ...(attachments ? { attachments } : {}),
  });
}

/**
 * Supply › Supplier emails: what each supplier's email looks like with the
 * wording as it's saved now, sent to one address. Built from that supplier's
 * real upcoming lines where there are any (loadSamples), and from the very
 * same functions a real send uses — the Mitsubishi form included.
 */
export async function sendSamples(to: string, onlySupplierId?: string): Promise<SendResult> {
  const [suppliers, settings, samples] = await Promise.all([loadSuppliers(), loadOrderingSettings(), loadSamples()]);
  // Samples are shown as factory deliveries, which is how nearly every order goes.
  const sampleInstructions = deliveryInstructionsFor({ delivery_instructions: null, delivery_to_site: false }, settings);
  const list = suppliers.filter((s) => s.active && (!onlySupplierId || s.id === onlySupplierId));
  if (!list.length) return { ok: false, error: "No such supplier." };
  const week = nextWeek(new Date());
  const sent: string[] = [];
  const failed: string[] = [];
  for (const s of list) {
    const sample = samples.get(s.id);
    if (!sample) continue;
    const po = `${poNumber(week, s.id, 1)}-SAMPLE`;
    let email: EmailParts;
    let attachments: { filename: string; content: string }[] | undefined;
    if (s.method === "work_order") {
      if (!sample.details) continue;
      email = workOrderEmail({ supplier: s, poNumber: po, details: sample.details, settings });
    } else {
      const lines: PlannedLine[] = sample.lines;
      if (s.method === "email_form") {
        const orderDate = todayDmy();
        const form = await fillMitsubishiForm({ poNumber: po, orderDate, lines, delivery: settings.deliveryAddress, deliveryInstructions: sampleInstructions, settings,
          signaturePng: await loadSignature() });
        if ("error" in form) { failed.push(`${s.name}: ${form.error}`); continue; }
        attachments = [{ filename: mitsubishiFormFilename(po), content: Buffer.from(form.pdf).toString("base64") }];
        email = mitsubishiOrderEmail({ supplier: s, poNumber: po, orderDate, lines, delivery: settings.deliveryAddress, deliveryInstructions: sampleInstructions, settings, attached: true });
      } else if (s.method === "reece_cart") {
        email = reeceListEmail({ supplier: s, poNumber: po, lines, delivery: settings.deliveryAddress, settings, instructions: sampleInstructions });
      } else {
        email = supplierOrderEmail({ supplier: s, poNumber: po, lines, delivery: settings.deliveryAddress, deliveryInstructions: sampleInstructions, settings, attached: false });
      }
    }
    const err = await sendMarked("SAMPLE", s, email, to, settings, attachments);
    if (err) {
      failed.push(`${s.name}: ${err}`);
      // The sender isn't set up: every other one would fail the same way.
      if (err === NO_FROM) break;
    } else {
      sent.push(s.name);
    }
  }
  if (!sent.length) return { ok: false, error: failed[0] ?? "Nothing to send." };
  return {
    ok: true,
    note: `${sent.length === 1 ? `Sample sent to ${to}` : `${sent.length} samples sent to ${to}`}.${failed.length ? ` Didn't send: ${failed.join("; ")}` : ""}`,
  };
}

/** "New orders to approve" to the office, after a morning draft that found something new. */
export async function sendReadyNotice(parts: EmailParts, to: string): Promise<string | null> {
  const from = fromAddress() ?? (process.env.RESEND_FROM_EMAIL || "Advanced Gas Portal <onboarding@resend.dev>");
  return resend({ from, to: [to], subject: parts.subject, html: parts.html, text: parts.text });
}
