"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { site } from "@/lib/site";
import { trackLead, readUtm } from "@/lib/track";
import {
  ATTACH_ACCEPT,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  niceSize,
  readAsBase64,
  type EncodedFile,
} from "@/lib/attachments";

/**
 * One form, four enquiries.
 *
 * Four kinds of person arrive on this page, and until now they all got the
 * same box: somebody sending a mechanical package, somebody whose plant has
 * stopped, a homeowner who followed the wrong door, and a procurement
 * officer who only wants a certificate of currency. Asking all four for a
 * site address and a program is how you lose three of them.
 *
 * So the type is chosen first and the form is only the fields that type
 * needs. The heading and the line under it change with it, because the
 * heading is the thing that tells you you are in the right place.
 *
 * `?type=docs` preselects Documents — the capability page's "Request
 * certificates" links land here, and a procurement officer should not have
 * to find the tab.
 *
 * It posts to the same /api/quote as every other form on the site, with the
 * type in the service label so the notification email says what it is
 * before anyone opens it.
 */

type Kind = "scope" | "service" | "home" | "docs";

const TABS: { t: Kind; label: string; h: string; s: string }[] = [
  {
    t: "scope",
    label: "Commercial scope",
    h: "Submit a scope.",
    s: "Drawings, a mechanical schedule or a site address is enough to begin.",
  },
  {
    t: "service",
    label: "Service or repair",
    h: "Book a service or repair.",
    s: "Tell us what the plant is doing. After hours goes to someone on the tools.",
  },
  {
    t: "home",
    label: "Home quote",
    h: "Get a home quote.",
    s: "An itemised quote with any rebates already applied.",
  },
  {
    t: "docs",
    label: "Documents",
    h: "Request documents.",
    s: "Certificates of currency and SWMS go out the same day you ask.",
  },
];

const PACKAGES = [
  "Tenancy or retail fit-out",
  "Base build mechanical",
  "System replacement on a live site",
  "Scheduled maintenance",
  "Type A & Type B gas",
  "Commercial hot water",
  "Commercial evaporative cooling",
  "Ventilation & kitchen exhaust",
  "Air balancing & commissioning",
  "A combination",
];
const SYSTEMS = ["Air conditioning", "Gas appliance", "Hot water", "Heat pump", "Ventilation / exhaust", "Not sure"];
const URGENCY = ["Plant is down", "This week", "Routine service"];
const HOME_INTEREST = [
  "Aircon installation",
  "Heat pump hot water",
  "Gas heating",
  "Hot water replacement",
  "Service & repairs",
];
const DOCS = ["Certificate of currency", "SWMS", "Capability statement", "Licence copies"];

