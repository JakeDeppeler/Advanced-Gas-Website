import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { alertable, type NewLead } from "./newLeadTypes";

/**
 * Enquiries that have landed since the board last asked.
 *
 * Its own small read rather than a field on the snapshot, because of what the
 * board is being asked to promise. The snapshot recomputes on a 25-second floor
 * and the board polls it every 30, so a lead riding on it reaches the wall up
 * to the best part of a minute after it arrived — which is the whole minute the
 * office gives itself to ring, spent waiting for the board to notice. One
 * indexed read on a 15-second poll costs a few thousand tiny queries a day and
 * buys back forty of those sixty seconds.
 *
 * The watermark is the database's own clock, handed out by the route and given
 * back on the next poll, so nothing here depends on what time the television
 * thinks it is.
 */

type Row = {
  id: string;
  created_at: string;
  source: string | null;
  kind: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  headline: string | null;
  service: string | null;
  suburb: string | null;
  postcode: string | null;
  summary: string | null;
};

/** How many can take the wall from one poll. See the cap in the route. */
export const MAX_PER_POLL = 3;

/**
 * Everything worth announcing that landed after `since`, oldest first, with the
 * watermark to ask from next time.
 *
 * `next` comes off the rows themselves and not off any clock here, and it
 * counts the rows this throws away as well as the ones it keeps: a phone tap
 * is not announced, but if it did not move the watermark the board would read
 * it again on every poll for the rest of the day.
 *
 * Throws rather than returning nothing on a failed read: the route turns that
 * into a 503 and the board keeps its watermark where it was, so a minute of
 * Supabase being unreachable delays an alert rather than losing it.
 */
export async function leadsSince(since: string, limit = 20): Promise<{ next: string; leads: NewLead[] }> {
  const rows = await sbSelect<Row>(
    "portal_leads",
    [
      q.select("id,created_at,source,kind,name,phone,email,headline,service,suburb,postcode,summary"),
      q.gt("created_at", since),
      q.order("created_at", "asc"),
      `limit=${limit}`,
    ].join("&"),
  );

  // Lexicographic on an ISO string from one clock is chronological, and these
  // all come back from the same column of the same table.
  const next = rows.reduce((t, r) => (r.created_at > t ? r.created_at : t), since);

  const leads = rows
    .map((r): NewLead => ({
      id: r.id,
      at: r.created_at,
      source: r.source ?? "website",
      kind: r.kind ?? "quote",
      name: r.name,
      phone: r.phone,
      email: r.email,
      headline: r.headline,
      service: r.service,
      suburb: r.suburb,
      postcode: r.postcode,
      summary: r.summary,
    }))
    .filter(alertable);

  return { next, leads };
}

/**
 * Where a board that has just opened starts reading from: the newest enquiry
 * already in the table.
 *
 * Not "now". The two clocks involved — this server's and the database's — are
 * not the same clock, and a watermark half a second ahead of the row it was
 * meant to include is a lead that never gets announced. A value read out of the
 * column itself cannot be out by anything.
 *
 * It also means an enquiry that lands while the television is still painting
 * its first frame is announced rather than swallowed, which a timestamp taken
 * at page load would have got wrong in the one direction that matters.
 */
export async function leadWatermark(): Promise<string> {
  const rows = await sbSelect<{ created_at: string }>(
    "portal_leads",
    [q.select("created_at"), q.order("created_at", "desc"), "limit=1"].join("&"),
  );
  return rows[0]?.created_at ?? new Date().toISOString();
}
