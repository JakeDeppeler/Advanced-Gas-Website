/**
 * Work orders from email: the shapes and rules, with nothing that fetches or
 * writes, so scripts/check-outlook.ts can run them against the subjects and
 * senders the mailboxes actually get.
 *
 * Three kinds come in and each needs a visit booked (Jake, 5 Nov): a work
 * order (do the job), a request to quote (come and look), and a quote
 * accepted (go ahead). Everything else from the same senders — progress
 * updates, invoices, statements, "please confirm" — isn't one.
 */

import { addressOf, TEAM_DOMAIN, type GraphMessage } from "./outlookTypes";

/** The Outlook category that asks for an email to be treated as a work order. */
export const WORK_ORDER_CATEGORY = "Work order";
/** Put on the email once its booking is in ServiceTitan, so the inbox shows it's done. */
export const BOOKED_CATEGORY = "In ServiceTitan";

export type WorkOrderKind = "work_order" | "quote_request" | "quote_accepted";

/** Senders whose mail is mostly work orders: worth the model's look every time. */
const PLATFORMS = /@(?:[\w.-]+\.)?(propertyme\.com|tapihq\.com|propertytree\.com|rentmanager\.com|ourproperty\.com\.au|console\.com\.au|maintenancemanager\.com\.au)$/i;
const WORDS = /\b(cancel(?:led|lation)?\s+(?:the\s+)?(?:work\s*order|job|quote|booking|attendance)|work\s*order|maintenance\s*(request|order)|job\s*#\s*\d|request\s*for\s*(a\s*)?quot\w*|provide\s*a\s*quote|quote\s*(accepted|approved)|repair\s*request|urgent\s*work)\b/i;

/** A forward from one of us: someone sending a work order in by hand. */
export function isTeamForward(m: GraphMessage): boolean {
  const from = addressOf(m.from) || addressOf(m.sender);
  return TEAM_DOMAIN.test(from) && /^\s*(fw|fwd)\s*:/i.test(m.subject ?? "");
}

/**
 * Whether an email is worth reading for a work order. Cheap and generous: the
 * model decides, this only saves asking it about every newsletter.
 */
export function mightBeWorkOrder(m: GraphMessage, bodyText: string): boolean {
  const from = addressOf(m.from) || addressOf(m.sender);
  if (PLATFORMS.test(from)) return true;
  return WORDS.test(m.subject ?? "") || WORDS.test(bodyText.slice(0, 3000));
}

const ABBREV: Record<string, string> = {
  street: "st", road: "rd", court: "ct", crescent: "cres", avenue: "ave", drive: "dr", circuit: "cct", place: "pl",
  parade: "pde", boulevard: "bvd", close: "cl", grove: "gr", terrace: "tce", highway: "hwy", lane: "ln", way: "way",
};

/** One spelling for an address, so "16 Kallista Circuit" and "16 Kallista Cct" are the same place. */
export function addressKey(street: string, suburb = ""): string {
  const words = `${street} ${suburb}`.toLowerCase().replace(/\b(vic|victoria|\d{4}$)\b/g, " ").replace(/[^a-z0-9/ ]/g, " ").split(/\s+/).filter(Boolean);
  return words.map((w) => ABBREV[w] ?? w).join(" ");
}

/**
 * What makes two emails the same work order: the platform's number when there
 * is one (a Tapi reminder repeats it with a suffix, "TAPI-00819-3"), else the
 * address. Kind is part of it, so a quote request and the later acceptance
 * for the same house are two bookings, as they're two visits.
 */
export function dedupeKey(kind: WorkOrderKind, number: string, street: string, suburb: string): string {
  const n = number.toUpperCase().replace(/\s+/g, "");
  const tapi = /TAPI-0*(\d+)/.exec(n);
  const num = tapi ? `TAPI-${tapi[1]}` : n.replace(/^(JOB|WO|#)+/, "").replace(/[^A-Z0-9-]/g, "");
  return `${kind}|${num || addressKey(street, suburb)}`;
}

export type WorkOrder = {
  isWorkOrder: boolean;
  whyNot: string;
  kind: WorkOrderKind;
  isReminder: boolean;
  platform: string;
  agency: string;
  propertyManager: string;
  pmEmail: string;
  pmPhone: string;
  number: string;
  street: string;
  suburb: string;
  postcode: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  job: string;
  details: string;
  attendBy: string;
  /** The attend-by date as YYYY-MM-DD, when there is one. */
  attendByDate: string;
  /** One of ServiceTitan's job type names, picked by the reading. */
  jobType: string;
  urgent: boolean;
  /** The email cancels a work order, quote request or job already sent to us. */
  isCancellation: boolean;
};

const str = { type: "string" } as const;
export const WORK_ORDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_work_order", "why_not", "kind", "is_reminder", "platform", "agency", "property_manager", "pm_email", "pm_phone", "number", "street", "suburb", "postcode", "tenant_name", "tenant_phone", "tenant_email", "job", "details", "attend_by", "attend_by_date", "job_type", "urgent", "is_cancellation"],
  properties: {
    is_work_order: { type: "boolean", description: "True only if this asks us to attend a property: a new work order, a request to quote, or a quote accepted and the work to go ahead." },
    why_not: { type: "string", description: "When false, at most eight words on what it is instead, e.g. 'Progress update on an existing job'." },
    kind: { type: "string", enum: ["work_order", "quote_request", "quote_accepted"] },
    is_reminder: { type: "boolean", description: "True if it's a reminder or resend about a work order already sent before." },
    platform: { type: "string", description: "PropertyMe, Tapi, or the agency's own email: 'Email'." },
    agency: { type: "string", description: "The real estate agency or owner sending it, e.g. 'Barry Plant Pakenham'." },
    property_manager: str, pm_email: str, pm_phone: str,
    number: { type: "string", description: "The work order or job number exactly as written, e.g. '18943' or 'TAPI-00819-3'. Empty if none." },
    street: { type: "string", description: "Street address of the property, with any unit, e.g. '4/11 Reserve St'." },
    suburb: str, postcode: str,
    tenant_name: str, tenant_phone: str, tenant_email: str,
    job: { type: "string", description: "What's to be done in at most eight words, e.g. 'Gas stove burner not lighting'." },
    details: { type: "string", description: "Everything the office and tech need, in plain sentences: the problem, access and keys, pets, approval limit, who pays, anything about quoting. No more than the email says." },
    attend_by: { type: "string", description: "The attend-by or due date as written, else empty." },
    attend_by_date: { type: "string", description: "That date as YYYY-MM-DD (Australian dates are day first), else empty." },
    job_type: { type: "string", description: "The ServiceTitan job type for the visit, from the list given. A request to quote is 'Quotation'; a fault is the Diagnostics type for the appliance." },
    urgent: { type: "boolean" },
    is_cancellation: { type: "boolean", description: "True if this email cancels or withdraws a work order, quote request or job already sent to us (then is_work_order is false). Fill in the address and number of what's being cancelled." },
  },
} as const;

export function parseWorkOrder(text: string): WorkOrder {
  const o = JSON.parse(text) as Record<string, unknown> | null;
  if (!o || typeof o.is_work_order !== "boolean") throw new Error("work order reading had no decision in it");
  const s = (k: string, max = 300) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, max) : "");
  const kind = (["work_order", "quote_request", "quote_accepted"] as const).find((k) => k === o.kind) ?? "work_order";
  return {
    isWorkOrder: o.is_work_order, whyNot: s("why_not", 120), kind, isReminder: o.is_reminder === true,
    platform: s("platform", 40), agency: s("agency", 120), propertyManager: s("property_manager", 80), pmEmail: s("pm_email", 120), pmPhone: s("pm_phone", 40),
    number: s("number", 40), street: s("street", 160), suburb: s("suburb", 60), postcode: s("postcode", 8),
    tenantName: s("tenant_name", 120), tenantPhone: s("tenant_phone", 40), tenantEmail: s("tenant_email", 120),
    job: s("job", 120), details: s("details", 3000), attendBy: s("attend_by", 60), urgent: o.urgent === true,
    isCancellation: o.is_cancellation === true,
    attendByDate: /^\d{4}-\d{2}-\d{2}$/.test(s("attend_by_date", 10)) ? s("attend_by_date", 10) : "", jobType: s("job_type", 80),
  };
}

