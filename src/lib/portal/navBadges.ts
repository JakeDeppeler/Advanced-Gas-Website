import "server-only";
import { can, type PortalUser } from "@/lib/portal/caps";
import { crewRequests, latestBoard, leadsThisMonth, vanIssues } from "@/lib/portal/office";
import { noticeKey, seenSet, waitingNotices } from "@/lib/portal/notices";
import { lowStockCount } from "@/lib/portal/stock";
import { pipelineDue } from "@/lib/pipeline/store";

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
  const counts = await navCounts(user);
  return Object.fromEntries(Object.entries(counts).map(([href, c]) => [href, c.text]));
}

/** A page's count, as a number, the words for it, and whether it means something's wrong. */
export type NavCount = { n: number; text: string; red: boolean };

/**
 * The same counts as numbers: the side bar shows the number alone, red where
 * it means something is wrong (overdue, a van to look at) and grey where it's
 * only how many (leads this month, new notices).
 */
export async function navCounts(user: PortalUser): Promise<Record<string, NavCount>> {
  const office = can(user, "overhead");
  const pipeOk = office || can(user, "quotes");
  const [board, leads, issues, waiting, seen, low, asks, pipe] = await Promise.all([
    office ? latestBoard() : Promise.resolve(null),
    office ? leadsThisMonth() : Promise.resolve(null),
    office ? vanIssues() : Promise.resolve([]),
    waitingNotices(user).catch(() => []),
    seenSet(user).catch(() => new Set<string>()),
    office ? lowStockCount() : Promise.resolve(null),
    office ? crewRequests() : Promise.resolve({ orders: [], leave: [], incidents: [] }),
    pipeOk ? pipelineDue().catch(() => null) : Promise.resolve(null),
  ]);
  const m = board?.metrics;

  const badges: Record<string, NavCount> = {};
  const put = (href: string, n: number, text: string, red: boolean) => { badges[href] = { n, text, red }; };
  if (leads && leads.total > 0) put("/portal/leads", leads.total, leads.total.toLocaleString("en-AU"), false);
  if (pipe && pipe.due > 0) put("/portal/pipeline", pipe.due, `${pipe.due} to ring`, pipe.late > 0);
  if (m && (m.overdueCount ?? 0) > 0) put("/portal/money", m.overdueCount as number, `${m.overdueCount} overdue`, true);
  const vans = new Set([
    ...waiting.filter((n) => n.href.startsWith("/portal/vehicles/")).map((n) => n.href),
    ...issues.map((i) => `/portal/vehicles/${i.vehicleId}`),
  ]);
  if (vans.size) put("/portal/vehicles", vans.size, `${vans.size} to look at`, true);
  const unread = waiting.filter((n) => !seen.has(noticeKey(n))).length;
  if (unread) put("/portal/notifications", unread, `${unread} new`, false);
  if (low && low > 0) put("/portal/stock", low, `${low} low`, true);
  const journalErrors = waiting.filter((n) => n.href.startsWith("/portal/journals")).length;
  if (journalErrors) put("/portal/journals", journalErrors, `${journalErrors} ${journalErrors === 1 ? "error" : "errors"}`, true);
  const crewWaiting = asks.incidents.length + asks.leave.length + asks.orders.length;
  // An incident is the one thing here that's wrong rather than only waiting.
  if (crewWaiting) put("/portal/requests", crewWaiting, `${crewWaiting} waiting`, asks.incidents.length > 0);
  if (m && (m.toBillCount ?? 0) > 0) put("/portal/not-billed", m.toBillCount as number, `${m.toBillCount} to bill`, false);
  return badges;
}
