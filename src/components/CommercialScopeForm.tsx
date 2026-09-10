"use client";

import { useState } from "react";
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
    setBusy(true);

    const summary = [
      company.trim() && `Company: ${company.trim()}`,
      `Package: ${pkg}`,
      siteAddr.trim() && `Site: ${siteAddr.trim()}`,
      timing.trim() && `Program: ${timing.trim()}`,
    ].filter(Boolean).join(" · ");

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: `Commercial — ${pkg}`,
          summary,
          name,
          phone,
          email,
          address: siteAddr,
          notes: [company.trim() && `Company: ${company.trim()}`, timing.trim() && `Program: ${timing.trim()}`, notes.trim()]
            .filter(Boolean).join("\n"),
          hp,
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

    trackLead(`Commercial — ${pkg}`, summary);
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="scopeform scopeform--done" role="status">
        <span className="scopeform__tick" aria-hidden="true">✓</span>
        <h3>Got it{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}.</h3>
        <p>
          We&rsquo;ll read it properly and come back to you — same day if it landed in business hours. If you need
          certificates of currency, SWMS or induction paperwork in the meantime, reply to the confirmation email and
          they&rsquo;ll go straight back.
        </p>
      </div>
    );
  }

  return (
    <form className="scopeform" onSubmit={onSubmit} noValidate>
      <h3 className="scopeform__h">Send us a scope.</h3>
      <p className="scopeform__sub">Drawings, a mechanical schedule or a site address — whatever you have is enough to start.</p>

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

      {error && <p className="scopeform__err" role="alert">{error}</p>}

      <button type="submit" className="ds-btn ds-btn--orange ds-btn--lg scopeform__go" disabled={busy}>
        {busy ? "Sending…" : "Send us a scope →"}
      </button>
      <p className="scopeform__fine">No obligation. We&rsquo;ll tell you quickly if it isn&rsquo;t one for us.</p>
    </form>
  );
}
