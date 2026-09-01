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
  expectations: string | null;
};

function toUser(r: UserRow): PortalUser & { invitedBy?: string | null; createdAt?: string; expectations?: string | null } {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    caps: r.caps ?? {},
    active: r.active,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
    expectations: r.expectations ?? null,
  };
}

export type Report = {
  id: string;
  subjectId: string | null;
  subjectName: string;
  authorEmail: string;
  authorName: string | null;
  category: string;
  sentiment: string | null;
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
  sentiment: string | null;
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
    sentiment: r.sentiment ?? null,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  };
}

export type Goal = {
  id: string;
  userId: string;
  title: string;
  target: string | null;
  status: "open" | "done";
  due: string | null;
  createdAt: string;
};

type GoalRow = { id: string; user_id: string; title: string; target: string | null; status: "open" | "done"; due: string | null; created_at: string };
const toGoal = (r: GoalRow): Goal => ({ id: r.id, userId: r.user_id, title: r.title, target: r.target, status: r.status, due: r.due, createdAt: r.created_at });

export type Review = {
  id: string;
  userId: string;
  period: string | null;
  rating: number | null;
  body: string;
  authorName: string | null;
  createdAt: string;
};

type ReviewRow = { id: string; user_id: string; period: string | null; rating: number | null; body: string; author_email: string | null; author_name: string | null; created_at: string };
const toReview = (r: ReviewRow): Review => ({ id: r.id, userId: r.user_id, period: r.period, rating: r.rating, body: r.body, authorName: r.author_name, createdAt: r.created_at });

/* ---------------- users ---------------- */

