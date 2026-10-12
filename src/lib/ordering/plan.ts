// Supply › Next week: what to order and whom to book, worked out from what is
// already synced. Pure — no database, no network — so scripts/check-ordering.ts
// can run it against fixtures taken from live rows.
//
// The inputs are the two views from migration 0063: upcoming_order_lines (every
// unit, material and electrical line on the sold quote of each open install,
// with the supplier it routes to) and electrician_work_orders (one row per
// install with electrical on its quote).

import { TZ, addDays, isoDateMelbourne, startOfWeekMelbourne } from "../dashboard/dates";

export type OrderMethod = "reece_cart" | "email" | "email_form" | "work_order";

export type Supplier = {
  id: string;
  name: string;
  method: OrderMethod;
  email: string | null;
  notes: string | null;
  work_order_note: string | null;
  active: boolean;
  /** The office's own opening and closing for this supplier's emails (0065); blank uses the defaults below. */
  email_intro?: string | null;
  email_signoff?: string | null;
  /** Copied on every order to this supplier, as well as the office (0066). */
  cc_emails?: string[] | null;
  /**
   * Each delivery from this supplier carries a fee, so every job not yet
   * ordered from today to the end of next week goes on one order (0067).
   */
  combine_orders?: boolean | null;
};

/*
 * The wording each email opens and closes with, unless the office has written
 * its own on Supply › Supplier emails. {supplier} and {po} are filled in when
 * the email is built. Everything between — the order lines, delivery, needed
 * by, the booking details — is always generated, so the wording can be changed
 * without any risk of losing what the supplier needs to act on.
 */
export const DEFAULT_ORDER_INTRO = "Hi team,\n\nPlease supply the following for Advanced Gas & Aircon, order {po}.";
export const DEFAULT_ORDER_SIGNOFF = "Please confirm the order and expected delivery by replying to this email.";
export const DEFAULT_WORK_INTRO = "Hi Geoff,\n\nPlease book in the electrical for the install below.";

export function fillWording(template: string, vars: { supplier: string; po: string }): string {
  return template.replace(/\{supplier\}/gi, vars.supplier).replace(/\{po\}/gi, vars.po).trim();
}
const blank = (v: string | null | undefined) => !v || !v.trim();

export type OrderLine = {
  job_id: number;
  job_number: string | null;
  job_type: string | null;
  customer_name: string | null;
  suburb: string | null;
  install_date: string | null;
  estimate_id: number | null;
  sku_id: number | null;
  sku_name: string | null;
  description: string | null;
  sku_type: string | null;
  qty: number | null;
  unit_cost: number | null;
  supplier_id: string | null;
  issue: string | null;
  supplier_model: string | null;
  appointment_start: string | null;
  /** The supplier's own product number, from the pricebook item's vendor part (0066). */
  supplier_part?: string | null;
};

export type WorkOrderRow = {
  job_id: number;
  job_number: string | null;
  job_type: string | null;
  customer_name: string | null;
  site_address: string | null;
  crew: string | null;
  electrical_items: string | null;
  send_to: string | null;
  issue: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  system_installed: string | null;
  work_order_note: string | null;
  appointment_start_at: string | null;
  appointment_end_at: string | null;
  all_visits: string | null;
  install_date: string | null;
};

export type Week = { start: string; end: string };

export type PlannedLine = {
  job_id: number;
  job_number: string | null;
  customer_name: string | null;
  suburb: string | null;
  install_date: string | null;
  appointment_start: string | null;
  sku_id: number | null;
  sku_name: string | null;
  sku_type: string | null;
  description: string | null;
  supplier_model: string | null;
  supplier_part?: string | null;
  qty: number;
  unit_cost: number | null;
};

export type PlannedOrder = { supplier_id: string; lines: PlannedLine[] };

export type WorkOrderJob = {
  job_id: number;
  job_number: string | null;
  job_type: string | null;
  customer_name: string | null;
  system_installed: string | null;
  electrical_items: string | null;
};

export type WorkOrderDetails = {
  date: string;
  start_at: string | null;
  end_at: string | null;
  all_visits: string | null;
  site_address: string;
  crew: string[];
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  jobs: WorkOrderJob[];
  note: string | null;
};

export type PlannedWorkOrder = { supplier_id: string; group_key: string; details: WorkOrderDetails; lines: PlannedLine[] };

export type Problem = { job_number: string | null; customer_name: string | null; install_date: string | null; what: string };

export type WeekPlan = { week: Week; orders: PlannedOrder[]; workOrders: PlannedWorkOrder[]; problems: Problem[] };

/* ---------------------------------------------------------------- dates */

/** A YYYY-MM-DD date moved by whole days, without going near a timezone. */
export function isoAddDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Monday to Sunday of the week after the one `now` falls in, in Melbourne.
 * Run on a Wednesday, that is five to eleven days out: enough for a supplier
 * to deliver, close enough that the bookings have settled.
 */
