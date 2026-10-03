import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs, ago } from "@/components/portal/Figs";
import { Needs } from "@/components/portal/marketingParts";
import { latestBoard, monthName } from "@/lib/portal/office";
import { getOverdueInvoices, xeroStatus } from "@/lib/portal/xero";
import { money, pct } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Money in — Team portal" };

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });

/**
 * Invoiced, owing and overdue.
 *
 * One source per figure, the same split the wall board uses: ServiceTitan for
 * what was invoiced, Xero for what is still owed. ServiceTitan's own balances
 * aren't used — it shows $420K open against Xero's $59K, because payments are
 * reconciled in Xero and never written back.
 */
export default async function MoneyPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Money in" forWhom="managers" />;

  const [board, { status }, overdue] = await Promise.all([latestBoard(), xeroStatus(), getOverdueInvoices()]);
  const m = board?.metrics ?? null;
  const target = m?.revenueTargetMonthly ?? null;
  const xeroOff = status !== "connected";

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Money in</h1>
        <p>What&rsquo;s been invoiced in {monthName()}, what&rsquo;s still owed, and who&rsquo;s late — invoiced from ServiceTitan, owed from Xero.</p>
      </div>

      <Figs
        cols={3}
        items={[
          {
            label: `Invoiced in ${monthName()}`, feature: true,
            value: m ? money(m.revenueInvoicedMtd) : null,
            sub: m ? `${m.invoiceCountMonth} invoices${target ? ` · ${pct(m.revenueInvoicedMtd / target)} of the ${money(target)} target` : ""}` : undefined,
            bar: m && target ? m.revenueInvoicedMtd / target : null,
            needs: "Waiting on the board's first snapshot",
          },
          {
            label: "Owing", value: m?.receivablesTotal != null ? money(m.receivablesTotal) : null,
            sub: board ? `every open invoice in Xero, as of ${ago(board.computedAt)}` : undefined,
            needs: "Needs Xero connected",
          },
          {
            label: "Overdue", value: m?.overdueTotal != null ? money(m.overdueTotal) : null,
            sub: m?.overdueCount != null ? `${m.overdueCount} ${m.overdueCount === 1 ? "invoice" : "invoices"} past their due date` : undefined,
            needs: "Needs Xero connected",
          },
        ]}
      />

      <section className="pt-panel">
        <h2 className="pt-panel__h">Overdue, most overdue first</h2>
        {xeroOff ? (
          <p className="pt-rep__empty">Xero isn&rsquo;t connected. Connect it on the Finance page and the overdue list comes from there.</p>
        ) : overdue == null ? (
          <p className="pt-rep__empty">Xero didn&rsquo;t answer just now. This isn&rsquo;t the same as nothing being overdue — try again in a minute.</p>
        ) : overdue.length === 0 ? (
          <p className="pt-rep__empty">Nothing is past its due date.</p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Was due</th><th className="pt-otab__num">Days over</th><th className="pt-otab__num">Owing</th></tr></thead>
              <tbody>
                {overdue.slice(0, 60).map((i) => (
                  <tr key={`${i.number}-${i.due}`}>
                    <td><strong>{i.number || "—"}</strong></td>
                    <td>{i.contact || "—"}</td>
                    <td>{day(i.due)}</td>
                    <td className="pt-otab__num">{i.daysOver}</td>
                    <td className="pt-otab__num"><strong>{money(i.amountDue)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="pt-two">
        <Needs
          title="Payment plans"
          body="Plans approved and paid out by the finance provider, and the ones still waiting. There's no connection to the provider yet, so nothing here is counted."
          bullets={["The finance provider's API or a monthly export", "Or a log kept here: customer, amount, approved, paid out"]}
        />
        <Needs
          title="VEU rebates to come"
          body="Claims lodged and not yet paid, and the ones still to lodge. Nothing records VEU claims yet, so nothing here is counted."
          bullets={["A claim log kept here: job, certificate count, value, lodged, paid", "Or an export from the accredited provider's portal"]}
        />
      </div>
    </PortalShell>
  );
}
