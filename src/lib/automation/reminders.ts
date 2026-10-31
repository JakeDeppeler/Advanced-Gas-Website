import "server-only";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { sbInsert, sbSelect, sbSelectOne, sbUpdateReturning } from "@/lib/dashboard/db";
import { toBillJobs } from "@/lib/dashboard/toBill";
import { LIVE_DAYS, loadPipeline } from "@/lib/pipeline/store";
import { isLow, listStock } from "@/lib/portal/stock";
import { listStockLines, shelfMatch } from "@/lib/ordering/stockLines";
import { addStockLine, draftFor, loadSuppliers } from "@/lib/ordering/db";
import { ordersToUpdate, updateJobs } from "@/lib/ordering/stJobNotes";
import { findMoves, type Move } from "@/lib/ordering/moveNotices";
import { approveAndSend, emailDateChange, noteBookedFor, noteDateChange, sendReadyNotice } from "@/lib/ordering/send";
import { doneNoticeEmail, nextWeek, workRef, type WorkOrderDetails } from "@/lib/ordering/plan";
import { autoFor, bookedDays, loadSparkyAuto, loadWoContacts, techAssigned } from "@/lib/ordering/workOrders";
import { site } from "@/lib/site";
import { owedInvoices } from "@/lib/portal/run/money";
import { cleanCell } from "@/components/portal/fleetStatus";
import { listContacts } from "@/lib/contacts/store";
import { lastWords, nextDue, touchState } from "@/lib/contacts/types";
import { matchName } from "@/lib/portal/crewFile/match";
import { MAX_LISTS, createAutoTodo, officeIds, openTodos, renameTodoList, saveTodoLists, setDone, teamPeople, todoLists } from "@/lib/todos/store";
import { FINANCE_LIST, FOLLOW_UP_LIST, OVERDUE_LIST, READY_LIST, isAccountList, jobNumberIn, type Person } from "@/lib/todos/types";
import { getSettings, latestChecksForVans, listVehicles, saveSettings } from "@/lib/portal/db";
import { FOLLOW_UPS, addDays, followUps, ruleNext, type PipeQuote } from "@/lib/pipeline/types";
import { NOTIFY_DEFAULT, loadMade, loadSwitches, logAuto, saveMade, type AutoEntry, type AutoKey, type AutoSwitches } from "./log";
import { syncQuoteTags } from "./quoteTag";
import { loadFlow, saveFlow, type FlowEntry } from "@/lib/todos/flow";
import { getTodo, updateTodo } from "@/lib/todos/store";
import { isSold } from "@/lib/pipeline/types";
import { loadTradeDone, saveTradeDone } from "@/lib/portal/tradeJobs";

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
  /** Who the Invoice ready and Invoice overdue to-dos go to. */
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
 * The invoicing and overdue to-dos go on lists of their own, so they're the
 * accounts person's and nobody else's: Invoice ready for finished jobs to
 * bill, Invoice overdue for money out past its due date. Added to the board
 * the first time either job is on; a board already full keeps them on the
 * general list instead.
 */
export const ACCOUNTS = READY_LIST;
export const FOLLOW_UP = FOLLOW_UP_LIST;
async function ensureLists(lists: string[], sw: AutoSwitches): Promise<string[]> {
  // A board from before the split: Finance becomes Invoice ready (its to-dos
  // with it), Invoice overdue goes in beside it, and the old "Chase 6 overdue
  // invoices" bundles are ticked off, since overdueInv writes one card per
  // invoice in their place this run.
  if (lists.includes(FINANCE_LIST)) {
    await renameTodoList(FINANCE_LIST, READY_LIST).catch(() => undefined);
    const at = lists.indexOf(FINANCE_LIST);
    const next = [...lists.slice(0, at), READY_LIST, ...(lists.includes(OVERDUE_LIST) ? [] : [OVERDUE_LIST]), ...lists.slice(at + 1)].filter((l, i, a) => a.indexOf(l) === i);
    if ((await saveTodoLists(next).catch(() => ({ ok: false }))).ok) lists = next.slice(0, MAX_LISTS);
    const old = (await openTodos().catch(() => [])).filter((t) => t.createdBy === "Automatic" && /^Chase \d+ overdue invoices?\b/.test(t.title));
    for (const t of old) {
      await updateTodo(t.id, { notes: `Replaced by one card per invoice on ${OVERDUE_LIST}, each ticking itself off when it's paid.\n${t.notes ?? ""}`.slice(0, 2000), list: OVERDUE_LIST }).catch(() => undefined);
      await setDone(t.id, true, "Automatic").catch(() => false);
    }
  }
  const want = [
    ...(sw.notInvoiced ? [READY_LIST] : []),
    ...(sw.overdueInv ? [OVERDUE_LIST] : []),
    ...(sw.quoteFollow ? [FOLLOW_UP] : []),
  ].filter((l) => !lists.includes(l));
  if (!want.length) return lists;
  const next = [...lists, ...want].slice(0, MAX_LISTS);
  if (next.length === lists.length) return lists;
  return (await saveTodoLists(next).catch(() => ({ ok: false }))).ok ? next : lists;
}