export function nextWeek(now: Date): Week {
  // Midday on next week's Monday, read back as a Melbourne date, so a
  // daylight-saving change between now and then can't tip it a day.
  const start = isoDateMelbourne(new Date(addDays(startOfWeekMelbourne(now), 7).getTime() + 12 * 3600000));
  return { start, end: isoAddDays(start, 6) };
}

export function thisWeek(now: Date): Week {
  const start = isoDateMelbourne(new Date(startOfWeekMelbourne(now).getTime() + 12 * 3600000));
  return { start, end: isoAddDays(start, 6) };
}

export const inWeek = (date: string | null | undefined, w: Week) => !!date && date >= w.start && date <= w.end;

const dayFmt = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true });
const dayTimeFmt = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

// en-AU writes "Wed, 21 Oct"; the comma reads as a list on an order line.
const noComma = (s: string) => s.replace(/^(\w{3}),/, "$1");

/** "Mon 20 Oct" for a YYYY-MM-DD date. */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return noComma(dayFmt.format(new Date(Date.UTC(y, m - 1, d))));
}

/** "Mon 20 Oct, 7:30 am" for an instant, in Melbourne. */
export function dayTimeLabel(isoInstant: string): string {
  const d = new Date(isoInstant);
  return `${noComma(dayTimeFmt.format(d))}, ${timeFmt.format(d).replace(/\s?([ap])\.?m\.?/i, " $1m")}`;
}

/** Days before an install its gear should be at the factory, so there's time to check it and load the van. */
export const DELIVERY_LEAD_DAYS = 3;

/**
 * When an install's gear has to be delivered: three days before, moved back to
 * the Friday when that lands on a weekend — no supplier delivers on a Sunday.
 */
export function neededBy(installIso: string): string {
  let d = isoAddDays(installIso, -DELIVERY_LEAD_DAYS);
  const dow = () => { const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); };
  while (dow() === 0 || dow() === 6) d = isoAddDays(d, -1);
  return d;
}

/** Today in Melbourne, YYYY-MM-DD. */
export const todayMelbourne = () => isoDateMelbourne(new Date());

/**
 * The one delivery date for an order: the earliest any of its lines is needed
 * by. An order is one delivery — a date per line would invite one per line, and
 * a fee each. When that date is today or already gone, it says ASAP rather than
 * asking a supplier for a day that has passed.
 */
export function orderDelivery(lines: { install_date: string | null }[], today: string): { date: string | null; label: string } | null {
  const first = lines.map((l) => l.install_date).filter((d): d is string => !!d).sort()[0];
  if (!first) return null;
  const d = neededBy(first);
  return d <= today ? { date: null, label: "ASAP" } : { date: d, label: dayLabel(d) };
}

export function weekLabel(w: Week): string {
  return `${dayLabel(w.start)} – ${dayLabel(w.end)}`;
}

/* ---------------------------------------------------------------- checks */

/**
 * A supplier model code has no spaces in it ("PEA-M160HAA/PUZ-ZM160YKA"); a
 * pricebook name does ("Mitsubishi Electric 16kw Ducted"). The order form goes
 * to a supplier who looks the code up, so a name in that box means a phone
 * call at best and the wrong unit at worst. Flagged, not blocked: the office
 * can still send if they know better.
 */
export function modelLooksLikeName(model: string | null | undefined): boolean {
  return !model || /\s/.test(model.trim());
}

/* ---------------------------------------------------------------- the plan */

const lineKey = (jobId: number, skuId: number | null) => `${jobId}:${skuId ?? "-"}`;

/**
 * What to draft for a week.
 *
 * `alreadyOrdered` holds `job:sku` for every line on an order that has been
 * approved or sent, and `job:work` for every work order sent — so a redraft
 * after something has gone out only picks up what is new, and a job moved
 * into next week after its gear was ordered isn't ordered twice.
 */
