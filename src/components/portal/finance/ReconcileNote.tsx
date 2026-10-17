"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markReconciled } from "@/app/portal/finance/cash/actions";

// Xero's bank accounts page, where each account's Reconcile button sits.
const XERO_BANK = "https://go.xero.com/Bank/BankAccounts.aspx";
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Whether the bank figures can be trusted yet: Xero's money in and out only
 * match the bank once it's reconciled. Up to date (within a few days) reads
 * green; older, or never marked, says the figures may still move, in words.
 */
export function ReconcileNote({ stamp, today }: { stamp: { to: string; by: string } | null; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [to, setTo] = useState(today);
  const [open, setOpen] = useState(false);
  const age = stamp ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${stamp.to}T00:00:00Z`)) / 86_400_000) : null;
  const fresh = age != null && age <= 3;
  return (
    <div className={`rc-note${fresh ? " ok" : " warn"}`} role="status">
      <span className="rc-dot" aria-hidden="true" />
      <span>
        {stamp
          ? fresh
            ? <><b>Reconciled</b> in Xero to {day(stamp.to)} ({stamp.by}). These figures match the bank.</>
            : <><b>Needs reconciling.</b> Xero was last reconciled to {day(stamp.to)} ({stamp.by}), {age} days ago, so the figures since may still move.</>
          : <><b>Not marked reconciled yet.</b> Until the bank is reconciled in Xero, these figures may still move.</>}
      </span>
      {open ? (
        <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await markReconciled(to); if (r.ok) { setOpen(false); router.refresh(); } }); }}>
          <label htmlFor="rc-to" className="pn-vh">Reconciled up to</label>
          <input id="rc-to" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} />
          <button type="submit" className="qp-btn dark" disabled={pending}>Save</button>
        </form>
      ) : (
        <span className="rc-acts">
          {/* Reconciling happens in Xero; this only opens it there. The portal's Xero link is read-only. */}
          <a className="qp-btn dark" href={XERO_BANK} target="_blank" rel="noreferrer">Open Xero to reconcile ↗</a>
          <button type="button" className="rc-mark" onClick={() => setOpen(true)}>Done? Mark it</button>
        </span>
      )}
    </div>
  );
}
