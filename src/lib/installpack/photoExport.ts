import "server-only";
import { stDownload, stTenantPath } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { signedUrls, uploadPhoto } from "@/lib/portal/storage";
import { listJobFiles } from "@/lib/ordering/jobFiles";

/**
 * The photos on a job, copied out of ServiceTitan for an install pack made by
 * hand (Jake, 22 Nov: "for the installer pack we need any photos on the
 * current job"). The automatic pack embeds them itself; one written outside
 * the portal can't reach ServiceTitan, so the sweep copies them into private
 * storage and leaves an hour's signed link to each.
 *
 * Asked for by job id in the pack_photo_export setting ({ jobs: [id, ...] }),
 * and answered in the same setting, in place of the ask, so it runs once.
 */
const KEY = "pack_photo_export";
// Photos as phones take them. HEIC is copied too: the phones the crew use
// save in it (all 7 photos on 20801 and 20881, 22 Nov), and the pack is made
// where it can be converted. GIFs and the rest stay on the job.
const DRAWABLE = /\.(jpe?g|png|webp|heic|heif)$/i;
const PER_JOB = 12;
const MAX_BYTES = 6 * 1048576;

type Out = { jobId: number; error?: string; photos: { name: string; at: string | null; url: string }[]; left: number };

export async function exportPackPhotos(deadline: number): Promise<{ done: number }> {
  const ask = await getSettings<{ jobs?: unknown }>(KEY).catch(() => null);
  const ids = Array.isArray(ask?.jobs) ? ask.jobs.filter((x): x is number => Number.isInteger(x)).slice(0, 4) : [];
  if (!ids.length) return { done: 0 };
  const out: Out[] = [];
  for (const jobId of ids) {
    const o: Out = { jobId, photos: [], left: 0 };
    out.push(o);
    const listed = await listJobFiles(jobId);
    if ("error" in listed) { o.error = listed.error; continue; }
    const pics = listed.files.filter((f) => DRAWABLE.test(f.name));
    o.left = listed.files.filter((f) => /\.gif$/i.test(f.name)).length;
    const paths: { path: string; name: string; at: string | null }[] = [];
    for (const f of pics.slice(0, PER_JOB)) {
      if (Date.now() > deadline - 8_000) { o.left++; continue; }
      try {
        const { bytes, mime } = await stDownload(stTenantPath("forms", `jobs/attachment/${f.id}`), MAX_BYTES);
        const path = `install-pack/${jobId}/${f.id}-${f.name.replace(/[^\w.-]+/g, "_")}`;
        const up = await uploadPhoto(path, bytes, mime || (/\.hei[cf]$/i.test(f.name) ? "image/heic" : "image/jpeg"));
        if (up.ok) paths.push({ path, name: f.name, at: f.at });
        else { o.left++; o.error = `storage: ${up.error ?? "refused"}`.slice(0, 160); }
      } catch (e) {
        o.left++;
        o.error = `download: ${(e as Error).message}`.slice(0, 160);
      }
    }
    o.left += Math.max(0, pics.length - PER_JOB);
    const urls = await signedUrls(paths.map((p) => p.path), 3600);
    o.photos = paths.flatMap((p) => (urls.get(p.path) ? [{ name: p.name, at: p.at, url: urls.get(p.path)! }] : []));
  }
  await saveSettings(KEY, { at: new Date().toISOString(), jobs: out });
  return { done: out.length };
}