const KIND_LABEL: Record<WorkOrderKind, string> = { work_order: "Work order", quote_request: "Request to quote", quote_accepted: "Quote accepted, go ahead" };

/** The reading's schema with ServiceTitan's own job types as the only choices. */
export function workOrderSchema(jobTypes: string[]) {
  return { ...WORK_ORDER_SCHEMA, properties: { ...WORK_ORDER_SCHEMA.properties, job_type: { ...WORK_ORDER_SCHEMA.properties.job_type, ...(jobTypes.length ? { enum: jobTypes } : {}) } } };
}

/** What the office reads in ServiceTitan's Bookings inbox. */
export function bookingSummary(w: WorkOrder): string {
  const head = [`${w.urgent ? "URGENT. " : ""}${KIND_LABEL[w.kind]}${w.number ? ` ${w.number}` : ""}${w.agency ? ` from ${w.agency}` : ""}${w.platform ? ` (${w.platform})` : ""}`, w.job].filter(Boolean).join(": ");
  return [
    head,
    w.attendBy ? `Attend by: ${w.attendBy}` : null,
    w.tenantName || w.tenantPhone ? `Tenant: ${[w.tenantName, w.tenantPhone, w.tenantEmail].filter(Boolean).join(", ")}` : null,
    w.propertyManager || w.pmEmail || w.pmPhone ? `Property manager: ${[w.propertyManager, w.pmPhone, w.pmEmail].filter(Boolean).join(", ")}` : null,
    w.details,
    "Read from the email by the portal. The work order and the email go on the job once it's booked.",
  ].filter(Boolean).join("\n\n").slice(0, 4000);
}

