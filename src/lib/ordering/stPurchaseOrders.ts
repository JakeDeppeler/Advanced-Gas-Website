import "server-only";
import { sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getOrder, loadOrderingSettings, type PoWithLines } from "./db";

/**
 * A sent order, put into ServiceTitan as purchase orders: one for each job on
 * it, carrying that job's lines and going on that job, and one for any stock
 * for the factory, going to the warehouse. The portal still emails the
 * supplier; this is so ServiceTitan's job shows what was ordered for it.
 *
 * This is the portal's first write into ServiceTitan's inventory, and the
 * request shape can't be tried from anywhere but the live tenant, so it's
 * built to be safe to get wrong: nothing goes until someone presses the button
 * (or switches it on for every order), a purchase order already made is never
 * made again (st_pos, migration 0073), and ServiceTitan's own refusal is shown
 * on the order word for word. ServiceTitan drops fields it doesn't know, so the
 * request carries every field its purchase order screen asks for.
 */

export type StPoSettings = {
  /** Put every order into ServiceTitan as it's sent, rather than on the button. */
  auto: boolean;
  /** The purchase order type ServiceTitan files them under. */
  typeId: number | null;
  /** The inventory location (warehouse) the stock goes to and the jobs' parts come through. */
  warehouseId: number | null;
  /** The business unit for factory stock, which has no job to take one from. */
  stockBusinessUnitId: number | null;
  /** The ServiceTitan vendor for each supplier, when it isn't found by name. */
  vendorIds: Record<string, number>;
};

export type StPoMade = { job_id: number | null; st_id: number | null; number: string | null };

const KEY = "st_purchase_orders";

export async function loadStPoSettings(): Promise<StPoSettings> {
  const s = await getSettings<Partial<StPoSettings>>(KEY).catch(() => null);
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    auto: s?.auto === true,
    typeId: n(s?.typeId), warehouseId: n(s?.warehouseId), stockBusinessUnitId: n(s?.stockBusinessUnitId),
    vendorIds: Object.fromEntries(Object.entries(s?.vendorIds ?? {}).filter(([, v]) => typeof v === "number")) as Record<string, number>,
  };
}

export async function saveStPoSettings(s: StPoSettings): Promise<boolean> {
  return (await saveSettings(KEY, s)).ok;
}

type Named = { id: number; name: string; active?: boolean };

/**
 * The purchase order types, warehouses and vendors ServiceTitan has, for the
 * settings. A refusal here is a missing scope on the API app, and says which.
 */