export async function getUser(email: string): Promise<(PortalUser & { invitedBy?: string | null; expectations?: string | null }) | null> {
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

export async function getUserById(id: string): Promise<(PortalUser & { expectations?: string | null }) | null> {
  const res = await sb(`${USERS}?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as UserRow[];
  return rows[0] ? toUser(rows[0]) : null;
}

export async function updateUser(
  id: string,
  patch: { role?: Role; caps?: CapMap; active?: boolean; name?: string; expectations?: string },
): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.role !== undefined) body.role = patch.role;
  if (patch.caps !== undefined) body.caps = patch.caps;
  if (patch.active !== undefined) body.active = patch.active;
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.expectations !== undefined) body.expectations = patch.expectations;
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
  category: string; sentiment?: string; title?: string; body: string;
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
      sentiment: input.sentiment || null,
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

/* ---------------- goals & targets ---------------- */

export async function listGoals(userId: string): Promise<Goal[]> {
  const res = await sb(`portal_goals?user_id=eq.${encodeURIComponent(userId)}&select=*&order=status.asc,created_at.desc`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as GoalRow[]).map(toGoal);
}

export async function createGoal(input: { userId: string; title: string; target?: string; due?: string | null; createdBy?: string }): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_goals", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: input.userId, title: input.title, target: input.target || null, due: input.due || null, created_by: input.createdBy || null }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function updateGoal(id: string, patch: { title?: string; target?: string; status?: "open" | "done"; due?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.target !== undefined) body.target = patch.target || null;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.due !== undefined) body.due = patch.due || null;
  const res = await sb(`portal_goals?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_goals?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/* ---------------- reviews ---------------- */

export async function listReviews(userId: string): Promise<Review[]> {
  const res = await sb(`portal_reviews?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as ReviewRow[]).map(toReview);
}

export async function createReview(input: { userId: string; period?: string; rating?: number | null; body: string; authorEmail: string; authorName: string }): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_reviews", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: input.userId, period: input.period || null, rating: input.rating ?? null, body: input.body, author_email: input.authorEmail, author_name: input.authorName }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deleteReview(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_reviews?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/* ---------------- vehicles ---------------- */

export type Vehicle = {
  id: string;
  name: string;
  rego: string | null;
  details: string | null;
  odometer: number | null;
  serviceIntervalKm: number | null;
  nextServiceKm: number | null;
  nextServiceDate: string | null;
  active: boolean;
  notes: string | null;
};

type VehicleRow = {
  id: string; name: string; rego: string | null; details: string | null;
  odometer: number | null; service_interval_km: number | null;
  next_service_km: number | null; next_service_date: string | null;
  active: boolean; notes: string | null;
};

const toVehicle = (r: VehicleRow): Vehicle => ({
  id: r.id, name: r.name, rego: r.rego, details: r.details, odometer: r.odometer,
  serviceIntervalKm: r.service_interval_km, nextServiceKm: r.next_service_km,
  nextServiceDate: r.next_service_date, active: r.active, notes: r.notes,
});

export type VehicleLogKind = "service" | "fuel" | "damage" | "reading";
export type VehicleLog = {
  id: string; vehicleId: string; kind: VehicleLogKind; logDate: string;
  odometer: number | null; cost: number | null; litres: number | null;
  detail: string | null; createdBy: string | null; createdAt: string;
};

type VehicleLogRow = {
  id: string; vehicle_id: string; kind: VehicleLogKind; log_date: string;
  odometer: number | null; cost: number | null; litres: number | null;
  detail: string | null; created_by: string | null; created_at: string;
};

const toLog = (r: VehicleLogRow): VehicleLog => ({
  id: r.id, vehicleId: r.vehicle_id, kind: r.kind, logDate: r.log_date,
  odometer: r.odometer, cost: r.cost === null ? null : Number(r.cost),
  litres: r.litres === null ? null : Number(r.litres), detail: r.detail,
  createdBy: r.created_by, createdAt: r.created_at,
});

export async function listVehicles(): Promise<Vehicle[]> {
  const res = await sb(`portal_vehicles?select=*&order=active.desc,name.asc`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as VehicleRow[]).map(toVehicle);
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
  const res = await sb(`portal_vehicles?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as VehicleRow[];
  return rows[0] ? toVehicle(rows[0]) : null;
}

export async function createVehicle(input: {
  name: string; rego?: string; details?: string; odometer?: number | null;
  serviceIntervalKm?: number | null; nextServiceKm?: number | null; nextServiceDate?: string | null; notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_vehicles", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      name: input.name.trim(), rego: input.rego || null, details: input.details || null,
      odometer: input.odometer ?? null, service_interval_km: input.serviceIntervalKm ?? null,
      next_service_km: input.nextServiceKm ?? null, next_service_date: input.nextServiceDate || null, notes: input.notes || null,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function updateVehicle(id: string, patch: {
  name?: string; rego?: string; details?: string; odometer?: number | null;
  serviceIntervalKm?: number | null; nextServiceKm?: number | null; nextServiceDate?: string | null; active?: boolean; notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.rego !== undefined) body.rego = patch.rego || null;
  if (patch.details !== undefined) body.details = patch.details || null;
  if (patch.odometer !== undefined) body.odometer = patch.odometer;
  if (patch.serviceIntervalKm !== undefined) body.service_interval_km = patch.serviceIntervalKm;
  if (patch.nextServiceKm !== undefined) body.next_service_km = patch.nextServiceKm;
  if (patch.nextServiceDate !== undefined) body.next_service_date = patch.nextServiceDate || null;
  if (patch.active !== undefined) body.active = patch.active;
  if (patch.notes !== undefined) body.notes = patch.notes || null;
  const res = await sb(`portal_vehicles?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body) });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deleteVehicle(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_vehicles?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function listVehicleLogs(vehicleId: string): Promise<VehicleLog[]> {
  const res = await sb(`portal_vehicle_logs?vehicle_id=eq.${encodeURIComponent(vehicleId)}&select=*&order=log_date.desc,created_at.desc`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as VehicleLogRow[]).map(toLog);
}

export async function createVehicleLog(input: {
  vehicleId: string; kind: VehicleLogKind; logDate?: string; odometer?: number | null;
  cost?: number | null; litres?: number | null; detail?: string; createdBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_vehicle_logs", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      vehicle_id: input.vehicleId, kind: input.kind, log_date: input.logDate || undefined,
      odometer: input.odometer ?? null, cost: input.cost ?? null, litres: input.litres ?? null,
      detail: input.detail || null, created_by: input.createdBy || null,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  // Roll the vehicle's odometer forward if this reading is higher.
  if (input.odometer && input.odometer > 0) {
    const v = await getVehicle(input.vehicleId);
    if (v && (v.odometer === null || input.odometer > v.odometer)) {
      await updateVehicle(input.vehicleId, { odometer: input.odometer });
    }
  }
  return { ok: true };
}

export async function deleteVehicleLog(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_vehicle_logs?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}
