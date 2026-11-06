"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deleteWorkOrderDraft, jobFill, saveWorkOrder, searchJobs, sendDraft } from "@/app/portal/supply/work-orders/actions";
import { undoSend } from "@/app/portal/supply/sent/actions";
import type { JobHit, WoContact, WorkOrderRow } from "@/lib/ordering/workOrders";
import { JobFilesPicker, type PickedFile } from "./JobFilesPicker";
import { Icon } from "@/components/portal/shell/Menu";

const day = (iso: string) => new Date(iso.length > 10 ? iso : `${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" });
const hhmm = (iso: string) => new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)).replace(/^24/, "00");
const stJob = (id: number) => `https://go.servicetitan.com/#/Job/Index/${id}`;
const isSparky = (w: WorkOrderRow) => !w.details?.trade || /electric/i.test(w.details.trade);
/** Sent by the booking automation rather than by someone pressing Send: it signs them "Automatic". */
const byItself = (w: WorkOrderRow) => w.status === "sent" && w.approved_by === "Automatic";
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

const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

/** Who a work order went to, in a word: the electrician on file, or the contractor and their trade. */
const whoFor = (w: WorkOrderRow, sparky: Sparky | null) => isSparky(w) ? sparky?.name ?? "Electrician" : w.details?.to_name || w.details?.trade || "Contractor";

/**
 * Work orders as a list to work through: the ones not sent yet first, then
 * the visits coming up, then the ones done, each narrowed by contractor or a
 * search. Each row opens what it was: where it went, who it was emailed and
 * copied to, the work, the job, and how it stands in ServiceTitan. From there
 * it can be edited — the job number when it went against the quote's job
 * rather than the install's, the details, who it's for — and a draft sent, or
 * a sent one emailed again with the changes.
 *
 * Its marks are one each: a bolt on one that went by itself, a warning on
 * one that didn't go, nothing on one sent by hand. A draft has a plain Send
 * button on its row, which opens a short pop-up to check who it's going to
 * and the work, rather than the whole form.
 */
export function WorkOrderList({ list, sparky, contacts }: { list: WorkOrderRow[]; sparky: Sparky | null; contacts: WoContact[] }) {
  // By id, so the pop-up shows the row as it reads after a save refreshes the list.
  const [openId, setOpen] = useState<number | null>(null);
  const [sendId, setSend] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [on, setOn] = useState("all");
  const open = list.find((w) => w.id === openId) ?? null;
  const sending = list.find((w) => w.id === sendId) ?? null;
  const marked = list.some((w) => byItself(w) || (w.status !== "sent" && w.send_error));
  const today = todayIso();
  const people = new Map<string, number>();
  for (const w of list) people.set(whoFor(w, sparky), (people.get(whoFor(w, sparky)) ?? 0) + 1);
  const needle = q.trim().toLowerCase();
  const shown = list.filter((w) => (on === "all" || whoFor(w, sparky) === on) && (!needle || [
    w.po_number, w.details?.site_address, w.details?.customer_name, w.details?.trade, w.details?.to_name, w.sent_to,
    ...(w.details?.jobs ?? []).flatMap((j) => [j.job_number, j.customer_name, j.work]),
  ].some((x) => x?.toLowerCase().includes(needle))));
  const dateOf = (w: WorkOrderRow) => w.details?.start_at ?? w.details?.date ?? "";
  const groups = [
    { name: "Not sent", note: "drafts, and any that didn't go", rows: shown.filter((w) => w.status !== "sent") },
    { name: "Coming up", note: "sent, visit still to come", rows: shown.filter((w) => w.status === "sent" && (w.details?.date ?? "") >= today).sort((a, b) => dateOf(a).localeCompare(dateOf(b))) },
    { name: "Done", note: "the visit's been", rows: shown.filter((w) => w.status === "sent" && (w.details?.date ?? "") < today).sort((a, b) => dateOf(b).localeCompare(dateOf(a))) },
  ];
  return (
    <>
      <div className="wo-filt">
        <label className="qp-find">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input id="wo-find" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a job, address, customer or the work" aria-label="Find a work order" />
        </label>
        {people.size > 1 && (
          <div className="qp-people" role="group" aria-label="Contractor">
            <button type="button" className={`qp-chip${on === "all" ? " on" : ""}`} aria-pressed={on === "all"} onClick={() => setOn("all")}>Everyone · {list.length}</button>
            {[...people.entries()].sort((a, b) => b[1] - a[1]).map(([who, n]) => (
              <button key={who} type="button" className={`qp-chip${on === who ? " on" : ""}`} aria-pressed={on === who} onClick={() => setOn(who)}>{who} · {n}</button>
            ))}
          </div>
        )}
      </div>
      {marked && (
        <p className="wo-key">
          <span><span className="wo-mk" aria-hidden="true"><Icon name="bolt" size={12} /></span>sent by itself</span>
          <span><span className="wo-mk bad" aria-hidden="true"><Icon name="alert" size={12} /></span>didn&rsquo;t go</span>
          <span>no mark: sent by hand</span>
        </p>
      )}
      {!shown.length && <p className="nw-none">Nothing matches that.</p>}
      {groups.filter((g) => g.rows.length).map((g) => (
        <div key={g.name} className="nw-grp">
          <div className="nw-gh"><h2>{g.name}</h2><span>{g.rows.length} · {g.note}</span></div>
          <ul className="wo-list">
            {g.rows.map((w) => {
              const d = w.details;
              const jobs = (d?.jobs ?? []).map((j) => j.job_number).filter(Boolean).join(" & ");
              const when = d ? (d.start_at ? `${day(d.start_at)}, ${time(d.start_at)}` : day(d.date)) : "";
              const sent = w.status === "sent";
              const state = sent ? `Sent ${w.sent_at ? day(w.sent_at) : ""}` : w.send_error ? "Didn't send" : "Draft";
              const work = d?.jobs.map((j) => j.work).filter(Boolean).join("; ");
              const failed = !sent && !!w.send_error;
              return (
                <li key={w.id} className="wo-li">
                  <button type="button" className="wo-row" onClick={() => setOpen(w.id)}>
                    <span className={`nw-task__dot${sent ? " is-done" : failed ? " is-bad" : ""}`} aria-hidden="true">{sent ? "✓" : ""}</span>
                    <span className="wo-row-t">
                      <b>{d?.site_address?.split(",")[0] ?? "No address"}{jobs ? ` · job ${jobs}` : ""}</b>
                      <span>{[when, whoFor(w, sparky), isSparky(w) || !d?.to_name ? null : d?.trade, work].filter(Boolean).join(" · ")}</span>
                      {failed && <span className="wo-why">Didn&rsquo;t go: {w.send_error}</span>}
                    </span>
                    <span className="wo-end">
                      {byItself(w) && <span className="wo-mk" title="Sent by itself once the job was booked"><Icon name="bolt" size={14} /><span className="wo-sr">Sent by itself</span></span>}
                      {failed && <span className="wo-mk bad" title="Didn't go"><Icon name="alert" size={14} /><span className="wo-sr">Didn&rsquo;t go</span></span>}
                      <span className={`wo-state${sent ? " sent" : failed ? " bad" : " draft"}`}>{state}</span>
                    </span>
                  </button>
                  {!sent && d && d.jobs[0] && <button type="button" className="pk-btn wo-send" onClick={() => setSend(w.id)}>Send</button>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {/* On the page itself: inside the card, whose styling makes a layer of its own, the pop-up would be held to the card. */}
      {open && createPortal(<WorkOrderPanel w={open} sparky={sparky} contacts={contacts} onClose={() => setOpen(null)} />, document.querySelector(".pt.pn") ?? document.body)}
      {sending && createPortal(<SendPop w={sending} sparky={sparky} contacts={contacts} onClose={() => setSend(null)} onMore={() => { setSend(null); setOpen(sending.id); }} />, document.querySelector(".pt.pn") ?? document.body)}
    </>
  );
}

function WorkOrderPanel({ w, sparky, contacts, onClose }: { w: WorkOrderRow; sparky: Sparky | null; contacts: WoContact[]; onClose: () => void }) {
  // A draft is opened to be fixed and sent, so it opens on the form.
  const [editing, setEditing] = useState<false | "details" | "job">(w.status === "sent" ? false : "details");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const router = useRouter();
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
    ["Sent", w.sent_at ? `${day(w.sent_at)}, ${time(w.sent_at)}${w.approved_by === "Automatic" ? ", automatically once the job was booked" : w.approved_by ? ` by ${w.approved_by}` : ""}` : ""],
    ["Moved since", (d?.moves ?? []).map((m) => `to ${day(m.to)}: ${m.emailedTo} emailed ${day(m.at)}, ${time(m.at)}`).join("; ")],
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
              {w.status === "sent" && (
                <button type="button" className="qp-btn line" disabled={undoing} onClick={() => {
                  if (!confirm(`Put this work order back as a draft? It went to ${w.sent_to ?? "them"}; nothing is emailed, so let them know if they shouldn't have had it. It won't go again by itself: fix it and press Send.`)) return;
                  setUndoing(true);
                  undoSend(w.id).then((r) => { setUndoing(false); setMsg(r.ok ? { ok: true, text: r.note ?? "A draft again." } : { ok: false, text: r.error ?? "Couldn't." }); if (r.ok) { router.refresh(); setEditing("details"); } });
                }}>{undoing ? "Putting it back…" : "Undo: put it back as a draft"}</button>
              )}
            </div>
          </>
        )}
        {msg && <p className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}

/**
 * Send, from a draft's row: who it's going to, the address, the work, and
 * the PDF to check, then Send. Everything else on the work order goes as
 * it's saved; "Edit everything" opens the whole form for the rest.
 */
function SendPop({ w, sparky, contacts, onClose, onMore }: { w: WorkOrderRow; sparky: Sparky | null; contacts: WoContact[]; onClose: () => void; onMore: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const d = w.details!;
  const first = d.jobs[0];
  const [pick, setPick] = useState<Pick>(() => pickFor(w, contacts));
  const [to, setTo] = useState(() => {
    const p = pickFor(w, contacts);
    return emailIn(w.sent_to) || d.send_to || (p.kind === "saved" ? p.c.email : p.kind === "sparky" ? sparky?.email ?? "" : "");
  });
  const typed = d.jobs.map((j) => j.work).filter(Boolean).join("; ");
  const [work, setWork] = useState(typed);
  const [startPick] = useState(pick);
  // A planned one carries what's going in rather than typed work.
  const planned = d.jobs.map((j) => [j.system_installed, j.electrical_items].filter(Boolean).join(" · ")).filter(Boolean).join("; ");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  const value = pick.kind === "sparky" ? "sparky" : pick.kind === "saved" ? `c:${pick.c.id}` : "other";
  const choose = (v: string) => {
    if (v === "sparky") { setPick({ kind: "sparky" }); setTo(sparky?.email ?? ""); return; }
    const c = contacts.find((x) => `c:${x.id}` === v);
    if (c) { setPick({ kind: "saved", c }); setTo(c.email); }
  };
  const when = d.start_at ? `${day(d.start_at)}, ${time(d.start_at)}` : day(d.date);
  // Unchanged but for the address, it goes as it's saved; changed, it's saved first, the same as the full form.
  const asIs = pick === startPick && work === typed;
  const send = () => start(async () => {
    setErr(null);
    const r = asIs ? await sendDraft({ id: w.id, to }) : await saveWorkOrder({
      id: w.id, jobId: first.job_id, date: d.date, time: d.start_at ? hhmm(d.start_at) : "", work,
      site: d.site_address, customer: d.customer_name ?? "", phone: d.customer_phone ?? "", email: d.customer_email ?? "", crew: d.crew.join(", "),
      trade: pick.kind === "saved" ? pick.c.trade : pick.kind === "other" ? d.trade ?? "" : "",
      toName: pick.kind === "saved" ? pick.c.name : pick.kind === "other" ? d.to_name ?? "" : "",
      sendTo: to, files: d.files ?? [], then: "send",
    });
    if (!r.ok) { setErr(r.error ?? "It didn't send."); return; }
    router.refresh();
    setDone(r.note ?? "Sent.");
  });
  return (
    <div className="qp-scrim mid" onClick={onClose}>
      <div className="qp-panel mid wo-panel wo-sendpop" role="dialog" aria-modal="true" aria-labelledby="wo-send-h" onClick={(e) => e.stopPropagation()}>
        <div className="qp-ph">
          <span>Work order {w.po_number}</span>
          <button type="button" className="qp-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <h2 id="wo-send-h" className="rl-h">Send the work order</h2>
        <p className="wo-sendsub">Job {first.job_number} · {d.site_address.split(",")[0]} · {when}</p>
        {done ? (
          <>
            <p className="pk-said" role="status">{done}</p>
            <div className="qp-links"><button type="button" className="qp-btn dark" onClick={onClose} autoFocus>Done</button></div>
          </>
        ) : (
          <>
            <label className="wo-f wide" htmlFor="wos-who">
              <span>Contractor</span>
              <select id="wos-who" className="pk-in" value={value} onChange={(e) => choose(e.target.value)} disabled={busy}>
                {sparky && <option value="sparky">{sparky.name} · Electrical</option>}
                {contacts.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name} · {c.trade}</option>)}
                {pick.kind === "other" && <option value="other">{[d.to_name, d.trade].filter(Boolean).join(" · ") || "As it is"}</option>}
              </select>
            </label>
            <label className="wo-f wide" htmlFor="wos-to">
              <span>Email</span>
              <input id="wos-to" type="email" className="pk-in" value={to} onChange={(e) => setTo(e.target.value)} disabled={busy} />
            </label>
            <div className="wo-f wide">
              <span>The PDF</span>
              {/* A plain link: it's built fresh on request, and Link would prefetch it. */}
              <a className="wo-pdf" href={`/api/portal/order-pdf?id=${w.id}`}><Icon name="file" size={15} />Work order {w.po_number}.pdf<em>download to check</em></a>
            </div>
            {planned && !typed && <p className="wo-planned"><b>On the work order</b>{planned}</p>}
            <label className="wo-f wide" htmlFor="wos-work">
              <span>{planned && !typed ? "Anything to add (leave blank to send it as it is)" : "The work"}</span>
              <textarea id="wos-work" className="pk-in" rows={planned && !typed ? 2 : 4} value={work} onChange={(e) => setWork(e.target.value)} disabled={busy} />
            </label>
            <p className="qp-note">The office is copied, and it&rsquo;s noted on job {first.job_number} in ServiceTitan with the PDF attached.</p>
            {err && <p className="pk-said bad" role="status">{err}</p>}
            <div className="qp-links">
              <button type="button" className="qp-btn dark" disabled={busy || !to.trim() || (!asIs && !work.trim())} onClick={send}>{busy ? "Sending…" : "Send"}</button>
              <button type="button" className="qp-btn line" onClick={onClose} disabled={busy}>Cancel</button>
              <button type="button" className="qp-btn line wo-more" onClick={onMore} disabled={busy}>Edit everything</button>
            </div>
          </>
        )}
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
  const [dropping, setDropping] = useState(false);
  const drop = () => start(async () => {
    setErr(null);
    const r = await deleteWorkOrderDraft(w.id);
    if (!r.ok) { setErr(r.error ?? "Couldn't delete it."); setDropping(false); return; }
    // Gone from the list, so the pop-up closes with it.
    router.refresh();
    onCancel();
  });
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
        {!finding && <button type="button" className="qp-btn line sm" onClick={() => setFinding(true)}>Change the job</button>}
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

      {job.id > 0 && <JobFilesPicker jobId={job.id} jobNumber={job.number} picked={files} onChange={setFiles} photosGo />}
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
        {!sent && !dropping && <button type="button" className="qp-btn line wo-del" disabled={busy} onClick={() => setDropping(true)}>Delete draft</button>}
      </div>
      {dropping && (
        <div className="wo-confirm" role="alertdialog" aria-labelledby="wo-del-q">
          <span id="wo-del-q">Delete this draft? It hasn&rsquo;t been sent, so nobody is emailed.</span>
          <button type="button" className="qp-btn bad" disabled={busy} onClick={drop} autoFocus>{busy ? "Deleting…" : "Yes, delete it"}</button>
          <button type="button" className="qp-btn line" disabled={busy} onClick={() => setDropping(false)}>Keep it</button>
        </div>
      )}
      <p className="qp-note">
        {sent
          ? "Just save fixes the record here and nothing is emailed. Emailing the update sends the new version marked as an update, and puts it on the job in ServiceTitan."
          : "Sending emails it, copied to the office, then notes the job in ServiceTitan with the work order attached. Saved as a draft, it goes by itself once the job's booked in ServiceTitan with a tech on the visit (half an hour after your last change), unless they're set to By hand on Contractors. A job booked for today is left for you to send."}
      </p>
    </div>
  );
}
