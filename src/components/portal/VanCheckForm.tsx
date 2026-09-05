"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveVanCheck, uploadVanPhoto } from "@/app/portal/vehicles/actions";
import {
  CHECK_KINDS, countList, itemKey, shortfalls, tickList,
  type CheckItems, type CheckKind,
} from "@/lib/portal/vanChecks";

const parse = (v: string) => { const n = parseInt(v.replace(/[^0-9]/g, ""), 10); return Number.isNaN(n) ? null : n; };

/**
 * Shrink a photo in the browser before it goes anywhere. A phone camera shot is
 * 4–8MB; nobody on a Pakenham back street wants to upload that, and 1600px is
 * plenty to see a dent.
 */
async function shrink(file: File, max = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) return file;
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  bitmap.close();
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

type Pending = { id: number; label: string; itemKey: string; file: File; url: string };

export function VanCheckForm({ vehicleId, vehicleName, kind }: { vehicleId: string; vehicleName: string; kind: CheckKind }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [items, setItems] = useState<CheckItems>({});
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" }));
  const [msg, setMsg] = useState("");
  const [photos, setPhotos] = useState<Pending[]>([]);
  // One hidden file input, retargeted at whichever line asked for the camera.
  const fileRef = useRef<HTMLInputElement>(null);
  const shootingFor = useRef<{ key: string; label: string } | null>(null);

  const def = CHECK_KINDS.find((k) => k.k === kind)!;
  const counts = countList(kind);
  const ticks = tickList(kind);

  const setEntry = (key: string, patch: Partial<CheckItems[string]>) =>
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const short = useMemo(() => shortfalls(kind, items), [kind, items]);
  const tickTotal = ticks?.length ?? 0;
  const tickDone = ticks ? ticks.filter((t) => items[itemKey(kind, t.item)]?.state).length : 0;
  const countTotal = counts ? counts.reduce((a, g) => a + g.items.length, 0) : 0;
  const countDone = counts
    ? counts.reduce((a, g) => a + g.items.filter((i) => items[itemKey(g.group, i.item)]?.qty != null).length, 0)
    : 0;
  const done = ticks ? tickDone : countDone;
  const total = ticks ? tickTotal : countTotal;
  const actionCount = ticks ? ticks.filter((t) => items[itemKey(kind, t.item)]?.state === "action").length : 0;
  const shotsFor = (key: string) => photos.filter((p) => p.itemKey === key);
  // Some lines can't be taken on trust. Naming what's missing beats a silent
  // disabled button.
  const missingPhotos = (ticks ?? []).filter((t) => t.photo === "required" && shotsFor(itemKey(kind, t.item)).length === 0);

  function shootFor(key: string, label: string) {
    shootingFor.current = { key, label };
    fileRef.current?.click();
  }

  async function addPhotos(files: FileList | null) {
    const target = shootingFor.current;
    if (!files?.length || !target) return;
    const next: Pending[] = [];
    for (const f of Array.from(files)) {
      const small = await shrink(f);
      next.push({ id: Date.now() + next.length, label: target.label, itemKey: target.key, file: small, url: URL.createObjectURL(small) });
    }
    setPhotos((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    setMsg("");
    start(async () => {
      const res = await saveVanCheck({ vehicleId, kind, checkedOn: when, notes, items });
      if (!res.ok || !res.id) { setMsg(res.error || "Couldn't save."); return; }
      for (const p of photos) {
        const fd = new FormData();
        fd.set("checkId", res.id);
        fd.set("vehicleId", vehicleId);
        fd.set("label", p.label);
        fd.set("itemKey", p.itemKey);
        fd.set("photo", p.file);
        const up = await uploadVanPhoto(fd);
        if (!up.ok) { setMsg(up.error || "The check saved, but a photo didn't."); }
      }
      router.push(`/portal/vehicles/${vehicleId}/checks`);
      router.refresh();
    });
  }

  return (
    <div className="pt-vc">
      <div className="pt-vc__bar">
        <div>
          <strong>{def.label}</strong>
          <span>{vehicleName} · {def.cadence}</span>
        </div>
        <div className="pt-vc__progress">
          <span>{done} of {total}</span>
          <span className="pt-vc__pbar" aria-hidden="true"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></span>
        </div>
      </div>

      <div className="pt-note">{def.blurb}</div>

      <section className="pt-panel">
        <div className="pt-vc__meta">
          <label className="pt-field"><span>Date</span><input type="date" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
        </div>
      </section>

      {ticks && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">The check</h2>
          <div className="pt-vc__ticks">
            {ticks.map((t, i) => {
              const key = itemKey(kind, t.item);
              const e = items[key];
              return (
                <div key={t.item} className={`pt-vc__tick${e?.state === "action" ? " is-action" : e?.state === "ok" ? " is-ok" : ""}`}>
                  <div className="pt-vc__tickid">
                    <span className="pt-vc__num">{i + 1}</span>
                    <div>
                      <strong>{t.item}</strong>
                      {t.looking && <span>{t.looking}</span>}
                    </div>
                  </div>
                  <div className="pt-seg pt-vc__tickseg" role="group" aria-label={t.item}>
                    <button type="button" className={`pt-seg__b${e?.state === "ok" ? " is-on" : ""}`} aria-pressed={e?.state === "ok"} onClick={() => setEntry(key, { state: e?.state === "ok" ? null : "ok" })}>OK</button>
                    <button type="button" className={`pt-seg__b pt-seg__b--off${e?.state === "action" ? " is-on" : ""}`} aria-pressed={e?.state === "action"} onClick={() => setEntry(key, { state: e?.state === "action" ? null : "action" })}>Needs doing</button>
                  </div>
                  {e?.state === "action" && (
                    <input className="pt-vc__note" placeholder="What needs doing?" value={e.note ?? ""} onChange={(ev) => setEntry(key, { note: ev.target.value })} />
                  )}

                  <div className="pt-vc__tickshots">
                      <button
                        type="button"
                        className={`pt-vc__shootbtn${t.photo === "required" && shotsFor(key).length === 0 ? " is-needed" : ""}`}
                        onClick={() => shootFor(key, t.item)}
                      >
                        {shotsFor(key).length > 0 ? "Another photo" : t.photo === "required" ? "Photo needed" : "Add a photo"}
                      </button>
                      {shotsFor(key).map((p) => (
                        <figure key={p.id} className="pt-vc__shot pt-vc__shot--sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={p.label} />
                          <button type="button" className="pf-x" aria-label="Remove photo" onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}>×</button>
                        </figure>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {counts && counts.map((g) => (
        <section key={g.group} className="pt-panel">
          <h2 className="pt-panel__h">{g.group}</h2>
          <div className="pt-vc__counts">
            <div className="pt-vc__counthead">
              <span>Item</span><span>Unit</span><span>Min</span><span>On van</span>
            </div>
            {g.items.map((it) => {
              const key = itemKey(g.group, it.item);
              const qty = items[key]?.qty;
              const low = qty != null && qty <= it.min;
              return (
                <label key={it.item} className={`pt-vc__count${low ? " is-low" : ""}`}>
                  <span className="pt-vc__countitem">{it.item}</span>
                  <span className="pt-vc__countunit">{it.unit}</span>
                  <span className="pt-vc__countmin">{it.min}</span>
                  <span className="pt-vc__countqty">
                    <input inputMode="numeric" value={qty ?? ""} placeholder="—" onChange={(e) => setEntry(key, { qty: parse(e.target.value) })} />
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {counts && short.length > 0 && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">To order today <span className="pt-tm__count">{short.length}</span></h2>
          <p className="pt-panel__sub">At or under the minimum. Order at the minimum, not when it runs out.</p>
          <div className="pt-vc__short">
            {short.map((sh) => (
              <div key={`${sh.group}|${sh.item}`} className="pt-vc__shortrow">
                <span><strong>{sh.item}</strong><em>{sh.group}</em></span>
                <span>{sh.qty} on van · min {sh.min} {sh.unit}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {ticks && (
        <section className="pt-panel">
          <h2 className="pt-panel__h">Anything else worth a photo</h2>
          <p className="pt-panel__sub">Damage, a mess, something that wasn&rsquo;t there last time — anything the photos above don&rsquo;t already cover.</p>
          <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" onClick={() => shootFor("general", "General")}>Take a photo</button>
          {shotsFor("general").length > 0 && (
            <div className="pt-vc__shots">
              {shotsFor("general").map((p) => (
                <figure key={p.id} className="pt-vc__shot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.label} />
                  <button type="button" className="pf-x" aria-label="Remove photo" onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}>×</button>
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="pt-vc__file"
        onChange={(e) => addPhotos(e.target.files)}
      />

      <section className="pt-panel">
        <h2 className="pt-panel__h">Anything else</h2>
        <label className="pt-field">
          <span>Notes <em>(optional)</em></span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the office should know." />
        </label>
      </section>

      <div className="pt-cap__savebar">
        {msg && <span className="pt-inline is-err">{msg}</span>}
        <span className="pt-cap__savenote">
          {missingPhotos.length > 0
            ? `Still needs a photo of: ${missingPhotos.map((t) => t.item.toLowerCase()).join(", ")}`
            : actionCount > 0 ? `${actionCount} ${actionCount === 1 ? "thing needs" : "things need"} doing`
            : short.length > 0 ? `${short.length} to order`
            : `${done} of ${total} done`}
          {photos.length > 0 ? ` · ${photos.length} ${photos.length === 1 ? "photo" : "photos"}` : ""}
        </span>
        <button type="button" className="pt-btn pt-btn--orange" disabled={pending || done === 0 || missingPhotos.length > 0} onClick={submit}>
          {pending ? "Saving…" : "Finish the check"}
        </button>
      </div>
    </div>
  );
}
