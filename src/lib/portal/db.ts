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
import { CAPS, roleDefault } from "./caps";
import type { CrewLevel, Costing, CapSettings, AccessMap } from "./crew";
import { DEFAULT_ACCESS } from "./crew";
import { baseMember } from "./team";
import type { CheckItems, CheckKind } from "./vanChecks";
import type { Campaign } from "./campaigns";
import type { Video as StoredVideo } from "./videos";
import type { StoredSop } from "./sopEdits";
import type { StoredPost } from "@/lib/blogMerge";

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

/**
 * `cached` opts a read out of no-store and into Next's fetch cache under a
 * tag, for the handful of reads that happen on a statically rendered public
 * page. A page with generateStaticParams that does a no-store fetch throws
 * "changed from static to dynamic at runtime" and answers 500 — which is what
 * the blog did the first time a post was written. Everything in the portal
 * stays no-store: it is behind a login and has to be current.
 */
async function sb(path: string, init: RequestInit & { cached?: string } = {}): Promise<Response | null> {
  const c = conf();
  const { cached, ...rest } = init;
  if (!c) return null;
  return fetch(`${c.url}/rest/v1/${path}`, {
    ...rest,
    ...(cached ? { next: { tags: [cached] } } : { cache: "no-store" as RequestCache }),
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
  email: string | null;
  name: string;
  role: Role;
  caps: CapMap | null;
  active: boolean;
  invited_by: string | null;
  created_at: string;
  expectations: string | null;
  level: string | null;
  wage: number | null;
  hrs_week: number | null;
  leave_days: number | null;
  ph_days: number | null;
  sick_days: number | null;
  school_days: number | null;
  travel_hrs_week: number | null;
  admin_hrs_week: number | null;
  own_van: boolean | null;
  rdo_days: number | null;
  callback_pct: number | null;
  ot_mult: number | null;
  night_mult: number | null;
  office_hrs_week: number | null;
  rate_override: number | null;
  sort_order: number | null;
};

export type CostedUser = PortalUser & {
  invitedBy?: string | null; createdAt?: string; expectations?: string | null;
  level: CrewLevel | null; costing: Costing; sortOrder: number | null;
};

function toUser(r: UserRow): CostedUser {
  return {
    id: r.id,
    email: r.email ?? "",
    name: r.name,
    role: r.role,
    caps: r.caps ?? {},
    active: r.active,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
    expectations: r.expectations ?? null,
    level: (r.level as CrewLevel | null) ?? null,
    costing: {
      wage: Number(r.wage ?? 0),
      hrsWeek: Number(r.hrs_week ?? 0),
      leaveDays: Number(r.leave_days ?? 0),
      phDays: Number(r.ph_days ?? 0),
      sickDays: Number(r.sick_days ?? 0),
      schoolDays: Number(r.school_days ?? 0),
      travelHrsWeek: Number(r.travel_hrs_week ?? 0),
      adminHrsWeek: Number(r.admin_hrs_week ?? 0),
      // Rows written before the column existed: anyone on the tools was being
      // counted as chargeable, so keep them that way rather than silently
      // dropping their billable hours.
      ownVan: r.own_van ?? true,
      // Rows written before these columns existed take the standard: an RDO a
      // month, time and a half, double time at night.
      rdoDays: Number(r.rdo_days ?? 12),
      otMult: Number(r.ot_mult ?? 1.5),
      nightMult: Number(r.night_mult ?? 2),
      callbackPct: r.callback_pct == null ? null : Number(r.callback_pct),
      officeHrsWeek: Number(r.office_hrs_week ?? 0),
      rateOverride: r.rate_override == null ? null : Number(r.rate_override),
    },
    sortOrder: r.sort_order == null ? null : Number(r.sort_order),
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

export async function getUser(email: string): Promise<CostedUser | null> {
  const e = email.trim().toLowerCase();
  const res = await sb(`${USERS}?email=eq.${encodeURIComponent(e)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as UserRow[];
  return rows[0] ? toUser(rows[0]) : null;
}

export async function listUsers(): Promise<CostedUser[]> {
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

export async function getUserById(id: string): Promise<CostedUser | null> {
  const res = await sb(`${USERS}?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as UserRow[];
  return rows[0] ? toUser(rows[0]) : null;
}

export async function updateUser(
  id: string,
  patch: { role?: Role; caps?: CapMap; active?: boolean; name?: string; email?: string; expectations?: string; level?: CrewLevel; sortOrder?: number | null },
): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.role !== undefined) body.role = patch.role;
  // The email IS the sign-in identity, so it is only ever written through
  // setLoginEmail, which checks nobody else already holds it.
  if (patch.email !== undefined) body.email = patch.email.trim().toLowerCase();
  if (patch.caps !== undefined) body.caps = patch.caps;
  if (patch.active !== undefined) body.active = patch.active;
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.expectations !== undefined) body.expectations = patch.expectations;
  if (patch.level !== undefined) body.level = patch.level;
  if (patch.sortOrder !== undefined) body.sort_order = patch.sortOrder;
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

/** Save a person's crew level + costing (managers only). */
export async function updateCrew(id: string, level: CrewLevel, c: Costing): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`${USERS}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      level,
      wage: c.wage, hrs_week: c.hrsWeek, leave_days: c.leaveDays, ph_days: c.phDays,
      sick_days: c.sickDays, school_days: c.schoolDays, travel_hrs_week: c.travelHrsWeek,
      admin_hrs_week: c.adminHrsWeek, office_hrs_week: c.officeHrsWeek, own_van: c.ownVan,
      rdo_days: c.rdoDays, ot_mult: c.otMult, night_mult: c.nightMult, callback_pct: c.callbackPct ?? null,
      rate_override: c.rateOverride ?? null, updated_at: new Date().toISOString(),
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/** Add a crew member (a team person). Email is optional — no email means a
 *  costing-only person who can't sign in (labourer, subbie). */
export async function createCrewPerson(input: { name: string; email?: string | null; level: CrewLevel; costing: Costing }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await sb(USERS, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email ? input.email.trim().toLowerCase() : null,
      role: "member",
      caps: {},
      active: true,
      level: input.level,
      wage: input.costing.wage, hrs_week: input.costing.hrsWeek, leave_days: input.costing.leaveDays,
      ph_days: input.costing.phDays, sick_days: input.costing.sickDays, school_days: input.costing.schoolDays,
      travel_hrs_week: input.costing.travelHrsWeek, admin_hrs_week: input.costing.adminHrsWeek,
      office_hrs_week: input.costing.officeHrsWeek, rate_override: input.costing.rateOverride ?? null,
      own_van: input.costing.ownVan,
      rdo_days: input.costing.rdoDays, ot_mult: input.costing.otMult, night_mult: input.costing.nightMult,
      callback_pct: input.costing.callbackPct ?? null,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 409 || /duplicate|unique/i.test(t)) return { ok: false, error: "exists" };
    return { ok: false, error: `${res.status}` };
  }
  const rows = (await res.json()) as { id: string }[];
  return { ok: true, id: rows[0]?.id };
}

/* ---------------- settings (business-wide) ---------------- */

export async function getSettings<T>(key: string): Promise<T | null> {
  const res = await sb(`portal_settings?key=eq.${encodeURIComponent(key)}&select=value`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as { value: T }[];
  return rows[0] ? rows[0].value : null;
}

export async function saveSettings(key: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_settings?on_conflict=key`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text().catch(() => "")}` };
  return { ok: true };
}

export async function getCapSettings(): Promise<CapSettings | null> {
  return getSettings<CapSettings>("capacity");
}

/* ---------------- quotes (win-rate tracking) ---------------- */

export type QuoteStatus = "quoted" | "won" | "lost";
export type Quote = { id: string; amount: number; status: QuoteStatus; customer: string | null; quotedOn: string; createdBy: string | null };
type QuoteRow = { id: string; amount: number; status: QuoteStatus; customer: string | null; quoted_on: string; created_by: string | null };
const toQuote = (r: QuoteRow): Quote => ({ id: r.id, amount: Number(r.amount), status: r.status, customer: r.customer, quotedOn: r.quoted_on, createdBy: r.created_by });

export async function listQuotes(limit = 500): Promise<Quote[]> {
  const res = await sb(`portal_quotes?select=*&order=quoted_on.desc,created_at.desc&limit=${limit}`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as QuoteRow[]).map(toQuote);
}

export async function createQuote(input: { amount: number; status: QuoteStatus; customer?: string; quotedOn?: string; createdBy?: string }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await sb("portal_quotes", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ amount: input.amount, status: input.status, customer: input.customer || null, quoted_on: input.quotedOn || undefined, source: "manual", created_by: input.createdBy || null }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  const rows = (await res.json()) as { id: string }[];
  return { ok: true, id: rows[0]?.id };
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_quotes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status }) });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deleteQuote(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_quotes?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/**
 * Resolve an email to the current, live user — the one call auth uses.
 * Owners (see ./team) are always admins and can never be locked out. Anyone
 * else comes from the database and must be active.
 */
/** The level → capabilities map (stored defaults merged over the built-ins). */
export async function getAccessMap(): Promise<AccessMap> {
  const stored = await getSettings<Partial<AccessMap>>("access");
  return { ...DEFAULT_ACCESS, ...(stored ?? {}) } as AccessMap;
}

export async function saveAccessMap(map: AccessMap): Promise<{ ok: boolean; error?: string }> {
  return saveSettings("access", map);
}

/**
 * Resolve an email to the live user, with their capabilities worked out:
 * a per-person override wins, otherwise their crew level decides (via the
 * access map), and only with no level set do we fall back to the role.
 * Owners are always full admins and can never be locked out.
 */
export async function resolveUser(email: string): Promise<PortalUser | null> {
  const e = email.trim().toLowerCase();
  const owner = baseMember(e);
  if (owner) return { email: owner.email, name: owner.name, role: owner.role, caps: {}, active: true };
  if (!dbConfigured()) return null;
  const u = await getUser(e);
  if (!u || !u.active) return null;

  const access = await getAccessMap();
  const levelCaps = u.level ? access[u.level] ?? [] : null;
  const caps: CapMap = {};
  for (const { key } of CAPS) {
    const override = u.caps[key];
    caps[key] = typeof override === "boolean" ? override : levelCaps ? levelCaps.includes(key) : roleDefault(u.role, key);
  }
  return { id: u.id, email: u.email, name: u.name, role: u.role, caps, active: true };
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

/** On the road, in for repair, or retired from the fleet. */
export type VehicleStatus = "on" | "repair" | "off";

/** Whether it came to us new or second hand. */
export type VehicleCondition = "new" | "used";

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
  status: VehicleStatus;
  amountOwing: number | null;
  purchasedOn: string | null;
  condition: VehicleCondition | null;
  serviceCost: number | null;
  kmYear: number | null;
  assignedTo: string | null;
  purchasePrice: number | null;
  resaleValue: number | null;
  lifespanYears: number | null;
  fuelPer100: number | null;
};

type VehicleRow = {
  id: string; name: string; rego: string | null; details: string | null;
  odometer: number | null; service_interval_km: number | null;
  next_service_km: number | null; next_service_date: string | null;
  active: boolean; notes: string | null; status: string | null; amount_owing: number | null;
  purchased_on: string | null; condition: string | null;
  service_cost: number | null; km_year: number | null; assigned_to: string | null;
  purchase_price: number | null; resale_value: number | null; lifespan_years: number | null; fuel_l_per_100: number | null;
};

const n = (v: number | null) => (v == null ? null : Number(v));

/** Rows written before the status column existed only carry the active flag. */
const toStatus = (raw: string | null, active: boolean): VehicleStatus =>
  raw === "on" || raw === "repair" || raw === "off" ? raw : active ? "on" : "off";

const toVehicle = (r: VehicleRow): Vehicle => ({
  id: r.id, name: r.name, rego: r.rego, details: r.details, odometer: r.odometer,
  serviceIntervalKm: r.service_interval_km, nextServiceKm: r.next_service_km,
  nextServiceDate: r.next_service_date, active: r.active, notes: r.notes,
  status: toStatus(r.status, r.active), amountOwing: n(r.amount_owing),
  purchasedOn: r.purchased_on, condition: r.condition === "new" || r.condition === "used" ? r.condition : null,
  serviceCost: n(r.service_cost), kmYear: n(r.km_year), assignedTo: r.assigned_to,
  purchasePrice: n(r.purchase_price), resaleValue: n(r.resale_value), lifespanYears: n(r.lifespan_years), fuelPer100: n(r.fuel_l_per_100),
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
  purchasePrice?: number | null; resaleValue?: number | null; lifespanYears?: number | null; fuelPer100?: number | null;
  amountOwing?: number | null; status?: VehicleStatus;
  purchasedOn?: string | null; condition?: VehicleCondition | null;
  serviceCost?: number | null; kmYear?: number | null; assignedTo?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const status = input.status ?? "on";
  const res = await sb("portal_vehicles", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      name: input.name.trim(), rego: input.rego || null, details: input.details || null,
      odometer: input.odometer ?? null, service_interval_km: input.serviceIntervalKm ?? null,
      next_service_km: input.nextServiceKm ?? null, next_service_date: input.nextServiceDate || null, notes: input.notes || null,
      purchase_price: input.purchasePrice ?? null, resale_value: input.resaleValue ?? null,
      lifespan_years: input.lifespanYears ?? null, fuel_l_per_100: input.fuelPer100 ?? null,
      amount_owing: input.amountOwing ?? null,
      purchased_on: input.purchasedOn || null, condition: input.condition ?? null,
      service_cost: input.serviceCost ?? null, km_year: input.kmYear ?? null,
      assigned_to: input.assignedTo || null,
      // active is kept in step with status so anything still reading the flag
      // treats a vehicle that's in for repair as not working.
      status, active: status === "on",
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function updateVehicle(id: string, patch: {
  name?: string; rego?: string; details?: string; odometer?: number | null;
  serviceIntervalKm?: number | null; nextServiceKm?: number | null; nextServiceDate?: string | null; active?: boolean; notes?: string;
  purchasePrice?: number | null; resaleValue?: number | null; lifespanYears?: number | null; fuelPer100?: number | null;
  amountOwing?: number | null; status?: VehicleStatus;
  purchasedOn?: string | null; condition?: VehicleCondition | null;
  serviceCost?: number | null; kmYear?: number | null; assignedTo?: string | null;
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
  if (patch.purchasePrice !== undefined) body.purchase_price = patch.purchasePrice;
  if (patch.resaleValue !== undefined) body.resale_value = patch.resaleValue;
  if (patch.lifespanYears !== undefined) body.lifespan_years = patch.lifespanYears;
  if (patch.fuelPer100 !== undefined) body.fuel_l_per_100 = patch.fuelPer100;
  if (patch.amountOwing !== undefined) body.amount_owing = patch.amountOwing;
  if (patch.purchasedOn !== undefined) body.purchased_on = patch.purchasedOn || null;
  if (patch.condition !== undefined) body.condition = patch.condition;
  if (patch.serviceCost !== undefined) body.service_cost = patch.serviceCost;
  if (patch.kmYear !== undefined) body.km_year = patch.kmYear;
  if (patch.assignedTo !== undefined) body.assigned_to = patch.assignedTo || null;
  if (patch.status !== undefined) { body.status = patch.status; body.active = patch.status === "on"; }
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

/* ---------------- integrations (OAuth tokens) ---------------- */

export type Integration = {
  provider: string;
  tenantId: string | null;
  tenantName: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  connectedBy: string | null;
};

type IntegrationRow = {
  provider: string; tenant_id: string | null; tenant_name: string | null;
  access_token: string | null; refresh_token: string | null; expires_at: string | null; connected_by: string | null;
};

export async function getIntegration(provider: string): Promise<Integration | null> {
  const res = await sb(`portal_integrations?provider=eq.${encodeURIComponent(provider)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as IntegrationRow[];
  const r = rows[0];
  if (!r) return null;
  return { provider: r.provider, tenantId: r.tenant_id, tenantName: r.tenant_name, accessToken: r.access_token, refreshToken: r.refresh_token, expiresAt: r.expires_at, connectedBy: r.connected_by };
}

export async function saveIntegration(provider: string, data: {
  tenantId?: string | null; tenantName?: string | null;
  accessToken?: string | null; refreshToken?: string | null; expiresAt?: string | null; connectedBy?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = { provider, updated_at: new Date().toISOString() };
  if (data.tenantId !== undefined) body.tenant_id = data.tenantId;
  if (data.tenantName !== undefined) body.tenant_name = data.tenantName;
  if (data.accessToken !== undefined) body.access_token = data.accessToken;
  if (data.refreshToken !== undefined) body.refresh_token = data.refreshToken;
  if (data.expiresAt !== undefined) body.expires_at = data.expiresAt;
  if (data.connectedBy !== undefined) body.connected_by = data.connectedBy;
  // upsert on the provider primary key
  const res = await sb(`portal_integrations?on_conflict=provider`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text().catch(() => "")}` };
  return { ok: true };
}

export async function deleteIntegration(provider: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_integrations?provider=eq.${encodeURIComponent(provider)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}


/* ---------------- van stock & check sheets ---------------- */

export type VanCheck = {
  id: string; vehicleId: string; kind: CheckKind; checkedOn: string;
  checkedBy: string | null; notes: string | null; items: CheckItems; createdAt: string;
};
type VanCheckRow = {
  id: string; vehicle_id: string; kind: CheckKind; checked_on: string;
  checked_by: string | null; notes: string | null; items: CheckItems | null; created_at: string;
};
const toCheck = (r: VanCheckRow): VanCheck => ({
  id: r.id, vehicleId: r.vehicle_id, kind: r.kind, checkedOn: r.checked_on,
  checkedBy: r.checked_by, notes: r.notes, items: r.items ?? {}, createdAt: r.created_at,
});

export type VanPhoto = { id: string; checkId: string; vehicleId: string; path: string; label: string | null; itemKey: string | null; createdAt: string };
type VanPhotoRow = { id: string; check_id: string; vehicle_id: string; path: string; label: string | null; item_key: string | null; created_at: string };
const toPhoto = (r: VanPhotoRow): VanPhoto => ({
  id: r.id, checkId: r.check_id, vehicleId: r.vehicle_id, path: r.path, label: r.label, itemKey: r.item_key, createdAt: r.created_at,
});

export async function listVanChecks(vehicleId: string, kind?: CheckKind, limit = 40): Promise<VanCheck[]> {
  const k = kind ? `&kind=eq.${kind}` : "";
  const res = await sb(`portal_van_checks?vehicle_id=eq.${encodeURIComponent(vehicleId)}${k}&select=*&order=checked_on.desc,created_at.desc&limit=${limit}`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as VanCheckRow[]).map(toCheck);
}

export async function getVanCheck(id: string): Promise<VanCheck | null> {
  const res = await sb(`portal_van_checks?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as VanCheckRow[];
  return rows[0] ? toCheck(rows[0]) : null;
}

/** The most recent sheet of each kind, for the "where this van is at" panel. */
export async function latestVanChecks(vehicleId: string): Promise<Partial<Record<CheckKind, VanCheck>>> {
  const all = await listVanChecks(vehicleId, undefined, 200);
  const out: Partial<Record<CheckKind, VanCheck>> = {};
  for (const c of all) if (!out[c.kind]) out[c.kind] = c;
  return out;
}

export async function createVanCheck(input: {
  vehicleId: string; kind: CheckKind; checkedOn?: string; checkedBy?: string | null;
  notes?: string; items: CheckItems;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await sb("portal_van_checks", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      vehicle_id: input.vehicleId, kind: input.kind,
      checked_on: input.checkedOn || undefined,
      checked_by: input.checkedBy || null, notes: input.notes || null, items: input.items,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  const rows = (await res.json()) as VanCheckRow[];
  return { ok: true, id: rows[0]?.id };
}

/**
 * Merge more items into a check that is still being filled in.
 *
 * The Monday flow walks a tech through four steps, and a tech who takes the
 * photos and then gets called to a job must not lose them — so each step
 * commits as it is finished and the next one merges into the same row.
 *
 * Only ever used to finish the check you are on: the caller restricts it to a
 * row written today by the same person (see the trade portal's Monday
 * actions), which keeps the original rule that a bad morning cannot be quietly
 * edited away later.
 */
export async function updateVanCheck(id: string, patch: { items?: CheckItems; notes?: string | null }): Promise<{ ok: boolean }> {
  const body: Record<string, unknown> = {};
  if (patch.items) body.items = patch.items;
  if (patch.notes !== undefined) body.notes = patch.notes;
  if (Object.keys(body).length === 0) return { ok: true };
  const res = await sb(`portal_van_checks?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body),
  });
  return { ok: !!res && res.ok };
}

export async function deleteVanCheck(id: string): Promise<{ ok: boolean }> {
  const res = await sb(`portal_van_checks?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  return { ok: !!res && res.ok };
}

export async function listVanPhotos(checkId: string): Promise<VanPhoto[]> {
  const res = await sb(`portal_van_photos?check_id=eq.${encodeURIComponent(checkId)}&select=*&order=created_at.asc`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as VanPhotoRow[]).map(toPhoto);
}

export async function listVehiclePhotos(vehicleId: string, limit = 24): Promise<VanPhoto[]> {
  const res = await sb(`portal_van_photos?vehicle_id=eq.${encodeURIComponent(vehicleId)}&select=*&order=created_at.desc&limit=${limit}`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as VanPhotoRow[]).map(toPhoto);
}

export async function createVanPhoto(input: { checkId: string; vehicleId: string; path: string; label?: string | null; itemKey?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_van_photos", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ check_id: input.checkId, vehicle_id: input.vehicleId, path: input.path, label: input.label || null, item_key: input.itemKey || null }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function getVanPhoto(id: string): Promise<VanPhoto | null> {
  const res = await sb(`portal_van_photos?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as VanPhotoRow[];
  return rows[0] ? toPhoto(rows[0]) : null;
}

export async function deleteVanPhotoRow(id: string): Promise<{ ok: boolean }> {
  const res = await sb(`portal_van_photos?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  return { ok: !!res && res.ok };
}


/** The van signed to someone, if they have one. */
export async function vehicleFor(userId: string): Promise<Vehicle | null> {
  const res = await sb(`portal_vehicles?assigned_to=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  if (!res || !res.ok) return null;
  const rows = (await res.json()) as VehicleRow[];
  return rows[0] ? toVehicle(rows[0]) : null;
}

/** Checks this person completed, newest first. */
export async function checksBy(name: string, limit = 8): Promise<VanCheck[]> {
  const res = await sb(`portal_van_checks?checked_by=eq.${encodeURIComponent(name)}&select=*&order=checked_on.desc,created_at.desc&limit=${limit}`);
  if (!res || !res.ok) return [];
  return ((await res.json()) as VanCheckRow[]).map(toCheck);
}


/** How many photos each of these checks has, in one round trip. */
export async function photoCounts(checkIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (checkIds.length === 0) return out;
  const list = checkIds.map((id) => `"${id}"`).join(",");
  const res = await sb(`portal_van_photos?check_id=in.(${encodeURIComponent(list)})&select=check_id`);
  if (!res || !res.ok) return out;
  for (const r of (await res.json()) as { check_id: string }[]) {
    out.set(r.check_id, (out.get(r.check_id) ?? 0) + 1);
  }
  return out;
}


/* ---------------- learning videos ---------------- */

type VideoRow = {
  id: string; track: string; category: string; title: string; description: string | null;
  youtube_id: string | null; minutes: number | null; sop_code: string | null; sort_order: number | null;
  created_at: string | null;
};

export async function listVideos(): Promise<StoredVideo[]> {
  const res = await sb("portal_videos?select=*&order=sort_order.asc.nullslast,created_at.asc");
  if (!res || !res.ok) return [];
  return ((await res.json()) as VideoRow[]).map((r) => ({
    id: r.id, track: r.track as StoredVideo["track"], category: r.category, title: r.title,
    description: r.description, youtubeId: r.youtube_id,
    minutes: r.minutes == null ? null : Number(r.minutes),
    sopCode: r.sop_code, watched: false, addedAt: r.created_at,
  }));
}

/** Which of these this person has watched. */
export async function watchedVideos(email: string): Promise<Set<string>> {
  const res = await sb(`portal_video_watches?select=video_id&user_email=eq.${encodeURIComponent(email)}`);
  if (!res || !res.ok) return new Set();
  return new Set(((await res.json()) as { video_id: string }[]).map((r) => r.video_id));
}

export async function markWatched(videoId: string, email: string): Promise<{ ok: boolean }> {
  // Watching twice is still watched, so a repeat is a no-op rather than an error.
  const res = await sb("portal_video_watches?on_conflict=video_id,user_email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ video_id: videoId, user_email: email, watched_at: new Date().toISOString() }),
  });
  return { ok: !!res && res.ok };
}

export async function unmarkWatched(videoId: string, email: string): Promise<{ ok: boolean }> {
  const res = await sb(
    `portal_video_watches?video_id=eq.${encodeURIComponent(videoId)}&user_email=eq.${encodeURIComponent(email)}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
  return { ok: !!res && res.ok };
}

export async function createVideo(input: {
  track: string; category: string; title: string; description: string;
  youtubeId: string; minutes: number | null; sopCode: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_videos", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      track: input.track, category: input.category, title: input.title,
      description: input.description || null, youtube_id: input.youtubeId || null,
      minutes: input.minutes, sop_code: input.sopCode || null,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/* ---------------- handbook topic bodies ---------------- */

export type HandbookBody = { shelf: string; title: string; body: string; updatedBy: string | null; updatedAt: string };
type HandbookRow = { shelf: string; title: string; body: string; updated_by: string | null; updated_at: string };

/** Every written body, keyed `shelf|title` — one read for a whole shelf. */
export async function handbookBodies(): Promise<Map<string, HandbookBody>> {
  const out = new Map<string, HandbookBody>();
  const res = await sb("portal_handbook_topics?select=shelf,title,body,updated_by,updated_at");
  if (!res || !res.ok) return out;
  for (const r of (await res.json()) as HandbookRow[]) {
    out.set(`${r.shelf}|${r.title}`, {
      shelf: r.shelf, title: r.title, body: r.body,
      updatedBy: r.updated_by, updatedAt: r.updated_at,
    });
  }
  return out;
}

/** Write a topic's body. Upsert on (shelf, title), which is the unique key. */
export async function saveHandbookBody(input: {
  shelf: string; title: string; body: string; updatedBy: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_handbook_topics?on_conflict=shelf,title", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      shelf: input.shelf, title: input.title, body: input.body,
      updated_by: input.updatedBy, updated_at: new Date().toISOString(),
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/* ---------------- marketing campaigns ---------------- */

type CampaignDbRow = {
  id: string; name: string; blurb: string | null; channel: string | null;
  audience: string; status: string; monthly_spend: number | null;
  owner: string | null; utm_campaign: string | null; sort_order: number | null;
};

const toCampaign = (r: CampaignDbRow): Campaign => ({
  id: r.id, name: r.name, blurb: r.blurb, channel: r.channel,
  audience: r.audience as Campaign["audience"],
  status: r.status as Campaign["status"],
  monthlySpend: r.monthly_spend == null ? null : Number(r.monthly_spend),
  owner: r.owner, utmCampaign: r.utm_campaign,
  sortOrder: r.sort_order == null ? null : Number(r.sort_order),
});

export async function listCampaigns(): Promise<Campaign[]> {
  // Live ones first, then by the order the office set, then newest.
  const res = await sb("portal_campaigns?select=*&order=sort_order.asc.nullslast,created_at.desc");
  if (!res || !res.ok) return [];
  return ((await res.json()) as CampaignDbRow[]).map(toCampaign);
}

export async function createCampaign(input: {
  name: string; blurb: string; channel: string; audience: string; status: string;
  monthlySpend: number | null; owner: string; utmCampaign: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_campaigns", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      name: input.name, blurb: input.blurb || null, channel: input.channel || null,
      audience: input.audience, status: input.status,
      monthly_spend: input.monthlySpend, owner: input.owner || null,
      utm_campaign: input.utmCampaign || null,
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function updateCampaign(id: string, patch: Record<string, unknown>): Promise<{ ok: boolean }> {
  const res = await sb(`portal_campaigns?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return { ok: !!res && res.ok };
}

export async function deleteCampaign(id: string): Promise<{ ok: boolean }> {
  const res = await sb(`portal_campaigns?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  return { ok: !!res && res.ok };
}

/* ---------------- brand assets ---------------- */

export type BrandAsset = {
  id: string; label: string; kind: "logo" | "photo" | "document" | "other";
  path: string; mime: string | null; bytes: number | null; addedBy: string | null; createdAt: string;
};
type BrandAssetRow = {
  id: string; label: string; kind: string; path: string;
  mime: string | null; bytes: number | null; added_by: string | null; created_at: string;
};

export async function listBrandAssets(): Promise<BrandAsset[]> {
  const res = await sb("portal_brand_assets?select=*&order=created_at.desc");
  if (!res || !res.ok) return [];
  return ((await res.json()) as BrandAssetRow[]).map((r) => ({
    id: r.id, label: r.label, kind: r.kind as BrandAsset["kind"], path: r.path,
    mime: r.mime, bytes: r.bytes == null ? null : Number(r.bytes),
    addedBy: r.added_by, createdAt: r.created_at,
  }));
}

export async function createBrandAsset(input: {
  label: string; kind: string; path: string; mime: string | null; bytes: number | null; addedBy: string;
}): Promise<{ ok: boolean }> {
  const res = await sb("portal_brand_assets", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      label: input.label, kind: input.kind, path: input.path,
      mime: input.mime, bytes: input.bytes, added_by: input.addedBy || null,
    }),
  });
  return { ok: !!res && res.ok };
}

export async function deleteBrandAsset(id: string): Promise<{ ok: boolean }> {
  const res = await sb(`portal_brand_assets?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  return { ok: !!res && res.ok };
}

/* ---------------- website leads ---------------- */

export type WebLead = {
  id: string; kind: "quote" | "call"; service: string | null;
  pagePath: string | null; postcode: string | null; suburb: string | null;
  source: string | null; utm: Record<string, string>; createdAt: string;
};
type WebLeadRow = {
  id: string; kind: string; service: string | null; page_path: string | null;
  postcode: string | null; suburb: string | null; source: string | null;
  utm: Record<string, string> | null; created_at: string;
};

/** Enquiries since a date, newest first. Nothing personal comes back. */
export async function listWebLeads(since: string, limit = 2000): Promise<WebLead[]> {
  const res = await sb(
    `portal_leads?created_at=gte.${encodeURIComponent(since)}` +
    `&select=id,kind,service,page_path,postcode,suburb,source,utm,created_at` +
    `&order=created_at.desc&limit=${limit}`,
  );
  if (!res || !res.ok) return [];
  return ((await res.json()) as WebLeadRow[]).map((r) => ({
    id: r.id, kind: r.kind === "call" ? "call" : "quote", service: r.service,
    pagePath: r.page_path, postcode: r.postcode, suburb: r.suburb, source: r.source,
    utm: r.utm ?? {}, createdAt: r.created_at,
  }));
}

/* --------------------------------------------- Procedures the office writes */

type SopRow = {
  id: string; section: string; code: string; slug: string; title: string;
  happens: string | null; flag: string | null; audience: string;
  steps: { do?: string; note?: string }[] | null; changed: string | null;
  status: string; updated_by: string | null; updated_at: string;
};

const toStoredSop = (r: SopRow): StoredSop => ({
  id: r.id, section: r.section, code: r.code, slug: r.slug, title: r.title,
  happens: r.happens, flag: r.flag, audience: r.audience,
  // A step written before a field existed, or hand-inserted, still has to
  // render rather than throw on the reader.
  steps: (r.steps ?? []).map((s) => ({ do: s.do ?? "", note: s.note ?? "" })),
  changed: r.changed,
  status: r.status === "published" ? "published" : "draft",
  updatedBy: r.updated_by, updatedAt: r.updated_at,
});

export async function listStoredSops(): Promise<StoredSop[]> {
  const res = await sb("portal_sops?select=*&order=section.asc,code.asc");
  if (!res || !res.ok) return [];
  return ((await res.json()) as SopRow[]).map(toStoredSop);
}

export async function saveStoredSop(input: {
  id?: string | null;
  section: string; code: string; slug: string; title: string;
  happens: string | null; flag: string | null; audience: string;
  steps: { do: string; note: string }[]; changed: string | null;
  status: "draft" | "published"; updatedBy: string;
}): Promise<{ ok: boolean; error?: string }> {
  const body = {
    section: input.section, code: input.code, slug: input.slug, title: input.title,
    happens: input.happens, flag: input.flag, audience: input.audience,
    steps: input.steps, changed: input.changed, status: input.status,
    updated_by: input.updatedBy, updated_at: new Date().toISOString(),
  };
  // Upsert on the code, which is how a procedure is referred to everywhere
  // else, so saving the same code twice edits it rather than duplicating it.
  const res = await sb("portal_sops?on_conflict=code", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deleteStoredSop(code: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_sops?code=eq.${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

/* ------------------------------------------------- Blog posts, written here */

type PostRow = {
  id: string; slug: string; title: string; seo_title: string | null; blurb: string;
  cat: string; author: string; photo: string | null; photo_alt: string; body: string;
  featured: boolean; on_home: boolean; published_on: string | null; updated_on: string | null;
  status: string; updated_by: string | null; updated_at: string;
};

const toStoredPost = (r: PostRow): StoredPost => ({
  id: r.id, slug: r.slug, title: r.title, seoTitle: r.seo_title, blurb: r.blurb,
  cat: r.cat, author: r.author, photo: r.photo, photoAlt: r.photo_alt, body: r.body,
  featured: r.featured, onHome: r.on_home,
  publishedOn: r.published_on, updatedOn: r.updated_on,
  status: r.status === "published" ? "published" : "draft",
  updatedBy: r.updated_by, updatedAt: r.updated_at,
});

/** The tag the public blog's read is cached under, revalidated on publish. */
export const BLOG_TAG = "blog-posts";

export async function listStoredPosts(): Promise<StoredPost[]> {
  // Tagged rather than no-store: /blog and /blog/[slug] are prerendered and
  // a no-store read inside them turns the page dynamic and 500s it.
  const res = await sb("portal_posts?select=*&order=published_on.desc.nullslast,updated_at.desc", { cached: BLOG_TAG });
  if (!res || !res.ok) return [];
  return ((await res.json()) as PostRow[]).map(toStoredPost);
}

export async function saveStoredPost(input: {
  slug: string; title: string; seoTitle: string | null; blurb: string; cat: string;
  author: string; photo: string | null; photoAlt: string; body: string;
  featured: boolean; onHome: boolean; publishedOn: string | null; updatedOn: string | null;
  status: "draft" | "published"; updatedBy: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await sb("portal_posts?on_conflict=slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      slug: input.slug, title: input.title, seo_title: input.seoTitle, blurb: input.blurb,
      cat: input.cat, author: input.author, photo: input.photo, photo_alt: input.photoAlt,
      body: input.body, featured: input.featured, on_home: input.onHome,
      published_on: input.publishedOn, updated_on: input.updatedOn,
      status: input.status, updated_by: input.updatedBy, updated_at: new Date().toISOString(),
    }),
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deleteStoredPost(slug: string): Promise<{ ok: boolean; error?: string }> {
  const res = await sb(`portal_posts?slug=eq.${encodeURIComponent(slug)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res) return { ok: false, error: "not-configured" };
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}
