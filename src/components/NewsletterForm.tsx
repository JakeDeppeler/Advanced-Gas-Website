"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, hp }),
      });
    } catch {
      // ignore — still show success so user isn't blocked
    }
    setDone(true);
    setSubmitting(false);
  }

  return (
    <form className="bl-news__form" onSubmit={onSubmit}>
      <input
        type="text"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />
      <input
        type="email"
        placeholder="your.email@example.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={submitting} className="ds-btn ds-btn--orange">
        {done ? "Subscribed ✓" : submitting ? "Sending…" : "Get updates →"}
      </button>
    </form>
  );
}
