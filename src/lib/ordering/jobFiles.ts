import "server-only";
import { q, sbSelect } from "@/lib/dashboard/db";
import { stDownload, stFetch, stFileOrLink, stTenantPath } from "@/lib/dashboard/servicetitan";
import type { WorkOrderDetails } from "./plan";
import { conditionReports } from "@/lib/conditionReport/fetch";
import { reportPdf } from "@/lib/conditionReport/pdf";
import { reportFileName, toReport } from "@/lib/conditionReport/report";

/**
 * The files on a job in ServiceTitan — plans, photos, the quote — to send
 * with a work order. Picked one by one on the form, never all by default: a
 * job's attachments can include the customer's invoice or signed paperwork,
 * which the electrician or Ross has no business getting.
 */
export type JobFile = { id: number; name: string; at: string | null };

/** Resend takes 40 MB an email, base64 included: 25 MB of files leaves room for that and the work order. */
const MAX_TOTAL = 25 * 1048576;

type Raw = { id?: number; fileName?: string | null; name?: string | null; originalFileName?: string | null; createdOn?: string | null; active?: boolean };

export async function listJobFiles(jobId: number): Promise<{ files: JobFile[] } | { error: string }> {
  try {
    const r = await stFetch<{ data?: Raw[] }>(stTenantPath("forms", `jobs/${jobId}/attachments`), { page: "1", pageSize: "100" });
    const files = (r.data ?? [])
      .filter((a) => typeof a.id === "number" && a.active !== false)
      // ServiceTitan names them by where it keeps them ("Attaches/ndnjlust.pwe/plan.pdf"): the last part is the file's own name.
      .map((a) => ({ id: a.id!, name: (a.fileName || a.originalFileName || a.name || "").split(/[\\/]/).pop() || `Attachment ${a.id}`, at: a.createdOn ?? null }))
      .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
    return { files };
  } catch (e) {
    const m = (e as Error).message;
    return { error: /\b403\b/.test(m) ? "ServiceTitan won't let the portal read job files: tick Forms › Attachments (read) on the portal's API app." : "The job's files couldn't be read from ServiceTitan just now." };
  }
}

const PHOTO = /\.(jpe?g|png|heic|heif|webp|gif)$/i;
/**
 * Every photo, as far as an email and a 60 s function allow: 25 MB of files
 * (MAX_TOTAL) is usually the limit first, and four downloads at a time keep
 * twenty inside the time a send has.
 */
const MAX_PHOTOS = 20;
const AT_ONCE = 4;

/**
 * The jobs the work order's jobs were quoted on. The quote visit is where the
 * switchboard, the wall and the old unit were photographed, and it's usually
 * another job (as the install pack found, 27 Oct).
 */
async function quoteJobs(jobIds: number[]): Promise<number[]> {
  if (!jobIds.length) return [];
  const jobs = await sbSelect<{ est: string | null }>("st_jobs", [q.select("est:raw->>createdFromEstimateId"), `id=in.(${jobIds.join(",")})`].join("&")).catch(() => []);
  const ests = jobs.map((j) => Number(j.est)).filter((n) => n > 0);
  if (!ests.length) return [];
  const rows = await sbSelect<{ job_id: number | null }>("st_estimates", [q.select("job_id"), `id=in.(${ests.join(",")})`].join("&")).catch(() => []);
  return [...new Set(rows.map((r) => Number(r.job_id)).filter((n) => n > 0 && !jobIds.includes(n)))];
}

/**
 * The files picked on a work order, downloaded for the email. Fails whole,
 * naming the file, so nothing half-attached goes out.
 *
 * `photos`: every photo on the work order's jobs and the jobs they were
 * quoted on goes too, newest first (Jake, 26 Oct, for the electrician; 31
 * Oct, every work order). Photos only, because the reason files are picked by
 * hand still holds for documents: an invoice or signed paperwork can sit on a
 * job. Unlike a picked file, a photo that won't download or won't fit is
 * left off rather than holding the work order back.
 *
 * `reports`: the Condition Reports on the same jobs, as PDFs.
 */
