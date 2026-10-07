import "server-only";
import { cache } from "react";
import { q, sbInsert, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import type { PortalUser } from "@/lib/portal/caps";
import { meOf, teamPeople, todayMelbourne } from "@/lib/todos/store";
import type { Person } from "@/lib/todos/types";
import { isDue, touchState, type Cadence, type Contact, type Touch } from "@/lib/contacts/types";

/**
 * Where the keep-in-touch list lives.
 *
 * The office sees and works the whole list — the same people who see every
 * to-do list — and each contact has one of them looking after it, whose bell
 * and side bar count it lands on when it's due.
 */

const C = "portal_contacts";
const T = "portal_contact_touches";
const COLS = "id,name,company,kind,phone,email,notes,owner_id,cadence,last_contact_on,last_contact_how,created_at";

type Row = {
  id: string; name: string; company: string | null; kind: string | null; phone: string | null; email: string | null;
  notes: string | null; owner_id: string | null; cadence: Cadence; last_contact_on: string | null; last_contact_how: string | null; created_at: string;
};
const toContact = (r: Row): Contact => ({
  id: r.id, name: r.name, company: r.company, kind: r.kind, phone: r.phone, email: r.email, notes: r.notes,
  ownerId: r.owner_id, cadence: r.cadence, lastOn: r.last_contact_on, lastHow: r.last_contact_how, createdAt: r.created_at,
});

const clean = (s: string | null | undefined, max: number) => (s && s.trim() ? s.trim().slice(0, max) : null);

export const listContacts = cache(async (): Promise<Contact[]> => {
  const rows = await sbSelect<Row>(C, [q.select(COLS), "removed_at=is.null", "order=name.asc", "limit=1000"].join("&"));
  return rows.map(toContact);
});

export async function getContact(id: string): Promise<Contact | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await sbSelect<Row>(C, [q.select(COLS), q.eq("id", id), "removed_at=is.null"].join("&"));
  return rows[0] ? toContact(rows[0]) : null;
}

/** Every reach-out logged since a day, newest first: the page's histories and the month's count. */
export async function touchesSince(fromIso: string): Promise<Touch[]> {
  const rows = await sbSelect<{ id: string; contact_id: string; on_date: string; how: string; note: string | null; by_name: string | null }>(
    T,
    [q.select("id,contact_id,on_date,how,note,by_name"), `on_date=gte.${fromIso}`, "order=on_date.desc,created_at.desc", "limit=2000"].join("&"),
  );
  return rows.map((r) => ({ id: r.id, contactId: r.contact_id, on: r.on_date, how: r.how, note: r.note, byName: r.by_name }));
}

export type ContactInput = {
  name: string; company?: string | null; kind?: string | null; phone?: string | null; email?: string | null;
  notes?: string | null; ownerId: string | null; cadence: Cadence;
};

export async function createContact(input: ContactInput & { lastOn?: string | null; by: Person }): Promise<void> {
  await sbInsert(C, {
    name: input.name.trim().slice(0, 200),
    company: clean(input.company, 200),
    kind: clean(input.kind, 40),
    phone: clean(input.phone, 40),
    email: clean(input.email, 200),
    notes: clean(input.notes, 2000),
    owner_id: input.ownerId,
    cadence: input.cadence,
    last_contact_on: input.lastOn || null,
    last_contact_how: input.lastOn ? "other" : null,
    created_by: input.by.name,
  });
}

export async function updateContact(id: string, input: ContactInput): Promise<void> {
  await sbUpdate(C, `${q.eq("id", id)}&removed_at=is.null`, {
    name: input.name.trim().slice(0, 200),
    company: clean(input.company, 200),
    kind: clean(input.kind, 40),
    phone: clean(input.phone, 40),
    email: clean(input.email, 200),
    notes: clean(input.notes, 2000),
    owner_id: input.ownerId,
    cadence: input.cadence,
    updated_at: new Date().toISOString(),
  });
}

/**
 * A reach-out: kept as its own row, and the contact's latest moved on — only
 * forward, so logging last Tuesday's call after today's doesn't wind the
 * clock back.
 */
export async function logTouch(c: Contact, input: { on: string; how: string; note?: string | null; by: Person }): Promise<void> {
  await sbInsert(T, { contact_id: c.id, on_date: input.on, how: input.how, note: clean(input.note, 1000), by_id: input.by.id, by_name: input.by.name });
  if (!c.lastOn || input.on >= c.lastOn) {
    await sbUpdate(C, q.eq("id", c.id), { last_contact_on: input.on, last_contact_how: input.how, updated_at: new Date().toISOString() });
  }
}

export async function removeContact(id: string): Promise<void> {
  await sbUpdate(C, `${q.eq("id", id)}&removed_at=is.null`, { removed_at: new Date().toISOString() });
}

/* ------------------------------------------------- for the bell and counts */

/** Mine that are due now: overdue, due today, or never reached out to. */
export async function myDueContacts(user: PortalUser): Promise<Contact[]> {
  const me = await meOf(user);
  if (!me) return [];
  const today = todayMelbourne();
  return (await listContacts()).filter((c) => c.ownerId === me.id && isDue(touchState(c, today)));
}

/** Due now, by who looks after them — for Home's "Needs someone" and the daily report. */
export async function dueByPerson(): Promise<Array<{ name: string; n: number }>> {
  const today = todayMelbourne();
  const [all, people] = await Promise.all([listContacts(), teamPeople()]);
  const name = new Map(people.map((p) => [p.id, p.name]));
  const counts = new Map<string, number>();
  for (const c of all) {
    if (!isDue(touchState(c, today))) continue;
    const who = (c.ownerId && name.get(c.ownerId)) || "Nobody";
    counts.set(who, (counts.get(who) ?? 0) + 1);
  }
  return [...counts.entries()].map(([n, k]) => ({ name: n, n: k })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
