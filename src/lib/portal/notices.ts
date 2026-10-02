import "server-only";
import { can, type PortalUser } from "@/lib/portal/caps";
import { dbConfigured, listQuotes, listVanChecks, listVehicles } from "@/lib/portal/db";
import { cleanCell, kmCell, serviceCell } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";

/**
 * What's waiting for you, derived rather than stored.
 *
 * There is no notifications table and this deliberately doesn't add one. Every
 * item below is a question already answerable from a record that exists — a van
 * whose weekly check has lapsed, a quote that has been out too long — so nothing
 * has to be written, marked read, or kept in step with the thing it describes.
 * A stored notification would be a second copy of a fact, and the copy is the
 * one that goes stale.
 *
 * The cost of that choice is that "mark as read" cannot be honest here, so the
 * page doesn't offer it. These clear when the underlying thing is dealt with,
 * which is the only clearing that means anything.
 */

export type Notice = {
  title: string;
  detail: string;
  href: string;
  /** Worst first, same scale the fleet table uses. */
  tone: "bad" | "warn";
};

/** A quote sitting unanswered this long is worth chasing. */
const QUOTE_CHASE_DAYS = 7;

export async function listNotices(user: PortalUser): Promise<Notice[]> {
  if (!dbConfigured()) return [];
  const today = localToday();
  const out: Notice[] = [];

  const vehicles = await listVehicles().catch(() => []);
  const onRoad = vehicles.filter((v) => v.status === "on");

  const checks = await Promise.all(
    onRoad.map((v) => listVanChecks(v.id, "weekly", 1).catch(() => [])),
  );

  onRoad.forEach((v, i) => {
    const clean = cleanCell(checks[i][0]?.checkedOn ?? null, today);
    if (clean.severity === "bad") {
      out.push({
        title: `Weekly van check — ${v.name}`,
        detail: clean.detail,
        href: `/portal/vehicles/${v.id}`,
        tone: "bad",
      });
    }
    const service = serviceCell(v.odometer, v.nextServiceKm, v.nextServiceDate, today);
    if (service.severity === "bad" || service.severity === "warn") {
      out.push({
        title: `Service ${service.label.toLowerCase()} — ${v.name}`,
        detail: service.detail,
        href: `/portal/vehicles/${v.id}`,
        tone: service.severity,
      });
    }
    // The odometer dates everything else about a van, so a stale one quietly
    // makes the service warning above wrong too.
    const km = kmCell(v.odometer, null, today);
    if (v.odometer == null) {
      out.push({ title: `No km reading — ${v.name}`, detail: km.detail, href: `/portal/vehicles/${v.id}`, tone: "warn" });
    }
  });

  // Quotes are money and only the people who see money get told about them.
  if (can(user, "overhead")) {
    const quotes = await listQuotes().catch(() => []);
    const cutoff = Date.now() - QUOTE_CHASE_DAYS * 86_400_000;
    for (const q of quotes) {
      if (q.status !== "quoted") continue;
      const at = Date.parse(q.quotedOn + "T00:00:00Z");
      if (!Number.isFinite(at) || at > cutoff) continue;
      const days = Math.round((Date.now() - at) / 86_400_000);
      out.push({
        title: `Quote still out after ${days} days`,
        detail: [q.customer, `$${Math.round(q.amount).toLocaleString("en-AU")}`].filter(Boolean).join(" · "),
        href: "/portal/finance/quotes",
        tone: days >= 21 ? "bad" : "warn",
      });
    }
  }

  return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "bad" ? -1 : 1));
}

export async function unreadCount(user: PortalUser): Promise<number> {
  return (await listNotices(user)).length;
}