/* ------------------------------------------------------------ the tenant */

/** Put on the work order email once the tenant has been emailed. */
export const TENANT_CATEGORY = "Tenant emailed";
/** Where tenants' replies go (Jake, 5 Nov). */
export const BOOKINGS_ADDRESS = "bookings@advancedgas.com.au";

/** What the office sets on the Work orders page. Stored in portal_settings as 'work_orders'. */
export type WorkOrderSettings = { tenantEmail: boolean; subject: string; body: string };

export const DEFAULT_TENANT_SUBJECT = "Booking a time for {job} at {address}";
export const DEFAULT_TENANT_BODY = `Hi {tenant},

{agency} has asked Advanced Gas & Aircon to attend {address} for: {job}.

Please give us a call on {phone}, or reply to this email with a few days and times that suit you, and we'll get you booked in.

Kind regards,
Advanced Gas & Aircon
{phone}`;

export function workOrderSettingsFrom(raw: unknown): WorkOrderSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (v: unknown, d: string, max: number) => (typeof v === "string" && v.trim() ? v.slice(0, max) : d);
  return {
    // On unless switched off: Jake asked for it to go automatically.
    tenantEmail: o.tenantEmail !== false,
    subject: s(o.subject, DEFAULT_TENANT_SUBJECT, 200),
    body: s(o.body, DEFAULT_TENANT_BODY, 4000),
  };
}

/** The words in braces the wording can use, and what fills them. */
export const PLACEHOLDERS = ["tenant", "agency", "address", "job", "number", "phone"] as const;

/* ------------------------------------------------------------ tenants */

/**
 * A rental with two tenants comes through as one field each: "Joshua Croucher;
 * Christine Upton", "0428 946 984; 0417 535 760". ServiceTitan refuses a
 * contact like that outright ("is not a valid phone number"), which cost two
 * work orders on 6 Nov, so each person, number and address is split out.
 */