/* -------------------------------------------------------------- the jobs */

/* ------------------------------------------------- lists that mirror */

/**
 * Three account lists that are the Pipeline's own columns, kept in step with
 * it rather than written once: Quoting (a quote visit done, no quote written
 * yet), Follow up (a quote out, not sold), Jobs to Book (sold, nothing booked).
 * One card per job, written when it gets there and ticked off when it moves
 * on, so each list is the whole of that stage and nothing else (Jake, 22 Oct).
 *
 * The card ids are kept by key (MIRROR), so a card someone ticks by hand isn't
 * written again while the job sits where it is; it's theirs to have dealt
 * with. A card already on the list for the same job (one written before this,
 * or by the flow from Won) is taken over rather than doubled.
 */
const MIRROR = "automation_mirror";
type MirrorTag = "book" | "follow" | "quote" | "close";
type MirrorItem = { key: string; title: string; notes: string; to: Person | null; dueOn: string; jobNumber: string | null; jobId?: number };
type MirrorState = Partial<Record<MirrorTag, Record<string, { id: string; due: string }>>>;

async function mirror(ctx: Ctx, state: MirrorState, tag: MirrorTag, kind: AutoKey, list: string | null, items: MirrorItem[], gone: string, cap = 80) {
  if (!list) return;
  const open = state[tag] ?? (state[tag] = {});
  const want = new Map(items.map((i) => [i.key, i]));
  const line = (text: string, notes: string | null) => `${dayLabel(ctx.today)}: ${text}\n${notes ?? ""}`.slice(0, 2000);
  for (const [k, t] of Object.entries(open)) {
    const i = want.get(k);
    if (i) {
      // Still there: only the day it's due follows, e.g. the next call after one's logged.
      if (t.due !== i.dueOn) { await updateTodo(t.id, { dueOn: i.dueOn }).catch(() => undefined); t.due = i.dueOn; }
      continue;
    }
    const was = await getTodo(t.id).catch(() => null);
    if (was && !was.doneAt) {
      await updateTodo(t.id, { notes: line(gone, was.notes) }).catch(() => undefined);
      await setDone(t.id, true, "Automatic").catch(() => false);
    }
    delete open[k];
  }
  const onList = (await openTodos().catch(() => [])).filter((t) => t.list === list || (t.createdBy === "Automatic" && isAccountList(t.list)));
  const taken = new Set(Object.values(state).flatMap((m) => Object.values(m ?? {}).map((t) => t.id)));
  let n = 0;
  for (const i of items) {
    if (open[i.key] || n >= cap) continue;
    // A card for this job already: take it over, onto this list, rather than write a second.
    const same = onList.find((t) => !taken.has(t.id) && !ctx.flow[t.id] && (t.list === list || t.createdBy === "Automatic") && i.jobNumber && jobNumberIn(t) === i.jobNumber && (t.list === list || isQuoteish(t.title)));
    if (same) {
      await updateTodo(same.id, { title: i.title, list, dueOn: i.dueOn }).catch(() => undefined);
      open[i.key] = { id: same.id, due: i.dueOn };
      taken.add(same.id);
      continue;
    }
    const to = i.to ?? ctx.office;
    if (!to) continue;
    try {
      const id = await createAutoTodo({ title: i.title, notes: i.notes, assigneeId: to.id, dueOn: i.dueOn, list });
      if (id) { open[i.key] = { id, due: i.dueOn }; taken.add(id); n++; }
      ctx.log.push({ at: new Date().toISOString(), kind, ok: true, jobId: i.jobId, title: `To-do for ${to.name.split(" ")[0]}: ${i.title}` });
    } catch (e) {
      ctx.log.push({ at: new Date().toISOString(), kind, ok: false, jobId: i.jobId, title: `Couldn't write the to-do: ${i.title}`, detail: (e as Error).message.slice(0, 200) });
    }
  }
}

