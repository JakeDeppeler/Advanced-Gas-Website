import { q, sbSelectOne, sbUpsert } from "@/lib/dashboard/db";
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
  /** Every listed location known to exist, by name → ServiceTitan id. */
  ids: Map<string, number>;
};

// What this import has created, by name → id, kept in portal_settings.
//
// ServiceTitan reads lag its writes: on the first live run, 38 of 50 freshly
// created locations answered 404 when fetched by id a second later. A plan
// built only from ServiceTitan's location list could miss a location created
// moments earlier and create it again. The ledger is the import's own record,
// so a created name is never planned twice however far behind the list is.
const LEDGER_KEY = `${IMPORT_KEY}_created`;

async function loadLedger(): Promise<Record<string, number>> {
  const row = await sbSelectOne<{ value: Record<string, number> }>(
    "portal_settings",
    [q.select("value"), q.eq("key", LEDGER_KEY)].join("&"),
  );
  return row?.value ?? {};
}

async function saveLedger(ledger: Record<string, number>): Promise<void> {
  await sbUpsert("portal_settings", [{ key: LEDGER_KEY, value: ledger, updated_at: new Date().toISOString() }], "key");
}

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
  const ids = new Map<string, number>();
  for (const [name, id] of Object.entries(await loadLedger())) ids.set(norm(name), id);
  for (const l of existing) ids.set(norm(l.name), l.id);
  const toCreate = spec.locations.filter((l) => !ids.has(norm(l.name)));
  const alreadyThere = spec.locations.filter((l) => ids.has(norm(l.name))).map((l) => l.name);
  return { customer: { id: customer.id, name: customer.name }, existing: existing.length, toCreate, alreadyThere, ids };
}

// A 400 body can quote the submitted fields back, and these errors end up in a
// public Actions log, so anything shaped like an email is masked.
const scrub = (e: unknown) => (e as Error).message.replace(/[^\s"'@]+@[^\s"'@]+/g, "[email]");

type Result = { name: string; ok: boolean; id?: number; error?: string };

/**
 * Creates up to `limit` of the planned locations, a few at a time.
 *
 * Success is the id in the create response. There is deliberately no read-back
 * here — reads lag (see the ledger) — and no contact check either; those happen
 * in `checkContacts`, run once the creates are done and ServiceTitan has caught up.
 */
export async function applyImport(spec: ImportSpec, plan: ImportPlan, limit: number) {
  const batch = plan.toCreate.slice(0, limit);
  const ledger = await loadLedger();
  const results: Result[] = [];
  // Five in flight keeps a 50-location call well inside the function timeout
  // without leaning on ServiceTitan's rate limit; 429s back off in stSend.
  for (let i = 0; i < batch.length; i += 5) {
    const round = await Promise.all(
      batch.slice(i, i + 5).map(async (loc): Promise<Result> => {
        try {
          const created = await stSend<StLocation>("POST", stTenantPath("crm", "locations"), {
            customerId: spec.customerId,
            name: loc.name,
            address: loc.address,
            contacts: loc.contacts ?? [],
          });
          return created?.id
            ? { name: loc.name, ok: true, id: created.id }
            : { name: loc.name, ok: false, error: "ServiceTitan returned no location id" };
        } catch (e) {
          return { name: loc.name, ok: false, error: scrub(e) };
        }
      }),
    );
    results.push(...round);
    for (const r of round) if (r.ok && r.id) ledger[r.name] = r.id;
    // Saved per round, so a timeout part-way through loses at most five names.
    await saveLedger(ledger);
  }
  const created = results.filter((r) => r.ok);
  return {
    created: created.length,
    failed: results.filter((r) => !r.ok),
    createdNames: created.map((r) => r.name),
    remaining: plan.toCreate.length - created.length,
  };
}

/**
 * Makes sure each listed location carries its contacts, for list positions
 * [from, from + limit). Adds what is missing, never duplicates what is there.
 * Safe to re-run over the whole list at any time.
 */
export async function checkContacts(spec: ImportSpec, plan: ImportPlan, from: number, limit: number) {
  const slice = spec.locations.slice(from, from + limit);
  const results: (Result & { added?: number })[] = [];
  for (let i = 0; i < slice.length; i += 5) {
    results.push(
      ...(await Promise.all(
        slice.slice(i, i + 5).map(async (loc) => {
          const id = plan.ids.get(norm(loc.name));
          if (!id) return { name: loc.name, ok: false, error: "not created yet" };
          try {
            const have = await stList<StContact>("crm", `locations/${id}/contacts`);
            let added = 0;
            for (const c of loc.contacts ?? []) {
              if (have.some((h) => h.type === c.type && norm(h.value) === norm(c.value))) continue;
              await stSend("POST", stTenantPath("crm", `locations/${id}/contacts`), c);
              added++;
            }
            return { name: loc.name, ok: true, id, added };
          } catch (e) {
            return { name: loc.name, ok: false, id, error: scrub(e) };
          }
        }),
      )),
    );
  }
  const next = from + slice.length;
  return {
    checked: results.filter((r) => r.ok).length,
    added: results.reduce((n, r) => n + (r.added ?? 0), 0),
    failed: results.filter((r) => !r.ok),
    next: next < spec.locations.length ? next : null,
  };
}
