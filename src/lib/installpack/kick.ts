import "server-only";
import { site } from "@/lib/site";

/**
 * Start an install-pack run in a function of its own, from the board's
 * refresh, without waiting for it.
 *
 * Making a pack downloads a job's photos and uploads a PDF, which needs most
 * of a minute; the refresh has usually spent half of its own minute on the
 * ServiceTitan pull by the time the pull's data is in. Run inline, the packs
 * never got their turn (27 Oct: nothing made in an hour of syncs). So the
 * refresh asks /api/install-packs, which has the full minute, and moves on as
 * soon as the request is on its way.
 *
 * Production only: a preview deployment would otherwise reach the live site
 * and attach packs to real jobs from unmerged code.
 */
export async function kickInstallPacks(): Promise<void> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || process.env.VERCEL_ENV !== "production") return;
  const sent = fetch(`${site.url.replace(/\/$/, "")}/api/install-packs`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  }).catch(() => undefined);
  await Promise.race([sent, new Promise((r) => setTimeout(r, 1500))]);
}
