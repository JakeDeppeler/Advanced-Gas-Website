import "server-only";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { sbInsert, sbSelect, sbSelectOne, sbUpdateReturning } from "@/lib/dashboard/db";
import { toBillJobs } from "@/lib/dashboard/toBill";
import { loadPipeline } from "@/lib/pipeline/store";
import { isLow, listStock } from "@/lib/portal/stock";
import { listStockLines, shelfMatch } from "@/lib/ordering/stockLines";
import { addStockLine, draftFor, loadSuppliers } from "@/lib/ordering/db";
import { ordersToUpdate, updateJobs } from "@/lib/ordering/stJobNotes";
import { findMoves, type Move } from "@/lib/ordering/moveNotices";
import { approveAndSend, emailDateChange, noteBookedFor, sendReadyNotice } from "@/lib/ordering/send";
import { doneNoticeEmail, nextWeek, workRef, type WorkOrderDetails } from "@/lib/ordering/plan";
import { autoFor, bookedDays, loadSparkyAuto, loadWoContacts, techAssigned } from "@/lib/ordering/workOrders";
import { site } from "@/lib/site";
import { owedInvoices } from "@/lib/portal/run/money";
import { cleanCell } from "@/components/portal/fleetStatus";
import { listContacts } from "@/lib/contacts/store";
import { lastWords, nextDue, touchState } from "@/lib/contacts/types";
import { matchName } from "@/lib/portal/crewFile/match";
import { MAX_LISTS, createAutoTodo, officeIds, saveTodoLists, setDone, teamPeople, todoLists } from "@/lib/todos/store";
import { FINANCE_LIST, FOLLOW_UP_LIST, type Person } from "@/lib/todos/types";
import { getSettings, latestChecksForVans, listVehicles, saveSettings } from "@/lib/portal/db";
import { FOLLOW_UPS, followUps, ruleNext, type PipeQuote } from "@/lib/pipeline/types";
import { NOTIFY_DEFAULT, loadMade, loadSwitches, logAuto, saveMade, type AutoEntry, type AutoKey, type AutoSwitches } from "./log";
import { clearApprovedQuoteTags } from "./quoteTag";
import { loadFlow, saveFlow, type FlowEntry } from "@/lib/todos/flow";
import { getTodo, updateTodo } from "@/lib/todos/store";
import { isSold } from "@/lib/pipeline/types";

/**
 * Settings › Automatic: the jobs that turn something the portal can already
 * see into a to-do for the person who should act on it, plus two that act
 * themselves (a low shelf line onto next week's order, and the "ordered" tags
 * on jobs whose order went).
 *
 * Each item is keyed and written once (log.ts › loadMade), so a sync every ten
 * minutes doesn't fill a list with the same to-do. Each job is capped per run:
 * when one is first switched on against a backlog, the backlog arrives over a
 * few runs rather than as fifty cards at once.
 */

const PER_RUN = 12;
const DAY = 86_400_000;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY);
const melHour = () => Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hourCycle: "h23" }).format(new Date()));
const melDow = (today: string) => new Date(`${today}T12:00:00Z`).getUTCDay();
const dayLabel = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const who = (q: Pick<PipeQuote, "customer" | "suburb" | "jobNumber">) => [q.customer ?? (q.jobNumber ? `job #${q.jobNumber}` : "a customer"), q.suburb].filter(Boolean).join(", ");

type Ctx = {
  sw: AutoSwitches;
  /** Who the Finance list's to-dos go to. */
  accounts: Person | null;
  today: string;
  made: Map<string, string>;
  log: AutoEntry[];
  people: Person[];
  office: Person | null;
  lists: string[];
  /** Account to-dos following their quote through (todos/flow.ts): read once, saved at the end. */
  flow: Record<string, FlowEntry>;
  /** What was emailed to a supplier or trade by itself this run, for the "it went" notice. */
  sent: { head: string; detail: string }[];
  /** Left for a person to send, said in the same email so it isn't missed. */
  held: { head: string; detail: string }[];
};

/** What to find a quote by in ServiceTitan: its job, or for one written on the customer, the customer. */
const ref = (q: Pick<PipeQuote, "jobNumber" | "customerId">) => (q.jobNumber ? `Job #${q.jobNumber} · ` : q.customerId ? `No job yet, customer #${q.customerId} · ` : "");

/** The office's own list for sales follow-ups ("Quoting"), and the general one for everything else. */
const listFor = (ctx: Ctx, sales: boolean, accounts = false, booking = false) => {
  if (accounts) return ctx.lists.find((l) => l === ACCOUNTS) ?? null;
  // A sold job to book goes on the office's booking list ("Jobs to Book") when there is one.
  if (booking) { const b = ctx.lists.find((l) => /\bbook/i.test(l)); if (b) return b; }
  const quoting = ctx.lists.find((l) => /quot|sales/i.test(l));
  const other = ctx.lists.find((l) => l !== quoting);
  return (sales ? quoting ?? ctx.lists[0] : other ?? ctx.lists[0]) ?? null;
};

