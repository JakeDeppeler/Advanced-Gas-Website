"use client";

import { useState } from "react";

const CHIPS = [
  ["hp", "Heat pump hot water"],
  ["split", "Split system"],
  ["ducted", "Ducted aircon"],
  ["gas", "Gas heating"],
  ["hw", "Hot water"],
  ["service", "Service / safety"],
  ["commercial", "Commercial"],
  ["other", "Not sure yet"],
] as const;

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [suburb, setSuburb] = useState("");
  const [svcs, setSvcs] = useState<string[]>([]);
  const [propType, setPropType] = useState("Owner-occupier");
  const [bestTime, setBestTime] = useState("Anytime in business hours");
  const [notes, setNotes] = useState("");
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function toggle(id: string) {
    setSvcs((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone) return;
    setSubmitting(true);
    try {
      await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: svcs.join(", ") || "general enquiry",
          propertyType: propType,
          timing: bestTime,
          suburb,
          postcode: "",
          name,
          phone,
          email,
          notes,
          hp,
        }),
      });
    } catch {
      // ignore
    }
    setSent(true);
    setSubmitting(false);
  }

  return (
    <form className="ct-form" onSubmit={onSubmit} noValidate>
      <h2>Get a free quote</h2>
      <p className="ct-form__sub">60 seconds. We&apos;ll reply with a real time slot and a real price (after a 20-min site check).</p>

      <input
        type="text"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />

      <div className="ct-row">
        <div className="ct-field">
          <label>Your name <em>*</em></label>
          <input type="text" required placeholder="Sam Taylor" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="ct-field">
          <label>Phone <em>*</em></label>
          <input type="tel" required placeholder="0400 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="ct-row">
        <div className="ct-field">
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="ct-field">
          <label>Suburb <em>*</em></label>
          <input type="text" required placeholder="Pakenham, Officer, Berwick…" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
        </div>
      </div>

      <div className="ct-field ct-field--full">
        <label>What do you need? <em>*</em></label>
        <div className="ct-chips">
          {CHIPS.map(([id, label]) => (
            <label key={id} className="ct-chip">
              <input
                type="checkbox"
                checked={svcs.includes(id)}
                onChange={() => toggle(id)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="ct-row" style={{ marginTop: 14 }}>
        <div className="ct-field">
          <label>Property type</label>
          <select value={propType} onChange={(e) => setPropType(e.target.value)}>
            <option>Owner-occupier</option>
            <option>Rental / landlord</option>
            <option>Tenant</option>
            <option>Commercial</option>
          </select>
        </div>
        <div className="ct-field">
          <label>Best time to call</label>
          <select value={bestTime} onChange={(e) => setBestTime(e.target.value)}>
            <option>Anytime in business hours</option>
            <option>Morning (8am–12pm)</option>
            <option>Afternoon (12pm–5pm)</option>
            <option>Evening (after 5pm)</option>
          </select>
        </div>
      </div>

      <div className="ct-field ct-field--full" style={{ marginTop: 14 }}>
        <label>Anything else? (optional)</label>
        <textarea
          placeholder="e.g. ducted gas heater is making a clunking sound, looking to replace before winter, house is 4 bed, 2 bath, single storey."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="ct-submit">
        <p>We&apos;ll reply within 2 business hours. No call centres, no marketing emails.</p>
        <button type="submit" disabled={submitting} className="ds-btn ds-btn--orange ds-btn--lg">
          {sent ? "Sent ✓, we'll be in touch" : submitting ? "Sending…" : "Send my quote request →"}
        </button>
      </div>
    </form>
  );
}
