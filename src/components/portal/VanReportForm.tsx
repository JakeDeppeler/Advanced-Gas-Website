"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendReport } from "@/app/trade/van/actions";
import { shrink } from "@/components/portal/shrinkPhoto";
import { SERVICE_WHAT, VAN_AREAS } from "@/lib/portal/vanParts";

type YN = "yes" | "no" | null;

/**
 * Report damage, or tell the office the van needs a look.
 *
 * Both are a report on the van's own record, which is where the office already
 * looks and where the answer comes back — "with the office", "booked", "fixed"
 * — rather than an email that lives in one inbox.
 */
export function VanReportForm() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [kind, setKind] = useState<"damage" | "service">("damage");
  const [photos, setPhotos] = useState<File[]>([]);
  const [area, setArea] = useState<string | null>(null);
  const [what, setWhat] = useState("");
  const [title, setTitle] = useState(SERVICE_WHAT[0]);
  const [third, setThird] = useState<YN>(null);
  const [drivable, setDrivable] = useState<YN>(null);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const shrunk = await Promise.all(Array.from(files).slice(0, 4 - photos.length).map((f) => shrink(f)));
    setPhotos((p) => [...p, ...shrunk].slice(0, 4));
    if (picker.current) picker.current.value = "";
  }

  function send() {
    setMsg(null);
    if (kind === "damage" && !what.trim()) { setMsg({ text: "Say what happened." }); return; }
    if (kind === "damage" && drivable == null) { setMsg({ text: "Is it safe to drive?" }); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("what", what);
      if (kind === "service") fd.set("title", title);
      if (area) fd.set("area", area);
      if (third) fd.set("third", third);
      if (drivable) fd.set("drivable", drivable);
      for (const p of photos) fd.append("photo", p);
      const res = await sendReport(fd);
      if (!res.ok) { setMsg({ text: res.error || "Couldn't send it." }); return; }
      setMsg({ ok: true, text: res.error || "Sent. It's on the van's record for the office." });
      setPhotos([]); setArea(null); setWhat(""); setThird(null); setDrivable(null);
      router.refresh();
    });
  }

  const yn = (v: YN, set: (v: YN) => void, label: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid var(--tr-line)" }}>
      <span style={{ fontSize: 17, fontWeight: 800 }}>{label}</span>
      <span className="tr-yn" role="group" aria-label={label}>
        <button type="button" aria-pressed={v === "yes"} className={v === "yes" ? "is-on" : undefined} onClick={() => set("yes")}>Yes</button>
        <button type="button" aria-pressed={v === "no"} className={v === "no" ? "is-on" : undefined} onClick={() => set("no")}>No</button>
      </span>
    </div>
  );

  return (
    <section className="tr-card tr-stack" style={{ gap: 14 }}>
      <div className="tr-toggle" role="group" aria-label="What kind of report">
        <button type="button" aria-pressed={kind === "damage"} className={kind === "damage" ? "is-on" : undefined} onClick={() => setKind("damage")}>Damage</button>
        <button type="button" aria-pressed={kind === "service"} className={kind === "service" ? "is-on" : undefined} onClick={() => setKind("service")}>Service or fault</button>
      </div>

      {kind === "service" && (
        <div className="tr-stack tr-stack--sm">
          <span style={{ fontSize: 17, fontWeight: 800 }}>What needs a look</span>
          <div className="tr-pills">
            {SERVICE_WHAT.map((s) => (
              <button key={s} type="button" aria-pressed={title === s} className={`tr-pill tr-pill--sm${title === s ? " is-on" : ""}`} onClick={() => setTitle(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="tr-stack tr-stack--sm">
        <span style={{ fontSize: 17, fontWeight: 800 }}>Photos</span>
        <input ref={picker} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => add(e.target.files)} />
        <div className="tr-shots" style={{ ["--tr-shots" as string]: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            photos[i] ? (
              <button key={i} type="button" className="tr-shot is-on" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`}>
                ✓ Photo {i + 1}<span>Tap to remove</span>
              </button>
            ) : (
              <button key={i} type="button" className="tr-shot" onClick={() => picker.current?.click()} disabled={i !== photos.length}>+ Add photo</button>
            )
          ))}
        </div>
      </div>

      {kind === "damage" && (
        <div className="tr-stack tr-stack--sm">
          <span style={{ fontSize: 17, fontWeight: 800 }}>Where on the van</span>
          <div className="tr-pills">
            {VAN_AREAS.map((a) => (
              <button key={a} type="button" aria-pressed={area === a} className={`tr-pill tr-pill--sm${area === a ? " is-on" : ""}`} onClick={() => setArea(area === a ? null : a)}>{a}</button>
            ))}
          </div>
        </div>
      )}

      <label className="tr-field">
        {kind === "damage" ? "What happened" : "Tell the office about it"}
        <textarea
          value={what} onChange={(e) => setWhat(e.target.value)}
          placeholder={kind === "damage" ? "e.g. Clipped a post reversing out of a driveway" : "e.g. Engine light came on this morning, still driving fine"}
        />
      </label>

      <div>
        {kind === "damage" && yn(third, setThird, "Another car, person or property involved?")}
        {yn(drivable, setDrivable, "Safe to drive?")}
      </div>

      {kind === "damage" && third === "yes" && (
        <p className="tr-note tr-note--warn">Get their name, number and rego, and photos of their side too. Ring the office before you leave.</p>
      )}
      {drivable === "no" && (
        <p className="tr-note tr-note--warn">Don&rsquo;t drive it. Ring the office now so today&rsquo;s jobs can be moved.</p>
      )}

      {msg && <p className={msg.ok ? "tr-note tr-note--good" : "tr-note tr-note--warn"} role="status">{msg.text}</p>}
      <button type="button" className="tr-btn tr-btn--go tr-btn--block" disabled={busy} onClick={send}>
        {busy ? "Sending…" : kind === "damage" ? "Send the damage report" : "Send to the office"}
      </button>
    </section>
  );
}