/** A card about chasing or booking a quote, as the older automatic ones were titled: safe to take over. */
const isQuoteish = (title: string) => /^(follow up|first|second|third|next) |follow-up|^book in /i.test(title);

/** Jobs to Book: every sale with nothing booked from it yet, from the day it sells. */
async function soldNotBooked(ctx: Ctx, pipe: PipeQuote[], state: MirrorState) {
  const list = ctx.lists.find((l) => /\bbook/i.test(l)) ?? null;
  const inFlow = new Set(Object.values(ctx.flow).map((f) => f.key));
  const items: MirrorItem[] = pipe.filter((q) => q.stage === "won" && q.soldOn && !inFlow.has(q.key)).map((q) => ({
    key: q.key,
    title: `Book in ${who(q)}, sold ${dayLabel(q.soldOn!)}`,
    notes: `${ref(q)}${q.what ?? "Sold quote"}${q.value ? ` · ${money(q.value)}` : ""}${q.phone ? ` · ${q.phone}` : ""}.\nSold ${dayLabel(q.soldOn!)} and nothing's booked from it yet. Comes off by itself once a visit is booked in ServiceTitan.`,
    to: null, dueOn: ctx.today, jobNumber: q.jobNumber, jobId: q.jobId ?? undefined,
  }));
  await mirror(ctx, state, "book", "soldNotBooked", list, items, "Booked in ServiceTitan, or no longer a sale. Off Jobs to Book.");
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
    // Everything since ServiceTitan became the ledger (toBillJobs starts there),
    // not just the last fortnight: a fortnight cut-off is how a service done
    // in September at $0 never got a card at all.
    if (done >= ctx.today) continue;
    if (await todo(ctx, "notInvoiced", `bill:${r.id}`, {
      title: `Invoice job ${r.jobNumber ?? r.id}${r.customer ? `, ${r.customer}` : ""}`,
      notes: `${r.jobType ?? "Job"}${r.suburb ? ` in ${r.suburb}` : ""}, finished ${dayLabel(done)}${r.value ? `, sold at ${money(r.value)}` : ""}. No invoice in ServiceTitan yet.`,
      to: null, accounts: true, list: READY_LIST, jobId: r.id,
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
 * Follow up: every quote out and not sold, one card each, due the day the
 * Pipeline says to ring (its next call, else the 2/4/7-day rule). Logging a
 * call on the Pipeline moves the card's day on; it ticks itself off when the
 * quote sells, is lost, or passes 60 days and drops off the Pipeline. Before
 * this it was a card per call for quotes a fortnight old or less, so the list
 * was never the whole of what was out. A quote marked Won and waiting on
 * payment is the flow's, not this list's.
 */
const FOLLOW_TODOS = "automation_follow_todos";
async function quoteFollow(ctx: Ctx, pipe: PipeQuote[], state: MirrorState) {
  // The per-call cards from before: taken over where their quote is still out, closed where it isn't.
  const old = (await getSettings<Record<string, { id: string; n: number }>>(FOLLOW_TODOS).catch(() => null)) ?? null;
  if (old && Object.keys(old).length) {
    const follow = state.follow ?? (state.follow = {});
    const live = new Set(pipe.filter((q) => q.stage === "new" || q.stage === "due" || q.stage === "waiting").map((q) => q.key));
    for (const [k, t] of Object.entries(old)) {
      if (live.has(k) && !follow[k]) follow[k] = { id: t.id, due: "" };
      else await setDone(t.id, true, "Automatic").catch(() => false);
    }
    await saveSettings(FOLLOW_TODOS, {}).catch(() => undefined);
  }
  const inFlow = new Set(Object.values(ctx.flow).map((f) => f.key));
  const items: MirrorItem[] = pipe.filter((q) => (q.stage === "new" || q.stage === "due" || q.stage === "waiting") && q.quotedOn && !inFlow.has(q.key)).map((q) => {
    const calls = followUps(q.touches);
    // Three calls in and nothing booked: it isn't overdue, it's waiting on them,
    // so it's due the day it drops off the Pipeline, to be won or closed off.
    const next = q.nextOn ?? ruleNext(q.pricedOn ?? q.quotedOn, q.touches) ?? (calls >= FOLLOW_UPS ? addDays(q.quotedOn, LIVE_DAYS) : ctx.today);
    return {
      key: q.key,
      title: `Follow up ${who(q)}${q.value ? `, ${money(q.value)}` : ""}`,
      notes: [`${q.what ?? "Quote"}${q.jobNumber ? ` · job #${q.jobNumber}` : q.customerId ? ` · customer #${q.customerId}` : ""}${q.phone ? ` · ${q.phone}` : ""}.`,
        `Quoted ${dayLabel(q.quotedOn)}${calls ? `, followed up ${calls} ${calls === 1 ? "time" : "times"}` : ""}. Log the call on the Pipeline and the next one's day follows; it comes off when the quote's sold or lost.`].join("\n"),
      to: personNamed(ctx, q.owner) ?? personNamed(ctx, q.quotedBy), dueOn: next, jobNumber: q.jobNumber, jobId: q.jobId ?? undefined,
    };
  });
  await mirror(ctx, state, "follow", "quoteFollow", FOLLOW_UP, items, "Sold, lost, or out more than 60 days. Off Follow up.");
  // The older "Follow up X, quiet 23 days" cards the Quoting list was given:
  // any not taken over above are for quotes no longer out.
  const mine = new Set(Object.values(state).flatMap((m) => Object.values(m ?? {}).map((t) => t.id)));
  for (const t of await openTodos().catch(() => [])) {
    if (t.createdBy !== "Automatic" || !/quot|sales/i.test(t.list ?? "") || !/^Follow up /.test(t.title) || mine.has(t.id)) continue;
    await updateTodo(t.id, { notes: `${dayLabel(ctx.today)}: no longer out on the Pipeline (sold, lost or past 60 days). Follow-ups are on ${FOLLOW_UP} now.\n${t.notes ?? ""}`.slice(0, 2000) }).catch(() => undefined);
    await setDone(t.id, true, "Automatic").catch(() => false);
  }
}

/**
 * Quoting: a quote visit that's been done with no quote written for it. Read
 * off ServiceTitan's jobs: a Quotation job completed in the last 30 days with
 * no estimate on it, on another job in its project, or on the customer since
 * the visit. Comes off once there is one, and Follow up takes it from there.
 */
async function quoteToWrite(ctx: Ctx, state: MirrorState) {
  const list = ctx.lists.find((l) => /quot|sales/i.test(l)) ?? null;
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const jobs = await sbSelect<{ id: number; job_number: string | null; customer_name: string | null; completed_on: string | null; pid: string | null; cid: number | null; suburb: string | null }>("st_jobs",
    `select=id,job_number,customer_name,completed_on,pid:raw->>projectId,cid:customer_id,suburb&job_type=ilike.quotation*&status=eq.Completed&completed_on=gte.${encodeURIComponent(since)}&limit=300`);
  const ids = jobs.map((j) => j.id);
  const pids = [...new Set(jobs.map((j) => j.pid).filter((v): v is string => !!v))];
  const cids = [...new Set(jobs.map((j) => j.cid).filter((v): v is number => v != null))];
  const [onJob, projJobs, onCust] = await Promise.all([
    ids.length ? sbSelect<{ job_id: number }>("st_estimates", `select=job_id&job_id=in.(${ids.join(",")})`) : Promise.resolve([]),
    pids.length ? sbSelect<{ id: number; pid: string }>("st_jobs", `select=id,pid:raw->>projectId&raw->>projectId=in.(${pids.join(",")})`) : Promise.resolve([]),
    cids.length ? sbSelect<{ customer_id: number; created_on: string | null }>("st_estimates", `select=customer_id,created_on&customer_id=in.(${cids.join(",")})&created_on=gte.${encodeURIComponent(since)}`) : Promise.resolve([]),
  ]);
  const projIds = projJobs.map((j) => j.id).filter((id) => !ids.includes(id));
  const onProjJob = projIds.length ? await sbSelect<{ job_id: number }>("st_estimates", `select=job_id&job_id=in.(${projIds.join(",")})`) : [];
  const quoted = new Set(onJob.map((e) => Number(e.job_id)));
  const projQuoted = new Set(projJobs.filter((j) => onProjJob.some((e) => Number(e.job_id) === Number(j.id))).map((j) => j.pid));
  const items: MirrorItem[] = jobs.filter((j) => {
    if (quoted.has(Number(j.id)) || (j.pid && projQuoted.has(j.pid))) return false;
    const done = j.completed_on ? Date.parse(j.completed_on) - 3 * DAY : 0;
    return !onCust.some((e) => Number(e.customer_id) === Number(j.cid) && e.created_on && Date.parse(e.created_on) >= done);
  }).map((j) => ({
    key: `j${j.id}`,
    title: `Write the quote for ${[j.customer_name ?? `job #${j.job_number ?? j.id}`, j.suburb].filter(Boolean).join(", ")}`,
    notes: `Job #${j.job_number ?? j.id} · quote visit done ${j.completed_on ? dayLabel(isoDateMelbourne(new Date(j.completed_on))) : ""}. No quote in ServiceTitan for it yet. Comes off once there is one.`,
    to: null, dueOn: ctx.today, jobNumber: j.job_number, jobId: j.id,
  }));
  await mirror(ctx, state, "quote", "quoteToWrite", list, items, "Quote written in ServiceTitan. Off Quoting.");
}

/**
 * Jobs left open in ServiceTitan after their last visit: still In Progress or
 * Scheduled, every visit in the past and nothing booked ahead. Until a job's
 * completed it can't be invoiced, and the board counts it as work still to do,
 * so these are money and figures both. In October 2026 there were 219.
 *
 * A job with no visit at all isn't one of these (it's never been booked), nor
 * is one on Hold, which somebody parked on purpose. A card each for a last
 * visit in the last 60 days, to whoever was on that visit when they're on the
 * team list, else the office; anything older is one card for the lot, because
 * a hundred cards about June would bury this week's. Newest first, thirty a
 * run, so the first run doesn't land the whole backlog at once.
 */
const CLOSE_RECENT_DAYS = 60;
async function jobsToClose(ctx: Ctx, state: MirrorState) {
  const list = ctx.lists.find((l) => /service\s*titan/i.test(l)) ?? listFor(ctx, false);
  const jobs = await sbSelect<{ id: number; job_number: string | null; customer_name: string | null; suburb: string | null; status: string; job_type: string | null }>(
    "st_jobs", "select=id,job_number,customer_name,suburb,status,job_type&status=in.(InProgress,Scheduled)&limit=3000");
  const ids = jobs.map((j) => j.id);
  const visits: { job_id: number; start_at: string; id: number }[] = [];
  const crew: { job_id: number; appointment_id: number | null; technician_name: string | null }[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200).join(",");
    const [v, c] = await Promise.all([
      sbSelect<{ job_id: number; start_at: string; id: number }>("st_appointments", `select=id,job_id,start_at&job_id=in.(${chunk})&active=not.is.false&status=neq.Canceled`),
      sbSelect<{ job_id: number; appointment_id: number | null; technician_name: string | null }>("st_appointment_assignments", `select=job_id,appointment_id,technician_name&job_id=in.(${chunk})&active=not.is.false`).catch(() => []),
    ]);
    visits.push(...v);
    crew.push(...c);
  }
  // A job the tech has marked done from the trade portal is the office's now,
  // on Invoice ready; its close card comes off. The mark goes once ServiceTitan
  // has the job completed or cancelled, so it can't hide a job forever.
  const techDone = await loadTradeDone();
  const stillOpen = new Set(jobs.map((j) => String(j.id)));
  const keep = Object.fromEntries(Object.entries(techDone).filter(([id]) => stillOpen.has(id)));
  if (Object.keys(keep).length !== Object.keys(techDone).length) await saveTradeDone(keep).catch(() => undefined);
  const byJob = new Map<number, { start_at: string; id: number }[]>();
  for (const v of visits) (byJob.get(Number(v.job_id)) ?? byJob.set(Number(v.job_id), []).get(Number(v.job_id))!).push(v);
  const recent: MirrorItem[] = [];
  const old: { job: (typeof jobs)[number]; last: string }[] = [];
  const sorted: { job: (typeof jobs)[number]; last: { start_at: string; id: number } }[] = [];
  for (const j of jobs) {
    const vs = byJob.get(Number(j.id)) ?? [];
    if (!vs.length || keep[String(j.id)]) continue;
    const last = vs.reduce((a, b) => (a.start_at > b.start_at ? a : b));
    // A visit today or later: the job's still going, not left open.
    if (isoDateMelbourne(new Date(last.start_at)) >= ctx.today) continue;
    sorted.push({ job: j, last });
  }
  sorted.sort((a, b) => b.last.start_at.localeCompare(a.last.start_at));
  for (const { job: j, last } of sorted) {
    const day = isoDateMelbourne(new Date(last.start_at));
    if (daysBetween(day, ctx.today) > CLOSE_RECENT_DAYS) { old.push({ job: j, last: day }); continue; }
    const tech = crew.find((c) => Number(c.appointment_id) === Number(last.id))?.technician_name ?? crew.find((c) => Number(c.job_id) === Number(j.id))?.technician_name ?? null;
    const status = j.status === "InProgress" ? "In Progress" : j.status;
    recent.push({
      key: `j${j.id}`,
      title: `Close job ${j.job_number ?? j.id} in ServiceTitan${j.customer_name ? `, ${j.customer_name}` : ""}${j.suburb ? `, ${j.suburb}` : ""}`,
      notes: `${j.job_type ?? "Job"} · last visit ${dayLabel(day)}${tech ? ` (${tech})` : ""}, still ${status} with nothing booked after it.\nWork done: complete it in ServiceTitan so it can be invoiced. More to do: book the next visit. Not going ahead: cancel it. Comes off by itself once it's any of those.`,
      to: personNamed(ctx, tech), dueOn: ctx.today, jobNumber: j.job_number, jobId: j.id,
    });
  }
  if (old.length) {
    const oldest = old.reduce((a, b) => (a.last < b.last ? a : b)).last;
    recent.push({
      key: "older",
      // No count in the title: the card's written once and only its due day
      // follows, so a number there would go stale as the office works through them.
      title: `Older jobs still open in ServiceTitan, last visited over ${CLOSE_RECENT_DAYS} days ago`,
      notes: `${old.length} when this card was written, the oldest visited ${dayLabel(oldest)}. Each is still In Progress or Scheduled with nothing booked. Complete, rebook or cancel them in ServiceTitan; the Job tracker has the live list. This card comes off once none are left.\n${old.slice(0, 40).map((o) => `#${o.job.job_number ?? o.job.id} ${o.job.customer_name ?? ""} (${dayLabel(o.last)})`).join("\n")}`.slice(0, 2000),
      to: null, dueOn: ctx.today, jobNumber: null,
    });
  }
  await mirror(ctx, state, "close", "jobsToClose", list, recent, "Completed, rebooked or cancelled in ServiceTitan, or marked done by the tech. Off the list.", 30);
}

/**
 * Every invoice past its due date, one card each on Invoice overdue, so the
 * list is the chasing to do and nothing else. It was one card for every
 * invoice that crossed 7, 14 or 30 days on a given day, which made a clear
 * list impossible: one invoice could sit in three bundles. A card ticks itself
 * off when its invoice drops off what we're owed (paid or credited), but only
 * when the system that holds it answered this run: a Xero outage isn't a
 * customer paying. Due date in the title, not the days, so the title holds still.
 */
const OVERDUE_TODOS = "automation_overdue_todos";
async function overdueInv(ctx: Ctx) {
  const owed = await owedInvoices();
  if (!owed) return;
  const open = (await getSettings<Record<string, { id: string; from: "xero" | "servicetitan" }>>(OVERDUE_TODOS).catch(() => null)) ?? {};
  const late = owed.list.filter((i) => i.daysOver > 0 && i.stage === "billed").sort((a, b) => b.daysOver - a.daysOver);
  const lateNow = new Set(late.map((i) => i.number));
  for (const [num, t] of Object.entries(open)) {
    if (lateNow.has(num) || owed.partial === t.from) continue;
    await updateTodo(t.id, { notes: `${dayLabel(ctx.today)}: no longer overdue in ${t.from === "xero" ? "Xero" : "ServiceTitan"}, so it's paid or credited.` }).catch(() => undefined);
    await setDone(t.id, true, "Automatic").catch(() => false);
    delete open[num];
  }
  let n = 0;
  for (const i of late) {
    if (n >= 60) break;
    if (open[i.number]) continue;
    if (await todo(ctx, "overdueInv", `chase:${i.number}`, {
      title: `Chase invoice #${i.number}, ${i.contact}, ${money(i.amountDue)}, due ${dayLabel(i.due)}`,
      notes: `${i.daysOver} ${i.daysOver === 1 ? "day" : "days"} overdue when this was written. In ${i.from === "xero" ? "Xero" : "ServiceTitan"}. Ticks itself off once it's paid.`,
      to: null, accounts: true, list: OVERDUE_LIST,
      onMade: (id) => { if (id) open[i.number] = { id, from: i.from }; },
    })) n++;
  }
  await saveSettings(OVERDUE_TODOS, open).catch(() => undefined);
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
  const ids = (await ordersToUpdate({ pos: false })).slice(0, 3);
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
 * stands. A subcontractor's work order is emailed the new day
 * (emailDateChange), which moves the work order's date with it; they're the
 * ones who turn up to the day. A supplier's order isn't emailed (Jake, 22 Oct:
 * "only the subcontractors, not suppliers"): its lines take the new day
 * quietly so To order sees it in step, and the move is logged. Office hours
 * only, so nobody is emailed at midnight; one email per work order however
 * many of its jobs moved. A refusal (no address) is logged once and left to
 * the warning on To order.
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
  const kinds = new Map((byPo.size ? await sbSelect<{ po_number: string; kind: string }>("purchase_orders", `select=po_number,kind&po_number=in.(${[...byPo.keys()].map((p) => `"${p}"`).join(",")})`).catch(() => []) : []).map((r) => [r.po_number, r.kind]));
  for (const [po, ms] of [...byPo].slice(0, 6)) {
    const failKey = `move-fail:${po}:${ms[0].to}`;
    if (ctx.made.has(failKey)) continue;
    if (kinds.get(po) !== "work_order") {
      const r = await noteDateChange(po, ms).catch((e: Error) => ({ ok: false, error: e.message }));
      const jobs = ms.map((m) => m.job_number ?? m.job_id).join(", ");
      if (r.ok) for (const m of ms) ctx.made.set(`move:${m.po_number}:${m.job_id}:${m.to}`, new Date().toISOString());
      else ctx.made.set(failKey, new Date().toISOString());
      ctx.log.push({ at: new Date().toISOString(), kind: "orderMoves", ok: r.ok, jobId: ms[0].job_id, po, title: r.ok ? `Job ${jobs} moved to ${dayLabel(ms[0].to)}: supplier order ${po} kept and its date changed, supplier not emailed` : `Job ${jobs} moved, couldn't change the date on order ${po}`, detail: r.ok ? undefined : (r.error ?? "").slice(0, 200) });
      continue;
    }
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
const isBooked = (q: PipeQuote) => q.stage === "booked" || q.stage === "billed" || !!q.work?.bookedFor;

async function bookedOff(ctx: Ctx, id: string, t: { notes: string | null }, q: PipeQuote, name: string, line: (text: string, t: { notes: string | null }) => string) {
  const on = q.work?.bookedFor?.slice(0, 10) ?? null;
  const when = on ? new Date(`${on}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : null;
  await updateTodo(id, { notes: line(`Booked${when ? ` for ${when}` : ""}${q.work?.jobNumber ? `, job #${q.work.jobNumber}` : ""}. Off Jobs to Book; once it's done it goes on ${READY_LIST} if it isn't invoiced.`, t) });
  await setDone(id, true, "Automatic");
  ctx.log.push({ at: new Date().toISOString(), kind: "accountFlow", ok: true, jobId: q.work?.jobId ?? q.jobId ?? undefined, title: `${name}: booked${when ? ` for ${when}` : ""}, off Jobs to Book` });
}

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
    // Booked: off Jobs to Book. It isn't ready to invoice until it's done, and
    // the not-invoiced reminder puts it on Invoice ready the morning after.
    if (f.step === "book" && isBooked(q)) {
      await bookedOff(ctx, id, t, q, name, line);
      delete ctx.flow[id];
      continue;
    }
    // Older cards, from before booking took them off, still finish when invoiced.
    if (f.step === "invoice" && (q.stage === "billed" || (q.work?.invoiced ?? 0) > 0)) {
      await updateTodo(id, { notes: line("Invoiced in ServiceTitan.", t) });
      await setDone(id, true, "Automatic");
      delete ctx.flow[id];
      ctx.log.push({ at: new Date().toISOString(), kind: "accountFlow", ok: true, jobId: q.work?.jobId ?? undefined, title: `${name}: invoiced, ticked off` });
    }
  }
}

/**
 * Anything still on Jobs to Book whose job is booked comes off, followed or
 * not: a card written before the flow kept track of it, or one put there by
 * hand that names a job ("job #20227"). Matched to the Pipeline by the job
 * number, on the quote's job or the job booked from it.
 */
async function bookListSweep(ctx: Ctx, pipe: PipeQuote[]) {
  const bookList = ctx.lists.find((l) => /\bbook/i.test(l));
  if (!bookList) return;
  const byJob = new Map<string, PipeQuote>();
  for (const q of pipe) {
    if (q.jobNumber) byJob.set(q.jobNumber, q);
    if (q.work?.jobNumber) byJob.set(q.work.jobNumber, q);
  }
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const line = (text: string, t: { notes: string | null }) => `${day(ctx.today)}: ${text}\n${t.notes ?? ""}`.slice(0, 2000);
  for (const t of await openTodos().catch(() => [])) {
    if (t.list !== bookList || ctx.flow[t.id]) continue;
    const num = jobNumberIn(t);
    const q = num ? byJob.get(num) : undefined;
    if (!q || !isBooked(q)) continue;
    await bookedOff(ctx, t.id, t, q, who(q), line).catch(() => undefined);
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
    const quoteTags = await syncQuoteTags().catch((e: Error) => ({ changed: 0, failed: 1, skipped: e.message }));
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

  const mirrorState = (await getSettings<MirrorState>(MIRROR).catch(() => null)) ?? {};
  const jobs: Array<[AutoKey, () => Promise<void>]> = [
    ["soldNotBooked", () => (pipe ? soldNotBooked(ctx, pipe, mirrorState) : Promise.reject(new Error("The pipeline couldn't be read")))],
    ["quoteToWrite", () => quoteToWrite(ctx, mirrorState)],
    ["jobsToClose", () => jobsToClose(ctx, mirrorState)],
    ["notInvoiced", () => notInvoiced(ctx)],
    ["factoryMin", () => factoryMin(ctx)],
    ["quoteFollow", () => (pipe ? quoteFollow(ctx, pipe, mirrorState) : Promise.reject(new Error("The pipeline couldn't be read")))],
    ["overdueInv", () => overdueInv(ctx)],
    ["vanCheck", () => vanCheck(ctx)],
    ["keepInTouch", () => keepInTouch(ctx)],
    ["orderTags", () => orderTags(ctx)],
    ["orderMoves", () => orderMoves(ctx)],
    ["workOrderSend", () => workOrderSend(ctx)],
    ["accountFlow", () => (pipe ? accountFlow(ctx, pipe).then(() => bookListSweep(ctx, pipe)) : Promise.reject(new Error("The pipeline couldn't be read")))],
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
  await saveSettings(MIRROR, mirrorState).catch(() => undefined);
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