/** A name from ServiceTitan or a follow-up, to the person on the team list, if exactly one fits. */
const personNamed = (ctx: Ctx, name: string | null | undefined): Person | null => {
  if (!name) return null;
  const hit = matchName(name, ctx.people.map((p) => p.name));
  return hit ? ctx.people.find((p) => p.name === hit) ?? null : null;
};

async function todo(ctx: Ctx, kind: AutoKey, key: string, t: { title: string; notes?: string; to: Person | null; sales?: boolean; accounts?: boolean; booking?: boolean; list?: string; dueOn?: string; jobId?: number; onMade?: (id: string | null) => void }): Promise<boolean> {
  if (ctx.made.has(key)) return false;
  const to = t.to ?? (t.accounts ? ctx.accounts : null) ?? ctx.office;
  if (!to) return false;
  try {
    const id = await createAutoTodo({ title: t.title, notes: t.notes ?? null, assigneeId: to.id, dueOn: t.dueOn ?? ctx.today, list: (t.list && ctx.lists.includes(t.list) ? t.list : null) ?? listFor(ctx, !!t.sales, !!t.accounts, !!t.booking) ?? listFor(ctx, false) });
    t.onMade?.(id);
    ctx.made.set(key, new Date().toISOString());
    ctx.log.push({ at: new Date().toISOString(), kind, ok: true, jobId: t.jobId, title: `To-do for ${to.name.split(" ")[0]}: ${t.title}` });
    return true;
  } catch (e) {
    ctx.log.push({ at: new Date().toISOString(), kind, ok: false, jobId: t.jobId, title: `Couldn't write the to-do: ${t.title}`, detail: (e as Error).message.slice(0, 200) });
    return false;
  }
}

/**
 * The invoicing and overdue to-dos go on a list of their own, so they're the
 * accounts person's and nobody else's. Added to the board the first time
 * either job is on; a board already at its five lists keeps them on the
 * general list instead.
 */
export const ACCOUNTS = FINANCE_LIST;
export const FOLLOW_UP = FOLLOW_UP_LIST;
async function ensureLists(lists: string[], sw: AutoSwitches): Promise<string[]> {
  const want = [
    ...((sw.notInvoiced || sw.overdueInv) ? [ACCOUNTS] : []),
    ...(sw.quoteFollow ? [FOLLOW_UP] : []),
  ].filter((l) => !lists.includes(l));
  if (!want.length) return lists;
  const next = [...lists, ...want].slice(0, MAX_LISTS);
  if (next.length === lists.length) return lists;
  return (await saveTodoLists(next).catch(() => ({ ok: false }))).ok ? next : lists;
}

/* -------------------------------------------------------------- the jobs */

/** Sold three or more days ago and nothing booked from it: book it in before the customer wonders. */
async function soldNotBooked(ctx: Ctx, pipe: PipeQuote[]) {
  let n = 0;
  for (const q of pipe) {
    if (n >= PER_RUN) break;
    if (q.stage !== "won" || !q.soldOn) continue;
    const age = daysBetween(q.soldOn, ctx.today);
    // A day on is when the office should be booking it; it moves to Jobs to Book then.
    if (age < 1 || age > 45) continue;
    if (await todo(ctx, "soldNotBooked", `sold:${q.key}`, {
      title: `Book in ${who(q)}, sold ${age} days ago`,
      notes: [`${ref(q)}${q.what ?? "Sold quote"}${q.value ? ` · ${money(q.value)}` : ""}.`, `Sold ${dayLabel(q.soldOn)} and nothing's been booked from it yet. It's in Pipeline › Sold, to be booked.`].join("\n"),
      to: null, sales: true, booking: true, jobId: q.jobId ?? undefined,
      // Followed through: once it's booked it moves to Finance to invoice.
      onMade: (id) => { if (id) ctx.flow[id] = { key: q.key, step: "book" }; },
    })) n++;
  }
}

/**
 * Finished before today and still no invoice: by the next morning it should
 * have gone. The to-do ticks itself off once the job's off the list: invoiced,
 * or found to be a visit whose sale was booked as a job of its own, which is
 * billed when that one's done.
 */
const BILL_TODOS = "automation_bill_todos";
async function notInvoiced(ctx: Ctx) {
  const rows = await toBillJobs();
  const open = (await getSettings<Record<string, string>>(BILL_TODOS).catch(() => null)) ?? {};
  const still = new Set(rows.map((r) => String(r.id)));
  for (const [job, id] of Object.entries(open)) {
    if (still.has(job)) continue;
    await setDone(id, true, "Automatic").catch(() => false);
    delete open[job];
  }
  let n = 0;
  for (const r of rows) {
    if (n >= PER_RUN) break;
    const done = isoDateMelbourne(new Date(r.at));
    if (done >= ctx.today || daysBetween(done, ctx.today) > 14) continue;
    if (await todo(ctx, "notInvoiced", `bill:${r.id}`, {
      title: `Invoice job ${r.jobNumber ?? r.id}${r.customer ? `, ${r.customer}` : ""}`,
      notes: `${r.jobType ?? "Job"}${r.suburb ? ` in ${r.suburb}` : ""}, finished ${dayLabel(done)}${r.value ? `, sold at ${money(r.value)}` : ""}. No invoice in ServiceTitan yet.`,
      to: null, accounts: true, jobId: r.id,
      onMade: (id) => { if (id) open[String(r.id)] = id; },
    })) n++;
  }
  await saveSettings(BILL_TODOS, open).catch(() => undefined);
}

