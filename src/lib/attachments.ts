/**
 * Reading files off a form and onto the enquiry.
 *
 * Drawings, not photographs. A mechanical schedule is a PDF and a set of
 * plans is usually a big one, so the cap is per-file and the total is
 * checked too: the whole enquiry goes to the API as one JSON body, and
 * Vercel refuses it silently past a few megabytes. Failing loudly at 18 MB
 * on the client is better than a lead that vanishes.
 *
 * Shared by the commercial scope form and the contact page's form so the
 * two cannot drift apart on what they will accept.
 */

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
export const ATTACH_ACCEPT = ".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.zip";

export type EncodedFile = { name: string; type: string; data: string };

export function readAsBase64(file: File) {
  return new Promise<EncodedFile>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: String(r.result).split(",")[1] ?? "",
      });
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

export function niceSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
