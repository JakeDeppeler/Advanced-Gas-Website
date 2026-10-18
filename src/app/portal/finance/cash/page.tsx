import { redirect } from "next/navigation";
import { ReconcileNote } from "@/components/portal/finance/ReconcileNote";
import { getSettings } from "@/lib/portal/db";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { getBankSummary, getOwedBills, getProfitAndLoss, xeroStatus, type BankSummary, type OwedBill } from "@/lib/portal/xero";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { cashCover, owedInvoices } from "@/lib/portal/run/money";
import { money } from "@/lib/portal/run/month";
import { BENCH } from "@/lib/portal/benchmarks";
import { Bad, Card, Empty, Grid, Head, Hero, Kv, Note, Pair, Say, Tile, Two, none, type Status } from "@/components/portal/kit/Kit";
import { InOutChart } from "@/components/portal/kit/HoverCharts";
import { XeroOff } from "@/components/portal/finance/Parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cash flow · Team portal" };

type Month = { key: string; short: string; label: string; from: string; to: string };
function months(today: string, n: number): Month[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    const from = d.toISOString().slice(0, 10);
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    return {
      key: from.slice(0, 7), from, to: end < today ? end : today,
      short: d.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" }),
      label: d.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  });
}
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
const daysTo = (iso: string, today: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
const dueWithin = (bills: OwedBill[] | null, days: number, today: string) => (bills ?? []).filter((b) => daysTo(b.due, today) <= days).reduce((a, b) => a + b.amountDue, 0);

/**
 * Profit & finance › Cash flow. Money in & out is what actually went through
 * the bank, which isn't profit: a month can earn well and still leave the bank
 * lower while customers are slow to pay. Cash to operate is how long the bank
 * would keep everyone paid if the work stopped.
 */
export default async function CashPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Cash flow" forWhom="managers" />;

  const tab = searchParams.tab === "operate" ? "operate" : "flow";
  const [{ status: xs }, reconciled] = await Promise.all([xeroStatus(), getSettings<{ to: string; by: string }>("bank-reconciled").catch(() => null)]);

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title={tab === "flow" ? "Cash flow" : "Cash to operate"} sub="Xero bank feeds" info={tab === "flow" ? [
          ["Money in", "Cash that hit the bank: paid invoices, deposits."],
          ["Money out", "Everything paid: wages, suppliers, BAS, super, leases."],
          ["Kept", "In less out. Profit isn’t cash until the invoice is paid."],
        ] : [
          ["Running costs", "What goes out every month just to exist: wages, rent, insurance, software, vans. Parts and subbies aren’t in here because they only happen when there’s a job."],
          ["Weeks it covers", "Cash in the bank divided by a week of running costs. If the phone stopped tomorrow, this is how long we could keep paying everyone."],
          ["The buffer", `${BENCH.cash.words}, ${BENCH.cash.why}. It’s what gets you through a slow January or a big customer paying late.`],
        ]} />
        <ReconcileNote stamp={reconciled ? { to: reconciled.to, by: reconciled.by } : null} today={isoDateMelbourne(new Date())} />
        {xs !== "connected" ? <XeroOff state={xs} what="bank" /> : tab === "flow" ? <Flow /> : <Operate />}
      </div>
    </PortalShell>
  );
}

