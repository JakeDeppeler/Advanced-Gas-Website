"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeWoContact, saveWoContact, sendWorkOrder } from "@/app/portal/supply/work-orders/actions";
import type { WoContact } from "@/lib/ordering/workOrders";
import { JobFilesPicker, type PickedFile } from "./JobFilesPicker";

/**
 * Work orders › one job: what the electrician needs to know, filled in from
 * ServiceTitan and checked by the office, then sent. Sending also notes the
 * job in ServiceTitan with the work order attached and tags it GTE Booked.
 */
export function WorkOrderForm({ job, to, back, contacts: saved }: {
  job: { id: number; job_number: string; job_type: string | null; date: string; time: string; site: string; customer: string; phone: string; email: string; crew: string };
  /** The electrician on file: who it goes to unless someone else is picked. */
  to: { name: string; email: string | null };
  back: string;
  /** Everyone else work orders go to, saved to pick: water balancing, a plumber. */
  contacts: WoContact[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [f, setF] = useState({ date: job.date, time: job.time, work: "", site: job.site, customer: job.customer, phone: job.phone, email: job.email, crew: job.crew, sendTo: to.email ?? "", cc: "" });
  const [contacts, setContacts] = useState(saved);
  const [files, setFiles] = useState<PickedFile[]>([]);
  // Who it's for: the electrician (null) or one of the saved people.
  const [pick, setPick] = useState<WoContact | null>(null);
  const [adding, setAdding] = useState(false);
  const [nc, setNc] = useState({ name: "", trade: "", email: "" });
  const choose = (c: WoContact | null) => { setPick(c); setF((x) => ({ ...x, sendTo: c ? c.email : to.email ?? "" })); };
  const who = pick ? pick.name : to.name;
  const sameTo = f.sendTo.trim().toLowerCase() === (pick ? pick.email : to.email ?? "").toLowerCase();
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
      <div className="wo-who" role="group" aria-label="Who it's for">
        <span className="wo-whol">Who&rsquo;s it for?</span>
        <div className="qp-opts">
          <button type="button" className={pick == null ? "on" : undefined} aria-pressed={pick == null} onClick={() => choose(null)}>{to.name} <em>Electrical</em></button>
          {contacts.map((c) => (
            <span key={c.id} className="wo-chip">
              <button type="button" className={pick?.id === c.id ? "on" : undefined} aria-pressed={pick?.id === c.id} onClick={() => choose(c)}>{c.name} <em>{c.trade}</em></button>
              <button type="button" className="wo-x" aria-label={`Take ${c.name} off the list`} title="Take off the list" onClick={() => {
                if (!confirm(`Take ${c.name} off the list?`)) return;
                start(async () => { const r = await removeWoContact(c.id); if (r.ok) { setContacts((l) => l.filter((x) => x.id !== c.id)); if (pick?.id === c.id) choose(null); } });
              }}>×</button>
            </span>
          ))}
          {!adding && <button type="button" onClick={() => setAdding(true)}>+ Someone new</button>}
        </div>
        {adding && (
          <div className="wo-new">
            <input id="wo-nc-name" className="pk-in" placeholder="Name, e.g. Ross Brennan" value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} aria-label="Their name" />
            <input id="wo-nc-trade" className="pk-in" placeholder="What they do, e.g. Water balancing" value={nc.trade} onChange={(e) => setNc({ ...nc, trade: e.target.value })} aria-label="What work they do" />
            <input id="wo-nc-email" className="pk-in" type="email" placeholder="Email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} aria-label="Their email" />
            <button type="button" className="pk-btn" disabled={busy || !nc.name.trim() || !nc.trade.trim() || !nc.email.trim()} onClick={() => start(async () => {
              const r = await saveWoContact(nc);
              if (r.ok && r.contact) { setContacts((l) => [...l.filter((x) => x.email !== r.contact!.email), r.contact!]); choose(r.contact); setAdding(false); setNc({ name: "", trade: "", email: "" }); setMsg(null); }
              else setMsg({ ok: false, text: r.error ?? "Couldn't save them." });
            })}>Save and pick</button>
            <button type="button" className="pk-btn g" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        )}
      </div>
      {/* The one thing typed rather than read from ServiceTitan, so it gets the card's full width. */}
      <div style={{ display: "grid", gap: 6, padding: "10px 0 12px" }}>
        <label htmlFor="wo-work" className="pk-kv" style={{ border: 0, padding: 0 }}>
          <span className="t">
            <b>{pick ? `What's the ${pick.trade.toLowerCase()}?` : "What's the electrical work?"}</b>
            <span>{pick ? `what ${pick.name.split(" ")[0]} reads first` : "what Geoff reads first, the circuit, the isolator, the switchboard"}</span>
          </span>
        </label>
        <textarea id="wo-work" className="pk-in" rows={3} style={{ width: "100%", resize: "vertical" }} value={f.work} onChange={set("work")}
          placeholder={pick ? `e.g. ${pick.trade} for the new ducted system, all outlets` : "e.g. New 20A circuit for the heat pump, isolator at the unit"} />
      </div>
      {field("date", "Day", "when you want them there", "date")}
      {field("time", "Time", "blank for any time that day", "time")}
      {field("site", "Site")}
      {field("customer", "Customer")}
      {field("phone", "Phone")}
      {field("email", "Email")}
      {field("crew", "Our crew on site", "names, with commas")}
      {field("sendTo", "Send to", `${who} unless you change it, for sending this one somewhere else`, "email")}
      {field("cc", "Also copy", "anyone else who should get it, with commas")}
      <div style={{ paddingTop: 14 }}><JobFilesPicker jobId={job.id} jobNumber={job.job_number} picked={files} onChange={setFiles} photosGo /></div>
      <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
        <button type="button" className="pk-btn" disabled={busy || !f.work.trim() || !f.date} onClick={() => start(async () => {
          setMsg(null);
          const r = await sendWorkOrder({ jobId: job.id, ...f, files, ...(pick ? { trade: pick.trade, toName: pick.name } : {}) });
          setMsg(r.ok ? { ok: true, text: r.note ?? "Sent." } : { ok: false, text: r.error ?? "It didn’t send." });
          if (r.ok) { router.push(back); router.refresh(); }
        })}>{busy ? "Sending…" : sameTo ? `Send to ${who}` : f.sendTo.trim() ? `Send to ${f.sendTo.trim()}` : "Send"}</button>
        <a href={back} className="pk-btn g">Pick another job</a>
        {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
      </div>
      <p className="pk-note" style={{ marginTop: 10 }}>
        Emailed to {f.sendTo.trim() || to.email || "the electrician"}, copied to the office{f.cc.trim() ? ` and ${f.cc.trim()}` : ""}{files.length ? `, with ${files.length === 1 ? "the file" : `${files.length} files`} from the job` : ""}. Then the job in ServiceTitan gets a note with the work order attached{pick ? "" : ", and its tag goes to GTE Booked"}.
      </p>
    </section>
  );
}
