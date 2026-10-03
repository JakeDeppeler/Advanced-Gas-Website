"use client";

import { useState } from "react";
import { NumField } from "./NumField";
import { saveCommission } from "@/app/portal/finance/board/actions";

type Tier = { from: string; rate: string };

/**
 * The commission bands the board's Team page measures the leader against.
 *
 * The month's targets used to sit above this as four boxes typed in by hand;
 * they come from the year goal now, so this is the only thing on the page the
 * board is told that the goal doesn't already say.
 */
export function BoardCommission({
  initial,
  canSave,
}: {
  initial: Array<{ from: number; rate: number }>;
  canSave: boolean;
}) {
  const [tiers, setTiers] = useState<Tier[]>(
    initial.length
      ? initial.map((t) => ({ from: String(t.from), rate: String(Math.round(t.rate * 10000) / 100) }))
      : [{ from: "", rate: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveCommission({
      commissionTiers: tiers
        .map((t) => ({ from: Number(t.from), rate: Number(t.rate) / 100 }))
        .filter((t) => Number.isFinite(t.from) && Number.isFinite(t.rate)),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved. The board picks it up on its next sync." : (res.error ?? "Couldn't save."));
  }

  const setTier = (i: number, patch: Partial<Tier>) =>
    setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Commission tiers</h2>
      <p className="pt-panel__sub">
        Marginal, on the month&rsquo;s sold total: each rate applies only to the dollars above its threshold. The
        board shows how far the leader is from the next tier and never the dollar figure — the wall is visible to
        everyone who walks past it.
      </p>

      {tiers.map((t, i) => (
        <div className="pt-tgt__fields" key={i}>
          <NumField label={`Tier ${i + 1} from`} prefix="$" value={t.from} onChange={(v) => setTier(i, { from: v })} />
          <NumField label="Rate" suffix="%" decimal value={t.rate} onChange={(v) => setTier(i, { rate: v })} />
        </div>
      ))}

      <div className="pt-tgt__save">
        <button type="button" className="pt-goal__add" onClick={() => setTiers((ts) => [...ts, { from: "", rate: "" }])}>
          + Add a tier
        </button>
        {canSave && (
          <button type="button" className="pt-btn pt-btn--navy" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save the tiers"}
          </button>
        )}
        {msg && <span className="pt-tgt__msg">{msg}</span>}
      </div>
    </section>
  );
}
