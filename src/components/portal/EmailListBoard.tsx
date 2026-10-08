"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { optInEmail, optOutEmails } from "@/app/portal/marketing/actions";
import { SOURCE_LABEL, SOURCE_PLURAL, type EmailRow, type EmailSource, type SourceState } from "@/lib/emailList/types";

type Seen = "any" | "recent" | "lapsed" | "never";
const SEEN: Array<{ k: Seen; label: string }> = [
  { k: "any", label: "Any time" },
  { k: "recent", label: "Job in the last 12 months" },
  { k: "lapsed", label: "No job for over 12 months" },
  { k: "never", label: "Never had a job" },
];
const PAGE = 150;
const day = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

/** One CSV cell, quoted when it has to be, and never read as a formula by a spreadsheet. */
const cell = (v: string) => {
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * The email list: every address the business holds, cut down to the people a
 * campaign is for, then copied or exported.
 *
 * Filtering is on the rows already loaded, so it's instant. Anyone left off —
 * unsubscribed, asked not to be emailed, bounced — never goes into a copy or an
 * export, whatever the filters say.
 */
export function EmailListBoard({ rows, sources, yearAgo }: { rows: EmailRow[]; sources: SourceState[]; yearAgo: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [src, setSrc] = useState<EmailSource | "all">("all");
  const [seen, setSeen] = useState<Seen>("any");
  const [suppliers, setSuppliers] = useState(false);
  const [showOff, setShowOff] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.optedOut && !showOff) return false;
      if (r.supplierOnly && !suppliers) return false;
      if (src !== "all" && !r.sources.includes(src)) return false;
      if (seen === "recent" && !(r.lastJob && r.lastJob >= yearAgo)) return false;
      if (seen === "lapsed" && !(r.lastJob && r.lastJob < yearAgo)) return false;
      if (seen === "never" && r.lastJob) return false;
      if (needle && ![r.email, r.name, r.suburb].some((x) => x?.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, src, seen, suppliers, showOff, yearAgo]);
  const sendable = shown.filter((r) => !r.optedOut);
  const offCount = rows.filter((r) => r.optedOut).length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; added?: number }>, ok: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: ok.replace("{n}", String(r.added ?? 1)) } : { ok: false, text: r.error ?? "Couldn't do that." });
      router.refresh();
    });

  const exportCsv = () => {
    const head = ["Email", "Name", "Suburb", "Where from", "Last job", "Last seen"];
    const lines = [head, ...sendable.map((r) => [r.email, r.name ?? "", r.suburb ?? "", r.sources.map((s) => SOURCE_LABEL[s]).join("; "), r.lastJob ?? "", r.lastSeen ?? ""])]
      .map((l) => l.map(cell).join(","));
    const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `email-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg({ ok: true, text: `Exported ${sendable.length.toLocaleString("en-AU")} addresses.` });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sendable.map((r) => r.email).join("; "));
      setMsg({ ok: true, text: `Copied ${sendable.length.toLocaleString("en-AU")} addresses, separated by semicolons — paste them into BCC.` });
    } catch {
      setMsg({ ok: false, text: "The browser wouldn't copy. Use Export instead." });
    }
  };
  const clear = () => { setQ(""); setSrc("all"); setSeen("any"); setSuppliers(false); setShowOff(false); };
  const filtered = q || src !== "all" || seen !== "any" || suppliers || showOff;

  return (
    <div className="pt-wi">
      <div className="pt-rev__tiles">
        <div className="pt-rev__tile is-feature">
          <span className="pt-rev__k">On the list</span>
          <strong>{(rows.length - offCount).toLocaleString("en-AU")}</strong>
          <span className="pt-rev__sub">different addresses{offCount ? ` · ${offCount} left off` : ""}</span>
        </div>
        {sources.map((s) => (
          <div key={s.source} className="pt-rev__tile">
            <span className="pt-rev__k">{SOURCE_PLURAL[s.source]}</span>
            <strong>{s.count.toLocaleString("en-AU")}</strong>
            <span className="pt-rev__sub">{s.note ?? "addresses"}</span>
            {s.fix && <a className="pt-el__fix" href={s.fix.href}>{s.fix.label} →</a>}
          </div>
        ))}
      </div>

      <section className="pt-panel pt-jp" aria-labelledby="el-h">
        <h2 id="el-h" className="pt-panel__h">Who to send to</h2>
        <div className="pt-jp__filters">
          <input id="el-find" className="pt-kit__find" type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Find a name, email or suburb" aria-label="Find a name, email or suburb" />
          <label className="pt-jp__sel"><span>Where from</span>
            <select id="el-src" value={src} onChange={(e) => { setSrc(e.target.value as EmailSource | "all"); setLimit(PAGE); }}>
              <option value="all">Everywhere</option>
              {sources.map((s) => <option key={s.source} value={s.source}>{SOURCE_PLURAL[s.source]}</option>)}
            </select>
          </label>
          <label className="pt-jp__sel"><span>Last job</span>
            <select id="el-seen" value={seen} onChange={(e) => { setSeen(e.target.value as Seen); setLimit(PAGE); }}>
              {SEEN.map((o) => <option key={o.k} value={o.k}>{o.label}</option>)}
            </select>
          </label>
        </div>
        <div className="pt-el__checks">
          <label className="pt-wi__check"><input id="el-sup" type="checkbox" checked={suppliers} onChange={(e) => setSuppliers(e.target.checked)} /> Include Xero suppliers</label>
          <label className="pt-wi__check"><input id="el-off" type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} /> Show the people left off</label>
        </div>
        <div className="pt-el__bar">
          <p className="pt-jp__sum" role="status">
            <strong>{sendable.length.toLocaleString("en-AU")}</strong> {sendable.length === 1 ? "address" : "addresses"} to send to
            {filtered && <button type="button" className="pt-todo__editbtn" onClick={clear}>Clear filters</button>}
          </p>
          <div className="pt-el__acts">
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={copy} disabled={!sendable.length}>Copy addresses</button>
            <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" onClick={exportCsv} disabled={!sendable.length}>Export CSV</button>
          </div>
        </div>
        {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</p>}

        {shown.length ? (
          <div className="pt-fleet__wrap">
            <table className="pt-rev__pl pt-el__table">
              <thead><tr><th scope="col">Who</th><th scope="col">Where from</th><th scope="col">Last job</th><th scope="col"><span className="pt-sr">On the list</span></th></tr></thead>
              <tbody>
                {shown.slice(0, limit).map((r) => (
                  <tr key={r.email} className={r.optedOut ? "is-off" : undefined}>
                    <th scope="row">
                      <span className="pt-el__email">{r.email}</span>
                      <em>{[r.name, r.suburb].filter(Boolean).join(" · ") || "No name held"}{r.optedOut ? " · left off" : ""}</em>
                    </th>
                    <td className="pt-el__src">{r.sources.map((s) => <span key={s} className="pt-el__chip">{SOURCE_LABEL[s]}</span>)}</td>
                    <td>{day(r.lastJob)}</td>
                    <td>
                      {r.optedOut
                        ? <button type="button" className="pt-todo__editbtn" disabled={pending} onClick={() => run(() => optInEmail(r.email), "Back on the list.")}>Put back</button>
                        : <button type="button" className="pt-todo__editbtn" disabled={pending} onClick={() => run(() => optOutEmails(r.email, "Left off from the list"), "Left off.")}>Leave off</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pt-todo__empty">Nobody matches. <button type="button" className="pt-todo__editbtn" onClick={clear}>Clear filters</button></p>
        )}
        {shown.length > limit && (
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm pt-el__more" onClick={() => setLimit((n) => n + PAGE * 2)}>
            Show more ({(shown.length - limit).toLocaleString("en-AU")} to go)
          </button>
        )}
      </section>

      <section className="pt-panel" aria-labelledby="el-off-h">
        <h2 id="el-off-h" className="pt-panel__h">Unsubscribes</h2>
        <p className="pt-panel__sub">
          Anyone who unsubscribes or asks not to be emailed goes on this list and stays off every copy and export, wherever
          else their address turns up. Every marketing email needs a way to unsubscribe, and only goes to people who&rsquo;ve
          said yes or are already customers — that&rsquo;s the Spam Act, not just good manners.
        </p>
        {bulkOpen ? (
          <form className="pt-el__bulk" onSubmit={(e) => { e.preventDefault(); run(() => optOutEmails(bulk, "Unsubscribed"), "Left {n} off the list."); setBulk(""); setBulkOpen(false); }}>
            <label className="pt-field"><span>Paste the addresses, one per line or separated by commas</span>
              <textarea id="el-bulk" rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} />
            </label>
            <div className="pt-todo__editacts">
              <button type="submit" className="pt-btn pt-btn--navy pt-btn--sm" disabled={pending || !bulk.trim()}>Leave them off</button>
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setBulkOpen(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => setBulkOpen(true)}>+ Add unsubscribes</button>
        )}
      </section>
    </div>
  );
}
