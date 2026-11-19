import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";
import { site as business } from "@/lib/site";
import { TEAM_DOMAIN } from "./outlookTypes";
import { AGENCY_FILLER, agencyMatches, bareStreet, bookingSummary, melbourneInstant, placeholderDay, siteKey, streetWord, tenantContacts, tenantLabel, type SiteJob, type WorkOrder, isUnitAddress, jobReference, managerContacts, realEstateUnitName, stSaid, visitEnd } from "./workOrderTypes";

/**
 * Where a work order goes in ServiceTitan, and the job made there (Jake, 5 Nov).
 *
 * The office keeps each agency as one customer and each rental as a location
 * under it, named for the tenant (Ray White Pakenham has 68: "Stacey Watkins",
 * "Shelly Davis & Steven Davis"). So:
 *  1. A location already at this address, under any customer, is the site:
 *     another job goes on it, never a second location for the same house.
 *     That includes one the portal made minutes ago that the replica hasn't
 *     caught up with, and a site saved with no street number when it's the
 *     only place on that street.
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

/**
 * Our own addresses and number are never a customer's. A customer in
 * ServiceTitan has admin@ saved as their email, so every work order the
 * office forwarded from admin@ went under that one household (Jake, 12 Nov:
 * 160 Racecourse Road North and Home Affairs West Melbourne).
 */
const OURS = new Set([business.phoneE164.replace(/\D/g, "").slice(-9)]);
const isOurs = (v: string) => TEAM_DOMAIN.test(v.trim()) || OURS.has(v.replace(/\D/g, "").slice(-9));

/**
 * The agency whose contacts hold the property manager's or sender's email or
 * phone. Those turn up on other customers too: Barry Plant Berwick's bdppm7@
 * and its manager's mobile are also on her own family's record, and O'Brien
 * Cranbourne's office number on an empty copy of the agency from the August
 * import, and with two customers the portal gave up (3/185 Camms Rd and 6
 * Flinders Park Dr, 9 and 10 Nov). The agency is the one named like it, or
 * else the only one with more than a handful of sites: an agency has dozens,
 * a household one.
 */
async function customerByContact(values: string[], agency: string): Promise<number | null> {
  const keys = [...new Set(values.map((v) => v.trim().toLowerCase()).filter((v) => v && !isOurs(v)).map((v) => (v.includes("@") ? v : v.replace(/\D/g, "").slice(-9))).filter((k) => k.length >= 9 || k.includes("@")))];
  if (!keys.length) return null;
  const rows = await sbSelect<{ customer_id: number }>("st_customer_contacts", [q.select("customer_id"), `match_key=in.(${keys.map((k) => `"${encodeURIComponent(k)}"`).join(",")})`, "limit=20"].join("&")).catch(() => []);
  const ids = [...new Set(rows.map((r) => Number(r.customer_id)).filter(Boolean))];
  if (ids.length <= 1) return ids[0] ?? null;
  const names = await customerNames(ids);
  const named = ids.filter((id) => agency && (names.get(id) ?? []).some((n) => agencyMatches(agency, n)));
  return named.length === 1 ? named[0] : theAgency(named.length ? named : ids);
}

/** Of several customers, the only one with more than a handful of sites: the agency, not a household or an empty copy. */
async function theAgency(ids: number[]): Promise<number | null> {
  if (ids.length <= 1) return ids[0] ?? null;
  const sites = await Promise.all(ids.map((id) => sbSelect<{ id: number }>("st_locations", [q.select("id"), q.eq("customer_id", String(id)), "limit=6"].join("&")).then((r) => r.length).catch(() => 0)));
  const big = ids.filter((_, i) => sites[i] > 5);
  return big.length === 1 ? big[0] : null;
}

/**
 * What a customer is called. The replica has no customers table, and a job's
 * customer_name is the site's name (the tenant), so the agency's own name is
 * read off its invoices, with its jobs' names for one that hasn't any yet.
 */