export async function jobFilesFor(d: WorkOrderDetails | null, opts: { photos?: boolean; reports?: boolean } = {}): Promise<{ filename: string; content: string }[] | { error: string }> {
  const picked = d?.files ?? [];
  const out: { filename: string; content: string }[] = [];
  let total = 0;
  for (const f of picked) {
    try {
      const { bytes } = await stDownload(stTenantPath("forms", `jobs/attachment/${f.id}`), MAX_TOTAL - total);
      total += bytes.length;
      out.push({ filename: f.name, content: Buffer.from(bytes).toString("base64") });
    } catch (e) {
      return { error: `Couldn't attach “${f.name}” from the job: ${(e as Error).message.replace(/^ServiceTitan \S+ failed: /, "")}.` };
    }
  }
  const own = d?.jobs?.map((j) => j.job_id) ?? [];
  const jobs = (opts.photos || opts.reports) && own.length ? [...own, ...(await quoteJobs(own))] : [];
  // The Condition Reports on the same jobs, each made into a PDF (Jake, 31
  // Oct). Before the photos, so the 25 MB cap leaves out a photo rather than
  // a report. Its photos are among the job's files and go as photos. A report
  // that can't be read or made is left off, as a photo is, rather than holding
  // the work order back: the forms scope may not be granted, and ServiceTitan
  // may be slow.
  if (opts.reports && jobs.length) {
    const subs = await conditionReports(jobs).catch(() => []);
    const names = new Set(out.map((o) => o.filename));
    for (const sub of subs) {
      try {
        const r = toReport(sub);
        const bytes = await reportPdf(r, new Date());
        if (total + bytes.length > MAX_TOTAL) continue;
        total += bytes.length;
        let name = reportFileName(r);
        if (names.has(name)) name = name.replace(/\.pdf$/, ` (${sub.id}).pdf`);
        names.add(name);
        out.push({ filename: name, content: Buffer.from(bytes).toString("base64") });
      } catch {
        // Left off; see above.
      }
    }
  }
  if (opts.photos && jobs.length) {
    const have = new Set(picked.map((f) => f.id));
    const photos: JobFile[] = [];
    for (const id of jobs) {
      const r = await listJobFiles(id);
      if ("files" in r) photos.push(...r.files.filter((f) => PHOTO.test(f.name) && !have.has(f.id)));
    }
    photos.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
    const names = new Set(out.map((o) => o.filename));
    const take = photos.slice(0, MAX_PHOTOS);
    for (let i = 0; i < take.length; i += AT_ONCE) {
      const got = await Promise.all(take.slice(i, i + AT_ONCE).map((f) =>
        stDownload(stTenantPath("forms", `jobs/attachment/${f.id}`), MAX_TOTAL).then(({ bytes }) => ({ f, bytes }), () => null)));
      for (const g of got) {
        // Too big for what's left of the email, or ServiceTitan wouldn't hand it over: send without it.
        if (!g || total + g.bytes.length > MAX_TOTAL) continue;
        total += g.bytes.length;
        // Phones name every photo IMG_0001.jpg; two jobs' worth can clash.
        const name = names.has(g.f.name) ? g.f.name.replace(/(\.[^.]+)$/, `-${g.f.id}$1`) : g.f.name;
        names.add(name);
        out.push({ filename: name, content: Buffer.from(g.bytes).toString("base64") });
      }
    }
  }
  return out;
}

/** Vercel returns at most 4.5 MB from a function: a file bigger than this, sent through, would fail. */
const MAX_THROUGH = 4 * 1048576;

/**
 * One job file to look at, for the picker's previews and its View link: a
 * link straight to where ServiceTitan keeps it when it redirects there, or
 * the file itself when it doesn't (and it's small enough to pass on).
 */
export async function jobFileToShow(id: number): Promise<{ url: string } | { bytes: Uint8Array; mime: string } | { error: string }> {
  try {
    return await stFileOrLink(stTenantPath("forms", `jobs/attachment/${id}`), MAX_THROUGH);
  } catch (e) {
    return { error: (e as Error).message.replace(/^ServiceTitan \S+ failed: /, "") };
  }
}
