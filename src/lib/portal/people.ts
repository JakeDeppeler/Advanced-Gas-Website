import "server-only";
import { q, sbInsert, sbSelect, sbUpdate, sbUpsert } from "@/lib/dashboard/db";
import { dbConfigured } from "@/lib/portal/db";
import type { LeaveKind, LeaveRequest, Take5, TimesheetDays, Timesheet } from "@/lib/portal/peopleParts";

/**
 * Time off, timesheets and Take 5s — what a tech sends the office from the
 * trade portal (migration 0039). Each one has an office end: leave and
 * incidents land on Home until somebody answers them, and submitted
 * timesheets are the paid hours on the Hours page.
 */

/* ---------------------------------------------------------------- leave */

type LeaveRow = {
  id: string; user_id: string | null; user_name: string | null; kind: LeaveKind; from_date: string; to_date: string;
  note: string | null; status: LeaveRequest["status"]; answered_by: string | null; answered_at: string | null; created_at: string;
};

const toLeave = (r: LeaveRow): LeaveRequest => ({
  id: r.id, userId: r.user_id, userName: r.user_name, kind: r.kind, from: r.from_date, to: r.to_date,
  note: r.note, status: r.status, answeredBy: r.answered_by, createdAt: r.created_at,
});

export async function listLeave(opts: { userId?: string; status?: LeaveRequest["status"]; limit?: number } = {}): Promise<LeaveRequest[]> {
  if (!dbConfigured()) return [];
  const rows = await sbSelect<LeaveRow>("portal_leave", [
    "select=*", opts.userId ? q.eq("user_id", opts.userId) : "", opts.status ? q.eq("status", opts.status) : "",
    "order=from_date.desc", `limit=${opts.limit ?? 20}`,
  ].filter(Boolean).join("&")).catch(() => []);
  return rows.map(toLeave);
}

export async function askLeave(input: { userId: string; userName: string; kind: LeaveKind; from: string; to: string; note: string | null }): Promise<void> {
  await sbInsert("portal_leave", {
    user_id: input.userId, user_name: input.userName, kind: input.kind,
    from_date: input.from, to_date: input.to, note: input.note,
  });
}

export async function answerLeave(id: string, status: "approved" | "declined", by: string): Promise<void> {
  await sbUpdate("portal_leave", q.eq("id", id), { status, answered_by: by, answered_at: new Date().toISOString() });
}

/* ---------------------------------------------------------------- timesheets */

type SheetRow = { id: string; user_id: string; user_name: string | null; week_of: string; days: TimesheetDays | null; submitted_at: string | null };

const toSheet = (r: SheetRow): Timesheet => ({
  id: r.id, userId: r.user_id, userName: r.user_name, weekOf: r.week_of, days: r.days ?? {}, submittedAt: r.submitted_at,
});

export async function getTimesheet(userId: string, weekOf: string): Promise<Timesheet | null> {
  if (!dbConfigured()) return null;
  const rows = await sbSelect<SheetRow>("portal_timesheets", ["select=*", q.eq("user_id", userId), q.eq("week_of", weekOf), "limit=1"].join("&")).catch(() => []);
  return rows[0] ? toSheet(rows[0]) : null;
}

/** Sent timesheets from a week on, everyone's. */
export async function submittedSheets(fromWeek: string): Promise<Timesheet[]> {
  if (!dbConfigured()) return [];
  const rows = await sbSelect<SheetRow>("portal_timesheets", ["select=*", q.gte("week_of", fromWeek), q.notNull("submitted_at"), "order=week_of.desc"].join("&")).catch(() => []);
  return rows.map(toSheet);
}

export async function saveTimesheet(input: { userId: string; userName: string; weekOf: string; days: TimesheetDays; submit: boolean }): Promise<void> {
  await sbUpsert("portal_timesheets", [{
    user_id: input.userId, user_name: input.userName, week_of: input.weekOf, days: input.days,
    updated_at: new Date().toISOString(), ...(input.submit ? { submitted_at: new Date().toISOString() } : {}),
  }], "user_id,week_of");
}

/* ---------------------------------------------------------------- take 5 */

type Take5Row = {
  id: string; kind: "take5" | "incident"; user_id: string | null; user_name: string | null; job: string | null;
  hazards: string[] | null; controls: string | null; safe: boolean | null; detail: string | null;
  seen_at: string | null; seen_by: string | null; created_at: string;
};

const toTake5 = (r: Take5Row): Take5 => ({
  id: r.id, kind: r.kind, userName: r.user_name, job: r.job, hazards: Array.isArray(r.hazards) ? r.hazards : [],
  controls: r.controls, safe: r.safe, detail: r.detail, seenAt: r.seen_at, seenBy: r.seen_by, createdAt: r.created_at,
});

export async function saveTake5(input: {
  kind: "take5" | "incident"; userId: string | null; userName: string; job: string | null;
  hazards: string[]; controls: string | null; safe: boolean | null; detail: string | null;
}): Promise<void> {
  await sbInsert("portal_take5", {
    kind: input.kind, user_id: input.userId, user_name: input.userName, job: input.job,
    hazards: input.hazards, controls: input.controls, safe: input.safe, detail: input.detail,
  });
}

export async function listTake5(opts: { userId?: string; kind?: "take5" | "incident"; unseen?: boolean; limit?: number } = {}): Promise<Take5[]> {
  if (!dbConfigured()) return [];
  const rows = await sbSelect<Take5Row>("portal_take5", [
    "select=*", opts.userId ? q.eq("user_id", opts.userId) : "", opts.kind ? q.eq("kind", opts.kind) : "",
    opts.unseen ? q.isNull("seen_at") : "", "order=created_at.desc", `limit=${opts.limit ?? 30}`,
  ].filter(Boolean).join("&")).catch(() => []);
  return rows.map(toTake5);
}

export async function markTake5Seen(id: string, by: string): Promise<void> {
  await sbUpdate("portal_take5", q.eq("id", id), { seen_at: new Date().toISOString(), seen_by: by });
}
