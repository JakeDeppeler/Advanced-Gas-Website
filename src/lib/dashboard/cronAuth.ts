import "server-only";
import { cronAuthorised } from "./screenAuth";
import { dashboardDbConfigured, sbRpcRows } from "./db";

/**
 * Who may run the scheduled jobs: Vercel's cron and the GitHub workflow with
 * CRON_SECRET, as before, or Supabase's own scheduler (migration 0107).
 *
 * GitHub's "every 10 minutes" turned out to run every four to six hours (6 Nov),
 * so the sync now also runs from pg_cron in the database. pg_cron sends a
 * token of its own, kept in Supabase's vault, rather than a copy of
 * CRON_SECRET: the site never sees it at rest, it only asks the database
 * whether a token it was handed is the one (portal_cron_token_ok, callable by
 * the service role only). It opens only the routes the schedule calls.
 */
export async function scheduledCallAuthorised(req: Request): Promise<boolean> {
  if (cronAuthorised(req)) return true;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // The vault token is 64 hex characters; anything else isn't worth a round trip.
  if (!/^[0-9a-f]{64}$/.test(token) || !dashboardDbConfigured()) return false;
  const rows = await sbRpcRows<{ ok: boolean }>("portal_cron_token_ok", { token }).catch(() => []);
  return rows[0]?.ok === true;
}
