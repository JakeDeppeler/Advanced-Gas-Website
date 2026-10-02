"use client";

import { useState } from "react";
import { NumField } from "./NumField";
import { saveBoardTargets, type BoardTargets as Saved } from "@/app/portal/finance/board/actions";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

/** A blank box is "no target", not a target of zero. */
const parse = (s: string) => (s.trim() === "" ? null : Number(s));

type Tier = { from: string; rate: string };

export function BoardTargets({
  initial,
  canSave,
  suggestion,
}: {
  initial: Saved;
  canSave: boolean;
  /** Monthly revenue implied by the year's goal, if one is set. */
  suggestion: number | null;
}) {
  const [revenue, setRevenue] = useState(String(initial.revenueTargetMonthly ?? ""));
  const [sales, setSales] = useState(String(initial.salesTargetMonthly ?? ""));
  const [profit, setProfit] = useState(String(initial.profitTargetMonthly ?? ""));
  const [bookings, setBookings] = useState(String(initial.bookingsTargetMonthly ?? ""));
  const [tiers, setTiers] = useState<Tier[]>(
    initial.commissionTiers.length
      ? initial.commissionTiers.map((t) => ({ from: String(t.from), rate: String(t.rate * 100) }))
      : [{ from: "", rate: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveBoardTargets({
      revenueTargetMonthly: parse(revenue),
      salesTargetMonthly: parse(sales),
      profitTargetMonthly: parse(profit),
      bookingsTargetMonthly: parse(bookings),
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
    <>
      <section className="pt-panel">
        <h2 className="pt-panel__h">Monthly targets</h2>
        <p className="pt-panel__sub">
          The four dials on the Pace page. Leave a box empty and that dial says
          &ldquo;no monthly target set&rdquo; rather than inventing one.
        </p>

        <div className="pt-tgt__fields">
          <NumField
            label="Revenue invoiced"
            hint="per month"
            prefix="$"
            value={revenue}
            onChange={setRevenue}
            placeholder={suggestion ? String(Math.round(suggestion)) : undefined}
          />
          <NumField label="Sold" hint="per month" prefix="$" value={sales} onChange={setSales} />
          <NumField label="Gross profit" hint="per month" prefix="$" value={profit} onChange={setProfit} />
          <NumField label="Jobs booked" hint="per month" value={bookings} onChange={setBookings} />
        </div>

        {suggestion != null && (
          <p className="pt-panel__sub">
            The year&rsquo;s goal works out at <strong>{money(suggestion)}</strong> a month. It is a starting point,
            not a default — the board uses what is typed here.
          </p>
        )}
      </section>

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
            <NumField
              label="Rate"
              suffix="%"
              decimal
              value={t.rate}
              onChange={(v) => setTier(i, { rate: v })}
            />
          </div>
        ))}

        <button type="button" className="pt-btn" onClick={() => setTiers((ts) => [...ts, { from: "", rate: "" }])}>
          Add a tier
        </button>
      </section>

      {canSave && (
        <div className="pt-tgt__save">
          <button type="button" className="pt-btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save the targets"}
          </button>
          {msg && <span className="pt-tgt__msg">{msg}</span>}
          <span className="pt-tgt__note">Saved for everyone, not just this browser.</span>
        </div>
      )}
    </>
  );
}
