import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { Locked } from "@/components/portal/Locked";
import { NextWeekOrders } from "@/components/portal/NextWeekOrders";
import { money } from "@/lib/portal/format";
import {
  appointmentsSynced, listWeekOrders, loadAlreadyOrdered, loadOrderingSettings, loadSuppliers, loadWeekInputs,
  type PoWithLines,
} from "@/lib/ordering/db";
import { linesTotal, nextWeek, planWeek, thisWeek, weekLabel, type Problem, type Supplier } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Next week — Team portal" };

export default async function NextWeekPage({ searchParams }: { searchParams: { week?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  const which = searchParams?.week === "this" ? "this" : "next";
  const week = which === "this" ? thisWeek(new Date()) : nextWeek(new Date());

  // A failed read is not an empty week: dbReady carries the difference.
  let orders: PoWithLines[] = [];
  let suppliers: Supplier[] = [];
  let problems: Problem[] = [];
  let synced = true;
  let replyTo = "";
  let factoryInstructions = "";
  let dbReady = true;
  try {
    const [o, s, inputs, already, sy, settings] = await Promise.all([
      listWeekOrders(week), loadSuppliers(), loadWeekInputs(week), loadAlreadyOrdered(), appointmentsSynced(), loadOrderingSettings(),
    ]);
    orders = o;
    suppliers = s;
    synced = sy;
    replyTo = settings.replyTo;
    factoryInstructions = settings.factoryInstructions ?? "";
    // Worked out live rather than stored with the drafts, so fixing a quote
    // or assigning a crew clears its line here straight away.
    problems = planWeek({ week, ...inputs, suppliers: s, alreadyOrdered: already }).problems;
  } catch {
    dbReady = false;
  }

  const live = orders.filter((o) => o.status !== "cancelled");
  const toApprove = live.filter((o) => o.status === "draft");
  const goods = live.filter((o) => o.kind === "order");
  const value = goods.reduce((t, o) => t + linesTotal(o.lines), 0);

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/supply" label="Supply" />
      <div className="pt-head">
        <h1>{which === "this" ? "This week" : "Next week"}: orders and the electrician</h1>
        <p>
          {weekLabel(week)}. Drafted every Wednesday morning from the installs booked that week and their sold quotes. Nothing goes to a
          supplier or to Geoff until it&rsquo;s approved here; replies come back to {replyTo || "the office"}.
        </p>
        {dbReady && (
          <div className="pt-head__figs">
            <div className="pt-head__fig">
              <div className="pt-head__figlbl">To approve</div>
              <div className="pt-head__figval">{toApprove.length}</div>
            </div>
            <div className="pt-head__fig">
              <div className="pt-head__figlbl">Goods</div>
              <div className="pt-head__figval">{value ? money(value) : "—"}</div>
              <div className="pt-head__figsub">Ex GST, at pricebook cost</div>
            </div>
            <div className="pt-head__fig">
              <div className="pt-head__figlbl">Electrician</div>
              <div className="pt-head__figval">{live.filter((o) => o.kind === "work_order").length}</div>
              <div className="pt-head__figsub">Site visits</div>
            </div>
            {problems.length > 0 && (
              <div className="pt-head__fig">
                <div className="pt-head__figlbl">Can&rsquo;t order</div>
                <div className="pt-head__figval pt-head__figalt">{problems.length}</div>
                <div className="pt-head__figsub">Listed below</div>
              </div>
            )}
          </div>
        )}
      </div>

      <PortalTabs set="supply" />

      <div className="pt-nw__weeks" role="tablist" aria-label="Which week">
        <Link href="/portal/supply/next-week" className={which === "next" ? "is-on" : undefined} aria-current={which === "next" ? "page" : undefined}>Next week</Link>
        <Link href="/portal/supply/next-week?week=this" className={which === "this" ? "is-on" : undefined} aria-current={which === "this" ? "page" : undefined}>This week</Link>
      </div>

      <NextWeekOrders
        which={which}
        dbReady={dbReady}
        appointmentsSynced={synced}
        orders={orders}
        suppliers={suppliers}
        problems={problems}
        testTo={user.email}
        alwaysCc={replyTo}
        factoryInstructions={factoryInstructions}
      />
    </PortalShell>
  );
}