const LIST_SPLIT = /\s*(?:;|\||\n|,(?=\s*\S+@)|\s+or\s+|\s+and\s+|\s+&\s+|\s*\/\s*(?=[+0(]?\d{2}))\s*/i;
const NAME_SPLIT = /\s*(?:;|\||\n|,|\s+and\s+|\s+&\s+|\s*\/\s*)\s*/i;

/** Each tenant's name, as written. */
export const tenantNames = (w: Pick<WorkOrder, "tenantName">) => w.tenantName.split(NAME_SPLIT).map((x) => x.trim()).filter(Boolean);

/** Each tenant's phone: Australian numbers of 8 to 12 digits, spaces kept as written. */
export function tenantPhones(w: Pick<WorkOrder, "tenantPhone">): string[] {
  return [...new Set(w.tenantPhone.split(LIST_SPLIT).map((x) => x.trim()).filter((x) => { const d = x.replace(/\D/g, ""); return d.length >= 8 && d.length <= 12; }))];
}

/** Each tenant's email that is an email. */
export function tenantEmails(w: Pick<WorkOrder, "tenantEmail">): string[] {
  return [...new Set(w.tenantEmail.split(/[\s;,|/]+/).map((x) => x.trim().toLowerCase().replace(/^mailto:/, "")).filter((x) => EMAIL.test(x)))];
}

/** The tenants as one name, for the site: "Joshua Croucher & Christine Upton". */
export const tenantLabel = (w: Pick<WorkOrder, "tenantName">) => tenantNames(w).join(" & ");

/**
 * The tenants as ServiceTitan contacts, one per number and address. The nth
 * number or email goes with the nth name when the counts line up; otherwise
 * each is just "Tenant".
 */
export function tenantContacts(w: Pick<WorkOrder, "tenantName" | "tenantPhone" | "tenantEmail">, phoneType: string): { type: string; value: string; memo: string }[] {
  const names = tenantNames(w);
  const memo = (list: string[], i: number) => (names.length === list.length && names[i] ? `Tenant: ${names[i]}` : names.length === 1 ? `Tenant: ${names[0]}` : "Tenant");
  const phones = tenantPhones(w), emails = tenantEmails(w);
  return [
    ...phones.map((v, i) => ({ type: phoneType, value: v, memo: memo(phones, i).slice(0, 100) })),
    ...emails.map((v, i) => ({ type: "Email", value: v, memo: memo(emails, i).slice(0, 100) })),
  ];
}

/** "Joshua", or "Joshua and Christine". */
export function tenantGreeting(w: Pick<WorkOrder, "tenantName">): string {
  const firsts = tenantNames(w).map((n) => n.split(/\s+/)[0]).filter(Boolean);
  if (!firsts.length) return "there";
  return firsts.length === 1 ? firsts[0] : `${firsts.slice(0, -1).join(", ")} and ${firsts[firsts.length - 1]}`;
}

export function fillTemplate(tpl: string, w: WorkOrder, phone: string): string {
  const first = tenantGreeting(w);
  const address = [w.street, w.suburb].filter(Boolean).join(", ") || "the property";
  const values: Record<(typeof PLACEHOLDERS)[number], string> = {
    tenant: first,
    agency: w.agency || "Your property manager",
    address,
    job: (w.job || "a job").replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase()),
    number: w.number,
    phone,
  };
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? values[k as keyof typeof values] : m));
}

