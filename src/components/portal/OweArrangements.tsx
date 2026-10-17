"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveArrangement } from "@/app/portal/finance/owe/actions";
import { ARRANGEMENT_LABEL, supplierKey, type Arrangement } from "@/lib/owe/types";

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const EVERY = { week: "a week", fortnight: "a fortnight", month: "a month" } as const;

/**
 * The suppliers paid off on terms: the ATO's payment plan, Metalflex's line
 * of credit. Each shows what's still owed on its bills, the repayment, and a
 * line about it. Set up or changed here; taking one off puts its bills back
 * in the pay order.
 */
export function OweArrangements({ list, balances, suppliers }: { list: Arrangement[]; balances: Record<string, number>; suppliers: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState<Arrangement | "new" | null>(null);
  const blank: Arrangement = { supplier: "", kind: "plan", repay: null, every: "month", note: null };
  const [f, setF] = useState({ supplier: "", kind: "plan", repay: "", every: "month", note: "" });
  const open = (a: Arrangement | "new") => {
    const x = a === "new" ? blank : a;
    setF({ supplier: x.supplier, kind: x.kind, repay: x.repay != null ? String(x.repay) : "", every: x.every, note: x.note ?? "" });
    setEdit(a);
  };
  const run = (input: typeof f, ok: string) => start(async () => {
    const r = await saveArrangement(input);
    setMsg(r.ok ? ok : r.error ?? "Couldn't save that.");
    if (r.ok) setEdit(null);
    router.refresh();
  });

  return (
    <section className="pk-card pk-pad" aria-labelledby="arr-h">
      <div className="pk-card-h">
        <b id="arr-h">Paying off on terms</b>
        <button type="button" className="qp-btn" style={{ height: 34, fontSize: 13 }} onClick={() => open("new")}>+ Add one</button>
      </div>
      <p className="pk-note">A payment plan or a line of credit is paid down over time, so its bills aren&rsquo;t counted as due this week or put in the pay order. The repayment is what goes out.</p>
      {list.length ? (
        <div className="arr-rows">
          {list.map((a) => (
            <div key={a.supplier} className="arr-row">
              <span><b>{a.supplier}</b><span className={`arr-kind k-${a.kind}`}>{ARRANGEMENT_LABEL[a.kind]}</span></span>
              <span className="arr-owed"><small>still owed</small>{m0(balances[supplierKey(a.supplier)] ?? 0)}</span>
              <span className="arr-repay"><small>repaying</small>{a.repay != null ? `${m0(a.repay)} ${EVERY[a.every]}` : "not set"}</span>
              <span className="arr-note">{a.note ?? ""}</span>
              <button type="button" className="pt-todo__editbtn" onClick={() => open(a)}>Change</button>
            </div>
          ))}
        </div>
      ) : <p className="pk-note">None set up. Add the ATO&rsquo;s payment plan and the Metalflex line of credit here.</p>}

      {edit && (
        <form className="arr-form" onSubmit={(e) => { e.preventDefault(); run(f, `${f.supplier}: saved.`); }}>
          <label><span>Supplier</span>
            <input id="arr-sup" list="arr-sups" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} placeholder="e.g. ATO" required disabled={edit !== "new"} />
            <datalist id="arr-sups">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
          <label><span>What it is</span>
            <select id="arr-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="plan">Payment plan</option>
              <option value="credit">Line of credit</option>
            </select>
          </label>
          <label><span>Repayment</span>
            <input id="arr-repay" inputMode="decimal" value={f.repay} onChange={(e) => setF({ ...f, repay: e.target.value })} placeholder="e.g. 2,000" />
          </label>
          <label><span>How often</span>
            <select id="arr-every" value={f.every} onChange={(e) => setF({ ...f, every: e.target.value })}>
              <option value="week">Weekly</option>
              <option value="fortnight">Fortnightly</option>
              <option value="month">Monthly</option>
            </select>
          </label>
          <label className="arr-wide"><span>A line about it</span>
            <input id="arr-note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. ATO plan agreed August, ends June" maxLength={200} />
          </label>
          <div className="arr-acts">
            <button type="submit" className="qp-btn dark" disabled={pending}>Save</button>
            <button type="button" className="qp-btn" onClick={() => setEdit(null)}>Cancel</button>
            {edit !== "new" && <button type="button" className="td-del" disabled={pending} onClick={() => run({ ...f, kind: "" }, `${f.supplier} is back in the pay order.`)}>Take it off terms</button>}
          </div>
        </form>
      )}
      {msg && <p className="pk-note" role="status" style={{ marginTop: 8 }}>{msg}</p>}
    </section>
  );
}
