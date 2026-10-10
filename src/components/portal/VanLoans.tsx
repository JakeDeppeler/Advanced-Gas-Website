"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveGrowth, saveVanMoney } from "@/app/portal/finance/capacity/actions";
import { newVanDep, newVanUpfront, type Growth, type NewVan } from "@/lib/portal/growthTypes";

const m0 = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

export type VanMoney = {
  id: string; name: string; onRoad: boolean;
  purchasePrice: number | null; amountOwing: number | null; monthlyRepayment: number | null;
  resaleValue: number | null; lifespanYears: number | null;
};

type Draft = Record<"purchasePrice" | "amountOwing" | "monthlyRepayment" | "resaleValue" | "lifespanYears", string>;
const toDraft = (v: VanMoney): Draft => ({
  purchasePrice: v.purchasePrice?.toString() ?? "", amountOwing: v.amountOwing?.toString() ?? "",
  monthlyRepayment: v.monthlyRepayment?.toString() ?? "", resaleValue: v.resaleValue?.toString() ?? "",
  lifespanYears: v.lifespanYears?.toString() ?? "",
});
const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[$,\s]/g, "")));

/**
 * Every van's money in one table — what was paid, what's still owed, what it
 * costs a month, and the resale and life its depreciation comes from — and,
 * under it, what the next van would cost. The only place these are set: the
 * hourly rate's depreciation, Planning's van outlay and the Vehicles tab all
 * read them from here.
 */
export function VanLoans({ vans, growth }: { vans: VanMoney[]; growth: Growth }) {
  const live = vans.filter((v) => v.onRoad);
  const owed = live.reduce((a, v) => a + (v.amountOwing ?? 0), 0);
  const monthly = live.reduce((a, v) => a + (v.monthlyRepayment ?? 0), 0);
  const noRepay = live.filter((v) => (v.amountOwing ?? 0) > 0 && !v.monthlyRepayment).length;

  return (
    <div className="pt-nums">
      <section className="pt-panel" aria-labelledby="vl-h">
        <h2 id="vl-h" className="pt-panel__h">The vans and what&rsquo;s owed on them</h2>
        <p className="pt-panel__sub">
          Change a figure and save that row. Depreciation on Our hourly rate is worked from the price, resale and life; Planning uses the repayments.
        </p>
        <div className="pt-nums__sum">
          <span><strong>{m0(owed)}</strong> still owing</span>
          <span><strong>{m0(monthly)}</strong> a month in repayments</span>
          <span><strong>{m0(monthly * 12)}</strong> a year</span>
          {noRepay > 0 && <span className="is-warn"><b aria-hidden="true">! </b>{noRepay} {noRepay === 1 ? "van owes money but has" : "vans owe money but have"} no repayment set</span>}
        </div>
        <div className="pt-fleet__wrap">
          <table className="pt-rev__pl pt-nums__vans">
            <thead>
              <tr>
                <th scope="col">Van</th><th scope="col">Paid</th><th scope="col">Still owing</th><th scope="col">Repayment a month</th>
                <th scope="col">Worth at the end</th><th scope="col">Life</th><th scope="col"><span className="pt-sr">Save</span></th>
              </tr>
            </thead>
            <tbody>{vans.map((v) => <VanRow key={v.id} v={v} />)}</tbody>
          </table>
        </div>
      </section>
      <NewVanForm growth={growth} />
    </div>
  );
}