const EMAIL = /^[^\s@<>()",;]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const PLATFORM_DOMAIN = /(^|\.)(propertyme\.com|tapihq\.com|propertytree\.com)$/i;

/**
 * The tenant's email, if it's safe to write to. Not one of ours, not the
 * agency's or the platform's (a reading that put the property manager's
 * address in the tenant's place would otherwise email the agent asking them
 * to ring us for a time).
 */
/** Every tenant address that passes tenantAddress's guard. */
export function tenantAddresses(w: WorkOrder, fromAddress: string): string[] {
  return tenantEmails(w).map((e) => tenantAddress({ ...w, tenantEmail: e }, fromAddress)).filter((x): x is string => !!x);
}

export function tenantAddress(w: WorkOrder, fromAddress: string): string | null {
  const to = w.tenantEmail.trim().toLowerCase();
  if (!EMAIL.test(to)) return null;
  const domain = to.split("@")[1];
  if (TEAM_DOMAIN.test(to) || PLATFORM_DOMAIN.test(domain)) return null;
  const agencyDomains = [fromAddress, w.pmEmail].map((a) => a.trim().toLowerCase().split("@")[1]).filter(Boolean);
  if (agencyDomains.includes(domain) && !/^(gmail|hotmail|outlook|live|yahoo|icloud|bigpond|optusnet)\./.test(domain)) return null;
  if (to === w.pmEmail.trim().toLowerCase() || to === fromAddress.trim().toLowerCase()) return null;
  return to;
}

/* ------------------------------------------------------------ the page */

/** One work_orders row as the Work orders page shows it. */
export type WorkOrderRow = {
  id: string; mailbox: string; source: "auto" | "forward" | "category"; status: "working" | "booked" | "duplicate" | "not" | "failed" | "needs_agency";
  reason: string | null; kind: WorkOrderKind | null; agency: string | null; wo_number: string | null; address: string | null;
  subject: string | null; from_address: string | null; received_at: string | null; created_at: string;
  st_booking_id: string | null; st_job_number: string | null; attached_at: string | null; attach_error: string | null;
  location_how?: string | null;
  tenant_email_to: string | null; tenant_emailed_at: string | null; tenant_email_note: string | null;
  details: Partial<WorkOrder> | null;
  cancelled_at?: string | null; cancel_note?: string | null;
};

export const KIND_SHORT: Record<WorkOrderKind, string> = { work_order: "Work order", quote_request: "Quote request", quote_accepted: "Quote accepted" };

/** Which rows the page lists: everything read as a work order, and platform emails judged not to be one, since a miss would hide there. */
export const PLATFORM_SENDER = /@(?:[\w.-]+\.)?(propertyme\.com|tapihq\.com|propertytree\.com)$/i;
export const worthListing = (r: Pick<WorkOrderRow, "status" | "from_address"> & { reason?: string | null }) =>
  r.status !== "not" || PLATFORM_SENDER.test(r.from_address ?? "") || (r.reason ?? "").startsWith("cancellation");

/** Where a work order is up to, in the words the office would use. */
export function stage(r: WorkOrderRow): { tone: "good" | "mid" | "bad" | "none"; word: string; line: string } {
  if (r.cancelled_at) return { tone: "none", word: "Cancelled", line: r.cancel_note ?? "Cancelled by the agency" };
  if (r.status === "not" && (r.reason ?? "").startsWith("cancellation")) {
    const done = /^cancellation: cancelled job/.test(r.reason ?? "");
    return { tone: done ? "good" : "bad", word: done ? "Cancellation done" : "Cancellation to check", line: (r.reason ?? "").replace(/^cancellation: /, "") };
  }
  if (r.status === "not") return { tone: "none", word: "Not a work order", line: r.reason ?? "Read and judged not to be one" };
  if (r.status === "failed") return { tone: "bad", word: "Not booked yet", line: r.reason ?? "ServiceTitan refused it; tried again automatically" };
  if (r.status === "working") return { tone: "mid", word: "Reading", line: "Being read now" };
  if (r.status === "duplicate" && r.st_job_number) return { tone: "good", word: `Note on job ${r.st_job_number}`, line: `${(r.reason ?? "A follow-up").replace(/^a follow-up, /, "A follow-up: ").replace(/: the email went on that job as a note$/, "")}. Added as a note, not a new job` };
  if (r.status === "duplicate") return { tone: "none", word: "Already booked", line: "A reminder or resend of one booked from an earlier email" };
  if (r.status === "needs_agency") return { tone: "bad", word: "Agency not set up", line: `${r.reason ?? "The agency isn't a customer in ServiceTitan"}. Set it up as a customer, then give the email the Outlook category Work order again.` };
  // A job the portal made itself (no booking): on the site, waiting for the tenant.
  if (r.st_job_number && !r.st_booking_id) {
    const site = r.location_how === "existing site" ? "on the site already there" : r.location_how ? "on a new site under the agency" : "";
    const att = r.attached_at ? "work order and email attached" : r.attach_error ? "attaching the work order failed" : "";
    return { tone: r.attach_error && !r.attached_at ? "mid" : "good", word: `Job ${r.st_job_number}`, line: ["To be booked: waiting on the tenant to call", site, att].filter(Boolean).join(", ") };
  }
  if (r.attached_at) return { tone: "good", word: `On job ${r.st_job_number ?? ""}`.trim(), line: "Work order and email attached to the job" };
  return { tone: "mid", word: "In Bookings", line: `Booking ${r.st_booking_id ?? ""}: waiting for the office to book the job`.replace(" :", ":") };
}

export function tenantLine(r: WorkOrderRow): string {
  if (r.tenant_emailed_at && r.tenant_email_to) return `Tenant emailed (${r.tenant_email_to})`;
  if (r.tenant_email_note) return r.tenant_email_note;
  return r.status === "booked" ? "Tenant not emailed" : "";
}

/* ------------------------------------------------------------ the site in ServiceTitan */

/**
 * One spelling for a property, unit included, whichever way it was written:
 * "4/11 Reserve St", "Unit 4, 11 Reserve Street" and a ServiceTitan location
 * with unit "004" and street "11 Reserve Street" are all "4/11 reserve st|berwick".
 * The suburb is part of it: there's a Main Street in every town.
 */
export function siteKey(street: string, suburb: string, unit = ""): string {
  let s = street.toLowerCase().replace(/,/g, " ").trim();
  let u = unit.toLowerCase().replace(/[^0-9a-z]/g, "").replace(/^(unit|apt|apartment|flat|shop|suite)/, "").replace(/^0+(?=\d)/, "");
  const prefixed = /^(?:unit|apt|apartment|flat|shop|suite)\s*([0-9]+[a-z]?)\s+(.*)$/.exec(s);
  if (prefixed) {
    u ||= prefixed[1];
    s = prefixed[2];
  }
  const slash = /^([0-9]+[a-z]?)\s*\/\s*(.*)$/.exec(s);
  if (slash) {
    u ||= slash[1];
    s = slash[2];
  }
  // A street number range is one property: "1-3 Young Road" is ServiceTitan's
  // "1 Young Road" (the Hallam units, 5 Nov). The range keeps its first number.
  s = s.replace(/^([0-9]+[a-z]?)\s*-\s*[0-9]+[a-z]?\b/, "$1");
  const words = s.replace(/[^a-z0-9\- ]/g, " ").split(/\s+/).filter(Boolean).map((w) => ABBREV[w] ?? w);
  const city = suburb.toLowerCase().replace(/\b(vic|victoria)\b/g, "").replace(/\d{4}/g, "").replace(/[^a-z ]/g, " ").trim().replace(/\s+/g, " ");
  return `${u ? `${u}/` : ""}${words.join(" ")}|${city}`;
}

/** The word to search ServiceTitan's locations by: the street's name, not its number or type. */
export function streetWord(street: string): string {
  const words = street.toLowerCase().replace(/^.*\//, "").replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !(w in ABBREV) && !Object.values(ABBREV).includes(w) && !["unit", "apt", "shop", "flat"].includes(w));
  return words.sort((a, b) => b.length - a.length)[0] ?? "";
}

const AGENCY_FILLER = new Set(["real", "estate", "pty", "ltd", "the", "rentals", "rental", "property", "properties", "management", "group", "agents", "realty", "and", "co"]);
const agencyWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !AGENCY_FILLER.has(w));

/**
 * Whether a ServiceTitan customer's name is this agency: every word of the
 * agency's own name (less "Real Estate", "Pty Ltd" and the like) is in it.
 * "Barry Plant Pakenham" is "Barry Plant Pakenham 1", and is not "Barry
 * Plant Berwick". Only a single customer matching counts; two is a guess.
 */
export function agencyMatches(agency: string, customerName: string): boolean {
  const want = agencyWords(agency);
  if (want.length < 2) return false;
  const have = new Set(agencyWords(customerName));
  return want.every((w) => have.has(w));
}

/**
 * The day for the placeholder visit, as YYYY-MM-DD in Melbourne: the
 * attend-by date if it's a weekday from tomorrow on and within 60 days, else
 * the next weekday. The visit is only a holder until the tenant rings.
 */
export function placeholderDay(attendByIso: string, now = new Date()): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(d);
  const today = day(now);
  const weekday = (iso: string) => ![0, 6].includes(new Date(`${iso}T12:00:00Z`).getUTCDay());
  if (/^\d{4}-\d{2}-\d{2}$/.test(attendByIso) && attendByIso > today && weekday(attendByIso)) {
    const days = (Date.parse(`${attendByIso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000;
    if (days <= 60) return attendByIso;
  }
  let t = Date.parse(`${today}T12:00:00Z`);
  do t += 86_400_000; while ([0, 6].includes(new Date(t).getUTCDay()));
  return new Date(t).toISOString().slice(0, 10);
}

/** A Melbourne wall-clock time on a day, as the UTC instant ServiceTitan wants. */
export function melbourneInstant(dayIso: string, hhmm: string): string {
  const guess = Date.parse(`${dayIso}T${hhmm}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(guess);
  const local = Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value);
  const [h, m] = hhmm.split(":").map(Number);
  let offset = local - (h * 60 + m);
  if (offset < -720) offset += 1440;
  if (offset > 720) offset -= 1440;
  return new Date(guess - offset * 60_000).toISOString();
}

/** Five-digit numbers in an email that could be our job numbers (ours run 20000s); a dollar amount, decimal or date part isn't one. */
export function jobNumbersIn(text: string): string[] {
  return [...new Set([...text.matchAll(/(?<![\d$.,/:-])(\d{5})(?![\d,.:/]|\s*(?:kw|kg|mm|l\b))/gi)].map((x) => x[1]))].slice(0, 5);
}

/** Whether the email names this street (by its name, so "Willslie" finds "33 Willslie Crescent"). */
export function namesStreet(text: string, street: string): boolean {
  const w = streetWord(street).replace(/[^a-z]/g, "");
  return w.length > 2 && new RegExp(`\\b${w}\\b`, "i").test(text);
}

/**
 * A ServiceTitan refusal in words: its own title ("\"0428 946 984; 0417 535 760\"
 * is not a valid phone number"), not the JSON it came wrapped in, which the
 * daily summary printed whole.
 */
export function stSaid(e: unknown): string {
  const msg = String((e as Error)?.message ?? e).replace(/^ServiceTitan (?:POST|PATCH|PUT|DELETE)? ?\S+ failed: /, "");
  const status = /^(\d{3}[^—{]*)/.exec(msg)?.[1]?.trim().replace(/\s*—$/, "") ?? "";
  const body = msg.slice(msg.indexOf("{"));
  let detail = "";
  try {
    const j = JSON.parse(body) as { title?: string; errors?: Record<string, string[]> };
    detail = [j.title, ...Object.values(j.errors ?? {}).flat()].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join("; ");
  } catch {
    // Cut off or not JSON: the title is still readable out of the text.
    detail = /"title"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(body)?.[1] ?? (msg.includes("{") ? "" : msg);
  }
  detail = detail.replace(/\\u0022|\\"/g, '"').replace(/\\u0027/g, "'");
  return `ServiceTitan said${status ? ` ${status}` : ""}${detail ? `: ${detail}` : ""}`;
}

/* ------------------------------------------------------------ follow-ups */

/**
 * A work order's own number, one spelling, for telling whether two emails are
 * the same work order: "TAPI-023197", "TAPI-23197-1" and "tapi 23197" agree;
 * "Job #01895" is "1895"; "PO 428520" is "428520". Ailo's WO-1061 and QU-1061
 * are a work order and a quote, so the letters stay. Empty for no number, or
 * one too short to mean anything.
 */
export function numberKey(number: string): string {
  const n = (number ?? "").toUpperCase().replace(/\s+/g, "");
  const tapi = /TAPI-?0*(\d+)/.exec(n);
  if (tapi) return `TAPI-${tapi[1]}`;
  const k = n.replace(/^(JOB|PO|NO\.?|#)+/, "").replace(/[^A-Z0-9]/g, "").replace(/\d+/g, (d) => d.replace(/^0+(?=\d)/, ""));
  return /\d{3,}/.test(k) ? k : "";
}

/** A job already at the work order's site: from the replica, or one the portal made that the replica hasn't caught up with. */
export type SiteJob = { id: number; jobNumber: string | null; status: string | null; numbers: string[]; isQuote: boolean; createdOn: string | null };
export type FollowUp = { job: SiteJob; why: string };

const DAY_MS = 86_400_000;

/**
 * Whether this work order is a follow-up about a job already at the site, and
 * so goes on that job as a note rather than making another (Jake, 12 Nov:
 * "they send a work order follow up and it is currently create a new job each
 * time, not just add another note to the current file"). In order:
 *
 *  1. The same work order number as a job there (its PO, or a work order
 *     already put on it). An open job takes it, whatever kind it now says:
 *     Barry Plant's quote request and then "quote accepted" for 4 Bishop Pl
 *     were one job, and the office cancelled the second. A completed job takes
 *     only a reminder or a reply; anything else after it is new work (1/19
 *     Lyall St: the quote done, then the install, a job of its own).
 *  2. A "Re:" about a job there from the last month, unless the two carry
 *     different numbers.
 *  3. No number of its own, and a job open there from the last three months.
 *
 * Either way a quote accepted after its quote visit is done is the go-ahead,
 * a new job. Anything else is a new work order.
 */
export function followUpFor(w: Pick<WorkOrder, "kind" | "number" | "isReminder">, reply: boolean, jobs: SiteJob[], now = Date.now()): FollowUp | null {
  const when = (j: SiteJob) => Date.parse(j.createdOn ?? "") || now;
  const live = jobs.filter((j) => j.status !== "Canceled").sort((a, b) => when(b) - when(a));
  const done = (j: SiteJob) => j.status === "Completed";
  const goAhead = (j: SiteJob) => done(j) && j.isQuote && w.kind !== "quote_request";
  const name = (j: SiteJob) => `job ${j.jobNumber ?? j.id}`;
  const keys = (j: SiteJob) => j.numbers.map(numberKey).filter(Boolean);
  const num = numberKey(w.number);

  const same = num ? live.find((j) => keys(j).includes(num)) : undefined;
  if (same) {
    if (!done(same)) return { job: same, why: `the same work order as ${name(same)}` };
    if ((w.isReminder || reply) && !goAhead(same)) return { job: same, why: `a ${w.isReminder ? "reminder" : "reply"} about ${name(same)}, already done` };
    return null;
  }
  if (reply) {
    const recent = live.find((j) => now - when(j) <= 30 * DAY_MS && !(num && keys(j).length));
    if (recent && !goAhead(recent)) return { job: recent, why: `a reply about ${name(recent)}` };
  }
  if (!num) {
    const open = live.find((j) => !done(j) && now - when(j) <= 90 * DAY_MS);
    if (open) return { job: open, why: `no work order number, and ${name(open)} is open at this address` };
  }
  return null;
}

/** The line a follow-up note on a job opens with, so the office can see it's the agency again and not a stray email. */
export function followUpHeading(w: Pick<WorkOrder, "agency" | "platform" | "kind" | "number" | "urgent" | "isReminder">): string {
  const what = w.isReminder ? "Reminder" : KIND_SHORT[w.kind];
  const from = [w.agency, w.platform ? `(${w.platform})` : ""].filter(Boolean).join(" ");
  return `WORK ORDER FOLLOW-UP${w.urgent ? ", URGENT" : ""}: ${what}${w.number ? ` ${w.number}` : ""}${from ? ` from ${from}` : ""}. Added to this job as a note, not made into a new job.`;
}

/**
 * The same address with its number taken off, for a site ServiceTitan holds
 * with none ("Mullaly Close", West Melbourne: Home Affairs, the only place on
 * it the office goes). Null when there's a unit or no number to take off: a
 * unit is one of many, never the whole street.
 */
export function bareStreet(key: string): string | null {
  const [addr, city = ""] = key.split("|");
  if (addr.includes("/") || !/^\d/.test(addr)) return null;
  return `${addr.replace(/^\d+[a-z]?\s+/, "")}|${city}`;
}
