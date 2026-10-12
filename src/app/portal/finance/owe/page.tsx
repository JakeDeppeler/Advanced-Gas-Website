import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { OweBoard } from "@/components/portal/OweBoard";
import { getOwedBills } from "@/lib/portal/xero";
import { listPayables, listPriorities } from "@/lib/owe/store";
import { todayMelbourne } from "@/lib/todos/store";
import { cashCover } from "@/lib/portal/run/money";
import { money, plural } from "@/lib/portal/run/month";
import { Bad, Head, Hero, Pair, Say } from "@/components/portal/kit/Kit";
import type { Owed } from "@/lib/owe/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "We owe — Team portal" };

const daysTo = (iso: string, today: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);

/**
 * Profit & finance › We owe: Xero's unpaid supplier bills plus anything owed
 * that Xero has no bill for, against what's in the bank, sorted into the order
 * to pay it.
 */
export default async function OwePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="We owe" forWhom="managers" />;

  const [bills, mine, priorities, cover] = await Promise.all([getOwedBills(), listPayables(), listPriorities(), cashCover()]);
  const owed: Owed[] = [
    ...(bills ?? []).map((b) => ({
      id: b.id, supplier: b.supplier,
      what: [b.number, b.reference && b.reference !== b.number ? b.reference : null].filter(Boolean).join(" · ") || null,
      due: b.due, amount: b.amountDue, source: "xero" as const,
    })),
    ...mine,
  ];
  const today = todayMelbourne();
  // Due this week includes anything already late: it's money that has to go out now.
  const week = owed.filter((o) => o.due && daysTo(o.due, today) <= 7);
  const wk = week.reduce((a, o) => a + o.amount, 0), tot = owed.reduce((a, o) => a + o.amount, 0);
  const bank = cover.bank;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="We owe" sub="Bills from Xero, and anything added here" info={[
          ["Due in the next 7 days", "Every bill due this week, and any already past its date."],
          ["Pay in this order", "Suppliers we can’t trade without first, then by due date. Set who matters most below."],
          ["Added here", "Something owed that Xero has no bill for yet — a tax payment, a private loan."],
        ]} />
        <Say>
          <b>{money(wk)}</b> of bills {week.length === 1 ? "is" : "are"} due in the next 7 days.{" "}
          {bank == null ? "Xero didn’t return the bank." : wk > bank ? <><Bad>That’s {money(wk - bank)} more than the bank</Bad>, so chase the overdue invoices first.</> : "The bank covers it."}
        </Say>
        <Pair>
          <Hero dark label="Due in the next 7 days" right={plural(week.length, "bill")} fig={money(wk)} frac={bank != null && wk > 0 ? Math.min(1, bank / wk) : null}
            sub={bank != null ? `${money(bank)} in the bank` : "no bank figure from Xero"} />
          <Hero label="All bills owed" right={plural(owed.length, "bill")} fig={money(tot)} frac={tot ? wk / tot : null} sub={`${money(tot - wk)} due later`} />
        </Pair>
        <OweBoard owed={owed} priorities={priorities} today={today} xero={bills ? "ok" : "off"} tiles={false} />
      </div>
    </PortalShell>
  );
}
