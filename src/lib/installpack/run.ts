import "server-only";
import { q, sbSelect, sbUpsert } from "@/lib/dashboard/db";
import { stDownload, stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { loadSwitches, logAuto, type AutoEntry } from "@/lib/automation/log";
import { buildPack, fingerprint, packParts, whatChanged, type PackFacts, type PackParts } from "./build";
import { installJobs, packFactsFor, packPhotos, type InstallJob } from "./facts";
import { packPdf, type PackPhoto } from "./pdf";

/**
 * Settings › Automatic › Install pack: put a pack on every install booked
 * from a sold quote, and a new version when what it says changes.
 *
 * Runs after each ServiceTitan pull. Deciding what's due is four database
 * reads; making a pack is the slow part (the job's photos listed and
 * downloaded from ServiceTitan, the PDF, the upload), so a run makes at most
 * `max` and stops early when its time is nearly up. The rest wait for the
 * next pull, which is a couple of minutes away in working hours.
 *
 * A pack stops being updated once its install has started: install_pack_jobs
 * only lists visits still to come, so nothing is rewritten under someone
 * who's already reading it on site.
 */

type Row = {
  job_id: number;
  version: number;
  fingerprint: string | null;
  parts: Partial<PackParts> | null;
  photo_ids: number[] | null;
  attached_at: string | null;
  photos_checked_at: string | null;
  last_error: string | null;
  last_tried_at: string | null;
};

/** Photos are checked against ServiceTitan this often, not every pull: listing them is two API calls a job. */
const PHOTO_RECHECK_MS = 3 * 3_600_000;
/** After a failure, wait this long before trying the same job again. */
const RETRY_MS = 30 * 60_000;
/**
 * What the photos may add to the PDF. ServiceTitan's attachment limit isn't
 * documented; the work order emails carry 25 MB of photos without trouble,
 * and a pack opened on a phone on site should load quickly, so well under.
 */
const MAX_PHOTO_BYTES = 12 * 1048576;
const MAX_PHOTOS = 16;

export type PackOutcome = { job: string; did: "made" | "updated" | "failed"; detail: string };

export type BuiltPack = { pdf: Uint8Array; fileName: string; photoIds: number[]; photos: number; notShown: number; facts: PackFacts };

/** The PDF for one job, with its photos. Nothing written anywhere. */
export async function buildPackFile(j: InstallJob, facts: PackFacts, version: number, deadline = Infinity, maxPhotoBytes = MAX_PHOTO_BYTES): Promise<BuiltPack> {
  const listed = await packPhotos(j);
  const photos: PackPhoto[] = [];
  let notShown = 0;
  let photoIds: number[] = [];
  if ("photos" in listed) {
    photoIds = listed.photos.map((p) => p.id);
    notShown = listed.notShown;
    let total = 0;
    for (const p of listed.photos) {
      // Leave time for the PDF and the upload rather than run out mid-way.
      if (photos.length >= MAX_PHOTOS || total >= maxPhotoBytes || Date.now() > deadline - 12_000) { notShown++; continue; }
      try {
        const { bytes } = await stDownload(stTenantPath("forms", `jobs/attachment/${p.id}`), maxPhotoBytes - total);
        total += bytes.length;
        photos.push({ photo: p, bytes });
      } catch {
        notShown++;
      }
    }
  }
  const pdf = await packPdf(buildPack(facts), photos, { version, madeAt: new Date(), notShown });
  return { pdf, fileName: `Install pack - Job ${j.job_number ?? j.job_id} ${version ? `v${version}` : "preview"}.pdf`, photoIds, photos: photos.length, notShown, facts };
}

const sameIds = (a: number[] | null | undefined, b: number[]) => {
  const x = [...(a ?? [])].sort((m, n) => m - n);
  const y = [...b].sort((m, n) => m - n);
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

export async function runInstallPacks(opts: { max?: number; deadline?: number } = {}): Promise<{ ran: PackOutcome[]; skipped?: string }> {
  const max = opts.max ?? 1;
  const deadline = opts.deadline ?? Date.now() + 45_000;
  const sw = await loadSwitches();
  if (!sw.installPack) return { ran: [], skipped: "switched off" };

  const jobs = await installJobs();
  if (!jobs.length) return { ran: [] };
  const [facts, rows] = await Promise.all([
    packFactsFor(jobs),
    sbSelect<Row>("install_packs", [q.select("job_id,version,fingerprint,parts,photo_ids,attached_at,photos_checked_at,last_error,last_tried_at"), `job_id=in.(${jobs.map((j) => j.job_id).join(",")})`].join("&")),
  ]);
  const rowOf = new Map(rows.map((r) => [r.job_id, r]));
  const now = Date.now();
  const ran: PackOutcome[] = [];
  const log: AutoEntry[] = [];
  let photoChecks = 0;

  for (const j of jobs) {
    if (ran.length >= max || Date.now() > deadline - 20_000) break;
    const f = facts.get(j.job_id);
    if (!f) continue;
    const row = rowOf.get(j.job_id);
    if (row?.last_error && row.last_tried_at && now - Date.parse(row.last_tried_at) < RETRY_MS) continue;

    const parts = packParts(f);
    const fp = fingerprint(parts);
    let photosChanged = false;
    if (row?.attached_at && row.fingerprint === fp) {
      // Up to date as far as the database goes. Photos are the one thing that
      // can change only in ServiceTitan; look at one job's each run, at most
      // every few hours.
      if (photoChecks >= 1 || (row.photos_checked_at && now - Date.parse(row.photos_checked_at) < PHOTO_RECHECK_MS)) continue;
      photoChecks++;
      const listed = await packPhotos(j);
      if (!("photos" in listed)) continue;
      if (sameIds(row.photo_ids, listed.photos.map((p) => p.id))) {
        await sbUpsert("install_packs", [{ job_id: j.job_id, photos_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }], "job_id");
        continue;
      }
      photosChanged = true;
    }

    const version = (row?.version ?? 0) + 1;
    const label = `Job ${j.job_number ?? j.job_id}`;
    try {
      const built = await buildPackFile(j, f, version, deadline);
      const shown = `${built.photos} photo${built.photos === 1 ? "" : "s"}${built.notShown ? ` (${built.notShown} more on the job)` : ""}`;
      await stUpload(stTenantPath("forms", `jobs/${j.job_id}/attachments`), built.fileName, built.pdf, "application/pdf");
      const note = version === 1
        ? `Install pack attached (${built.fileName}): what's going in, every material and where it was ordered, the work and scope from the sold quote, and ${shown}.`
        : `Install pack updated to v${version}: ${whatChanged(row?.parts ?? null, parts, photosChanged)}. The new PDF (${built.fileName}) is attached; use it rather than earlier versions.`;
      // The PDF is on the job either way; a refused note shouldn't make the
      // next run upload it again.
      const noted = await stSend("POST", stTenantPath("jpm", `jobs/${j.job_id}/notes`), { text: note, pinToTop: false }).then(() => true, () => false);
      const at = new Date().toISOString();
      await sbUpsert("install_packs", [{
        job_id: j.job_id, estimate_id: j.estimate_id, version, fingerprint: fp, parts, photo_ids: built.photoIds,
        file_name: built.fileName, attached_at: at, photos_checked_at: at, last_error: noted ? null : "The PDF went on, but ServiceTitan refused the note.", last_tried_at: at, updated_at: at,
      }], "job_id");
      const did = version === 1 ? "made" : "updated";
      ran.push({ job: label, did, detail: `v${version}, ${shown}` });
      log.push({ at, kind: "installPack", title: `${version === 1 ? "Install pack on" : `Install pack v${version} on`} job ${j.job_number ?? j.job_id}`, detail: version === 1 ? shown : whatChanged(row?.parts ?? null, parts, photosChanged), ok: true, jobId: j.job_id });
    } catch (e) {
      const msg = (e as Error).message.slice(0, 500);
      const at = new Date().toISOString();
      await sbUpsert("install_packs", [{ job_id: j.job_id, estimate_id: j.estimate_id, version: row?.version ?? 0, last_error: msg, last_tried_at: at, updated_at: at }], "job_id").catch(() => undefined);
      ran.push({ job: label, did: "failed", detail: msg });
      log.push({ at, kind: "installPack", title: `Install pack on job ${j.job_number ?? j.job_id} failed`, detail: msg, ok: false, jobId: j.job_id });
    }
  }
  await logAuto(log).catch(() => undefined);
  return { ran };
}
