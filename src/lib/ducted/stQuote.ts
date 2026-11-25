import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { GROUPS, type DuctedQuote, type Line } from "./plan";

/**
 * A ducted quote written onto a job in ServiceTitan, in the shape the office
 * builds by hand (20803): each group's head is the line the customer sees and
 * carries the group's whole price; everything under it is listed at $0 so the
 * crew, the install pack and the ordering see the materials without the
 * customer seeing forty prices. Jake, 24 Nov: "i would put the job number in
 * and it would create a quote".
 *
 * ServiceTitan takes the estimate first and the lines under each head after,
 * because a line can only point at its head once the head has an id. Each
 * step is read back, so what lands is reported, never assumed.
 */

type Raw = Record<string, unknown>;
type EstItem = { id: number; sku?: { id?: number }; qty?: number; unitRate?: number; itemGroupName?: string | null; itemGroupRootId?: number | null };
type Estimate = { id: number; name?: string; subtotal?: number; createdOn?: string; items?: EstItem[] };

export type QuoteJob = {
  id: number; number: string; status: string | null; customerId: number | null; locationId: number | null; businessUnitId: number | null;
  customer: string | null; address: string | null; type: string | null;
};

const num = (v: unknown) => (v == null || v === "" ? null : Number(v) || null);
const cents = (n: number) => Math.round(n * 100) / 100;