/**
 * A shelf line at or under its low mark with nothing on order goes onto next
 * week's draft for the supplier it last came from, the same quantity as last
 * time. Only a draft: nothing goes to a supplier until it's approved. A line
 * never ordered before has no supplier to go to, so it's a to-do instead.
 */
async function factoryMin(ctx: Ctx) {
  const [shelf, lines, suppliers] = await Promise.all([listStock(), listStockLines(), loadSuppliers()]);
  if (!shelf) return;
  const open = lines.filter((l) => !l.receivedAt);
  const week = nextWeek(new Date());
  let n = 0;
  for (const i of shelf.filter(isLow)) {
    if (n >= PER_RUN) break;
    if (open.some((l) => shelfMatch(l, [i]))) continue;
    const key = `stock:${i.id}:${i.countedAt ?? ""}`;
    if (ctx.made.has(key)) continue;
    const label = [i.brand, i.name].filter(Boolean).join(" ");
    const last = [...lines].reverse().find((l) => shelfMatch(l, [i]));
    if (!last) {
      if (await todo(ctx, "factoryMin", key, { title: `Order more ${label}`, notes: `${i.qty} ${i.unit} left on the shelf, low at ${i.minQty}. It's never been ordered through the portal, so there's no supplier to put it on: add it on Orders › To order with + Add stock.`, to: null })) n++;
      continue;
    }
    try {
      const po = await draftFor(last.supplierId, week);
      const ok = await addStockLine(po, { sku_id: null, name: last.name, model: last.model, part: null, cost: last.unitCost, kind: last.type, qty: last.qty });
      if (!ok) throw new Error("The draft had already been approved");
      ctx.made.set(key, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "factoryMin", ok: true, title: `Added ${last.qty} × ${label} to next week's ${suppliers.find((x) => x.id === last.supplierId)?.name ?? last.supplierId} order`, detail: `${i.qty} ${i.unit} left, low at ${i.minQty}. Same supplier and quantity as last time; it's a draft until someone approves it.` });
      n++;
    } catch (e) {
      ctx.made.set(key, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "factoryMin", ok: false, title: `Couldn't add ${label} to next week's order`, detail: (e as Error).message.slice(0, 200) });
    }
  }
}

/**
 * Quote follow-ups, on their own Follow up list: one to-do per call in the
 * Pipeline's rule (day 2, then 4 days on, then a week on), due the day the
 * rule says, for whoever's chasing the quote or whoever wrote it. When the
 * call is logged on the Pipeline, or the quote sells or is lost, the to-do
 * ticks itself off. Only quotes out a fortnight or less: the rule is done by
 * day 13, and older ones are the Pipeline's to sort.
 */