function VanRow({ v }: { v: VanMoney }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState<Draft>(toDraft(v));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(v));
  const bad = Object.values(d).some((x) => x.trim() !== "" && !Number.isFinite(toNum(x) as number));
  const cell = (k: keyof Draft, label: string, pre = "$", post = "") => (
    <td>
      <span className="pt-calc__field">
        {pre && <span className="pt-calc__post">{pre}</span>}
        <input id={`vl-${k}-${v.id}`} inputMode="decimal" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} aria-label={`${v.name}: ${label}`} />
        {post && <span className="pt-calc__post">{post}</span>}
      </span>
    </td>
  );
  return (
    <tr className={v.onRoad ? undefined : "is-off"}>
      <th scope="row">{v.name}{!v.onRoad && <em> off the road</em>}</th>
      {cell("purchasePrice", "paid")}
      {cell("amountOwing", "still owing")}
      {cell("monthlyRepayment", "repayment a month")}
      {cell("resaleValue", "worth at the end of its life")}
      {cell("lifespanYears", "life in years", "", "yrs")}
      <td>
        <button type="button" className="pt-btn pt-btn--navy pt-btn--sm" disabled={!dirty || bad || pending}
          onClick={() => start(async () => {
            const r = await saveVanMoney({
              id: v.id, purchasePrice: toNum(d.purchasePrice), amountOwing: toNum(d.amountOwing), monthlyRepayment: toNum(d.monthlyRepayment),
              resaleValue: toNum(d.resaleValue), lifespanYears: toNum(d.lifespanYears),
            });
            setMsg(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error ?? "Couldn't save." });
            if (r.ok) router.refresh();
          })}>
          {pending ? "Saving…" : "Save"}
        </button>
        {msg && <span className={`pt-nums__msg ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</span>}
      </td>
    </tr>
  );
}

function NewVanForm({ growth }: { growth: Growth }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<NewVan>(growth.newVan);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(growth.newVan);
  const f = (k: keyof NewVan, label: string, hint: string, pre = "$", post = "") => (
    <label className="pt-nums__f" htmlFor={`nv-${k}`}>
      <span>{label}<em>{hint}</em></span>
      <span className="pt-calc__field">
        {pre && <span className="pt-calc__post">{pre}</span>}
        <input id={`nv-${k}`} type="number" min={0} step="any" value={v[k] || ""} placeholder="0"
          onChange={(e) => setV({ ...v, [k]: Math.max(0, Number(e.target.value) || 0) })} />
        {post && <span className="pt-calc__post">{post}</span>}
      </span>
    </label>
  );
  return (
    <section className="pt-panel" aria-labelledby="nv-h">
      <h2 id="nv-h" className="pt-panel__h">What the next van costs</h2>
      <p className="pt-panel__sub">What Planning uses when you hire someone who needs their own van.</p>
      <div className="pt-nums__grid">
        {f("price", "The van", "drive-away")}
        {f("fitout", "Fit-out", "shelving, racking, signage")}
        {f("toolsStock", "Tools and stock", "what it carries on day one")}
        {f("deposit", "Deposit", "cash down on the finance")}
        {f("monthly", "Repayment a month", "on the finance")}
        {f("termMonths", "Finance runs for", "", "", "months")}
        {f("resale", "Worth at the end", "for depreciation")}
        {f("lifeYears", "Life", "", "", "yrs")}
      </div>
      <p className="pt-nums__sum">
        <span><strong>{m0(newVanUpfront(v))}</strong> up front <em>(deposit, fit-out, tools and stock)</em></span>
        <span><strong>{m0(v.monthly)}</strong> a month after that</span>
        <span><strong>{m0(newVanDep(v))}</strong> a year in depreciation</span>
      </p>
      <div className="pt-nums__acts">
        <button type="button" className="pt-btn pt-btn--navy" disabled={!dirty || pending}
          onClick={() => start(async () => {
            const r = await saveGrowth({ ...growth, newVan: v });
            setMsg(r.ok ? { ok: true, text: "Saved. Planning uses these now." } : { ok: false, text: r.error ?? "Couldn't save." });
            if (r.ok) router.refresh();
          })}>
          {pending ? "Saving…" : "Save the new van"}
        </button>
        {msg && <span className={`pt-nums__msg ${msg.ok ? "is-ok" : "is-err"}`} role="status">{msg.text}</span>}
      </div>
    </section>
  );
}
