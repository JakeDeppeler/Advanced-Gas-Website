import "server-only";
import { sbSelect, sbSelectOne, sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { getOrder, loadOrderingSettings, loadSamples, loadSignature, loadSuppliers, type PoWithLines, type PurchaseOrder } from "./db";
import { fillMitsubishiForm } from "./mitsubishiForm";
import { orderPdf } from "./orderPdf";
import { pushIfAuto } from "./stPurchaseOrders";
import { jobsAfterSend } from "./stJobNotes";
import { jobFilesFor } from "./jobFiles";
import {
  ccList, dateChangeEmail, deliveryInstructionsFor, isElectrical, workRef, mitsubishiFormFilename, mitsubishiOrderEmail, nextWeek, poNumber, reeceListEmail, supplierOrderEmail, workOrderEmail,
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
      toSite: po.delivery_to_site, pickup: po.pickup, deliverBy: po.deliver_by, signaturePng: await loadSignature(),
    });
    if ("error" in form) return { error: form.error };
    const attachments = [{ filename: mitsubishiFormFilename(po.po_number), content: Buffer.from(form.pdf).toString("base64") }];
    const email = mitsubishiOrderEmail({
      supplier, poNumber: po.po_number, orderDate, lines: po.lines, delivery, deliveryInstructions: instructions, settings, attached: true, pickup: po.pickup,
      deliverBy: po.deliver_by, note: po.supplier_note,
    });
    return { po, supplier, settings, email, attachments };
  }
  const email = supplierOrderEmail({
    supplier, poNumber: po.po_number, lines: po.lines, delivery, deliveryInstructions: instructions, settings, attached: false, pickup: po.pickup,
    deliverBy: po.deliver_by, note: po.supplier_note,
  });
  return { po, supplier, settings, email };
}

/**
 * The order as a PDF, to download and attach to the job: Mitsubishi's own
 * filled-in form where that's what goes, otherwise the order drawn up the
 * same way for every supplier — Reece's with its product numbers.
 */
