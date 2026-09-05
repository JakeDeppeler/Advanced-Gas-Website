/**
 * Van photos in Supabase Storage.
 *
 * The bucket is private: nothing is served straight from it. Reads go out as
 * short-lived signed URLs minted on the server, so a photo of the inside of a
 * van can't be guessed at by anyone who isn't signed into the portal.
 */

import "server-only";

const BUCKET = "van-photos";

function conf() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

const auth = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });

export async function uploadPhoto(path: string, body: ArrayBuffer, contentType: string): Promise<{ ok: boolean; error?: string }> {
  const c = conf();
  if (!c) return { ok: false, error: "not-configured" };
  const res = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    method: "POST",
    headers: { ...auth(c.key), "Content-Type": contentType, "x-upsert": "true" },
    body,
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deletePhoto(path: string): Promise<{ ok: boolean }> {
  const c = conf();
  if (!c) return { ok: false };
  const res = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    method: "DELETE", headers: auth(c.key), cache: "no-store",
  });
  return { ok: res.ok };
}

/**
 * Signed URLs for a batch of paths in one call. An hour is long enough to look
 * through a check and short enough that a copied link stops working.
 */
export async function signedUrls(paths: string[], seconds = 3600): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const c = conf();
  if (!c || paths.length === 0) return out;
  const res = await fetch(`${c.url}/storage/v1/object/sign/${BUCKET}`, {
    method: "POST",
    headers: { ...auth(c.key), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: seconds, paths }),
    cache: "no-store",
  });
  if (!res.ok) return out;
  const rows = (await res.json()) as { path?: string; signedURL?: string; error?: string | null }[];
  for (const r of rows) {
    if (r.path && r.signedURL) out.set(r.path, `${c.url}/storage/v1${r.signedURL}`);
  }
  return out;
}