export function planWeek(input: {
  week: Week;
  lines: OrderLine[];
  workOrders: WorkOrderRow[];
  suppliers: Supplier[];
  alreadyOrdered: Set<string>;
  /**
   * The dates a combine_orders supplier's order covers (today to the end of
   * next week), in place of `week`. Without it every supplier gets `week`.
   */
  combineWindow?: Week;
}): WeekPlan {
  const { week, lines, workOrders, suppliers, alreadyOrdered, combineWindow } = input;
  const byId = new Map(suppliers.filter((s) => s.active).map((s) => [s.id, s]));
  const problems: Problem[] = [];
  const seenProblem = new Set<string>();
  const problem = (p: Problem) => {
    const k = `${p.job_number}|${p.what}`;
    if (!seenProblem.has(k)) { seenProblem.add(k); problems.push(p); }
  };

  const combines = (id: string | null) => !!combineWindow && !!id && !!byId.get(id)?.combine_orders;
  const weekLines = lines.filter((l) => inWeek(l.install_date, combines(l.supplier_id) ? combineWindow! : week));

  // ---- supplier orders
  const orders = new Map<string, PlannedLine[]>();
  for (const l of weekLines) {
    if (l.issue) {
      problem({ job_number: l.job_number, customer_name: l.customer_name, install_date: l.install_date,
        what: l.issue === "No supplier set for this item" ? `No supplier for ${l.sku_name ?? "an item"}` : l.issue });
      continue;
    }
    const s = l.supplier_id ? byId.get(l.supplier_id) : undefined;
    if (!s || s.method === "work_order") continue;
    if (alreadyOrdered.has(lineKey(l.job_id, l.sku_id))) continue;
    const qty = Number(l.qty ?? 1);
    if (!(qty > 0)) continue;
    if (s.method === "email_form" && modelLooksLikeName(l.supplier_model)) {
      problem({ job_number: l.job_number, customer_name: l.customer_name, install_date: l.install_date,
        what: `${s.name} needs a model code, not "${l.supplier_model ?? l.sku_name}" — fill in Model on that item in the ServiceTitan pricebook` });
    }
    const list = orders.get(s.id) ?? [];
    list.push({
      job_id: l.job_id, job_number: l.job_number, customer_name: l.customer_name, suburb: l.suburb,
      install_date: l.install_date, appointment_start: l.appointment_start,
      sku_id: l.sku_id, sku_name: l.sku_name, sku_type: l.sku_type, description: l.description,
      supplier_model: l.supplier_model, supplier_part: l.supplier_part ?? null, qty, unit_cost: l.unit_cost == null ? null : Number(l.unit_cost),
    });
    orders.set(s.id, list);
  }

  // ---- electrician work orders: one per site per day, so two jobs at one
  // address on one day are one visit for him, not two emails.
  const groups = new Map<string, { supplier_id: string; rows: WorkOrderRow[] }>();
  for (const w of workOrders) {
    if (!inWeek(w.install_date, week)) continue;
    if (alreadyOrdered.has(`${w.job_id}:work`)) continue;
    if (w.issue && w.issue !== "No customer contact on file") {
      problem({ job_number: w.job_number, customer_name: w.customer_name, install_date: w.install_date, what: `Electrician: ${w.issue.toLowerCase()}` });
    } else if (w.issue) {
      problem({ job_number: w.job_number, customer_name: w.customer_name, install_date: w.install_date, what: "Electrician: no customer phone or email in ServiceTitan" });
    }
    const supplier = suppliers.find((s) => s.method === "work_order" && s.active);
    if (!supplier || !w.install_date) continue;
    const key = `${w.install_date}|${(w.site_address ?? `job ${w.job_number}`).toLowerCase()}`;
    const g = groups.get(key) ?? { supplier_id: supplier.id, rows: [] };
    g.rows.push(w);
    groups.set(key, g);
  }

  const workPlans: PlannedWorkOrder[] = [...groups.entries()].map(([key, g]) => {
    const rows = [...g.rows].sort((a, b) => (a.appointment_start_at ?? "").localeCompare(b.appointment_start_at ?? ""));
    const first = rows[0];
    const crew = [...new Set(rows.flatMap((r) => (r.crew ?? "").split(",").map((s) => s.trim()).filter(Boolean)))];
    const withContact = rows.find((r) => r.customer_phone || r.customer_email) ?? first;
    const details: WorkOrderDetails = {
      date: first.install_date!,
      start_at: first.appointment_start_at,
      end_at: rows.map((r) => r.appointment_end_at).filter(Boolean).sort().pop() ?? null,
      all_visits: first.all_visits,
      site_address: first.site_address ?? "",
      crew,
      customer_name: withContact.customer_name,
      customer_phone: withContact.customer_phone,
      customer_email: withContact.customer_email,
      jobs: rows.map((r) => ({
        job_id: r.job_id, job_number: r.job_number, job_type: r.job_type, customer_name: r.customer_name,
        system_installed: r.system_installed, electrical_items: r.electrical_items,
      })),
      note: first.work_order_note,
    };
    // One line per job, so "has this job's electrician been booked" is
    // answered the same way as "has this job's gear been ordered".
    const lines: PlannedLine[] = rows.map((r) => ({
      job_id: r.job_id, job_number: r.job_number, customer_name: r.customer_name, suburb: null,
      install_date: r.install_date, appointment_start: r.appointment_start_at,
      sku_id: null, sku_name: "ELECTRICAL", sku_type: "Service", description: r.electrical_items,
      supplier_model: null, qty: 1, unit_cost: null,
    }));
    return { supplier_id: g.supplier_id, group_key: key, details, lines };
  });

  const orderPlans = [...orders.entries()]
    .map(([supplier_id, ls]) => ({
      supplier_id,
      lines: ls.sort((a, b) => (a.install_date ?? "").localeCompare(b.install_date ?? "") || (a.job_number ?? "").localeCompare(b.job_number ?? "")),
    }))
    .sort((a, b) => (byId.get(a.supplier_id)?.name ?? "").localeCompare(byId.get(b.supplier_id)?.name ?? ""));

  problems.sort((a, b) => (a.install_date ?? "").localeCompare(b.install_date ?? "") || (a.job_number ?? "").localeCompare(b.job_number ?? ""));
  return {
    week,
    orders: orderPlans,
    workOrders: workPlans.sort((a, b) => (a.details.start_at ?? a.details.date).localeCompare(b.details.start_at ?? b.details.date)),
    problems,
  };
}

