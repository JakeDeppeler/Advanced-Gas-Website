import "server-only";
import { can, type PortalUser } from "@/lib/portal/caps";
import { crewRequests, latestBoard, leadsThisMonth, vanIssues } from "@/lib/portal/office";
import { noticeKey, seenSet, waitingNotices } from "@/lib/portal/notices";
import { lowStockCount } from "@/lib/portal/stock";

/**
 * The counts on the cards — "13", "100 out", "7 overdue" — keyed by the card's
 * link.
 *
 * Home and each side-bar tab's page draw the same cards, so the counts are
 * worked out once, here, and the two can't show different numbers for the
 * same thing. Only where something real is behind a count; a card with
 * nothing waiting carries no badge rather than a zero.
 */
export async function navBadges(user: PortalUser): Promise<Record<string, string>> {
  const office = can(user, "overhead");
  const [board, leads, issues, waiting, seen, low, asks] = await Promise.all([
    office ? latestBoard() : Promise.resolve(null),
    office ? leadsThisMonth() : Promise.resolve(null),
    office ? vanIssues() : Promise.resolve([]),
    waitingNotices(user).catch(() => []),
    seenSet(user).catch(() => new Set<string>()),
    office ? lowStockCount() : Promise.resolve(null),
    office ? crewRequests() : Promise.resolve({ orders: [], leave: [], incidents: [] }),
  ]);
  const m = board?.metrics;

  const badges: Record<string, string> = {};
  if (leads && leads.total > 0) badges["/portal/leads"] = leads.total.toLocaleString("en-AU");
  if (m && m.estimatesOpenCount > 0) badges["/portal/quotes"] = `${m.estimatesOpenCount} out`;
  if (m && (m.overdueCount ?? 0) > 0) badges["/portal/money"] = `${m.overdueCount} overdue`;
  const vans = new Set([
    ...waiting.filter((n) => n.href.startsWith("/portal/vehicles/")).map((n) => n.href),
    ...issues.map((i) => `/portal/vehicles/${i.vehicleId}`),
  ]);
  if (vans.size) badges["/portal/vehicles"] = `${vans.size} to look at`;
  const unread = waiting.filter((n) => !seen.has(noticeKey(n))).length;
  if (unread) badges["/portal/notifications"] = `${unread} new`;
  if (low && low > 0) badges["/portal/stock"] = `${low} low`;
  const journalErrors = waiting.filter((n) => n.href.startsWith("/portal/journals")).length;
  if (journalErrors) badges["/portal/journals"] = `${journalErrors} ${journalErrors === 1 ? "error" : "errors"}`;
  const crewWaiting = asks.incidents.length + asks.leave.length + asks.orders.length;
  if (crewWaiting) badges["/portal/requests"] = `${crewWaiting} waiting`;
  return badges;
}
