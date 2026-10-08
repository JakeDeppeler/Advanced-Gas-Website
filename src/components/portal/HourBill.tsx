"use client";

import { useRef, useState, type ReactNode } from "react";
import { BILL_FAMILIES, BILL_LINES, type BillFamily, type PersonBill } from "@/lib/portal/hourBill";

const m2 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const h0 = (n: number) => `${Math.round(n).toLocaleString("en-AU")} hrs`;
const pc = (n: number) => `${Math.round(n * 100)}%`;

type Tab = "all" | BillFamily;

/** What each part of the bill is, in the words someone reading it would use. */
const ABOUT: Record<BillFamily, (x: { superPct: number }) => string> = {
  pay: ({ superPct }) => `What they're paid for the hour on the tools, and what goes on top of every wage: super at ${superPct}%, WorkCover, and long service leave put aside as they earn it.`,
  off: () => "Every hour they're paid for and can't bill — leave, public holidays, sick days, RDOs, trade school, the drive and the paperwork between jobs, going back to fix our own work — spread over the hours they can. Their own days, not an average, so an apprentice carries their school and a tradesman doesn't.",
  van: () => "The van they go out in: fuel, servicing, rego, insurance and tolls, then what the van itself costs a year in depreciation and finance. Shared across every billable hour.",
  kit: () => "What they work with and what keeps them busy: tools, uniform and PPE, training and licences, the marketing that keeps the phone ringing, and an apprentice's own school fees.",
  office: () => "The people behind them who don't go out on jobs, and the yard, software, phones, accountant, bank and insurance. Shared across every billable hour.",
};

/**
 * Each person's hour as a bill, a part at a time.
 *
 * One table with every line for every person was a wall of figures. The first
 * tab is the whole hour at a glance; each tab after it opens one part of the
 * bill with what it is and the lines in it, so a line is read beside the
 * others like it rather than between unrelated ones.
 */