const FOLLOW_TODOS = "automation_follow_todos";
async function quoteFollow(ctx: Ctx, pipe: PipeQuote[]) {
  const open = (await getSettings<Record<string, { id: string; n: number }>>(FOLLOW_TODOS).catch(() => null)) ?? {};
  const byKey = new Map(pipe.map((q) => [q.key, q]));

  // Done on the Pipeline: a call logged since, or the quote isn't waiting on a call any more.
  for (const [k, t] of Object.entries(open)) {
    const q = byKey.get(k);
    if (q && q.stage === "due" && followUps(q.touches) <= t.n) continue;
    await setDone(t.id, true, "Automatic").catch(() => false);
    delete open[k];
  }

  let made = 0;
  for (const q of pipe) {
    if (made >= 40) break;
    if (q.stage !== "due" || !q.quotedOn || daysBetween(q.quotedOn, ctx.today) > 14) continue;
    // Won and waiting on payment: no more follow-up calls.
    if (Object.values(ctx.flow).some((f) => f.key === q.key)) continue;
    const n = followUps(q.touches);
    if (n >= FOLLOW_UPS || open[q.key]) continue;
    const due = q.nextOn ?? ruleNext(q.pricedOn ?? q.quotedOn, q.touches) ?? ctx.today;
    const to = personNamed(ctx, q.owner) ?? personNamed(ctx, q.quotedBy);
    const which = ["First", "Second", "Third"][n] ?? "Next";
    if (await todo(ctx, "quoteFollow", `follow:${q.key}:${n}`, {
      title: `${which} follow-up: ${who(q)}${q.value ? `, ${money(q.value)}` : ""}`,
      notes: [`${q.what ?? "Quote"}${q.jobNumber ? ` · job #${q.jobNumber}` : q.customerId ? ` · customer #${q.customerId}` : ""}${q.phone ? ` · ${q.phone}` : ""}.`, `Quoted ${dayLabel(q.quotedOn)}. Log the call on the Pipeline and this ticks itself off.`].join("\n"),
      to, list: FOLLOW_UP, dueOn: due < ctx.today ? due : ctx.today, jobId: q.jobId ?? undefined,
      onMade: (id) => { if (id) open[q.key] = { id, n }; },
    })) made++;
  }
  await saveSettings(FOLLOW_TODOS, open).catch(() => undefined);
}

/**
 * Invoices that have just gone 7, 14 or 30 days overdue, in one to-do for the
 * office rather than one each: the chasing is done as a sitting, and the
 * first run alone would otherwise be thirty cards.
 */
async function overdueInv(ctx: Ctx) {
  const owed = await owedInvoices();
  if (!owed) return;
  const band = (d: number) => (d >= 30 ? 30 : d >= 14 ? 14 : d >= 7 ? 7 : 0);
  const fresh = owed.list.filter((i) => band(i.daysOver) > 0 && !ctx.made.has(`owed:${i.number}:${band(i.daysOver)}`)).sort((a, b) => b.daysOver - a.daysOver);
  if (!fresh.length) return;
  const total = fresh.reduce((s, i) => s + i.amountDue, 0);
  const shown = fresh.slice(0, 25);
  const notes = [
    ...shown.map((i) => `#${i.number} ${i.contact}: ${money(i.amountDue)}, ${i.daysOver} days overdue`),
    ...(fresh.length > shown.length ? [`and ${fresh.length - shown.length} more on Finance › Owed to us`] : []),
  ].join("\n");
  const key = `owed-run:${ctx.today}:${fresh.map((i) => i.number).join(",").slice(0, 60)}`;
  if (await todo(ctx, "overdueInv", key, { title: `Chase ${fresh.length} overdue ${fresh.length === 1 ? "invoice" : "invoices"}, ${money(total)}`, notes, to: null, accounts: true })) {
    for (const i of fresh) ctx.made.set(`owed:${i.number}:${band(i.daysOver)}`, new Date().toISOString());
  }
}

/** Monday from 10 am: a van with no weekly check this week gets a to-do for its driver. */
async function vanCheck(ctx: Ctx) {
  const dow = melDow(ctx.today);
  if (dow === 0 || dow === 6 || (dow === 1 && melHour() < 10)) return;
  const vans = (await listVehicles()).filter((v) => v.status === "on" && v.assignedTo);
  if (!vans.length) return;
  const checks = await latestChecksForVans(vans.map((v) => v.id));
  const monday = new Date(Date.parse(`${ctx.today}T12:00:00Z`) - ((dow + 6) % 7) * DAY).toISOString().slice(0, 10);
  const now = new Date(`${ctx.today}T12:00:00Z`);
  for (const v of vans) {
    const cell = cleanCell(checks.get(`${v.id}|weekly`)?.checkedOn ?? null, now);
    if (cell.severity === "ok") continue;
    const to = ctx.people.find((p) => p.id === v.assignedTo) ?? null;
    await todo(ctx, "vanCheck", `van:${v.id}:${monday}`, { title: `Weekly van check, ${v.name}`, notes: `${cell.detail}. Due by Monday 10 am each week.`, to });
  }
}

/** Someone on the keep-in-touch list gone past their time: a to-do for whoever looks after them. */
async function keepInTouch(ctx: Ctx) {
  const all = await listContacts();
  let n = 0;
  for (const c of all) {
    if (n >= PER_RUN) break;
    if (touchState(c, ctx.today) !== "overdue") continue;
    const to = ctx.people.find((p) => p.id === c.ownerId) ?? null;
    if (await todo(ctx, "keepInTouch", `kit:${c.id}:${nextDue(c)}`, {
      title: `Get in touch with ${c.name}${c.company ? ` (${c.company})` : ""}`,
      notes: [[c.phone, c.email].filter(Boolean).join(" · "), lastWords(c, ctx.today), "Log it on To-do › Keep in touch so the clock restarts."].filter(Boolean).join("\n"),
      to,
    })) n++;
  }
}

/**
 * Orders that went but whose jobs still don't carry "Materials Ordered" /
 * "System Ordered" (ServiceTitan refused at the time, or the order went
 * before tagging existed): tried again, a few a run.
 */
async function orderTags(ctx: Ctx) {
  const ids = (await ordersToUpdate()).slice(0, 3);
  for (const id of ids) {
    const r = await updateJobs(id).catch((e: Error) => ({ ok: false, done: [], error: e.message }));
    const failKey = `ordertag-fail:${id}:${(r.error ?? "").slice(0, 40)}`;
    if (r.ok) ctx.log.push({ at: new Date().toISOString(), kind: "orderTags", ok: true, title: `Tagged the jobs on order ${id} as ordered in ServiceTitan` });
    else if (!ctx.made.has(failKey)) {
      // A refusal is logged once, not on every sync it's retried.
      ctx.made.set(failKey, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "orderTags", ok: false, title: `Couldn't tag the jobs on order ${id}`, detail: (r.error ?? "ServiceTitan refused").slice(0, 200) });
    }
    if (!r.ok && /won't let the portal/.test(r.error ?? "")) break;
  }
}

/**
 * A job moved after its gear was ordered or its electrician booked: the order
 * stands, and whoever it went to is emailed the new day (emailDateChange),
 * which moves the order's own date with it. Office hours only, so nobody is
 * emailed at midnight; one email per order however many of its jobs moved.
 * A refusal (Reece entered in maX, no address) is logged once and left to the
 * warning on To order.
 */
async function orderMoves(ctx: Ctx) {
  const hour = melHour();
  if (melDow(ctx.today) === 0 || hour < 7 || hour >= 18) return;
  const moves = await findMoves();
  const byPo = new Map<string, Move[]>();
  for (const m of moves) {
    if (ctx.made.has(`move:${m.po_number}:${m.job_id}:${m.to}`)) continue;
    byPo.set(m.po_number, [...(byPo.get(m.po_number) ?? []), m]);
  }
  for (const [po, ms] of [...byPo].slice(0, 6)) {
    const failKey = `move-fail:${po}:${ms[0].to}`;
    if (ctx.made.has(failKey)) continue;
    const r = await emailDateChange(po, ms).catch((e: Error) => ({ ok: false as const, error: e.message, to: undefined, note: undefined }));
    const jobs = ms.map((m) => m.job_number ?? m.job_id).join(", ");
    const day = new Date(`${ms[0].to}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    if (r.ok) {
      for (const m of ms) ctx.made.set(`move:${m.po_number}:${m.job_id}:${m.to}`, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "orderMoves", ok: true, jobId: ms[0].job_id, po, title: `Job ${jobs} moved to ${day}: ${r.note ?? "supplier told"} Order ${po} kept, its date changed.` });
      ctx.sent.push({ head: `Job ${jobs} moved to ${day}`, detail: `${r.note ?? "Told whoever the order went to."} Order ${po} kept, its date changed to match.` });
    } else {
      ctx.made.set(failKey, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "orderMoves", ok: false, jobId: ms[0].job_id, title: `Job ${jobs} moved to ${day}, couldn't tell the supplier about order ${po}`, detail: (r.error ?? "").slice(0, 200) });
    }
  }
  await contractorMoves(ctx);
}

/**
 * Work orders go to the contractor by themselves once the job's booked: the
 * electrician's drafted from a booking, and one the office made for anyone
 * (water balancing with Ross) and saved as a draft, which goes the moment its
 * job has a visit booked. Supplier orders for systems and materials still
 * wait on To order, because they spend money. Not one for a day that's gone,
 * not one touched in the last half hour (someone may still be on it), not one
 * for someone else with nowhere to send it, and not a contractor whose
 * switch is off on Work orders › Contractors. Same hours as passing on a move.
 *
 * Two more, each its own switch under this one on Settings › Automatic:
 * nothing goes until a tech is assigned to the visit (a booking dropped into
 * an empty slot isn't settled), and a job booked for today is left for the
 * office to send by hand, since a same-day job is rung through, not emailed
 * at 7:37 am with nobody checking it'll be read. That one is said once, in
 * the log and the "it went" email, so it isn't left sitting as a draft.
 */
async function workOrderSend(ctx: Ctx) {
  const hour = melHour();
  if (melDow(ctx.today) === 0 || hour < 7 || hour >= 18) return;
  const drafts = await sbSelect<{ id: number; po_number: string; group_key: string; updated_at: string; details: WorkOrderDetails | null }>(
    "purchase_orders", "select=id,po_number,group_key,updated_at,details&kind=eq.work_order&status=eq.draft&order=id.asc&limit=40",
  );
  const [contacts, sparkyAuto] = await Promise.all([loadWoContacts(), loadSparkyAuto()]);
  const jobIds = drafts.map((d) => d.details?.jobs?.[0]?.job_id ?? 0);
  const [booked, teched] = await Promise.all([bookedDays(jobIds), ctx.sw.woNeedsTech ? techAssigned(jobIds, ctx.today) : null]);
  const settled = new Date(Date.now() - 30 * 60_000).toISOString();
  let n = 0;
  for (const d of drafts) {
    if (n >= 6) break;
    const det = d.details;
    const jobId = det?.jobs?.[0]?.job_id;
    if (!det?.date || det.date < ctx.today || !jobId) continue;
    const manual = d.group_key.startsWith("manual:");
    if (manual && (!booked.has(jobId) || d.updated_at > settled)) continue;
    if (det.trade && !det.send_to) continue;
    if (!autoFor(det, sparkyAuto, contacts)) continue;
    const failKey = `wosend-fail:${d.id}`;
    if (ctx.made.has(failKey) || ctx.made.has(`wo-hold:${d.id}`)) continue;
    const ref = workRef(det);
    const who = det.trade ? `${det.to_name ?? det.trade} (${det.trade})` : "the electrician";
    if (ctx.sw.woNotToday && det.date === ctx.today) {
      const todayKey = `wo-today:${d.id}:${det.date}`;
      if (!ctx.made.has(todayKey)) {
        ctx.made.set(todayKey, new Date().toISOString());
        ctx.log.push({ at: new Date().toISOString(), kind: "workOrderSend", ok: false, jobId, po: d.po_number, title: `Work order ${d.po_number} for ${who} is for today, so it's left for you to send: ${ref}` });
        ctx.held.push({ head: `Work order for ${who}: ${ref}`, detail: `The job's booked for today, so it wasn't sent. It's a draft on Work orders: check they can make it, then press Send.` });
      }
      continue;
    }
    if (teched && !teched.has(jobId)) continue;
    const r = await approveAndSend(d.id, "Automatic").catch((e: Error) => ({ ok: false as const, error: e.message, note: undefined }));
    n++;
    if (r.ok) {
      ctx.log.push({ at: new Date().toISOString(), kind: "workOrderSend", ok: true, jobId, po: d.po_number, title: `Work order ${d.po_number} sent to ${who}: ${ref}`, detail: r.note ?? undefined });
      ctx.sent.push({ head: `Work order sent to ${who}: ${ref}`, detail: `${r.note ?? "Emailed."} For ${dayLabel(det.date)}.` });
    } else {
      // Logged once; it stays a draft on To order with the reason, for the office.
      ctx.made.set(failKey, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "workOrderSend", ok: false, jobId, po: d.po_number, title: `Couldn't send work order ${d.po_number}: ${ref}`, detail: (r.error ?? "").slice(0, 200) });
    }
  }
}

