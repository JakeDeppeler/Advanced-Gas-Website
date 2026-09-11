"use client";

import { useRef, useState } from "react";
import { trackLead, readUtm } from "@/lib/track";
import { site } from "@/lib/site";

/**
 * The commercial enquiry form.
 *
 * Deliberately not the residential quote form. That one walks a homeowner
 * through brand, size and finish because they genuinely don't know what they
 * want yet. Someone sending a mechanical package already knows — what they
 * need is somewhere to say which site, which package, and by when, and then to
 * be left alone until we come back with a price.
 *
 * One screen, no steps. Company and site are the fields that matter; a scope
 * without a site address can't be priced, and a scope without a program date
 * can't be resourced.
 */

/**
 * Drawings, not photographs. A mechanical schedule is a PDF and a set of plans
 * is usually a big one, so the cap is per-file and the total is checked too:
 * the whole enquiry goes to the API as one JSON body, and Vercel will refuse
 * it silently past a few megabytes.
 */
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
const ACCEPT = ".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.zip";

function readAsBase64(file: File) {
  return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve({
      name: file.name,
      type: file.type || "application/octet-stream",
      data: String(r.result).split(",")[1] ?? "",
    });
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}

function niceSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const PACKAGES = [
  "Tenancy or retail fit-out",
  "System replacement",
  "Scheduled maintenance",
  "Type A gas / hot water",
  "Breakdown or repair",
  "Not sure yet",
];

export function CommercialScopeForm() {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [siteAddr, setSiteAddr] = useState("");
  const [pkg, setPkg] = useState(PACKAGES[0]);
  const [timing, setTiming] = useState("");
  const [notes, setNotes] = useState("");
  const [hp, setHp] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("A name and a phone number, and we can come back to you.");
      return;
    }
    const total = files.reduce((n, f) => n + f.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError(`That's ${niceSize(total)} of attachments, and the form tops out at ${niceSize(MAX_TOTAL_BYTES)}. Send the rest to ${site.email} and we'll match it up.`);
      return;
    }

    setBusy(true);

    let encoded: { name: string; type: string; data: string }[] = [];
    try {
      encoded = await Promise.all(files.map(readAsBase64));
    } catch {
      setError(`One of those files couldn't be read. Email them to ${site.email} instead and we'll pick it up from there.`);
      setBusy(false);
      return;
    }

    const summary = [
      company.trim() && `Company: ${company.trim()}`,
      `Package: ${pkg}`,
      siteAddr.trim() && `Site: ${siteAddr.trim()}`,
      timing.trim() && `Program: ${timing.trim()}`,
      encoded.length && `${encoded.length} file${encoded.length === 1 ? "" : "s"} attached`,
    ].filter(Boolean).join(" · ");

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: `Commercial · ${pkg}`,
          summary,
          name,
          phone,
          email,
          address: siteAddr,
          notes: [company.trim() && `Company: ${company.trim()}`, timing.trim() && `Program: ${timing.trim()}`, notes.trim()]
            .filter(Boolean).join("\n"),
          hp,
          photos: encoded,
          pagePath: typeof window !== "undefined" ? window.location.pathname : "/commercial",
          utm: readUtm(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // The row and the email are both server-side. If the request itself
      // failed we genuinely don't have it, so say so rather than showing a
      // thank-you for an enquiry that went nowhere.
      setError(`That didn't send. Email ${site.email} or ring ${site.phone} and we'll take it down.`);
      setBusy(false);
      return;
    }

    trackLead(`Commercial · ${pkg}`, summary);
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="scopeform scopeform--done" role="status">
        <span className="scopeform__tick" aria-hidden="true">✓</span>
        <h3>Got it{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}.</h3>
        <p>
          We&rsquo;ll read it properly and come back to you, same day if it landed in business hours. If you need
          certificates of currency, SWMS or induction paperwork in the meantime, reply to the confirmation email and
          they&rsquo;ll go straight back.
        </p>
      </div>
    );
  }

  return (
    <form className="scopeform" onSubmit={onSubmit} noValidate>
      <h3 className="scopeform__h">Submit a scope.</h3>
      <p className="scopeform__sub">Drawings, a mechanical schedule or a site address is sufficient to begin. Attach the plans if you have them.</p>

      <input
        type="text"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />

      <div className="scopeform__row">
        <label>
          <span>Company</span>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" placeholder="Builder, FM or owner" />
        </label>
        <label>
          <span>Your name *</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </label>
      </div>

      <div className="scopeform__row">
        <label>
          <span>Phone *</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
        </label>
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
      </div>

      <label className="scopeform__full">
        <span>Site address</span>
        <input type="text" value={siteAddr} onChange={(e) => setSiteAddr(e.target.value)} placeholder="Where the work is" />
      </label>

      <div className="scopeform__row">
        <label>
          <span>Package</span>
          <select value={pkg} onChange={(e) => setPkg(e.target.value)}>
            {PACKAGES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>
          <span>Program</span>
          <input type="text" value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="Dates, or a rough window" />
        </label>
      </div>

      <label className="scopeform__full">
        <span>What&rsquo;s the job?</span>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Plant on the schedule, what's there now, anything that decides it. If you have drawings, say so and we'll send you somewhere to upload them." />
      </label>

      <div className="scopeform__files">
        <span className="scopeform__fileslabel">Drawings &amp; schedules</span>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          className="scopeform__fileinput"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            const tooBig = picked.filter((f) => f.size > MAX_FILE_BYTES);
            if (tooBig.length) {
              setError(`${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over ${niceSize(MAX_FILE_BYTES)}. Email ${site.email} and we'll take ${tooBig.length === 1 ? "it" : "them"} that way.`);
            } else {
              setError(null);
            }
            setFiles((cur) => [...cur, ...picked.filter((f) => f.size <= MAX_FILE_BYTES)]);
            // Cleared so picking the same file twice still fires a change.
            if (fileInput.current) fileInput.current.value = "";
          }}
        />
        <button type="button" className="scopeform__attach" onClick={() => fileInput.current?.click()}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.2-9.19a3.67 3.67 0 0 1 5.18 5.18l-9.2 9.19a1.83 1.83 0 0 1-2.59-2.59l8.5-8.49" />
          </svg>
          Attach files
        </button>
        <span className="scopeform__filehint">
          Plans, a mechanical schedule, a photo of the plant. PDF, DWG, Office or image, up to {niceSize(MAX_FILE_BYTES)} each.
        </span>

        {files.length > 0 && (
          <ul className="scopeform__filelist">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`}>
                <span className="scopeform__filename">{f.name}</span>
                <span className="scopeform__filesize">{niceSize(f.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((cur) => cur.filter((_, n) => n !== i))}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="scopeform__err" role="alert">{error}</p>}

      <button type="submit" className="ds-btn ds-btn--orange ds-btn--lg scopeform__go" disabled={busy}>
        {busy ? (files.length ? "Uploading…" : "Submitting…") : "Submit a scope →"}
      </button>
      <p className="scopeform__fine">No obligation. We&rsquo;ll tell you quickly if it isn&rsquo;t one for us.</p>
    </form>
  );
}