export function HourBill({ bills, superPct, children }: { bills: PersonBill[]; superPct: number; children?: ReactNode }) {
  const [tab, setTab] = useState<Tab>("all");
  const tabs: Array<{ key: Tab; label: string }> = [{ key: "all", label: "The whole hour" }, ...BILL_FAMILIES.map((f) => ({ key: f.key as Tab, label: f.label }))];
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const fam = (b: PersonBill, f: string) => b.lines.filter((l) => l.family === f).reduce((a, l) => a + l.perHr, 0);
  const top = Math.max(...bills.map((b) => Math.max(b.charge, b.cost)));
  const famIdx = (k: Tab) => BILL_FAMILIES.findIndex((f) => f.key === k);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (n == null) return;
    e.preventDefault();
    const j = (n + tabs.length) % tabs.length;
    setTab(tabs[j].key);
    refs.current[j]?.focus();
  };

  const head = <thead><tr><th scope="col">An hour of…</th>{bills.map((b) => <th key={b.id} scope="col">{b.name.split(" ")[0]}</th>)}</tr></thead>;

  return (
    <section className="pt-panel" aria-labelledby="hr-bill">
      <h2 id="hr-bill" className="pt-panel__h">Each person&rsquo;s hour, as a bill</h2>
      <p className="pt-panel__sub">Everything one billable hour of theirs has to pay for, then the margin. The parts add up to what they cost us, the same figure the Job calculator prices from.</p>

      <div className="pt-seg pt-bill__tabs" role="tablist" aria-label="Part of the bill">
        {tabs.map((t, i) => (
          <button
            key={t.key} ref={(el) => { refs.current[i] = el; }} id={`bill-tab-${t.key}`} type="button" role="tab"
            aria-selected={tab === t.key} aria-controls="bill-panel" tabIndex={tab === t.key ? 0 : -1}
            className={`pt-seg__b${tab === t.key ? " is-on" : ""}`} onClick={() => setTab(t.key)} onKeyDown={(e) => onKey(e, i)}
          >
            {t.key !== "all" && <i className={`pt-bill__sw f${famIdx(t.key)}`} aria-hidden="true" />}
            {t.label}
          </button>
        ))}
      </div>

      <div id="bill-panel" role="tabpanel" aria-labelledby={`bill-tab-${tab}`} className="pt-bill__panel">
        {tab === "all" ? (
          <>
            <ul className="pt-bill__legend" aria-label="Key">
              {BILL_FAMILIES.map((f, i) => <li key={f.key}><i className={`pt-bill__sw f${i}`} aria-hidden="true" />{f.label}</li>)}
              <li><i className="pt-bill__sw is-margin" aria-hidden="true" />Margin</li>
            </ul>
            <div className="pt-bill__rows">
              {bills.map((b) => (
                <div key={b.id} className="pt-bill__row">
                  <span className="pt-bill__who">{b.name}<em>{h0(b.billHrs)} billable a year</em></span>
                  <span className="pt-bill__track" role="img" aria-label={`${b.name}: ${BILL_FAMILIES.map((f) => `${f.label} ${m2(fam(b, f.key))}`).join(", ")}, margin ${m2(b.charge - b.cost)}, charged at ${m2(b.charge)}`}>
                    {BILL_FAMILIES.map((f, i) => {
                      const v = fam(b, f.key);
                      return v > 0 ? <i key={f.key} className={`pt-bill__seg f${i}`} style={{ width: `${(v / top) * 100}%` }} title={`${f.label}: ${m2(v)}`} /> : null;
                    })}
                    {b.charge > b.cost && <i className="pt-bill__seg is-margin" style={{ width: `${((b.charge - b.cost) / top) * 100}%` }} title={`Margin: ${m2(b.charge - b.cost)}`} />}
                  </span>
                  <span className="pt-bill__fig"><strong>{m2(b.charge)}</strong><em>costs us {m2(b.cost)}{b.override ? " · set by hand" : ""}</em></span>
                </div>
              ))}
            </div>
            <div className="pt-fleet__wrap">
              <table className="pt-rev__pl pt-bill__table">
                {head}
                <tbody>
                  {BILL_FAMILIES.map((f, i) => (
                    <tr key={f.key}>
                      <th scope="row">
                        <button type="button" className="pt-bill__open" onClick={() => setTab(f.key)}>
                          <i className={`pt-bill__sw f${i}`} aria-hidden="true" />{f.label}
                        </button>
                      </th>
                      {bills.map((b) => <td key={b.id}>{m2(fam(b, f.key))}<em>{pc(fam(b, f.key) / b.cost)} of the hour</em></td>)}
                    </tr>
                  ))}
                  <tr className="is-total"><th scope="row">What an hour costs us</th>{bills.map((b) => <td key={b.id}>{m2(b.cost)}</td>)}</tr>
                  <tr><th scope="row">Margin</th>{bills.map((b) => <td key={b.id}>+{m2(b.charge - b.cost)}</td>)}</tr>
                  <tr className="is-total"><th scope="row">What we charge</th>{bills.map((b) => <td key={b.id}>{m2(b.charge)}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <p className="pt-bill__about">{ABOUT[tab]({ superPct })}</p>
            <div className="pt-fleet__wrap">
              <table className="pt-rev__pl pt-bill__table">
                {head}
                <tbody>
                  {BILL_LINES.filter((l) => l.family === tab && bills.some((b) => Math.abs(b.lines.find((x) => x.key === l.key)?.perHr ?? 0) > 0.005)).map((l) => (
                    <tr key={l.key}>
                      <th scope="row">{l.label}{l.note && <em> {l.note}</em>}</th>
                      {bills.map((b) => {
                        const x = b.lines.find((y) => y.key === l.key);
                        const time = x?.days != null ? (x.days ? `${x.days} ${x.days === 1 ? "day" : "days"} a year` : null) : x?.hrs != null && x.hrs > 0.5 ? `${h0(x.hrs)} a year` : null;
                        return <td key={b.id}>{Math.abs(x?.perHr ?? 0) < 0.005 ? "—" : <>{m2(x!.perHr)}{time && <em>{time}</em>}</>}</td>;
                      })}
                    </tr>
                  ))}
                  <tr className="is-total">
                    <th scope="row">{BILL_FAMILIES[famIdx(tab)].label}, all of it</th>
                    {bills.map((b) => <td key={b.id}>{m2(fam(b, tab))}<em>{pc(fam(b, tab) / b.cost)} of the hour</em></td>)}
                  </tr>
                  {tab === "off" && (
                    <tr>
                      <th scope="row">Hours they can bill<em> what all of the above is spread over</em></th>
                      {bills.map((b) => <td key={b.id}>{h0(b.billHrs)}</td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {children}
    </section>
  );
}
