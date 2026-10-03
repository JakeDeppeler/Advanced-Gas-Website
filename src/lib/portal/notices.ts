import "server-only";
import { can, type PortalUser } from "@/lib/portal/caps";
import { dbConfigured, handbookBodies, listQuotes, listVanChecks, listVehicles, listVideos } from "@/lib/portal/db";
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
  tone: "bad" | "warn" | "news";
  /**
   * Which half of the page it belongs in. Something waiting on a person is
   * not the same kind of thing as something that changed, and the design
   * separates them — one is a list of jobs, the other is a list of facts.
   */
  group: "doing" | "news";
  /** When, in words. Empty when the thing carries no date worth showing. */
  when: string;
};

/** A quote sitting unanswered this long is worth chasing. */
const QUOTE_CHASE_DAYS = 7;
/** How recently something has to have changed to still count as news. */
const NEWS_DAYS = 14;

/** A date in the shape the rest of the portal writes them. */
const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });

/** "Today", "2 days ago", "Last week" — the resolution people actually use. */
function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "";
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return `${Math.floor(days / 7)} weeks ago`;
}

/**
 * Things waiting on somebody. The bell counts these and nothing else.
 *
 * The bell sits on every page, so this is the one read every page pays for.
 * The reads that don't depend on each other go out together: the vans and the
 * quotes are one round trip, not two, and the vans' checks are the only thing
 * that has to wait for anything.
 */
async function waitingNotices(user: PortalUser): Promise<Notice[]> {
  const today = localToday();
  const out: Notice[] = [];

  const [vehicles, quotes] = await Promise.all([
    listVehicles().catch(() => []),
    // Quotes are money and only the people who see money get told about them.
    can(user, "overhead") ? listQuotes().catch(() => []) : Promise.resolve([]),
  ]);
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
        group: "doing",
        when: ago(checks[i][0]?.checkedOn ? `${checks[i][0].checkedOn}T00:00:00Z` : null) || "Never done",
      });
    }
    const service = serviceCell(v.odometer, v.nextServiceKm, v.nextServiceDate, today);
    if (service.severity === "bad" || service.severity === "warn") {
      out.push({
        title: `Service ${service.label.toLowerCase()} — ${v.name}`,
        detail: service.detail,
        href: `/portal/vehicles/${v.id}`,
        tone: service.severity,
        group: "doing",
        when: v.nextServiceDate ? day(v.nextServiceDate) : "",
      });
    }
    // The odometer dates everything else about a van, so a stale one quietly
    // makes the service warning above wrong too.
    const km = kmCell(v.odometer, null, today);
    if (v.odometer == null) {
      out.push({ title: `No km reading — ${v.name}`, detail: km.detail, href: `/portal/vehicles/${v.id}`, tone: "warn", group: "doing", when: "" });
    }
  });

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
      group: "doing",
      when: ago(`${q.quotedOn}T00:00:00Z`),
    });
  }
  return out;
}

/** What has changed lately: on the notifications page, never on the bell. */
async function newsNotices(): Promise<Notice[]> {
  const out: Notice[] = [];
  // News: what has changed lately. Derived the same way as everything above —
  // a video row's created_at and a handbook body's updated_at are already
  // there, so nothing is written to say a thing happened.
  const newsCut = Date.now() - NEWS_DAYS * 86_400_000;
  const [videos, bodies] = await Promise.all([listVideos().catch(() => []), handbookBodies().catch(() => new Map())]);
  for (const v of videos) {
    const at = Date.parse(v.addedAt ?? "");
    if (!Number.isFinite(at) || at < newsCut) continue;
    out.push({
      title: `New video: ${v.title}`,
      detail: [v.category, v.minutes ? `${v.minutes} min` : null].filter(Boolean).join(" · "),
      href: `/portal/learning/${v.track}`,
      tone: "news",
      group: "news",
      when: ago(v.addedAt),
    });
  }
  for (const b of bodies.values()) {
    const at = Date.parse(b.updatedAt ?? "");
    if (!Number.isFinite(at) || at < newsCut) continue;
    out.push({
      title: `Handbook updated: ${b.title}`,
      detail: `Shelf ${b.shelf}${b.updatedBy ? ` · ${b.updatedBy}` : ""}`,
      href: `/portal/handbook/${b.shelf.toLowerCase()}`,
      tone: "news",
      group: "news",
      when: ago(b.updatedAt),
    });
  }

  return out;
}

export async function listNotices(user: PortalUser): Promise<Notice[]> {
  if (!dbConfigured()) return [];
  const [waiting, news] = await Promise.all([waitingNotices(user), newsNotices()]);
  const rank = { bad: 0, warn: 1, news: 2 } as const;
  return [...waiting, ...news].sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export async function unreadCount(user: PortalUser): Promise<number> {
  // Only the things waiting on somebody. A new video is worth seeing on the
  // page; it is not a number on a bell demanding to be cleared — so the news
  // reads aren't made at all here.
  if (!dbConfigured()) return 0;
  return (await waitingNotices(user)).length;
}
