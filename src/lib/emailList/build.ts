import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { getXeroContactEmails } from "@/lib/portal/xero";
import { cleanEmail, type EmailRow, type EmailSource, type SourceState } from "./types";

/**
 * Every email address the business already holds, merged into one list.
 *
 * Four places hold them: ServiceTitan (a customer's email is a contact on the
 * customer or their service address), the website's quote form, Xero's
 * contacts, and Keep in touch. One row per address, however many of those it
 * turns up in, with the most useful name and suburb any of them carries and
 * when ServiceTitan last had a job for them — the thing a campaign is usually
 * cut by.
 */
export async function buildEmailList(): Promise<{ rows: EmailRow[]; sources: SourceState[] }> {
  const [leads, contacts, custContacts, locContacts, locations, jobs, optouts, xero] = await Promise.all([
    sbSelect<{ name: string | null; email: string | null; suburb: string | null; created_at: string }>(
      "portal_leads", [q.select("name,email,suburb,created_at"), "email=not.is.null"].join("&")).catch(() => []),
    sbSelect<{ name: string; company: string | null; email: string | null; updated_at: string }>(
      "portal_contacts", [q.select("name,company,email,updated_at"), "email=not.is.null", "removed_at=is.null"].join("&")).catch(() => []),
    sbSelect<{ customer_id: number | null; value: string | null; modified_on: string | null; active: boolean | null }>(
      "st_customer_contacts", [q.select("customer_id,value,modified_on,active"), "type=ilike.*email*"].join("&")).catch(() => null),
    sbSelect<{ location_id: number | null; value: string | null; modified_on: string | null; active: boolean | null }>(
      "st_location_contacts", [q.select("location_id,value,modified_on,active"), "type=ilike.*email*"].join("&")).catch(() => null),
    sbSelect<{ id: number; customer_id: number | null; name: string | null; suburb: string | null }>(
      "st_locations", q.select("id,customer_id,name,suburb")).catch(() => []),
    sbSelect<{ customer_id: number | null; customer_name: string | null; suburb: string | null; completed_on: string | null; created_on: string | null }>(
      "st_jobs", q.select("customer_id,customer_name,suburb,completed_on,created_on")).catch(() => []),
    sbSelect<{ email: string }>("portal_email_optouts", q.select("email")).catch(() => []),
    getXeroContactEmails(),
  ]);

  // What ServiceTitan knows about each customer: a name, a suburb, the last job.
  const cust = new Map<number, { name: string | null; suburb: string | null; lastJob: string | null }>();
  const custOf = (id: number) => cust.get(id) ?? (cust.set(id, { name: null, suburb: null, lastJob: null }), cust.get(id)!);
  const locToCust = new Map<number, number>();
  for (const l of locations) {
    if (l.customer_id == null) continue;
    locToCust.set(l.id, l.customer_id);
    const c = custOf(l.customer_id);
    c.name = c.name ?? l.name; c.suburb = c.suburb ?? l.suburb;
  }
  for (const j of jobs) {
    if (j.customer_id == null) continue;
    const c = custOf(j.customer_id);
    c.name = c.name ?? j.customer_name; c.suburb = c.suburb ?? j.suburb;
    const d = (j.completed_on ?? j.created_on)?.slice(0, 10) ?? null;
    if (d && (!c.lastJob || d > c.lastJob)) c.lastJob = d;
  }

  const out = new Map<string, EmailRow>();
  const add = (raw: unknown, source: EmailSource, f: { name?: string | null; suburb?: string | null; lastJob?: string | null; seen?: string | null; supplier?: boolean; customer?: boolean }) => {
    const email = cleanEmail(raw);
    if (!email) return;
    const r = out.get(email) ?? { email, name: null, sources: [], suburb: null, lastJob: null, lastSeen: null, supplierOnly: false, optedOut: false };
    if (!r.sources.includes(source)) r.sources.push(source);
    r.name = r.name ?? (f.name?.trim() || null);
    r.suburb = r.suburb ?? (f.suburb?.trim() || null);
    if (f.lastJob && (!r.lastJob || f.lastJob > r.lastJob)) r.lastJob = f.lastJob;
    const seen = f.seen?.slice(0, 10) ?? null;
    if (seen && (!r.lastSeen || seen > r.lastSeen)) r.lastSeen = seen;
    // Supplier-only until something says they're a customer.
    if (source === "xero") r.supplierOnly = r.sources.length === 1 && !!f.supplier && !f.customer;
    else r.supplierOnly = false;
    out.set(email, r);
  };

  for (const c of custContacts ?? []) {
    if (c.active === false) continue;
    const k = c.customer_id != null ? cust.get(c.customer_id) : undefined;
    add(c.value, "servicetitan", { name: k?.name, suburb: k?.suburb, lastJob: k?.lastJob, seen: c.modified_on });
  }
  for (const c of locContacts ?? []) {
    if (c.active === false) continue;
    const cid = c.location_id != null ? locToCust.get(c.location_id) : undefined;
    const k = cid != null ? cust.get(cid) : undefined;
    add(c.value, "servicetitan", { name: k?.name, suburb: k?.suburb, lastJob: k?.lastJob, seen: c.modified_on });
  }
  for (const l of leads) add(l.email, "website", { name: l.name, suburb: l.suburb, seen: l.created_at });
  for (const c of Array.isArray(xero) ? xero : []) add(c.email, "xero", { name: c.name, seen: c.updated, supplier: c.supplier, customer: c.customer });
  for (const c of contacts) add(c.email, "keepintouch", { name: c.company ? `${c.name} (${c.company})` : c.name, seen: c.updated_at });

  const off = new Set(optouts.map((o) => o.email));
  for (const r of out.values()) r.optedOut = off.has(r.email);

  const rows = [...out.values()].sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "") || a.email.localeCompare(b.email));
  const n = (s: EmailSource) => rows.filter((r) => r.sources.includes(s)).length;
  const stNote = custContacts == null && locContacts == null
    ? "The ServiceTitan contact sync hasn't run yet."
    : (custContacts ?? []).length + (locContacts ?? []).length === 0 ? "Nothing synced from ServiceTitan yet — it fills in over the next few syncs." : null;
  const sources: SourceState[] = [
    { source: "servicetitan", count: n("servicetitan"), note: stNote },
    { source: "website", count: n("website"), note: null },
    { source: "xero", count: n("xero"), note: xero === "no-scope" ? "Xero's connection can't read contacts yet." : xero == null ? "Xero isn't connected or didn't answer." : null },
    { source: "keepintouch", count: n("keepintouch"), note: null },
  ];
  return { rows, sources };
}
