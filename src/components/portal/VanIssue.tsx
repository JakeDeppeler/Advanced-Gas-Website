"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { raiseVanIssue } from "@/app/trade/monday/actions";

const SERVICE = ["Due for a service", "Warning light on", "Tyres", "Brakes", "Something else"];
const URGENCY = ["Can wait", "This week", "Off the road"];

/**
 * Raise a service request or report damage on your own van.
 *
 * Both land in the van's log, which is where the office already looks — rather
 * than an email that lives in one inbox, or a second table that would need its
 * own page to be read on.
 */
export function VanIssue({ vanName }: { vanName: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [kind, setKind] = useState<"service" | "damage">("service");
  const [what, setWhat] = useState(SERVICE[0]);
  const [urgency, setUrgency] = useState(URGENCY[1]);
  const [detail, setDetail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  function send() {
    setMsg(""); setSent(false);
    start(async () => {
      const res = await raiseVanIssue({
        kind,
        what: kind === "service" ? what : "Damage",
        urgency: kind === "service" ? urgency : "",
        detail,
      });
      if (!res.ok) { setMsg(res.error || "Couldn't send it."); return; }
      setDetail(""); setSent(true);
      router.refresh();
    });
  }

  return (
    <section className="tr-panel tr-stack" style={{ gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {([["service", "Request a service"], ["damage", "Report damage"]] as const).map(([k, label]) => (
          <button
            key={k} type="button" aria-pressed={kind === k}
            onClick={() => { setKind(k); setSent(false); }}
            className={`tr-tab${kind === k ? " is-on" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === "service" ? (
        <>
          <label className="tr-field">
            What needs doing
            <select value={what} onChange={(e) => setWhat(e.target.value)}>
              {SERVICE.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="tr-field">
            How urgent
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              {URGENCY.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="tr-field">
            Notes
            <textarea rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What you noticed and when" />
          </label>
        </>
      ) : (
        <>
          <label className="tr-field">
            Where and how
            <textarea
              rows={4} value={detail} onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. Scrape on the passenger door, reversing at a site"
            />
          </label>
          {/* Photos go on the van through the Monday walk-around, which is
              where the angles and the labels already live. Offering a second,
              unlabelled uploader here would put damage photos somewhere the
              monthly comparison never looks. */}
          <span className="tr-foot">
            Photos of damage go on the walk-around, so they sit with the rest of the van&rsquo;s record.
          </span>
        </>
      )}

      {msg && <span className="tr-note tr-note--warn">{msg}</span>}
      {sent && <span className="tr-note">Sent. It&rsquo;s on {vanName}&rsquo;s record now.</span>}

      <button type="button" className="tr-btn tr-btn--go" disabled={busy} onClick={send}>
        {busy ? "Sending…" : kind === "service" ? "Send to the office" : "Report damage"}
      </button>
      <span className="tr-foot">Goes to whoever is on the fleet page in the office.</span>
    </section>
  );
}
