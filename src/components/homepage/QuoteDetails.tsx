"use client";

import { useId, useRef, useState } from "react";
import { ICON } from "@/lib/homepage/data";
import { readUtm, trackLead } from "@/lib/track";
import { AddressField, type Address } from "./AddressField";
import { Svg } from "./Svg";

/**
 * The last screen of both quote forms (the hero form and Find your system):
 * name, phone, address, an optional email and optional photos, then sent.
 *
 * Photos sit at the foot of the form (Jake, 28 Nov 2026: "the photo at the
 * bottom ... higher quality leads ... [not] too hard"), optional, so they come
 * in with the enquiry and the team gets one email with them attached. A
 * photo must never cost a lead: if the photos would make the request too big,
 * or the send with them fails, the enquiry goes on its own and the photos
 * follow through the photos route, which files them under it.
 */

export type LeadDraft = {
  /** What the lead is filed under. */
  service: string;
  /** One line for the team email's header and the portal. */
  summary: string;
  details: Record<string, unknown>;
  timing?: string;
  propertyType?: string;
};

type Photo = { name: string; type: string; data: string; preview: string };

const MAX_PHOTOS = 4;
/** Base64 characters sent with the enquiry; past this the photos follow separately (Vercel refuses bodies over 4.5 MB). */
const INLINE_PHOTO_CHARS = 3_000_000;
const phoneOk = (v: string) => v.replace(/\D/g, "").length >= 8;
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function QuoteDetails({ lead, chips, about, tip, urgent = false, onSent, onRestart, title = "Where do we send your quote?" }: {
  /** Called when they press Send, so it carries the answers as they are then. */
  lead: () => LeadDraft;
  /** Their answers so far, shown above the fields so they can see what they're sending. */
  chips: string[];
  /** What the "got it" line names, e.g. "your Kaden KSI wall split". */
  about: string;
  tip: string;
  urgent?: boolean;
  onSent?: () => void;
  onRestart: () => void;
  title?: string;
}) {
  const uid = useId();
  const box = useRef<HTMLElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // The address box fills all three when a suggestion is picked; typed by hand, only `label`.
  const [addr, setAddr] = useState<Address>({ label: "", suburb: null, postcode: null });
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [nudge, setNudge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [sent, setSent] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<"idle" | "sent" | "lost">("idle");

  const err = (v: string) => nudge && !v.trim();
  const first = name.trim().split(" ")[0].replace(/[^\p{L}'-]+$/u, "") || "there";

  /** On a phone the card can sit above the screen once the keyboard closes; bring the next screen into view. */
  function keepInView() {
    const el = box.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phoneOk(phone) || !addr.label.trim() || (email && !emailOk(email))) {
      setNudge(true);
      return;
    }
    setNudge(false);
    setSaving(true);
    setSaveFailed(false);
    const draft = lead();
    const body = {
      ...draft,
      name: name.trim(), phone: phone.trim(), email: email.trim(),
      // Picked from the list, the suburb and postcode come with it; typed
      // by hand, the whole thing goes in as the address for the office to read.
      address: addr.label.trim(), suburb: addr.suburb ?? undefined, postcode: addr.postcode ?? undefined,
      hp,
      pagePath: window.location.pathname,
      utm: readUtm(),
    };
    const sendLead = (b: object) => fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).catch(() => null);
    const files = photos.map(({ name: n, type, data }) => ({ name: n, type, data }));
    const inline = files.length > 0 && files.reduce((t, f) => t + f.data.length, 0) < INLINE_PHOTO_CHARS;
    try {
      let res = await sendLead(inline ? { ...body, photos: files } : body);
      let photosIn = inline && !!res?.ok;
      // The enquiry matters more than its photos: if the send with them failed, send it bare.
      if (!res?.ok && inline) res = await sendLead(body);
      if (!res?.ok) throw new Error(`Quote POST failed: ${res?.status ?? "network"}`);
      const out = (await res.json().catch(() => ({}))) as { id?: string };
      // Photos that didn't go with it follow, filed under the lead.
      if (files.length && !photosIn && out.id) {
        const r = await fetch("/api/quote/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: out.id, photos: files }) }).catch(() => null);
        photosIn = !!r?.ok;
      }
      setPhotoState(files.length ? (photosIn ? "sent" : "lost") : "idle");
      trackLead(draft.service, draft.summary);
      setSent(true);
      onSent?.();
      window.setTimeout(keepInView, 30);
    } catch (error) {
      console.error(error);
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setPhotoErr(null);
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    const out: Photo[] = [];
    for (const f of picked) {
      try { out.push(await shrink(f)); } catch { setPhotoErr(`Couldn't read "${f.name}". Try another photo.`); }
    }
    if (out.length) setPhotos((p) => [...p, ...out].slice(0, MAX_PHOTOS));
  }

  function restart() {
    setName(""); setPhone(""); setAddr({ label: "", suburb: null, postcode: null }); setEmail("");
    setSent(false); setPhotos([]); setPhotoErr(null); setPhotoState("idle"); setSaveFailed(false); setNudge(false);
    onRestart();
  }

  if (sent) {
    return (
      <div role="status" className="qf__step anim" ref={box as React.RefObject<HTMLDivElement>}>
        <span className="qf__done-tick pop">
          <svg className="atick" aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        <h2 className="qf__h">Got it, {first}.</h2>
        <p className="qf__sub" style={{ fontSize: 15 }}>
          We&apos;ll call {phone || "you"} {urgent ? "as soon as we can" : "within 12 business hours"} about {about}. Urgent? Call (03) 5947 8000.
        </p>

        {photoState === "sent" ? (
          <p className="qf__photos-ok pop"><span aria-hidden="true">✓</span> {photos.length} photo{photos.length === 1 ? "" : "s"} sent with your enquiry.</p>
        ) : photoState === "lost" ? (
          <p className="qf__err">Your enquiry is in, but the photos didn&apos;t come through. Reply to our email or text them to us when we call.</p>
        ) : null}
        <button type="button" onClick={restart} className="abtn abtn--ghost" style={{ alignSelf: "flex-start", fontSize: 14, padding: "10px 16px" }}>Start again</button>
      </div>
    );
  }

  return (
    <form className="qf__step" onSubmit={save} noValidate ref={box as React.RefObject<HTMLFormElement>}>
      <div><h2 className="qf__h">{title}</h2></div>
      {chips.length > 0 && (
        <div className="qf__sum pop">
          <span className="qf__sumt">Your answers</span>
          <div className="qf__chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>
        </div>
      )}
      <input className="qf__hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company" value={hp} onChange={(e) => setHp(e.target.value)} />
      <div className="qf__ins">
        <label className={`qf__in${err(name) ? " qf__in--bad" : ""}`} htmlFor={`${uid}-name`}>
          <Ic d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
          <span className="qf__inb"><span className="qf__inl">Your name</span>
            <input id={`${uid}-name`} name="name" type="text" autoComplete="name" required placeholder="First and last name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={err(name)} />
          </span>
        </label>
        <label className={`qf__in${nudge && !phoneOk(phone) ? " qf__in--bad" : ""}${phoneOk(phone) ? " qf__in--ok" : ""}`} htmlFor={`${uid}-phone`}>
          <Ic d={ICON.phone} />
          <span className="qf__inb"><span className="qf__inl">Mobile or phone</span>
            <input id={`${uid}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="04xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={nudge && !phoneOk(phone)} />
          </span>
          {phoneOk(phone) && <span className="qf__tick" aria-hidden="true">✓</span>}
        </label>
        <AddressField value={addr.label} onChange={setAddr} invalid={err(addr.label)} icon={<Ic d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />} />
        <label className={`qf__in${nudge && !!email && !emailOk(email) ? " qf__in--bad" : ""}${emailOk(email) ? " qf__in--ok" : ""}`} htmlFor={`${uid}-email`}>
          <Ic d="M3 6h18v12H3zM3 7l9 6 9-6" />
          <span className="qf__inb"><span className="qf__inl">Email <em>optional, for your written quote</em></span>
            <input id={`${uid}-email`} name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={nudge && !!email && !emailOk(email)} />
          </span>
          {emailOk(email) && <span className="qf__tick" aria-hidden="true">✓</span>}
        </label>
      </div>
      {nudge && <p className="qf__err" role="alert">We need your name, a phone number and your address to send a quote{email && !emailOk(email) ? ", and that email doesn't look quite right" : ""}.</p>}
      {saveFailed && (
        <p className="qf__err" role="alert">That didn&apos;t go through. Try again, or call <a href="tel:+61359478000" data-call-from="quote-form-error">(03) 5947 8000</a> and we&apos;ll take it over the phone.</p>
      )}
      <div className="qf__more">
        <strong>Add photos <em>optional</em></strong>
        <span>{tip}</span>
        <input id={`${uid}-photo`} className="qf__file" type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} disabled={photos.length >= MAX_PHOTOS || saving} />
        <label className="qf__drop qf__drop--sm" htmlFor={`${uid}-photo`}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C2521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
          <strong>{photos.length >= MAX_PHOTOS ? "That's the four" : photos.length ? "Add another" : "Tap to add photos"}</strong>
          <span>Up to {MAX_PHOTOS}</span>
        </label>
        {photoErr && <p className="qf__err" role="alert">{photoErr}</p>}
        {photos.length > 0 && (
          <div className="qf__thumbs">
            {photos.map((ph, i) => (
              <span key={ph.preview} className="qf__thumb pop">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimise */}
                <img src={ph.preview} alt={ph.name} />
                <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${ph.name}`}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <button type="submit" className="abtn abtn--or abtn--flat abtn--full" disabled={saving}>
        {saving ? "Sending…" : photos.length ? `Send with ${photos.length} photo${photos.length === 1 ? "" : "s"}` : "Send my quote request"}
      </button>
      <p className="qf__fine">Free, no obligation. We call back within 12 business hours.</p>
    </form>
  );
}

/** The icon at the front of each contact field. */
const Ic = ({ d }: { d: string }) => <span className="qf__ic"><Svg d={d} size={18} /></span>;

/**
 * Phone photos are 3–8 MB, and four of them base64-encoded would blow
 * straight through the 4.5 MB request limit on Vercel functions. 1600 px on
 * the long side is plenty to read a data plate.
 */
async function shrink(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new window.Image();
      i.onload = () => ok(i);
      i.onerror = bad;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.82);
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return { name: `${base}.jpg`, type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}
