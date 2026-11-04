import "server-only";
import { q, sbInsertIfAbsent, sbSelect, sbUpdateReturning, sbUpsert } from "@/lib/dashboard/db";
import { stDownload, stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { loadSwitches, logAuto, type AutoEntry } from "@/lib/automation/log";
import { buildPack, fingerprint, packParts, whatChanged, type PackFacts, type PackParts } from "./build";
import { installJobs, packFactsFor, packPhotos, type InstallJob } from "./facts";
import { packPdf, type PackPhoto } from "./pdf";
import { aiConfigured, visitReports, writeSummary } from "./summary";
import { summaryInput, type SummaryState, type VisitReport } from "./summaryText";

/**
 * Settings › Automatic › Install pack: put a pack on every install job, and
 * a new version when what it says changes.
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
  claimed_at?: string | null;
  last_error: string | null;
  last_tried_at: string | null;
  visit_reports?: VisitReport[] | null;
  reports_checked_at?: string | null;
  summary?: SummaryState | null;
  summary_key?: string | null;
};

/** Photos are checked against ServiceTitan this often, not every pull: listing them is two API calls a job. */
const PHOTO_RECHECK_MS = 3 * 3_600_000;
/** A claim older than this belongs to a run that died; a pack never takes longer. */
const CLAIM_MS = 2 * 60_000;

/**
 * Take the job for this run, or learn another run has it. The board's
 * refresh, the Actions sync and the morning cron can overlap, and two runs
 * building the same pack would put it on the job twice. Returns the row as
 * it stands once claimed — another run may have just finished it — or null.
 */
async function claimJob(jobId: number, estimateId: number | null): Promise<Row | null> {
  await sbInsertIfAbsent("install_packs", { job_id: jobId, estimate_id: estimateId }, "job_id");
  // Quoted: inside or=() PostgREST reads a bare dot or colon as syntax.
  const cut = new Date(Date.now() - CLAIM_MS).toISOString();
  const got = await sbUpdateReturning<Row>("install_packs", `job_id=eq.${jobId}&or=(claimed_at.is.null,claimed_at.lt.${encodeURIComponent(`"${cut}"`)})`, { claimed_at: new Date().toISOString() });
  return got[0] ?? null;
}

/** After a failure, wait this long before trying the same job again. */
const RETRY_MS = 30 * 60_000;
/**
 * What the photos may add to the PDF. ServiceTitan's attachment limit isn't
 * documented; the work order emails carry 25 MB of photos without trouble,
 * and a pack opened on a phone on site should load quickly, so well under.
 */
const MAX_PHOTO_BYTES = 12 * 1048576;
const MAX_PHOTOS = 16;

/** Condition Reports are looked for again this often: a tech may fill one in after the install's booked. */
const REPORT_RECHECK_MS = 3 * 3_600_000;

/** What a run may still spend on looking for reports and writing summaries. */
export type ExtrasBudget = { reportChecks: number; writes: number; deadline: number };

/**
 * The Condition Reports and the install summary for a job, as stored, looked
 * for again or written when due and the run has room. Writing a summary takes
 * Claude most of half a minute, so a run writes one and leaves the rest to
 * the next pull; "wait" means this job's turn hasn't come. `force` (the
 * office's preview) does it now whatever the budget.
 */
export async function packExtras(j: InstallJob, f: PackFacts, row: Row | null | undefined, budget: ExtrasBudget, force = false, needSummary = true): Promise<{ reports: VisitReport[]; summary: SummaryState | null } | "wait"> {
  const at = () => new Date().toISOString();
  let reports = row?.visit_reports ?? null;
  const stale = !row?.reports_checked_at || Date.now() - Date.parse(row.reports_checked_at) > REPORT_RECHECK_MS;
  if (stale) {
    if (force || (budget.reportChecks > 0 && Date.now() < budget.deadline - 25_000)) {
      budget.reportChecks--;
      // A failed look keeps what was found before and tries again in a few
      // hours, rather than holding the pack back for it.
      reports = await visitReports(j).catch(() => reports);
      await sbUpsert("install_packs", [{ job_id: j.job_id, visit_reports: reports ?? [], reports_checked_at: at(), updated_at: at() }], "job_id").catch(() => undefined);
    } else if (reports == null) {
      return "wait";
    }
  }
  reports ??= [];
  // A guide only for an install that's sold (Jake, 4 Nov): without a sold
  // quote there's nothing settled about what's going in.
  if (!aiConfigured() || !f.quote) return { reports, summary: null };

  const withReports: PackFacts = { ...f, visitReports: reports };
  const { key } = summaryInput(withReports, reports);
  let summary = row?.summary ?? null;
  const retry = summary != null && "error" in summary && Date.now() - Date.parse(summary.at) > RETRY_MS;
  if (summary == null || row?.summary_key !== key || retry) {
    // While the summary isn't going in the PDF, the pack doesn't wait for one.
    if (!force && (budget.writes <= 0 || Date.now() > budget.deadline - 35_000)) return needSummary ? "wait" : { reports, summary };
    budget.writes--;
    try {
      const w = await writeSummary(j, withReports, reports, budget.deadline - 15_000);
      summary = { ok: w.summary, from: w.from };
    } catch (e) {
      summary = { error: (e as Error).message.slice(0, 200), at: at() };
    }
    await sbUpsert("install_packs", [{ job_id: j.job_id, summary, summary_key: key, updated_at: at() }], "job_id").catch(() => undefined);
  }
  return { reports, summary };
}

/** One job's pack row, for the office's preview. */
export async function packRow(jobId: number): Promise<Row | null> {
  const rows = await sbSelect<Row>("install_packs", [q.select("job_id,version,fingerprint,parts,photo_ids,attached_at,photos_checked_at,last_error,last_tried_at,visit_reports,reports_checked_at,summary,summary_key"), q.eq("job_id", String(jobId))].join("&"));
  return rows[0] ?? null;
}

export type PackOutcome = { job: string; did: "made" | "updated" | "failed"; detail: string };

export type BuiltPack = { pdf: Uint8Array; fileName: string; photoIds: number[]; photos: number; notShown: number; facts: PackFacts };

/** The PDF for one job, with its photos. Nothing written anywhere. */
export async function buildPackFile(j: InstallJob, facts: PackFacts, version: number, deadline = Infinity, maxPhotoBytes = MAX_PHOTO_BYTES): Promise<BuiltPack> {
  const listed = await packPhotos(j, facts.visitReports ?? []);
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
    sbSelect<Row>("install_packs", [q.select("job_id,version,fingerprint,parts,photo_ids,attached_at,photos_checked_at,last_error,last_tried_at,visit_reports,reports_checked_at,summary,summary_key"), `job_id=in.(${jobs.map((j) => j.job_id).join(",")})`].join("&")),
  ]);
  const rowOf = new Map(rows.map((r) => [r.job_id, r]));
  const now = Date.now();
  const ran: PackOutcome[] = [];
  const log: AutoEntry[] = [];
  let photoChecks = 0;
  const budget: ExtrasBudget = { reportChecks: 3, writes: 1, deadline };

  for (const j of jobs) {
    if (ran.length >= max || Date.now() > deadline - 20_000) break;
    const base = facts.get(j.job_id);
    if (!base) continue;
    const row = rowOf.get(j.job_id);
    if (row?.last_error && row.last_tried_at && now - Date.parse(row.last_tried_at) < RETRY_MS) continue;

    const extras = await packExtras(j, base, row, budget, false, sw.installSummary);
    if (extras === "wait") continue;
    // A summary just written can leave too little of the minute for the
    // photos and the upload; the pack follows on the next pull.
    if (Date.now() > deadline - 25_000) break;
    // Written either way, so it can be read before it's turned on; in the
    // PDF only once it is.
    const f: PackFacts = { ...base, visitReports: extras.reports, summary: sw.installSummary ? extras.summary : null };

    const parts = packParts(f);
    const fp = fingerprint(parts);
    let photosChanged = false;
    if (row?.attached_at && row.fingerprint === fp) {
      // Up to date as far as the database goes. Photos are the one thing that
      // can change only in ServiceTitan; look at one job's each run, at most
      // every few hours.
      if (photoChecks >= 1 || (row.photos_checked_at && now - Date.parse(row.photos_checked_at) < PHOTO_RECHECK_MS)) continue;
      photoChecks++;
      const listed = await packPhotos(j, f.visitReports ?? []);
      if (!("photos" in listed)) continue;
      if (sameIds(row.photo_ids, listed.photos.map((p) => p.id))) {
        await sbUpsert("install_packs", [{ job_id: j.job_id, photos_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }], "job_id");
        continue;
      }
      photosChanged = true;
    }

    const mine = await claimJob(j.job_id, j.estimate_id).catch(() => null);
    if (!mine) continue;
    // Finished by another run between our read and our claim: nothing to do.
    if (mine.attached_at && mine.fingerprint === fp && !photosChanged && mine.version > (row?.version ?? 0)) {
      await sbUpsert("install_packs", [{ job_id: j.job_id, claimed_at: null }], "job_id").catch(() => undefined);
      continue;
    }
    const version = (mine.version ?? 0) + 1;
    const label = `Job ${j.job_number ?? j.job_id}`;
    try {
      const built = await buildPackFile(j, f, version, deadline);
      const shown = `${built.photos} photo${built.photos === 1 ? "" : "s"}${built.notShown ? ` (${built.notShown} more on the job)` : ""}`;
      await stUpload(stTenantPath("forms", `jobs/${j.job_id}/attachments`), built.fileName, built.pdf, "application/pdf");
      const note = version === 1
        ? `Install pack attached (${built.fileName}): the scope from the job summary, ${f.summary && "ok" in f.summary ? "an installation summary written from the records, " : ""}${f.quote ? "what's going in and every material from the sold quote with where it was ordered" : "no equipment list as there's no sold quote on the job"}${f.visitReports?.length ? `, the Condition Report${f.visitReports.length === 1 ? "" : "s"} from the earlier visit` : ""}, and ${shown}.`
        : `Install pack updated to v${version}: ${whatChanged(row?.parts ?? null, parts, photosChanged)}. The new PDF (${built.fileName}) is attached; use it rather than earlier versions.`;
      // The PDF is on the job either way; a refused note shouldn't make the
      // next run upload it again.
      const noted = await stSend("POST", stTenantPath("jpm", `jobs/${j.job_id}/notes`), { text: note, pinToTop: false }).then(() => true, () => false);
      const at = new Date().toISOString();
      await sbUpsert("install_packs", [{
        job_id: j.job_id, estimate_id: j.estimate_id, version, fingerprint: fp, parts, photo_ids: built.photoIds,
        file_name: built.fileName, attached_at: at, photos_checked_at: at, claimed_at: null, last_error: noted ? null : "The PDF went on, but ServiceTitan refused the note.", last_tried_at: at, updated_at: at,
      }], "job_id");
      const did = version === 1 ? "made" : "updated";
      ran.push({ job: label, did, detail: `v${version}, ${shown}` });
      log.push({ at, kind: "installPack", title: `${version === 1 ? "Install pack on" : `Install pack v${version} on`} job ${j.job_number ?? j.job_id}`, detail: version === 1 ? shown : whatChanged(row?.parts ?? null, parts, photosChanged), ok: true, jobId: j.job_id });
    } catch (e) {
      const msg = (e as Error).message.slice(0, 500);
      const at = new Date().toISOString();
      await sbUpsert("install_packs", [{ job_id: j.job_id, estimate_id: j.estimate_id, version: mine.version ?? 0, claimed_at: null, last_error: msg, last_tried_at: at, updated_at: at }], "job_id").catch(() => undefined);
      ran.push({ job: label, did: "failed", detail: msg });
      log.push({ at, kind: "installPack", title: `Install pack on job ${j.job_number ?? j.job_id} failed`, detail: msg, ok: false, jobId: j.job_id });
    }
  }
  await logAuto(log).catch(() => undefined);
  return { ran };
}
