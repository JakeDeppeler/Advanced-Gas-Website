import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Good, Head, Say } from "@/components/portal/kit/Kit";
import { NotifyTo } from "@/components/portal/AutoSwitch";
import { AutoLog, Item, ORDER_ACTS, ORDER_KINDS, WO_RULES, kindOf, type Auto } from "@/components/portal/automation/AutoParts";
import { NOTIFY_DEFAULT, loadAutoLog, loadSwitches, type AutoKey } from "@/lib/automation/log";
import { packStatuses } from "@/lib/installpack/facts";
import { LAYOUT } from "@/lib/installpack/build";
import { PackList } from "@/components/portal/automation/PackList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automation · Team portal" };

const act = (k: AutoKey) => ORDER_ACTS.find((a) => a.k === k) as Auto;

/**
 * To order › Automation: what ordering does by itself, each with its switch,
 * and every time it did something in the last fortnight. These lived on
 * Settings › Automatic, a page nobody doing the ordering opens; here they sit
 * beside the orders they act on. Each says what it does in a line, with how
 * it works folded under it: the full rules are for the day one surprises
 * someone, not for reading every visit.
 */
export default async function OrderingAutomationPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Ordering automation" forWhom="managers" />;
  const [sw, all, packs] = await Promise.all([loadSwitches(), loadAutoLog().catch(() => []), packStatuses(LAYOUT).catch(() => null)]);
  const log = all.filter((e) => ORDER_KINDS.has(e.kind) && Date.now() - Date.parse(e.at) < 14 * 86_400_000);
  const week = log.filter((e) => Date.now() - Date.parse(e.at) < 7 * 86_400_000);
  const done = week.filter((e) => e.ok).length;
  const failed = week.filter((e) => !e.ok).length;
  const count = (k: AutoKey) => week.filter((e) => e.kind === kindOf(k) && e.ok).length;
  const admin = can(user, "manage_users");
  const row = (k: AutoKey) => <Item key={k} a={act(k)} on={sw[k]} n={count(k)} admin={admin} />;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head
          title="Automation"
          sub="What ordering does by itself, and what it did"
          info={[
            ["Switches", "Only an admin can turn one off or on. Everyone else sees where each one stands."],
            ["Supplier orders", "Never sent by themselves. System and material orders spend money, so each waits on To order for someone to send it."],
          ]}
        />
        <Say>
          {done ? <>{done} {done === 1 ? "thing" : "things"} done in the last 7 days</> : <>Nothing done in the last 7 days</>}
          {failed ? <>, <Bad>{failed} couldn&rsquo;t be done</Bad>.</> : <>. <Good>Nothing failed.</Good></>}
        </Say>
      </div>

      <div className="nw-two nw-two--wide-side">
        <div className="au-groups">
          <section className="pk-card pk-pad au-list">
            <h2 className="rv-h2">Orders</h2>
            <div className="au-item">
              <div>
                <b>Draft the orders</b>
                <p>Every sync drafts orders from the latest bookings. Nothing goes to a supplier until someone sends it on To order.</p>
              </div>
              <span className="au-on">Always on</span>
            </div>
            {row("factoryMin")}
          </section>

          <section className="pk-card pk-pad au-list">
            <h2 className="rv-h2">Work orders</h2>
            {row("workOrderSend")}
            <div className={`au-rules${sw.workOrderSend ? "" : " off"}`} aria-label="When work orders go">
              {WO_RULES.map((r) => <Item key={r.k} a={r} on={sw[r.k]} n={0} admin={admin} />)}
            </div>
            {row("orderMoves")}
            <div className="au-item au-office">
              <div>
                <b>Tell me when it&rsquo;s emailed someone</b>
                <p>Who gets an email each time a work order or a moved day goes out. Several with commas.</p>
              </div>
              <NotifyTo value={sw.notifyTo ?? NOTIFY_DEFAULT} canEdit={admin} />
            </div>
          </section>

          <section className="pk-card pk-pad au-list">
            <h2 className="rv-h2">In ServiceTitan</h2>
            {row("orderTags")}
            {row("installPack")}
            {packs && <PackList packs={packs} />}
          </section>
        </div>

        <aside className="pk-card pk-pad au-side" aria-label="What it did">
          <div className="au-sideh">
            <h2 className="rv-h2">What it did</h2>
            <span>last 14 days</span>
          </div>
          <AutoLog log={log.slice(0, 80)} empty="Nothing in the last fortnight." />
        </aside>
      </div>
    </PortalShell>
  );
}

