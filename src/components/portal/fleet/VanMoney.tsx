import Link from "next/link";
import type { Vehicle } from "@/lib/portal/db";
import { loanState, EMPTY_LOAN } from "@/lib/portal/fleet/loan";
import { listTools } from "@/lib/portal/van";
import { toolState, shortDate, type VanTool } from "@/lib/portal/vanParts";
import { vehicleFinance, fuelPerYear, years } from "@/components/portal/vehicleMath";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { Card, Empty, Grid, Group, Kv, Note, Pill, Row, Say, Tile, Two, none, type Status } from "@/components/portal/kit/Kit";
import { LoanChart } from "@/components/portal/kit/HoverCharts";
import { LoanForm } from "@/components/portal/fleet/LoanForm";

const m$ = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const m2 = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", month: "short", year: "numeric" });
const dayMonthYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** Where a piece of gear stands, in a pill: broken, past its life, nearly there, a test due, or fine. */
function gearSt(t: VanTool, today: Date): Status {
  const s = toolState(t, today);
  if (s.broken) return { k: "bad", w: "Broken" };
  if (s.lifePct != null && s.lifePct >= 1) return { k: "bad", w: "Replace — past its life" };
  if (s.old) return { k: "mid", w: "Replace soon" };
  if (s.overdue) return { k: "bad", w: `${t.nextDue || "Due"} overdue` };
  if (s.due) return { k: "mid", w: `${t.nextDue || "Due"} ${shortDate(t.nextDueOn!)}` };
  return t.lifeYears && t.boughtOn ? { k: "good", w: "Good" } : none("No life set");
}

/**
 * A van's Costs & details tab: what it cost, how it's being paid for and how
 * that's going, what it costs to run, and the gear that goes with it. The
 * balance comes from the finance contract, a repayment at a time.
 */
