import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { PeriodPicker } from "@/components/portal/PeriodPicker";
import { getBankSummary, getPeriodInvoices, getPLDetail, getProfitAndLoss, type BankSummary } from "@/lib/portal/xero";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Money in & out — Team portal" };

const m0 = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;

type Month = { key: string; label: string; from: string; to: string };
function months(today: string, n: number): Month[] {
  const [y, m] = today.split("-").map(Number);
  const out: Month[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const from = d.toISOString().slice(0, 10);
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    out.push({ key: from.slice(0, 7), label: d.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }), from, to: end < today ? end : today });
  }
  return out;
}

/**
 * Money in & out, beside profit.
 *
 * Two different questions. Profit is what a month earned less what it cost,
 * paid or not — the P&L. Money in & out is what actually went through the
 * bank. A month can be profitable and still leave the bank lower (customers
 * yet to pay, stock bought ahead), and the other way round, which is why they
 * sit side by side.
 */
export default async function CashPage({ searchParams }: { searchParams: { m?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const today = isoDateMelbourne(new Date());
  const list = months(today, 6);
  const pick = list.find((x) => x.key === searchParams.m) ?? list[0];
  const prev = months(pick.from, 2)[1];

  const rows = await Promise.all(list.map(async (mo) => {
    const [bank, pl] = await Promise.all([getBankSummary(mo.from, mo.to), getProfitAndLoss(mo.from, mo.to)]);
    return { mo, bank, pl };
  }));
  const noScope = rows.some((r) => r.bank === "no-scope");
  const bankOf = (b: BankSummary | "no-scope" | null) => (b && b !== "no-scope" ? b : null);

  const [detail, detailPrev, bills] = await Promise.all([getPLDetail(pick.from, pick.to), getPLDetail(prev.from, prev.to), getPeriodInvoices("ACCPAY", pick.from, pick.to)]);
  const outLines = (d: typeof detail) => new Map((d?.sections ?? []).filter((s) => s.kind === "out").flatMap((s) => s.lines).map((l) => [l.label, l.amount]));
  const nowLines = outLines(detail);
  const prevLines = outLines(detailPrev);
  const spent = [...nowLines.entries()].filter(([, v]) => Math.abs(v) > 0.5).sort((a, b) => b[1] - a[1]);
  const spentTotal = spent.reduce((a, [, v]) => a + v, 0);
  const top = Math.max(1, ...spent.map(([, v]) => v));
  const pickBank = bankOf(rows.find((r) => r.mo.key === pick.key)?.bank ?? null);

  return (
    <PortalShell user={user}>
      <FinanceHead title="Money in & out" lede="What went through the bank each month, beside what each month earned. Profit and cash aren't the same thing; this shows both." />

      {noScope && (
        <div className="pt-note pt-note--warn">
          <strong>Xero needs one more permission to show the bank.</strong> Profit is below already; for money in and out,{" "}
          <a href="/api/xero/connect">reconnect Xero</a> and approve. Nothing in Xero changes, and the books stay read-only.
        </div>
      )}

      <section className="pt-panel" aria-labelledby="cash-months">
        <h2 id="cash-months" className="pt-panel__h">The last six months</h2>
        <div className="pt-fleet__wrap">
          <table className="pt-rev__pl">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Money in</th><th scope="col">Money out</th><th scope="col">Bank went</th>
                <th scope="col">Sales</th><th scope="col">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ mo, bank, pl }) => {
                const b = bankOf(bank);
                const net = b ? b.received - b.spent : null;
                return (
                  <tr key={mo.key} className={mo.key === pick.key ? "is-total" : undefined}>
                    <th scope="row"><a href={`/portal/finance/cash?m=${mo.key}`}>{mo.label}</a>{mo.to === today && <em> so far</em>}</th>
                    <td>{b ? m0(b.received) : "—"}</td>
                    <td>{b ? m0(b.spent) : "—"}</td>
                    <td className={net == null ? undefined : net < 0 ? "is-bad" : "is-good"}>{net == null ? "—" : `${net < 0 ? "▼ " : "▲ "}${signed(net)}`}</td>
                    <td>{pl ? m0(pl.income) : "—"}</td>
                    <td className={pl ? (pl.netProfit < 0 ? "is-bad" : "is-good") : undefined}>{pl ? `${pl.netProfit < 0 ? "▼ " : "▲ "}${signed(pl.netProfit)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="pt-hr__foot">
          Money in and out are everything through the bank accounts — customers paying, suppliers, wages, tax, loans. Sales and profit are the P&amp;L: what was invoiced, and what&rsquo;s left after every cost, paid or not.
        </p>
      </section>

      <section className="pt-panel" aria-labelledby="cash-went">
        <div className="pt-wi__outhead">
          <h2 id="cash-went" className="pt-panel__h">Where the money went in {pick.label}</h2>
          <PeriodPicker label="Month" value={pick.key} options={list.map((x) => ({ key: x.key, label: x.label }))} hrefPrefix="/portal/finance/cash?m=" />
        </div>
        {pickBank && (
          <p className="pt-panel__sub">
            {m0(pickBank.received)} came into the bank and {m0(pickBank.spent)} went out, so the bank {pickBank.received >= pickBank.spent ? "grew" : "fell"} by {m0(Math.abs(pickBank.received - pickBank.spent))}.
            {pickBank.accounts.length > 1 && ` Across ${pickBank.accounts.length} accounts.`}
          </p>
        )}
        <p className="pt-panel__sub">Every cost the month carried, biggest first, from the P&amp;L — {m0(spentTotal)} in all. The arrow is against {prev.label.split(" ")[0]}.</p>
        {spent.length ? (
          <div className="pt-hs__spend">
            {spent.map(([label, v]) => {
              const was = prevLines.get(label) ?? 0;
              const d = v - was;
              return (
                <div key={label} className="pt-hs__row">
                  <span className="pt-hs__lbl">{label}</span>
                  <span className="pt-hs__bar" aria-hidden="true"><i style={{ width: `${Math.max(0, (v / top) * 100)}%` }} /></span>
                  <strong className="pt-hs__yr">{m0(v)}</strong>
                  <span className={`pt-hs__ph${Math.abs(d) < 1 ? "" : d > 0 ? " is-up" : " is-down"}`}>{Math.abs(d) < 1 ? "same" : `${d > 0 ? "▲" : "▼"} ${m0(Math.abs(d))}`}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="pt-todo__empty">Xero didn&rsquo;t return the month&rsquo;s costs.</p>}
      </section>

      {bills && bills.byContact.length > 0 && (
        <section className="pt-panel" aria-labelledby="cash-sup">
          <h2 id="cash-sup" className="pt-panel__h">Billed by suppliers in {pick.label}</h2>
          <div className="pt-fleet__wrap">
            <table className="pt-rev__pl">
              <thead><tr><th scope="col">Supplier</th><th scope="col">Bills</th><th scope="col">Billed</th><th scope="col">Still owing</th></tr></thead>
              <tbody>
                {bills.byContact.map((c) => (
                  <tr key={c.contact}><th scope="row">{c.contact}</th><td>{c.count}</td><td>{m0(c.total)}</td><td className={c.due > 0 ? "is-warn" : undefined}>{c.due > 0 ? m0(c.due) : "paid"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pt-hr__foot">The {bills.byContact.length} biggest; {bills.count} supplier bills came in this month, {m0(bills.total)} in all.</p>
        </section>
      )}
    </PortalShell>
  );
}