/* ---------------------------------------------------------------- order lines as the supplier reads them */

export type SupplierRow = { model: string; description: string | null; qty: number; unit_cost: number | null; jobs: string[]; first_install: string | null };

/**
 * The same unit for three jobs is one line of three on the order, with the
 * jobs it is for alongside — the supplier picks by model, we unpack by job.
 */
export function supplierRows(lines: PlannedLine[]): SupplierRow[] {
  const m = new Map<string, SupplierRow>();
  for (const l of lines) {
    const model = (l.supplier_model ?? l.sku_name ?? "").trim();
    const key = model.toLowerCase();
    const r = m.get(key) ?? { model, description: l.description, qty: 0, unit_cost: l.unit_cost, jobs: [], first_install: l.install_date };
    r.qty += l.qty;
    if (l.job_number && !r.jobs.includes(l.job_number)) r.jobs.push(l.job_number);
    if (l.install_date && (!r.first_install || l.install_date < r.first_install)) r.first_install = l.install_date;
    m.set(key, r);
  }
  return [...m.values()].sort((a, b) => (a.first_install ?? "").localeCompare(b.first_install ?? "") || a.model.localeCompare(b.model));
}

export const linesTotal = (lines: PlannedLine[]) =>
  lines.reduce((t, l) => t + (l.unit_cost == null ? 0 : l.unit_cost * l.qty), 0);

export function poNumber(week: Week, supplierId: string, n: number): string {
  const code = supplierId.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  return `AGA-${week.start.replace(/-/g, "").slice(2)}-${code}${n > 1 ? `-${n}` : ""}`;
}

