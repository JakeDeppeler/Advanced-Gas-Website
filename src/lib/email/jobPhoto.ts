import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { stFetch, stTenantPath } from "@/lib/dashboard/servicetitan";
import { site } from "@/lib/site";

/**
 * A photo the tech took on the job, for the top of the customer's email
 * (Jake, 8 Nov: "should we use a photo they take on site?"). Their own new
 * system on their own wall beats any stock shot.
 *
 * The newest JPG or PNG on the job: techs photograph the finished work last.
 * Phone photos are several megabytes, so it's shrunk to 1200px by Next's own
 * image optimiser (no new dependency) via /api/email-photo, then attached to
 * the email by inline.ts. That route only serves an attachment id signed
 * here, so nobody can walk through job photos by guessing numbers, and the
 * URL never goes in an email: the picture is inside it.
 */

const PHOTO = /\.(jpe?g|png)$/i;

const secret = () => process.env.PORTAL_AUTH_SECRET ?? "";

export function photoSig(id: number): string {
  return createHmac("sha256", secret()).update(`email-photo:${id}`).digest("hex").slice(0, 32);
}

export function photoSigOk(id: number, sig: string): boolean {
  if (!secret() || !/^[0-9a-f]{32}$/.test(sig)) return false;
  return timingSafeEqual(Buffer.from(photoSig(id)), Buffer.from(sig));
}

type Raw = { id?: number; fileName?: string | null; originalFileName?: string | null; name?: string | null; createdOn?: string | null; active?: boolean };

/** The optimised URL for the job's newest photo, or null (no photo, no access, no secret). */
export async function jobSitePhoto(jobId: number): Promise<string | null> {
  if (!secret()) return null;
  try {
    const r = await stFetch<{ data?: Raw[] }>(stTenantPath("forms", `jobs/${jobId}/attachments`), { page: "1", pageSize: "100" });
    const photo = (r.data ?? [])
      .filter((a) => typeof a.id === "number" && a.active !== false && PHOTO.test(a.fileName || a.originalFileName || a.name || ""))
      .sort((a, b) => (b.createdOn ?? "").localeCompare(a.createdOn ?? ""))[0];
    if (!photo) return null;
    const local = `/api/email-photo/${photo.id}?s=${photoSig(photo.id!)}`;
    return `${site.url.replace(/\/$/, "")}/_next/image?url=${encodeURIComponent(local)}&w=1200&q=72`;
  } catch {
    return null;
  }
}
