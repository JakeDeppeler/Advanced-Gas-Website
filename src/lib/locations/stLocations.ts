import { q, sbSelect, sbSelectOne, sbUpsert } from "@/lib/dashboard/db";
import { stFetch, stList, stSend, stTenantPath } from "@/lib/dashboard/servicetitan";

// Site locations for one ServiceTitan customer — a retirement village or strata
// block where every unit is its own location — loaded from a list, kept tagged
// by service status, and checked for doubles. Driven from the portal
// (/portal/locations), admins only.
//
// Each customer's list lives in portal_settings under `locations:<customerId>`.
// It carries a customer's contact details, so it stays in the database and is
// never written to a log.
//
// Same plan → apply split as the pricebook sync, for the same reasons: a plan
// is computed from the customer's live locations every run, so a capped apply
// can be repeated until nothing remains, and a location that already exists
// (by name) is never created twice. That matters more than usual here because
// a create is not retried on a 5xx — ServiceTitan may have made the record
// before timing out — so the safe recovery is simply to run again.

export type ImportContact = { type: "Email" | "Phone" | "MobilePhone"; value: string; memo?: string };

export type ImportLocation = {
  name: string;
  address: { street: string; unit?: string; city: string; state: string; zip: string; country: string };
  contacts?: ImportContact[];
  /** Location notes, e.g. repairs flagged on the customer's service list. */
  notes?: string[];
  /** ServiceTitan tag type names this location should carry. */
  tags?: string[];
  /** An existing location to take over (rename) instead of creating a new one. */
  adoptId?: number;
};

/** A service status the office can set, and the ServiceTitan tag that means it. */
export type StatusTag = { label: string; tag: string };

export type ImportSpec = {
  customerId: number;
  customerName?: string;
  locations: ImportLocation[];
  /**
   * Tag names this list owns. A location gains its own `tags` and loses any
   * other managed tag, so moving a unit from "due" to "serviced" is one edit;
   * tags outside this set (put on by the office) are never touched.
   */
  managedTags?: string[];
  /** The statuses the "mark serviced" buttons offer, in order. */
  statusTags?: StatusTag[];
  savedAt?: string;
  savedBy?: string;
};

export type StLocation = {
  id: number;
  name: string;
  customerId: number;
  active?: boolean;
  address?: { street?: string; unit?: string; city?: string; state?: string; zip?: string };
  tagTypeIds?: number[];
};
type StNote = { text: string };
type StContact = { id: number; type: string; value: string; memo?: string | null };
type StTagType = { id: number; name: string; active?: boolean };

