"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { jobFill, saveWorkOrder, searchJobs } from "@/app/portal/supply/work-orders/actions";
import type { JobHit, WoContact, WorkOrderRow } from "@/lib/ordering/workOrders";
import { JobFilesPicker, type PickedFile } from "./JobFilesPicker";

const day = (iso: string) => new Date(iso.length > 10 ? iso : `${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
const hhmm = (iso: string) => new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)).replace(/^24/, "00");
const stJob = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;
const isSparky = (w: WorkOrderRow) => !w.details?.trade || /electric/i.test(w.details.trade);
const emailIn = (s: string | null) => s?.match(/[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/)?.[0] ?? "";

type Sparky = { name: string; email: string | null };

function onTheJob(w: WorkOrderRow): string {
  if (w.status !== "sent") return "";
  if (w.st_note_error) return `ServiceTitan: ${w.st_note_error}`;
  const jobs = (w.details?.jobs ?? []).map((j) => j.job_id);
  const done = w.st_notes ?? [];
  const all = jobs.length > 0 && jobs.every((j) => done.some((d) => d.job_id === j && d.note && d.file));
  return all ? "Noted on the job with the work order attached" : "Not on the job in ServiceTitan yet";
}

/**
 * Work orders, each one a row that opens what it was: where it went, who it
 * was emailed to and copied to, what the work was, the job, and how it stands
 * in ServiceTitan. From there it can be edited — the job number when it went
 * against the quote's job rather than the install's, the details, who it's
 * for — and a draft sent, or a sent one emailed again with the changes.
 */
export function WorkOrderList({ list, sparky, contacts }: { list: WorkOrderRow[]; sparky: Sparky | null; contacts: WoContact[] }) {
  // By id, so the pop-up shows the row as it reads after a save refreshes the list.
  const [openId, setOpen] = useState<number | null>(null);
  const open = list.find((w) => w.id === openId) ?? null;
  return (
    <>
      <ul className="wo-list">
        {list.map((w) => {
          const d = w.details;
          const jobs = (d?.jobs ?? []).map((j) => j.job_number).filter(Boolean).join(" & ");
          const when = d ? (d.start_at ? `${day(d.start_at)} ${time(d.start_at)}` : day(d.date)) : "";
          const state = w.status === "sent" ? `Sent ${w.sent_at ? day(w.sent_at) : ""}` : w.send_error ? "Didn't send" : "Draft";
          return (
            <li key={w.id}>
              <button type="button" className="wo-row" onClick={() => setOpen(w.id)}>
                <span className="wo-row-t">
                  <b>Job {jobs || "?"}, {when}</b>
                  <span>{[d?.site_address, isSparky(w) ? "Electrical" : d?.trade, d?.jobs.map((j) => j.work).filter(Boolean).join("; ")].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={`wo-state${w.status === "sent" ? " sent" : w.send_error ? " bad" : ""}`}>{state}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {/* On the page itself: inside the card, whose styling makes a layer of its own, the pop-up would be held to the card. */}
      {open && createPortal(<WorkOrderPanel w={open} sparky={sparky} contacts={contacts} onClose={() => setOpen(null)} />, document.querySelector(".pt.pn") ?? document.body)}
    </>
  );
}

function WorkOrderPanel({ w, sparky, contacts, onClose }: { w: WorkOrderRow; sparky: Sparky | null; contacts: WoContact[]; onClose: () => void }) {
  // A draft is opened to be fixed and sent, so it opens on the form.
  const [editing, setEditing] = useState<false | "details" | "job">(w.status === "sent" ? false : "details");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  const d = w.details;
  const job = d?.jobs[0];
  const when = d ? (d.start_at ? `${day(d.start_at)}, ${time(d.start_at)}` : day(d.date)) : "";
  const to = w.sent_to ?? "";
  const cc = (w.cc_emails ?? []).join(", ");
  const facts: Array<[string, React.ReactNode]> = [
    ["For", isSparky(w) ? "Electrical" : `${d?.trade}${d?.to_name ? `, ${d.to_name}` : ""}`],
    ["Emailed to", w.status === "sent" ? to || "nobody recorded" : w.send_error ? `Didn't send: ${w.send_error}` : "Not sent yet, it's a draft on To order"],
    ...(cc ? [["Also copied", `${cc}, and the office`] as [string, React.ReactNode]] : [["Also copied", "the office"] as [string, React.ReactNode]]),
    ["Sent", w.sent_at ? `${day(w.sent_at)}, ${time(w.sent_at)}${w.approved_by ? ` by ${w.approved_by}` : ""}` : ""],
    ["When", when],
    ["Site", d?.site_address ?? ""],
    ["The work", (d?.jobs ?? []).map((j) => j.work).filter(Boolean).join("; ") || "Not written down"],
    ["Customer", [d?.customer_name, d?.customer_phone, d?.customer_email].filter(Boolean).join(" · ")],
    ["Our crew", d?.crew.join(", ") || "To be confirmed"],
    ["Files with it", (d?.files ?? []).map((f) => f.name).join(", ")],
    ["ServiceTitan", onTheJob(w)],
  ];
  return (
    <div className="qp-scrim mid" onClick={onClose}>
      <div className="qp-panel mid wo-panel" role="dialog" aria-modal="true" aria-labelledby="wo-panel-h" onClick={(e) => e.stopPropagation()}>
        <div className="qp-ph">
          <span>Work order {w.po_number}{w.status === "sent" ? "" : ", draft"}</span>
          <button type="button" className="qp-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <h2 id="wo-panel-h" className="rl-h">Job {job?.job_number ?? "?"}{job?.customer_name ? `, ${job.customer_name}` : ""}</h2>
        {editing && d ? (
          <WorkOrderEdit w={w} sparky={sparky} contacts={contacts} findFirst={editing === "job"} onCancel={() => (w.status === "sent" ? setEditing(false) : onClose())} onDone={(text) => { setMsg({ ok: true, text }); setEditing(false); }} />
        ) : (
          <>
            <dl className="wo-facts">
              {facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <div className="qp-links">
              {d && <button type="button" className="qp-btn dark" onClick={() => { setMsg(null); setEditing("details"); }}>{w.status === "sent" ? "Edit" : "Edit and send"}</button>}
              {d && <button type="button" className="qp-btn line" onClick={() => { setMsg(null); setEditing("job"); }}>Change the job number</button>}
              {job && <a className="qp-btn line" href={stJob(job.job_id)} target="_blank" rel="noreferrer">Job {job.job_number} in ServiceTitan ↗</a>}
            </div>
          </>
        )}
        {msg && <p className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}

type Pick = { kind: "sparky" } | { kind: "saved"; c: WoContact } | { kind: "other" };

/** Who a work order is for as it stands: the electrician, one of the saved people, or someone typed in. */
function pickFor(w: WorkOrderRow, contacts: WoContact[]): Pick {
  const d = w.details;
  const sentTo = emailIn(w.sent_to).toLowerCase();
  if (d?.trade && !/electric/i.test(d.trade)) {
    const c = contacts.find((x) => x.trade.toLowerCase() === d.trade!.toLowerCase() && (!d.to_name || x.name === d.to_name))
      ?? contacts.find((x) => x.email.toLowerCase() === sentTo);
    return c ? { kind: "saved", c } : { kind: "other" };
  }
  return { kind: "sparky" };
}

function WorkOrderEdit({ w, sparky, contacts, findFirst, onCancel, onDone }: {
  w: WorkOrderRow; sparky: Sparky | null; contacts: WoContact[]; findFirst: boolean; onCancel: () => void; onDone: (text: string) => void;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const d = w.details!;
  const first = d.jobs[0];
  const sent = w.status === "sent";
  const [job, setJob] = useState({ id: first?.job_id ?? 0, number: first?.job_number ?? "", who: first?.customer_name ?? "" });
  const [finding, setFinding] = useState(findFirst || !first);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<JobHit[] | null>(null);
  const [pick, setPick] = useState<Pick>(() => pickFor(w, contacts));
  const [files, setFiles] = useState<PickedFile[]>(d.files ?? []);
  const [f, setF] = useState({
    date: d.date, time: d.start_at ? hhmm(d.start_at) : "", work: d.jobs.map((j) => j.work).filter(Boolean).join("; "),
    site: d.site_address, customer: d.customer_name ?? "", phone: d.customer_phone ?? "", email: d.customer_email ?? "", crew: d.crew.join(", "),
    trade: d.trade && !/electric/i.test(d.trade) ? d.trade : "", toName: d.to_name ?? "",
    sendTo: emailIn(w.sent_to) || (pick.kind === "saved" ? pick.c.email : sparky?.email ?? ""),
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const choose = (p: Pick) => {
    setPick(p);
    setF((x) => p.kind === "saved" ? { ...x, trade: p.c.trade, toName: p.c.name, sendTo: p.c.email }
      : p.kind === "sparky" ? { ...x, trade: "", toName: "", sendTo: sparky?.email ?? x.sendTo }
      : { ...x, trade: "", toName: "", sendTo: "" });
  };
  const changedJob = job.id !== (first?.job_id ?? 0);
  const field = (id: keyof typeof f, label: string, type = "text", wide = false) => (
    <label className={`wo-f${wide ? " wide" : ""}`} htmlFor={`woe-${id}`}>
      <span>{label}</span>
      <input id={`woe-${id}`} type={type} className="pk-in" value={f[id]} onChange={set(id)} />
    </label>
  );
  const save = (then: "save" | "send" | "resend") => start(async () => {
    setErr(null);
    const trade = pick.kind === "sparky" ? "" : f.trade;
    const r = await saveWorkOrder({ id: w.id, jobId: job.id, ...f, files, trade, toName: pick.kind === "sparky" ? "" : f.toName, then });
    if (!r.ok) { setErr(r.error ?? "Couldn't save it."); return; }
    router.refresh();
    onDone(r.note ?? "Saved.");
  });
  const toWho = f.sendTo.trim() || (pick.kind === "sparky" ? sparky?.email : "") || "";

  return (
    <div className="wo-edit">
      <div className="wo-jobline">
        <span className="wo-whol">Job</span>
        <b>{job.number ? `Job ${job.number}` : "No job"}{job.who ? ` · ${job.who}` : ""}</b>
        {changedJob && <em className="wo-was">was {first?.job_number}</em>}
        {!finding && <button type="button" className="qp-btn line sm" onClick={() => setFinding(true)}>Change</button>}
      </div>
      {finding && (
        <div className="wo-move">
          <form className="wo-search" onSubmit={(e) => { e.preventDefault(); start(async () => setHits(await searchJobs(q))); }}>
            <input id="wo-move-q" className="pk-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job number, customer or suburb" aria-label="Find the job" autoFocus />
            <button type="submit" className="qp-btn dark" disabled={busy || q.trim().length < 2}>Find</button>
            <button type="button" className="qp-btn line" onClick={() => { setFinding(false); setHits(null); }}>Cancel</button>
          </form>
          {hits && !hits.length && <p className="qp-note">No job matches.</p>}
          {hits && hits.length > 0 && (
            <ul className="wo-hits">
              {hits.filter((h) => h.id !== job.id).map((h) => (
                <li key={h.id}>
                  <button type="button" disabled={busy} onClick={() => start(async () => {
                    setJob({ id: h.id, number: h.job_number, who: h.customer_name ?? "" });
                    // Files belong to the job they were ticked on.
                    setFinding(false); setHits(null); setFiles([]);
                    // The new job's own site and customer, still there to change before saving.
                    const j = await jobFill(h.id);
                    if (j) setF((x) => ({ ...x, site: j.site || x.site, customer: j.customer || x.customer, phone: j.phone || x.phone, email: j.email || x.email }));
                  })}>
                    <b>Job {h.job_number}{h.customer_name ? ` · ${h.customer_name}` : ""}</b>
                    <span>{[h.job_type, h.suburb, h.status].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sent && <p className="qp-note">The new job gets the note and the work order in ServiceTitan. The old job&rsquo;s note stays; ServiceTitan doesn&rsquo;t let notes be taken back.</p>}
        </div>
      )}

      <div className="wo-who" role="group" aria-label="Who it's for">
        <span className="wo-whol">Who&rsquo;s it for?</span>
        <div className="qp-opts">
          <button type="button" className={pick.kind === "sparky" ? "on" : undefined} aria-pressed={pick.kind === "sparky"} onClick={() => choose({ kind: "sparky" })}>{sparky?.name ?? "The electrician"} <em>Electrical</em></button>
          {contacts.map((c) => (
            <button key={c.id} type="button" className={pick.kind === "saved" && pick.c.id === c.id ? "on" : undefined} aria-pressed={pick.kind === "saved" && pick.c.id === c.id} onClick={() => choose({ kind: "saved", c })}>{c.name} <em>{c.trade}</em></button>
          ))}
          <button type="button" className={pick.kind === "other" ? "on" : undefined} aria-pressed={pick.kind === "other"} onClick={() => choose({ kind: "other" })}>Someone else</button>
        </div>
        {pick.kind === "other" && (
          <div className="wo-new">
            <input id="woe-trade" className="pk-in" placeholder="What they do, e.g. Plumbing" value={f.trade} onChange={set("trade")} aria-label="What work they do" />
            <input id="woe-toName" className="pk-in" placeholder="Their name" value={f.toName} onChange={set("toName")} aria-label="Their name" />
          </div>
        )}
      </div>

      <label className="wo-f wide" htmlFor="woe-work">
        <span>{pick.kind === "sparky" ? "The electrical work" : `The ${(f.trade || "work").toLowerCase()}`}</span>
        <textarea id="woe-work" className="pk-in" rows={3} value={f.work} onChange={set("work")} />
      </label>
      <div className="wo-grid">
        {field("date", "Day", "date")}
        {field("time", "Time (blank for any time)", "time")}
        {field("site", "Site", "text", true)}
        {field("customer", "Customer")}
        {field("phone", "Phone")}
        {field("email", "Customer email", "email", true)}
        {field("crew", "Our crew on site (with commas)", "text", true)}
        {field("sendTo", sent ? "Email the update to" : "Send to", "email", true)}
      </div>

      {job.id > 0 && <JobFilesPicker jobId={job.id} jobNumber={job.number} picked={files} onChange={setFiles} />}
      {err && <p className="pk-said bad" role="status">{err}</p>}
      <div className="qp-links">
        {sent ? (
          <>
            <button type="button" className="qp-btn dark" disabled={busy || !f.work.trim() || !job.id} onClick={() => save("resend")}>{busy ? "Saving…" : "Save and email the update"}</button>
            <button type="button" className="qp-btn line" disabled={busy || !f.work.trim() || !job.id} onClick={() => save("save")}>Just save</button>
          </>
        ) : (
          <>
            <button type="button" className="qp-btn dark" disabled={busy || !f.work.trim() || !job.id || !toWho} onClick={() => save("send")}>{busy ? "Sending…" : "Save and send"}</button>
            <button type="button" className="qp-btn line" disabled={busy || !f.work.trim() || !job.id} onClick={() => save("save")}>Save as a draft</button>
          </>
        )}
        <button type="button" className="qp-btn line" onClick={onCancel}>Cancel</button>
      </div>
      <p className="qp-note">
        {sent
          ? "Just save fixes the record here and nothing is emailed. Emailing the update sends the new version marked as an update, and puts it on the job in ServiceTitan."
          : "Sending emails it, copied to the office, then notes the job in ServiceTitan with the work order attached."}
      </p>
    </div>
  );
}
