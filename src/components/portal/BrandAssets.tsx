"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveItem, moveBrandFile, newFolder, removeBrandAsset, uploadBrandAsset } from "@/app/portal/marketing/actions";
import type { BrandFile, BrandFolder } from "@/lib/portal/brandFiles";

const size = (b: number | null) =>
  b == null ? "" : b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
/** "PDF", "PNG" — what the file is, from its type or its name. */
const ext = (f: Pick<BrandFile, "mime" | "path">) =>
  (f.mime === "application/pdf" ? "pdf" : f.mime?.startsWith("image/") ? f.mime.slice(6).replace("svg+xml", "svg").replace("jpeg", "jpg") : f.path.split(".").pop() ?? "file").toUpperCase().slice(0, 4);
const href = (folderId: string | null, archived = false) =>
  `/portal/marketing?tab=assets${folderId ? `&f=${folderId}` : ""}${archived ? "&v=archived" : ""}`;
const fileUrl = (f: BrandFile, download: boolean) =>
  `/api/portal/asset?path=${encodeURIComponent(f.path)}${download ? `&dl=${encodeURIComponent(`${f.label}.${ext(f).toLowerCase()}`)}` : ""}`;

/**
 * Marketing › Files: the brand kit in folders. Open a folder, make one inside
 * it, upload PDFs and pictures into it, download them. Archive rather than
 * delete — archived things sit on the Archived tab and come back with Restore;
 * only there can a file be deleted for good.
 */
