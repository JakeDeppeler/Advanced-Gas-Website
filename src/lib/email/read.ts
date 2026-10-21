import "server-only";
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import type { EmailHealth } from "./eventTypes";

/**
 * What the wall board asks about email: is anything sitting undelivered.
 *
 * Only what is unresolved, because that is the only question a board can ask
 * usefully. A bounce has no underlying state that fixes itself — unlike a
 * journal entry, which syncs on the next run and takes its own alert down —
 * so somebody marks it sorted on the portal's Email page and the alert goes
 * with it. Without that the light would be amber for ever, and a light that
 * is always amber is a light nobody reads.
 */

export type TroubleRow = {
  id: string;
  at: string;
  kind: string;
  to: string | null;
  subject: string | null;
  status: string;
  detail: string | null;
};

type Row = {
  id: string;
  created_at: string;
  kind: string | null;
  to_email: string | null;
  subject: string | null;
  status: string;
  detail: string | null;
};

const TROUBLE = "status=in.(failed,bounced)&resolved_at=is.null";

/** Everything undelivered and unresolved, newest first. */
export async function listTrouble(limit = 50): Promise<TroubleRow[]> {
  const rows = await sbSelect<Row>(
    "portal_email_events",
    [q.select("id,created_at,kind,to_email,subject,status,detail"), TROUBLE, q.order("created_at", "desc"), `limit=${limit}`].join("&"),
  );
  return rows.map((r) => ({
    id: r.id,
    at: r.created_at,
    kind: r.kind ?? "other",
    to: r.to_email,
    subject: r.subject,
    status: r.status,
    detail: r.detail,
  }));
}

/**
 * The board's summary.
 *
 * Throws rather than returning a clean bill on a failed read: the snapshot
 * builder catches it and carries the last reading forward, the same as every
 * other source. Returning "nothing wrong" from a database we could not reach
 * would be the board inventing good news.
 */
export async function emailHealth(now = new Date()): Promise<EmailHealth> {
  const rows = await listTrouble(200);
  if (!rows.length) return { trouble: 0, oldestHours: null, worstKind: null, toCustomer: false };

  const oldest = rows.reduce((t, r) => (r.at < t ? r.at : t), rows[0].at);
  const ms = now.getTime() - Date.parse(oldest);
  return {
    trouble: rows.length,
    oldestHours: Number.isFinite(ms) ? Math.max(0, ms / 3_600_000) : null,
    /*
     * The oldest one's kind, not the newest.
     *
     * The line can only name one of them, and the one worth naming is the one
     * that has been sitting longest — a quote that bounced on Tuesday is the
     * reason the light is on, and naming this morning's report instead would
     * send somebody to the wrong place.
     */
    worstKind: rows.reduce((t, r) => (r.at < t.at ? r : t), rows[0]).kind,
    toCustomer: rows.some((r) => r.kind === "quote-customer" || r.kind === "order"),
  };
}

/**
 * Somebody has dealt with one. Takes it off the board.
 *
 * Only the unresolved ones can be marked, so two people pressing it in the
 * same minute does not overwrite the first person's name with the second's.
 */
export async function markSorted(id: string, by: string | null): Promise<void> {
  await sbUpdate(
    "portal_email_events",
    [`id=eq.${encodeURIComponent(id)}`, "resolved_at=is.null"].join("&"),
    { resolved_at: new Date().toISOString(), resolved_by: by ?? null },
  );
}
