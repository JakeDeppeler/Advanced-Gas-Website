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
const WORDS = /\b(work\s*order|maintenance\s*(request|order)|job\s*#\s*\d|request\s*for\s*(a\s*)?quot\w*|provide\s*a\s*quote|quote\s*(accepted|approved)|repair\s*request|urgent\s*work)\b/i;

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
  urgent: boolean;
};

const str = { type: "string" } as const;
export const WORK_ORDER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_work_order", "why_not", "kind", "is_reminder", "platform", "agency", "property_manager", "pm_email", "pm_phone", "number", "street", "suburb", "postcode", "tenant_name", "tenant_phone", "tenant_email", "job", "details", "attend_by", "urgent"],
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
    urgent: { type: "boolean" },
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
  };
}

const KIND_LABEL: Record<WorkOrderKind, string> = { work_order: "Work order", quote_request: "Request to quote", quote_accepted: "Quote accepted, go ahead" };

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

export function fillTemplate(tpl: string, w: WorkOrder, phone: string): string {
  const first = w.tenantName.trim().split(/\s+/)[0] || "there";
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
  id: string; mailbox: string; source: "auto" | "forward" | "category"; status: "working" | "booked" | "duplicate" | "not" | "failed";
  reason: string | null; kind: WorkOrderKind | null; agency: string | null; wo_number: string | null; address: string | null;
  subject: string | null; from_address: string | null; received_at: string | null; created_at: string;
  st_booking_id: string | null; st_job_number: string | null; attached_at: string | null; attach_error: string | null;
  tenant_email_to: string | null; tenant_emailed_at: string | null; tenant_email_note: string | null;
  details: Partial<WorkOrder> | null;
};

export const KIND_SHORT: Record<WorkOrderKind, string> = { work_order: "Work order", quote_request: "Quote request", quote_accepted: "Quote accepted" };

/** Which rows the page lists: everything read as a work order, and platform emails judged not to be one, since a miss would hide there. */
export const PLATFORM_SENDER = /@(?:[\w.-]+\.)?(propertyme\.com|tapihq\.com|propertytree\.com)$/i;
export const worthListing = (r: Pick<WorkOrderRow, "status" | "from_address">) => r.status !== "not" || PLATFORM_SENDER.test(r.from_address ?? "");

/** Where a work order is up to, in the words the office would use. */
export function stage(r: WorkOrderRow): { tone: "good" | "mid" | "bad" | "none"; word: string; line: string } {
  if (r.status === "not") return { tone: "none", word: "Not a work order", line: r.reason ?? "Read and judged not to be one" };
  if (r.status === "failed") return { tone: "bad", word: "Not booked yet", line: r.reason ?? "ServiceTitan refused it; tried again automatically" };
  if (r.status === "working") return { tone: "mid", word: "Reading", line: "Being read now" };
  if (r.status === "duplicate") return { tone: "none", word: "Already booked", line: "A reminder or resend of one booked from an earlier email" };
  if (r.attached_at) return { tone: "good", word: `On job ${r.st_job_number ?? ""}`.trim(), line: "Work order and email attached to the job" };
  return { tone: "mid", word: "In Bookings", line: `Booking ${r.st_booking_id ?? ""}: waiting for the office to book the job`.replace(" :", ":") };
}

export function tenantLine(r: WorkOrderRow): string {
  if (r.tenant_emailed_at && r.tenant_email_to) return `Tenant emailed (${r.tenant_email_to})`;
  if (r.tenant_email_note) return r.tenant_email_note;
  return r.status === "booked" ? "Tenant not emailed" : "";
}
