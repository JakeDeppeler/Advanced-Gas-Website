import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { Locked } from "@/components/portal/Locked";
import { OweBoard } from "@/components/portal/OweBoard";
import { getOwedBills } from "@/lib/portal/xero";
import { listPayables, listPriorities } from "@/lib/owe/store";
import { todayMelbourne } from "@/lib/todos/store";
import type { Owed } from "@/lib/owe/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "What we owe — Team portal" };

/**
 * What the business owes, from Xero's unpaid supplier bills plus anything
 * owed that Xero has no bill for, sorted into the order to pay it.
 */
export default async function OwePage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const [bills, mine, priorities] = await Promise.all([getOwedBills(), listPayables(), listPriorities()]);
  const owed: Owed[] = [
    ...(bills ?? []).map((b) => ({
      id: b.id, supplier: b.supplier,
      what: [b.number, b.reference && b.reference !== b.number ? b.reference : null].filter(Boolean).join(" · ") || null,
      due: b.due, amount: b.amountDue, source: "xero" as const,
    })),
    ...mine,
  ];

  return (
    <PortalShell user={user}>
      <FinanceHead title="What we owe" lede="Every bill still to pay, the order to pay it in, and when each one is due." />
      <OweBoard owed={owed} priorities={priorities} today={todayMelbourne()} xero={bills ? "ok" : "off"} />
    </PortalShell>
  );
}