/* ---------------------------------------------------------------- emails */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** The office's wording into email HTML: escaped, line breaks kept. */
const paras = (t: string) => esc(t).replace(/\r?\n/g, "<br>");
const money = (n: number | null) => (n == null ? "" : `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const qtyStr = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const cell = "padding:8px 10px;border-bottom:1px solid #eae7dd;font:14px/20px " + SANS + ";color:#050a30;vertical-align:top;";
const head = "padding:8px 10px;border-bottom:2px solid #050a30;font:600 12px/16px " + SANS + ";color:#6b6a68;text-align:left;text-transform:uppercase;letter-spacing:.06em;";

function shell(title: string, intro: string, body: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f9f8f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f8f3;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;">
<tr><td style="padding:24px 24px 8px;font:800 20px/26px ${SANS};color:#050a30;">${esc(title)}</td></tr>
<tr><td style="padding:0 24px 16px;font:15px/22px ${SANS};color:#050a30;">${intro}</td></tr>
<tr><td style="padding:0 24px 16px;">${body}</td></tr>
<tr><td style="padding:8px 24px 24px;font:13px/19px ${SANS};color:#6b6a68;">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export type EmailParts = { subject: string; html: string; text: string };

export type OrderingSettings = {
  replyTo: string;
  deliveryAddress: string;
  orderedBy: string;
  mitsubishi?: {
    accountName?: string; accountNumber?: string; abn?: string; salesRep?: string; contactName?: string; contactNumber?: string;
  };
  /** Who signs Mitsubishi's form: Print Name and Position. */
  signName?: string;
  signPosition?: string;
  /** The delivery instruction on an order coming to the factory, unless the order has its own. */
  factoryInstructions?: string;
  /** Said on every delivery, wherever it's going ("We do not have a forklift."). */
  deliveryNote?: string;
};

const sentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/**
 * What an order says about delivery: its own instructions, or the factory's
 * when it is coming to the factory — then the note every delivery carries.
 * The note is added rather than being part of the instructions, so typing
 * instructions for one order can't drop it.
 */
export function deliveryInstructionsFor(
  po: { delivery_instructions: string | null; delivery_to_site: boolean },
  settings: Pick<OrderingSettings, "factoryInstructions" | "deliveryNote">,
): string | null {
  const own = po.delivery_instructions?.trim() || (po.delivery_to_site ? "" : settings.factoryInstructions?.trim() ?? "");
  const note = settings.deliveryNote?.trim() ?? "";
  const parts = [own, note].filter(Boolean).filter((p, i, all) => i === 0 || !all[0].toLowerCase().includes(p.toLowerCase().replace(/\.$/, "")));
  return parts.length ? parts.map(sentence).join(" ") : null;
}

export function supplierOrderEmail(o: {
  supplier: Supplier;
  poNumber: string;
  lines: PlannedLine[];
  delivery: string;
  deliveryInstructions: string | null;
  settings: OrderingSettings;
  attached: boolean;
  /** Melbourne date the email goes out; defaults to now. */
  today?: string;
}): EmailParts {
  const rows = supplierRows(o.lines);
  const firstNeeded = rows.map((r) => r.first_install).filter(Boolean).sort()[0] ?? null;
  const deliver = orderDelivery(o.lines, o.today ?? todayMelbourne());
  const subject = `Order ${o.poNumber} — Advanced Gas & Aircon${deliver ? ` — deliver by ${deliver.label}` : ""}`;
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr><th style="${head}">Qty</th><th style="${head}">Model / item</th><th style="${head}">For job</th><th style="${head}">Install</th></tr>
${rows.map((r) => `<tr><td style="${cell}">${qtyStr(r.qty)}</td><td style="${cell}"><strong>${esc(r.model)}</strong>${r.description && r.description !== r.model ? `<br><span style="color:#6b6a68;">${esc(r.description)}</span>` : ""}</td><td style="${cell}">${esc(r.jobs.join(", "))}</td><td style="${cell}">${r.first_install ? esc(dayLabel(r.first_install)) : ""}</td></tr>`).join("\n")}
</table>`;
  const vars = { supplier: o.supplier.name, po: o.poNumber };
  const opening = fillWording(blank(o.supplier.email_intro) ? DEFAULT_ORDER_INTRO : o.supplier.email_intro!, vars);
  const closing = fillWording(blank(o.supplier.email_signoff) ? DEFAULT_ORDER_SIGNOFF : o.supplier.email_signoff!, vars);
  const intro = paras(opening)
    + (o.attached ? "<br><br>Your order form is attached, filled in." : "")
    + `<br><br><strong>Deliver to:</strong> ${esc(o.delivery)}`
    + (o.deliveryInstructions ? `<br><strong>Instructions:</strong> ${esc(o.deliveryInstructions)}` : "")
    + (deliver && firstNeeded ? `<br><strong>Deliver by:</strong> ${esc(deliver.label)} (first install ${esc(dayLabel(firstNeeded))}) — all in one delivery, please` : "");
  const footer = `${paras(closing)}<br><br>Replies go to ${esc(o.settings.replyTo)}.<br>${esc(o.settings.orderedBy)} · Advanced Gas &amp; Aircon · 03 5947 8000`;
  const text = [
    opening,
    ...(o.attached ? ["Your order form is attached, filled in."] : []),
    "",
    `Deliver to: ${o.delivery}`,
    ...(o.deliveryInstructions ? [`Instructions: ${o.deliveryInstructions}`] : []),
    ...(deliver && firstNeeded ? [`Deliver by: ${deliver.label} (first install ${dayLabel(firstNeeded)}) — all in one delivery, please`] : []),
    "",
    ...rows.map((r) => `${qtyStr(r.qty)} x ${r.model}${r.description && r.description !== r.model ? ` (${r.description})` : ""} — job ${r.jobs.join(", ")}${r.first_install ? `, install ${dayLabel(r.first_install)}` : ""}`),
    "",
    closing,
    `Replies go to ${o.settings.replyTo}.`,
    `${o.settings.orderedBy} · Advanced Gas & Aircon · 03 5947 8000`,
  ].join("\n");
  return { subject, html: shell(`Order ${o.poNumber}`, intro, table, footer), text };
}

