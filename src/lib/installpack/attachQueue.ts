import "server-only";
import { stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto } from "@/lib/automation/log";
import { objectExists, readObject, signedUploadUrl } from "@/lib/portal/storage";

/**
 * An install pack made outside the portal, put on its job in ServiceTitan
 * (Jake, 22 Nov: the hand-made packs for 20801 and 20881, "auto add this to
 * those jobs"). Whoever made it can't reach ServiceTitan, or the portal's
 * storage without its key, so it takes two sweeps:
 *
 *   1. A row in pack_attach_queue ({ jobs: [{ jobId, fileName, note }] }) gets
 *      a signed upload link (two hours), written back on the row.
 *   2. Once the PDF is at that link, the sweep attaches it to the job, notes
 *      the job, logs it on Settings > Automatic, and takes the row off the queue.
 *
 * Kept in the private "library" bucket under install-pack/, which takes PDFs.
 */
const KEY = "pack_attach_queue";
const BUCKET = "library";

type Row = { jobId: number; fileName: string; note?: string; path?: string; uploadUrl?: string; done?: string; error?: string };

export async function attachQueuedPacks(deadline: number): Promise<{ attached: number }> {
  const rows = ((await getSettings<{ jobs?: Row[] }>(KEY).catch(() => null))?.jobs ?? []).filter((r) => Number.isInteger(r?.jobId) && typeof r?.fileName === "string");
  if (!rows.length || !rows.some((r) => !r.done)) return { attached: 0 };
  let attached = 0;
  for (const r of rows) {
    if (r.done || Date.now() > deadline - 8_000) continue;
    const name = r.fileName.replace(/[^\w .()-]+/g, "_").slice(0, 120) || `Install pack ${r.jobId}.pdf`;
    r.path ??= `install-pack/${r.jobId}/${Date.now()}-${name.replace(/\s+/g, "_")}`;
    if (!r.uploadUrl) {
      r.uploadUrl = (await signedUploadUrl(r.path, BUCKET)) ?? undefined;
      if (!r.uploadUrl) r.error = "no upload link from storage";
      continue;
    }
    if (!(await objectExists(r.path, BUCKET))) continue;
    try {
      const file = await readObject(r.path, BUCKET);
      if (!file.ok) throw new Error(`storage read ${file.status}`);
      await stUpload(stTenantPath("forms", `jobs/${r.jobId}/attachments`), name, new Uint8Array(file.body), "application/pdf");
      if (r.note) await stSend("POST", stTenantPath("jpm", `jobs/${r.jobId}/notes`), { text: r.note.slice(0, 4000), pinToTop: false });
      r.done = new Date().toISOString();
      delete r.uploadUrl;
      delete r.error;
      attached++;
      await logAuto([{ at: r.done, kind: "installPack", ok: true, jobId: r.jobId, title: `Install pack attached: ${name}`, detail: (r.note ?? "").slice(0, 300) }]).catch(() => undefined);
    } catch (e) {
      r.error = (e as Error).message.slice(0, 200);
    }
  }
  await saveSettings(KEY, { jobs: rows });
  return { attached };
}