export async function VanMoney({ van, canEdit }: { van: Vehicle; canEdit: boolean }) {
  const todayIso = isoDateMelbourne(new Date());
  const today = new Date(`${todayIso}T00:00:00Z`);
  const loan = van.loan ?? null;
  const st = loanState(loan, { purchasePrice: van.purchasePrice, monthlyRepayment: (van.typedRepayment !== undefined ? van.typedRepayment : van.monthlyRepayment) }, todayIso);
  const fin = vehicleFinance(van);
  const fuel = fuelPerYear(van);
  const tools = await listTools(van.id).catch(() => null);
  const gear = (tools ?? []).map((t) => ({ t, st: gearSt(t, today), s: toolState(t, today) }))
    .sort((a, b) => ({ bad: 0, mid: 1, none: 2, good: 3 }[a.st.k] - { bad: 0, mid: 1, none: 2, good: 3 }[b.st.k]));
  const replace = gear.filter((g) => g.st.k === "bad" || g.st.w.startsWith("Replace"));

  const owing = st ? st.owingNow : van.amountOwing;
  const left = st ? st.rows.length - st.paidCount : null;

  return (
    <div className="pk" style={{ marginTop: 18 }}>
      {st ? (
        <Say>
          {van.name} cost <b>{van.purchasePrice != null ? m$(van.purchasePrice) : "—"}</b>
          {loan?.deposit ? <>, {m$(loan.deposit)} of it down</> : null}. {st.paidCount} of {st.rows.length} repayments are made and <b>{m$(st.owingNow)} is still owing</b>
          {loan?.lender ? <> to {loan.lender}</> : null}, paid off by {monthYear(st.endsOn)}.
        </Say>
      ) : (
        <Say>{van.amountOwing ? <>{m$(van.amountOwing)} is owing on {van.name}, typed in by hand. Put the finance contract in below and it comes down by itself with each repayment.</> : <>No finance entered for {van.name}. If it&rsquo;s on a loan, put the contract in below.</>}</Say>
      )}

      <Grid cols={4}>
        <Tile label="What we paid" st={{ k: "none", w: "" }} fig={van.purchasePrice != null ? m$(van.purchasePrice) : "—"} frac={null}
          sub={[loan?.deposit ? `${m$(loan.deposit)} deposit` : null, st ? `${m$(st.financed)} borrowed` : null, van.purchasedOn ? `bought ${dayMonthYear(van.purchasedOn)}` : null].filter(Boolean).join(" · ") || "not entered"} />
        <Tile label="Still owing" st={owing == null ? none("Not entered") : owing <= 0 ? { k: "good", w: "Paid off" } : st ? { k: "none", w: `${Math.round((st.paidOff / st.financed) * 100)}% paid` } : none("Typed in")}
          fig={owing != null ? m$(owing) : "—"} frac={st ? st.paidOff / st.financed : null}
          sub={st ? `${m$(st.paidOff)} paid off · ${m$(st.interestPaid)} interest so far` : "add the contract to track it"} />
        <Tile label="A month" st={{ k: "none", w: "" }} fig={st ? m2(st.repayment) : van.monthlyRepayment ? m2(van.monthlyRepayment) : "—"} frac={null}
          sub={[loan?.lender, loan?.ratePct != null ? `${loan.ratePct}% a year` : null, st?.repaymentWorkedOut ? "worked out from the rate" : null].filter(Boolean).join(" · ") || "no repayment set"} />
        <Tile label="Paid off" st={st ? (left === 0 ? { k: "good", w: "Done" } : { k: "none", w: `${left} to go` }) : none("No contract")}
          fig={st ? monthYear(st.endsOn) : "—"} frac={st ? st.paidCount / Math.max(1, st.rows.length) : null}
          sub={st ? `${m$(st.interestLeft)} interest still to pay${st.next ? ` · next ${dayMonthYear(st.next.date)}` : ""}` : "first repayment, rate and term"} />
      </Grid>

      {st && (
        <Card title="The loan, a repayment at a time" aside="solid = paid · dashed = to come · point at a month">
          <LoanChart financed={st.financed} points={st.rows.map((r) => ({
            label: monthYear(r.date).replace(" 20", " ’"), full: dayMonthYear(r.date), balance: r.balance, payment: r.payment, interest: r.interest, principal: r.principal, paid: r.paid,
          }))} />
          <div className="pk-tbl-wrap" style={{ marginTop: 12 }}>
            <table className="pk-tbl">
              <thead><tr><th>Repayment</th><th>Paid</th><th>Interest</th><th>Off the loan</th><th>Owing after</th><th /></tr></thead>
              <tbody>
                {st.rows.filter((r) => r.n > st.paidCount - 3 && r.n <= st.paidCount + 6).map((r) => (
                  <tr key={r.n}>
                    <td><b>{dayMonthYear(r.date)}</b> <span className="ks">#{r.n}</span></td>
                    <td>{m2(r.payment)}</td>
                    <td>{m2(r.interest)}</td>
                    <td>{m2(r.principal)}</td>
                    <td><b>{m$(r.balance)}</b></td>
                    <td><Pill st={r.paid ? { k: "good", w: "Paid" } : r.n === st.paidCount + 1 ? { k: "mid", w: "Next" } : none("To come")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="pt-oh__more" style={{ marginTop: 10 }}>
            <summary>Every repayment ({st.rows.length})</summary>
            <div className="pk-tbl-wrap">
              <table className="pk-tbl">
                <thead><tr><th>Repayment</th><th>Paid</th><th>Interest</th><th>Off the loan</th><th>Owing after</th></tr></thead>
                <tbody>{st.rows.map((r) => (
                  <tr key={r.n} style={r.paid ? undefined : { color: "var(--ink2)" }}>
                    <td>{dayMonthYear(r.date)} <span className="ks">#{r.n}{r.paid ? " ✓" : ""}</span></td><td>{m2(r.payment)}</td><td>{m2(r.interest)}</td><td>{m2(r.principal)}</td><td>{m$(r.balance)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
          <Note>Worked from the contract: each repayment pays the month&rsquo;s interest first and the rest comes off what&rsquo;s owing. If the lender&rsquo;s statement says something different, the contract figures above are the place to fix it.</Note>
        </Card>
      )}

      <Two>
        <Card title="What it costs to run" aside="a year">
          <Kv t="Repayments" sub={loan?.lender ? `to ${loan.lender}` : undefined} v={st ? m$(st.repayment * 12) : van.monthlyRepayment ? m$(van.monthlyRepayment * 12) : "—"} />
          <Kv t="Value lost" sub={van.lifespanYears ? `over ${van.lifespanYears} years, down to ${m$(van.resaleValue ?? 0)}` : "set its service life"} v={fin.annualDep != null ? m$(fin.annualDep) : "—"} />
          <Kv t="Servicing" sub={van.serviceIntervalKm && van.serviceCost ? `${m$(van.serviceCost)} every ${van.serviceIntervalKm.toLocaleString("en-AU")} km` : "set on the van’s details"} v={fin.servicePerYear != null ? m$(fin.servicePerYear) : "—"} />
          <Kv t="Fuel" sub={van.fuelPer100 ? `${van.fuelPer100} L/100 km` : "set its fuel use"} v={fuel != null ? m$(fuel) : "—"} />
        </Card>
        <Card title="What it’s worth" aside="straight-lined over its life">
          <Kv t="Worth today" v={fin.worthNow != null ? m$(fin.worthNow) : "—"} />
          <Kv t="Ours of it" sub="worth less what’s still owing" v={fin.equityNow != null ? <span style={{ color: fin.underwater ? "var(--bad)" : undefined, fontWeight: 700 }}>{fin.underwater ? "▼ " : ""}{m$(fin.equityNow)}</span> : "—"} />
          <Kv t="Service life" sub={fin.sellBy ? `sell by ${fin.sellBy}` : undefined}
            v={fin.lifeLeft != null ? <Pill st={fin.pastLife ? { k: "bad", w: `${years(fin.lifeLeft)} over` } : fin.lifeLeft < 1 ? { k: "mid", w: `${years(fin.lifeLeft)} left` } : { k: "good", w: `${years(fin.lifeLeft)} left` }} /> : "—"} />
        </Card>
      </Two>

      <Card title="Gear on this van" aside={<Link href={`/portal/vehicles/${van.id}?tab=tools`}>Tools &amp; gear ›</Link>}>
        {tools == null ? <Empty>The tool register can&rsquo;t be read right now.</Empty> : gear.length === 0 ? <Empty>Nothing on the register for this van yet — add its gear on Tools &amp; gear.</Empty> : (
          <>
            {replace.length > 0 && <p className="pk-note" style={{ marginBottom: 8 }}><b>{replace.length} {replace.length === 1 ? "thing needs" : "things need"} replacing or fixing.</b> Life is from the day it was bought; &ldquo;soon&rdquo; is the last sixth of it.</p>}
            <Group>
              {gear.map(({ t, st: g, s }) => (
                <Row key={t.id} title={`${t.name}${t.model ? ` · ${t.model}` : ""}`}
                  sub={[t.boughtOn ? `bought ${dayMonthYear(t.boughtOn)}${s.age ? ` (${s.age})` : ""}` : "no buy date", t.lifeYears ? `${t.lifeYears}-year life` : null, t.nextDueOn ? `${t.nextDue || "next"} ${dayMonthYear(t.nextDueOn)}` : null].filter(Boolean).join(" · ")}
                  end={<Pill st={g} />} />
              ))}
            </Group>
          </>
        )}
      </Card>

      <LoanForm id={van.id} name={van.name} canEdit={canEdit} initial={{
        loan: loan ?? EMPTY_LOAN, purchasePrice: van.purchasePrice, purchasedOn: van.purchasedOn,
        // Only a repayment someone typed goes back in the box; one worked out
        // from the rate stays worked out until a contract figure replaces it.
        monthlyRepayment: (van.typedRepayment !== undefined ? van.typedRepayment : van.monthlyRepayment),
        lifespanYears: van.lifespanYears, resaleValue: van.resaleValue,
      }} />
    </div>
  );
}
