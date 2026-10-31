"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FSVC, QB, SIZE_NOTE, PHOTO_TIP, findSystem, pickSummary, answerMap,
  type Answers, type Question, type System,
} from "@/lib/homepage/data";
import { onIntent } from "@/lib/homepage/intent";
import { readUtm, trackLead } from "@/lib/track";

/**
 * The hero quote form: what you need → that system's questions → when →
 * whose home → details → photos.
 *
 * The lead is saved when they tap Next on their details, before the photo
 * step. Jake's rule: a half-finished enquiry must still reach the team, and
 * the photo step is where people wander off. Photos then go to a second,
 * smaller route that attaches them to that lead, so the team gets one full
 * email and, at most, one short "photos added" note.
 */

type Booked = { sys: System; tierSlug: string; answers: Answers; pick: string; model?: string };
type Photo = { name: string; type: string; data: string; preview: string };

const MAX_PHOTOS = 4;

export function HeroQuote({ rating, count }: { rating: string; count: number }) {
  const [svc, setSvc] = useState<number | null>(null);
  const [type, setType] = useState<number | null>(null);
  const [ans, setAns] = useState<Answers>({});
  const [pos, setPos] = useState(0);
  const [booked, setBooked] = useState<Booked | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [suburb, setSuburb] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [nudge, setNudge] = useState(false);

  const [leadId, setLeadId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [photosLost, setPhotosLost] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const fs = svc == null ? null : FSVC[svc];
  const ft = fs && type != null ? fs.types[type] : null;
  const typeQs: Question[] = booked ? [] : ft ? ft.qs : [];
  const asksUrgent = typeQs.some((q) => q.id === "urgent");
  const biz = ft?.biz ?? fs?.biz ?? false;
  const tailQs: Question[] = [...(asksUrgent ? [] : [QB.when]), biz ? QB.ownBiz : QB.own];
  const allQs = [...typeQs, ...tailQs];

  const steps = useMemo(() => {
    let s: string[] = booked ? [] : ["svc", ...(fs ? ["type"] : [])];
    if (booked || ft) s = [...s, ...allQs.map((q) => `q:${q.id}`), "details", "photo", "done"];
    return s;
    // allQs is derived from these three.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booked, fs, ft]);

  const at = Math.min(pos, Math.max(steps.length - 1, 0));
  const cur = steps[at] ?? "svc";
  const curQ = cur.startsWith("q:") ? allQs.find((q) => `q:${q.id}` === cur) ?? null : null;
  const known = !!(booked || ft);
  const total = known ? steps.length - 1 : 6;

  const label = (q: Question) => (ans[q.id] == null ? null : q.opts[ans[q.id]].label);
  const chips = [booked?.pick, ...(booked ? [] : [fs?.t, ft?.label]), ...allQs.map(label)].filter((x): x is string => !!x);
  const summary = booked ? booked.pick : [fs?.t, ft?.label, ft && typeQs[0] ? label(typeQs[0]) : null].filter(Boolean).join(" · ");

  // Arrivals from the finder ("Book →"), a /find product page, or a card that
  // starts the form at a service.
  useEffect(() => onIntent((i) => {
    if (i.kind === "book") {
      const ref = findSystem(i.system);
      const tier = ref?.sys.tiers.find((t) => t.slug === i.tier);
      if (!ref || !tier) return true;
      reset();
      setBooked({ sys: ref.sys, tierSlug: tier.slug, answers: i.answers, model: i.model, pick: pickSummary(ref.sys, tier, i.answers, i.model) });
      return true;
    }
    if (i.kind === "quote") {
      reset();
      setSvc(i.service);
      setPos(1);
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  function reset() {
    setSvc(null); setType(null); setAns({}); setPos(0); setBooked(null);
    setLeadId(null); setPhotos([]); setPhotoErr(null); setPhotosLost(false); setSaveFailed(false); setNudge(false);
  }

  function go(n: number) {
    setPos(n);
    // On a phone the card is taller than the screen; keep the question in view.
    const el = ref.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }

  function pickAnswer(q: Question, i: number) {
    setAns((a) => ({ ...a, [q.id]: i }));
    go(at + 1);
  }

  /** Which `service` the lead is filed under. Matches the old form's ids where there is one. */
  function service(): string {
    if (booked) return booked.sys.service;
    const sys = ft?.system ? findSystem(ft.system) : null;
    if (sys) return sys.sys.service;
    return ft?.service ?? fs?.service ?? "other";
  }

  async function saveLead(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !suburb.trim() || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setNudge(true);
      return;
    }
    setNudge(false);
    setSaving(true);
    setSaveFailed(false);
    const answers = {
      ...(booked ? answerMap(booked.sys.qs, booked.answers) : {}),
      ...answerMap(allQs, ans),
    };
    const when = ans.urgent != null ? QB.urgent.opts[ans.urgent].label : ans.when != null ? QB.when.opts[ans.when].label : undefined;
    const own = ans.own != null ? (biz ? QB.ownBiz : QB.own).opts[ans.own].label : undefined;
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: service(),
          summary: [summary, ...Object.values(answers).filter((v) => !summary.includes(v))].join(" · "),
          details: {
            answers,
            ...(booked ? { pick: booked.pick, findPage: `/find/${booked.sys.slug}/${booked.tierSlug}${booked.model ? `?model=${booked.model}` : ""}` } : { job: [fs?.t, ft?.label].filter(Boolean).join(" · ") }),
          },
          name: name.trim(), phone: phone.trim(), suburb: suburb.trim(), email: email.trim(),
          timing: when, propertyType: own,
          hp,
          pagePath: window.location.pathname,
          utm: readUtm(),
          // The photo step follows; tell the customer email not to promise
          // anything about photos it hasn't seen.
          photosToFollow: true,
        }),
      });
      if (!res.ok) throw new Error(`Quote POST failed: ${res.status}`);
      const out = (await res.json().catch(() => ({}))) as { id?: string };
      setLeadId(out.id ?? null);
      trackLead(service(), summary);
      go(at + 1);
    } catch (err) {
      console.error(err);
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

  async function sendPhotos(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length && leadId) {
      setSaving(true);
      try {
        const res = await fetch("/api/quote/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: leadId, photos: photos.map(({ name, type, data }) => ({ name, type, data })) }),
        });
        if (!res.ok) throw new Error(`Photos POST failed: ${res.status}`);
      } catch (err) {
        // The enquiry itself is already in. Say so, and ask for the photos another way.
        console.error(err);
        setPhotosLost(true);
      } finally {
        setSaving(false);
      }
    } else if (photos.length) {
      setPhotosLost(true);
    }
    go(at + 1);
  }

  const first = name.trim().split(" ")[0].replace(/[^\p{L}'-]+$/u, "") || "there";
  // "your Reclaim ECO R290 all-in-one" reads better than the whole pick line, lowercased.
  const bookedTier = booked?.sys.tiers.find((x) => x.slug === booked.tierSlug);
  const doneAbout = bookedTier ? `${bookedTier.brand} ${bookedTier.model}` : summary.toLowerCase() || "job";
  const urgentToday = ans.urgent === 0;
  const tipCat = fs?.cat ?? (booked ? findSystem(booked.sys.slug)?.cat.id : undefined);
  const tip = (tipCat && PHOTO_TIP[tipCat]) || "A photo of the unit, its label or the problem helps us price it faster. Optional.";
  const err = (v: string) => nudge && !v.trim();

  return (
    <div id="quote" className="qf anim" ref={ref} style={{ animationDelay: ".12s" }}>
      <div className="qf__head">
        {at > 0 && cur !== "done" && (
          <button type="button" className="qf__back" onClick={() => go(at - 1)}>← Back</button>
        )}
        <span className="mono qf__count" aria-live="polite">{cur === "done" ? "Sent" : known ? `Step ${at + 1} of ${total}` : `Step ${at + 1}`}</span>
      </div>
      <div className="qf__bar" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {Array.from({ length: total }, (_, i) => <span key={i} className={i <= at ? "on" : ""} />)}
      </div>

      {cur === "svc" && (
        <div className="qf__step">
          <div>
            <h2 className="qf__h">What can we help with?</h2>
            <p className="qf__sub">A few quick taps, then your details.</p>
          </div>
          {/* The same rows as every later step, so the form reads as one thing from the first tap. */}
          <div className="qf__opts">
            {FSVC.map((x, i) => (
              <button key={x.t} type="button" className={`qf__opt${svc === i ? " qf__opt--on" : ""}`} style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => { setSvc(i); setType(null); setAns({}); setBooked(null); go(1); }}>
                <span className="qf__ti" style={{ background: x.bg, color: x.fg }}><Svg d={x.icon} size={18} /></span>
                <span className="qf__optt"><strong>{x.t}</strong><small>{x.s}</small></span>
                <span className="qf__go" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
          {/* Who turns up: the crew, not a stock photo, beside the rating. */}
          <div className="qf__us">
            <span className="qf__usimg"><Image src="/team-photo.webp" alt="The Advanced Gas crew with our vans at the Pakenham workshop" fill sizes="320px" /></span>
            <span className="qf__ust">
              <strong>Our own crew, never subbies</strong>
              <span><span className="stars stars--ink" aria-hidden="true">★★★★★</span> {rating} from {count} Google reviews</span>
            </span>
          </div>
        </div>
      )}

      {cur === "type" && fs && (
        <div className="qf__step">
          <div><span className="qf__crumb">{fs.t}</span><h2 className="qf__h">{fs.q}</h2></div>
          {/* Services has seven; a shorter picture keeps them inside the form's fixed height. */}
          <div className={`qf__types${fs.types.length > 6 ? " qf__types--many" : ""}`}>
            {fs.types.map((y, i) => (
              <button key={y.label} type="button" className="qf__type" style={{ animationDelay: `${i * 0.07}s` }}
                onClick={() => { setType(i); setAns({}); go(2); }}>
                <span className="qf__typeimg">
                  {y.img ? <Image src={y.img} alt="" fill sizes="180px" /> : <Svg d={y.icon ?? ""} size={34} stroke="#0C6F96" width={1.6} />}
                </span>
                <span className="qf__typet">{y.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {curQ && (
        <div className="qf__step" key={cur}>
          <div>
            <span className="qf__crumb">{booked ? `Your pick: ${booked.pick}` : [fs?.t, ft?.label].filter(Boolean).join(" · ")}</span>
            <h2 className="qf__h">{curQ.q}</h2>
          </div>
          <div className="qf__opts">
            {curQ.opts.map((z, i) => (
              <button key={z.label} type="button" className={`qf__opt${ans[curQ.id] === i ? " qf__opt--on" : ""}`} style={{ animationDelay: `${i * 0.07}s` }} onClick={() => pickAnswer(curQ, i)}>
                {z.n ? (
                  <span className="qf__bars" aria-hidden="true">
                    {[1, 2, 3].map((b) => <i key={b} className={b <= Math.min(z.n ?? 0, 3) ? "on" : ""} />)}
                  </span>
                ) : null}
                <span className="qf__optt"><strong>{z.label}</strong>{z.sub && <small>{z.sub}</small>}</span>
                {z.spec && <span className="qf__spec">{z.spec}</span>}
              </button>
            ))}
          </div>
          {curQ.size && <p className="qf__fine qf__fine--l">{SIZE_NOTE}</p>}
        </div>
      )}

      {/* The card holds one height on every step; on the picking steps this
          sits at its foot, so the space under a short list reads as intended. */}
      {(cur === "svc" || cur === "type" || curQ) && (
        <p className="qf__foot">Free quote, no obligation. Usually back within 12 business hours.</p>
      )}

      {cur === "details" && (
        <form className="qf__step" onSubmit={saveLead} noValidate>
          <div><h2 className="qf__h">Where do we send your quote?</h2></div>
          {chips.length > 0 && (
            <div className="qf__sum pop">
              <span className="qf__sumt">Your answers</span>
              <div className="qf__chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>
            </div>
          )}
          <input className="qf__hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company" value={hp} onChange={(e) => setHp(e.target.value)} />
          <div className="qf__field">
            <label htmlFor="q-name">Name</label>
            <input className="ainput" id="q-name" name="name" type="text" autoComplete="name" required placeholder="First and last name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={err(name)} />
          </div>
          <div className="qf__row2">
            <div className="qf__field">
              <label htmlFor="q-phone">Phone</label>
              <input className="ainput" id="q-phone" name="phone" type="tel" autoComplete="tel" required placeholder="04xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={err(phone)} />
            </div>
            <div className="qf__field">
              <label htmlFor="q-suburb">Suburb</label>
              <input className="ainput" id="q-suburb" name="suburb" type="text" autoComplete="address-level2" required placeholder="e.g. Officer" value={suburb} onChange={(e) => setSuburb(e.target.value)} aria-invalid={err(suburb)} />
            </div>
          </div>
          <div className="qf__field">
            <label htmlFor="q-email">Email <span>(optional, for your written quote)</span></label>
            <input className="ainput" id="q-email" name="email" type="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={nudge && !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)} />
          </div>
          {nudge && <p className="qf__err" role="alert">We need your name, phone and suburb to send a quote{email ? ", and that email doesn't look quite right" : ""}.</p>}
          {saveFailed && (
            <p className="qf__err" role="alert">That didn&apos;t go through. Try again, or call <a href="tel:+61359478000" data-call-from="quote-form-error">(03) 5947 8000</a> and we&apos;ll take it over the phone.</p>
          )}
          <button type="submit" className="abtn abtn--or abtn--flat abtn--full" disabled={saving}>{saving ? "Saving…" : "Next: add a photo"}</button>
          <p className="qf__fine">We keep your details once you tap Next, so we can call you back if you don&apos;t finish.</p>
        </form>
      )}

      {cur === "photo" && (
        <form className="qf__step" onSubmit={sendPhotos}>
          <div><h2 className="qf__h">Add a photo</h2><p className="qf__sub">{tip}</p></div>
          <input id="q-photo" className="qf__file" type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} disabled={photos.length >= MAX_PHOTOS} />
          <label className="qf__drop" htmlFor="q-photo">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C2521A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
            <strong>{photos.length >= MAX_PHOTOS ? "That's the four" : "Tap to add photos"}</strong>
            <span>Up to {MAX_PHOTOS} · take one now or choose from your phone</span>
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
          <button type="submit" className="abtn abtn--or abtn--flat abtn--full" disabled={saving}>
            {saving ? "Sending…" : photos.length ? `Send with ${photos.length} photo${photos.length === 1 ? "" : "s"}` : "Skip and send"}
          </button>
        </form>
      )}

      {cur === "done" && (
        <div role="status" className="qf__step anim">
          <span className="qf__done-tick pop">
            <svg className="atick" aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <h2 className="qf__h">Got it, {first}.</h2>
          <p className="qf__sub" style={{ fontSize: 15 }}>
            We&apos;ll call {phone || "you"} {urgentToday ? "today" : "within 12 business hours"} about your {doneAbout}
            {photos.length && !photosLost ? ` (with ${photos.length} photo${photos.length === 1 ? "" : "s"})` : ""}. Urgent? Call (03) 5947 8000, 24/7.
          </p>
          {photosLost && (
            <p className="qf__err">Your enquiry is in, but the photos didn&apos;t come through. Reply to our email or text them to us when we call.</p>
          )}
          <button type="button" onClick={() => { reset(); setName(""); setPhone(""); setSuburb(""); setEmail(""); }} className="abtn abtn--ghost" style={{ alignSelf: "flex-start", fontSize: 14, padding: "10px 16px" }}>Start again</button>
        </div>
      )}
    </div>
  );
}

export function Svg({ d, size = 18, stroke = "currentColor", width = 2 }: { d: string; size?: number; stroke?: string; width?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

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
