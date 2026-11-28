import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { GROUPS, type DuctedQuote, type Line } from "./plan";

/**
 * A ducted quote written onto a job in ServiceTitan, in its item groups: the
 * customer sees one line per group, with its total. Since 25 Nov each line
 * goes on at its own price, as Jake laid out job 20867: the installation head
 * at $0, the two-day labour, the electrician and every material priced under
 * it so the office can see what they cost, the temperature controls at $0.
 * (Until then every price was put on the head and the lines under it at $0,
 * which hid the materials, the thing Jake wanted to see.) Jake, 24 Nov: "i
 * would put the job number in and it would create a quote".
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
  const heads = groups.map((ls) => ({ line: ls[0], under: ls.slice(1) }));
  const expected = cents(lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0));
  // Both spellings of quantity and price: ServiceTitan reads estimate lines back as qty/unitRate, and its
  // create documentation isn't public. Unknown fields are ignored, so sending both costs nothing.
  const body = (l: Line, qty: number, rate: number) => ({
    skuId: l.sku!.skuId, qty, quantity: qty, unitRate: rate, unitPrice: rate, description: text.get(l.sku!.skuId) ?? l.sku!.name,
  });

  let created: Estimate | null;
  try {
    created = await stSend<Estimate>("POST", stTenantPath("sales", "estimates"), {
      jobId: job.id, name, summary: quote.summary, businessUnitId: job.businessUnitId ?? undefined,
      items: heads.map((h) => ({ ...body(h.line, h.line.quantity, h.line.unitPrice), itemGroupName: h.line.sku!.name.trim() })),
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

  // The lines under each head, at their own prices, pointing at their head.
  let underLanded = 0;
  let short = false;
  const under = heads.reduce((a, h) => a + h.under.length, 0);
  outer: for (const [i, h] of heads.entries()) {
    const root = headIds[i];
    if (!root) continue;
    for (const l of h.under) {
      try {
        await stSend("PUT", stTenantPath("sales", `estimates/${estimateId}/items`), { ...body(l, l.quantity, l.unitPrice), itemGroupRootId: root });
        underLanded++;
      } catch (e) {
        problems.push(`The lines under "${h.line.sku!.name.trim()}" didn't go on: ${(e as Error).message}.`);
        short = true;
        break outer;
      }
    }
  }

  // Each line carries its own price now, so a quote missing lines is short of
  // labour or materials. It's dismissed rather than left on the job looking real.
  if (short) {
    const gone = await stSend("PUT", stTenantPath("sales", `estimates/${estimateId}/dismiss`), {}).then(() => true, () => false);
    return { ok: false, error: `${problems.join(" ")} ${gone ? "The half-made quote was dismissed, so nothing short is left on the job." : `The half-made quote (${estimateId}) couldn't be dismissed: dismiss it in ServiceTitan.`}` };
  }

  const last = await read();
  const landed = last?.subtotal != null ? Number(last.subtotal) : last?.items ? cents(last.items.reduce((a, i) => a + Number(i.qty ?? 0) * Number(i.unitRate ?? 0), 0)) : null;
  if (landed != null && Math.abs(landed - expected) > 0.5) problems.push(`ServiceTitan shows $${landed.toFixed(2)} where the portal priced $${expected.toFixed(2)}.`);
  const grouped = (last?.items ?? []).filter((i) => i.itemGroupRootId).length;
  if (underLanded && grouped < underLanded) problems.push(`${underLanded - grouped} of the lines went on outside their group.`);

  return { ok: true, estimateId, name, expected, landed, heads: heads.length, under, underLanded, problems };
}

type Head = { line: Line; under: Line[] };
const groupsOf = (quote: DuctedQuote): Head[] => {
  const lines = quote.lines.filter((l) => l.sku && l.quantity > 0);
  return GROUPS.map((g) => lines.filter((l) => l.group === g)).filter((g) => g.length > 0).map((ls) => ({ line: ls[0], under: ls.slice(1) }));
};
const itemBody = (text: Map<number, string>, l: Line) => ({
  skuId: l.sku!.skuId, qty: l.quantity, quantity: l.quantity, unitRate: l.unitPrice, unitPrice: l.unitPrice, description: text.get(l.sku!.skuId) ?? l.sku!.name,
});

export type EstimateState =
  | { ok: true; id: number; name: string; status: string | null; sold: boolean; dismissed: boolean; subtotal: number | null }
  | { ok: false; error: string };

/** The quote as it is in ServiceTitan now: still open, sold, or dismissed. */
export async function estimateState(estimateId: number): Promise<EstimateState> {
  type Read = Omit<Estimate, "status"> & { status?: { name?: string } | string; active?: boolean; soldOn?: string | null };
  const e = await stFetch<Read>(stTenantPath("sales", `estimates/${estimateId}`)).catch(() => null);
  if (!e?.id) return { ok: false, error: `Quote ${estimateId} isn't in ServiceTitan any more.` };
  const status = typeof e.status === "string" ? e.status : e.status?.name ?? null;
  return {
    ok: true, id: e.id, name: e.name ?? "", status, sold: /sold/i.test(status ?? "") || !!e.soldOn,
    dismissed: /dismiss/i.test(status ?? "") || e.active === false, subtotal: e.subtotal != null ? Number(e.subtotal) : null,
  };
}