export function ContactRouter() {
  const params = useSearchParams();
  const [kind, setKind] = useState<Kind>("scope");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addr, setAddr] = useState("");
  const [pkg, setPkg] = useState(PACKAGES[0]);
  const [program, setProgram] = useState("");
  const [system, setSystem] = useState(SYSTEMS[0]);
  const [urgency, setUrgency] = useState(URGENCY[0]);
  const [interest, setInterest] = useState(HOME_INTEREST[0]);
  const [suburb, setSuburb] = useState("");
  const [docs, setDocs] = useState<string[]>([DOCS[0]]);
  const [notes, setNotes] = useState("");
  const [hp, setHp] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The capability page links here with ?type=docs. Read once on mount.
  useEffect(() => {
    const q = params.get("type");
    if (q && TABS.some((t) => t.t === q)) setKind(q as Kind);
  }, [params]);

  const tab = TABS.find((t) => t.t === kind)!;
  const shows = (...on: Kind[]) => on.includes(kind);

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
    let encoded: EncodedFile[] = [];
    try {
      encoded = await Promise.all(files.map(readAsBase64));
    } catch {
      setError(`One of those files couldn't be read. Email them to ${site.email} instead and we'll pick it up from there.`);
      setBusy(false);
      return;
    }

    // The label the notification email is titled with, so whoever opens it
    // knows which of the four it is before reading a word.
    const service =
      kind === "scope" ? `Commercial · ${pkg}`
      : kind === "service" ? `Service · ${system} · ${urgency}`
      : kind === "home" ? `Home enquiry · ${interest}`
      : `Documents · ${docs.join(", ") || "not specified"}`;

    const summary = [
      company.trim() && `Company: ${company.trim()}`,
      kind === "scope" && program.trim() && `Program: ${program.trim()}`,
      kind === "home" && suburb.trim() && `Suburb: ${suburb.trim()}`,
      addr.trim() && `Site: ${addr.trim()}`,
      encoded.length && `${encoded.length} file${encoded.length === 1 ? "" : "s"} attached`,
    ].filter(Boolean).join(" · ");

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          summary,
          name,
          phone,
          email,
          address: addr || suburb,
          notes: [
            company.trim() && `Company: ${company.trim()}`,
            kind === "scope" && program.trim() && `Program: ${program.trim()}`,
            kind === "docs" && `Requested: ${docs.join(", ") || "not specified"}`,
            notes.trim(),
          ].filter(Boolean).join("\n"),
          hp,
          photos: encoded,
          pagePath: typeof window !== "undefined" ? window.location.pathname : "/commercial/contact",
          utm: readUtm(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // The row and the email are both server-side. If the request failed we
      // genuinely do not have it, so say so rather than showing a thank-you
      // for an enquiry that went nowhere.
      setError(`That didn't send. Email ${site.email} or ring ${site.phone} and we'll take it down.`);
      setBusy(false);
      return;
    }

    trackLead(service, summary);
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="cx-formcard" role="status">
        <div className="scopeform scopeform--done">
          <span className="scopeform__badge">Received</span>
          <span className="scopeform__tick" aria-hidden="true">✓</span>
          <h3>Thanks{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}, it&rsquo;s with us.</h3>
          <p>
            Read by the person who will deal with it, not a queue. For anything urgent, call{" "}
            <a href={`tel:${site.phoneE164}`}>{site.phone}</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cx-formcard">
      <div className="cx-ctype" role="tablist" aria-label="What are you getting in touch about?">
        {TABS.map((t) => (
          <button
            key={t.t}
            type="button"
            role="tab"
            aria-selected={t.t === kind}
            className={t.t === kind ? "is-on" : undefined}
            onClick={() => setKind(t.t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form className="scopeform" onSubmit={onSubmit} noValidate>
        <h2 className="scopeform__h">{tab.h}</h2>
        <p className="scopeform__sub">{tab.s}</p>

        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px" }}
        />

        {shows("scope", "service", "docs") && (
          <label className="scopeform__full">
            <span>Company</span>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" placeholder="Builder, FM or owner" />
          </label>
        )}

        <div className="scopeform__row">
          <label>
            <span>Your name *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
          <label>
            <span>Phone *</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
          </label>
        </div>

        <label className="scopeform__full">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>

        {shows("scope", "service", "home") && (
          <label className="scopeform__full">
            <span>Site address</span>
            <input type="text" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Where the work is" />
          </label>
        )}

        {shows("scope") && (
          <div className="scopeform__row">
            <label>
              <span>Package</span>
              <select value={pkg} onChange={(e) => setPkg(e.target.value)}>
                {PACKAGES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>
              <span>Program</span>
              <input type="text" value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Dates, or a rough window" />
            </label>
          </div>
        )}

        {shows("service") && (
          <div className="scopeform__row">
            <label>
              <span>System</span>
              <select value={system} onChange={(e) => setSystem(e.target.value)}>
                {SYSTEMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>
              <span>How urgent?</span>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                {URGENCY.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
          </div>
        )}

        {shows("home") && (
          <div className="scopeform__row">
            <label>
              <span>Interested in</span>
              <select value={interest} onChange={(e) => setInterest(e.target.value)}>
                {HOME_INTEREST.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>
              <span>Suburb</span>
              <input type="text" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Pakenham" />
            </label>
          </div>
        )}

        {shows("docs") && (
          <div className="scopeform__full">
            <span className="scopeform__fileslabel">What do you need?</span>
            <div className="cx-ticks">
              {DOCS.map((d) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={docs.includes(d)}
                    onChange={(e) =>
                      setDocs((cur) => (e.target.checked ? [...cur, d] : cur.filter((x) => x !== d)))
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="scopeform__full">
          <span>Details</span>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What's there now, what you need, anything that decides it."
          />
        </label>

        {shows("scope", "service") && (
          <div className="scopeform__files">
            <span className="scopeform__fileslabel">Attachments</span>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ATTACH_ACCEPT}
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
                if (fileInput.current) fileInput.current.value = "";
              }}
            />
            <button type="button" className="scopeform__attach" onClick={() => fileInput.current?.click()}>
              Attach files
            </button>
            <span className="scopeform__filehint">
              Plans, a schedule or a photo of the plant. PDF, DWG, Office or image, up to {niceSize(MAX_FILE_BYTES)} each.
            </span>
            {files.length > 0 && (
              <ul className="scopeform__filelist">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <span className="scopeform__filename">{f.name}</span>
                    <span className="scopeform__filesize">{niceSize(f.size)}</span>
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, n) => n !== i))}>
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p className="scopeform__err" role="alert">{error}</p>}

        <button type="submit" className="ds-btn ds-btn--orange ds-btn--lg scopeform__go" disabled={busy}>
          {busy ? (files.length ? "Uploading…" : "Sending…") : "Send →"}
        </button>
        <p className="scopeform__fine">No obligation. Read by the person who will price it.</p>
      </form>
    </div>
  );
}
