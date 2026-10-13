import "server-only";
import { sbInsert, sbSelect, sbUpdate, sbDelete } from "@/lib/dashboard/db";

/**
 * Marketing › Files: the brand kit as folders. Files and folders are archived
 * rather than deleted, and come back with Restore; only "Delete for good" on
 * an archived file takes it out of storage (migration 0074).
 */

export type BrandFolder = { id: string; name: string; parentId: string | null; archivedAt: string | null; createdBy: string | null; createdAt: string };
export type BrandFile = {
  id: string; label: string; kind: string; path: string; mime: string | null; bytes: number | null;
  folderId: string | null; archivedAt: string | null; addedBy: string | null; createdAt: string;
};

type FolderRow = { id: string; name: string; parent_id: string | null; archived_at: string | null; created_by: string | null; created_at: string };
type FileRow = { id: string; label: string; kind: string; path: string; mime: string | null; bytes: number | string | null; folder_id: string | null; archived_at: string | null; added_by: string | null; created_at: string };

export async function listFolders(): Promise<BrandFolder[]> {
  const rows = await sbSelect<FolderRow>("portal_brand_folders", "select=*&order=name.asc");
  return rows.map((r) => ({ id: r.id, name: r.name, parentId: r.parent_id, archivedAt: r.archived_at, createdBy: r.created_by, createdAt: r.created_at }));
}

export async function listFiles(): Promise<BrandFile[]> {
  const rows = await sbSelect<FileRow>("portal_brand_assets", "select=id,label,kind,path,mime,bytes,folder_id,archived_at,added_by,created_at&order=created_at.desc");
  return rows.map((r) => ({
    id: r.id, label: r.label, kind: r.kind, path: r.path, mime: r.mime, bytes: r.bytes == null ? null : Number(r.bytes),
    folderId: r.folder_id, archivedAt: r.archived_at, addedBy: r.added_by, createdAt: r.created_at,
  }));
}

export const createFolder = (name: string, parentId: string | null, who: string) =>
  sbInsert("portal_brand_folders", { name, parent_id: parentId, created_by: who });

const id = (s: string) => `id=eq.${encodeURIComponent(s)}`;

export const setFolderArchived = (folderId: string, on: boolean) =>
  sbUpdate("portal_brand_folders", id(folderId), { archived_at: on ? new Date().toISOString() : null });
export const renameFolder = (folderId: string, name: string) => sbUpdate("portal_brand_folders", id(folderId), { name });
export const setFileArchived = (fileId: string, on: boolean) =>
  sbUpdate("portal_brand_assets", id(fileId), { archived_at: on ? new Date().toISOString() : null });
export const moveFile = (fileId: string, folderId: string | null) => sbUpdate("portal_brand_assets", id(fileId), { folder_id: folderId });
export const deleteFileRow = (fileId: string) => sbDelete("portal_brand_assets", `${id(fileId)}&archived_at=not.is.null`);

/** A folder and every folder under it, for "is this archived somewhere up the tree". */
export function trail(folders: BrandFolder[], folderId: string | null): BrandFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const out: BrandFolder[] = [];
  for (let f = folderId ? byId.get(folderId) : undefined; f && out.length < 20; f = f.parentId ? byId.get(f.parentId) : undefined) out.unshift(f);
  return out;
}
