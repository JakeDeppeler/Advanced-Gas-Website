import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { worthListing, workOrderSettingsFrom, type WorkOrderRow, type WorkOrderSettings } from "./workOrderTypes";

const COLS = "id,mailbox,source,status,reason,kind,agency,wo_number,address,subject,from_address,received_at,created_at,st_booking_id,st_job_number,attached_at,attach_error,tenant_email_to,tenant_emailed_at,tenant_email_note,details,location_how,cancelled_at,cancel_note";

/** The last 30 days, newest first: what the Work orders page lists. */
export async function listWorkOrders(): Promise<WorkOrderRow[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const rows = await sbSelect<WorkOrderRow>("work_orders", [q.select(COLS), q.gte("created_at", since), q.order("created_at", "desc"), "limit=400"].join("&"));
  return rows.filter(worthListing);
}

export async function getWorkOrderSettings(): Promise<WorkOrderSettings> {
  return workOrderSettingsFrom(await getSettings<unknown>("work_orders").catch(() => null));
}

export async function saveWorkOrderSettings(s: WorkOrderSettings) {
  return saveSettings("work_orders", workOrderSettingsFrom(s));
}
