/**
 * What each synced column is supposed to contain, and what to do when it doesn't.
 *
 * The board reads a replica of ServiceTitan, and a column the sync maps from a
 * field ServiceTitan never sends is null forever without anybody noticing. Three
 * were: `st_jobs.scheduled_on`, `campaign` and `customer_name`, all null on
 * every one of 5,445 rows since the table existed. One of them had been found
 * and handled; the other two had not, and the portal's job-profit list had been
 * quietly dropping the customer's name for months — `.filter(Boolean)` turns
 * "#20233 · Joel Shannon · 7 Oct" into "#20233 · 7 Oct", so there was nothing to
 * see. The only way to find that is to query the database on a hunch.
 *
 * So the expectation is written down and checked on every sync.
 *
 * **Measured over recent rows, not all of them.** `st_jobs.job_type` is 5% full
 * across the table and 100% full over the last month: the 5,150 rows imported
 * before go-live carry a job_type_id that has no row in the lookup, so the
 * resolver cannot name them. They are excluded from every count that cares
 * (see ST_LIVE), and judging the field on them would cry wolf forever.
 */

export type FieldRow = {
  tbl: string;
  col: string;
  filled: number;
  total: number;
  recent_filled: number;
  recent_total: number;
};

export type Expect =
  /** Should be present on effectively every recent row. */
  | "filled"
  /** Genuinely only sometimes present. Worth noticing if it stops entirely. */
  | "partial"
  /** Known not to arrive. Worth noticing if it ever starts. */
  | "absent";

export type FieldSpec = {
  table: string;
  column: string;
  expect: Expect;
  /** For `filled`: the share of recent rows below which this is a problem. */
  floor?: number;
  /** Why it is partial or absent — this is the sentence somebody reads later. */
  why?: string;
};

export const FIELDS: FieldSpec[] = [
  // ---- jobs
  { table: "st_jobs", column: "job_type", expect: "filled" },
  { table: "st_jobs", column: "business_unit", expect: "filled", floor: 0.9 },
  { table: "st_jobs", column: "customer_name", expect: "filled",
    why: "stamped from st_locations.name; the job export carries only customerId" },
  { table: "st_jobs", column: "suburb", expect: "filled", floor: 0.9 },
  { table: "st_jobs", column: "postcode", expect: "filled", floor: 0.9 },
  { table: "st_jobs", column: "status", expect: "filled" },
  { table: "st_jobs", column: "location_id", expect: "filled" },
  { table: "st_jobs", column: "completed_on", expect: "partial",
    why: "a job booked and not yet done has none, which is most of a recent month" },
  { table: "st_jobs", column: "scheduled_on", expect: "absent",
    why: "appointment times are on ServiceTitan's appointments resource, not the job export — the board blanks the 'scheduled next 7 days' tile rather than showing a measured-looking zero" },
  { table: "st_jobs", column: "campaign", expect: "absent",
    why: "the job export sends campaignId and no name, and there is no campaigns lookup synced; nothing on the board reads it" },

  // ---- invoices
  { table: "st_invoices", column: "job_id", expect: "filled" },
  { table: "st_invoices", column: "job_type", expect: "filled" },

  // ---- estimates
  { table: "st_estimates", column: "status", expect: "filled" },
  { table: "st_estimates", column: "created_by", expect: "filled" },
  { table: "st_estimates", column: "sold_by", expect: "partial",
    why: "only set once an estimate is sold and a seller recorded; the leaderboard deliberately counts sales without one so its rows still sum to the headline" },

  // ---- lookups
  { table: "st_locations", column: "name", expect: "filled" },
  { table: "st_locations", column: "suburb", expect: "filled", floor: 0.85 },
  { table: "st_locations", column: "postcode", expect: "filled", floor: 0.85 },
  { table: "st_technicians", column: "name", expect: "filled" },
  { table: "st_employees", column: "name", expect: "filled" },
  { table: "st_payments", column: "paid_on", expect: "filled" },
  { table: "st_timesheets", column: "technician_id", expect: "filled" },
];

export type Finding = {
  field: string;
  /** `empty`: nothing at all. `thin`: below its floor. `arrived`: an absent field started filling. `missing`: no such column. */
  kind: "empty" | "thin" | "arrived" | "missing";
  detail: string;
};

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)}%`);

/**
 * Compare what is there against what was declared.
 *
 * Both directions matter. A field that should be full and is empty is a sync
 * that broke; a field declared absent that starts arriving is ServiceTitan
 * sending something new, and the mapping can be trusted again — which is worth
 * being told, because otherwise it stays switched off forever on the strength
 * of a comment somebody wrote once.
 */
export function checkFields(rows: FieldRow[], spec: FieldSpec[] = FIELDS): Finding[] {
  const byKey = new Map(rows.map((r) => [`${r.tbl}.${r.col}`, r]));
  const out: Finding[] = [];

  for (const f of spec) {
    const key = `${f.table}.${f.column}`;
    const r = byKey.get(key);
    if (!r) {
      out.push({ field: key, kind: "missing", detail: "no such column in the replica" });
      continue;
    }
    // Nothing recent to judge on — a quiet table is not a broken one.
    if (r.recent_total === 0) continue;
    const share = r.recent_filled / r.recent_total;

    if (f.expect === "absent") {
      if (r.recent_filled > 0) {
        out.push({
          field: key,
          kind: "arrived",
          detail: `declared absent but ${r.recent_filled} of ${r.recent_total} recent rows now carry it — the mapping works and whatever was turned off for it can come back`,
        });
      }
      continue;
    }

    if (f.expect === "partial") {
      if (r.recent_filled === 0 && r.filled > 0) {
        out.push({
          field: key,
          kind: "empty",
          detail: `partial by design but empty on all ${r.recent_total} recent rows, where ${r.filled} older rows have it`,
        });
      }
      continue;
    }

    const floor = f.floor ?? 0.95;
    if (share <= 0) {
      out.push({ field: key, kind: "empty", detail: `empty on all ${r.recent_total} recent rows` });
    } else if (share < floor) {
      out.push({
        field: key,
        kind: "thin",
        detail: `${pct(r.recent_filled, r.recent_total)} of recent rows, under the ${Math.round(floor * 100)}% expected`,
      });
    }
  }
  return out;
}

/** One line for the sync report. Empty when everything is as declared. */
export function summarise(findings: Finding[]): string {
  if (findings.length === 0) return "";
  return findings.map((f) => `${f.field}: ${f.kind} — ${f.detail}`).join("; ");
}
