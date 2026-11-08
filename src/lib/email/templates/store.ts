import "server-only";
import { randomBytes } from "node:crypto";
import { dashboardDbConfigured, q, sbDelete, sbInsert, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { BUILT_IN, builtIn, KEY, starter } from "./defaults";
import { problems, templateFrom, type EmailTemplate, type QuoteKind } from "./types";

/**
 * The customer emails as the office has left them: the standard wording
 * (defaults.ts) with each edited one read from portal_email_templates, and
 * the emails added to a series. Every change keeps the version before it in
 * portal_email_template_versions, so the page can put one back.
 *
 * A database that can't be read never stops an email: the senders get the
 * standard wording (liveTemplate), and the page says it couldn't load.
 */

const TABLE = "portal_email_templates";
const VERSIONS = "portal_email_template_versions";
const PHOTOS = "portal_email_photos";
const KEEP_VERSIONS = 25;

type Row = {
  key: string; grp: string; name: string; series: string | null; day: number | null; active: boolean;
  subject: string; preheader: string; blocks: unknown; signer: string; built_in: boolean;
  updated_by: string | null; updated_at: string | null;
};

export type StoredTemplate = EmailTemplate & { editedBy: string | null; editedAt: string | null };

const isKind = (v: unknown): v is QuoteKind => v === "heat-pump" || v === "split" || v === "general";

function baseFor(key: string, series: unknown, day: unknown): EmailTemplate | null {
  const b = builtIn(key);
  if (b) return b;
  const m = /^followup\.([a-z-]+)\.x[0-9a-f]{6}$/.exec(key);
  return m && KEY.test(key) && isKind(m[1]) && m[1] === series ? starter(m[1], key, Number(day) || 2) : null;
}

function fromRow(r: Row): StoredTemplate | null {
  const base = baseFor(r.key, r.series, r.day);
  if (!base) return null;
  const t = templateFrom({ name: r.name, subject: r.subject, preheader: r.preheader, blocks: r.blocks, signer: r.signer, day: r.day, active: r.active }, base);
  return { ...t, editedBy: r.updated_by, editedAt: r.updated_at };
}

const plain = (t: EmailTemplate): StoredTemplate => ({ ...t, editedBy: null, editedAt: null });

/** Every email, standard ones first in their series order, then the ones added. `ok` false when the saved ones couldn't be read. */
export async function loadTemplates(): Promise<{ templates: StoredTemplate[]; ok: boolean }> {
  const rows = dashboardDbConfigured() ? await sbSelect<Row>(TABLE, "select=*&order=created_at.asc").catch(() => null) : null;
  const byKey = new Map((rows ?? []).map((r) => [r.key, r]));
  const out = BUILT_IN.map((b) => {
    const r = byKey.get(b.key);
    return (r && fromRow(r)) || plain(b);
  });
  for (const r of rows ?? []) if (!builtIn(r.key)) { const t = fromRow(r); if (t) out.push(t); }
  return { templates: out, ok: rows !== null };
}

export async function loadTemplate(key: string): Promise<StoredTemplate | null> {
  if (!KEY.test(key)) return null;
  const rows = dashboardDbConfigured() ? await sbSelect<Row>(TABLE, `select=*&${q.eq("key", key)}`).catch(() => null) : null;
  const r = rows?.[0];
  if (r) return fromRow(r);
  const b = builtIn(key);
  return b ? plain(b) : null;
}

/** For a sender: the email as edited, else the standard wording, whatever the database is doing. */
export async function liveTemplate(key: string): Promise<EmailTemplate | null> {
  return (await loadTemplate(key).catch(() => null)) ?? builtIn(key);
}

/** A series' emails that are switched on, in the order they go. */
export async function liveSeries(kind: QuoteKind): Promise<StoredTemplate[]> {
  const { templates } = await loadTemplates();
  return templates.filter((t) => t.series === kind && t.active).sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
}

/* ---------------------------------------------------------------- writing */

export type WriteResult = { ok: true; key?: string } | { ok: false; error: string };

const snapshotOf = (t: EmailTemplate) => ({ name: t.name, subject: t.subject, preheader: t.preheader, blocks: t.blocks, signer: t.signer, day: t.day, active: t.active, series: t.series });

async function keepVersion(t: EmailTemplate, by: string): Promise<void> {
  await sbInsert(VERSIONS, { key: t.key, saved: snapshotOf(t), saved_by: by });
  const old = await sbSelect<{ id: string }>(VERSIONS, [q.select("id"), q.eq("key", t.key), "order=saved_at.desc", `offset=${KEEP_VERSIONS}`, "limit=100"].join("&")).catch(() => []);
  if (old.length) await sbDelete(VERSIONS, `id=in.(${old.map((o) => o.id).join(",")})`).catch(() => undefined);
}

async function write(t: EmailTemplate, by: string): Promise<void> {
  await sbUpsert(TABLE, [{
    key: t.key, grp: t.group, name: t.name, series: t.series, day: t.day, active: t.active,
    subject: t.subject, preheader: t.preheader, blocks: t.blocks, signer: t.signer, built_in: t.builtIn,
    updated_by: by, updated_at: new Date().toISOString(),
  }], "key");
}

/** Save what the page sent, after checking it. The version it replaces is kept. */
export async function saveTemplate(key: string, raw: unknown, by: string): Promise<WriteResult> {
  if (!dashboardDbConfigured()) return { ok: false, error: "The database isn't connected." };
  const current = await loadTemplate(key);
  if (!current) return { ok: false, error: "That email couldn't be found." };
  const t = templateFrom(raw, current);
  const { templates } = await loadTemplates();
  const bad = problems(t, templates);
  if (bad.length) return { ok: false, error: bad.join(" ") };
  try {
    await keepVersion(current, by);
    await write(t, by);
    return { ok: true, key };
  } catch {
    return { ok: false, error: "Couldn't save it. Try again." };
  }
}

/** A standard email back to the standard wording. The edited version is kept. */
export async function resetTemplate(key: string, by: string): Promise<WriteResult> {
  const current = await loadTemplate(key);
  if (!current?.builtIn) return { ok: false, error: "Only a standard email has standard wording to go back to." };
  try {
    if (current.editedAt) await keepVersion(current, by);
    await sbDelete(TABLE, q.eq("key", key));
    return { ok: true, key };
  } catch {
    return { ok: false, error: "Couldn't put it back. Try again." };
  }
}

/**
 * A new email at the end of a series, three days after the last one. Off
 * until it's written and switched on, so a half-written email can't go.
 */
export async function addToSeries(kind: QuoteKind, by: string): Promise<WriteResult> {
  if (!dashboardDbConfigured()) return { ok: false, error: "The database isn't connected." };
  const { templates } = await loadTemplates();
  const days = new Set(templates.filter((t) => t.series === kind).map((t) => t.day ?? 0));
  let day = Math.min(60, Math.max(0, ...days) + 3);
  while (days.has(day) && day < 60) day++;
  const key = `followup.${kind}.x${randomBytes(3).toString("hex")}`;
  const t = { ...starter(kind, key, day), active: false };
  try {
    await write(t, by);
    return { ok: true, key };
  } catch {
    return { ok: false, error: "Couldn't add it. Try again." };
  }
}

/** An email added on the page, gone. The standard ones can be switched off, not deleted. */
export async function deleteTemplate(key: string, by: string): Promise<WriteResult> {
  const current = await loadTemplate(key);
  if (!current || current.builtIn) return { ok: false, error: "A standard email can be switched off, not deleted." };
  try {
    await keepVersion(current, by);
    await sbDelete(TABLE, q.eq("key", key));
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't delete it. Try again." };
  }
}

export type Version = { id: string; savedBy: string | null; savedAt: string; subject: string };

export async function listVersions(key: string): Promise<Version[]> {
  if (!KEY.test(key) || !dashboardDbConfigured()) return [];
  const rows = await sbSelect<{ id: string; saved_by: string | null; saved_at: string; saved: { subject?: string } }>(VERSIONS, [q.select("id,saved_by,saved_at,saved"), q.eq("key", key), "order=saved_at.desc", `limit=${KEEP_VERSIONS}`].join("&")).catch(() => []);
  return rows.map((r) => ({ id: r.id, savedBy: r.saved_by, savedAt: r.saved_at, subject: typeof r.saved?.subject === "string" ? r.saved.subject : "" }));
}

/** An earlier version back, saved as the current one (so the one it replaces is kept too). */
export async function restoreVersion(key: string, id: string, by: string): Promise<WriteResult> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "That version couldn't be found." };
  const v = (await sbSelect<{ saved: unknown }>(VERSIONS, [q.select("saved"), q.eq("id", id), q.eq("key", key)].join("&")).catch(() => []))[0];
  if (!v) return { ok: false, error: "That version couldn't be found." };
  return saveTemplate(key, v.saved, by);
}

/* ----------------------------------------------------------------- photos */

export type UploadedPhoto = { src: string; label: string };
export const EMAIL_IMAGES_BUCKET = "email-images";

export async function listEmailPhotos(): Promise<UploadedPhoto[]> {
  if (!dashboardDbConfigured()) return [];
  const rows = await sbSelect<{ path: string; label: string }>(PHOTOS, "select=path,label&order=created_at.desc&limit=200").catch(() => []);
  return rows.map((r) => ({ src: `/api/email-image/${r.path}`, label: r.label }));
}

export async function addEmailPhoto(path: string, label: string, by: string): Promise<void> {
  await sbInsert(PHOTOS, { path, label: label.slice(0, 80), created_by: by });
}