/**
 * Update quote, on the same quote (Jake, 28 Nov: "if i move vents or add i can
 * push a button and it will update the quote"). The new lines go on first,
 * each head then the lines under it, and only once every one has landed do
 * the old lines come off, so the quote is never left half old and half new:
 * if a new line won't go on, the new ones come back off and the old quote is
 * left as it was. A sold or dismissed quote is never touched.
 */
export async function replaceDuctedQuote(job: QuoteJob, estimateId: number, quote: DuctedQuote, name: string): Promise<Written> {
  const heads = groupsOf(quote);
  if (!heads.length) return { ok: false, error: "There's nothing priced to put on the quote." };
  const state = await estimateState(estimateId);
  if (!state.ok) return state;
  if (state.sold) return { ok: false, error: `Quote ${estimateId} is sold, so it's left as it is. Make a new quote instead.` };
  if (state.dismissed) return { ok: false, error: `Quote ${estimateId} was dismissed. Make a new quote instead.` };

  const path = stTenantPath("sales", `estimates/${estimateId}`);
  const read = () => stFetch<Estimate>(path).catch(() => null);
  const before = (await read())?.items ?? [];
  const old = new Set(before.map((i) => i.id));
  const text = await descriptions(heads.flatMap((h) => [h.line, ...h.under]));
  const added: number[] = [];
  const problems: string[] = [];
  const newest = async (skuId: number) => {
    const now = (await read())?.items ?? [];
    return now.find((i) => !old.has(i.id) && !added.includes(i.id) && i.sku?.id === skuId)?.id ?? null;
  };

  let failed: string | null = null;
  let underLanded = 0;
  const under = heads.reduce((a, h) => a + h.under.length, 0);
  outer: for (const h of heads) {
    try {
      await stSend("PUT", `${path}/items`, { ...itemBody(text, h.line), itemGroupName: h.line.sku!.name.trim() });
    } catch (e) { failed = `"${h.line.sku!.name.trim()}" didn't go on: ${(e as Error).message}`; break; }
    const root = await newest(h.line.sku!.skuId);
    if (!root) { failed = `ServiceTitan took "${h.line.sku!.name.trim()}" but it couldn't be found on the quote after`; break; }
    added.push(root);
    for (const l of h.under) {
      try {
        await stSend("PUT", `${path}/items`, { ...itemBody(text, l), itemGroupRootId: root });
        underLanded++;
      } catch (e) { failed = `The lines under "${h.line.sku!.name.trim()}" didn't go on: ${(e as Error).message}`; break outer; }
    }
  }

  // Lines under a head come off before their head.
  const takeOff = async (ids: number[], items: EstItem[]) => {
    const root = new Set(items.filter((i) => !i.itemGroupRootId).map((i) => i.id));
    const order = [...ids].sort((a, b) => Number(root.has(a)) - Number(root.has(b)));
    let left = 0;
    for (const id of order) await stSend("DELETE", `${path}/items/${id}`, null).catch(() => { left++; });
    return left;
  };

  if (failed) {
    // Everything on it now that wasn't before is this update's, heads and the lines under them.
    const now = (await read())?.items ?? [];
    const left = await takeOff(now.filter((i) => !old.has(i.id)).map((i) => i.id), now);
    return { ok: false, error: `${failed}. ${left ? `${left} of the new lines couldn't be taken back off quote ${estimateId}: check it in ServiceTitan.` : `The new lines came back off, so quote ${estimateId} is as it was.`}` };
  }

  const left = await takeOff([...old], before);
  if (left) problems.push(`${left} of the old lines couldn't be taken off: remove them in ServiceTitan, or the quote counts them twice.`);
  try {
    await stSend("PUT", path, { name, summary: quote.summary });
  } catch (e) { problems.push(`The summary didn't update: ${(e as Error).message}.`); }

  const expected = cents(heads.flatMap((h) => [h.line, ...h.under]).reduce((a, l) => a + l.quantity * l.unitPrice, 0));
  const last = await read();
  const landed = last?.subtotal != null ? Number(last.subtotal) : last?.items ? cents(last.items.reduce((a, i) => a + Number(i.qty ?? 0) * Number(i.unitRate ?? 0), 0)) : null;
  if (landed != null && Math.abs(landed - expected) > 0.5) problems.push(`ServiceTitan shows $${landed.toFixed(2)} where the portal priced $${expected.toFixed(2)}.`);
  return { ok: true, estimateId, name, expected, landed, heads: heads.length, under, underLanded, problems };
}

/** Dismiss a quote the office has replaced with a new one. */
export async function dismissEstimate(estimateId: number): Promise<boolean> {
  return stSend("PUT", stTenantPath("sales", `estimates/${estimateId}/dismiss`), {}).then(() => true, () => false);
}

/** A line on the job, so whoever opens it sees where the quote came from. */
export async function noteDuctedQuote(jobId: number, text: string): Promise<boolean> {
  return stSend("POST", stTenantPath("jpm", `jobs/${jobId}/notes`), { text, pinToTop: false }).then(() => true, () => false);
}
