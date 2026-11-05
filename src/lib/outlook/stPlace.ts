import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { agencyMatches, bookingSummary, melbourneInstant, placeholderDay, siteKey, streetWord, type WorkOrder } from "./workOrderTypes";

/**
 * Where a work order goes in ServiceTitan, and the job made there (Jake, 5 Nov).
 *
 * The office keeps each agency as one customer and each rental as a location
 * under it, named for the tenant (Ray White Pakenham has 68: "Stacey Watkins",
 * "Shelly Davis & Steven Davis"). So:
 *  1. A location already at this address, under any customer, is the site:
 *     another job goes on it, never a second location for the same house.
 *  2. Otherwise the agency's customer — by the property manager's or sender's
 *     email or phone on a customer's contacts, else by name when exactly one
 *     customer's name holds every word of the agency's — gets a new location
 *     named for the tenant.
 *  3. Otherwise nothing is made: an agency that isn't a customer is the
 *     office's to set up (Jake's choice), and the page says so.
 *
 * The job needs a visit to exist — ServiceTitan won't make one without — so
 * it gets an unassigned placeholder at 8am on the attend-by date (or the next
 * weekday), tagged To Be Booked, to be moved when the tenant rings.
 */

export type Site = { customerId: number; locationId: number | null; how: string; locationName?: string };

type Loc = { id: number; customer_id: number | null; name: string | null; street: string | null; unit: string | null; city: string | null; active: string | null };

async function locationsOnStreet(word: string): Promise<Loc[]> {
  if (!word) return [];
  return sbSelect<Loc>("st_locations", [
    "select=id,customer_id:raw->>customerId,name:raw->>name,street:raw->address->>street,unit:raw->address->>unit,city:raw->address->>city,active:raw->>active",
    `raw->address->>street=ilike.*${encodeURIComponent(word)}*`,
    "limit=200",
  ].join("&"));
}

async function customerByContact(values: string[]): Promise<number | null> {
  const keys = [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean).map((v) => (v.includes("@") ? v : v.replace(/\D/g, "").slice(-9))).filter((k) => k.length >= 9 || k.includes("@")))];
  if (!keys.length) return null;
  const rows = await sbSelect<{ customer_id: number }>("st_customer_contacts", [q.select("customer_id"), `match_key=in.(${keys.map((k) => `"${encodeURIComponent(k)}"`).join(",")})`, "limit=20"].join("&")).catch(() => []);
  const ids = [...new Set(rows.map((r) => r.customer_id).filter(Boolean))];
  return ids.length === 1 ? ids[0] : null;
}

async function customerByName(agency: string): Promise<number | null> {
  const first = agency.trim().split(/\s+/)[0];
  if (!first) return null;
  // Customer names live on their jobs in the replica (there's no customers table).
  const rows = await sbSelect<{ customer_id: number; customer_name: string }>("st_jobs", [q.select("customer_id,customer_name"), `customer_name=ilike.*${encodeURIComponent(first)}*`, "limit=1000"].join("&")).catch(() => []);
  const names = new Map<number, string>();
  for (const r of rows) if (r.customer_id && r.customer_name) names.set(r.customer_id, r.customer_name);
  const hits = [...names.entries()].filter(([, n]) => agencyMatches(agency, n)).map(([id]) => id);
  return hits.length === 1 ? hits[0] : null;
}

/** Where this work order belongs, or null when the agency isn't a customer we can be sure of. */
export async function findSite(w: WorkOrder, fromAddress: string): Promise<Site | null> {
  const want = siteKey(w.street, w.suburb);
  const candidates = (await locationsOnStreet(streetWord(w.street))).filter((l) => l.active !== "false" && siteKey(l.street ?? "", l.city ?? "", l.unit ?? "") === want);

  const agency = (await customerByContact([w.pmEmail, w.pmPhone, fromAddress])) ?? (w.agency ? await customerByName(w.agency) : null);

  if (candidates.length) {
    // The agency's own location for it first, if there's more than one.
    const pick = candidates.find((l) => agency && Number(l.customer_id) === agency) ?? candidates[0];
    return { customerId: Number(pick.customer_id), locationId: pick.id, how: "existing site", locationName: pick.name ?? undefined };
  }
  if (agency) return { customerId: agency, locationId: null, how: "new site under the agency" };
  return null;
}

/** A new location for the tenant under the agency's customer. */
async function createLocation(customerId: number, w: WorkOrder, zip: string): Promise<number> {
  const contacts = [
    ...(w.tenantPhone ? [{ type: "MobilePhone", value: w.tenantPhone, memo: "Tenant" }] : []),
    ...(w.tenantEmail ? [{ type: "Email", value: w.tenantEmail, memo: "Tenant" }] : []),
  ];
  const unit = /^([0-9]+[a-z]?)\s*\//i.exec(w.street)?.[1];
  const made = await stSend<{ id?: number }>("POST", stTenantPath("crm", "locations"), {
    customerId,
    name: (w.tenantName || w.street || "Tenant").slice(0, 100),
    address: { street: unit ? w.street.replace(/^[^/]+\/\s*/, "") : w.street, ...(unit ? { unit } : {}), city: w.suburb || "Not given", state: "VIC", zip, country: "Australia" },
    contacts,
  });
  if (!made?.id) throw new Error("ServiceTitan made no location");
  return made.id;
}

