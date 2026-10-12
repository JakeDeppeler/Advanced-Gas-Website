import type { Vehicle } from "@/lib/portal/db";
import { dbConfigured, listVanChecks } from "@/lib/portal/db";
import { weekFor } from "@/lib/portal/monday";
import { listOrders, listReports, listTools } from "@/lib/portal/van";
import { lowStockCount } from "@/lib/portal/stock";
import { VEHICLE_ITEMS, shortfalls, vehicleKey } from "@/lib/portal/vanChecks";
import { isOpenOrder, isOpenReport, toolState } from "@/lib/portal/vanParts";
import { localToday } from "@/lib/portal/xero";

/**
 * Everything the van's four tiles say — weekly check, damage & service, parts,
 * tools — read once. The tech's My van and the office's van page each draw it
 * their own way, but from this, so the two can't tell a different story about
 * the same van.
 */
export async function vanState(van: Vehicle) {
  const today = localToday();
  const [week, reports, orders, tools, stockSheets, factoryLow] = await Promise.all([
    weekFor(van),
    listReports(van.id, 20),
    listOrders({ vehicleId: van.id, limit: 10 }),
    listTools(van.id),
    listVanChecks(van.id, "stock", 1).catch(() => []),
    dbConfigured() ? lowStockCount().catch(() => null) : null,
  ]);
  const states = (tools ?? []).map((t) => ({ t, s: toolState(t, today) }));
  return {
    week,
    weekDone: week.done === week.steps.length,
    lookAt: VEHICLE_ITEMS.filter((i) => week.weekly?.items[vehicleKey(i)]?.state === "action").length,
    open: reports.filter(isOpenReport),
    stockSheet: stockSheets[0] ?? null,
    low: stockSheets[0] ? shortfalls("stock", stockSheets[0].items) : [],
    openOrders: orders.filter(isOpenOrder),
    tools,
    broken: states.filter(({ t }) => t.request === "broken"),
    due: states.filter(({ s }) => s.due),
    asked: states.filter(({ t }) => t.request),
    factoryLow,
  };
}
export type VanState = Awaited<ReturnType<typeof vanState>>;
