import { uploadPhoto } from "./storage";

type Photo = { name?: string; type?: string; data?: string };

/**
 * A lead's photos, into the private lead-photos bucket under the lead's
 * id, and their paths onto the row. Each is the base64 the form sent (a
 * data: URL prefix is allowed for). A photo that won't store is skipped:
 * the email still carries it, and the page counts what's missing.
 *
 * Shared by the quote route, which gets the older forms' photos with the
 * lead, and the homepage form's photos route, which sends them after it.
 */
export async function keepPhotos(leadId: string, photos: Photo[]) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !photos.length) return;
  const paths: string[] = [];
  for (const [i, p] of photos.slice(0, 10).entries()) {
    if (!p?.data) continue;
    const b64 = p.data.replace(/^data:[^;]+;base64,/, "");
    const type = p.type && /^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(p.type) ? p.type : "image/jpeg";
    const safe = (p.name || `photo-${i + 1}.jpg`).replace(/[^\w.-]+/g, "-").slice(-80);
    const path = `${leadId}/${i + 1}-${safe}`;
    const up = await uploadPhoto(path, new Uint8Array(Buffer.from(b64, "base64")), type, "lead-photos");
    if (up.ok) paths.push(path);
  }
  if (!paths.length) return;
  await fetch(`${url}/rest/v1/portal_leads?id=eq.${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ photo_paths: paths }),
  });
}
