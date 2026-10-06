import { q, sbSelectOne } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";

// Bulk-creates service locations under one existing ServiceTitan customer — a
// retirement village or strata block where every unit is its own location.
//
// The list itself lives in portal_settings under `st_location_import`, not in
// the repo or the workflow inputs. The repo is public and Actions logs are
// public with it, and the list carries a customer's contact details. The
// response and the workflow summary report names and counts only.
//
// Same plan → apply split as the pricebook sync, for the same reasons: a plan
// is computed from the customer's live locations every run, so an apply capped
// at `limit` can be repeated until nothing remains, and a location that already
// exists (by name) is never created twice. That matters more here than usual
// because a create is not retried on a 5xx — ServiceTitan may have made the
// record before timing out — so the safe recovery is simply to run again.

export const IMPORT_KEY = "st_location_import";

export type ImportContact = { type: "Email" | "Phone" | "MobilePhone"; value: string; memo?: string };

export type ImportLocation = {
  name: string;
  address: { street: string; unit?: string; city: string; state: string; zip: string; country: string };
  contacts?: ImportContact[];
};

export type ImportSpec = { customerId: number; locations: ImportLocation[] };

type StLocation = { id: number; name: string; customerId: number; active?: boolean; address?: { street?: string; unit?: string } };
type StContact = { id: number; type: string; value: string; memo?: string | null };

const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export async function loadImportSpec(): Promise<ImportSpec> {
  const row = await sbSelectOne<{ value: ImportSpec }>(
    "portal_settings",
    [q.select("value"), q.eq("key", IMPORT_KEY)].join("&"),
  );
  const v = row?.value;
  if (!v || !Number.isInteger(Number(v.customerId)) || !Array.isArray(v.locations)) {
    throw new Error(`portal_settings.${IMPORT_KEY} is missing or has no customerId/locations`);
  }
  for (const l of v.locations) {
    if (!l?.name || !l.address?.street || !l.address.city || !l.address.zip) {
      throw new Error(`Location "${l?.name ?? "?"}" is missing a name, street, city or postcode`);
    }
  }
  const names = v.locations.map((l) => norm(l.name));
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) throw new Error(`Duplicate names in the import list: ${[...new Set(dupes)].join(", ")}`);
  return { customerId: Number(v.customerId), locations: v.locations };
}

export type ImportPlan = {
  customer: { id: number; name: string };
  existing: number;
  toCreate: ImportLocation[];
  alreadyThere: string[];
};

export async function planImport(spec: ImportSpec): Promise<ImportPlan> {
  // Fetching the customer first turns a mistyped id into a clear 404 before
  // anything is written, and puts the name in the dry run for a human to check.
  const customer = await stFetch<{ id: number; name: string }>(
    stTenantPath("crm", `customers/${spec.customerId}`),
  );
  const existing = await stList<StLocation>("crm", "locations", {
    customerId: String(spec.customerId),
    active: "Any",
  });
  const have = new Set(existing.map((l) => norm(l.name)));
  const toCreate = spec.locations.filter((l) => !have.has(norm(l.name)));
  const alreadyThere = spec.locations.filter((l) => have.has(norm(l.name))).map((l) => l.name);
  return { customer: { id: customer.id, name: customer.name }, existing: existing.length, toCreate, alreadyThere };
}

export type CreateResult =
  | { name: string; ok: true; id: number; contactsAdded: number }
  | { name: string; ok: false; id?: number; error: string };

async function createOne(customerId: number, loc: ImportLocation): Promise<CreateResult> {
  let id: number | undefined;
  try {
    const created = await stSend<StLocation>("POST", stTenantPath("crm", "locations"), {
      customerId,
      name: loc.name,
      address: loc.address,
      contacts: loc.contacts ?? [],
    });
    id = created?.id;
    if (!id) return { name: loc.name, ok: false, error: "ServiceTitan returned no location id" };

    // Read back rather than trusting the 200: ServiceTitan drops fields it does
    // not recognise without complaint. Contacts in particular are added
    // separately if the create body's copy did not stick, rather than assuming
    // which way this endpoint behaves.
    const back = await stFetch<StLocation>(stTenantPath("crm", `locations/${id}`));
    if (back.customerId !== customerId || norm(back.name) !== norm(loc.name)) {
      return { name: loc.name, ok: false, id, error: "read-back does not match what was sent" };
    }

    const want = loc.contacts ?? [];
    let contactsAdded = 0;
    if (want.length) {
      const have = await stList<StContact>("crm", `locations/${id}/contacts`);
      for (const c of want) {
        if (have.some((h) => h.type === c.type && norm(h.value) === norm(c.value))) continue;
        await stSend("POST", stTenantPath("crm", `locations/${id}/contacts`), c);
        contactsAdded++;
      }
    }
    return { name: loc.name, ok: true, id, contactsAdded };
  } catch (e) {
    // A 400 body can quote the submitted fields back, and this error ends up in
    // a public Actions log, so anything shaped like an email is masked.
    const error = (e as Error).message.replace(/[^\s"'@]+@[^\s"'@]+/g, "[email]");
    return { name: loc.name, ok: false, id, error };
  }
}

/** Creates up to `limit` of the planned locations, a few at a time. */
export async function applyImport(spec: ImportSpec, plan: ImportPlan, limit: number) {
  const batch = plan.toCreate.slice(0, limit);
  const results: CreateResult[] = [];
  // Five in flight keeps a 50-location call well inside the function timeout
  // without leaning on ServiceTitan's rate limit; 429s back off in stSend.
  for (let i = 0; i < batch.length; i += 5) {
    results.push(...(await Promise.all(batch.slice(i, i + 5).map((l) => createOne(spec.customerId, l)))));
  }
  const created = results.filter((r) => r.ok);
  const failed = results.filter((r): r is Extract<CreateResult, { ok: false }> => !r.ok);
  return {
    created: created.length,
    failed,
    createdNames: created.map((r) => r.name),
    remaining: plan.toCreate.length - created.length,
  };
}