/**
 * A work order made by hand has gone, and its job's booking has moved since:
 * the contractor's day moves by as much as the booking did (water balancing
 * the day after the install stays the day after), and they're emailed the
 * new day. The planned ones are told by orderMoves, from the week's plan.
 */
async function contractorMoves(ctx: Ctx) {
  const sent = await sbSelect<{ id: number; po_number: string; details: WorkOrderDetails | null }>(
    "purchase_orders", `select=id,po_number,details&kind=eq.work_order&status=eq.sent&group_key=like.manual:*&order=id.desc&limit=80`,
  );
  const coming = sent.filter((p) => p.details?.date && p.details.date >= ctx.today && p.details.jobs?.[0]?.job_id);
  if (!coming.length) return;
  const [booked, contacts, sparkyAuto] = await Promise.all([bookedDays(coming.map((p) => p.details!.jobs[0].job_id)), loadWoContacts(), loadSparkyAuto()]);
  // One sent before the booked day was kept: today's booking is its mark from here on, nobody emailed.
  for (const p of coming.filter((x) => !x.details!.booked_for)) {
    const on = booked.get(p.details!.jobs[0].job_id);
    if (on) await noteBookedFor(p.id, on).catch(() => undefined);
  }
  const live = coming.filter((p) => p.details!.booked_for);
  for (const p of live.slice(0, 40)) {
    const d = p.details!;
    const job = d.jobs[0];
    const now = booked.get(job.job_id);
    if (!now || now === d.booked_for) continue;
    const shift = Math.round((Date.parse(`${now}T12:00:00Z`) - Date.parse(`${d.booked_for}T12:00:00Z`)) / 86_400_000);
    const to = new Date(Date.parse(`${d.date}T12:00:00Z`) + shift * 86_400_000).toISOString().slice(0, 10);
    const key = `cmove:${p.po_number}:${now}`;
    if (ctx.made.has(key) || to < ctx.today) continue;
    ctx.made.set(key, new Date().toISOString());
    if (!autoFor(d, sparkyAuto, contacts)) {
      ctx.log.push({ at: new Date().toISOString(), kind: "orderMoves", ok: false, jobId: job.job_id, po: p.po_number, title: `Job ${job.job_number ?? job.job_id} moved: ${d.to_name ?? d.trade ?? "the contractor"} not told`, detail: "Their work orders are set to manual on Work orders › Contractors. Edit the work order and email the update yourself." });
      continue;
    }
    const r = await emailDateChange(p.po_number, [{ job_id: job.job_id, job_number: job.job_number, customer_name: job.customer_name, from: d.date, to }], { bookedFor: now })
      .catch((e: Error) => ({ ok: false as const, error: e.message, note: undefined }));
    const day = dayLabel(to);
    if (r.ok) {
      ctx.log.push({ at: new Date().toISOString(), kind: "orderMoves", ok: true, jobId: job.job_id, po: p.po_number, title: `Job ${job.job_number ?? job.job_id} moved: ${r.note ?? "contractor told"} Work order ${p.po_number} now ${day}.` });
      ctx.sent.push({ head: `Job ${job.job_number ?? job.job_id} moved: work order now ${day}`, detail: `${r.note ?? "Told the contractor."} The booking moved from ${dayLabel(d.booked_for!)} to ${dayLabel(now)}.` });
    } else {
      ctx.log.push({ at: new Date().toISOString(), kind: "orderMoves", ok: false, jobId: job.job_id, po: p.po_number, title: `Job ${job.job_number ?? job.job_id} moved, couldn't tell the contractor about work order ${p.po_number}`, detail: (r.error ?? "").slice(0, 200) });
    }
  }
}