export function BrandAssets({ folders, files, folderId, archived, canEdit }: {
  folders: BrandFolder[]; files: BrandFile[]; folderId: string | null; archived: boolean; canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [sure, setSure] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  const byId = new Map(folders.map((f) => [f.id, f]));
  // A folder counts as archived when it or any folder above it is.
  const hidden = (f: BrandFolder | undefined): boolean => !!f && (!!f.archivedAt || hidden(f.parentId ? byId.get(f.parentId) : undefined));
  const crumbs: BrandFolder[] = [];
  for (let f = folderId ? byId.get(folderId) : undefined; f && crumbs.length < 20; f = f.parentId ? byId.get(f.parentId) : undefined) crumbs.unshift(f);
  const liveFiles = files.filter((f) => !f.archivedAt && !hidden(f.folderId ? byId.get(f.folderId) : undefined));
  const countIn = (id: string) => liveFiles.filter((f) => f.folderId === id).length;

  const subfolders = folders.filter((f) => f.parentId === folderId && !f.archivedAt);
  const here = liveFiles.filter((f) => f.folderId === folderId);
  const archFolders = folders.filter((f) => f.archivedAt);
  const archFiles = files.filter((f) => f.archivedAt);
  const allFolders = folders.filter((f) => !hidden(f));
  const path = (f: BrandFolder) => {
    const parts: string[] = [];
    for (let x: BrandFolder | undefined = f; x && parts.length < 20; x = x.parentId ? byId.get(x.parentId) : undefined) parts.unshift(x.name);
    return parts.join(" › ");
  };

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => start(async () => {
    const r = await fn();
    setMsg(r.ok ? (ok ? { ok: true, text: ok } : null) : { ok: false, text: r.error ?? "Couldn’t do that." });
    if (r.ok) router.refresh();
  });

  const upload = () => {
    const list = picker.current?.files;
    if (!list?.length) return;
    const fd = new FormData();
    if (folderId) fd.set("folder", folderId);
    for (const f of Array.from(list)) fd.append("file", f);
    act(async () => {
      const r = await uploadBrandAsset(fd);
      if (picker.current) picker.current.value = "";
      return r;
    }, `${list.length} file${list.length === 1 ? "" : "s"} added.`);
  };

  return (
    <div className="pk">
      <div className="pk-files-bar">
        <nav className="pk-crumbs" aria-label="Folder">
          <Link href={href(null, archived)}>Files</Link>
          {!archived && crumbs.map((c) => <span key={c.id}> › <Link href={href(c.id)}>{c.name}</Link></span>)}
          {archived && <span> › Archived</span>}
        </nav>
        <span className="pk-seg" role="tablist" aria-label="Files or archived">
          <Link href={href(null)} className={!archived ? "on" : undefined} aria-current={!archived ? "page" : undefined}>Files</Link>
          <Link href={href(null, true)} className={archived ? "on" : undefined} aria-current={archived ? "page" : undefined}>
            Archived{archFolders.length + archFiles.length ? ` · ${archFolders.length + archFiles.length}` : ""}
          </Link>
        </span>
      </div>

      {!archived && canEdit && (
        <div className="pk-btns" style={{ alignItems: "center" }}>
          {naming ? (
            <>
              <input id="files-newfolder" className="pk-in" style={{ width: 220 }} autoFocus value={name} placeholder="Folder name" aria-label="Folder name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") act(async () => { const r = await newFolder({ name, parentId: folderId }); if (r.ok) { setName(""); setNaming(false); } return r; }); }} />
              <button type="button" className="pk-btn" disabled={busy} onClick={() => act(async () => { const r = await newFolder({ name, parentId: folderId }); if (r.ok) { setName(""); setNaming(false); } return r; })}>Make folder</button>
              <button type="button" className="pk-btn g" onClick={() => { setNaming(false); setName(""); }}>Cancel</button>
            </>
          ) : (
            <button type="button" className="pk-btn g" onClick={() => setNaming(true)}>+ New folder</button>
          )}
          <label className="pk-btn">
            {busy ? "Working…" : `Upload files${crumbs.length ? ` to ${crumbs[crumbs.length - 1].name}` : ""}`}
            <input id="files-upload" ref={picker} type="file" multiple hidden onChange={upload}
              accept=".pdf,.png,.jpg,.jpeg,.svg,.webp,.gif,.ai,.eps,.psd,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.mp4,.mov" />
          </label>
          <span className="pk-note">PDFs, pictures, artwork, up to 25MB each. Nothing here is public.</span>
        </div>
      )}
      {msg && <p className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}

      {!archived ? (
        <>
          {subfolders.length > 0 && (
            <div className="pk-folders">
              {subfolders.map((f) => (
                <div key={f.id} className="pk-card pk-folder">
                  <Link href={href(f.id)} className="pk-folder-go">
                    <span className="pk-folder-ic" aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2.2h8.4A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" /></svg>
                    </span>
                    <b>{f.name}</b>
                    <span className="pk-ks">{countIn(f.id)} file{countIn(f.id) === 1 ? "" : "s"}{folders.some((x) => x.parentId === f.id && !x.archivedAt) ? " · has folders" : ""}</span>
                  </Link>
                  {canEdit && <button type="button" className="pk-linkbtn" disabled={busy} onClick={() => act(() => archiveItem({ kind: "folder", id: f.id, archived: true }), `${f.name} archived, it's on the Archived tab.`)}>Archive</button>}
                </div>
              ))}
            </div>
          )}

          {/* A level that only holds folders needs no empty box under them. */}
          {(here.length > 0 || subfolders.length === 0) && <section className="pk-card pk-pad">
            <div className="pk-card-h"><b>{crumbs.length ? crumbs[crumbs.length - 1].name : "Files"}</b><span>{here.length} file{here.length === 1 ? "" : "s"}{subfolders.length ? ` · ${subfolders.length} folder${subfolders.length === 1 ? "" : "s"}` : ""}</span></div>
            {here.length === 0 ? (
              <div className="pk-empty">{subfolders.length ? "No files loose in here, they're in the folders above." : "Nothing in here yet. Upload files, or make a folder to keep them in."}</div>
            ) : (
              <div className="pk-filelist">
                {here.map((f) => (
                  <div key={f.id} className="pk-file">
                    <span className={`pk-filetype t-${ext(f).toLowerCase()}`}>{ext(f)}</span>
                    <span className="t"><b>{f.label}</b><span>{[size(f.bytes), `added ${day(f.createdAt)}`, f.addedBy].filter(Boolean).join(" · ")}</span></span>
                    <span className="pk-file-acts">
                      <a className="pk-btn" href={fileUrl(f, true)}>Download</a>
                      <a className="pk-btn g" href={fileUrl(f, false)} target="_blank" rel="noopener">Open</a>
                      {canEdit && (
                        <select className="pk-in" style={{ width: 150 }} value={f.folderId ?? ""} aria-label={`Move ${f.label} to`} disabled={busy}
                          onChange={(e) => act(() => moveBrandFile({ id: f.id, folderId: e.target.value || null }), "Moved.")}>
                          <option value="">Files (top)</option>
                          {allFolders.map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
                        </select>
                      )}
                      {canEdit && <button type="button" className="pk-linkbtn" disabled={busy} onClick={() => act(() => archiveItem({ kind: "file", id: f.id, archived: true }), `${f.label} archived.`)}>Archive</button>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>}
        </>
      ) : (
        <>
          <section className="pk-card pk-pad">
            <div className="pk-card-h"><b>Archived folders</b><span>restore one and everything in it comes back</span></div>
            {archFolders.length === 0 ? <div className="pk-empty">No archived folders.</div> : (
              <div className="pk-filelist">
                {archFolders.map((f) => (
                  <div key={f.id} className="pk-file">
                    <span className="pk-filetype">DIR</span>
                    <span className="t"><b>{path(f)}</b><span>{(() => { const n = files.filter((x) => x.folderId === f.id && !x.archivedAt).length; return `${n} file${n === 1 ? "" : "s"}`; })()} · archived {day(f.archivedAt!)}</span></span>
                    {canEdit && <span className="pk-file-acts"><button type="button" className="pk-btn g" disabled={busy} onClick={() => act(() => archiveItem({ kind: "folder", id: f.id, archived: false }), `${f.name} is back.`)}>Restore</button></span>}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="pk-card pk-pad">
            <div className="pk-card-h"><b>Archived files</b><span>still downloadable · delete for good only from here</span></div>
            {archFiles.length === 0 ? <div className="pk-empty">No archived files.</div> : (
              <div className="pk-filelist">
                {archFiles.map((f) => (
                  <div key={f.id} className="pk-file">
                    <span className={`pk-filetype t-${ext(f).toLowerCase()}`}>{ext(f)}</span>
                    <span className="t"><b>{f.label}</b><span>{[size(f.bytes), f.folderId && byId.get(f.folderId) ? `in ${path(byId.get(f.folderId)!)}` : "Files (top)", `archived ${day(f.archivedAt!)}`].filter(Boolean).join(" · ")}</span></span>
                    <span className="pk-file-acts">
                      <a className="pk-btn g" href={fileUrl(f, true)}>Download</a>
                      {canEdit && <button type="button" className="pk-btn g" disabled={busy} onClick={() => act(() => archiveItem({ kind: "file", id: f.id, archived: false }), `${f.label} is back.`)}>Restore</button>}
                      {canEdit && (sure === f.id ? (
                        <>
                          <button type="button" className="pk-btn bad" disabled={busy} onClick={() => act(async () => { const r = await removeBrandAsset({ id: f.id, path: f.path }); setSure(null); return r; }, "Deleted for good.")}>Yes, delete it</button>
                          <button type="button" className="pk-btn g" onClick={() => setSure(null)}>Keep it</button>
                        </>
                      ) : <button type="button" className="pk-linkbtn" onClick={() => setSure(f.id)}>Delete for good…</button>)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
