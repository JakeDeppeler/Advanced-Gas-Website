import { q, sbRpc, sbSelectOne, sbUpsert, type Row } from "./db";
import { isoDateMelbourne } from "./dates";
import { serviceTitanConfigured, stExportAll, stList } from "./servicetitan";
import { JOURNAL_RESOURCE, syncJournalEntries } from "@/lib/journals/sync";
import { sendJournalAlerts } from "@/lib/journals/alerts";

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

/** The Melbourne day a timestamp fell on, for a column that means "that day". */
const melDay = (v: unknown): string | null => {
  const iso = ts(v);
  return iso ? isoDateMelbourne(new Date(iso)) : null;
};

function pick(r: Row, ...keys: string[]): unknown {
  for (const k of keys) if (r[k] != null) return r[k];
  return null;
}

type ResourceSpec = {
  resource: string;
  module: string;
  /** The export path under `export/`, when it isn't the resource name. */
  path?: string;
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
      // The job payload carries a locationId and no address; the suburb and
      // postcode are stamped on by the resolver from st_locations.
      location_id: num(r.locationId),
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
      // ServiceTitan spells it subTotal. Reading `subtotal` left the column
      // null on every invoice, and profit is worked out on the price before GST.
      subtotal: num(pick(r, "subTotal", "subtotal")),
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
    /**
     * What customers have actually paid.
     *
     * Same Accounting scope the invoices come in under, so nothing new has to
     * be granted. One payment can be split across several invoices, which is
     * what `appliedTo` holds; the board sums the payment itself, because a
     * customer paying $2,648 once is one payment whatever it cleared.
     */
    resource: "payments",
    module: "accounting",
    table: "st_payments",
    map: (r: Row) => ({
      id: Number(r.id),
      // Nested as { id, name }, with no flat customerId beside it — reading the
      // flat key left this null on all 4,492 payments the first sync brought.
      customer_id: num((r.customer as Row | null)?.id),
      business_unit: str(pick(r, "businessUnitName", "businessUnit")),
      type: str(pick(r, "typeName", "type", "paymentType")),
      // A payment carries no status of its own; `syncStatus` is where it has
      // got to on its way into the books. `active` is generated from raw —
      // migration 0043 — so the voided ones can be left out of "paid today"
      // without the sync having to remember to write it.
      status: str(pick(r, "syncStatus", "status", "transactionStatus")),
      memo: str(pick(r, "memo", "referenceNumber", "authCode")),
      total: num(pick(r, "total", "amount", "appliedAmount")),
      // A Melbourne date, not the UTC slice an invoice date takes: a payment
      // taken at 9am here is 10pm yesterday in UTC, and "paid today" has to
      // mean the day the office had.
      paid_on: melDay(pick(r, "paidOn", "date", "paidDate", "createdOn")),
      applied_to: (Array.isArray(r.appliedTo) ? r.appliedTo : []) as Row[],
      created_on: ts(pick(r, "createdOn")),
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
      // Which side of the business wrote it. The board is a residential wall:
      // a commercial project at $119K is real work and real money, and it is
      // not what anybody standing in front of this screen is chasing.
      business_unit: str(pick(r, "businessUnitName", "businessUnit")),
      sold_by_id: num(pick(r, "soldById", "soldBy")),
      // Who wrote the quote, which is a different person from who closed it and
      // is on every estimate rather than only the sold ones.
      created_by_id: num(pick(r, "createdById", "createdBy")),
      subtotal: num(r.subtotal),
      total: num(pick(r, "total", "subtotal")),
      // An estimate's total is before GST and its tax sits beside it. The
      // replica keeps both; `total_inc` (generated) is what every quote figure
      // reads, so a quote and an invoice are counted the same way.
      tax: num(r.tax),
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
    // Where the work is. Jobs carry only a locationId — no suburb, no postcode —
    // so the Areas map had nothing to group by and fell back to website leads,
    // of which there are thirty in the whole table. This is the lookup that
    // turns those ids into places.
    //
    // An export rather than a list: a tenant accumulates a location per customer
    // site, and stList caps out at ten pages.
    resource: "locations",
    module: "crm",
    table: "st_locations",
    map: (r: Row) => {
      const addr = (r.address ?? {}) as Row;
      return {
        id: Number(r.id),
        customer_id: num(r.customerId),
        suburb: str(pick(addr, "city", "suburb")),
        postcode: str(pick(addr, "zip", "postalCode", "postcode")),
        state: str(pick(addr, "state")),
        active: r.active !== false,
        modified_on: ts(pick(r, "modifiedOn")),
        raw: r,
      };
    },
  },
  {
    // Who was on each job, and when they arrived and finished — the labour half
    // of what a job cost. Payroll is its own scope; without it this resource
    // records an error against itself and profit falls back to the hours sold
    // on the invoice.
    resource: "timesheets",
    module: "payroll",
    path: "jobs/timesheets",
    table: "st_timesheets",
    map: (r: Row) => ({
      id: Number(r.id),
      job_id: num(r.jobId),
      appointment_id: num(r.appointmentId),
      technician_id: num(r.technicianId),
      dispatched_on: ts(r.dispatchedOn),
      arrived_on: ts(r.arrivedOn),
      done_on: ts(r.doneOn),
      canceled_on: ts(r.canceledOn),
      active: r.active !== false,
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

/**
 * Lookups record their outcome the same way the exports do.
 *
 * They used to report only into the in-memory response, so when the employees
 * lookup came back empty there was nowhere to look: no row, no error, no count.
 * The point of portal_sync_state is that a failure names itself hours later.
 */
async function recordLookup(
  resource: string,
  startedAt: string,
  records: number,
  error: string | null,
): Promise<void> {
  await sbUpsert(
    "portal_sync_state",
    [
      {
        provider: "servicetitan",
        resource,
        last_run_at: startedAt,
        ...(error ? {} : { last_success_at: new Date().toISOString() }),
        last_status: error ? "error" : records ? "up-to-date" : "empty",
        last_error: error,
        records_synced: records,
      },
    ],
    "provider,resource",
  );
}

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
    const startedAt = new Date().toISOString();
    try {
      const rows = (await stList<Row>(spec.module, spec.path)).map(spec.map).filter((r) =>
        Number.isFinite(r.id),
      );
      await sbUpsert(spec.table, rows, "id");
      await recordLookup(spec.resource, startedAt, rows.length, null);
      report.push({ resource: spec.resource, status: "ok", records: rows.length, exhausted: true });
    } catch (e) {
      const message = (e as Error).message;
      await recordLookup(spec.resource, startedAt, 0, message);
      report.push({ resource: spec.resource, status: "error", error: message });
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
        spec.path ?? spec.resource,
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

  // Journal entries, read-only, then an email for any that newly failed to
  // reach Xero. A failure here is reported like any resource's and stops
  // nothing else.
  try {
    const j = await syncJournalEntries();
    report.push({ resource: JOURNAL_RESOURCE, status: "ok", records: j.records, exhausted: true });
    try {
      const a = await sendJournalAlerts();
      report.push({ resource: "journal-alerts", status: a.error ? "error" : "ok", records: a.sent, ...(a.error ? { error: a.error } : {}) });
    } catch (e) {
      report.push({ resource: "journal-alerts", status: "error", error: (e as Error).message });
    }
  } catch (e) {
    report.push({ resource: JOURNAL_RESOURCE, status: "error", error: (e as Error).message });
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