type JobType = { id: number; name: string; bus: number[] };
let jobTypes: JobType[] | null = null;

/** The active job types, for the reading to choose from and for their ids. */
export async function activeJobTypes(): Promise<JobType[]> {
  if (jobTypes) return jobTypes;
  const rows = await sbSelect<{ id: number; name: string; active: string | null; bus: number[] | null }>("st_job_types", "select=id,name:raw->>name,active:raw->>active,bus:raw->businessUnitIds").catch(() => []);
  jobTypes = rows.filter((r) => r.active !== "false" && r.name).map((r) => ({ id: r.id, name: r.name, bus: Array.isArray(r.bus) ? r.bus : [] }));
  return jobTypes;
}

/** What this office usually puts on a job like it: business unit by job type, campaign by customer. Read from the last year's jobs. */
async function usual(jobTypeId: number, customerId: number, allowedBus: number[]) {
  const [byType, byCustomer, overall] = await Promise.all([
    sbSelect<{ bu: string | null }>("st_jobs", ["select=bu:raw->>businessUnitId", `raw->>jobTypeId=eq.${jobTypeId}`, "order=created_on.desc.nullslast", "limit=200"].join("&")).catch(() => []),
    sbSelect<{ c: string | null }>("st_jobs", ["select=c:raw->>campaignId", `customer_id=eq.${customerId}`, "order=created_on.desc.nullslast", "limit=100"].join("&")).catch(() => []),
    sbSelect<{ c: string | null }>("st_jobs", ["select=c:raw->>campaignId", `raw->>jobTypeId=eq.${jobTypeId}`, "order=created_on.desc.nullslast", "limit=200"].join("&")).catch(() => []),
  ]);
  const top = (vals: (string | null)[], ok: (n: number) => boolean = () => true) => {
    const tally = new Map<number, number>();
    for (const v of vals) {
      const n = Number(v);
      if (n && ok(n)) tally.set(n, (tally.get(n) ?? 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  const bu = top(byType.map((r) => r.bu), (n) => !allowedBus.length || allowedBus.includes(n)) ?? allowedBus[0] ?? null;
  const campaign = top(byCustomer.map((r) => r.c)) ?? top(overall.map((r) => r.c));
  return { bu, campaign };
}

const TO_BE_BOOKED = "To Be Booked";

export type MadeJob = { jobId: number; jobNumber: string | null; customerId: number; locationId: number; how: string };

/** The location (found or made) and the job on it, with its placeholder visit. */
export async function makeJob(w: WorkOrder, site: Site, zip: string, jobTypeName: string): Promise<MadeJob> {
  const types = await activeJobTypes();
  // The reading picks from this same list, so a name that isn't here is a
  // list that changed in between; a quote request can still go as Quotation.
  const jt = types.find((t) => t.name === jobTypeName) ?? (w.kind === "quote_request" ? types.find((t) => t.name === "Quotation") : undefined);
  if (!jt) throw new Error(`No job type "${jobTypeName}" in ServiceTitan`);
  const { bu, campaign } = await usual(jt.id, site.customerId, jt.bus);
  if (!bu) throw new Error(`No business unit for job type ${jt.name}`);
  if (!campaign) throw new Error("No campaign to put the job under");

  const locationId = site.locationId ?? (await createLocation(site.customerId, w, zip));
  const tag = await sbSelect<{ id: number }>("st_job_tags", [q.select("id"), q.eq("name", TO_BE_BOOKED)].join("&")).catch(() => []);

  const day = placeholderDay(w.attendByDate);
  const made = await stSend<{ id?: number; jobNumber?: string }>("POST", stTenantPath("jpm", "jobs"), {
    customerId: site.customerId,
    locationId,
    businessUnitId: bu,
    jobTypeId: jt.id,
    priority: w.urgent ? "Urgent" : "Normal",
    campaignId: campaign,
    appointments: [{ start: melbourneInstant(day, "08:00"), end: melbourneInstant(day, "08:30"), arrivalWindowStart: melbourneInstant(day, "08:00"), arrivalWindowEnd: melbourneInstant(day, "08:30") }],
    summary: `TO BE BOOKED: waiting on the tenant to call. The visit on ${day} is a placeholder.\n\n${bookingSummary(w)}`.slice(0, 4000),
    ...(w.number ? { customerPo: w.number.slice(0, 50) } : {}),
    ...(tag[0]?.id ? { tagTypeIds: [tag[0].id] } : {}),
  });
  if (!made?.id) throw new Error("ServiceTitan made no job");
  return { jobId: made.id, jobNumber: made.jobNumber ?? null, customerId: site.customerId, locationId, how: site.locationId ? site.how : "new site under the agency" };
}
