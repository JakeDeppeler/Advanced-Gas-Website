import "server-only";
import { q, sbDelete, sbInsert, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { dbConfigured } from "@/lib/portal/db";
import type {
  PartLine, PartOrder, PartStatus, ReportKind, ReportStatus, ToolKind, ToolRequest, VanReport, VanTool,
} from "@/lib/portal/vanParts";

/**
 * The van's reports, parts orders and tool register (migration 0039).
 *
 * Reports are the van log's service and damage rows, now carrying an answer;
 * nothing new is kept for them, so the office's existing damage and service
 * history and a tech's new report are one list, not two.
 */

/* ---------------------------------------------------------------- reports */

type LogRow = {
  id: string; vehicle_id: string; kind: string; log_date: string; detail: string | null;
  status: string | null; status_note: string | null; title: string | null; area: string | null;
  drivable: boolean | null; third_party: boolean | null; source: string | null;
  created_by: string | null; created_at: string;
};

const LOG_COLS = "id,vehicle_id,kind,log_date,detail,status,status_note,title,area,drivable,third_party,source,created_by,created_at";

/** Older rows have no title: the first clause of what was written stands in. */
const titleOf = (r: LogRow) =>
  r.title || (r.detail ?? "").replace(/^(Damage|Service)\s*[—·-]\s*/i, "").split(/ — |\. /)[0].slice(0, 80) || (r.kind === "damage" ? "Damage" : "Service");

const toReport = (r: LogRow): VanReport => ({
  id: r.id, vehicleId: r.vehicle_id, kind: r.kind as ReportKind, on: r.log_date,
  title: titleOf(r), detail: r.detail, status: (r.status as ReportStatus) ?? null, statusNote: r.status_note,
  area: r.area, drivable: r.drivable, thirdParty: r.third_party, source: r.source,
  createdBy: r.created_by, createdAt: r.created_at,
});

export async function listReports(vehicleId: string, limit = 40): Promise<VanReport[]> {
  if (!dbConfigured()) return [];
  const rows = await sbSelect<LogRow>("portal_vehicle_logs", [
    q.select(LOG_COLS), q.eq("vehicle_id", vehicleId), "kind=in.(service,damage)",
    "order=log_date.desc,created_at.desc", `limit=${limit}`,
  ].join("&")).catch(() => []);
  return rows.map(toReport);
}

/** Every report still waiting on somebody, across the fleet. */
export async function openReports(): Promise<VanReport[]> {
  if (!dbConfigured()) return [];
  const rows = await sbSelect<LogRow>("portal_vehicle_logs", [
    q.select(LOG_COLS), "kind=in.(service,damage)", "status=in.(open,booked,quote)", "order=created_at.desc",
  ].join("&")).catch(() => []);
  return rows.map(toReport);
}

export async function createReport(input: {
  vehicleId: string; kind: ReportKind; on: string; title: string; detail: string;
  area?: string | null; drivable?: boolean | null; thirdParty?: boolean | null; source?: string | null; createdBy: string;
}): Promise<string> {
  // The id is made here so the report's photos can be written against it
  // straight after, without a second read to find the row just inserted.
  const id = crypto.randomUUID();
  await sbInsert("portal_vehicle_logs", {
    id, vehicle_id: input.vehicleId, kind: input.kind, log_date: input.on,
    title: input.title.slice(0, 120), detail: input.detail || null, status: "open",
    area: input.area || null, drivable: input.drivable ?? null, third_party: input.thirdParty ?? null,
    source: input.source || null, created_by: input.createdBy,
  });
  return id;
}

export async function setReportStatus(id: string, status: Exclude<ReportStatus, null>, note: string | null): Promise<void> {
  await sbUpdate("portal_vehicle_logs", q.eq("id", id), { status, status_note: note || null });
}

export async function addReportPhoto(input: { logId: string; vehicleId: string; path: string; label: string | null }): Promise<void> {
  await sbInsert("portal_van_photos", { log_id: input.logId, vehicle_id: input.vehicleId, path: input.path, label: input.label });
}

/** Photos on these reports, keyed by report. One round trip for the lot. */
export async function reportPhotos(logIds: string[]): Promise<Map<string, { id: string; path: string; label: string | null }[]>> {
  const out = new Map<string, { id: string; path: string; label: string | null }[]>();
  if (!logIds.length || !dbConfigured()) return out;
  const rows = await sbSelect<{ id: string; log_id: string; path: string; label: string | null }>(
    "portal_van_photos",
    [q.select("id,log_id,path,label"), `log_id=in.(${logIds.join(",")})`, "order=created_at.asc"].join("&"),
  ).catch(() => []);
  for (const r of rows) out.set(r.log_id, [...(out.get(r.log_id) ?? []), { id: r.id, path: r.path, label: r.label }]);
  return out;
}

/* ---------------------------------------------------------------- parts */

type OrderRow = {
  id: string; vehicle_id: string | null; requested_by: string | null; for_what: "van" | "job"; job: string | null;
  lines: PartLine[] | null; deliver: "factory" | "pickup"; needed_by: "today" | "tomorrow" | "week";
  note: string | null; status: PartStatus; status_note: string | null; created_at: string;
};

const toOrder = (r: OrderRow): PartOrder => ({
  id: r.id, vehicleId: r.vehicle_id, requestedBy: r.requested_by, forWhat: r.for_what, job: r.job,
  lines: Array.isArray(r.lines) ? r.lines : [], deliver: r.deliver, neededBy: r.needed_by, note: r.note,
  status: r.status, statusNote: r.status_note, createdAt: r.created_at,
});

export async function listOrders(opts: { vehicleId?: string; open?: boolean; limit?: number } = {}): Promise<PartOrder[]> {
  if (!dbConfigured()) return [];
  const rows = await sbSelect<OrderRow>("portal_part_orders", [
    "select=*",
    opts.vehicleId ? q.eq("vehicle_id", opts.vehicleId) : "",
    opts.open ? "status=in.(requested,ordered,ready)" : "",
    "order=created_at.desc", `limit=${opts.limit ?? 30}`,
  ].filter(Boolean).join("&")).catch(() => []);
  return rows.map(toOrder);
}

export async function createOrder(input: {
  vehicleId: string | null; requestedBy: string; requestedById: string | null; forWhat: "van" | "job"; job: string | null;
  lines: PartLine[]; deliver: "factory" | "pickup"; neededBy: "today" | "tomorrow" | "week"; note: string | null;
}): Promise<void> {
  await sbInsert("portal_part_orders", {
    vehicle_id: input.vehicleId, requested_by: input.requestedBy, requested_by_id: input.requestedById,
    for_what: input.forWhat, job: input.job, lines: input.lines, deliver: input.deliver,
    needed_by: input.neededBy, note: input.note,
  });
}

export async function setOrderStatus(id: string, status: PartStatus, note: string | null): Promise<void> {
  await sbUpdate("portal_part_orders", q.eq("id", id), { status, status_note: note || null, updated_at: new Date().toISOString() });
}

/* ---------------------------------------------------------------- tools */

type ToolRow = {
  id: string; vehicle_id: string; name: string; model: string | null; kind: ToolKind;
  bought_on: string | null; life_years: number | string | null; last_done_on: string | null; last_done: string | null;
  next_due_on: string | null; next_due: string | null; request: ToolRequest | null; request_note: string | null;
  requested_at: string | null; requested_by: string | null; reply: string | null;
};

const toTool = (r: ToolRow): VanTool => ({
  id: r.id, vehicleId: r.vehicle_id, name: r.name, model: r.model, kind: r.kind,
  boughtOn: r.bought_on, lifeYears: r.life_years == null ? null : Number(r.life_years),
  lastDoneOn: r.last_done_on, lastDone: r.last_done, nextDueOn: r.next_due_on, nextDue: r.next_due,
  request: r.request, requestNote: r.request_note, requestedAt: r.requested_at, requestedBy: r.requested_by, reply: r.reply,
});

/** Null when the register can't be read, so a page says so rather than "no tools". */
export async function listTools(vehicleId: string): Promise<VanTool[] | null> {
  if (!dbConfigured()) return null;
  try {
    const rows = await sbSelect<ToolRow>("portal_van_tools", ["select=*", q.eq("vehicle_id", vehicleId), "order=sort_order.asc.nullslast,name.asc"].join("&"));
    return rows.map(toTool);
  } catch {
    return null;
  }
}

/** Tools across the fleet that somebody has asked about and the office hasn't closed. */
export async function toolRequests(): Promise<VanTool[]> {
  if (!dbConfigured()) return [];
  const rows = await sbSelect<ToolRow>("portal_van_tools", ["select=*", q.notNull("request"), "order=requested_at.desc"].join("&")).catch(() => []);
  return rows.map(toTool);
}

export type ToolInput = {
  name: string; model: string | null; kind: ToolKind; boughtOn: string | null; lifeYears: number | null;
  lastDoneOn: string | null; lastDone: string | null; nextDueOn: string | null; nextDue: string | null;
};

const toolCols = (t: ToolInput) => ({
  name: t.name, model: t.model, kind: t.kind, bought_on: t.boughtOn, life_years: t.lifeYears,
  last_done_on: t.lastDoneOn, last_done: t.lastDone, next_due_on: t.nextDueOn, next_due: t.nextDue,
});

export async function addTool(vehicleId: string, t: ToolInput): Promise<void> {
  await sbInsert("portal_van_tools", { vehicle_id: vehicleId, ...toolCols(t) });
}

export async function updateTool(id: string, t: ToolInput): Promise<void> {
  await sbUpdate("portal_van_tools", q.eq("id", id), { ...toolCols(t), updated_at: new Date().toISOString() });
}

export async function deleteTool(id: string): Promise<void> {
  await sbDelete("portal_van_tools", q.eq("id", id));
}

export async function getTool(id: string): Promise<VanTool | null> {
  const rows = await sbSelect<ToolRow>("portal_van_tools", ["select=*", q.eq("id", id), "limit=1"].join("&")).catch(() => []);
  return rows[0] ? toTool(rows[0]) : null;
}

/** The tech asks for something to be done. A fresh ask clears the last answer. */
export async function requestTool(id: string, request: ToolRequest, note: string | null, by: string): Promise<void> {
  await sbUpdate("portal_van_tools", q.eq("id", id), {
    request, request_note: note, requested_at: new Date().toISOString(), requested_by: by, reply: null, replied_at: null,
  });
}

/** The office answers. `done` closes the ask and, for a service, stamps it as the last one done. */
export async function replyTool(id: string, reply: string | null, done: { on: string; what: string | null } | null): Promise<void> {
  const patch: Record<string, unknown> = { reply: reply || null, replied_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (done) {
    Object.assign(patch, { request: null, request_note: null, requested_at: null, requested_by: null, reply: null });
    if (done.what) Object.assign(patch, { last_done_on: done.on, last_done: done.what });
  }
  await sbUpdate("portal_van_tools", q.eq("id", id), patch);
}
