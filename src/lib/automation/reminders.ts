import "server-only";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { sbInsert, sbSelectOne, sbUpdateReturning } from "@/lib/dashboard/db";
import { toBillJobs } from "@/lib/dashboard/toBill";
import { loadPipeline } from "@/lib/pipeline/store";
import type { PipeQuote } from "@/lib/pipeline/types";
import { isLow, listStock } from "@/lib/portal/stock";
import { listStockLines, shelfMatch } from "@/lib/ordering/stockLines";
import { addStockLine, draftFor, loadSuppliers } from "@/lib/ordering/db";
import { nextWeek } from "@/lib/ordering/plan";
import { ordersToUpdate, updateJobs } from "@/lib/ordering/stJobNotes";
import { owedInvoices } from "@/lib/portal/run/money";
import { latestChecksForVans, listVehicles } from "@/lib/portal/db";
import { cleanCell } from "@/components/portal/fleetStatus";
import { listContacts } from "@/lib/contacts/store";
import { lastWords, nextDue, touchState } from "@/lib/contacts/types";
import { matchName } from "@/lib/portal/crewFile/match";
import { MAX_LISTS, createAutoTodo, officeIds, saveTodoLists, teamPeople, todoLists } from "@/lib/todos/store";
import type { Person } from "@/lib/todos/types";
import { loadMade, loadSwitches, logAuto, saveMade, type AutoEntry, type AutoKey, type AutoSwitches } from "./log";
import { clearApprovedQuoteTags } from "./quoteTag";

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
  /** Who the Accounts list's to-dos go to. */
  accounts: Person | null;
  today: string;
  made: Map<string, string>;
  log: AutoEntry[];
  people: Person[];
  office: Person | null;
  lists: string[];
};

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

async function todo(ctx: Ctx, kind: AutoKey, key: string, t: { title: string; notes?: string; to: Person | null; sales?: boolean; accounts?: boolean; booking?: boolean; jobId?: number }): Promise<boolean> {
  if (ctx.made.has(key)) return false;
  const to = t.to ?? (t.accounts ? ctx.accounts : null) ?? ctx.office;
  if (!to) return false;
  try {
    await createAutoTodo({ title: t.title, notes: t.notes ?? null, assigneeId: to.id, dueOn: ctx.today, list: listFor(ctx, !!t.sales, !!t.accounts, !!t.booking) ?? listFor(ctx, false) });
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
export const ACCOUNTS = "Accounts";
async function ensureAccountsList(lists: string[], sw: AutoSwitches): Promise<string[]> {
  if (lists.includes(ACCOUNTS) || !(sw.notInvoiced || sw.overdueInv) || lists.length >= MAX_LISTS) return lists;
  const next = [...lists, ACCOUNTS];
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
    if (age < 3 || age > 45) continue;
    if (await todo(ctx, "soldNotBooked", `sold:${q.key}`, {
      title: `Book in ${who(q)}, sold ${age} days ago`,
      notes: [`${q.jobNumber ? `Job #${q.jobNumber} · ` : ""}${q.what ?? "Sold quote"}${q.value ? ` · ${money(q.value)}` : ""}.`, `Sold ${dayLabel(q.soldOn)} and nothing's been booked from it yet. It's in Pipeline › Sold, to be booked.`].join("\n"),
      to: null, sales: true, booking: true, jobId: q.jobId ?? undefined,
    })) n++;
  }
}

/** Finished before today and still no invoice: by the next morning it should have gone. */
async function notInvoiced(ctx: Ctx) {
  const rows = await toBillJobs();
  let n = 0;
  for (const r of rows) {
    if (n >= PER_RUN) break;
    const done = isoDateMelbourne(new Date(r.at));
    if (done >= ctx.today || daysBetween(done, ctx.today) > 14) continue;
    if (await todo(ctx, "notInvoiced", `bill:${r.id}`, {
      title: `Invoice job ${r.jobNumber ?? r.id}${r.customer ? `, ${r.customer}` : ""}`,
      notes: `${r.jobType ?? "Job"}${r.suburb ? ` in ${r.suburb}` : ""}, finished ${dayLabel(done)}${r.value ? `, sold at ${money(r.value)}` : ""}. No invoice in ServiceTitan yet.`,
      to: null, accounts: true, jobId: r.id,
    })) n++;
  }
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

/** A quote due a follow-up call, two days or more: a to-do for whoever's chasing it, or whoever wrote it. */
async function quoteFollow(ctx: Ctx, pipe: PipeQuote[]) {
  let n = 0;
  for (const q of pipe) {
    if (n >= PER_RUN) break;
    if (q.stage !== "due" || !q.quotedOn) continue;
    if (q.quietDays < 2 || daysBetween(q.quotedOn, ctx.today) > 30) continue;
    const to = personNamed(ctx, q.owner) ?? personNamed(ctx, q.quotedBy);
    if (await todo(ctx, "quoteFollow", `follow:${q.key}:${q.nextOn ?? q.quotedOn}`, {
      title: `Follow up ${who(q)}${q.value ? `, ${money(q.value)}` : ""}`,
      notes: [`${q.what ?? "Quote"}${q.jobNumber ? ` · job #${q.jobNumber}` : ""}${q.phone ? ` · ${q.phone}` : ""}.`, `Quoted ${dayLabel(q.quotedOn)}, quiet ${q.quietDays} days. Log the call on the Pipeline so it moves on.`].join("\n"),
      to, sales: true, jobId: q.jobId ?? undefined,
    })) n++;
  }
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
  const ctx: Ctx = { sw, today: isoDateMelbourne(new Date()), made, log: [], people, office, accounts, lists: await ensureAccountsList(lists, sw) };
  const needPipe = sw.soldNotBooked || sw.quoteFollow;
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
  await logAuto(ctx.log).catch(() => undefined);
  return { ran, failed };
}
