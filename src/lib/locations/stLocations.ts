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
  /** Location notes, e.g. repairs flagged on the customer's service list. */
  notes?: string[];
  /** ServiceTitan tag type names this location should carry. */
  tags?: string[];
};

export type ImportSpec = {
  customerId: number;
  locations: ImportLocation[];
  /**
   * Tag names this import owns. A location gains its own `tags` and loses any
   * other managed tag, so moving a unit from "due" to "serviced" is one list
   * edit; tags outside this set (put on by the office) are never touched.
   */
  managedTags?: string[];
};

type StLocation = {
  id: number;
  name: string;
  customerId: number;
  active?: boolean;
  address?: { street?: string; unit?: string; city?: string };
  tagTypeIds?: number[];
};
type StNote = { text: string };
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
  return { customerId: Number(v.customerId), locations: v.locations, managedTags: v.managedTags ?? [] };
}

export type ImportPlan = {
  customer: { id: number; name: string };
  existing: number;
  toCreate: ImportLocation[];
  alreadyThere: string[];
  /** Every listed location known to exist, by name → ServiceTitan id. */
  ids: Map<string, number>;
  /** The customer's locations as ServiceTitan lists them right now. */
  live: StLocation[];
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
  // Inactive first, so where a merge has left an active and a retired location
  // under the same name, the active one is the id every later pass writes to.
  for (const l of existing.filter((l) => l.active === false)) ids.set(norm(l.name), l.id);
  for (const l of existing.filter((l) => l.active !== false)) ids.set(norm(l.name), l.id);
  const toCreate = spec.locations.filter((l) => !ids.has(norm(l.name)));
  const alreadyThere = spec.locations.filter((l) => ids.has(norm(l.name))).map((l) => l.name);
  return { customer: { id: customer.id, name: customer.name }, existing: existing.length, toCreate, alreadyThere, ids, live: existing };
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

/**
 * Adds each listed location's notes that it does not already carry, pinned so
 * a tech opening the location sees them first. Matched on the note text, so a
 * re-run adds nothing; a note someone has since edited in ServiceTitan would be
 * added again, which is the better failure than silently dropping it.
 */
export async function addNotes(spec: ImportSpec, plan: ImportPlan) {
  const withNotes = spec.locations.filter((l) => l.notes?.length);
  const results: (Result & { added?: number })[] = [];
  for (let i = 0; i < withNotes.length; i += 5) {
    results.push(
      ...(await Promise.all(
        withNotes.slice(i, i + 5).map(async (loc) => {
          const id = plan.ids.get(norm(loc.name));
          if (!id) return { name: loc.name, ok: false, error: "not created yet" };
          try {
            const have = await stList<StNote>("crm", `locations/${id}/notes`);
            let added = 0;
            for (const text of loc.notes ?? []) {
              if (have.some((h) => norm(h.text) === norm(text))) continue;
              await stSend("POST", stTenantPath("crm", `locations/${id}/notes`), { text, pinToTop: true });
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
  return {
    locations: withNotes.length,
    added: results.reduce((n, r) => n + (r.added ?? 0), 0),
    failed: results.filter((r) => !r.ok),
  };
}

/**
 * The customer's locations that are not on the import list, each with the unit
 * number it appears to be (from its name, unit field or street) and the listed
 * location that number belongs to. Read-only: this is how possible duplicates
 * get found, and deciding which record survives is a human's call.
 */
export function otherLocations(spec: ImportSpec, plan: ImportPlan) {
  const listed = new Set(spec.locations.map((l) => norm(l.name)));
  const unitOf = (l: StLocation): number | null => {
    for (const s of [l.address?.unit, l.name, l.address?.street]) {
      const m = (s ?? "").match(/(?:unit|u|villa|apt)?\s*#?\s*(\d{1,3})\b/i);
      // A bare number in the street is the street number (36 Racecourse Road),
      // not a unit, unless it is written as "12/36 …".
      if (s === l.address?.street) {
        const slash = (s ?? "").match(/^\s*(\d{1,3})\s*\//);
        if (slash) return Number(slash[1]);
        continue;
      }
      if (m) return Number(m[1]);
    }
    return null;
  };
  return plan.live
    .filter((l) => !listed.has(norm(l.name)))
    .map((l) => {
      const unit = unitOf(l);
      const match = unit != null ? spec.locations.find((s) => Number(s.address.unit) === unit) : undefined;
      return {
        id: l.id,
        name: l.name,
        address: [l.address?.unit && `Unit ${l.address.unit}`, l.address?.street, l.address?.city].filter(Boolean).join(", "),
        active: l.active !== false,
        unit,
        sameUnitAs: match ? { name: match.name, id: plan.ids.get(norm(match.name)) ?? null } : null,
      };
    });
}

type MergePair = { name: string; keep: number; retire: number };

/**
 * Folds each approved duplicate pair into one location.
 *
 * The pairs (portal_settings.st_location_import_merge) were found by `others`
 * and approved by a person; this never picks its own. The older record is the
 * one kept, because it is where the unit's job, invoice and equipment history
 * hangs. It takes the listed name, address, contacts and notes; the newer,
 * empty duplicate is deactivated, not deleted, so it can be switched back on.
 * Every change is read back. A pair already done is reported and left alone.
 */
export async function mergePairs(spec: ImportSpec) {
  const row = await sbSelectOne<{ value: { pairs: MergePair[] } }>(
    "portal_settings",
    [q.select("value"), q.eq("key", `${IMPORT_KEY}_merge`)].join("&"),
  );
  const pairs = row?.value?.pairs ?? [];
  const ledger = await loadLedger();
  const results: {
    name: string;
    keep: number;
    retire: number;
    ok: boolean;
    before?: string;
    done?: string[];
    error?: string;
  }[] = [];

  for (const pair of pairs) {
    const done: string[] = [];
    let before: string | undefined;
    try {
      const loc = spec.locations.find((l) => norm(l.name) === norm(pair.name));
      if (!loc) throw new Error("not on the import list");
      // The state each record was in before this run touched it, reported
      // either way: after the first live attempt the customer's active count
      // fell by eight although nothing had been deactivated, and which of each
      // pair survived has to be read, not assumed.
      const state = async (id: number) => {
        try {
          const l = await stFetch<StLocation>(stTenantPath("crm", `locations/${id}`));
          return { l, text: `"${l.name}" ${l.active === false ? "inactive" : "active"}` };
        } catch (e) {
          return { l: null, text: /\b404\b/.test((e as Error).message) ? "not found" : "unreadable" };
        }
      };
      const ks = await state(pair.keep);
      const rs = await state(pair.retire);
      before = `kept ${ks.text}; duplicate ${rs.text}`;
      if (!ks.l || !rs.l) throw new Error("one of the pair could not be read");
      const keep = ks.l;
      const retire = rs.l;
      if (keep.customerId !== spec.customerId || retire.customerId !== spec.customerId) {
        throw new Error("one of the pair is not on this customer");
      }

      if (norm(keep.name) !== norm(loc.name) || norm(keep.address?.unit) !== norm(loc.address.unit)) {
        await stSend("PATCH", stTenantPath("crm", `locations/${pair.keep}`), { name: loc.name, address: loc.address });
        done.push("renamed");
      }

      const haveContacts = await stList<StContact>("crm", `locations/${pair.keep}/contacts`);
      for (const c of loc.contacts ?? []) {
        if (haveContacts.some((h) => h.type === c.type && norm(h.value) === norm(c.value))) continue;
        try {
          await stSend("POST", stTenantPath("crm", `locations/${pair.keep}/contacts`), c);
          done.push("contact");
        } catch (e) {
          // On the first live merge every one of these older records answered
          // 409 Conflict, though its contact list did not show the address —
          // ServiceTitan already holds a matching contact it does not list
          // here. A conflict means the contact is there; it must not stop the
          // duplicate being retired, which would leave two "Unit NNN" records.
          if (!/\b409\b/.test((e as Error).message)) throw e;
          done.push("contact already on record");
        }
      }
      const haveNotes = await stList<StNote>("crm", `locations/${pair.keep}/notes`);
      for (const text of loc.notes ?? []) {
        if (haveNotes.some((h) => norm(h.text) === norm(text))) continue;
        await stSend("POST", stTenantPath("crm", `locations/${pair.keep}/notes`), { text, pinToTop: true });
        done.push("note");
      }

      if (retire.active !== false) {
        await stSend("PATCH", stTenantPath("crm", `locations/${pair.retire}`), { active: false });
        done.push("duplicate deactivated");
      }

      const k = await stFetch<StLocation>(stTenantPath("crm", `locations/${pair.keep}`));
      const r = await stFetch<StLocation>(stTenantPath("crm", `locations/${pair.retire}`));
      if (norm(k.name) !== norm(loc.name)) throw new Error(`kept record still named "${k.name}"`);
      if (k.active === false) throw new Error("kept record is inactive");
      if (r.active !== false) throw new Error("duplicate is still active — ServiceTitan ignored the deactivate");

      ledger[loc.name] = pair.keep;
      results.push({ ...pair, ok: true, before, done: done.length ? done : ["already merged"] });
    } catch (e) {
      results.push({ ...pair, ok: false, before, done, error: scrub(e) });
    }
  }
  await saveLedger(ledger);
  return { pairs: pairs.length, merged: results.filter((r) => r.ok).length, results };
}

/**
 * Sets each listed location's managed tags, for list positions
 * [from, from + limit). Tag types are matched by name and must already exist in
 * ServiceTitan (Settings → Tag Types); a missing one stops the run before
 * anything is written rather than tagging half the list.
 */
export async function syncTags(spec: ImportSpec, plan: ImportPlan, from: number, limit: number) {
  const managed = spec.managedTags ?? [];
  const types = await stList<{ id: number; name: string; active?: boolean }>("settings", "tag-types", { active: "Any" });
  const byName = new Map(types.map((t) => [norm(t.name), t.id]));
  const wanted = new Set([...managed, ...spec.locations.flatMap((l) => l.tags ?? [])]);
  const missing = [...wanted].filter((n) => !byName.has(norm(n)));
  if (missing.length) {
    throw new Error(`Create these tag types in ServiceTitan first (Settings → Tag Types): ${missing.join(", ")}`);
  }
  const managedIds = new Set(managed.map((n) => byName.get(norm(n))!));

  const slice = spec.locations.slice(from, from + limit);
  const results: (Result & { changed?: boolean })[] = [];
  for (let i = 0; i < slice.length; i += 5) {
    results.push(
      ...(await Promise.all(
        slice.slice(i, i + 5).map(async (loc) => {
          const id = plan.ids.get(norm(loc.name));
          if (!id) return { name: loc.name, ok: false, error: "not created yet" };
          try {
            const cur = await stFetch<StLocation>(stTenantPath("crm", `locations/${id}`));
            // Without the current tags, a PATCH would replace whatever the
            // office has put on the location with only ours.
            if (!Array.isArray(cur.tagTypeIds)) throw new Error("ServiceTitan did not return the location's current tags");
            const want = new Set(cur.tagTypeIds.filter((t) => !managedIds.has(t)));
            for (const n of loc.tags ?? []) want.add(byName.get(norm(n))!);
            const same = want.size === cur.tagTypeIds.length && cur.tagTypeIds.every((t) => want.has(t));
            if (same) return { name: loc.name, ok: true, id, changed: false };
            // No read-back here. ServiceTitan's reads lag its writes: on the
            // first live run 115 tag changes read back stale a moment later,
            // and every one of them was in place on the next run. Verification
            // is a second pass over the list (the workflow runs one after a
            // pause), which should change nothing.
            await stSend("PATCH", stTenantPath("crm", `locations/${id}`), { tagTypeIds: [...want] });
            return { name: loc.name, ok: true, id, changed: true };
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
    changed: results.filter((r) => r.changed).length,
    failed: results.filter((r) => !r.ok),
    next: next < spec.locations.length ? next : null,
  };
}
