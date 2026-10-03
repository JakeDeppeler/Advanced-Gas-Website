import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs, ago, type Fig } from "@/components/portal/Figs";
import { YearFigs } from "@/components/portal/YearFigs";
import { latestBoard, leadsThisMonth, monthName, savedGoal, xeroProfit, yearEndLabel } from "@/lib/portal/office";
import { money, pct } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "The numbers — Team portal" };

/**
 * Leads to paid, step by step, for the month so far.
 *
 * Each step is its own count over the same month, not a cohort followed
 * through: a job sold this week was usually quoted last month. So there are
 * no percentages between the steps — "33% of leads sold" would divide one
 * month's sales by another month's enquiries. The one rate shown is the close
 * rate, which the board works out per job over the jobs quoted in 30 days.
 *
 * "First reply to a new lead" is in the design and left out: nothing records
 * when a lead was first contacted, so it would read "—" forever.
 */
export default async function NumbersPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="The numbers" forWhom="managers" />;

  const [board, leads, goal, profit] = await Promise.all([latestBoard(), leadsThisMonth(), savedGoal(), xeroProfit()]);
  const m = board?.metrics ?? null;

  const steps: Array<{ k: string; n: string | null; sub: string; href?: string }> = [
    { k: "Enquiries", n: leads ? leads.total.toLocaleString("en-AU") : null, sub: leads ? `${leads.web} website · ${leads.st} ServiceTitan` : "can't read the leads", href: "/portal/leads" },
    { k: "Jobs booked", n: m ? m.bookingsMonth.toLocaleString("en-AU") : null, sub: "created in ServiceTitan", href: "/portal/customers" },
    { k: "Quoted", n: m ? m.quotesCreatedMonthCount.toLocaleString("en-AU") : null, sub: m?.avgQuoteMonth ? `jobs · options average ${money(m.avgQuoteMonth)}` : "jobs priced", href: "/portal/quotes" },
    { k: "Sold", n: m ? m.soldCountMonth.toLocaleString("en-AU") : null, sub: m ? money(m.soldMtd) : "", href: "/portal/quotes" },
    { k: "Invoiced", n: m ? m.invoiceCountMonth.toLocaleString("en-AU") : null, sub: m ? money(m.revenueInvoicedMtd) : "", href: "/portal/money" },
  ];

  const monthMargin = profit.month && profit.month.income > 0 ? profit.month.netProfit / profit.month.income : null;
  const figs: Fig[] = [
    {
      label: "Average invoice", href: "/portal/money",
      value: m?.avgInvoiceValue != null ? money(m.avgInvoiceValue) : null,
      sub: m ? `${m.invoiceCountMonth} invoices, ${money(m.revenueInvoicedMtd)}` : undefined,
      needs: "No invoices yet this month",
    },
    {
      label: "Close rate", href: "/portal/quotes",
      value: m?.closeRate30d != null ? pct(m.closeRate30d) : null,
      sub: m ? `${m.closeRate30dSold} of ${m.closeRate30dQuotes} jobs quoted in the last 30 days` : undefined,
      needs: "Nothing quoted in 30 days",
    },
    {
      label: "Profit this month", href: "/portal/finance",
      value: profit.month ? money(profit.month.netProfit) : null,
      sub: monthMargin != null ? `${pct(monthMargin)} of what Xero has as income${goal?.profitPct ? ` · goal ${goal.profitPct}%` : ""}` : undefined,
      needs: "Needs Xero connected",
    },
  ];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>The numbers</h1>
        <p>
          Leads to paid, all in one place — {monthName()} so far{board ? `, as of ${ago(board.computedAt)}` : ""}. Each
          step is counted on its own over the month, so they aren&rsquo;t divided into each other.
        </p>
      </div>

      <ol className="pt-funnel">
        {steps.map((s) => (
          <li key={s.k}>
            <Link href={s.href ?? "#"} className="pt-funnel__step">
              <span className="pt-funnel__k">{s.k}</span>
              <strong className="pt-funnel__n">{s.n ?? "—"}</strong>
              <span className="pt-funnel__sub">{s.sub}</span>
            </Link>
          </li>
        ))}
      </ol>

      <Figs items={figs} cols={3} />

      <h2 className="pt-sech">This year</h2>
      <YearFigs m={m} goal={goal} profit={profit.year} endLabel={yearEndLabel(goal)} />
    </PortalShell>
  );
}
