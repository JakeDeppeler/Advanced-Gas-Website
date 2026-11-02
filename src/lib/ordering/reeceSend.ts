import "server-only";
import { sbUpdate, sbUpdateReturning } from "@/lib/dashboard/db";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { ReeceHttpError, reeceConfigured, reeceJson, reeceOrder, type OrderRequest } from "@/lib/pricebook/reece";
import { site } from "@/lib/site";
import { getOrder, loadOrderingSettings, type PoWithLines, type PurchaseOrder } from "./db";
import { fingerprint, parseAddress, planJobs, productId, reeceViolations, requiredBy, type JobOrder, type ReeceUnit } from "./reecePlan";
import { jobsAfterSend } from "./stJobNotes";
import { pushIfAuto } from "./stPurchaseOrders";

// Places a Reece order in maX through Reece's ordering API, one maX order per
// job (Jake, 2 Nov). Two steps, so nothing is bought unseen: previewReece has
// Reece check and price every job's order and shows it; placeReece places
// them, only if the order is still exactly what was shown. Each job placed is
// written to purchase_orders.reece_orders at once (0094), so a send that fails
// part-way leaves the order a draft that, sent again, skips what's in maX.

export type Placed = { key: string; job_number: string | null; reece_id: number | null; status: string | null; at: string };

export type PreviewJob = {
  key: string;
  jobNumber: string | null;
  customer: string | null;
  requiredBy: string;
  lines: { productId: number; name: string; quantity: number; uom: string; ex: number | null; status: string }[];
  totalEx: number;
  cartage: number | null;
  problems: string[];
  placed?: Placed;
};

export type Preview = { ok: true; poId: number; poNumber: string; jobs: PreviewJob[]; fingerprint: string; blocked: string | null } | { ok: false; error: string };

const AT_ONCE = 4;

/** Each product's unit and our price, from Reece's search by its number. Null: Reece doesn't list it. */
async function units(ids: number[]): Promise<Map<number, ReeceUnit | null>> {
  const out = new Map<number, ReeceUnit | null>();
  const todo = [...new Set(ids)];
  for (let i = 0; i < todo.length; i += AT_ONCE) {
    await Promise.all(todo.slice(i, i + AT_ONCE).map(async (id) => {
      const r = await reeceJson<{ products?: Array<{ productId?: number | string; unitOfMeasures?: Array<Record<string, unknown>> }> }>(
        "product-gateway/search", { params: { searchPhrase: String(id), pageSize: "10" } });
      const p = (r?.products ?? []).find((x) => Number(x.productId) === id);
      const u = p?.unitOfMeasures?.[0];
      const uom = u ? String(u.pack ?? u.label ?? u.unitOfMeasure ?? "").trim() : "";
      const num = (v: unknown) => (typeof v === "number" ? v : v == null || v === "" ? null : Number(v));
      out.set(id, p && uom ? { uom, ex: num(u?.unitPriceExcludingGst), inc: num(u?.unitPriceIncludingGST ?? u?.unitPriceIncludingGst) } : null);
    }));
  }
  return out;
}

type Ctx = { po: PurchaseOrder; settings: Awaited<ReturnType<typeof loadOrderingSettings>>; today: string; who: string };

/** One job's maX order, or why it can't be made (the delivery address). */
function request(j: JobOrder, c: Ctx): OrderRequest | { error: string } {
  const { po, settings } = c;
  if (po.pickup) return { error: "It's set to pick up, and picking up from a Reece branch isn't set up in the portal yet. Set it to delivered, or enter it in maX." };
  const addr = parseAddress(po.delivery_to_site ? po.delivery_address : po.delivery_address || settings.deliveryAddress);
  if (!addr) return { error: `Reece needs the delivery address as "street, suburb STATE postcode" and this one can't be read that way: ${po.delivery_address || settings.deliveryAddress || "none set"}.` };
  const instructions = [po.delivery_instructions || (po.delivery_to_site ? null : settings.factoryInstructions), settings.deliveryNote].filter(Boolean).join(". ");
  const contact = (settings.orderedBy || c.who).slice(0, 50);
  return {
    jobName: (j.jobNumber ? `Job ${j.jobNumber}${j.customer ? ` ${j.customer}` : ""}` : "Factory stock").slice(0, 50),
    orderNumber: `${po.po_number}${j.jobNumber ? `-${j.jobNumber}` : ""}`.slice(0, 50),
    orderByName: contact,
    orderByPhone: site.phone.slice(0, 20),
    orderByEmail: settings.replyTo?.slice(0, 50) || undefined,
    comment: [po.supplier_note, `Advanced Gas ${po.po_number}${j.jobNumber ? `, job ${j.jobNumber}` : ", stock"}`].filter(Boolean).join(" · ").slice(0, 1000),
    requiredByDateTime: requiredBy(j.install, po.deliver_by ?? null, c.today),
    notification: settings.replyTo ? { email: settings.replyTo.slice(0, 50) } : undefined,
    fulfillment: {
      type: "DELIVERY",
      deliveryDetails: { contactName: contact, contactNumber: site.phone.slice(0, 20), deliveryAddress: addr, ...(instructions ? { deliveryInstructions: instructions.slice(0, 180) } : {}) },
    },
    products: j.products.map((p) => ({ productId: p.productId, quantity: p.quantity, unitOfMeasure: p.unitOfMeasure, unitPriceExcludingGst: p.unitPriceExcludingGst, unitPriceIncludingGst: p.unitPriceIncludingGst })),
  };
}

