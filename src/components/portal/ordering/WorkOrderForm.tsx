"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendWorkOrder } from "@/app/portal/supply/work-orders/actions";

/**
 * Work orders › one job: what the electrician needs to know, filled in from
 * ServiceTitan and checked by the office, then sent. Sending also notes the
 * job in ServiceTitan with the work order attached and tags it GTE Booked.
 */
export function WorkOrderForm({ job, to, back }: {
  job: { id: number; job_number: string; job_type: string | null; date: string; time: string; site: string; customer: string; phone: string; email: string; crew: string };
  /** Who it goes to, for the button and the line under it. */
  to: { name: string; email: string | null };
  back: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [f, setF] = useState({ date: job.date, time: job.time, work: "", site: job.site, customer: job.customer, phone: job.phone, email: job.email, crew: job.crew, sendTo: to.email ?? "", cc: "" });
  const sameTo = f.sendTo.trim().toLowerCase() === (to.email ?? "").toLowerCase();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const field = (id: keyof typeof f, label: string, sub?: string, type = "text") => (
    <div className="pk-kv">
      <label className="t" htmlFor={`wo-${id}`}><b>{label}</b>{sub && <span>{sub}</span>}</label>
      <input id={`wo-${id}`} type={type} className="pk-in wide" value={f[id]} onChange={set(id)} />
    </div>
  );
  return (
    <section className="pk-card pk-pad" id="new-work-order">
      <div className="pk-card-h"><b>Job {job.job_number}</b><span>{job.job_type ?? ""}</span></div>
      {/* The one thing typed rather than read from ServiceTitan, so it gets the card's full width. */}
      <div style={{ display: "grid", gap: 6, padding: "10px 0 12px" }}>
        <label htmlFor="wo-work" className="pk-kv" style={{ border: 0, padding: 0 }}>
          <span className="t"><b>What&rsquo;s the electrical work?</b><span>what Geoff reads first — the circuit, the isolator, the switchboard</span></span>
        </label>
        <textarea id="wo-work" className="pk-in" rows={3} style={{ width: "100%", resize: "vertical" }} value={f.work} onChange={set("work")}
          placeholder="e.g. New 20A circuit for the heat pump, isolator at the unit" />
      </div>
      {field("date", "Day", "when you want him there", "date")}
      {field("time", "Time", "blank for any time that day", "time")}
      {field("site", "Site")}
      {field("customer", "Customer")}
      {field("phone", "Phone")}
      {field("email", "Email")}
      {field("crew", "Our crew on site", "names, with commas")}
      {field("sendTo", "Send to", `${to.name} unless you change it — for sending this one somewhere else`, "email")}
      {field("cc", "Also copy", "anyone else who should get it, with commas")}
      <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
        <button type="button" className="pk-btn" disabled={busy || !f.work.trim() || !f.date} onClick={() => start(async () => {
          setMsg(null);
          const r = await sendWorkOrder({ jobId: job.id, ...f });
          setMsg(r.ok ? { ok: true, text: r.note ?? "Sent." } : { ok: false, text: r.error ?? "It didn’t send." });
          if (r.ok) { router.push(back); router.refresh(); }
        })}>{busy ? "Sending…" : sameTo ? `Send to ${to.name}` : f.sendTo.trim() ? `Send to ${f.sendTo.trim()}` : "Send"}</button>
        <a href={back} className="pk-btn g">Pick another job</a>
        {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
      </div>
      <p className="pk-note" style={{ marginTop: 10 }}>
        Emailed to {f.sendTo.trim() || to.email || "the electrician"}, copied to the office{f.cc.trim() ? ` and ${f.cc.trim()}` : ""}. Then the job in ServiceTitan gets a note with the work order attached, and its tag goes to GTE Booked.
      </p>
    </section>
  );
}
