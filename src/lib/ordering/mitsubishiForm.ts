// Fills in Mitsubishi Electric's order form, which they ask to have attached
// to every emailed order. Pure apart from pdf-lib, so the check script can
// fill one from fixtures and the result can be looked at.

import { AnnotationFlags, PDFDocument } from "pdf-lib";
import { MITSUBISHI_ORDER_FORM_B64 } from "./mitsubishiTemplate";
import { jobInstallNote, orderDelivery, supplierRows, todayMelbourne, type OrderingSettings, type PlannedLine } from "./plan";

/** The form has fourteen order rows and no second page. */
export const MITSUBISHI_FORM_ROWS = 14;

// Row 1 is "Qty", rows 2–14 are "Qty 2" … "Qty 14"; the same for each column.
const rowField = (base: string, i: number) => (i === 1 ? base : `${base} ${i}`);

const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function fillMitsubishiForm(o: {
  poNumber: string;
  orderDate: string;
  lines: PlannedLine[];
  delivery: string;
  deliveryInstructions: string | null;
  /** The office's deliver-by date for the order, over the one from the first install. */
  deliverBy?: string | null;
  settings: OrderingSettings;
  /** Melbourne date the order goes out; defaults to now. */
  today?: string;
  /** Going straight to a site rather than the factory. */
  toSite?: boolean;
  /** We collect it: the address boxes say so, and the date is when it's to be ready. */
  pickup?: boolean;
  /**
   * The signature for the Customer Signature box, as a PNG. Kept in
   * portal_settings ("ordering_signature"), not in this repo, which is public.
   */
  signaturePng?: Uint8Array | null;
}): Promise<{ pdf: Uint8Array; rows: number } | { error: string }> {
  const rows = supplierRows(o.lines);
  if (rows.length > MITSUBISHI_FORM_ROWS) {
    return { error: `${rows.length} different units — Mitsubishi's form holds ${MITSUBISHI_FORM_ROWS}. Split the order.` };
  }
  const acct = o.settings.mitsubishi ?? {};
  // The delivery address arrives as one line; the form wants the postcode and
  // state in their own boxes, so take them off the end when they're there.
  const m = o.delivery.match(/^(.*?)[,\s]+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i);

  // The template already carries the account details; settings only override
  // them, so a blank setting can never wipe the account number off an order.
  const account: Record<string, string | undefined> = {
    "Account Name": acct.accountName, "Account Number": acct.accountNumber, "Customer ABN": acct.abn,
    "ME Sales Representative": acct.salesRep, "Contact Name": acct.contactName, "Contact Number": acct.contactNumber,
  };
  const values: Record<string, string> = {
    ...Object.fromEntries(Object.entries(account).filter((e): e is [string, string] => !!e[1]?.trim())),
    "Order Date": o.orderDate,
    // Mitsubishi's quote box; we put our job numbers in it, which is how
    // they're quoted back to us.
    "CRM Quote Reference": [...new Set(o.lines.map((l) => l.job_number).filter((j): j is string => !!j))].sort().join(", "),
    "Site": o.pickup || o.toSite ? "" : "Factory",
    "Order Number": o.poNumber,
    "Ordered By": o.settings.orderedBy.toUpperCase(),
    "Delivery Address": o.pickup ? "PICK UP — WE WILL COLLECT" : m ? m[1] : o.delivery,
    "State": o.pickup ? "" : m ? m[2].toUpperCase() : "",
    "Postcode": o.pickup ? "" : m ? m[3] : "",
    "Delivery Instructions": o.deliveryInstructions ?? "",
    // Mitsubishi's own PDF had Print Name and Position as one field, so one
    // filled both; the template has them split (see mitsubishiTemplate.ts).
    "Print Name": o.settings.signName ?? "",
    "Position": o.settings.signPosition ?? "",
  };

  // Every row gets the order's one delivery date, the earliest any line is
  // needed: a date per row would let them split it into several deliveries,
  // each with its own fee — the thing combined orders exist to avoid.
  const deliver = orderDelivery(o.lines, o.today ?? todayMelbourne(), o.deliverBy);
  let subtotal = 0;
  rows.forEach((r, idx) => {
    const i = idx + 1;
    values[rowField("Qty", i)] = String(r.qty);
    values[rowField("Model Number", i)] = r.model;
    values[rowField("Delivery Date", i)] = deliver ? (o.pickup ? `Pick up ${deliver.label}` : deliver.label) : "";
    values[rowField("Price Ex GST", i)] = r.unit_cost == null ? "" : money(r.unit_cost);
    values[rowField("Comments", i)] = jobInstallNote(r);
    if (r.unit_cost != null) subtotal += r.unit_cost * r.qty;
  });
  const gst = Math.round(subtotal * 10) / 100;
  values["SUB TOTAL"] = money(subtotal);
  values["GST"] = money(gst);
  values["Price TOTAL"] = money(subtotal + gst);

  const doc = await PDFDocument.load(Buffer.from(MITSUBISHI_ORDER_FORM_B64, "base64"));
  const form = doc.getForm();
  const missing: string[] = [];
  for (const [name, value] of Object.entries(values)) {
    try {
      form.getTextField(name).setText(value);
    } catch {
      missing.push(name);
    }
  }
  // A field the form no longer has means Mitsubishi changed their form; an
  // order with half its boxes silently empty is worse than no order.
  if (missing.length) return { error: `Mitsubishi's form is missing ${missing.join(", ")} — the template needs updating.` };
  // Every box inherits the form-wide auto font size, which blows one short
  // line up to the full height of the instructions box; give that box its own
  // fixed size, in the same Helvetica the form uses.
  const instr = form.getTextField("Delivery Instructions");
  instr.enableMultiline();
  instr.acroField.setDefaultAppearance("/Helv 9 Tf 0 g");
  form.updateFieldAppearances();

  // The signature is drawn on the page inside the signature box, scaled to fit
  // and kept to its own proportions. The box is a form field whose white fill
  // is painted over the page — over the signature — so once signed it is
  // hidden. (Removing the field outright left a dangling cross-reference that
  // PDF readers report as damage.)
  if (o.signaturePng?.length) {
    const sig = await doc.embedPng(o.signaturePng);
    const widget = form.getTextField("Customer Signature").acroField.getWidgets()[0];
    const rect = widget.getRectangle();
    widget.setFlagTo(AnnotationFlags.Hidden, true);
    const pad = 2;
    const scale = Math.min((rect.width - pad * 2) / sig.width, (rect.height - pad * 2) / sig.height);
    const w = sig.width * scale, h = sig.height * scale;
    doc.getPages()[0].drawImage(sig, { x: rect.x + pad, y: rect.y + (rect.height - h) / 2, width: w, height: h });
  }
  return { pdf: await doc.save(), rows: rows.length };
}
