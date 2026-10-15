import "server-only";
import { q, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import { stSend, stTenantPath } from "@/lib/dashboard/servicetitan";

/**
 * A quote marked lost in the portal, closed off in ServiceTitan too.
 *
 * The workflow is "Lost → dismiss the estimate with the reason, so it leaves
 * the Follow Up list and your win rate stays honest". ServiceTitan's dismiss
 * takes no reason, and its estimate export carries none back, so the reason
 * lives in the portal (portal_quote_follow) and goes onto the job as a note
 * where the next person to open it will see why.
 *
 * Every open option on the quote is dismissed, not just one: a quote with a
 * Good, Better and Best left two of them on the Follow Up list otherwise. A
 * failure is reported, not thrown — the portal has already recorded the loss,
 * and the office can finish it in ServiceTitan by hand.
 */

type Est = { id: number; job_id: number | null; status: string | null };

/** The open estimates behind a quote key (j<job>, c<customer>-<day>, e<estimate>). */
async function openEstimates(key: string): Promise<Est[]> {
  const cols = q.select("id,job_id,status");
  let rows: Est[] = [];
  if (key.startsWith("j")) rows = await sbSelect<Est>("st_estimates", [cols, `job_id=eq.${Number(key.slice(1))}`].join("&"));
  else if (key.startsWith("e")) rows = await sbSelect<Est>("st_estimates", [cols, `id=eq.${Number(key.slice(1))}`].join("&"));
  else {
    const m = key.match(/^c(\d+)-(\d{4}-\d{2}-\d{2})$/);
    if (m) {
      rows = await sbSelect<Est>("st_estimates", [cols, `customer_id=eq.${m[1]}`, "job_id=is.null", q.gte("created_on", `${m[2]}T00:00:00Z`), `created_on=lt.${m[2]}T23:59:59Z`].join("&"));
    }
  }
  return rows.filter((r) => /^open/i.test(r.status ?? ""));
}

export type LostInServiceTitan = { dismissed: number; failed: number; noted: boolean; error: string | null };

export async function closeOffInServiceTitan(key: string, reason: string, note: string | null, by: string): Promise<LostInServiceTitan> {
  const out: LostInServiceTitan = { dismissed: 0, failed: 0, noted: false, error: null };
  let ests: Est[] = [];
  try {
    ests = await openEstimates(key);
  } catch {
    return { ...out, error: "couldn't read the estimates" };
  }
  for (const e of ests) {
    try {
      await stSend("PUT", stTenantPath("sales", `estimates/${e.id}/dismiss`), {});
      out.dismissed += 1;
      // The sync brings the new status back within minutes; set it now so the
      // pipeline doesn't show it open in the meantime.
      await sbUpdate("st_estimates", `id=eq.${e.id}`, { status: "Dismissed" }).catch(() => undefined);
    } catch (err) {
      out.failed += 1;
      out.error = err instanceof Error ? err.message.slice(0, 160) : "ServiceTitan didn't take it";
    }
  }
  const jobId = key.startsWith("j") ? Number(key.slice(1)) : ests.find((e) => e.job_id != null)?.job_id ?? null;
  if (jobId) {
    try {
      const text = `Quote lost — ${reason}${note ? `: ${note}` : ""}. Marked by ${by} in the portal.`;
      await stSend("POST", stTenantPath("jpm", `jobs/${jobId}/notes`), { text, pinToTop: false });
      out.noted = true;
    } catch (err) {
      out.error = out.error ?? (err instanceof Error ? err.message.slice(0, 160) : "the note didn't go on");
    }
  }
  return out;
}