export function workOrderEmail(o: { supplier: Supplier; poNumber: string; details: WorkOrderDetails; settings: OrderingSettings }): EmailParts {
  const d = o.details;
  const when = d.start_at ? dayTimeLabel(d.start_at) : dayLabel(d.date);
  // Geoff knows a visit by the job number and the address, not by our order
  // number, so that is what the work order is called (o.poNumber stays the
  // portal's own record of it).
  const ref = workRef(d);
  const subject = `Work order — ${ref} — ${when}`;
  const row = (k: string, v: string | null | undefined) =>
    v ? `<tr><td style="${cell}width:150px;color:#6b6a68;">${esc(k)}</td><td style="${cell}">${v}</td></tr>` : "";
  const contact = [d.customer_name, d.customer_phone, d.customer_email].filter(Boolean).map((s) => esc(String(s))).join(" · ");
  const jobs = d.jobs.map((j) =>
    `<strong>Job ${esc(j.job_number ?? "")}</strong> · ${esc(j.job_type ?? "")}`
    + (j.system_installed ? `<br>System: ${esc(j.system_installed)}` : "")
    + (j.electrical_items ? `<br><span style="color:#6b6a68;">Electrical on the quote: ${esc(j.electrical_items)}</span>` : "")).join("<br><br>");
  const body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
${row("When", esc(when) + (d.all_visits && d.all_visits.includes(",") ? `<br><span style="color:#6b6a68;">Our crew is on site: ${esc(d.all_visits)}</span>` : ""))}
${row("Site", esc(d.site_address))}
${row("The job", jobs)}
${row("Our crew on site", esc(d.crew.join(", ") || "To be confirmed"))}
${row("Customer", contact || "No contact on file — call us")}
</table>`;
  const vars = { supplier: o.supplier.name, po: ref };
  const opening = fillWording(blank(o.supplier.email_intro) ? DEFAULT_WORK_INTRO : o.supplier.email_intro!, vars);
  // The note to the electrician: the office's current wording, else the one
  // stored with the work order when it was drafted.
  const note = !blank(o.supplier.email_signoff) ? fillWording(o.supplier.email_signoff!, vars) : d.note;
  const intro = paras(opening);
  const footer = `${note ? `<strong style="color:#050a30;">${paras(note)}</strong><br><br>` : ""}Email us at ${esc(o.settings.replyTo)} · Advanced Gas &amp; Aircon · 03 5947 8000`;
  const text = [
    opening, "",
    `When: ${when}${d.all_visits && d.all_visits.includes(",") ? ` (our crew on site: ${d.all_visits})` : ""}`,
    `Site: ${d.site_address}`,
    ...d.jobs.map((j) => `Job ${j.job_number} · ${j.job_type}${j.system_installed ? ` · System: ${j.system_installed}` : ""}${j.electrical_items ? ` · Electrical: ${j.electrical_items}` : ""}`),
    `Our crew on site: ${d.crew.join(", ") || "To be confirmed"}`,
    `Customer: ${[d.customer_name, d.customer_phone, d.customer_email].filter(Boolean).join(" · ") || "No contact on file — call us"}`,
    "",
    ...(note ? [note, ""] : []),
    `Email us at ${o.settings.replyTo} · Advanced Gas & Aircon · 03 5947 8000`,
  ].join("\n");
  return { subject, html: shell(`Work order — ${workJobs(d)}`, intro, body, footer), text };
}

/** "Job 20309" or "Job 20309 & 20311" — the jobs one electrician visit covers. */
export const workJobs = (d: WorkOrderDetails) =>
  `Job ${d.jobs.map((j) => j.job_number).filter(Boolean).join(" & ")}`;

/** What a work order is called: the job number and the address. */
export const workRef = (d: WorkOrderDetails) => `${workJobs(d)} — ${d.site_address}`;

/**
 * A typed CC box: addresses split on commas, semicolons or spaces. Anything
 * that isn't an address is handed back rather than dropped, so a typo is
 * pointed out instead of someone quietly not being copied in.
 */
export function parseEmails(s: string): { ok: string[]; bad: string[] } {
  const ok: string[] = [];
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const part of s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) bad.push(part);
    else if (!seen.has(part.toLowerCase())) { seen.add(part.toLowerCase()); ok.push(part); }
  }
  return { ok, bad };
}

/**
 * Who an order email copies: the office (so replies and the sent order land
 * in the shared inbox), the supplier's standing copies, and anyone added to
 * this one order — each once, and never the person it is addressed to.
 */
export function ccList(settings: Pick<OrderingSettings, "replyTo">, supplier: Supplier, po: { cc_emails?: string[] | null } | null, to: string | null): string[] {
  const all = [settings.replyTo, ...(supplier.cc_emails ?? []), ...(po?.cc_emails ?? [])]
    .map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  const seen = new Set<string>(to ? [to.toLowerCase()] : []);
  return all.filter((e) => (seen.has(e.toLowerCase()) ? false : (seen.add(e.toLowerCase()), true)));
}

/* ---------------------------------------------------------------- Reece: one list per job */

export type JobGroup<L extends PlannedLine = PlannedLine> = { job_id: number; job_number: string | null; customer_name: string | null; suburb: string | null;
  install_date: string | null; appointment_start: string | null; lines: L[] };

/** Lines grouped by job, earliest install first — one maX cart per job. */
export function byJob<L extends PlannedLine>(lines: L[]): JobGroup<L>[] {
  const m = new Map<number, JobGroup<L>>();
  for (const l of lines) {
    const g = m.get(l.job_id) ?? { job_id: l.job_id, job_number: l.job_number, customer_name: l.customer_name, suburb: l.suburb,
      install_date: l.install_date, appointment_start: l.appointment_start, lines: [] };
    g.lines.push(l);
    m.set(l.job_id, g);
  }
  return [...m.values()].sort((a, b) => (a.install_date ?? "").localeCompare(b.install_date ?? "") || (a.job_number ?? "").localeCompare(b.job_number ?? ""));
}

const jobHeading = (g: JobGroup) =>
  [`Job ${g.job_number ?? ""}`, g.customer_name, g.suburb].filter(Boolean).join(" · ")
  + (g.appointment_start ? ` — install ${dayTimeLabel(g.appointment_start)}` : g.install_date ? ` — install ${dayLabel(g.install_date)}` : "");

/**
 * The Reece list: one table per job, each line with Reece's product number
 * where the pricebook has it, so each job can go into maX as its own cart.
 * Not emailed to Reece — it's what the office works from (and what a test or
 * sample shows).
 */
export function reeceListEmail(o: { supplier: Supplier; poNumber: string; lines: PlannedLine[]; delivery: string; settings: OrderingSettings; instructions?: string | null }): EmailParts {
  const groups = byJob(o.lines);
  const missing = o.lines.filter((l) => !l.supplier_part).length;
  const subject = `Reece list ${o.poNumber} — ${groups.length} job${groups.length === 1 ? "" : "s"}, ${o.lines.length} line${o.lines.length === 1 ? "" : "s"}`;
  const table = (g: JobGroup) => `<p style="margin:18px 0 6px;font:700 15px/21px ${SANS};color:#050a30;">${esc(jobHeading(g))}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
<tr><th style="${head}width:48px;">Qty</th><th style="${head}width:120px;">Reece #</th><th style="${head}">Item</th></tr>
${g.lines.map((l) => `<tr><td style="${cell}">${qtyStr(l.qty)}</td><td style="${cell}font-family:ui-monospace,Menlo,Consolas,monospace;">${l.supplier_part ? esc(l.supplier_part) : `<span style="color:#b04711;">not set</span>`}</td><td style="${cell}"><strong>${esc(l.sku_name ?? "")}</strong>${l.description && l.description !== l.sku_name ? `<br><span style="color:#6b6a68;">${esc(l.description)}</span>` : ""}</td></tr>`).join("\n")}
</table>`;
  const intro = `One list per job — enter each as its own cart in Reece maX, delivered to ${esc(o.delivery)}.`
    + (o.instructions ? `<br><strong>Delivery instructions for maX:</strong> ${esc(o.instructions)}` : "")
    + (missing ? `<br><span style="color:#b04711;">${missing} line${missing === 1 ? " has" : "s have"} no Reece product number in the ServiceTitan pricebook yet.</span>` : "");
  const footer = `${esc(o.settings.orderedBy)} · Advanced Gas &amp; Aircon`;
  const text = [
    `One list per job — enter each as its own cart in Reece maX, delivered to ${o.delivery}.`,
    ...(o.instructions ? [`Delivery instructions for maX: ${o.instructions}`] : []),
    ...(missing ? [`${missing} line(s) have no Reece product number in the pricebook yet.`] : []),
    "",
    ...groups.flatMap((g) => [jobHeading(g), ...g.lines.map((l) => `  ${qtyStr(l.qty)} x ${l.supplier_part ?? "(no Reece #)"}  ${l.sku_name ?? ""}`), ""]),
  ].join("\n");
  return { subject, html: shell(`Reece list ${o.poNumber}`, intro, groups.map(table).join(""), footer), text };
}

/* ---------------------------------------------------------------- Mitsubishi: the attached form is the order */

/** "1 Sierra Circuit, Pakenham VIC 3810" → street, state, postcode, as the form's boxes want them. */
export function splitAddress(a: string): { street: string; state: string; postcode: string } {
  const m = a.match(/^(.*?)[,\s]+(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})\s*$/i);
  return m ? { street: m[1], state: m[2].toUpperCase(), postcode: m[3] } : { street: a, state: "", postcode: "" };
}

/** What the order form is called as an attachment — named so it is found in an inbox. */
export const mitsubishiFormFilename = (poNumber: string) => `${poNumber} Mitsubishi Electric order form.pdf`;

/**
 * Mitsubishi only accept an order on their own order form, so the filled-in
 * PDF is the order and the email is a covering note. It deliberately does not
 * repeat the order lines: a second copy in the body is a second version for
 * their customer service to reconcile, and they process the form.
 */
export function mitsubishiOrderEmail(o: {
  supplier: Supplier; poNumber: string; orderDate: string; lines: PlannedLine[]; delivery: string;
  deliveryInstructions: string | null; settings: OrderingSettings; attached: boolean;
  /** Melbourne date the email goes out; defaults to now. */
  today?: string;
}): EmailParts {
  const rows = supplierRows(o.lines);
  const acct = o.settings.mitsubishi ?? {};
  const units = rows.reduce((t, r) => t + r.qty, 0);
  const needed = orderDelivery(o.lines, o.today ?? todayMelbourne())?.label ?? null;
  const subject = `Order ${o.poNumber} — Advanced Gas & Aircon${acct.accountNumber ? ` (account ${acct.accountNumber})` : ""}${needed ? ` — deliver by ${needed}` : ""}`;
  const vars = { supplier: o.supplier.name, po: o.poNumber };
  const opening = fillWording(blank(o.supplier.email_intro) ? DEFAULT_ORDER_INTRO : o.supplier.email_intro!, vars);
  const closing = fillWording(blank(o.supplier.email_signoff) ? DEFAULT_ORDER_SIGNOFF : o.supplier.email_signoff!, vars);
  const file = mitsubishiFormFilename(o.poNumber);

  const facts: [string, string][] = [
    ["Order number", o.poNumber],
    ["Account", [acct.accountName, acct.accountNumber].filter(Boolean).join(" — ")],
    ["Units", `${units} (${rows.length} model${rows.length === 1 ? "" : "s"})`],
    ...(needed ? [["Deliver by", `${needed} — all in one delivery`] as [string, string]] : []),
    ["Deliver to", o.delivery],
    ...(o.deliveryInstructions ? [["Delivery instructions", o.deliveryInstructions] as [string, string]] : []),
  ];
  const lbl = `padding:5px 14px 5px 0;font:13px/18px ${SANS};color:#6b6a68;white-space:nowrap;vertical-align:top;`;
  const val = `padding:5px 0;font:600 13px/18px ${SANS};color:#050a30;vertical-align:top;`;
  const attachedNote = o.attached
    ? `<p style="margin:0 0 14px;padding:12px 14px;border:1px solid #d9d4c7;border-radius:8px;font:600 14px/20px ${SANS};color:#050a30;">Our order is on your order form, attached: <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:400;">${esc(file)}</span></p>`
    : "";
  const body = attachedNote + `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${facts.map(([k, v]) =>
    `<tr><td style="${lbl}">${esc(k)}</td><td style="${val}">${esc(v || "—")}</td></tr>`).join("")}</table>`;
  const footer = `${paras(closing)}<br><br>Replies go to ${esc(o.settings.replyTo)}.<br>${esc(o.settings.orderedBy)} · Advanced Gas &amp; Aircon · 03 5947 8000`;
  const text = [
    opening, "",
    ...(o.attached ? [`Our order is on your order form, attached: ${file}`, ""] : []),
    ...facts.map(([k, v]) => `${k}: ${v || "—"}`), "",
    closing, `Replies go to ${o.settings.replyTo}.`, `${o.settings.orderedBy} · Advanced Gas & Aircon · 03 5947 8000`,
  ].join("\n");
  return { subject, html: shell(`Order ${o.poNumber}`, paras(opening), body, footer), text };
}

