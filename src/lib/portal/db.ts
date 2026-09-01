/**
 * The portal's data layer — team members and the reports kept about them.
 *
 * Talks to Supabase over REST with the service-role key, the same pattern
 * the quote form uses. Server-only: the service-role key must never reach
 * the browser. Every function degrades to a safe default when the database
 * isn't configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset), so the
 * portal still runs on a preview build with no database — the owner gets in
 * via the seed in ./team, and the admin screen shows a "connect the
 * database" notice instead of a live list.
 */

import "server-only";
import type { PortalUser, Role, CapMap } from "./caps";
import { baseMember } from "./team";

const USERS = "portal_users";
const REPORTS = "portal_reports";

export function dbConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function conf() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

async function sb(path: string, init: RequestInit = {}): Promise<Response | null> {
  const c = conf();
  if (!c) return null;
  return fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

/* ---------------- row mapping ---------------- */

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  caps: CapMap | null;
  active: boolean;
  invited_by: string | null;
  created_at: string;
};

function toUser(r: UserRow): PortalUser & { invitedBy?: string | null; createdAt?: string } {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    caps: r.caps ?? {},
    active: r.active,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
  };
}

export type Report = {
  id: string;
  subjectId: string | null;
  subjectName: string;
  authorEmail: string;
  authorName: string | null;
  category: string;
  title: string | null;
  body: string;
  createdAt: string;
};

type ReportRow = {
  id: string;
  subject_id: string | null;
  subject_name: string;
  author_email: string;
  author_name: string | null;
  category: string;
  title: string | null;
  body: string;
  created_at: string;
};

function toReport(r: ReportRow): Report {
  return {
    id: r.id,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    authorEmail: r.author_email,
    authorName: r.author_name,
    category: r.category,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  };
}

/* ---------------- users ---------------- */

export async function getUser(email: string): Promise<(PortalUser & { invitedBy?: string | null }) | null> {
  const e = email.trim().toLowerCase();
  const res = await sb(`${USERS}?email=eq.${encodeURIComponent(e)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as UserRow[];
  return rows[0] ? toUser(rows[0]) : null;
}

export async function listUsers(): Promise<(PortalUser & { invitedBy?: string | null; createdAt?: string })[]> {
  const res = await sb(`${USERS}?select=*&order=active.desc,name.asc`);
  if (!res || !res.ok) return [];
  const rows = (await res.json()) as UserRow[];
  return rows.map(toUser);
}

export async function createUser(input: {
  email: string; name: string; role: Role; caps?: CapMap; invitedBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(USERS, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      caps: input.caps ?? {},
      active: true,
      invited_by: input.invitedBy ?? null,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 409 || /duplicate|unique/i.test(t)) return { ok: false, error: "exists" };
    return { ok: false, error: `${res.status}` };
  }
  return { ok: true };
}

export async function updateUser(
  id: string,
  patch: { role?: Role; caps?: CapMap; active?: boolean; name?: string },
): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.role !== undefined) body.role = patch.role;
  if (patch.caps !== undefined) body.caps = patch.caps;
  if (patch.active !== undefined) body.active = patch.active;
  if (patch.name !== undefined) body.name = patch.name.trim();
  const res = await sb(`${USERS}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deleteUser(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`${USERS}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/**
 * Resolve an email to the current, live user — the one call auth uses.
 * Owners (see ./team) are always admins and can never be locked out. Anyone
 * else comes from the database and must be active.
 */
export async function resolveUser(email: string): Promise<PortalUser | null> {
  const e = email.trim().toLowerCase();
  const owner = baseMember(e);
  if (owner) return { email: owner.email, name: owner.name, role: owner.role, caps: {}, active: true };
  if (!dbConfigured()) return null;
  const u = await getUser(e);
  return u && u.active ? { id: u.id, email: u.email, name: u.name, role: u.role, caps: u.caps, active: true } : null;
}

/** May this email request a sign-in link? (Owner, or an active DB member.) */
export async function isAllowed(email: string): Promise<boolean> {
  return (await resolveUser(email)) !== null;
}

/* ---------------- reports ---------------- */

export async function listReports(opts: { subjectId?: string; limit?: number } = {}): Promise<Report[]> {
  const params = new URLSearchParams({ select: "*", order: "created_at.desc" });
  if (opts.subjectId) params.set("subject_id", `eq.${opts.subjectId}`);
  if (opts.limit) params.set("limit", String(opts.limit));
  const res = await sb(`${REPORTS}?${params.toString()}`);
  if (!res || !res.ok) return [];
  const rows = (await res.json()) as ReportRow[];
  return rows.map(toReport);
}

export async function createReport(input: {
  subjectId: string | null; subjectName: string;
  authorEmail: string; authorName: string;
  category: string; title?: string; body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(REPORTS, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      subject_id: input.subjectId,
      subject_name: input.subjectName,
      author_email: input.authorEmail,
      author_name: input.authorName,
      category: input.category,
      title: input.title || null,
      body: input.body,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text().catch(() => "")}` };
  return { ok: true };
}

export async function deleteReport(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`${REPORTS}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}