async function Flow() {
  const today = isoDateMelbourne(new Date());
  const list = months(today, 6);
  const [rows, cover, owed, bills] = await Promise.all([
    Promise.all(list.map(async (mo) => {
      const [bank, pl] = await Promise.all([getBankSummary(mo.from, mo.to).catch(() => null), getProfitAndLoss(mo.from, mo.to).catch(() => null)]);
      return { mo, bank, pl };
    })),
    cashCover(),
    owedInvoices().then((o) => o?.list ?? null).catch(() => null),
    getOwedBills().catch(() => null),
  ]);
  const bankOf = (b: BankSummary | "no-scope" | null) => (b && b !== "no-scope" ? b : null);
  if (rows.some((r) => r.bank === "no-scope")) {
    return (
      <Card title="Xero needs one more permission to show the bank">
        <p className="pk-note" style={{ marginBottom: 12 }}>Reconnect Xero and approve the bank permission. Nothing in Xero changes, and the books stay read-only.</p>
        <a href="/api/xero/connect" className="pk-btn">Reconnect Xero ›</a>
      </Card>
    );
  }
  const known = rows.map((r) => ({ ...r, b: bankOf(r.bank) }));
  const kept = known.reduce((a, r) => a + (r.b ? r.b.received - r.b.spent : 0), 0);
  const dueSoon = dueWithin(bills, 7, today);
  const owedTotal = owed?.reduce((a, i) => a + i.amountDue, 0) ?? null;
  const overdue = owed?.filter((i) => i.daysOver > 0).reduce((a, i) => a + i.amountDue, 0) ?? null;
  const pts = known.filter((r) => r.b).map((r) => ({ label: r.mo.short, full: r.mo.to === today ? `${r.mo.label} so far` : r.mo.label, in: r.b!.received, out: r.b!.spent }));

  return (
    <>
      <Say>
        Over the last six months the bank {kept >= 0 ? "kept" : "lost"} <b>{money(Math.abs(kept))}</b>.{" "}
        {bills == null ? null : dueSoon > 0 ? <><Bad>{money(dueSoon)} of bills are due in the next 7 days</Bad>{cover.bank != null ? <>, with {money(cover.bank)} in the bank.</> : "."}</> : "No bills are due in the next 7 days."}
      </Say>
      <Pair>
        <Hero dark label="In the bank" right={cover.accounts ? `${cover.accounts} account${cover.accounts === 1 ? "" : "s"}` : undefined}
          fig={cover.bank != null ? money(cover.bank) : ""} frac={cover.bank != null && dueSoon > 0 ? Math.min(1, cover.bank / dueSoon) : cover.bank != null ? 1 : null}
          sub={bills == null ? "Xero didn’t return the bills" : `${money(dueSoon)} of bills due this week`} href="/portal/finance/owe" />
        <Hero label="Coming in" right="owed to us" fig={owedTotal != null ? money(owedTotal) : ""} frac={owedTotal && overdue != null ? overdue / owedTotal : null}
          sub={overdue != null ? `${money(overdue)} of it is overdue` : "Xero didn’t return the invoices"} href="/portal/money" />
      </Pair>
      <Card title="Money in and money out" aside="solid = in · dashed = out · green where more came in · point at a month">
        {pts.length >= 2 ? <InOutChart points={pts} /> : <Empty>Xero didn’t return enough months of the bank to draw.</Empty>}
      </Card>
      <Card title="Month by month" aside="the bank beside the P&L">
        <div className="pk-tbl-wrap">
          <table className="pk-tbl">
            <thead><tr><th>Month</th><th>Money in</th><th>Money out</th><th>Bank went</th><th>Sales</th><th>Profit</th></tr></thead>
            <tbody>
              {[...known].reverse().map(({ mo, b, pl }) => {
                const net = b ? b.received - b.spent : null;
                return (
                  <tr key={mo.key}>
                    <td><b>{mo.label}</b>{mo.to === today && <span className="ks"> so far</span>}</td>
                    <td>{b ? money(b.received) : ""}</td>
                    <td>{b ? money(b.spent) : ""}</td>
                    <td style={{ color: net == null ? undefined : net < 0 ? "var(--bad)" : "var(--good)", fontWeight: 700 }}>{net == null ? "" : `${net < 0 ? "▼" : "▲"} ${signed(net)}`}</td>
                    <td>{pl ? money(pl.income) : ""}</td>
                    <td style={{ color: pl ? (pl.netProfit < 0 ? "var(--bad)" : undefined) : undefined }}>{pl ? `${pl.netProfit < 0 ? "▼ " : ""}${signed(pl.netProfit)}` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}><Note>Money in and out are everything through the bank accounts, customers paying, suppliers, wages, tax, loans. Sales and profit are the P&amp;L: what was invoiced, and what’s left after every cost, paid or not.</Note></div>
      </Card>
    </>
  );
}

async function Operate() {
  const today = isoDateMelbourne(new Date());
  const [cover, owed, bills] = await Promise.all([cashCover(), owedInvoices().then((o) => o?.list ?? null).catch(() => null), getOwedBills().catch(() => null)]);
  const target = BENCH.cash.lo;
  const { bank, month, weekly, weeks } = cover;
  if (month == null || weekly == null) return <XeroOff state="no-answer" what="the last three months’ costs" />;

  const st: Status = weeks == null ? none("No figure") : weeks >= target ? { k: "good", w: "Enough" } : weeks >= target / 2 ? { k: "mid", w: "Getting low" } : { k: "bad", w: "Too low" };
  const need = bank != null ? Math.max(0, target * weekly - bank) : null;
  const owedTotal = owed?.reduce((a, i) => a + i.amountDue, 0) ?? null;
  const bills30 = bills ? dueWithin(bills, 30, today) : null;
  const worst = bank != null && owedTotal != null && bills30 != null ? bank + owedTotal - bills30 - month : null;

  return (
    <>
      <Say>
        It costs about <b>{money(month)} a month</b> to keep the doors open, whether or not a job is on.{" "}
        {bank == null || weeks == null ? "Xero didn’t return the bank, so there’s no weeks figure." : weeks >= target
          ? <>{money(bank)} in the bank covers {weeks.toFixed(1)} weeks, more than the {target} weeks we aim to keep.</>
          : <>{money(bank)} in the bank covers <Bad>{weeks.toFixed(1)} weeks</Bad>, short of the {target} weeks we aim to keep.</>}
      </Say>
      <Grid cols={4}>
        <Tile label="Running costs a month" st={{ k: "none", w: "" }} fig={money(month)} frac={1} sub={`${money(weekly)} a week`} />
        <Tile label="In the bank" st={st} fig={bank != null ? money(bank) : ""} frac={weeks != null ? weeks / target : null} sub="Xero bank feeds" />
        <Tile label="Weeks it covers" st={st.k === "good" ? { k: "good", w: "On track" } : st} fig={weeks != null ? weeks.toFixed(1) : ""} frac={weeks != null ? weeks / target : null} sub={`aim for ${target} weeks or more`} />
        <Tile label="To reach the buffer" st={need == null ? none("No figure") : need > 0 ? { k: st.k === "none" ? "mid" : st.k, w: "Short" } : { k: "good", w: "Done" }}
          fig={need == null ? "" : need > 0 ? money(need) : "Nothing"} frac={need == null ? null : 1 - need / (target * weekly)} sub={need ? "more cash to put aside" : "the buffer is there"} />
      </Grid>
      <Two>
        <Card title="What it costs to run, a month" aside="the last three full months from Xero, averaged">
          <Kv t="Wages, super and WorkCover" sub="the team and the office, every pay run" v={money(cover.wagesMonth ?? 0)} />
          <Kv t="Everything else to keep the doors open" sub="rent, vans, insurance, software, marketing and the rest" v={money(cover.otherMonth ?? 0)} />
          <Kv t={<b>Total</b>} sub={`${money(month * 12)} a year`} v={money(month)} />
          <Note>Parts, materials and subbies are left out: they only happen when there’s a job to pay for them.</Note>
        </Card>
        <Card title="Next 30 days, worst case" aside="if nothing new gets billed">
          <Kv t="In the bank now" v={bank != null ? money(bank) : ""} />
          <Kv t="Coming in" sub="everything owed to us gets paid" v={owedTotal != null ? `+${money(owedTotal)}` : ""} />
          <Kv t="Bills due" sub="every unpaid bill in Xero due by then, or late" v={bills30 != null ? `−${money(bills30)}` : ""} />
          <Kv t="A month of running costs" v={`−${money(month)}`} />
          <Kv t={<b>Left at the end</b>} v={worst == null ? "" : <span style={{ color: worst < 0 ? "var(--bad)" : "var(--good)" }}>{worst < 0 ? "▼ " : ""}{money(worst)}</span>} />
        </Card>
      </Two>
    </>
  );
}