const said = (e: unknown) => {
  if (e instanceof ReeceHttpError) {
    const v = reeceViolations(e.body);
    return v.length ? `Reece said: ${v.join("; ")}` : `Reece answered ${e.status}`;
  }
  return (e as Error).message;
};

async function plan(po: PoWithLines, leave: number[]) {
  // Only what holdLines will hold comes off: a job's own lines. A line added
  // by hand stays on the order when its job is unticked, so it stays here too,
  // or the order placed wouldn't match the one shown.
  const lines = po.lines.filter((l) => !(leave.includes(l.id) && l.job_id != null && !l.manual));
  const u = await units(lines.map((l) => productId(l.supplier_part)).filter((x): x is number => x != null));
  return planJobs(lines, u);
}

/** Every job's maX order checked and priced by Reece, nothing placed. */
export async function previewReece(poId: number, leave: number[], who: string): Promise<Preview> {
  if (!reeceConfigured()) return { ok: false, error: "The Reece connection isn't set up." };
  const po = await getOrder(poId);
  if (!po || po.status !== "draft") return { ok: false, error: "That order isn't a draft any more." };
  const c: Ctx = { po, settings: await loadOrderingSettings(), today: isoDateMelbourne(), who };
  const placed = ((po as PoWithLines & { reece_orders?: Placed[] | null }).reece_orders ?? []);
  let jobs: JobOrder[];
  try {
    jobs = await plan(po, leave);
  } catch (e) {
    return { ok: false, error: `Couldn't look the products up at Reece: ${said(e)}` };
  }
  const out: PreviewJob[] = [];
  for (const j of jobs) {
    const done = placed.find((p) => p.key === j.key);
    const req = request(j, c);
    const base: PreviewJob = {
      key: j.key, jobNumber: j.jobNumber, customer: j.customer,
      requiredBy: "error" in req ? "" : req.requiredByDateTime,
      lines: j.products.map((p) => ({ productId: p.productId, name: p.name, quantity: p.quantity, uom: p.unitOfMeasure, ex: null, status: "" })),
      totalEx: 0, cartage: null,
      problems: j.problems.map((p) => `${p.name}: ${p.why}`),
      ...(done ? { placed: done } : {}),
    };
    if (done || !j.products.length) { out.push(base); continue; }
    if ("error" in req) { out.push({ ...base, problems: [...base.problems, req.error] }); continue; }
    try {
      // Check says which lines Reece can't take; preview prices them at our
      // account's prices and adds any cartage.
      const checked = (await reeceOrder("check", req)) as { products?: Array<{ productId?: number; status?: string }> } | null;
      const bad = (checked?.products ?? []).filter((p) => p.status && p.status !== "OK");
      const priced = (await reeceOrder("preview", req)) as { cartageFee?: number; products?: Array<{ productId?: number; quantity?: number; unitPriceExcludingGst?: number }> } | null;
      const lines = base.lines.map((l) => {
        const p = priced?.products?.find((x) => Number(x.productId) === l.productId);
        const s = bad.find((x) => Number(x.productId) === l.productId)?.status ?? "OK";
        return { ...l, ex: p?.unitPriceExcludingGst ?? null, status: s };
      });
      out.push({
        ...base, lines,
        totalEx: Math.round(lines.reduce((t, l) => t + (l.ex ?? 0) * l.quantity, 0) * 100) / 100,
        cartage: typeof priced?.cartageFee === "number" ? priced.cartageFee : null,
        problems: [...base.problems, ...bad.map((b) => `Reece can't take ${b.productId}: ${String(b.status).toLowerCase().replace(/_/g, " ")}`)],
      });
    } catch (e) {
      out.push({ ...base, problems: [...base.problems, said(e)] });
    }
  }
  const stuck = out.filter((j) => !j.placed && j.problems.length);
  const blocked = stuck.length
    ? `${stuck.length} ${stuck.length === 1 ? "job has" : "jobs have"} something Reece can't take. Fix it, untick the job to leave it for later, or enter it in maX by hand.`
    : !out.some((j) => !j.placed && j.lines.length) ? "Nothing left on this order to place." : null;
  return { ok: true, poId, poNumber: po.po_number, jobs: out, fingerprint: fingerprint(jobs.filter((j) => !placed.some((p) => p.key === j.key))), blocked };
}

