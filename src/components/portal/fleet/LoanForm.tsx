"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveVanLoan } from "@/app/portal/finance/capacity/actions";
import { repaymentFor, type VanLoan } from "@/lib/portal/fleet/loan";
import { EditHead, Fact } from "@/components/portal/fleet/EditCard";

type Field = { k: string; label: string; unit: string; sub?: string; date?: boolean; text?: boolean; placeholder?: string };

const GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Buying it", fields: [
    { k: "purchasePrice", label: "What we paid", unit: "$", sub: "drive-away" },
    { k: "deposit", label: "Deposit", unit: "$", sub: "paid out of our own money" },
    { k: "purchasedOn", label: "Bought on", unit: "", date: true },
  ] },
  { title: "The loan", fields: [
    { k: "lender", label: "Who it’s with", unit: "", text: true, placeholder: "e.g. Westpac" },
    { k: "financed", label: "Amount borrowed", unit: "$", sub: "blank works it out: price less deposit" },
    { k: "ratePct", label: "Interest rate", unit: "% a year" },
    { k: "termMonths", label: "Term", unit: "months" },
    { k: "firstPayment", label: "First repayment", unit: "", date: true, sub: "the rest fall on the same day each month" },
    { k: "monthlyRepayment", label: "Repayment", unit: "$ a month", sub: "off the contract · blank works it out from the rate and term" },
    { k: "balloon", label: "Balloon", unit: "$", sub: "left to pay with the last repayment, if any" },
  ] },
  { title: "Its life", fields: [
    { k: "lifespanYears", label: "Service life", unit: "years", sub: "how long we’ll keep it" },
    { k: "resaleValue", label: "Worth at the end", unit: "$", sub: "what it’ll sell for then" },
  ] },
];

/**
 * Everything about what a van cost and how it's being paid for, on the van's
 * own page. The contract drives "still owing": each repayment that falls due
 * takes its share off without anyone typing a new balance.
 */
export function LoanForm({ id, name, initial, canEdit = true }: {
  id: string; name: string; canEdit?: boolean;
  initial: { loan: VanLoan; purchasePrice: number | null; purchasedOn: string | null; monthlyRepayment: number | null; lifespanYears: number | null; resaleValue: number | null };
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const fresh = () => {
    const src: Record<string, unknown> = { ...initial.loan, ...initial, loan: undefined };
    const o: Record<string, string> = {};
    for (const g of GROUPS) for (const f of g.fields) o[f.k] = src[f.k] == null ? "" : String(src[f.k]);
    return o;
  };
  const [vals, setVals] = useState<Record<string, string>>(fresh);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const n = (k: string) => (vals[k].trim() === "" ? null : Number(vals[k]));

  // What the repayment comes to from the rate and term, shown while typing so a
  // figure off the contract can be checked against it.
  const fin = n("financed") ?? (n("purchasePrice") != null ? n("purchasePrice")! - (n("deposit") ?? 0) : null);
  const est = fin != null && fin > 0 && n("termMonths") ? repaymentFor(fin, n("ratePct") ?? 0, n("termMonths")!, n("balloon") ?? 0) : null;

  const save = () => start(async () => {
    for (const g of GROUPS) for (const f of g.fields) {
      if (f.text || f.date || vals[f.k].trim() === "") continue;
      if (!Number.isFinite(Number(vals[f.k])) || Number(vals[f.k]) < 0) { setMsg({ ok: false, text: `${f.label} isn’t a number.` }); return; }
    }
    const res = await saveVanLoan({
      id,
      loan: { lender: vals.lender.trim() || null, deposit: n("deposit"), financed: n("financed"), ratePct: n("ratePct"), termMonths: n("termMonths"), firstPayment: vals.firstPayment || null, balloon: n("balloon") },
      purchasePrice: n("purchasePrice"), purchasedOn: vals.purchasedOn || null, monthlyRepayment: n("monthlyRepayment"),
      resaleValue: n("resaleValue"), lifespanYears: n("lifespanYears"),
    });
    setMsg(res.ok ? { ok: true, text: `Saved. ${name}’s balance now follows the repayments.` } : { ok: false, text: res.error ?? "Couldn’t save." });
    if (res.ok) { setEditing(false); router.refresh(); }
  });

  // The closed card reads the saved figures, written as people say them.
  const shown = (f: Field) => {
    const v = vals[f.k];
    if (v === "") {
      if (f.k === "monthlyRepayment" && est != null) return `$${est.toFixed(2)} a month, worked out`;
      if (f.k === "financed" && fin != null && fin > 0) return `$${fin.toLocaleString("en-AU")}, price less deposit`;
      return null;
    }
    if (f.text) return v;
    if (f.date) return new Date(`${v}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
    const n = Number(v);
    if (f.unit === "$") return `$${n.toLocaleString("en-AU")}`;
    if (f.unit === "$ a month") return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a month`;
    return `${n.toLocaleString("en-AU")}${f.unit.startsWith("%") ? "" : " "}${f.unit}`;
  };
  const [buy, theLoan, life] = GROUPS;

  return (
    <section className="pk-card pk-pad">
      <EditHead title="What it cost and how it’s paid for" sub={editing ? "off the purchase and finance contract" : undefined} editing={editing} canEdit={canEdit}
        onEdit={() => { setVals(fresh()); setMsg(null); setEditing(true); }}
        onCancel={() => { setVals(fresh()); setEditing(false); setMsg(null); }} />
      {!editing ? (
        <>
          <div className="pk-edit-cols">
            <div>
              {[buy, life].map((g) => (
                <div key={g.title}>
                  <div className="pk-glh">{g.title}</div>
                  {g.fields.map((f) => <Fact key={f.k} t={f.label} v={shown(f)} />)}
                </div>
              ))}
            </div>
            <div>
              <div className="pk-glh">{theLoan.title}</div>
              {theLoan.fields.filter((f) => f.k !== "balloon" || vals.balloon !== "").map((f) => <Fact key={f.k} t={f.label} v={shown(f)} />)}
            </div>
          </div>
          {msg?.ok && <p className="pk-said" role="status" style={{ marginTop: 10 }}>{msg.text}</p>}
        </>
      ) : (
        <>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="pk-glh">{g.title}</div>
              {g.fields.map((f) => (
                <div className="pk-kv" key={f.k}>
                  <span className="t"><b>{f.label}</b>{f.k === "monthlyRepayment" && est != null ? <span>works out at ${est.toFixed(2)} from the rate and term</span> : f.sub && <span>{f.sub}</span>}</span>
                  <input id={`loan-${f.k}-${id}`} className={`pk-in${f.text || f.date ? "" : " num"}`} type={f.date ? "date" : "text"} inputMode={f.text || f.date ? undefined : "decimal"}
                    style={f.text ? { width: 180 } : f.date ? { width: 160 } : undefined}
                    value={vals[f.k]} placeholder={f.placeholder ?? ""} aria-label={f.label}
                    onChange={(e) => setVals((v) => ({ ...v, [f.k]: f.text || f.date ? e.target.value : e.target.value.replace(/[^0-9.]/g, "") }))} />
                  {f.unit && <span className="pk-unit">{f.unit}</span>}
                </div>
              ))}
            </div>
          ))}
          <div className="pk-btns" style={{ marginTop: 14, alignItems: "center" }}>
            <button type="button" className="pk-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="pk-btn g" onClick={() => { setVals(fresh()); setEditing(false); setMsg(null); }} disabled={busy}>Cancel</button>
            {msg && !msg.ok && <span className="pk-said bad" role="status">{msg.text}</span>}
          </div>
        </>
      )}
    </section>
  );
}