export async function orderPdfFor(id: number): Promise<{ filename: string; pdf: Uint8Array } | { error: string }> {
  const b = await build(id);
  if ("error" in b) return b;
  const form = b.attachments?.[0];
  if (form) return { filename: form.filename, pdf: new Uint8Array(Buffer.from(form.content, "base64")) };
  const { po, supplier, settings } = b;
  const reece = supplier.method === "reece_cart";
  const pdf = await orderPdf({
    poNumber: po.po_number, supplier: supplier.name, date: todayDmy(),
    deliver: po.pickup ? "We pick it up from the branch" : `Deliver to ${po.delivery_address || settings.deliveryAddress}`,
    instructions: [deliveryInstructionsFor(po, settings), po.supplier_note?.trim() ? `Note: ${po.supplier_note.trim()}` : null].filter(Boolean).join(" ") || null, orderedBy: settings.orderedBy, lines: po.lines,
    partLabel: reece ? "Reece #" : "Model",
    part: (l) => (reece ? l.supplier_part ?? "not set" : l.supplier_model ?? ""),
  });
  return { filename: `Order ${po.po_number} - ${supplier.name}.pdf`.replace(/[\\/:*?"<>|]/g, "-"), pdf };
}

/**
 * What a sent order said, for filing it on the job in ServiceTitan (stJobNotes):
 * built the same way the email was, so the copy on the job is the one that went.
 * Reece's is the list it was entered from.
 */
export async function orderDocument(id: number): Promise<{ subject: string; text: string; pdf?: { filename: string; base64: string } } | { error: string }> {
  const b = await build(id);
  if ("error" in b) return b;
  const email = b.email ?? reeceList(b);
  const form = b.attachments?.[0];
  return { subject: email.subject, text: email.text, ...(form ? { pdf: { filename: form.filename, base64: form.content } } : {}) };
}

const reeceList = (b: Built) => reeceListEmail({
  supplier: b.supplier, poNumber: b.po.po_number, lines: b.po.lines, delivery: b.po.delivery_address || b.settings.deliveryAddress,
  settings: b.settings, instructions: deliveryInstructionsFor(b.po, b.settings), pickup: b.po.pickup, note: b.po.supplier_note,
});

/**
 * Reece, until there's a maX integration: email the list to an address (the
 * branch, or whoever enters it) with the PDF attached, and count the order as
 * gone. Copied to the office like any order.
 */
export async function emailReeceList(id: number, who: string, to: string): Promise<SendResult> {
  const b = await build(id);
  if ("error" in b) return { ok: false, error: b.error };
  if (b.supplier.method !== "reece_cart") return { ok: false, error: "Only a Reece list is emailed this way." };
  if (b.po.status !== "draft") return { ok: false, error: `Already ${b.po.status}.` };
  const from = fromAddress();
  if (!from) return { ok: false, error: NO_FROM };
  const file = await orderPdfFor(id);
  const email = reeceList(b);
  const now = new Date().toISOString();
  const claimed = await sbUpdateReturning<PurchaseOrder>("purchase_orders", `id=eq.${id}&status=eq.draft`, {
    status: "approved", approved_by: who, approved_at: now, send_error: null, updated_at: now,
  });
  if (!claimed.length) return { ok: false, error: "Someone else has just sent this." };
  const err = await resend({
    from, to: [to], cc: ccList(b.settings, b.supplier, b.po, to), reply_to: b.settings.replyTo,
    subject: email.subject, html: email.html, text: email.text,
    ...("pdf" in file ? { attachments: [{ filename: file.filename, content: Buffer.from(file.pdf).toString("base64") }] } : {}),
  });
  if (err) {
    await sbUpdate("purchase_orders", `id=eq.${id}`, { status: "draft", approved_by: null, approved_at: null, send_error: err, updated_at: new Date().toISOString() });
    return { ok: false, error: err };
  }
  await sbUpdate("purchase_orders", `id=eq.${id}`, { status: "sent", sent_at: new Date().toISOString(), sent_to: `Emailed the list to ${to}`, updated_at: new Date().toISOString() });
  await pushIfAuto(id);
  await jobsAfterSend(id);
  return { ok: true, note: `List emailed to ${to}, with the PDF.` };
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
export async function approveAndSend(id: number, who: string, opts: { to?: string } = {}): Promise<SendResult> {
  // Built before claiming, so a bad form doesn't leave an order stuck as
  // "approved" with nothing sent.
  const b = await build(id);
  if ("error" in b) return { ok: false, error: b.error };
  const { po, supplier, settings, email, attachments } = b;
  // A work order can go to someone other than the electrician on file (another
  // sparky, the builder's), picked on the form; everything else goes to the supplier.
  const to = opts.to?.trim() || supplier.email;
  if (po.status !== "draft") return { ok: false, error: `Already ${po.status}.` };

  const from = fromAddress();
  if (email && !to) return { ok: false, error: `No email address for ${supplier.name}.` };
  if (email && !from) return { ok: false, error: NO_FROM };
  // The job's files picked on a work order, fetched before it's claimed so a
  // file ServiceTitan won't hand over leaves it a draft with the reason.
  const files = po.kind === "work_order" ? await jobFilesFor(po.details) : [];
  if ("error" in files) return { ok: false, error: files.error };
  const all = [...(attachments ?? []), ...files];

  const now = new Date().toISOString();
  const claimed = await sbUpdateReturning<PurchaseOrder>("purchase_orders", `id=eq.${id}&status=eq.draft`, {
    status: "approved", approved_by: who, approved_at: now, send_error: null, updated_at: now,
  });
  if (!claimed.length) return { ok: false, error: "Someone else has just sent this." };

  if (!email) {
    await sbUpdate("purchase_orders", `id=eq.${id}`, { status: "sent", sent_at: now, sent_to: "Reece maX — entered by the office", updated_at: now });
    await pushIfAuto(id);
    await jobsAfterSend(id);
    return { ok: true, note: "Marked as ordered in maX." };
  }

  const err = await resend({
    from,
    to: [to!],
    // The office keeps a copy of everything that goes out, and replies come
    // back to the office rather than to whoever pressed the button.
    // The electrician's standing copies are for the electrician's work orders:
    // water balancing with someone else goes to them and the office only.
    cc: ccList(settings, po.kind === "work_order" && !isElectrical(po.details) ? { ...supplier, cc_emails: [] } : supplier, po, to),
    reply_to: settings.replyTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(all.length ? { attachments: all } : {}),
  });
  if (err) {
    await sbUpdate("purchase_orders", `id=eq.${id}`, {
      status: "draft", approved_by: null, approved_at: null, send_error: err, updated_at: new Date().toISOString(),
    });
    return { ok: false, error: err };
  }
  await sbUpdate("purchase_orders", `id=eq.${id}`, { status: "sent", sent_at: new Date().toISOString(), sent_to: to, updated_at: new Date().toISOString() });
  await pushIfAuto(id);
  await jobsAfterSend(id);
  return { ok: true, note: `Sent to ${to}, copied to ${ccList(settings, supplier, po, to).join(", ")}.` };
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
  if (claimed.length) { await pushIfAuto(id); await jobsAfterSend(id); }
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
  const email = b.email ?? reeceListEmail({ supplier, poNumber: po.po_number, lines: po.lines, delivery: po.delivery_address || settings.deliveryAddress, settings, instructions: deliveryInstructionsFor(po, settings), pickup: po.pickup, note: po.supplier_note });
  const files = po.kind === "work_order" ? await jobFilesFor(po.details) : [];
  if ("error" in files) return { ok: false, error: files.error };
  const all = [...(attachments ?? []), ...files];
  const err = await sendMarked("TEST", supplier, email, to, settings, all.length ? all : undefined);
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

/** The address an order actually went to, out of what Sent records ("Emailed the list to …", or the address). */
const emailIn = (s: string | null) => s?.match(/[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/)?.[0] ?? null;

export type MovedJob = { job_id: number; job_number: string | null; customer_name: string | null; from: string; to: string };

/**
 * A job on a sent order has moved: tell whoever it went to — the same
 * address, the office copied — and move the order's date with it, so the
 * order stands, nothing is ordered twice, and the warning on To order goes.
 * Reece, entered in maX by hand, has no address to tell unless the list was
 * emailed; the office changes the date in maX.
 */
export async function emailDateChange(poNumber: string, moves: MovedJob[]): Promise<SendResult & { to?: string }> {
  const [row] = await sbSelect<{ id: number }>("purchase_orders", `select=id&po_number=eq.${encodeURIComponent(poNumber)}&status=in.(approved,sent)&order=id.desc&limit=1`);
  const po = row ? await getOrder(row.id) : null;
  if (!po || !moves.length) return { ok: false, error: `Order ${poNumber} isn't a sent order.` };
  const supplier = await sbSelectOne<Supplier>("order_suppliers", `id=eq.${encodeURIComponent(po.supplier_id)}`);
  if (!supplier) return { ok: false, error: "Unknown supplier." };
  // Only an order that went by email is answered by email: one placed by
  // phone or over the counter ("Ordered manually") may not have gone to the
  // address on file at all, so that one stays the office's to pass on.
  const to = emailIn(po.sent_to);
  if (!to) {
    return { ok: false, error: supplier.method === "reece_cart" ? "Entered in Reece maX: change the date there." : `Ordered from ${supplier.name} by hand, not by email, so let them know yourself.` };
  }
  const from = fromAddress();
  if (!from) return { ok: false, error: NO_FROM };
  const settings = await loadOrderingSettings();
  const workOrder = po.kind === "work_order";
  const email = dateChangeEmail({ supplier, poNumber: po.po_number, ref: workOrder && po.details ? workRef(po.details) : po.po_number, workOrder, moves, settings });
  const err = await resend({ from, to: [to], cc: ccList(settings, supplier, po, to), reply_to: settings.replyTo, subject: email.subject, html: email.html, text: email.text });
  if (err) return { ok: false, error: err };
  // The order now says the new day, so the next look at the week sees it as in step.
  for (const m of moves) {
    await sbUpdate("purchase_order_lines", `po_id=eq.${po.id}&job_id=eq.${m.job_id}`, { install_date: m.to, appointment_start: null }).catch(() => undefined);
  }
  if (workOrder && po.details) {
    await sbUpdate("purchase_orders", `id=eq.${po.id}`, { details: { ...po.details, date: moves[0].to, start_at: null, end_at: null }, updated_at: new Date().toISOString() }).catch(() => undefined);
  }
  return { ok: true, to, note: `Told ${supplier.name} (${to}).` };
}

const UPDATED_LINE = "Updated — this replaces the work order we sent earlier.";
const UPDATED = `<div style="background:#fbf1de;color:#8a5a12;padding:12px 16px;font:600 14px/20px -apple-system,Segoe UI,Arial,sans-serif;">${UPDATED_LINE}</div>`;

/**
 * A sent work order changed (the day, the work, who it's for): email it again
 * as it now reads, marked as an update, and put the new copy on the job, so
 * the PDF in ServiceTitan is the one they're working from. The tags stay as
 * they are: the job is still booked.
 */
export async function resendWorkOrder(id: number, who: string, opts: { to?: string } = {}): Promise<SendResult> {
  const b = await build(id);
  if ("error" in b) return { ok: false, error: b.error };
  const { po, supplier, settings, email } = b;
  if (po.kind !== "work_order" || !email) return { ok: false, error: "Only a work order is sent again this way." };
  if (po.status !== "sent") return { ok: false, error: "It hasn't been sent yet." };
  const to = opts.to?.trim() || emailIn(po.sent_to) || supplier.email;
  if (!to) return { ok: false, error: "Who should it go to?" };
  const from = fromAddress();
  if (!from) return { ok: false, error: NO_FROM };
  const files = await jobFilesFor(po.details);
  if ("error" in files) return { ok: false, error: files.error };
  const err = await resend({
    from, to: [to],
    cc: ccList(settings, isElectrical(po.details) ? supplier : { ...supplier, cc_emails: [] }, po, to),
    ...(files.length ? { attachments: files } : {}),
    reply_to: settings.replyTo,
    subject: `Updated: ${email.subject}`,
    html: email.html.replace("<body style=\"margin:0;background:#f9f8f3;\">", `<body style="margin:0;background:#f9f8f3;">${UPDATED}`),
    text: `${UPDATED_LINE}\n\n${email.text}`,
  });
  if (err) return { ok: false, error: err };
  const now = new Date().toISOString();
  // Clearing the note and file marks has the job noted again with this copy; the tags are left done.
  const notes = (po as PoWithLines & { st_notes?: { job_id: number; note: boolean; file: boolean; tags?: boolean }[] | null }).st_notes;
  await sbUpdate("purchase_orders", `id=eq.${id}`, {
    sent_to: to, sent_at: now, approved_by: who, updated_at: now,
    st_notes: Array.isArray(notes) ? notes.map((n) => ({ ...n, note: false, file: false })) : notes ?? null,
  });
  await jobsAfterSend(id);
  return { ok: true, note: `Update emailed to ${to}.` };
}
