import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Tabs } from "@/components/portal/kit/Kit";
import { Locked } from "@/components/portal/Locked";
import { NextWeekOrders } from "@/components/portal/NextWeekOrders";
import { money } from "@/lib/portal/format";
import {
  appointmentsSynced, listWeekOrders, loadAlreadyOrdered, loadHolds, loadOrderingSettings, loadSuppliers, loadWeekInputs, type Hold,
  type PoWithLines,
} from "@/lib/ordering/db";
import { linesTotal, nextWeek, planWeek, thisWeek, weekLabel, type Problem, type Supplier, lineKey } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
// "Order all" sends one email after another (Mitsubishi with its form) from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "Next week — Team portal" };

export default async function NextWeekPage({ searchParams }: { searchParams: { week?: string; tab?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  const which = searchParams?.week === "this" ? "this" : "next";
  const view = searchParams?.tab === "sent" ? "sent" : "todo";
  const href = (v: "todo" | "sent", w: "next" | "this") => {
    const q = [v === "sent" ? "tab=sent" : null, w === "this" ? "week=this" : null].filter(Boolean).join("&");
    return `/portal/supply/next-week${q ? `?${q}` : ""}`;
  };
  const week = which === "this" ? thisWeek(new Date()) : nextWeek(new Date());

  // A failed read is not an empty week: dbReady carries the difference.
  let orders: PoWithLines[] = [];
  let holds: Hold[] = [];
  let suppliers: Supplier[] = [];
  let problems: Problem[] = [];
  let synced = true;
  let replyTo = "";
  let delivery: { factoryInstructions?: string; deliveryNote?: string; pickupInstructions?: string } = {};
  let dbReady = true;
  try {
    const [o, s, inputs, already, sy, settings, h] = await Promise.all([
      listWeekOrders(week), loadSuppliers(), loadWeekInputs(week), loadAlreadyOrdered(), appointmentsSynced(), loadOrderingSettings(), loadHolds(),
    ]);
    orders = o;
    holds = h;
    suppliers = s;
    synced = sy;
    replyTo = settings.replyTo;
    delivery = { factoryInstructions: settings.factoryInstructions, deliveryNote: settings.deliveryNote, pickupInstructions: settings.pickupInstructions };
    // Worked out live rather than stored with the drafts, so fixing a quote
    // or assigning a crew clears its line here straight away.
    problems = planWeek({ week, ...inputs, suppliers: s, alreadyOrdered: already, skip: new Set(h.map((x) => lineKey(x.job_id, x.sku_id))) }).problems;
  } catch {
    dbReady = false;
  }

  const live = orders.filter((o) => o.status !== "cancelled");
  const toApprove = live.filter((o) => o.status === "draft");
  const sent = live.filter((o) => o.status === "sent" || o.status === "approved");
  const goods = live.filter((o) => o.kind === "order");
  const value = goods.reduce((t, o) => t + linesTotal(o.lines), 0);

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <h1>{view === "sent" ? "Sent" : "To order"}: {which === "this" ? "this week" : "next week"}</h1>
        {view === "sent" ? (
          <p>{weekLabel(week)}. Everything approved and sent for the week, to the suppliers and the electrician. An order lands here by itself the moment it goes; replies come back to {replyTo || "the office"}.</p>
        ) : (
          <p>
          {weekLabel(week)}. Drafted from the installs booked and their sold quotes every weekday from 6am ({which === "this" ? "this week every day" : "next week from Wednesday"}), and again within about ten minutes of a new booking — so a job booked at short notice is on an order to approve the same day. Nothing goes to a
          supplier or to Geoff until it&rsquo;s approved here; replies come back to {replyTo || "the office"}.
          </p>
        )}
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

      {/* To order is what's still to approve; an order moves to Sent by itself
          once it's gone. The week stays put when you switch between them. */}
      <div className="pk-rev-bar" style={{ marginBottom: 14 }}>
        <Tabs on={view} label="To order or sent" items={[
          { key: "todo", label: "To order", href: href("todo", which), count: dbReady ? toApprove.length : undefined, red: toApprove.length > 0 },
          { key: "sent", label: "Sent", href: href("sent", which), count: dbReady ? sent.length : undefined },
        ]} />
        <div className="pt-nw__weeks" role="tablist" aria-label="Which week" style={{ margin: 0 }}>
          <Link href={href(view, "next")} className={which === "next" ? "is-on" : undefined} aria-current={which === "next" ? "page" : undefined}>Next week</Link>
          <Link href={href(view, "this")} className={which === "this" ? "is-on" : undefined} aria-current={which === "this" ? "page" : undefined}>This week</Link>
        </div>
      </div>

      <NextWeekOrders
        which={which}
        view={view}
        dbReady={dbReady}
        appointmentsSynced={synced}
        orders={orders}
        suppliers={suppliers}
        problems={problems}
        holds={holds}
        testTo={user.email}
        alwaysCc={replyTo}
        delivery={delivery}
      />
    </PortalShell>
  );
}