export async function stPoOptions(): Promise<{ ok: true; types: Named[]; warehouses: Named[]; vendors: Named[] } | { ok: false; error: string }> {
  const get = async (resource: string, label: string) => {
    try {
      return (await stList<Named>("inventory", resource, { active: "True" }, 5)).map((x) => ({ id: x.id, name: x.name, active: x.active }));
    } catch (e) {
      const m = String((e as Error).message);
      if (/\b403\b/.test(m)) throw new Error(`ServiceTitan won't let the portal read ${label}. Tick Inventory › ${label} on the portal's API app in the ServiceTitan developer portal, and have it re-authorised.`);
      throw new Error(`ServiceTitan didn't answer for ${label} (${m.replace(/^ServiceTitan [^:]+: /, "")}).`);
    }
  };
  try {
    const [types, warehouses, vendors] = await Promise.all([
      get("purchase-order-types", "Purchase Order Types"), get("warehouses", "Warehouses"), get("vendors", "Vendors"),
    ]);
    return { ok: true, types, warehouses, vendors };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

type Address = { street: string; unit: string | null; city: string; state: string; zip: string; country: string };

/** "1 Sierra Circuit, Pakenham VIC 3810" → its parts, for ServiceTitan's address; null when it won't split. */
function splitAddress(a: string | null | undefined): Address | null {
  const m = (a ?? "").trim().match(/^(.*?),\s*(.+?)\s+([A-Z]{2,3})\s+(\d{4})$/);
  return m ? { street: m[1], unit: null, city: m[2], state: m[3], zip: m[4], country: "Australia" } : null;
}

type JobInfo = { id: number; job_number: string; bu: string | null; tech: string | null; addr: Record<string, unknown> | null };

async function jobsInfo(ids: number[]): Promise<Map<number, JobInfo>> {
  if (!ids.length) return new Map();
  const jobs = await sbSelect<{ id: number; job_number: string; raw: Record<string, unknown> }>("st_jobs", `select=id,job_number,raw&id=in.(${ids.join(",")})`);
  const locIds = [...new Set(jobs.map((j) => Number(j.raw?.locationId)).filter((x) => Number.isFinite(x) && x > 0))];
  const locs = locIds.length ? await sbSelect<{ id: number; raw: Record<string, unknown> }>("st_locations", `select=id,raw&id=in.(${locIds.join(",")})`) : [];
  const addr = new Map(locs.map((l) => [l.id, (l.raw?.address as Record<string, unknown>) ?? null]));
  return new Map(jobs.map((j) => [j.id, {
    id: j.id, job_number: j.job_number, bu: j.raw?.businessUnitId != null ? String(j.raw.businessUnitId) : null, tech: null,
    addr: addr.get(Number(j.raw?.locationId)) ?? null,
  }]));
}

/**
 * Every vendor the pricebook names, by name: each item carries its primary
 * vendor with ServiceTitan's id, so a supplier can be matched without the
 * vendor list (which needs its own scope).
 */
async function pricebookVendors(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const table of ["st_pricebook_equipment", "st_pricebook_materials"]) {
    const rows = await sbSelect<{ v: { vendorId?: number; vendorName?: string } | null }>(table, "select=v:raw->primaryVendor&raw->primaryVendor=not.is.null&limit=3000").catch(() => []);
    for (const r of rows) if (r.v?.vendorId && r.v.vendorName) out.set(r.v.vendorName.trim().toLowerCase(), r.v.vendorId);
  }
  return out;
}

/** Each supplier's ServiceTitan vendor found by one of its ServiceTitan names (0065), before any set by hand. */
export async function vendorsByName(): Promise<Record<string, number | null>> {
  const [sups, known] = await Promise.all([
    sbSelect<{ id: string; name: string; st_vendor_names: string[] | null }>("order_suppliers", "select=id,name,st_vendor_names"),
    pricebookVendors(),
  ]);
  return Object.fromEntries(sups.map((x) => {
    const names = [...(x.st_vendor_names ?? []), x.name].map((n) => n.trim().toLowerCase());
    return [x.id, names.map((n) => known.get(n)).find((v) => v != null) ?? null];
  }));
}

async function vendorFor(supplierId: string, s: StPoSettings): Promise<number | null> {
  return s.vendorIds[supplierId] ?? (await vendorsByName())[supplierId] ?? null;
}

/**
 * Put one sent order into ServiceTitan. Groups already made are skipped, so
 * running it again after a refusal only makes what's missing.
 */
export async function pushOrderToServiceTitan(poId: number): Promise<{ ok: boolean; made: StPoMade[]; error?: string }> {
  const po = (await getOrder(poId)) as (PoWithLines & { st_pos?: StPoMade[] | null }) | null;
  if (!po) return { ok: false, made: [], error: "That order couldn't be found." };
  if (po.kind !== "order") return { ok: false, made: [], error: "Only supplier orders go into ServiceTitan, not the electrician's work orders." };
  if (po.status !== "sent" && po.status !== "approved") return { ok: false, made: [], error: "Send the order first." };

  const s = await loadStPoSettings();
  const fail = async (error: string, made: StPoMade[]) => {
    await sbUpdate("purchase_orders", `id=eq.${poId}`, { st_error: error.slice(0, 900), st_pos: made });
    return { ok: false, made, error };
  };
  const made: StPoMade[] = Array.isArray(po.st_pos) ? [...po.st_pos] : [];
  if (!s.typeId || !s.warehouseId) return fail("Pick the purchase order type and the warehouse on Supplier emails › ServiceTitan purchase orders first.", made);
  const vendorId = await vendorFor(po.supplier_id, s);
  if (!vendorId) return fail("This supplier isn't matched to a vendor in ServiceTitan — pick it on Supplier emails › ServiceTitan purchase orders.", made);

  const settings = await loadOrderingSettings();
  // The order's own delivery address when it reads as one, else the factory's.
  const factory = splitAddress(po.delivery_address) ?? splitAddress(settings.deliveryAddress)
    ?? { street: settings.deliveryAddress, unit: null, city: "", state: "VIC", zip: "", country: "Australia" };
  const withSku = po.lines.filter((l) => l.sku_id != null);
  const skipped = po.lines.length - withSku.length;
  const groups = new Map<number | null, typeof withSku>();
  for (const l of withSku) groups.set(l.job_id, [...(groups.get(l.job_id) ?? []), l]);
  const jobs = await jobsInfo([...groups.keys()].filter((k): k is number => k != null));
  const errors: string[] = [];

  for (const [jobId, lines] of groups) {
    if (made.some((m) => m.job_id === jobId)) continue;
    const job = jobId != null ? jobs.get(jobId) : null;
    const bu = job?.bu ? Number(job.bu) : s.stockBusinessUnitId;
    if (!bu) { errors.push(jobId == null ? "Factory stock needs a business unit — pick one on Supplier emails › ServiceTitan purchase orders." : `Job ${job?.job_number ?? jobId} has no business unit in ServiceTitan.`); continue; }
    const site = po.delivery_to_site && job?.addr ? job.addr : null;
    const install = lines.map((l) => l.appointment_start ?? l.install_date).filter(Boolean).sort()[0] ?? null;
    const body = {
      vendorId, typeId: s.typeId, businessUnitId: bu,
      inventoryLocationId: s.warehouseId, warehouseId: s.warehouseId,
      ...(jobId != null ? { jobId } : {}),
      shipTo: {
        description: site ? `Job ${job?.job_number} site` : po.pickup ? "We collect it" : "Our factory",
        address: site
          ? { street: String(site.street ?? ""), unit: (site.unit as string | null) ?? null, city: String(site.city ?? ""), state: String(site.state ?? ""), zip: String(site.zip ?? ""), country: String(site.country ?? "Australia") }
          : factory,
      },
      vendorDocumentNumber: po.po_number,
      impactsTechnicianPayroll: false,
      memo: `Portal order ${po.po_number}${job ? ` for job ${job.job_number}` : " — stock for the factory"}. Sent to ${po.sent_to ?? "the supplier"}.`,
      date: po.sent_at ?? new Date().toISOString(),
      requiredOn: install ? new Date(install.length === 10 ? `${install}T00:00:00+10:00` : install).toISOString() : po.sent_at ?? new Date().toISOString(),
      tax: 0, shipping: 0,
      items: lines.map((l) => ({
        skuId: l.sku_id, description: l.sku_name ?? l.description ?? "", vendorPartNumber: l.supplier_part ?? l.supplier_model ?? "",
        quantity: l.qty, cost: l.unit_cost ?? 0,
      })),
    };
    try {
      const res = await stSend<{ id?: number; number?: string } | null>("POST", stTenantPath("inventory", "purchase-orders"), body);
      made.push({ job_id: jobId, st_id: res?.id ?? null, number: res?.number ?? (res?.id != null ? String(res.id) : null) });
    } catch (e) {
      const m = String((e as Error).message).replace(/^ServiceTitan POST [^ ]+ failed: /, "");
      errors.push(`${job ? `Job ${job.job_number}` : "Factory stock"}: ${/\b403\b/.test(m) ? "ServiceTitan won't let the portal make purchase orders — tick Inventory › Purchase Orders (write) on the portal's API app." : m}`);
      // A refusal for one group is almost always the same for the rest; stop
      // rather than make the same mistake once per job.
      break;
    }
  }

  const note = skipped ? ` ${skipped} line${skipped === 1 ? " has" : "s have"} no pricebook item, so ${skipped === 1 ? "it" : "they"} can't go on a ServiceTitan purchase order.` : "";
  await sbUpdate("purchase_orders", `id=eq.${poId}`, {
    st_pos: made, st_error: errors.length ? `${errors.join(" ")}${note}`.slice(0, 900) : note ? note.trim() : null, st_pushed_at: new Date().toISOString(),
  });
  return errors.length ? { ok: false, made, error: errors.join(" ") } : { ok: true, made };
}

/** After a send: put it in ServiceTitan when that's switched on. Never fails the send. */
export async function pushIfAuto(poId: number): Promise<void> {
  try {
    if ((await loadStPoSettings()).auto) await pushOrderToServiceTitan(poId);
  } catch {
    // The order went to the supplier; ServiceTitan can be retried from Sent.
  }
}