async function customerNames(ids: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  const add = (id: unknown, name: unknown) => {
    const n = String(name ?? "").trim();
    if (!n) return;
    const list = out.get(Number(id)) ?? [];
    if (!list.includes(n)) out.set(Number(id), [...list, n]);
  };
  // One customer at a time: Barry Plant Berwick's 871 invoices would crowd out the rest.
  await Promise.all(ids.slice(0, 6).map(async (id) => {
    const [inv, jobs] = await Promise.all([
      sbSelect<{ name: string }>("st_invoices", ["select=name:raw->customer->>name", `raw->customer->>id=eq.${id}`, "limit=1"].join("&")).catch(() => []),
      sbSelect<{ name: string }>("st_jobs", ["select=name:customer_name", q.eq("customer_id", String(id)), "limit=50"].join("&")).catch(() => []),
    ]);
    for (const r of [...inv, ...jobs]) add(id, r.name);
  }));
  return out;
}

async function customerByName(agency: string): Promise<number | null> {
  // Every word of the agency's name in order, an apostrophe matching anything:
  // "O'Brien Real Estate Cranbourne" finds "OBrien Real Estate (Cranbourne)".
  const words = agency.toLowerCase().replace(/['\u2019]/g, "*").split(/[^a-z0-9*]+/).filter((w) => w.replace(/\*/g, "") && !AGENCY_FILLER.has(w.replace(/\*/g, "")));
  if (!words.length) return null;
  const like = (ws: string[]) => `ilike.*${ws.map((w) => encodeURIComponent(w)).join("*")}*`;
  // The agency's own name is on its invoices; a job's customer_name is the
  // site's (the tenant), kept as before for an agency with no invoice yet.
  const [inv, jobs] = await Promise.all([
    sbSelect<{ id: string; name: string }>("st_invoices", ["select=id:raw->customer->>id,name:raw->customer->>name", `raw->customer->>name=${like(words)}`, "limit=1000"].join("&")).catch(() => []),
    sbSelect<{ id: number; name: string }>("st_jobs", ["select=id:customer_id,name:customer_name", `customer_name=${like(words.slice(0, 1))}`, "limit=1000"].join("&")).catch(() => []),
  ]);
  const hits = new Set<number>();
  for (const r of [...inv, ...jobs]) if (r.id && r.name && agencyMatches(agency, r.name)) hits.add(Number(r.id));
  // First National Neilson has an empty copy of itself from the August import.
  return theAgency([...hits].slice(0, 4));
}

/**
 * A location the portal made for an earlier work order at this address, from
 * its own record: the replica copies ServiceTitan every few minutes, and a
 * reminder can land in between.
 */
async function siteWeMade(want: string, word: string): Promise<{ customerId: number; locationId: number } | null> {
  if (!word) return null;
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const rows = await sbSelect<{ st_location_id: number; st_customer_id: number | null; street: string | null; suburb: string | null }>("work_orders", [
    "select=st_location_id,st_customer_id,street:details->>street,suburb:details->>suburb",
    q.notNull("st_location_id"), q.notNull("st_customer_id"), q.gte("created_at", since),
    `address=ilike.*${encodeURIComponent(word)}*`, q.order("created_at", "desc"), "limit=50",
  ].join("&")).catch(() => []);
  const hit = rows.find((r) => siteKey(r.street ?? "", r.suburb ?? "") === want);
  return hit?.st_customer_id ? { customerId: Number(hit.st_customer_id), locationId: Number(hit.st_location_id) } : null;
}

/** Where this work order belongs, or null when the agency isn't a customer we can be sure of. */
export async function findSite(w: WorkOrder, fromAddress: string): Promise<Site | null> {
  const want = siteKey(w.street, w.suburb);
  const word = streetWord(w.street);
  const all = await locationsOnStreet(word);
  const onStreet = all.filter((l) => l.active !== "false");
  const keyOf = (l: Loc) => siteKey(l.street ?? "", l.city ?? "", l.unit ?? "");
  const candidates = onStreet.filter((l) => keyOf(l) === want);

  const agency = (await customerByContact([w.pmEmail, w.pmPhone, fromAddress], w.agency)) ?? (w.agency ? await customerByName(w.agency) : null);

  if (candidates.length) {
    // The agency's own location for it first, if there's more than one.
    const pick = candidates.find((l) => agency && Number(l.customer_id) === agency) ?? candidates[0];
    return { customerId: Number(pick.customer_id), locationId: pick.id, how: "existing site", locationName: pick.name ?? undefined };
  }
  // Not one the office has since made inactive (merged into another, say).
  const made = await siteWeMade(want, word);
  if (made && !all.some((l) => l.id === made.locationId && l.active === "false")) return { ...made, how: "existing site" };
  // The only place on that street in that suburb, saved with no number.
  const bare = bareStreet(want);
  const city = want.split("|")[1];
  const sameStreet = bare ? onStreet.filter((l) => keyOf(l).split("|")[1] === city && (keyOf(l) === bare || bareStreet(keyOf(l)) === bare)) : [];
  if (sameStreet.length === 1 && keyOf(sameStreet[0]) === bare) {
    const l = sameStreet[0];
    return { customerId: Number(l.customer_id), locationId: l.id, how: "existing site", locationName: l.name ?? undefined };
  }
  if (agency) return { customerId: agency, locationId: null, how: "new site under the agency" };
  return null;
}

/**
 * The jobs at a site from the last year, for telling a follow-up from new
 * work: what the replica has, and any the portal made or put a work order on
 * that it doesn't have yet, each with every work order number it carries.
 */
export async function jobsAt(locationId: number): Promise<SiteJob[]> {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const [jobs, ours, types] = await Promise.all([
    sbSelect<{ id: number; job_number: string | null; status: string | null; created_on: string | null; po: string | null; jt: string | null }>("st_jobs", [
      "select=id,job_number,status,created_on,po:raw->>customerPo,jt:raw->>jobTypeId",
      q.eq("location_id", String(locationId)), q.gte("created_on", since), q.order("created_on", "desc", "last"), "limit=40",
    ].join("&")),
    sbSelect<{ st_job_id: number; st_job_number: string | null; wo_number: string | null; kind: string | null; created_at: string; jt: string | null }>("work_orders", [
      q.select("st_job_id,st_job_number,wo_number,kind,created_at,jt:details->>jobType"), q.eq("st_location_id", String(locationId)), q.notNull("st_job_id"), q.gte("created_at", since), "limit=60",
    ].join("&")).catch(() => []),
    activeJobTypes(),
  ]);
  const quoteType = new Set(types.filter((t) => /quot/i.test(t.name)).map((t) => String(t.id)));
  const typeName = new Map(types.map((t) => [String(t.id), t.name]));
  const out = new Map<number, SiteJob>();
  for (const j of jobs) {
    out.set(Number(j.id), { id: Number(j.id), jobNumber: j.job_number, status: j.status, numbers: j.po ? [j.po] : [], isQuote: quoteType.has(String(j.jt ?? "")), createdOn: j.created_on, jobType: typeName.get(String(j.jt ?? "")) ?? null });
  }
  for (const r of ours) {
    const id = Number(r.st_job_id);
    const had = out.get(id) ?? { id, jobNumber: r.st_job_number, status: null, numbers: [], isQuote: r.kind === "quote_request", createdOn: r.created_at, jobType: r.jt };
    if (r.wo_number && !had.numbers.includes(r.wo_number)) had.numbers.push(r.wo_number);
    out.set(id, had);
  }
  return [...out.values()];
}

/** A new location for the tenant under the agency's customer. */
async function createLocation(customerId: number, w: WorkOrder, zip: string): Promise<number> {
  const contacts = tenantContacts(w, "MobilePhone");
  const unit = /^([0-9]+[a-z]?)\s*\//i.exec(w.street)?.[1];
  const made = await stSend<{ id?: number }>("POST", stTenantPath("crm", "locations"), {
    customerId,
    name: (tenantLabel(w) || w.street || "Tenant").slice(0, 100),
    address: { street: unit ? w.street.replace(/^[^/]+\/\s*/, "") : w.street, ...(unit ? { unit } : {}), city: w.suburb || "Not given", state: "VIC", zip, country: "Australia" },
    contacts,
  });
  if (!made?.id) throw new Error("ServiceTitan made no location");
  return made.id;
}

/** duration: ServiceTitan's own for the type, in seconds (most are 5400, an hour and a half). */
type JobType = { id: number; name: string; bus: number[]; duration: number | null };
let jobTypes: JobType[] | null = null;

/** The active job types, for the reading to choose from and for their ids. */
export async function activeJobTypes(): Promise<JobType[]> {
  if (jobTypes) return jobTypes;
  // The column, not raw: the sync marks a type switched off in ServiceTitan
  // there, while its raw copy still says what it said when last listed.
  const rows = await sbSelect<{ id: number; name: string; active: boolean | null; bus: number[] | null; duration: number | null }>("st_job_types", "select=id,name,active,bus:raw->businessUnitIds,duration:raw->duration").catch(() => []);
  jobTypes = rows.filter((r) => r.active !== false && r.name).map((r) => ({ id: r.id, name: r.name, bus: Array.isArray(r.bus) ? r.bus : [], duration: Number(r.duration) > 0 ? Number(r.duration) : null }));
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
  const usualFor = await usual(jt.id, site.customerId, jt.bus);
  // A rental's work order goes under Real Estate, Maintenance or Diagnostics
  // as the reading says (Jake, 18 Nov), not under whatever this job type
  // usually gets (quote requests landed in Domestic - Installation).
  const unitName = realEstateUnitName(w);
  const realEstate = unitName ? await realEstateUnit(unitName, jt.bus) : null;
  const bu = realEstate ?? usualFor.bu;
  const campaign = usualFor.campaign;
  if (!bu) throw new Error(`No business unit for job type ${jt.name}`);
  if (!campaign) throw new Error("No campaign to put the job under");

  const locationId = site.locationId ?? (await createLocation(site.customerId, w, zip));
  const tag = await sbSelect<{ id: number }>("st_job_tags", [q.select("id"), q.eq("name", TO_BE_BOOKED)].join("&")).catch(() => []);

  const day = placeholderDay(w.attendByDate);
  // As long as ServiceTitan books this job type for (Jake, 18 Nov: they came
  // in at half an hour, where the type says an hour and a half). Drive time
  // isn't in it: Dispatch Pro adds its own between visits.
  const start = melbourneInstant(day, "08:00");
  const end = visitEnd(start, jt.duration);
  const made = await stSend<{ id?: number; jobNumber?: string }>("POST", stTenantPath("jpm", "jobs"), {
    customerId: site.customerId,
    locationId,
    businessUnitId: bu,
    jobTypeId: jt.id,
    priority: w.urgent ? "Urgent" : "Normal",
    campaignId: campaign,
    appointments: [{ start, end, arrivalWindowStart: start, arrivalWindowEnd: melbourneInstant(day, "08:30") }],
    summary: `TO BE BOOKED: waiting on the tenant to call. The visit on ${day} is a placeholder.\n\n${bookingSummary(w)}`.slice(0, 4000),
    ...(w.number ? { customerPo: w.number.slice(0, 50) } : {}),
    ...(tag[0]?.id ? { tagTypeIds: [tag[0].id] } : {}),
  });
  if (!made?.id) throw new Error("ServiceTitan made no job");
  return { jobId: made.id, jobNumber: made.jobNumber ?? null, customerId: site.customerId, locationId, how: site.locationId ? site.how : "new site under the agency" };
}

/**
 * The hold reason to use: one of ServiceTitan's own that's about the tenant
 * or customer. Not "waiting" on its own: that picked "Waiting for materials"
 * for 20905 (18 Nov), which would send the office looking for parts. With
 * none to use, the error lists what there is, so one can be added there.
 */
let holdReason: { id: number; name: string } | undefined;
async function holdReasonToUse(): Promise<{ id: number; name: string }> {
  if (holdReason) return holdReason;
  const reasons = await stList<{ id: number; name: string; active?: boolean }>("jpm", "job-hold-reasons", {}, 2);
  const live = reasons.filter((r) => r.active !== false);
  const hit = live.find((r) => /tenant/i.test(r.name)) ?? live.find((r) => /customer|client|contact|call back|callback|access|book/i.test(r.name));
  if (!hit) throw new Error(`no hold reason about the tenant or customer in ServiceTitan (add one such as "Waiting on tenant" under Settings › Operations › Job hold reasons). There are: ${live.map((r) => r.name).join(", ") || "none"}`);
  holdReason = hit;
  return hit;
}

/** "Real Estate - Maintenance" or "Real Estate - Diagnostics", when the job type allows it. */
async function realEstateUnit(name: string, allowed: number[]): Promise<number | null> {
  const rows = await sbSelect<{ id: number; name: string }>("st_business_units", "select=id,name&active=is.true").catch(() => []);
  const want = name.toLowerCase();
  const hit = rows.find((r) => r.name.trim().toLowerCase() === want);
  return hit && (!allowed.length || allowed.includes(hit.id)) ? hit.id : null;
}

/**
 * A work order's job on hold as soon as it's made (Jake, 17 Nov), so Dispatch
 * Pro leaves its placeholder visit alone: the office books it once they've
 * rung the tenant, and takes the hold off then. The reason is the first of
 * ServiceTitan's own that's about the customer, else the first there is.
 * Returns the reason used.
 */
export async function holdForTenant(jobId: number): Promise<string> {
  // Each step says itself when it fails: a bare "403 Forbidden" on 20905
  // (18 Nov) couldn't tell reading the reasons from the hold.
  const step = (what: string) => (e: unknown) => {
    const said = stSaid(e).replace(/^ServiceTitan said:? ?/, "").replace(/^(.+): \1$/, "$1");
    throw new Error(`ServiceTitan refused ${what}: ${said}`);
  };
  let reason: { id: number; name: string };
  try {
    reason = await holdReasonToUse();
  } catch (e) {
    // Ours (no reason to use) as it is; ServiceTitan's refusal labelled.
    if (!/^ServiceTitan /.test((e as Error).message)) throw e;
    return step("reading its job hold reasons")(e);
  }
  const body = { reasonId: reason.id, memo: "Waiting on the tenant: put on hold by the portal so Dispatch Pro leaves it. Take it off hold once they've been rung and it's booked." };
  // The job first; ServiceTitan refused that for 20905 (403, 18 Nov) with
  // Jobs allowed on the app. Its help puts a job on hold by holding its
  // appointment, which Appointments allows, so that's tried next.
  let jobRefusal = "";
  try {
    await stSend("PUT", stTenantPath("jpm", `jobs/${jobId}/hold`), body);
    return reason.name;
  } catch (e) {
    jobRefusal = stSaid(e).replace(/^ServiceTitan said:? ?/, "").replace(/^(.+): \1$/, "$1");
  }
  const job = await stFetch<{ firstAppointmentId?: number; lastAppointmentId?: number }>(stTenantPath("jpm", `jobs/${jobId}`)).catch(step(`reading job ${jobId}`));
  const appts = [...new Set([job.firstAppointmentId, job.lastAppointmentId].filter((x): x is number => Boolean(x)))];
  if (!appts.length) throw new Error(`ServiceTitan refused putting job ${jobId} on hold (${jobRefusal}), and it has no appointment to hold instead`);
  for (const a of appts) {
    await stSend("PUT", stTenantPath("jpm", `appointments/${a}/hold`), body)
      .catch(step(`putting job ${jobId} on hold (${jobRefusal}) and its appointment ${a} too (reason "${reason.name}")`));
  }
  return `${reason.name}, on its appointment`;
}

/* ------------------------------------------------------------ the site's details */

/**
 * The location's own custom fields in ServiceTitan, as the office fills them
 * by hand (Jake, 18 Nov): the type ids are the ones on every site they've
 * done, e.g. 18 Leonie Court. "Property Type " has a trailing space there.
 */
const FIELD = { jobRef: 209604015, owner: 209602958, propertyType: 209599952 } as const;

/**
 * The work order's number and owner onto the site, and its property type
 * when the site has none. The number and owner are this work order's, so
 * they replace what's there; a property type someone has set is kept.
 * Returns what changed, in words, or "" for nothing.
 */
export async function fillSiteDetails(locationId: number, w: WorkOrder, propertyType: () => Promise<string | null>): Promise<string> {
  const path = stTenantPath("crm", `locations/${locationId}`);
  const loc = await stFetch<{ customFields?: { typeId: number; value?: string | null }[] }>(path);
  const have = new Map((loc.customFields ?? []).map((f) => [f.typeId, (f.value ?? "").trim()]));
  const set = new Map<number, string>();
  if (w.number) set.set(FIELD.jobRef, jobReference(w.number).slice(0, 100));
  if (w.owner) set.set(FIELD.owner, w.owner.slice(0, 160));
  if (!have.get(FIELD.propertyType)) {
    const t = await propertyType().catch(() => null);
    if (t) set.set(FIELD.propertyType, t);
  }
  const changed = [...set].filter(([id, v]) => have.get(id) !== v);
  if (!changed.length) return "";
  // Every field the site has, with these over the top: an update that sent
  // only these could take the others off.
  const all = new Map(have);
  for (const [id, v] of changed) all.set(id, v);
  await stSend("PATCH", path, { customFields: [...all].filter(([, v]) => v).map(([typeId, value]) => ({ typeId, value })) });
  const said: Record<number, string> = { [FIELD.jobRef]: "job reference", [FIELD.owner]: "owner", [FIELD.propertyType]: "property type" };
  return changed.map(([id, v]) => `${said[id]} ${v}`).join(", ");
}

/**
 * The work order's tenant on the site (Jake, 18 Nov): each email and phone
 * of theirs the site hasn't got is added as a contact, noted "Tenant: name".
 * When none of them was there, it's a new tenant, and the site, which the
 * office names after whoever lives there, takes their name. Nothing already
 * on the site is taken off. Returns what changed, in words, or "".
 */
export async function fillTenant(locationId: number, w: WorkOrder): Promise<string> {
  const want = tenantContacts(w, "MobilePhone");
  if (!want.length) return "";
  const key = (c: { type?: string; value?: string }) => (c.type === "Email" ? (c.value ?? "").trim().toLowerCase() : (c.value ?? "").replace(/\D/g, "").slice(-9));
  const have = await stList<{ type?: string; value?: string; active?: boolean }>("crm", `locations/${locationId}/contacts`);
  const there = new Set(have.filter((c) => c.active !== false).map(key).filter(Boolean));
  const add = want.filter((c) => key(c) && !there.has(key(c)));
  // Each on its own: one ServiceTitan refuses mustn't keep the others off.
  const said: string[] = [];
  const refused: string[] = [];
  for (const c of add) {
    await stSend("POST", stTenantPath("crm", `locations/${locationId}/contacts`), c)
      .then(() => said.push(c.value))
      .catch((e: Error) => refused.push(`${c.value}: ${stSaid(e).replace(/^ServiceTitan said:? ?/, "")}`));
  }
  if (!said.length && refused.length) throw new Error(`ServiceTitan took none of the tenant's contacts (${refused.join("; ")})`);
  const label = tenantLabel(w).slice(0, 100);
  if (label && add.length === want.length) {
    const path = stTenantPath("crm", `locations/${locationId}`);
    const loc = await stFetch<{ name?: string }>(path);
    if ((loc.name ?? "").trim().toLowerCase() !== label.toLowerCase()) {
      await stSend("PATCH", path, { name: label });
      said.push(`site renamed from "${(loc.name ?? "").trim()}" to "${label}"`);
    }
  }
  return [said.length ? `tenant: ${said.join(", ")}` : "", refused.length ? `not taken: ${refused.join("; ")}` : ""].filter(Boolean).join("; ");
}

/**
 * The managing agent on the site (Jake, 19 Nov: "bring in the managed by name
 * and email and contact information and list them as the property manager"):
 * their email and phone, where the site hasn't got them, noted "Name -
 * Property Manager" as the office does. Returns what changed, or "".
 */
export async function fillManager(locationId: number, w: WorkOrder): Promise<string> {
  const want = managerContacts(w);
  if (!want.length) return "";
  const key = (c: { type?: string; value?: string }) => (c.type === "Email" ? (c.value ?? "").trim().toLowerCase() : (c.value ?? "").replace(/\D/g, "").slice(-9));
  const have = await stList<{ type?: string; value?: string; active?: boolean }>("crm", `locations/${locationId}/contacts`);
  const there = new Set(have.filter((c) => c.active !== false).map(key).filter(Boolean));
  const said: string[] = [];
  for (const c of want.filter((c) => key(c) && !there.has(key(c)))) {
    await stSend("POST", stTenantPath("crm", `locations/${locationId}/contacts`), c)
      .then(() => said.push(c.value))
      .catch((e: Error) => said.push(`${c.value} not taken (${stSaid(e).replace(/^ServiceTitan said:? ?/, "")})`));
  }
  return said.length ? `property manager: ${said.join(", ")}` : "";
}
