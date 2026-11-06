"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import {
  createCampaign, updateCampaign, deleteCampaign,
  createBrandAsset,
} from "@/lib/portal/db";
import { deletePhoto, objectExists, signedUploadUrl } from "@/lib/portal/storage";
import { sbDelete, sbUpsert } from "@/lib/dashboard/db";
import { cleanEmail } from "@/lib/emailList/types";
import { createFolder, deleteFileRow, listFolders, moveFile, setFileArchived, setFolderArchived, type Library } from "@/lib/portal/brandFiles";

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
const filesDone = () => { revalidatePath("/portal/marketing"); revalidatePath("/portal/materials"); revalidatePath("/portal/resources"); };
/** Which shelf of the library: Marketing › Materials, or Team › Resources (0102). */
const shelf = (v: unknown): Library => (v === "resources" ? "resources" : "brand");
/** A folder id, only if it's on this shelf: a file can't be put in the other shelf's folder. */
async function folderOn(library: Library, id: unknown): Promise<string | null> {
  if (!isUuid(id)) return null;
  return (await listFolders(library)).some((f) => f.id === id) ? id : null;
}

/** What kind a file is, from what it is: the kit's four kinds, for filtering. */
function kindOf(mime: string, name: string): string {
  if (/svg|logo/i.test(name) || mime === "image/svg+xml") return "logo";
  if (mime.startsWith("image/")) return "photo";
  if (mime === "application/pdf" || /\.(pdf|docx?|xlsx?|pptx?)$/i.test(name)) return "document";
  return "other";
}

/** The bucket the files library keeps its files in (0103): any type, 25MB each. */
const LIBRARY_BUCKET = "library";
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Step one of adding files to the library: a one-time upload link each. The
 * browser sends each file straight to storage (a 25MB manual through a server
 * action broke on the host's 4.5MB request limit), then calls
 * finishLibraryUpload with what went.
 */
export async function startLibraryUpload(input: { library: string; files: { name: string; size: number }[] }): Promise<MarketingResult & { slots?: { path: string; url: string }[] }> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only the office can add files." };
  const library = shelf(input.library);
  const files = (Array.isArray(input.files) ? input.files : []).slice(0, 30);
  if (!files.length) return { ok: false, error: "Pick a file." };
  const big = files.find((f) => !(Number(f.size) > 0) || Number(f.size) > MAX_BYTES);
  if (big) return { ok: false, error: `${big.name} is ${Number(big.size) > 0 ? "over 25MB" : "empty"}.` };
  const slots: { path: string; url: string }[] = [];
  for (const f of files) {
    const ext = (String(f.name).split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
    const path = `${library}/${crypto.randomUUID()}.${ext}`;
    const url = await signedUploadUrl(path, LIBRARY_BUCKET);
    if (!url) return { ok: false, error: "File storage isn't answering. Try again in a minute." };
    slots.push({ path, url });
  }
  return { ok: true, slots };
}

/**
 * Step two: record each file the browser uploaded, after checking it's really
 * in storage, so a row never points at nothing. Named after the file unless a
 * name is given for a single one.
 */
export async function finishLibraryUpload(input: {
  library: string; folderId: string | null; label?: string;
  items: { path: string; name: string; type: string; size: number }[];
}): Promise<MarketingResult & { added?: number }> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only the office can add files." };
  const library = shelf(input.library);
  const folderId = await folderOn(library, input.folderId);
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 30);
  const given = String(input.label ?? "").trim();
  let added = 0;
  for (const it of items) {
    const path = String(it.path ?? "");
    if (!new RegExp(`^${library}/[0-9a-f-]{36}\\.[a-z0-9]{1,8}$`).test(path)) continue;
    if (!(await objectExists(path, LIBRARY_BUCKET))) return { ok: false, error: `${it.name} didn't reach storage. Try it again.`, added };
    const name = String(it.name ?? "file");
    const type = String(it.type ?? "");
    const label = (items.length === 1 && given) ? given.slice(0, 160) : name.replace(/\.[^.]+$/, "").slice(0, 160);
    const row = await createBrandAsset({ label, kind: kindOf(type, name), path, mime: type || null, bytes: Number(it.size) || null, addedBy: me.name, folderId, library });
    if (!row.ok) {
      await deletePhoto(path, LIBRARY_BUCKET);
      return { ok: false, error: `Couldn't save ${name}.`, added };
    }
    added += 1;
  }
  filesDone();
  return { ok: true, added };
}

export async function newFolder(input: { name: string; parentId: string | null; library?: Library }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can add folders." };
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Give the folder a name." };
  const library = shelf(input.library);
  const parentId = await folderOn(library, input.parentId);
  const siblings = (await listFolders(library)).filter((f) => f.parentId === parentId && !f.archivedAt);
  if (siblings.some((f) => f.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: `There's already a ${name} folder here.` };
  try { await createFolder(name, parentId, me.name, library); } catch { return { ok: false, error: "Couldn't make the folder." }; }
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

export async function moveBrandFile(input: { id: string; folderId: string | null; library?: Library }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can move files." };
  if (!isUuid(input.id)) return { ok: false, error: "Which file?" };
  try { await moveFile(input.id, await folderOn(shelf(input.library), input.folderId)); } catch { return { ok: false, error: "Couldn't move it." }; }
  filesDone();
  return { ok: true };
}

/** Delete an archived file for good: the row and the file in storage. Only archived ones. */
export async function removeBrandAsset(input: { id: string; path: string }): Promise<MarketingResult> {
  const me = await requireMarketing();
  if (!me) return { ok: false, error: "Only an admin can delete a file." };
  if (!isUuid(input.id) || !/^(brand|resources)\//.test(input.path)) return { ok: false, error: "Which file?" };
  try { await deleteFileRow(input.id); } catch { return { ok: false, error: "Couldn't delete it." }; }
  await deletePhoto(input.path, LIBRARY_BUCKET);
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
