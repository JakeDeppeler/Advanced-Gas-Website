"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <form
      className="bl-news__form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email) return;
        setDone(true);
      }}
    >
      <input
        type="email"
        placeholder="your.email@example.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="ds-btn ds-btn--orange">
        {done ? "Subscribed ✓" : "Get updates →"}
      </button>
    </form>
  );
}
