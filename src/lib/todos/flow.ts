import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";

/**
 * Account to-dos that follow their quote through: won and waiting on payment,
 * then sold (book it in), then booked (invoice it once done), then invoiced
 * (ticked off). Keyed by to-do, each with the quote it's for and where it's up
 * to; the automatic run moves them along (reminders › accountFlow).
 */
export type FlowStep = "won" | "book" | "invoice";
export type FlowEntry = { key: string; step: FlowStep; jobId?: number };
const KEY = "account_flow";

export async function loadFlow(): Promise<Record<string, FlowEntry>> {
  const s = await getSettings<{ todos?: Record<string, FlowEntry> }>(KEY).catch(() => null);
  return s?.todos && typeof s.todos === "object" ? s.todos : {};
}

export async function saveFlow(todos: Record<string, FlowEntry>): Promise<void> {
  await saveSettings(KEY, { todos });
}