/** The job by its number: ServiceTitan first, the synced copy if ServiceTitan doesn't filter by number. */
export async function findQuoteJob(input: string): Promise<QuoteJob | null> {
  const n = input.trim().replace(/^#/, "");
  if (!/^\d{3,9}$/.test(n)) return null;
  const live = await stFetch<{ data?: Raw[] }>(stTenantPath("jpm", "jobs"), { number: n, pageSize: "5" }).catch(() => ({ data: [] as Raw[] }));
  let job = (live.data ?? []).find((j) => String(j.jobNumber ?? j.number ?? "") === n) ?? null;
  if (!job) {
    const [row] = await sbSelect<{ id: number; raw: Raw | null }>("st_jobs", `select=id,raw&${q.eq("job_number", n)}&limit=1`).catch(() => []);
    if (row) job = await stFetch<Raw>(stTenantPath("jpm", `jobs/${row.id}`)).catch(() => row.raw ?? null);
  }
  if (!job) return null;
  const customerId = num(job.customerId), locationId = num(job.locationId);
  const [cust, loc, type] = await Promise.all([
    customerId ? stFetch<{ name?: string }>(stTenantPath("crm", `customers/${customerId}`)).catch(() => null) : null,
    locationId ? stFetch<{ address?: { street?: string; city?: string } }>(stTenantPath("crm", `locations/${locationId}`)).catch(() => null) : null,
    num(job.jobTypeId) ? sbSelect<{ name: string }>("st_job_types", `select=name&${q.eq("id", String(job.jobTypeId))}&limit=1`).catch(() => []) : [],
  ]);
  const a = loc?.address;
  return {
    id: Number(job.id), number: n, status: (job.jobStatus as string) ?? null, customerId, locationId, businessUnitId: num(job.businessUnitId),
    customer: cust?.name?.trim() || null, address: a ? [a.street, a.city].filter(Boolean).join(", ") || null : null, type: type[0]?.name ?? null,
  };
}

/** The pricebook's own wording for each line: the equipment's text is what sells it (Quote wording v2). */
async function descriptions(lines: Line[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const ids = (t: string) => [...new Set(lines.filter((l) => l.sku?.skuType === t).map((l) => l.sku!.skuId))];
  const mirror = async (table: string, list: number[]) => {
    if (!list.length) return;
    const rows = await sbSelect<{ id: number; description: string | null }>(table, `select=id,description:raw->>description&id=in.(${list.join(",")})`).catch(() => []);
    for (const r of rows) if (r.description) out.set(Number(r.id), r.description);
  };
  await Promise.all([
    mirror("st_pricebook_materials", ids("Material")),
    mirror("st_pricebook_equipment", ids("Equipment")),
    ...ids("Service").map((id) => stFetch<{ description?: string }>(stTenantPath("pricebook", `services/${id}`)).then((s) => { if (s?.description) out.set(id, s.description); }, () => undefined)),
  ]);
  return out;
}

export type Written =
  | { ok: true; estimateId: number; name: string; expected: number; landed: number | null; heads: number; under: number; underLanded: number; problems: string[] }
  | { ok: false; error: string };

/**
 * The same quote twice in a row (a double click, a retry after a slow reply)
 * would put two quotes on the job. One with the same name made on the job in
 * the last ten minutes means this one is already there.
 */
async function recentTwin(jobId: number, name: string): Promise<Estimate | null> {
  const list = await stFetch<{ data?: Estimate[] }>(stTenantPath("sales", "estimates"), { jobId: String(jobId), pageSize: "50" }).catch(() => ({ data: [] as Estimate[] }));
  const cutoff = Date.now() - 10 * 60_000;
  return (list.data ?? []).find((e) => e.name === name && Date.parse(e.createdOn ?? "") > cutoff) ?? null;
}

export async function writeDuctedQuote(job: QuoteJob, quote: DuctedQuote, name: string): Promise<Written> {
  const lines = quote.lines.filter((l) => l.sku && l.quantity > 0);
  const groups = GROUPS.map((g) => lines.filter((l) => l.group === g)).filter((g) => g.length > 0);
  if (!groups.length) return { ok: false, error: "There's nothing priced to put on the quote." };
  const twin = await recentTwin(job.id, name);
  if (twin) return { ok: false, error: `"${name}" was already put on job ${job.number} a few minutes ago (quote ${twin.id}). Open it in ServiceTitan rather than making a second.` };

  const text = await descriptions(lines);
  const heads = groups.map((ls) => ({ line: ls[0], under: ls.slice(1), price: cents(ls.reduce((a, l) => a + l.quantity * l.unitPrice, 0)) }));
  const expected = cents(heads.reduce((a, h) => a + h.price, 0));
  // Both spellings of quantity and price: ServiceTitan reads estimate lines back as qty/unitRate, and its
  // create documentation isn't public. Unknown fields are ignored, so sending both costs nothing.
  const body = (l: Line, qty: number, rate: number) => ({
    skuId: l.sku!.skuId, qty, quantity: qty, unitRate: rate, unitPrice: rate, description: text.get(l.sku!.skuId) ?? l.sku!.name,
  });

  let created: Estimate | null;
  try {
    created = await stSend<Estimate>("POST", stTenantPath("sales", "estimates"), {
      jobId: job.id, name, summary: quote.summary, businessUnitId: job.businessUnitId ?? undefined,
      items: heads.map((h) => ({ ...body(h.line, 1, h.price), itemGroupName: h.line.sku!.name.trim() })),
    });
  } catch (e) {
    return { ok: false, error: `ServiceTitan didn't take the quote: ${(e as Error).message}` };
  }
  const estimateId = Number(created?.id) || Number((await recentTwin(job.id, name))?.id) || 0;
  if (!estimateId) return { ok: false, error: "ServiceTitan accepted the quote but didn't say which it is. Check the job before trying again." };

  const problems: string[] = [];
  const read = () => stFetch<Estimate>(stTenantPath("sales", `estimates/${estimateId}`)).catch(() => null);
  const first = await read();
  const items = first?.items ?? [];
  const used = new Set<number>();
  const headIds = heads.map((h) => {
    const it = items.find((i) => !used.has(i.id) && i.sku?.id === h.line.sku!.skuId);
    if (it) used.add(it.id);
    return it?.id ?? null;
  });
  if (items.length < heads.length) problems.push(`Only ${items.length} of the ${heads.length} group heads are on the quote.`);
  if (items.length && !items.some((i) => i.itemGroupName)) problems.push("ServiceTitan didn't make the heads into item groups, so the lines under them couldn't be grouped.");

  // The lines under each head, at $0, pointing at their head.
  let underLanded = 0;
  const under = heads.reduce((a, h) => a + h.under.length, 0);
  outer: for (const [i, h] of heads.entries()) {
    const root = headIds[i];
    if (!root) continue;
    for (const l of h.under) {
      try {
        await stSend("PUT", stTenantPath("sales", `estimates/${estimateId}/items`), { ...body(l, l.quantity, 0), chargeable: false, itemGroupRootId: root });
        underLanded++;
      } catch (e) {
        problems.push(`The lines under "${h.line.sku!.name.trim()}" didn't go on: ${(e as Error).message}. The price is all on the group heads, so the total stands; add the materials by hand.`);
        break outer;
      }
    }
  }

  const last = await read();
  const landed = last?.subtotal != null ? Number(last.subtotal) : last?.items ? cents(last.items.reduce((a, i) => a + Number(i.qty ?? 0) * Number(i.unitRate ?? 0), 0)) : null;
  if (landed != null && Math.abs(landed - expected) > 0.5) problems.push(`ServiceTitan shows $${landed.toFixed(2)} where the portal priced $${expected.toFixed(2)}.`);
  const grouped = (last?.items ?? []).filter((i) => i.itemGroupRootId).length;
  if (underLanded && grouped < underLanded) problems.push(`${underLanded - grouped} of the lines went on outside their group.`);

  return { ok: true, estimateId, name, expected, landed, heads: heads.length, under, underLanded, problems };
}

/** A line on the job, so whoever opens it sees where the quote came from. */
export async function noteDuctedQuote(jobId: number, text: string): Promise<boolean> {
  return stSend("POST", stTenantPath("jpm", `jobs/${jobId}/notes`), { text, pinToTop: false }).then(() => true, () => false);
}
