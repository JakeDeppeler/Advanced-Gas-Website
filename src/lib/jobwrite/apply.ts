import "server-only";
import { randomUUID } from "node:crypto";
import { q, sbInsert, sbSelectOne, sbUpdate } from "@/lib/dashboard/db";
import { stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { stSaid } from "@/lib/outlook/workOrderTypes";
import { plainText } from "@/lib/pricebook/wording";
import { planOnePrice, type Doc, type DocKind, type DocLine } from "./lines";
import { readEstimate, readInvoice } from "./load";

/**
 * Putting a write-up on a quote or an invoice in ServiceTitan.
 *
 * Nothing in the portal had written to a live estimate's or invoice's lines
 * before this (19 Nov), and ServiceTitan's reference for those calls isn't
 * public, so every step is checked rather than trusted:
 *
 *   1. read the document as it is now, and stop if its one price isn't the
 *      one the page showed (someone changed it since);
 *   2. keep the summary and every line about to change in job_writeups (0120);
 *   3. write the summary, then the lines, the labour line first;
 *   4. read it all back: the total, each changed line's price, the summary,
 *      the quote's name and the number of lines must all be as intended;
 *   5. anything not as intended, or any refusal part-way, puts every line
 *      and the summary back from step 2, and says what didn't match.
 *
 * Lines are never added or removed, only re-priced (see lines.ts for why).
 */

export type ApplyResult = { ok: true; note: string } | { ok: false; error: string };

type Snapshot = { summary: string | null; name: string | null; total: number; count: number; lines: DocLine[] };

const TABLE = "job_writeups";
const cents = (n: number) => Math.round(n * 100) / 100;
const dollars = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const total = (d: Doc) => cents(d.lines.reduce((n, l) => n + l.total, 0));
const snap = (d: Doc, ids: Set<number>): Snapshot => ({ summary: d.summary, name: d.name, total: total(d), count: d.lines.length, lines: d.lines.filter((l) => ids.has(l.id)) });
const read = (kind: DocKind, id: number) => (kind === "estimate" ? readEstimate(id) : readInvoice(id));

async function writeSummary(kind: DocKind, d: Doc, html: string): Promise<void> {
  if (kind === "estimate") {
    // The name goes with it, so an update that treats a missing field as
    // blank can't clear it; the read-back checks it's still there.
    await stSend("PUT", stTenantPath("sales", `estimates/${d.id}`), { name: d.name, summary: html });
  } else {
    await stSend("PATCH", stTenantPath("accounting", `invoices/${d.id}`), { summary: html });
  }
}

type LineChange = { line: DocLine; unitPrice: number; description: string; chargeable: boolean | null };

async function writeLines(kind: DocKind, d: Doc, changes: LineChange[]): Promise<void> {
  if (!changes.length) return;
  if (kind === "estimate") {
    // One line at a time: the estimate's item call takes one item.
    for (const c of changes) {
      await stSend("PUT", stTenantPath("sales", `estimates/${d.id}/items`), {
        id: c.line.id, skuId: c.line.skuId, quantity: c.line.qty, unitPrice: c.unitPrice, unitCost: c.line.unitCost,
        description: c.description, isAddOn: c.line.isAddOn ?? false, chargeable: c.chargeable,
        itemGroupName: c.line.itemGroupName ?? null, itemGroupRootId: c.line.itemGroupRootId ?? null,
      });
    }
  } else {
    // An invoice's lines go in one update, so it is never half re-priced.
    await stSend("PATCH", stTenantPath("accounting", `invoices/${d.id}`), {
      items: changes.map((c) => ({ id: c.line.id, skuId: c.line.skuId, quantity: c.line.qty, unitPrice: c.unitPrice, description: c.description })),
    });
  }
}

/** What doesn't match between the document read back and what was meant. */
function mismatches(back: Doc, before: Snapshot, changes: LineChange[], summaryHtml: string | null): string[] {
  const out: string[] = [];
  if (Math.abs(total(back) - before.total) > 0.01) out.push(`the total came back ${dollars(total(back))}, not ${dollars(before.total)}`);
  if (back.lines.length !== before.count) out.push(`it has ${back.lines.length} lines, not ${before.count}`);
  if (back.kind === "estimate" && (back.name ?? "") !== (before.name ?? "")) out.push("the quote's name changed");
  for (const c of changes) {
    const l = back.lines.find((x) => x.id === c.line.id);
    if (!l) { out.push(`${c.line.name} is gone`); continue; }
    if (Math.abs(l.unitPrice - c.unitPrice) > 0.005) out.push(`${c.line.name} came back at ${dollars(l.unitPrice)}, not ${dollars(c.unitPrice)}`);
    if (Math.abs(l.qty - c.line.qty) > 1e-9) out.push(`${c.line.name}'s quantity changed`);
  }
  if (summaryHtml != null && plainText(back.summary) !== plainText(summaryHtml)) out.push("the summary didn't come back as written");
  return out;
}

/** Everything back as it was in the snapshot. Returns what still doesn't match, if anything. */
async function restore(kind: DocKind, now: Doc, before: Snapshot): Promise<string[]> {
  const changes: LineChange[] = before.lines.map((l) => ({ line: l, unitPrice: l.unitPrice, description: l.description, chargeable: l.chargeable }));
  try {
    if (plainText(now.summary) !== plainText(before.summary)) await writeSummary(kind, { ...now, name: before.name }, before.summary ?? "");
    await writeLines(kind, now, changes);
  } catch (e) {
    return [`putting it back was refused (${stSaid(e)})`];
  }
  const back = await read(kind, now.id).catch(() => null);
  if (!back) return ["it couldn't be read back after putting it back"];
  return mismatches(back, before, changes, before.summary ?? "");
}

export async function putOnServiceTitan(o: {
  jobId: number; jobNumber: string | null; kind: DocKind; docId: number;
  summaryHtml: string; labour: string; onePrice: boolean; expectCombined: number | null; by: string;
}): Promise<ApplyResult> {
  let doc: Doc;
  try {
    doc = await read(o.kind, o.docId);
  } catch (e) {
    return { ok: false, error: `Couldn't read the ${o.kind === "estimate" ? "quote" : "invoice"} from ServiceTitan: ${stSaid(e)}` };
  }
  const plan = planOnePrice(doc);
  if (o.onePrice && plan.blockers.length) return { ok: false, error: plan.blockers.join(" ") };
  if (o.onePrice && o.expectCombined != null && Math.abs(plan.combined - o.expectCombined) > 0.005) {
    return { ok: false, error: `The ${o.kind === "estimate" ? "quote" : "invoice"} has changed since this page was opened (its labour, materials and electrical now come to ${dollars(plan.combined)}). Open the job again.` };
  }

  // What changes: on one price, every merged line's price and the labour
  // line's words; otherwise only the labour line's words, where there is one.
  const changes: LineChange[] = [];
  const target = plan.target ?? (plan.lines.filter((l) => l.role === "labour").sort((a, b) => b.total - a.total)[0] ?? null);
  for (const l of plan.lines) {
    const isTarget = target != null && l.id === target.id;
    const price = o.onePrice ? l.newUnitPrice : l.unitPrice;
    const words = isTarget && o.labour.trim() ? o.labour.trim() : l.description;
    // A line taken to $0 reads as included, as the template's own $0 materials do.
    const chargeable = o.onePrice && l.merged && !isTarget && price === 0 && o.kind === "estimate" ? false : l.chargeable;
    if (Math.abs(price - l.unitPrice) > 0.005 || words !== l.description || chargeable !== l.chargeable) {
      changes.push({ line: l, unitPrice: price, description: words, chargeable });
    }
  }
  changes.sort((a, b) => Number(b.line.id === target?.id) - Number(a.line.id === target?.id));

  const before = snap(doc, new Set(changes.map((c) => c.line.id)));
  const id = randomUUID();
  await sbInsert(TABLE, {
    id, job_id: o.jobId, job_number: o.jobNumber, doc_kind: o.kind, doc_id: o.docId, status: "started",
    before, created_by: o.by,
  });
  const finish = (status: string, note: string | null, after: unknown = null) =>
    sbUpdate(TABLE, `id=eq.${id}`, { status, note, after, finished_at: new Date().toISOString() }).catch(() => undefined);

  const what = o.kind === "estimate" ? "quote" : "invoice";
  try {
    await writeSummary(o.kind, doc, o.summaryHtml);
    await writeLines(o.kind, doc, changes);
  } catch (e) {
    const now = await read(o.kind, o.docId).catch(() => doc);
    const left = await restore(o.kind, now, before);
    await finish(left.length ? "failed" : "restored", `${stSaid(e)}${left.length ? `; then ${left.join("; ")}` : ""}`);
    return { ok: false, error: `${stSaid(e)}. ${left.length ? `It couldn't all be put back: ${left.join("; ")}. Check the ${what} in ServiceTitan.` : `Nothing was left changed on the ${what}.`}` };
  }

  const back = await read(o.kind, o.docId).catch(() => null);
  const wrong = back ? mismatches(back, before, changes, o.summaryHtml) : ["it couldn't be read back"];
  if (wrong.length) {
    const left = back ? await restore(o.kind, back, before) : ["it couldn't be read back to put it right"];
    await finish(left.length ? "failed" : "restored", `${wrong.join("; ")}${left.length ? `; putting back: ${left.join("; ")}` : ""}`);
    return { ok: false, error: `ServiceTitan took it, but ${wrong.join("; ")}. ${left.length ? `It couldn't all be put back (${left.join("; ")}): check the ${what} in ServiceTitan.` : `Everything was put back as it was.`}` };
  }

  await finish("done", null, snap(back!, new Set(changes.map((c) => c.line.id))));
  const moved = changes.filter((c) => Math.abs(c.unitPrice - c.line.unitPrice) > 0.005).length;
  return {
    ok: true,
    note: `On the ${what}: the summary${o.labour.trim() && target ? ", the labour line's words" : ""}${moved ? ` and ${moved} ${moved === 1 ? "price" : "prices"} under one labour price of ${dollars(plan.combined)}` : ""}. The total is still ${dollars(before.total)}.`,
  };
}

/** Put a write-up back the way the document was before it. Only while nothing else has changed it. */
export async function undoWriteup(id: string): Promise<ApplyResult> {
  const row = await sbSelectOne<{ id: string; doc_kind: DocKind; doc_id: number; status: string; before: Snapshot; after: Snapshot | null }>(TABLE, [q.select("id,doc_kind,doc_id,status,before,after"), q.eq("id", id)].join("&"));
  if (!row) return { ok: false, error: "That write-up wasn't found." };
  if (row.status !== "done") return { ok: false, error: "Only a write-up that went on can be undone." };
  const what = row.doc_kind === "estimate" ? "quote" : "invoice";
  const now = await read(row.doc_kind, row.doc_id).catch(() => null);
  if (!now) return { ok: false, error: `Couldn't read the ${what} from ServiceTitan.` };
  // Changed by hand since: putting the old lines back would undo that too.
  const after = row.after;
  const edited = after && after.lines.some((a) => { const l = now.lines.find((x) => x.id === a.id); return !l || Math.abs(l.unitPrice - a.unitPrice) > 0.005; });
  if (edited || Math.abs(total(now) - row.before.total) > 0.01) return { ok: false, error: `The ${what} has been changed since, so it wasn't undone. Change it in ServiceTitan.` };
  const left = await restore(row.doc_kind, now, row.before);
  await sbUpdate(TABLE, `id=eq.${id}`, { status: left.length ? "failed" : "undone", note: left.length ? `undo: ${left.join("; ")}` : null, finished_at: new Date().toISOString() }).catch(() => undefined);
  return left.length ? { ok: false, error: `It couldn't all be put back: ${left.join("; ")}.` } : { ok: true, note: `The ${what} is back as it was.` };
}
