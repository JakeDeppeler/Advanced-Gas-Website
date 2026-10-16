import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getSettings, listQuotes, dbConfigured } from "@/lib/portal/db";
import { getCostSettings } from "@/lib/portal/costSettings";
import { theHour } from "@/lib/portal/cover/load";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PortalBack } from "@/components/portal/PortalBack";
import { RevenuePlanner } from "@/components/portal/RevenuePlanner";
import type { Targets, Capacity } from "@/lib/portal/targets";
import { xeroStatus, getProfitAndLoss, localToday } from "@/lib/portal/xero";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { XeroLine } from "@/components/portal/XeroLine";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Targets — Team portal" };

export default async function TargetsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  const ready = dbConfigured();
  const [targets, goalRow] = ready
    ? await Promise.all([getSettings<Targets>("targets"), getSettings<{ revenue?: number }>("yeargoal").catch(() => null)])
    : [null, null];
  const goalRevenue = typeof goalRow?.revenue === "number" && goalRow.revenue > 0 ? goalRow.revenue : null;

  // The crew's capacity, so the target can be measured against the week rather
  // than only divided up into it.
  let capacity: Capacity | null = null;
  if (ready) {
    // The same hour every pricing page quotes: billed hours on 6 of 8, priced to our margin.
    const h = await theHour();
    capacity = {
      billHrs: h.r.billHrs,
      chargePerHr: h.r.atMargin,
      weeksYear: h.s.weeksYear,
      vans: h.vans,
    };
  }

  // What has actually happened: the quote book for the win rate and the average
  // won job, and the last twelve weeks of it for the quoting pace.
  let actual = { winRate: null as number | null, avgJob: null as number | null, won: 0, quotesPerWeek: null as number | null };
  if (ready) {
    const quotes = await listQuotes();
    const won = quotes.filter((q) => q.status === "won");
    const won$ = won.reduce((a, q) => a + q.amount, 0);
    const decided$ = won$ + quotes.filter((q) => q.status === "lost").reduce((a, q) => a + q.amount, 0);
    const cutoff = Date.now() - 84 * 86_400_000;
    const recent = quotes.filter((q) => new Date(q.quotedOn).getTime() >= cutoff);
    actual = {
      winRate: decided$ > 0 ? Math.round((won$ / decided$) * 100) : null,
      avgJob: won.length > 0 ? Math.round(won$ / won.length) : null,
      won: won.length,
      quotesPerWeek: recent.length > 0 ? recent.length / 12 : null,
    };
  }

  // Revenue banked so far this calendar year, from the filed accounts.
  const { status, tenantName } = await xeroStatus();
  const t = localToday();
  const ytd = status === "connected"
    ? (await getProfitAndLoss(
        new Date(Date.UTC(t.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10),
        t.toISOString().slice(0, 10),
      ))?.income ?? null
    : null;

  return (
    <PortalShell user={user}>
      <FinanceHead title="Targets" lede="Set the year’s revenue and everything works backwards from it: the work, the hours, and the quoting it takes." xero={{ state: status, org: tenantName }} />
      <RevenuePlanner initial={targets} cap={capacity} actual={actual} ytd={ytd} canSave={ready} goalRevenue={goalRevenue} />
    </PortalShell>
  );
}
