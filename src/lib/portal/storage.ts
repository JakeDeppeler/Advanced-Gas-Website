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

/**
 * `bucket` defaults to the van photos'. The website form's photos have their
 * own private bucket ("lead-photos", migration 0091), read the same way.
 */
export async function uploadPhoto(path: string, body: ArrayBuffer | Uint8Array, contentType: string, bucket = BUCKET): Promise<{ ok: boolean; error?: string }> {
  const c = conf();
  if (!c) return { ok: false, error: "not-configured" };
  const res = await fetch(`${c.url}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
    method: "POST",
    headers: { ...auth(c.key), "Content-Type": contentType, "x-upsert": "true" },
    body,
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: `${res.status}` };
  return { ok: true };
}

export async function deletePhoto(path: string, bucket = BUCKET): Promise<{ ok: boolean }> {
  const c = conf();
  if (!c) return { ok: false };
  const res = await fetch(`${c.url}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
    method: "DELETE", headers: auth(c.key), cache: "no-store",
  });
  return { ok: res.ok };
}

/**
 * Signed URLs for a batch of paths in one call. An hour is long enough to look
 * through a check and short enough that a copied link stops working.
 */
export async function signedUrls(paths: string[], seconds = 3600, bucket = BUCKET): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const c = conf();
  if (!c || paths.length === 0) return out;
  // Photos are the one thing on a page that can go missing without the page
  // being wrong, so a storage hiccup costs the thumbnails, never the page.
  let rows: { path?: string; signedURL?: string; error?: string | null }[] = [];
  try {
    const res = await fetch(`${c.url}/storage/v1/object/sign/${bucket}`, {
      method: "POST",
      headers: { ...auth(c.key), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: seconds, paths }),
      cache: "no-store",
    });
    if (!res.ok) return out;
    rows = (await res.json()) as typeof rows;
  } catch {
    return out;
  }
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r.path && r.signedURL) out.set(r.path, `${c.url}/storage/v1${r.signedURL}`);
  }
  return out;
}

/**
 * One object's bytes, read on the server. For files that are served through
 * a route of our own — the wall board's sounds, which the television fetches
 * with its screen token rather than a portal session or a signed URL that
 * would expire on a board left running for weeks.
 */
export async function readObject(path: string, bucket = BUCKET): Promise<{ ok: true; body: ArrayBuffer; type: string } | { ok: false; status: number }> {
  const c = conf();
  if (!c) return { ok: false, status: 503 };
  const res = await fetch(`${c.url}/storage/v1/object/${bucket}/${encodeURI(path)}`, { headers: auth(c.key), cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return { ok: false, status: res?.status ?? 502 };
  return { ok: true, body: await res.arrayBuffer(), type: res.headers.get("content-type") || "application/octet-stream" };
}


/**
 * A one-time link the browser uploads a file to directly. Library files
 * (price lists, manuals) can be 25MB; sent through a server action they hit
 * the host's 4.5MB request limit and failed, so the file goes straight to
 * storage and only its details come to the server. Valid for two hours.
 */
export async function signedUploadUrl(path: string, bucket: string): Promise<string | null> {
  const c = conf();
  if (!c) return null;
  const res = await fetch(`${c.url}/storage/v1/object/upload/sign/${bucket}/${encodeURI(path)}`, {
    method: "POST", headers: { ...auth(c.key), "Content-Type": "application/json" }, body: "{}", cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => null)) as { url?: string } | null;
  return j?.url ? `${c.url}/storage/v1${j.url.startsWith("/") ? "" : "/"}${j.url}` : null;
}

/** Whether a file is in storage: checked before a browser upload is recorded, so a row never points at nothing. */
export async function objectExists(path: string, bucket: string): Promise<boolean> {
  const c = conf();
  if (!c) return false;
  const res = await fetch(`${c.url}/storage/v1/object/info/${bucket}/${encodeURI(path)}`, { headers: auth(c.key), cache: "no-store" }).catch(() => null);
  return !!res?.ok;
}
