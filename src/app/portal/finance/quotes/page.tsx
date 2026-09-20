import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listQuotes, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PlanningTabs } from "@/components/portal/PlanningTabs";
import { QuotesBoard, type QuoteView } from "@/components/portal/QuotesBoard";

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
  const raw = ready ? await listQuotes() : [];
  const quotes: QuoteView[] = raw.map((q) => ({ id: q.id, amount: q.amount, status: q.status, customer: q.customer, when: when(q.quotedOn) }));

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Future planning</div>
        <h1>Quotes &amp; win rate.</h1>
        <p>Track what you quote and what you win, see your real win rate, and work out how much to quote to hit a target. This sits under <strong>Future planning</strong> because that is what it is: work that has not happened yet, and the odds on it happening.</p>
      </div>
      <PlanningTabs current="/portal/finance/quotes" />
      <QuotesBoard quotes={quotes} dbReady={ready} />
    </PortalShell>
  );
}
