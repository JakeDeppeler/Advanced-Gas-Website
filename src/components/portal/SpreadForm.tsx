"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSpreadAccounts } from "@/app/portal/kpis/actions";

/**
 * Our KPIs › which bills come once a year. Ticked, an account counts at its
 * yearly total spread by the day; unticked, it sits in the month Xero booked
 * it — which is right for anything one-off or unusual.
 */
export function SpreadForm({ accounts, initial }: { accounts: string[]; initial: string[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [on, setOn] = useState(() => new Set(initial.map((a) => a.toLowerCase())));
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <details className="pk-card pk-pad" style={{ marginTop: 14 }}>
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>Once-a-year bills, spread across the year <span className="pk-said">· {initial.length ? initial.join(", ") : "none"}</span></summary>
      <p className="pk-note" style={{ margin: "10px 0" }}>
        Tick the bills that come once a year as part of running the business — insurance, WorkCover, rego. They count here at their yearly total spread by the day, the way the hourly rate counts them.
        Leave anything one-off or unusual unticked, so it shows in the month it happened. Xero isn&rsquo;t changed.
      </p>
      {accounts.map((a) => (
        <label key={a} className="pk-kv" style={{ cursor: "pointer" }}>
          <span className="t"><b>{a}</b></span>
          <input id={`spread-${a}`} type="checkbox" checked={on.has(a.toLowerCase())} onChange={(e) => {
            const n = new Set(on);
            if (e.target.checked) n.add(a.toLowerCase()); else n.delete(a.toLowerCase());
            setOn(n);
          }} />
        </label>
      ))}
      <div className="pk-btns" style={{ marginTop: 12, alignItems: "center" }}>
        <button type="button" className="pk-btn" disabled={busy} onClick={() => start(async () => {
          const r = await saveSpreadAccounts(accounts.filter((a) => on.has(a.toLowerCase())));
          setMsg(r.ok ? "Saved." : r.error ?? "Couldn’t save.");
          if (r.ok) router.refresh();
        })}>{busy ? "Saving…" : "Save"}</button>
        {msg && <span className="pk-said" role="status">{msg}</span>}
      </div>
    </details>
  );
}
