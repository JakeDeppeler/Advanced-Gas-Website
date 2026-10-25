import "server-only";
import { stDownload, stFetch, stFileOrLink, stTenantPath } from "@/lib/dashboard/servicetitan";
import type { WorkOrderDetails } from "./plan";

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
/** Enough to show the switchboard, the run and the wall; a dozen downloads also fits inside a 60 s function. */
const MAX_PHOTOS = 12;

/**
 * The files picked on a work order, downloaded for the email. Fails whole,
 * naming the file, so nothing half-attached goes out.
 *
 * `photos`: every photo on the work order's jobs goes too, newest first
 * (Jake, 26 Oct: the electrician should get the job's photos without anyone
 * picking them). Photos only, because the reason files are picked by hand
 * still holds for documents: an invoice or signed paperwork can sit on a
 * job. Unlike a picked file, a photo that won't download or won't fit is
 * left off rather than holding the work order back.
 */
export async function jobFilesFor(d: WorkOrderDetails | null, opts: { photos?: boolean } = {}): Promise<{ filename: string; content: string }[] | { error: string }> {
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
  if (opts.photos && d?.jobs?.length) {
    const have = new Set(picked.map((f) => f.id));
    const photos: JobFile[] = [];
    for (const j of d.jobs) {
      const r = await listJobFiles(j.job_id);
      if ("files" in r) photos.push(...r.files.filter((f) => PHOTO.test(f.name) && !have.has(f.id)));
    }
    photos.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
    const names = new Set(out.map((o) => o.filename));
    for (const f of photos.slice(0, MAX_PHOTOS)) {
      try {
        const { bytes } = await stDownload(stTenantPath("forms", `jobs/attachment/${f.id}`), MAX_TOTAL - total);
        total += bytes.length;
        // Phones name every photo IMG_0001.jpg; two jobs' worth can clash.
        const name = names.has(f.name) ? f.name.replace(/(\.[^.]+)$/, `-${f.id}$1`) : f.name;
        names.add(name);
        out.push({ filename: name, content: Buffer.from(bytes).toString("base64") });
      } catch {
        // Too big for what's left of the email, or ServiceTitan wouldn't hand it over: send without it.
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
