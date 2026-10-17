import "server-only";
import { q, sbSelect, sbCount } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

export type FlowMonth = { key: string; label: string; invoiced: number; collected: number | null; current: boolean };

/**
 * Money asked for against money that arrived, month by month: what
 * ServiceTitan invoiced (by invoice date, inc GST) and what was banked (its
 * payments, by the day paid, the voided ones left out). Both from the same
 * system, so the gap between the lines is the money still out.
 *
 * Collected is null — never zero — until a payment has ever synced, as on the
 * wall board: an empty table would draw a flat line at $0 under months of
 * real takings.
 */
export async function moneyFlow(span: 6 | 12): Promise<FlowMonth[]> {
  const today = isoDateMelbourne(new Date());
  const [y, mo] = today.split("-").map(Number);
  const from = new Date(Date.UTC(y, mo - span, 1)).toISOString().slice(0, 10);
  const [inv, paid, ever] = await Promise.all([
    sbSelect<{ total: number | null; invoice_date: string | null }>("st_invoices_billed", [q.select("total,invoice_date"), q.gte("invoice_date", from), "limit=50000"].join("&")).catch(() => []),
    sbSelect<{ total: number | null; paid_on: string | null; active: boolean | null }>("st_payments", [q.select("total,paid_on,active"), q.gte("paid_on", from), "limit=50000"].join("&")).catch(() => []),
    sbCount("st_payments", "").catch(() => 0),
  ]);
  const invoiced = new Map<string, number>();
  for (const r of inv) if (r.invoice_date) invoiced.set(r.invoice_date.slice(0, 7), (invoiced.get(r.invoice_date.slice(0, 7)) ?? 0) + Number(r.total ?? 0));
  const collected = new Map<string, number>();
  for (const r of paid) if (r.paid_on && r.active !== false) collected.set(r.paid_on.slice(0, 7), (collected.get(r.paid_on.slice(0, 7)) ?? 0) + Number(r.total ?? 0));
  const out: FlowMonth[] = [];
  for (let i = 0; i < span; i++) {
    const d = new Date(Date.UTC(y, mo - span + i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push({
      key,
      label: d.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" }),
      invoiced: invoiced.get(key) ?? 0,
      collected: ever > 0 ? collected.get(key) ?? 0 : null,
      current: key === today.slice(0, 7),
    });
  }
  return out;
}
