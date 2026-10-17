"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import {
  createCampaign, updateCampaign, deleteCampaign,
  createBrandAsset,
} from "@/lib/portal/db";
import { uploadPhoto, deletePhoto } from "@/lib/portal/storage";
import { sbDelete, sbUpsert } from "@/lib/dashboard/db";
import { cleanEmail } from "@/lib/emailList/types";
import { createFolder, deleteFileRow, listFolders, moveFile, setFileArchived, setFolderArchived } from "@/lib/portal/brandFiles";

export type MarketingResult = { ok: boolean; error?: string };

/** Marketing is behind the same capability the page is. */
async function requireMarketing() {
  const me = await getPortalUser();
  return me && can(me, "overhead") ? me : null;
}

export async function addCampaign(input: {
  name: string; blurb: string; channel: string; audience: string; status: string;
  monthlySpend: string; owner: string; utmCampaign: string;
}): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can change campaigns." };
  if (!input.name.trim()) return { ok: false, error: "Give it a name." };

  // Blank means we don't record a spend for it, which is not the same as $0 —
  // a campaign costing nothing and a campaign we haven't costed read very
  // differently next to a cost-per-lead.
  const spend = input.monthlySpend.trim() === "" ? null : Number(input.monthlySpend.replace(/[^0-9.]/g, ""));
  if (spend !== null && !Number.isFinite(spend)) return { ok: false, error: "The spend has to be a number." };

  const res = await createCampaign({
    name: input.name.trim(), blurb: input.blurb.trim(), channel: input.channel.trim(),
    audience: input.audience, status: input.status, monthlySpend: spend,
    owner: input.owner.trim() || me.name, utmCampaign: input.utmCampaign.trim(),
  });
  if (!res.ok) return { ok: false, error: res.error === "not-configured" ? "The database isn't connected." : "Couldn't save it." };
  revalidatePath("/portal/marketing");
  return { ok: true };
}

export async function setCampaignStatus(input: { id: string; status: string }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can change campaigns." };
  const res = await updateCampaign(input.id, { status: input.status });
  if (!res.ok) return { ok: false, error: "Couldn't change it." };
  revalidatePath("/portal/marketing");
  return { ok: true };
}

export async function removeCampaign(input: { id: string }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can remove a campaign." };
  const res = await deleteCampaign(input.id);
  if (!res.ok) return { ok: false, error: "Couldn't remove it." };
  revalidatePath("/portal/marketing");
  return { ok: true };
}

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const filesDone = () => { revalidatePath("/portal/marketing"); revalidatePath("/portal/materials"); };

/** What kind a file is, from what it is: the kit's four kinds, for filtering. */
function kindOf(mime: string, name: string): string {
  if (/svg|logo/i.test(name) || mime === "image/svg+xml") return "logo";
  if (mime.startsWith("image/")) return "photo";
  if (mime === "application/pdf" || /\.(pdf|docx?|xlsx?|pptx?)$/i.test(name)) return "document";
  return "other";
}

/**
 * Files into the kit, into a folder when one's open: one or many at once,
 * each named after itself unless a name is given (only used for a single
 * file). Up to 25MB each; nothing is public, a download is a signed link.
 */
export async function uploadBrandAsset(form: FormData): Promise<MarketingResult & { added?: number }> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can add files." };
  const folder = String(form.get("folder") || "");
  const folderId = isUuid(folder) ? folder : null;
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Pick a file." };
  const big = files.find((f) => f.size > 25 * 1024 * 1024);
  if (big) return { ok: false, error: `${big.name} is over 25MB.` };
  const given = String(form.get("label") || "").trim();

  let added = 0;
  for (const file of files) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `brand/${crypto.randomUUID()}.${ext}`;
    const up = await uploadPhoto(path, await file.arrayBuffer(), file.type || "application/octet-stream");
    if (!up.ok) return { ok: false, error: up.error === "not-configured" ? "File storage isn't set up." : `Couldn't upload ${file.name}.`, added };
    const label = (files.length === 1 && given) ? given : file.name.replace(/\.[^.]+$/, "");
    const row = await createBrandAsset({ label, kind: kindOf(file.type, file.name), path, mime: file.type || null, bytes: file.size, addedBy: me.name, folderId });
    if (!row.ok) {
      // Don't leave the file orphaned in the bucket if the row didn't land.
      await deletePhoto(path);
      return { ok: false, error: `Couldn't save ${file.name}.`, added };
    }
    added += 1;
  }
  filesDone();
  return { ok: true, added };
}

export async function newFolder(input: { name: string; parentId: string | null }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can add folders." };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Give the folder a name." };
  const parentId = isUuid(input.parentId) ? input.parentId : null;
  const siblings = (await listFolders()).filter((f) => f.parentId === parentId && !f.archivedAt);
  if (siblings.some((f) => f.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: `There's already a ${name} folder here.` };
  try { await createFolder(name, parentId, me.name); } catch { return { ok: false, error: "Couldn't make the folder." }; }
  filesDone();
  return { ok: true };
}

/** Archive or restore a file or a folder (a folder takes everything in it along). */
export async function archiveItem(input: { kind: "file" | "folder"; id: string; archived: boolean }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can archive files." };
  if (!isUuid(input.id)) return { ok: false, error: "Which one?" };
  try {
    if (input.kind === "folder") await setFolderArchived(input.id, input.archived);
    else await setFileArchived(input.id, input.archived);
  } catch { return { ok: false, error: "Couldn't change it." }; }
  filesDone();
  return { ok: true };
}

export async function moveBrandFile(input: { id: string; folderId: string | null }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can move files." };
  if (!isUuid(input.id)) return { ok: false, error: "Which file?" };
  try { await moveFile(input.id, isUuid(input.folderId) ? input.folderId : null); } catch { return { ok: false, error: "Couldn't move it." }; }
  filesDone();
  return { ok: true };
}

/** Delete an archived file for good: the row and the file in storage. Only archived ones. */
export async function removeBrandAsset(input: { id: string; path: string }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can delete a file." };
  if (!isUuid(input.id) || !input.path.startsWith("brand/")) return { ok: false, error: "Which file?" };
  try { await deleteFileRow(input.id); } catch { return { ok: false, error: "Couldn't delete it." }; }
  await deletePhoto(input.path);
  filesDone();
  return { ok: true };
}

/**
 * Leave addresses off the email list — someone who unsubscribed, asked not to
 * be emailed, or bounced. Kept by address, so they stay off whichever source
 * they turn up in next.
 */
export async function optOutEmails(raw: string, reason?: string): Promise<MarketingResult & { added?: number }> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can change the email list." };
  const emails = [...new Set(raw.split(/[\s,;]+/).map((e) => cleanEmail(e)).filter((e): e is string => !!e))];
  if (!emails.length) return { ok: false, error: "No email addresses in that." };
  try {
    await sbUpsert("portal_email_optouts", emails.map((email) => ({ email, reason: reason?.slice(0, 200) || null, created_by: me.name })), "email");
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/marketing");
  return { ok: true, added: emails.length };
}

/** Put an address back on the list. */
export async function optInEmail(raw: string): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can change the email list." };
  const email = cleanEmail(raw);
  if (!email) return { ok: false, error: "That isn't an email address." };
  try {
    await sbDelete("portal_email_optouts", `email=eq.${encodeURIComponent(email)}`);
  } catch {
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/portal/marketing");
  return { ok: true };
}