export const norm = (s: string | undefined | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const specKey = (customerId: number) => `locations:${customerId}`;

// What this list has created or adopted, by name → id.
//
// ServiceTitan reads lag its writes: on the first live run, 38 of 50 freshly
// created locations answered 404 when fetched by id a second later. A plan
// built only from ServiceTitan's location list could miss a location created
// moments earlier and create it again. The ledger is the import's own record,
// so a created name is never planned twice however far behind the list is.
const ledgerKey = (customerId: number) => `locations:${customerId}:created`;

async function readSetting<T>(key: string): Promise<T | null> {
  const row = await sbSelectOne<{ value: T }>("portal_settings", [q.select("value"), q.eq("key", key)].join("&"));
  return row?.value ?? null;
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  await sbUpsert("portal_settings", [{ key, value, updated_at: new Date().toISOString() }], "key");
}

/** Every customer with a saved list, newest first, for the index page. */
export async function savedLists(): Promise<{ customerId: number; customerName: string; count: number; savedAt: string | null }[]> {
  const rows = await sbSelect<{ key: string; value: ImportSpec }>(
    "portal_settings",
    [q.select("key,value"), "key=like.locations:*", "key=not.like.*:created"].join("&"),
  );
  return rows
    .filter((r) => /^locations:\d+$/.test(r.key) && Array.isArray(r.value?.locations))
    .map((r) => ({
      customerId: Number(r.value.customerId),
      customerName: r.value.customerName ?? `Customer ${r.value.customerId}`,
      count: r.value.locations.length,
      savedAt: r.value.savedAt ?? null,
    }))
    .sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}

export async function loadSpec(customerId: number): Promise<ImportSpec | null> {
  const v = await readSetting<ImportSpec>(specKey(customerId));
  if (!v || !Array.isArray(v.locations)) return null;
  return { ...v, customerId, managedTags: v.managedTags ?? [], statusTags: v.statusTags ?? [] };
}

/** Why a list can't be saved, or null. */
export function specProblem(spec: ImportSpec): string | null {
  if (!Number.isInteger(spec.customerId) || spec.customerId <= 0) return "No customer.";
  if (!spec.locations.length) return "The list is empty.";
  if (spec.locations.length > 2000) return "That's more than 2,000 locations — split the list.";
  for (const l of spec.locations) {
    if (!l?.name?.trim()) return "Every location needs a name.";
    if (!l.address?.street || !l.address.city || !l.address.zip) {
      return `"${l.name}" is missing a street, suburb or postcode.`;
    }
  }
  const names = spec.locations.map((l) => norm(l.name));
  const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (dupes.length) return `These names appear twice: ${dupes.slice(0, 5).join(", ")}${dupes.length > 5 ? "…" : ""}`;
  return null;
}

export async function saveSpec(spec: ImportSpec): Promise<void> {
  // Managed tags accumulate: every tag the list has ever put on anything, plus
  // every status tag. Dropping one would strand it on locations that had it.
  const prev = await loadSpec(spec.customerId);
  const managed = new Set<string>([...(prev?.managedTags ?? []), ...(spec.statusTags?.map((s) => s.tag) ?? [])]);
  for (const l of spec.locations) for (const t of l.tags ?? []) managed.add(t);
  await writeSetting(specKey(spec.customerId), { ...spec, managedTags: [...managed] });
}

const loadLedger = async (customerId: number) => (await readSetting<Record<string, number>>(ledgerKey(customerId))) ?? {};
const saveLedger = (customerId: number, ledger: Record<string, number>) => writeSetting(ledgerKey(customerId), ledger);

export async function fetchCustomer(customerId: number): Promise<{ id: number; name: string }> {
  const c = await stFetch<{ id: number; name: string }>(stTenantPath("crm", `customers/${customerId}`));
  return { id: c.id, name: c.name };
}

export const fetchLive = (customerId: number) =>
  stList<StLocation>("crm", "locations", { customerId: String(customerId), active: "Any" });

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

export async function planImport(spec: ImportSpec): Promise<ImportPlan> {
  // Fetching the customer first turns a mistyped id into a clear 404 before
  // anything is written.
  const customer = await fetchCustomer(spec.customerId);
  const live = await fetchLive(spec.customerId);
  const ids = new Map<string, number>();
  for (const [name, id] of Object.entries(await loadLedger(spec.customerId))) ids.set(norm(name), id);
  // Inactive first, so where a merge has left an active and a retired location
  // under the same name, the active one is the id every later pass writes to.
  for (const l of live.filter((l) => l.active === false)) ids.set(norm(l.name), l.id);
  for (const l of live.filter((l) => l.active !== false)) ids.set(norm(l.name), l.id);
  const toCreate = spec.locations.filter((l) => !ids.has(norm(l.name)));
  const alreadyThere = spec.locations.filter((l) => ids.has(norm(l.name))).map((l) => l.name);
  return { customer, existing: live.length, toCreate, alreadyThere, ids, live };
}

// A 400 body can quote the submitted fields back; anything shaped like an
// email is masked before an error is shown.
const scrub = (e: unknown) => (e as Error).message.replace(/[^\s"'@]+@[^\s"'@]+/g, "[email]");
const is409 = (e: unknown) => /\b409\b/.test((e as Error).message);

export type Result = { name: string; ok: boolean; id?: number; error?: string; changed?: boolean };

/** Runs `fn` over `items` five at a time — gentle on ServiceTitan, quick enough for a 60 s function. */
async function fives<T, R>(items: T[], fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += 5) out.push(...(await Promise.all(items.slice(i, i + 5).map(fn))));
  return out;
}

/**
 * Creates (or adopts) up to `limit` of the planned locations.
 *
 * Success is the id in the create response. There is deliberately no read-back
 * here — reads lag (see the ledger) — and no contact check either; those are
 * later passes, run once ServiceTitan has caught up.
 */
export async function applyImport(spec: ImportSpec, plan: ImportPlan, limit: number) {
  const batch = plan.toCreate.slice(0, limit);
  const ledger = await loadLedger(spec.customerId);
  const results: Result[] = [];
  for (let i = 0; i < batch.length; i += 5) {
    const round = await Promise.all(
      batch.slice(i, i + 5).map(async (loc): Promise<Result> => {
        try {
          if (loc.adoptId) {
            // An existing location for the same unit: it keeps its history and
            // takes the listed name and address, rather than gaining a twin.
            await stSend("PATCH", stTenantPath("crm", `locations/${loc.adoptId}`), { name: loc.name, address: loc.address });
            return { name: loc.name, ok: true, id: loc.adoptId };
          }
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
    await saveLedger(spec.customerId, ledger);
  }
  const done = results.filter((r) => r.ok);
  return { done: done.length, failed: results.filter((r) => !r.ok), remaining: plan.toCreate.length - done.length };
}

export type Paged = { done: number; changed: number; failed: Result[]; next: number | null };

function paged(spec: ImportSpec, from: number, results: Result[], sliceLen: number): Paged {
  const next = from + sliceLen;
  return {
    done: results.filter((r) => r.ok).length,
    changed: results.filter((r) => r.changed).length,
    failed: results.filter((r) => !r.ok),
    next: next < spec.locations.length ? next : null,
  };
}

/**
 * Adds each listed location's missing contacts, for list positions
 * [from, from + limit). Never duplicates what is there.
 */
export async function checkContacts(spec: ImportSpec, plan: ImportPlan, from: number, limit: number): Promise<Paged> {
  const slice = spec.locations.slice(from, from + limit);
  const results = await fives(slice, async (loc): Promise<Result> => {
    const id = plan.ids.get(norm(loc.name));
    if (!id) return { name: loc.name, ok: false, error: "not created yet" };
    if (!loc.contacts?.length) return { name: loc.name, ok: true, id };
    try {
      const have = await stList<StContact>("crm", `locations/${id}/contacts`);
      let changed = false;
      for (const c of loc.contacts) {
        if (have.some((h) => h.type === c.type && norm(h.value) === norm(c.value))) continue;
        try {
          await stSend("POST", stTenantPath("crm", `locations/${id}/contacts`), c);
          changed = true;
        } catch (e) {
          // Older locations answered 409 Conflict for a contact their list did
          // not show: ServiceTitan already holds a matching one it doesn't list
          // here. A conflict means the contact is there.
          if (!is409(e)) throw e;
        }
      }
      return { name: loc.name, ok: true, id, changed };
    } catch (e) {
      return { name: loc.name, ok: false, id, error: scrub(e) };
    }
  });
  return paged(spec, from, results, slice.length);
}

/**
 * Adds each listed location's notes that it does not already carry, pinned so
 * a tech opening the location sees them first. Matched on the text, so a re-run
 * adds nothing.
 */
export async function addNotes(spec: ImportSpec, plan: ImportPlan, from: number, limit: number): Promise<Paged> {
  const slice = spec.locations.slice(from, from + limit);
  const results = await fives(slice, async (loc): Promise<Result> => {
    if (!loc.notes?.length) return { name: loc.name, ok: true };
    const id = plan.ids.get(norm(loc.name));
    if (!id) return { name: loc.name, ok: false, error: "not created yet" };
    try {
      const have = await stList<StNote>("crm", `locations/${id}/notes`);
      let changed = false;
      for (const text of loc.notes) {
        if (have.some((h) => norm(h.text) === norm(text))) continue;
        await stSend("POST", stTenantPath("crm", `locations/${id}/notes`), { text, pinToTop: true });
        changed = true;
      }
      return { name: loc.name, ok: true, id, changed };
    } catch (e) {
      return { name: loc.name, ok: false, id, error: scrub(e) };
    }
  });
  return paged(spec, from, results, slice.length);
}

export const tagTypes = () => stList<StTagType>("settings", "tag-types", { active: "Any" });

const wantedTags = (spec: ImportSpec) =>
  [...new Set([...(spec.managedTags ?? []), ...(spec.statusTags ?? []).map((s) => s.tag), ...spec.locations.flatMap((l) => l.tags ?? [])])];

/** Tag names the list uses that ServiceTitan doesn't have. */
export async function missingTagTypes(spec: ImportSpec): Promise<string[]> {
  const have = new Set((await tagTypes()).map((t) => norm(t.name)));
  return wantedTags(spec).filter((n) => !have.has(norm(n)));
}

/**
 * Sets each listed location's managed tags, for list positions
 * [from, from + limit). Tag types are matched by name and must already exist;
 * a missing one stops before anything is written rather than tagging half the
 * list.
 *
 * No read-back: on the first live run 115 tag changes read back stale a moment
 * later and every one of them was in place on the next pass. Verification is a
 * second pass over the list after a pause, which should change nothing.
 */
export async function syncTags(spec: ImportSpec, plan: ImportPlan, from: number, limit: number): Promise<Paged> {
  const types = await tagTypes();
  const byName = new Map(types.map((t) => [norm(t.name), t.id]));
  const missing = wantedTags(spec).filter((n) => !byName.has(norm(n)));
  if (missing.length) throw new Error(`Create these tags in ServiceTitan first (Settings → Tag Types): ${missing.join(", ")}`);
  const managedIds = new Set((spec.managedTags ?? []).map((n) => byName.get(norm(n))!));
  const liveById = new Map(plan.live.map((l) => [l.id, l]));

  const slice = spec.locations.slice(from, from + limit);
  const results = await fives(slice, async (loc): Promise<Result> => {
    const id = plan.ids.get(norm(loc.name));
    if (!id) return { name: loc.name, ok: false, error: "not created yet" };
    try {
      const cur = liveById.get(id) ?? (await stFetch<StLocation>(stTenantPath("crm", `locations/${id}`)));
      // Without the current tags, a PATCH would replace whatever the office has
      // put on the location with only ours.
      if (!Array.isArray(cur.tagTypeIds)) throw new Error("ServiceTitan did not return the location's current tags");
      const want = new Set(cur.tagTypeIds.filter((t) => !managedIds.has(t)));
      for (const n of loc.tags ?? []) want.add(byName.get(norm(n))!);
      const same = want.size === cur.tagTypeIds.length && cur.tagTypeIds.every((t) => want.has(t));
      if (same) return { name: loc.name, ok: true, id };
      await stSend("PATCH", stTenantPath("crm", `locations/${id}`), { tagTypeIds: [...want] });
      return { name: loc.name, ok: true, id, changed: true };
    } catch (e) {
      return { name: loc.name, ok: false, id, error: scrub(e) };
    }
  });
  return paged(spec, from, results, slice.length);
}

/** The unit number a location appears to be, from its unit field, name or a "28/36 …" street. */
export function unitOf(l: { name?: string; address?: { unit?: string; street?: string } }): number | null {
  for (const s of [l.address?.unit, l.name]) {
    const m = (s ?? "").match(/(?:unit|u|villa|apt|apartment|flat)?\s*#?\s*(\d{1,4})\b/i);
    if (m) return Number(m[1]);
  }
  // A bare number in the street is the street number (36 Racecourse Road), not
  // a unit, unless it is written as "12/36 …".
  const slash = (l.address?.street ?? "").match(/^\s*(\d{1,4})\s*\//);
  return slash ? Number(slash[1]) : null;
}

/**
 * Which site a location is on, so unit numbers are only compared within one:
 * Unit 1 at 12 Example Street and Unit 1 at 14 Example Street are two units,
 * not a double. Keyed on the street number and suburb rather than the whole
 * street, because the same site gets written "36-40 Racecourse Road" on one
 * record and "36 Racecourse Road" on another. A location with no address is
 * compared with others that have none.
 */
export function siteOf(l: { address?: { street?: string; city?: string } }): string {
  const street = l.address?.street ?? "";
  const num = street.match(/^\s*(?:\d+\s*\/\s*)?(\d+)/)?.[1] ?? norm(street);
  return `${num}|${norm(l.address?.city)}`;
}

export const sameSpot = (a: StLocation | ImportLocation, b: StLocation | ImportLocation) =>
  unitOf(a) != null && unitOf(a) === unitOf(b) && siteOf(a) === siteOf(b);

export type LiveLocation = {
  id: number;
  name: string;
  address: string;
  unit: number | null;
  site: string;
  active: boolean;
  tags: string[];
  status: string | null;
};

/** The customer's locations as they are in ServiceTitan now, with tag names and status. */
export async function liveView(customerId: number, spec: ImportSpec | null) {
  const [live, types] = await Promise.all([fetchLive(customerId), tagTypes()]);
  const nameOf = new Map(types.map((t) => [t.id, t.name]));
  const statusByTag = new Map((spec?.statusTags ?? []).map((s) => [norm(s.tag), s.label]));
  const locations: LiveLocation[] = live.map((l) => {
    const tags = (l.tagTypeIds ?? []).map((t) => nameOf.get(t) ?? `#${t}`);
    const status = tags.map((t) => statusByTag.get(norm(t))).find(Boolean) ?? null;
    return {
      id: l.id,
      name: l.name,
      address: [l.address?.unit && `Unit ${l.address.unit}`, l.address?.street, l.address?.city].filter(Boolean).join(", "),
      unit: unitOf(l),
      site: siteOf(l),
      active: l.active !== false,
      tags,
      status,
    };
  });
  return { locations, tagNames: types.filter((t) => t.active !== false).map((t) => t.name) };
}

/**
 * Active locations that look like the same unit twice: groups sharing a unit
 * number on the same site. The oldest record (lowest id) is offered as the one to keep, because
 * that is where the unit's job, invoice and equipment history hangs. Only a
 * suggestion — a person decides, one at a time.
 */
export function findDoubles(locations: LiveLocation[]) {
  const byUnit = new Map<string, LiveLocation[]>();
  for (const l of locations) {
    if (!l.active || l.unit == null) continue;
    const k = `${l.site}#${l.unit}`;
    byUnit.set(k, [...(byUnit.get(k) ?? []), l]);
  }
  return [...byUnit.values()]
    .filter((g) => g.length > 1)
    .map((g) => [...g].sort((a, b) => a.id - b.id))
    .map((g) => ({ unit: g[0].unit as number, keep: g[0], retire: g.slice(1) }))
    .sort((a, b) => a.unit - b.unit);
}

/**
 * Folds one double into a single location: `keep` takes the listed name,
 * address, contacts and notes (when the unit is on the saved list) and any
 * tags the others carried, and each other is deactivated — not deleted, so it
 * can be switched back on. Every step is idempotent, so a half-finished merge
 * is finished by running it again.
 */
export async function mergeDouble(customerId: number, spec: ImportSpec | null, keepId: number, retireIds: number[]) {
  const done: string[] = [];
  const keep = await stFetch<StLocation>(stTenantPath("crm", `locations/${keepId}`));
  if (keep.customerId !== customerId) throw new Error("That location is on another customer.");
  const retire = await Promise.all(retireIds.map((id) => stFetch<StLocation>(stTenantPath("crm", `locations/${id}`))));
  if (retire.some((r) => r.customerId !== customerId)) throw new Error("A duplicate is on another customer.");

  const listed =
    spec?.locations.find((l) => [keep, ...retire].some((r) => norm(r.name) === norm(l.name))) ??
    spec?.locations.find((l) => [keep, ...retire].some((r) => sameSpot(r, l)));

  if (listed) {
    if (norm(keep.name) !== norm(listed.name) || norm(keep.address?.unit) !== norm(listed.address.unit)) {
      await stSend("PATCH", stTenantPath("crm", `locations/${keepId}`), { name: listed.name, address: listed.address });
      done.push(`renamed to ${listed.name}`);
    }
    const haveContacts = await stList<StContact>("crm", `locations/${keepId}/contacts`);
    for (const c of listed.contacts ?? []) {
      if (haveContacts.some((h) => h.type === c.type && norm(h.value) === norm(c.value))) continue;
      try {
        await stSend("POST", stTenantPath("crm", `locations/${keepId}/contacts`), c);
        done.push("contact added");
      } catch (e) {
        if (!is409(e)) throw e; // see checkContacts
      }
    }
    const haveNotes = await stList<StNote>("crm", `locations/${keepId}/notes`);
    for (const text of listed.notes ?? []) {
      if (haveNotes.some((h) => norm(h.text) === norm(text))) continue;
      await stSend("POST", stTenantPath("crm", `locations/${keepId}/notes`), { text, pinToTop: true });
      done.push("note added");
    }
    const ledger = await loadLedger(customerId);
    ledger[listed.name] = keepId;
    await saveLedger(customerId, ledger);
  }

  // Tags the retired records carried move to the kept one, so merging a double
  // never loses a "serviced" or "repairs flagged".
  const carried = new Set(retire.flatMap((r) => r.tagTypeIds ?? []));
  const keepTags = new Set(keep.tagTypeIds ?? []);
  if (Array.isArray(keep.tagTypeIds) && [...carried].some((t) => !keepTags.has(t))) {
    await stSend("PATCH", stTenantPath("crm", `locations/${keepId}`), { tagTypeIds: [...new Set([...keepTags, ...carried])] });
    done.push("tags carried over");
  }

  for (const r of retire) {
    if (r.active === false) continue;
    await stSend("PATCH", stTenantPath("crm", `locations/${r.id}`), { active: false });
    done.push(`${r.name} (${r.id}) switched off`);
  }
  return done.length ? done : ["already merged"];
}

/**
 * Moves locations to one status: the status's tag goes on, every other status
 * tag comes off, other tags stay. Written to ServiceTitan directly, and to the
 * saved list too, so a later tag sync doesn't put the old status back.
 */
export async function setStatus(customerId: number, spec: ImportSpec, ids: number[], label: string) {
  const target = spec.statusTags?.find((s) => s.label === label);
  if (!target) throw new Error(`No status called "${label}".`);
  const types = await tagTypes();
  const byName = new Map(types.map((t) => [norm(t.name), t.id]));
  const statusIds = new Set((spec.statusTags ?? []).map((s) => byName.get(norm(s.tag))).filter((x): x is number => !!x));
  const targetId = byName.get(norm(target.tag));
  if (!targetId) throw new Error(`Create the tag "${target.tag}" in ServiceTitan first.`);

  const live = await fetchLive(customerId);
  const byId = new Map(live.map((l) => [l.id, l]));
  const results = await fives(ids, async (id): Promise<Result> => {
    const l = byId.get(id);
    if (!l) return { name: String(id), ok: false, error: "not on this customer" };
    try {
      if (!Array.isArray(l.tagTypeIds)) throw new Error("ServiceTitan did not return the location's current tags");
      const want = new Set(l.tagTypeIds.filter((t) => !statusIds.has(t)));
      want.add(targetId);
      const same = want.size === l.tagTypeIds.length && l.tagTypeIds.every((t) => want.has(t));
      if (!same) await stSend("PATCH", stTenantPath("crm", `locations/${id}`), { tagTypeIds: [...want] });
      return { name: l.name, ok: true, id, changed: !same };
    } catch (e) {
      return { name: l.name, ok: false, id, error: scrub(e) };
    }
  });

  const statusNames = new Set((spec.statusTags ?? []).map((s) => norm(s.tag)));
  const movedNames = new Set(results.filter((r) => r.ok).map((r) => norm(r.name)));
  if (movedNames.size) {
    const locations = spec.locations.map((l) =>
      movedNames.has(norm(l.name))
        ? { ...l, tags: [...(l.tags ?? []).filter((t) => !statusNames.has(norm(t))), target.tag] }
        : l,
    );
    await saveSpec({ ...spec, locations });
  }
  return { changed: results.filter((r) => r.changed).length, failed: results.filter((r) => !r.ok) };
}
