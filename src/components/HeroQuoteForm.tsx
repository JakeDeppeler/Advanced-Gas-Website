"use client";

import { useState } from "react";

const SERVICES = [
  { id: "hp", t: "🔥 Heat pump hot water", s: "Reclaim · iStore · Thermann" },
  { id: "split", t: "❄ Split system aircon", s: "Mitsubishi · Kaden" },
  { id: "ducted", t: "🌬 Ducted aircon", s: "Whole-home cooling" },
  { id: "service", t: "⚙ Service / repair", s: "Gas, hot water, aircon" },
];

const TOTAL = 4;

export function HeroQuoteForm() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [service, setService] = useState("hp");
  const [suburb, setSuburb] = useState("");
  const [propType, setPropType] = useState("House — owner occupied");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < TOTAL) {
      setStep((s) => s + 1);
      return;
    }
    if (!name || !phone) return;
    setSubmitting(true);
    try {
      await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          propertyType: propType,
          timing: "",
          suburb,
          postcode: "",
          name,
          phone,
          email,
          notes: "",
          hp,
        }),
      });
    } catch {
      // swallow — we still show success since lead may have been logged server-side
    }
    setDone(true);
  }

  if (done) {
    return (
      <aside className="quote-card" id="quote">
        <div className="quote-card__done">
          <div className="quote-card__done-tick">✓</div>
          <h2 className="quote-card__h">Got it. We&apos;ll be in touch.</h2>
          <p className="quote-card__sub">
            A real human will call or SMS within 2 business hours with your rebate number and next step.
          </p>
          <p className="qform__finep" style={{ marginTop: 24 }}>
            If urgent right now, call us on{" "}
            <a href="tel:+61359478000" style={{ color: "var(--navy)" }}>
              <strong>(03) 5947 8000</strong>
            </a>
            .
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="quote-card" id="quote">
      <div className="quote-card__ribbon">
        <span className="quote-card__ribbon-dot" />
        Free quote · usually replied within 2 hrs
      </div>

      <h2 className="quote-card__h">
        How much will you save<br />
        with the VEU rebate?
      </h2>
      <p className="quote-card__sub">
        4 quick questions. We check your eligibility and call you back with a real number.
      </p>

      <form onSubmit={onSubmit} noValidate>
        {/* honeypot */}
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px" }}
        />

        <fieldset className={`qform__step ${step === 1 ? "is-active" : ""}`}>
          <legend className="qform__legend">
            <span>Step 1 / 4</span> What do you need?
          </legend>
          <div className="qform__grid">
            {SERVICES.map((s) => (
              <label key={s.id} className="qf-opt">
                <input
                  type="radio"
                  name="svc"
                  checked={service === s.id}
                  onChange={() => setService(s.id)}
                />
                <span className="qf-opt__t">{s.t}</span>
                <span className="qf-opt__s">{s.s}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={`qform__step ${step === 2 ? "is-active" : ""}`}>
          <legend className="qform__legend">
            <span>Step 2 / 4</span> Your suburb &amp; property
          </legend>
          <div className="qform__row">
            <label className="qf-field">
              <span>Suburb / postcode</span>
              <input
                type="text"
                placeholder="e.g. Pakenham 3810"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
              />
            </label>
            <label className="qf-field">
              <span>Property type</span>
              <select value={propType} onChange={(e) => setPropType(e.target.value)}>
                <option>House — owner occupied</option>
                <option>House — rental / investment</option>
                <option>Townhouse / unit</option>
                <option>Commercial</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className={`qform__step ${step === 3 ? "is-active" : ""}`}>
          <legend className="qform__legend">
            <span>Step 3 / 4</span> Anything else? <em style={{ color: "var(--ink-3)", fontStyle: "normal", fontFamily: "var(--f-body)", fontWeight: 500, fontSize: "12.5px", marginLeft: 6 }}>(optional)</em>
          </legend>
          <label className="qf-field">
            <span>Notes</span>
            <input
              type="text"
              placeholder="e.g. 4 bed house, replace ducted gas"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <p className="qform__finep">
            Don&apos;t stress — we&apos;ll figure out the right kit at the site visit.
          </p>
        </fieldset>

        <fieldset className={`qform__step ${step === 4 ? "is-active" : ""}`}>
          <legend className="qform__legend">
            <span>Step 4 / 4</span> Where do we send your quote?
          </legend>
          <div className="qform__row">
            <label className="qf-field">
              <span>First name</span>
              <input
                type="text"
                placeholder="Jamie"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="qf-field">
              <span>Mobile</span>
              <input
                type="tel"
                placeholder="04xx xxx xxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="qf-field">
            <span>Email (for quote PDF)</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </fieldset>

        <div className="qform__foot">
          <div className="qform__dots" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <i key={i} className={i <= step ? "is-on" : ""} />
            ))}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="ds-btn ds-btn--orange ds-btn--lg qform__next"
          >
            {step === TOTAL ? (submitting ? "Sending…" : "Send my quote request →") : "Next →"}
          </button>
        </div>

        <p className="qform__finep">
          By submitting you agree to a one-time callback. No spam, no shared data.
        </p>
      </form>
    </aside>
  );
}
