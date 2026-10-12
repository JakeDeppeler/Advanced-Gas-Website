// Fills in Mitsubishi Electric's order form, which they ask to have attached
// to every emailed order. Pure apart from pdf-lib, so the check script can
// fill one from fixtures and the result can be looked at.

import { PDFDocument } from "pdf-lib";
import { MITSUBISHI_ORDER_FORM_B64 } from "./mitsubishiTemplate";
import { dayLabel, neededBy, supplierRows, type OrderingSettings, type PlannedLine } from "./plan";

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
  settings: OrderingSettings;
}): Promise<{ pdf: Uint8Array; rows: number } | { error: string }> {
  const rows = supplierRows(o.lines);
  if (rows.length > MITSUBISHI_FORM_ROWS) {
    return { error: `${rows.length} different units — Mitsubishi's form holds ${MITSUBISHI_FORM_ROWS}. Split the order.` };
  }
  const acct = o.settings.mitsubishi ?? {};
  // The delivery address arrives as one line; the form wants the postcode and
  // state in their own boxes, so take them off the end when they're there.
  const m = o.delivery.match(/^(.*?)[,\s]+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i);

  const values: Record<string, string> = {
    "Account Name": acct.accountName ?? "",
    "Account Number": acct.accountNumber ?? "",
    "Customer ABN": acct.abn ?? "",
    "ME Sales Representative": acct.salesRep ?? "",
    "Contact Name": acct.contactName ?? "",
    "Contact Number": acct.contactNumber ?? "",
    "Order Date": o.orderDate,
    "Order Number": o.poNumber,
    "Ordered By": o.settings.orderedBy.toUpperCase(),
    "Delivery Address": m ? m[1] : o.delivery,
    "State": m ? m[2].toUpperCase() : "",
    "Postcode": m ? m[3] : "",
    "Delivery Instructions": o.deliveryInstructions ?? "",
    // "Print Name" is left alone on purpose: in Mitsubishi's PDF it is the
    // same field as "Position", so filling one fills both with the same words.
  };

  let subtotal = 0;
  rows.forEach((r, idx) => {
    const i = idx + 1;
    values[rowField("Qty", i)] = String(r.qty);
    values[rowField("Model Number", i)] = r.model;
    // Wanted the working day before the first install it's for.
    values[rowField("Delivery Date", i)] = r.first_install ? dayLabel(neededBy(r.first_install)) : "";
    values[rowField("Price Ex GST", i)] = r.unit_cost == null ? "" : money(r.unit_cost);
    values[rowField("Comments", i)] = r.jobs.length ? `Job ${r.jobs.join(", ")}` : "";
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
  form.updateFieldAppearances();
  return { pdf: await doc.save(), rows: rows.length };
}
