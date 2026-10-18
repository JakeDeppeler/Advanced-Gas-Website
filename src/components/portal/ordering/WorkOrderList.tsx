"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { moveToJob, searchJobs } from "@/app/portal/supply/work-orders/actions";
import type { JobHit, WorkOrderRow } from "@/lib/ordering/workOrders";

const day = (iso: string) => new Date(iso.length > 10 ? iso : `${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
const stJob = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;
const isSparky = (w: WorkOrderRow) => !w.details?.trade || /electric/i.test(w.details.trade);

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
 * in ServiceTitan — and from there, moving it to the right job when it went
 * against the quote's job rather than the install's.
 */
export function WorkOrderList({ list }: { list: WorkOrderRow[] }) {
  const [open, setOpen] = useState<WorkOrderRow | null>(null);
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
              <button type="button" className="wo-row" onClick={() => setOpen(w)}>
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
      {open && createPortal(<WorkOrderPanel w={open} onClose={() => setOpen(null)} />, document.querySelector(".pt.pn") ?? document.body)}
    </>
  );
}

function WorkOrderPanel({ w, onClose }: { w: WorkOrderRow; onClose: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [moving, setMoving] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<JobHit[] | null>(null);
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
    ["ServiceTitan", onTheJob(w)],
  ];
  return (
    <div className="qp-scrim mid" onClick={onClose}>
      <div className="qp-panel mid wo-panel" role="dialog" aria-modal="true" aria-labelledby="wo-panel-h" onClick={(e) => e.stopPropagation()}>
        <div className="qp-ph">
          <span>Work order {w.po_number}</span>
          <button type="button" className="qp-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <h2 id="wo-panel-h" className="rl-h">Job {job?.job_number ?? "?"}{job?.customer_name ? `, ${job.customer_name}` : ""}</h2>
        <dl className="wo-facts">
          {facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <div className="qp-links">
          {job && <a className="qp-btn" href={stJob(job.job_id)} target="_blank" rel="noreferrer">Job {job.job_number} in ServiceTitan ↗</a>}
          {!moving && <button type="button" className="qp-btn line" onClick={() => setMoving(true)}>Put it on another job</button>}
        </div>
        {moving && (
          <div className="wo-move">
            <p className="qp-note">Sent against the quote&rsquo;s job and not the install&rsquo;s? Find the right job. It moves there, and if it&rsquo;s been sent the new job gets the note and the work order in ServiceTitan. The old job&rsquo;s note stays; ServiceTitan doesn&rsquo;t let notes be taken back.</p>
            <form className="wo-search" onSubmit={(e) => { e.preventDefault(); start(async () => setHits(await searchJobs(q))); }}>
              <input id="wo-move-q" className="pk-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job number, customer or suburb" aria-label="Find the job" autoFocus />
              <button type="submit" className="qp-btn dark" disabled={busy || q.trim().length < 2}>Find</button>
            </form>
            {hits && !hits.length && <p className="qp-note">No job matches.</p>}
            {hits && hits.length > 0 && (
              <ul className="wo-hits">
                {hits.filter((h) => h.id !== job?.job_id).map((h) => (
                  <li key={h.id}>
                    <button type="button" disabled={busy} onClick={() => start(async () => {
                      const r = await moveToJob({ id: w.id, jobId: h.id });
                      setMsg(r.ok ? { ok: true, text: r.note ?? "Moved." } : { ok: false, text: r.error ?? "Couldn't move it." });
                      if (r.ok) { setMoving(false); router.refresh(); }
                    })}>
                      <b>Job {h.job_number}{h.customer_name ? ` · ${h.customer_name}` : ""}</b>
                      <span>{[h.job_type, h.suburb, h.status].filter(Boolean).join(" · ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {msg && <p className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}
