"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type NumberRow = { key: string; label: string; sub?: string; unit: string; value: number | null };

/**
 * A card of numbers to set, one per row, saved together. Blank is "not set".
 * Used by Rates & pricing and Commission; each passes its own save action.
 */
export function NumbersForm({ title, aside, rows, save, canSave, saveLabel = "Save" }: {
  title: string;
  aside?: string;
  rows: NumberRow[];
  save: (values: Record<string, number | null>) => Promise<{ ok: boolean; error?: string }>;
  canSave: boolean;
  saveLabel?: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, r.value == null ? "" : String(r.value)])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const go = () =>
    start(async () => {
      const out: Record<string, number | null> = {};
      for (const r of rows) out[r.key] = vals[r.key] === "" ? null : Number(vals[r.key]);
      const res = await save(out);
      setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error ?? "Couldn’t save." });
      if (res.ok) router.refresh();
    });
  return (
    <section className="pk-card pk-pad">
      <div className="pk-card-h"><b>{title}</b>{aside && <span>{aside}</span>}</div>
      {rows.map((r) => (
        <div className="pk-kv" key={r.key}>
          <span className="t"><b>{r.label}</b>{r.sub && <span>{r.sub}</span>}</span>
          <input id={`num-${r.key}`} className="pk-in num" inputMode="decimal" value={vals[r.key]} placeholder="not set" disabled={!canSave}
            aria-label={r.label} onChange={(e) => setVals((v) => ({ ...v, [r.key]: e.target.value.replace(/[^0-9.]/g, "") }))} />
          <span className="pk-unit">{r.unit}</span>
        </div>
      ))}
      {canSave ? (
        <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
          <button type="button" className="pk-btn" onClick={go} disabled={busy}>{busy ? "Saving…" : saveLabel}</button>
          {msg && <span className={`pk-said${msg.ok ? "" : " bad"}`} role="status">{msg.text}</span>}
        </div>
      ) : <p className="pk-note" style={{ marginTop: 12 }}>Only an admin can change these.</p>}
    </section>
  );
}
