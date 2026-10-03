"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeBrandAsset, uploadBrandAsset } from "@/app/portal/marketing/actions";
import type { BrandAsset } from "@/lib/portal/db";

const KINDS = [
  { k: "logo", label: "Logo" },
  { k: "photo", label: "Photo" },
  { k: "document", label: "Document" },
  { k: "other", label: "Other" },
];

const size = (b: number | null) =>
  b == null ? "—" : b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/**
 * The brand kit: logos, van wrap artwork, the finished-job photos everyone
 * draws on for a post or a quote.
 *
 * Files go into the same private bucket the van photos use, so nothing here is
 * served straight off a public URL — a download is a short-lived signed link
 * minted on the server when somebody asks for it.
 */
export function BrandAssets({ assets, who }: { assets: BrandAsset[]; who: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("logo");
  const file = useRef<HTMLInputElement>(null);

  function upload() {
    const f = file.current?.files?.[0];
    setMsg("");
    if (!label.trim()) { setMsg("Give it a name."); return; }
    if (!f) { setMsg("Pick a file."); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("label", label);
      fd.set("kind", kind);
      fd.set("file", f);
      const res = await uploadBrandAsset(fd);
      if (!res.ok) { setMsg(res.error || "Couldn't upload it."); return; }
      setLabel("");
      if (file.current) file.current.value = "";
      router.refresh();
    });
  }

  const byKind = KINDS.map((k) => ({ ...k, n: assets.filter((a) => a.kind === k.k).length })).filter((k) => k.n > 0);

  return (
    <>
      <div className="pt-mkheads">
        <div className="pt-mkhead is-feature">
          <span className="pt-mkhead__k">Files</span>
          <strong className="pt-mkhead__v">{assets.length}</strong>
          <span className="pt-mkhead__sub">in the brand kit</span>
        </div>
        {byKind.map((k) => (
          <div className="pt-mkhead" key={k.k}>
            <span className="pt-mkhead__k">{k.label}</span>
            <strong className="pt-mkhead__v">{k.n}</strong>
          </div>
        ))}
      </div>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Add a file</h2>
        <div className="pt-mknew__grid">
          <label className="pt-field">
            <span>What it is</span>
            <input className="pt-inp" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Logo — orange on navy, SVG" />
          </label>
          <label className="pt-field">
            <span>Kind</span>
            <select className="pt-inp" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => <option key={k.k} value={k.k}>{k.label}</option>)}
            </select>
          </label>
          <label className="pt-field">
            <span>File</span>
            <input className="pt-inp" type="file" ref={file} />
          </label>
        </div>
        {msg && <div className="pt-note pt-note--warn">{msg}</div>}
        <button type="button" className="pt-btn pt-btn--orange" disabled={busy} onClick={upload}>
          {busy ? "Uploading…" : "Upload"}
        </button>
        <p className="pt-panel__sub" style={{ marginBottom: 0 }}>
          Up to 25MB. Stored privately — a link to one is signed when you ask for it, so nothing here is public.
        </p>
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">The kit</h2>
        {assets.length === 0 ? (
          <p className="pt-rep__empty">Nothing in the kit yet.</p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet">
              <thead><tr><th>File</th><th>Kind</th><th>Size</th><th>Added</th><th /></tr></thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.label}</strong><span className="pt-fleet__sub">{a.mime ?? "file"}</span></td>
                    <td>{KINDS.find((k) => k.k === a.kind)?.label ?? a.kind}</td>
                    <td>{size(a.bytes)}</td>
                    <td>
                      {new Date(a.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      {a.addedBy && <span className="pt-fleet__sub">{a.addedBy}</span>}
                    </td>
                    <td>
                      <a className="pt-fleet__open" href={`/api/portal/asset?path=${encodeURIComponent(a.path)}`} target="_blank" rel="noopener">
                        Download ↗
                      </a>
                      <button
                        type="button" className="pt-x" disabled={busy}
                        aria-label={`Remove ${a.label}`}
                        onClick={() => start(async () => {
                          const res = await removeBrandAsset({ id: a.id, path: a.path });
                          if (!res.ok) { setMsg(res.error || "Couldn't remove it."); return; }
                          router.refresh();
                        })}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