export function readyEmail(o: { week: Week; orders: { name: string; lines: number; total: number }[]; workOrders: number; problems: Problem[]; link: string }): EmailParts {
  const subject = `Next week's orders are ready to approve — ${weekLabel(o.week)}`;
  const items = o.orders.map((x) => `<li>${esc(x.name)}: ${x.lines} line${x.lines === 1 ? "" : "s"}${x.total ? `, ${money(x.total)}` : ""}</li>`).join("");
  const body = `<ul style="margin:0;padding-left:20px;font:15px/24px ${SANS};color:#050a30;">${items}${o.workOrders ? `<li>Electrician: ${o.workOrders} work order${o.workOrders === 1 ? "" : "s"}</li>` : ""}</ul>`
    + (o.problems.length ? `<p style="font:14px/20px ${SANS};color:#c2410c;">${o.problems.length} thing${o.problems.length === 1 ? "" : "s"} couldn't be ordered — see the page.</p>` : "");
  const intro = `Drafted from next week's bookings and their sold quotes. Nothing has gone to anyone yet.`;
  const footer = `<a href="${esc(o.link)}" style="color:#f46722;font-weight:700;">Review and approve →</a>`;
  const text = [intro, "", ...o.orders.map((x) => `${x.name}: ${x.lines} lines${x.total ? `, ${money(x.total)}` : ""}`),
    ...(o.workOrders ? [`Electrician: ${o.workOrders} work orders`] : []),
    ...(o.problems.length ? [`${o.problems.length} things couldn't be ordered — see the page.`] : []), "", o.link].join("\n");
  return { subject, html: shell(`Next week · ${weekLabel(o.week)}`, intro, body, footer), text };
}
