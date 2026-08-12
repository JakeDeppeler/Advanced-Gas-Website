"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Short-form lead capture for the paid-traffic landing page.
 *
 * Deliberately not the four-step wizard from /quote. Someone who
 * clicked an ad because their hot water died this morning will not work
 * through a wizard, and every extra field costs conversions. This asks
 * the four things we genuinely cannot quote without, and everything
 * else gets asked on the phone.
 *
 * Posts to the same /api/quote endpoint as the main form so leads land
 * in one inbox, in one format, however they arrived.
 */

const SITUATIONS = [
  { id: "no-hot-water", t: "No hot water at all" },
  { id: "running-out", t: "Runs out too fast" },
  { id: "leaking", t: "Leaking or rusty" },
  { id: "planned", t: "Still works, planning ahead" },
];

export function LpLeadForm({ id = "lp-form", compact = false }: { id?: string; compact?: boolean }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    situation: "",
    name: "",
    phone: "",
    suburb: "",
    // Honeypot. Bots fill everything; people never see this.
    hp: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const ready = f.name.trim() && f.phone.trim() && f.suburb.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "heat-pump-install",
          summary: `Hot water landing page: ${
            SITUATIONS.find((s) => s.id === f.situation)?.t ?? "not stated"
          }`,
          name: f.name,
          phone: f.phone,
          email: "",
          suburb: f.suburb,
          notes: "Came in from the hot water landing page.",
          hp: f.hp,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      router.push("/thanks");
    } catch {
      setError(
        "That didn't send. Call us on (03) 5947 8000 and we'll sort it on the phone.",
      );
      setSending(false);
    }
  }

  return (
    <form className={`lpf${compact ? " lpf--compact" : ""}`} onSubmit={submit} id={id}>
      <div className="lpf__head">
        <strong>Get a fixed price on your hot water</strong>
        <span>Back to you within 2 business hours. No obligation.</span>
      </div>

      <fieldset className="lpf__sit">
        <legend>What&rsquo;s happening?</legend>
        <div className="lpf__sitgrid">
          {SITUATIONS.map((s) => (
            <label key={s.id} className={`lpf__pill${f.situation === s.id ? " is-on" : ""}`}>
              <input
                type="radio"
                name={`${id}-situation`}
                value={s.id}
                checked={f.situation === s.id}
                onChange={() => setF((x) => ({ ...x, situation: s.id }))}
              />
              {s.t}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="lpf__field">
        <span>Your name</span>
        <input type="text" value={f.name} onChange={set("name")} autoComplete="name" required />
      </label>

      <label className="lpf__field">
        <span>Mobile</span>
        <input
          type="tel"
          value={f.phone}
          onChange={set("phone")}
          autoComplete="tel"
          inputMode="tel"
          required
        />
      </label>

      <label className="lpf__field">
        <span>Suburb</span>
        <input
          type="text"
          value={f.suburb}
          onChange={set("suburb")}
          autoComplete="address-level2"
          placeholder="Pakenham"
          required
        />
      </label>

      {/* Honeypot */}
      <div className="lpf__hp" aria-hidden="true">
        <label>
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={f.hp} onChange={set("hp")} />
        </label>
      </div>

      {error && <p className="lpf__err">{error}</p>}

      <button type="submit" className="lpf__go" disabled={!ready || sending}>
        {sending ? "Sending…" : "Get my fixed price →"}
      </button>

      <p className="lpf__fine">
        Jake or Chaz will call you. Not a call centre, not a sales rep.
      </p>
    </form>
  );
}
