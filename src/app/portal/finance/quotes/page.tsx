import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listQuotes, getSettings, dbConfigured } from "@/lib/portal/db";
import { DEFAULT_TARGETS, type Targets } from "@/lib/portal/targets";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PortalBack } from "@/components/portal/PortalBack";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { QuotesBoard, type QuoteView } from "@/components/portal/QuotesBoard";
import { PortalTabs } from "@/components/portal/PortalTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes & win rate — Team portal" };

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function QuotesPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  // The business has one revenue target and one average job, and they live in
  // the Targets record. This tab used to keep its own pair in localStorage.
  const [raw, targets] = await Promise.all([
    ready ? listQuotes() : Promise.resolve([]),
    ready ? getSettings<Targets>("targets") : Promise.resolve(null),
  ]);
  const quotes: QuoteView[] = raw.map((q) => ({ id: q.id, amount: q.amount, status: q.status, customer: q.customer, when: when(q.quotedOn) }));

  return (
    <PortalShell user={user}>
      <FinanceHead title="Quotes & win rate" lede="What you quote, what you win, your real win rate, and how much to quote to hit a target." />
      <PlanningTabs current="/portal/finance/quotes" />
      <QuotesBoard
        quotes={quotes}
        dbReady={ready}
        revenueTarget={targets?.revenue ?? DEFAULT_TARGETS.revenue}
        avgJob={targets?.avgJob ?? DEFAULT_TARGETS.avgJob}
      />
    </PortalShell>
  );
}
