"use client";

import { useState } from "react";
import { trackLead, readUtm } from "@/lib/track";
import { site } from "@/lib/site";

/**
 * The way in from the middle of the journey.
 *
 * The journey runs twelve beats and the scope form sits under all of it, which
 * is a long way to make somebody scroll before they can do anything. This is
 * the short version, dropped in straight after the beat that answers what
 * procurement asks for — insurances, licences, SWMS — because that is the beat
 * where somebody decides we are worth a conversation.
 *
 * Three fields, because three is what you can ask for in the middle of
 * somebody else's train of thought. Anyone with drawings to attach is pointed
 * at the full form rather than having a file picker forced on them here.
 *
 * Same endpoint as the full form, tagged so the enquiry says where it came
 * from — a lead from here is a different kind of lead from one where somebody
 * scrolled the whole page and filled in eight fields, and the inbox should be
 * able to tell them apart.
 */
export function CommercialScopeBand() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [what, setWhat] = useState("");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("A name and a number is all we need to ring you back.");
      return;
    }
    setBusy(true);

    const service = "Commercial · Mid-page";
    const summary = what.trim() ? `Job: ${what.trim()}` : "No detail given";

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          summary,
          name,
          phone,
          email: "",
          address: "",
          notes: what.trim(),
          hp,
          photos: [],
          pagePath: typeof window !== "undefined" ? window.location.pathname : "/commercial",
          utm: readUtm(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setError(`That didn't send. Ring ${site.phone} or email ${site.email} and we'll take it down.`);
      setBusy(false);
      return;
    }

    trackLead(service, summary);
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="cjband__panel cjband__panel--done" role="status">
        <span className="cjband__tick" aria-hidden="true">&#10003;</span>
        <div>
          <strong>Got it{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}.</strong>
          <p>
            Jake reads these himself. You&rsquo;ll hear back today if it landed in business hours. Carry on down the
            page &mdash; the rest of the job is below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cjband__panel">
      <div className="cjband__head">
        <span className="cjband__eye">Seen enough?</span>
        <h3>Start it here, before the rest of the page.</h3>
        <p>
          Name, number, and a line about the job. No forms to work through and nothing to attach &mdash; we&rsquo;ll
          come back and ask for what we need.
        </p>
      </div>

      <form className="cjband__form" onSubmit={onSubmit} noValidate>
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px" }}
        />

        <div className="cjband__row">
          <label className="cjband__f">
            <span>Name</span>
            <input
              id="cjband-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className="cjband__f">
            <span>Phone</span>
            <input
              id="cjband-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </label>
        </div>

        <label className="cjband__f">
          <span>What and where</span>
          <input
            id="cjband-what"
            type="text"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder="Retail fit-out, Dandenong South"
          />
        </label>

        {error ? <p className="cjband__err" role="alert">{error}</p> : null}

        <div className="cjband__actions">
          <button type="submit" className="ds-btn ds-btn--orange" disabled={busy}>
            {busy ? "Sending…" : "Send it →"}
          </button>
          <a href="#scope" className="cjband__alt">
            Got drawings? Use the full scope form&nbsp;&darr;
          </a>
        </div>
      </form>
    </div>
  );
}