/**
 * Places each job's maX order, if the order is still what the preview showed.
 * The draft is claimed first, as every send is, so two presses place it once.
 */
export async function placeReece(poId: number, shown: string, who: string): Promise<{ ok: boolean; error?: string; note?: string }> {
  if (!reeceConfigured()) return { ok: false, error: "The Reece connection isn't set up." };
  const po = await getOrder(poId);
  if (!po || po.status !== "draft") return { ok: false, error: "That order isn't a draft any more." };
  const placed: Placed[] = [...((po as PoWithLines & { reece_orders?: Placed[] | null }).reece_orders ?? [])];
  const jobs = (await plan(po, [])).filter((j) => !placed.some((p) => p.key === j.key));
  if (fingerprint(jobs) !== shown) return { ok: false, error: "The order has changed since Reece priced it. Look at it again before placing it." };
  if (jobs.some((j) => j.problems.length)) return { ok: false, error: "Something on it still can't go to Reece." };
  const c: Ctx = { po, settings: await loadOrderingSettings(), today: isoDateMelbourne(), who };
  const reqs = jobs.filter((j) => j.products.length).map((j) => ({ j, req: request(j, c) }));
  const bad = reqs.find((r) => "error" in r.req);
  if (bad && "error" in bad.req) return { ok: false, error: bad.req.error };

  const now = new Date().toISOString();
  const claimed = await sbUpdateReturning<PurchaseOrder>("purchase_orders", `id=eq.${poId}&status=eq.draft`, {
    status: "approved", approved_by: who, approved_at: now, send_error: null, updated_at: now,
  });
  if (!claimed.length) return { ok: false, error: "Someone else has just sent this." };

  for (const { j, req } of reqs) {
    try {
      const r = (await reeceOrder("create", req as OrderRequest)) as { id?: number; status?: string } | null;
      placed.push({ key: j.key, job_number: j.jobNumber, reece_id: typeof r?.id === "number" ? r.id : null, status: r?.status ?? null, at: new Date().toISOString() });
      await sbUpdate("purchase_orders", `id=eq.${poId}`, { reece_orders: placed });
    } catch (e) {
      const got = placed.map((p) => `job ${p.job_number ?? "stock"} (#${p.reece_id ?? "?"})`).join(", ");
      const err = `${j.jobNumber ? `Job ${j.jobNumber}` : "The stock"} didn't go into maX: ${said(e)}.${got ? ` Already in maX: ${got}; sending again skips those.` : ""}`;
      await sbUpdate("purchase_orders", `id=eq.${poId}`, { status: "draft", approved_by: null, approved_at: null, send_error: err.slice(0, 900), updated_at: new Date().toISOString() });
      return { ok: false, error: err };
    }
  }
  const ids = placed.map((p) => (p.reece_id == null ? "?" : `#${p.reece_id}`)).join(", ");
  await sbUpdate("purchase_orders", `id=eq.${poId}`, { status: "sent", sent_at: new Date().toISOString(), sent_to: `Reece maX, ordered by the portal: ${ids}`.slice(0, 300), updated_at: new Date().toISOString() });
  await pushIfAuto(poId);
  await jobsAfterSend(poId);
  return { ok: true, note: `Ordered in Reece maX: ${placed.length} ${placed.length === 1 ? "order" : "orders"} (${ids}).` };
}