/**
 * Account to-dos following a sale through, one list to the next as
 * ServiceTitan catches up: won and waiting on payment → sold, so book it in
 * (Jobs to Book) → booked, so invoice it when it's done (Finance) → invoiced,
 * ticked off. Lost along the way ticks it off too. Each move rewrites the
 * to-do's header and puts a line on top of its notes, so the card says what
 * to do now and the history of how it got there.
 */
async function accountFlow(ctx: Ctx, pipe: PipeQuote[]) {
  const byKey = new Map(pipe.map((q) => [q.key, q]));
  const bookList = ctx.lists.find((l) => /\bbook/i.test(l)) ?? null;
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const line = (text: string, t: { notes: string | null }) => `${day(ctx.today)}: ${text}\n${t.notes ?? ""}`.slice(0, 2000);
  for (const [id, f] of Object.entries(ctx.flow)) {
    const t = await getTodo(id).catch(() => null);
    if (!t || t.doneAt) { delete ctx.flow[id]; continue; }
    const q = byKey.get(f.key);
    if (!q) continue;
    const name = who(q);
    if (q.stage === "lost") {
      await updateTodo(id, { notes: line("Lost on the Pipeline.", t) });
      await setDone(id, true, "Automatic");
      delete ctx.flow[id];
      ctx.log.push({ at: new Date().toISOString(), kind: "accountFlow", ok: true, jobId: q.jobId ?? undefined, title: `${name}: lost, ticked off` });
      continue;
    }
    if (f.step === "won" && isSold(q.stage)) {
      await updateTodo(id, { title: `Book in ${name}, sold ${q.soldOn ? day(q.soldOn) : "now"}`, dueOn: ctx.today, ...(bookList ? { list: bookList } : {}), notes: line("Marked sold in ServiceTitan. Book the job in.", t) });
      f.step = "book";
      // The sold-not-booked reminder would write a second card for this one.
      ctx.made.set(`sold:${q.key}`, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "accountFlow", ok: true, jobId: q.jobId ?? undefined, title: `${name}: sold in ServiceTitan, moved to ${bookList ?? "book in"}` });
    }
    const booked = q.work?.bookedFor ?? null;
    if (f.step === "book" && (q.stage === "booked" || q.stage === "billed" || booked)) {
      const on = booked ? booked.slice(0, 10) : ctx.today;
      await updateTodo(id, { title: `Invoice ${name} once it's done${booked ? `, booked ${day(on)}` : ""}`, dueOn: on < ctx.today ? ctx.today : on, list: ACCOUNTS, notes: line(`Booked${booked ? ` for ${day(on)}` : ""}${q.work?.jobNumber ? `, job #${q.work.jobNumber}` : ""}. Invoice it once it's done.`, t) });
      f.step = "invoice";
      f.jobId = q.work?.jobId;
      // The not-invoiced reminder would write a second card for the same job.
      if (q.work?.jobId) ctx.made.set(`bill:${q.work.jobId}`, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "accountFlow", ok: true, jobId: q.work?.jobId ?? q.jobId ?? undefined, title: `${name}: booked, moved to ${ACCOUNTS} to invoice` });
    }
    if (f.step === "invoice" && (q.stage === "billed" || (q.work?.invoiced ?? 0) > 0)) {
      await updateTodo(id, { notes: line("Invoiced in ServiceTitan.", t) });
      await setDone(id, true, "Automatic");
      delete ctx.flow[id];
      ctx.log.push({ at: new Date().toISOString(), kind: "accountFlow", ok: true, jobId: q.work?.jobId ?? undefined, title: `${name}: invoiced, ticked off` });
    }
  }
}

/* --------------------------------------------------------------- the run */

/**
 * One run at a time. The sync route and the board's refresh can both finish a
 * pull within the same minute, and two runs reading the same "already done"
 * list would each write the same to-do. Claimed with a conditional update, as
 * the order drafting does; a run that dies frees the claim after four minutes.
 */
const LOCK = "automation_running";
async function claim(): Promise<boolean> {
  const now = new Date();
  if (!(await sbSelectOne("portal_settings", `select=key&key=eq.${LOCK}`).catch(() => null))) {
    await sbInsert("portal_settings", { key: LOCK, value: { running_until: "" }, updated_at: now.toISOString() }).catch(() => undefined);
  }
  const got = await sbUpdateReturning("portal_settings", `key=eq.${LOCK}&value->>running_until=lt.${encodeURIComponent(now.toISOString())}`, {
    value: { running_until: new Date(now.getTime() + 4 * 60_000).toISOString() },
    updated_at: now.toISOString(),
  });
  return got.length > 0;
}
const release = () => sbUpdateReturning("portal_settings", `key=eq.${LOCK}`, { value: { running_until: "" }, updated_at: new Date().toISOString() }).catch(() => undefined);

/**
 * Every switched-on job, after each ServiceTitan sync. One job failing is
 * logged and the rest still run; nothing here ever fails the sync.
 */
export async function runAutomations(): Promise<{ ran: string[]; failed: string[]; skipped?: string; quoteTags?: unknown }> {
  if (!(await claim())) return { ran: [], failed: [], skipped: "already running" };
  try {
    // The quote tags first and inside the same claim: it keeps its own marks
    // in the same "already done" list, which is read fresh after it.
    const quoteTags = await clearApprovedQuoteTags().catch((e: Error) => ({ removed: 0, failed: 1, skipped: e.message }));
    return { ...(await runAll()), quoteTags };
  } finally {
    await release();
  }
}

async function runAll(): Promise<{ ran: string[]; failed: string[] }> {
  const sw = await loadSwitches();
  const [made, people, offIds, lists] = await Promise.all([loadMade(), teamPeople(), officeIds(), todoLists()]);
  const office = people.find((p) => p.id === sw.officeTo) ?? people.find((p) => offIds.includes(p.id)) ?? null;
  const accounts = people.find((p) => p.id === sw.accountsTo) ?? office;
  const ctx: Ctx = { sw, today: isoDateMelbourne(new Date()), made, log: [], people, office, accounts, lists: await ensureLists(lists, sw), flow: await loadFlow(), sent: [], held: [] };
  const flowAtStart = { ...ctx.flow };
  const needPipe = sw.soldNotBooked || sw.quoteFollow || sw.accountFlow;
  const pipe = needPipe ? await loadPipeline({ detail: true }).then((p) => p.quotes).catch(() => null) : [];

  const jobs: Array<[AutoKey, () => Promise<void>]> = [
    ["soldNotBooked", () => (pipe ? soldNotBooked(ctx, pipe) : Promise.reject(new Error("The pipeline couldn't be read")))],
    ["notInvoiced", () => notInvoiced(ctx)],
    ["factoryMin", () => factoryMin(ctx)],
    ["quoteFollow", () => (pipe ? quoteFollow(ctx, pipe) : Promise.reject(new Error("The pipeline couldn't be read")))],
    ["overdueInv", () => overdueInv(ctx)],
    ["vanCheck", () => vanCheck(ctx)],
    ["keepInTouch", () => keepInTouch(ctx)],
    ["orderTags", () => orderTags(ctx)],
    ["orderMoves", () => orderMoves(ctx)],
    ["workOrderSend", () => workOrderSend(ctx)],
    ["accountFlow", () => (pipe ? accountFlow(ctx, pipe) : Promise.reject(new Error("The pipeline couldn't be read")))],
  ];
  const ran: string[] = [];
  const failed: string[] = [];
  for (const [k, fn] of jobs) {
    if (!sw[k]) continue;
    try {
      await fn();
      ran.push(k);
    } catch (e) {
      failed.push(k);
      ctx.log.push({ at: new Date().toISOString(), kind: k, ok: false, title: `${k} didn't run`, detail: (e as Error).message.slice(0, 200) });
    }
  }
  await saveMade(ctx.made).catch(() => undefined);
  // One "it went" email for everything sent by itself this run.
  if (ctx.sent.length || ctx.held.length) {
    const to = (sw.notifyTo ?? NOTIFY_DEFAULT).split(/[,;\s]+/).filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));
    const parts = doneNoticeEmail({ items: ctx.sent, held: ctx.held, link: `${site.url.replace(/\/$/, "")}/portal/supply/work-orders` });
    for (const a of to.slice(0, 5)) {
      const err = await sendReadyNotice(parts, a).catch((e: Error) => e.message);
      if (err) ctx.log.push({ at: new Date().toISOString(), kind: "notice", ok: false, title: `Couldn't email ${a} what was sent`, detail: err.slice(0, 200) });
    }
  }
  // Merged with what's there now: a quote marked Won while this ran was saved
  // after this read the list, and mustn't be written over.
  const startKeys = new Set(Object.keys(flowAtStart));
  const latest = await loadFlow().catch(() => ({} as Record<string, FlowEntry>));
  for (const [id, f] of Object.entries(latest)) if (!startKeys.has(id) && !ctx.flow[id]) ctx.flow[id] = f;
  await saveFlow(ctx.flow).catch(() => undefined);
  await logAuto(ctx.log).catch(() => undefined);
  return { ran, failed };
}
