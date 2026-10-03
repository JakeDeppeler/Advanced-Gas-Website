import "server-only";

/**
 * Cover photos for blog posts, in Supabase Storage.
 *
 * Unlike the van photos next door, this bucket is **public**: the image ends
 * up in an `<img>` on a page Google crawls, and a signed URL that expires in
 * an hour would be a broken image by the afternoon. Nothing private goes in
 * here, and the upload is behind `manage_users` either way.
 *
 * The bucket itself caps the size and the types; these checks are here so a
 * person gets a sentence rather than a 400.
 */

const BUCKET = "blog-photos";
export const MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function conf() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

/** Where the public will read it from. */
export function publicUrl(path: string): string | null {
  const c = conf();
  if (!c) return null;
  return `${c.url}/storage/v1/object/public/${BUCKET}/${encodeURI(path)}`;
}

export async function uploadCover(
  path: string, body: ArrayBuffer, contentType: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const c = conf();
  if (!c) return { ok: false, error: "Storage isn't configured." };
  if (!ALLOWED.includes(contentType)) return { ok: false, error: "JPEG, PNG, WebP or AVIF only." };
  if (body.byteLength > MAX_BYTES) return { ok: false, error: "That's over 5 MB — resize it first." };

  const res = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    method: "POST",
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });
  // Never echo the response body: it can carry the project ref and, on some
  // errors, the key that was used.
  if (!res.ok) return { ok: false, error: `Upload failed (${res.status}).` };

  const url = publicUrl(path);
  return url ? { ok: true, url } : { ok: false, error: "Uploaded, but couldn't work out its address." };
}
