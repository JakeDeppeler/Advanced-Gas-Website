import { q, sbRpc, sbSelectOne, sbUpsert, type Row } from "./db";
import { serviceTitanConfigured, stExportAll, stList } from "./servicetitan";

// Pulls ServiceTitan exports into the local replica.
//
// FIELD MAPPING CAVEAT: the mappers below read the fields ServiceTitan's export
// payloads are documented to carry, but tolerate absence — anything unmapped is
// still preserved verbatim in `raw`, so a wrong guess costs a column, never the
// record. Verify each mapper against a real payload after the first sync
// (select raw from st_jobs limit 1) and tighten it then. Notably, jobs carry
// businessUnitId/jobTypeId rather than names, and the service address lives on
// the location, so those columns stay null until the lookups are added.

const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));
/**
 * ServiceTitan returns enum-ish fields as `{ name, value }` objects, not
 * strings, and String() on one of those yields "[object Object]". Every row in
 * st_estimates held exactly that, so the filter excluding dismissed quotes
 * excluded nothing and the board counted four years of dead quotes as money
 * still out.
 *
 * An unrecognised object becomes null rather than that string: a blank column
 * is honest, and "[object Object]" silently passes every comparison it is used
 * in.
 */
const str = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "object") {
    const o = v as { name?: unknown; value?: unknown };
    if (typeof o.name === "string") return o.name;
    if (typeof o.value === "string") return o.value;
    return null;
  }
  return String(v);
};
const ts = (v: unknown): string | null => {
  if (!v) return null;
  const ms = Date.parse(String(v));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

function pick(r: Row, ...keys: string[]): unknown {
  for (const k of keys) if (r[k] != null) return r[k];
  return null;
}

type ResourceSpec = {
  resource: string;
  module: string;
  table: string;
  map: (r: Row) => Row & { id: number };
};

const RESOURCES: ResourceSpec[] = [
  {
    resource: "jobs",
    module: "jpm",
    table: "st_jobs",
    map: (r: Row) => ({
      id: Number(r.id),
      job_number: str(pick(r, "jobNumber", "number")),
      status: str(pick(r, "jobStatus", "status")),
      job_type: str(pick(r, "jobTypeName", "jobType")),
      job_type_id: num(r.jobTypeId),
      business_unit: str(pick(r, "businessUnitName", "businessUnit")),
      business_unit_id: num(r.businessUnitId),
      customer_id: num(r.customerId),
      customer_name: str(pick(r, "customerName")),
      suburb: str(pick(r, "city", "suburb")),
      postcode: str(pick(r, "zip", "postalCode", "postcode")),
      campaign: str(pick(r, "campaignName", "campaign")),
      total: num(pick(r, "total", "subtotal")),
      created_on: ts(pick(r, "createdOn", "createdDate")),
      scheduled_on: ts(pick(r, "firstAppointmentStart", "scheduledOn", "start")),
      completed_on: ts(pick(r, "completedOn", "completedDate")),
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
  {
    resource: "invoices",
    module: "accounting",
    table: "st_invoices",
    map: (r: Row) => ({
      id: Number(r.id),
      invoice_number: str(pick(r, "number", "invoiceNumber")),
      // The invoice carries its job as { id, type, number }; there is no flat
      // jobId. Reading the wrong key left job_id null on all 5,397 invoices,
      // which broke the join the job-type tile is built on — and the nested
      // object hands us the type directly, so that tile no longer depends on
      // st_jobs.job_type being resolved at all.
      job_id: num(pick(r, "jobId", "jobNumber")) ?? num((r.job as Row | null)?.id),
      job_type: str((r.job as Row | null)?.type),
      customer_id: num(r.customerId),
      business_unit: str(pick(r, "businessUnitName", "businessUnit")),
      status: str(pick(r, "status", "statusName")),
      subtotal: num(r.subtotal),
      tax: num(pick(r, "salesTax", "tax")),
      total: num(r.total),
      balance: num(pick(r, "balance", "amountDue")),
      cost: num(pick(r, "cost", "totalCost", "itemCost")),
      invoice_date: (ts(pick(r, "invoiceDate", "createdOn")) ?? "").slice(0, 10) || null,
      due_date: (ts(pick(r, "dueDate")) ?? "").slice(0, 10) || null,
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
  {
    resource: "estimates",
    module: "sales",
    table: "st_estimates",
    map: (r: Row) => ({
      id: Number(r.id),
      job_id: num(r.jobId),
      customer_id: num(r.customerId),
      status: str(pick(r, "statusName", "status")),
      sold_by_id: num(pick(r, "soldById", "soldBy")),
      subtotal: num(r.subtotal),
      total: num(pick(r, "total", "subtotal")),
      created_on: ts(pick(r, "createdOn")),
      sold_on: ts(pick(r, "soldOn", "soldDate")),
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
  {
    // Telecom sits behind its own scope. If it isn't granted the export 403s,
    // which the per-resource catch below records as an error against this one
    // resource — the rest of the sync still completes.
    resource: "calls",
    module: "telecom",
    table: "st_calls",
    map: (r: Row) => ({
      id: Number(r.id),
      agent: str(pick(r, "agentName", "agent", "userName")),
      agent_id: num(pick(r, "agentId", "userId")),
      direction: str(pick(r, "direction", "callDirection")),
      outcome: str(pick(r, "callType", "outcome", "status")),
      duration_seconds: num(pick(r, "duration", "durationSeconds")),
      customer_id: num(r.customerId),
      campaign: str(pick(r, "campaignName", "campaign")),
      received_on: ts(pick(r, "receivedOn", "createdOn", "startedOn")),
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
  {
    resource: "leads",
    module: "crm",
    table: "st_leads",
    map: (r: Row) => ({
      id: Number(r.id),
      status: str(pick(r, "status", "statusName")),
      customer_id: num(r.customerId),
      campaign: str(pick(r, "campaignName", "campaign")),
      created_on: ts(pick(r, "createdOn")),
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
];

type LookupSpec = {
  resource: string;
  module: string;
  path: string;
  table: string;
  map: (r: Row) => Row & { id: number };
};

const LOOKUPS: LookupSpec[] = [
  {
    resource: "technicians",
    module: "settings",
    path: "technicians",
    table: "st_technicians",
    map: (r: Row) => ({
      id: Number(r.id),
      name: str(pick(r, "name", "displayName")),
      business_unit: str(pick(r, "businessUnitName")),
      active: r.active !== false,
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
  {
    // Estimates carry soldBy as an employee id (a short number), not the
    // nine-digit technician id, so the leaderboard needs this table as well or
    // every name resolves to null and the Team page renders empty.
    resource: "employees",
    module: "settings",
    path: "employees",
    table: "st_employees",
    map: (r: Row) => ({
      id: Number(r.id),
      name: str(pick(r, "name", "displayName")),
      active: r.active !== false,
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
  {
    resource: "job-types",
    module: "jpm",
    path: "job-types",
    table: "st_job_types",
    map: (r: Row) => ({
      id: Number(r.id),
      name: str(pick(r, "name")),
      active: r.active !== false,
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
  {
    resource: "business-units",
    module: "settings",
    path: "business-units",
    table: "st_business_units",
    map: (r: Row) => ({
      id: Number(r.id),
      name: str(pick(r, "name")),
      active: r.active !== false,
      modified_on: ts(pick(r, "modifiedOn")),
      raw: r,
    }),
  },
];

export type SyncReport = Array<{
  resource: string;
  status: "ok" | "error" | "skipped";
  records?: number;
  exhausted?: boolean;
  error?: string;
}>;

export async function syncServiceTitan(reset = false): Promise<SyncReport> {
  if (!serviceTitanConfigured()) {
    return RESOURCES.map((r) => ({
      resource: r.resource,
      status: "skipped" as const,
      error: "ServiceTitan credentials not set",
    }));
  }

  const report: SyncReport = [];

  // Lookups first: the exports below store raw IDs, and the resolver at the end
  // needs the name tables already populated to turn them into labels.
  for (const spec of LOOKUPS) {
    try {
      const rows = (await stList<Row>(spec.module, spec.path)).map(spec.map).filter((r) =>
        Number.isFinite(r.id),
      );
      await sbUpsert(spec.table, rows, "id");
      report.push({ resource: spec.resource, status: "ok", records: rows.length, exhausted: true });
    } catch (e) {
      report.push({ resource: spec.resource, status: "error", error: (e as Error).message });
    }
  }

  // Sequential, not parallel: ServiceTitan throttles per tenant, and a backfill
  // of four resources at once is the fastest way to get rate-limited.
  for (const spec of RESOURCES) {
    const startedAt = new Date().toISOString();
    try {
      const state = await sbSelectOne<{ continue_from: string | null }>(
        "portal_sync_state",
        [q.select("continue_from"), q.eq("provider", "servicetitan"), q.eq("resource", spec.resource)].join("&"),
      );

      const from = reset ? null : state?.continue_from ?? null;
      const { records, continueFrom, exhausted } = await stExportAll<Row>(
        spec.module,
        spec.resource,
        from,
      );

      if (records.length) {
        const rows = records.map(spec.map).filter((r) => Number.isFinite(r.id));
        // Chunked so a large backfill doesn't exceed the request body limit.
        for (let i = 0; i < rows.length; i += 500) {
          await sbUpsert(spec.table, rows.slice(i, i + 500), "id");
        }
      }

      await sbUpsert(
        "portal_sync_state",
        [
          {
            provider: "servicetitan",
            resource: spec.resource,
            continue_from: continueFrom,
            last_run_at: startedAt,
            last_success_at: new Date().toISOString(),
            last_status: exhausted ? "up-to-date" : "more-pending",
            last_error: null,
            records_synced: records.length,
          },
        ],
        "provider,resource",
      );

      report.push({ resource: spec.resource, status: "ok", records: records.length, exhausted });
    } catch (e) {
      const message = (e as Error).message;
      await sbUpsert(
        "portal_sync_state",
        [
          {
            provider: "servicetitan",
            resource: spec.resource,
            last_run_at: startedAt,
            last_status: "error",
            last_error: message,
          },
        ],
        "provider,resource",
      );
      report.push({ resource: spec.resource, status: "error", error: message });
    }
  }

  // Turn the stored jobTypeId / businessUnitId / soldById into display names and
  // push job_type down onto invoices. Cheap, idempotent, and safe to re-run.
  try {
    await sbRpc("dashboard_resolve_names");
    report.push({ resource: "resolve-names", status: "ok" });
  } catch (e) {
    report.push({ resource: "resolve-names", status: "error", error: (e as Error).message });
  }

  return report;
}
