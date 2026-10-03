import "server-only";
import { cache } from "react";
import type { PortalUser } from "@/lib/portal/caps";
import { listNotices, type Notice } from "@/lib/portal/notices";
import { dbConfigured, vehicleFor } from "@/lib/portal/db";

/**
 * The office's notices as a tech sees them: their own van's, not every van's.
 * Another van's lapsed check is the office's business, and a dot that lights
 * for something you can't open is a dot nobody trusts.
 *
 * Once per request — the bar's dot, Home and Messages all ask.
 */
export const tradeNotices = cache(async (user: PortalUser): Promise<{ notices: Notice[]; unread: number; vanId: string | null }> => {
  const [all, van] = await Promise.all([
    listNotices(user).catch(() => [] as Notice[]),
    user.id && dbConfigured() ? vehicleFor(user.id).catch(() => null) : null,
  ]);
  const notices = all.filter((n) => !n.href.startsWith("/portal/vehicles/") || (van != null && n.href.endsWith(van.id)));
  return { notices, unread: notices.filter((n) => n.unread).length, vanId: van?.id ?? null };
});
