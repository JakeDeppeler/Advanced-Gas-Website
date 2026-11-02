import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Head } from "@/components/portal/kit/Kit";
import { Icon } from "@/components/portal/shell/Menu";
import { NotifyTo } from "@/components/portal/AutoSwitch";
import { AutoGroup, AutoLog, AutoRow, DRAFT, NeedsLook, ORDER_ACTS, ORDER_KINDS, RuleSwitch, SetRow, WO_RULES, kindOf, needsLook, type Auto } from "@/components/portal/automation/AutoParts";
import { NOTIFY_DEFAULT, loadAutoLog, loadSorted, loadSwitches, type AutoKey } from "@/lib/automation/log";
import { packStatuses } from "@/lib/installpack/facts";
import { LAYOUT } from "@/lib/installpack/build";
import { PackList } from "@/components/portal/automation/PackList";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automation · Team portal" };

const act = (k: AutoKey) => ORDER_ACTS.find((a) => a.k === k) as Auto;

/**
 * To order › Automation: what ordering does by itself. What went wrong and
 * hasn't been put right is first; then each automation is a row with its
 * switch, its settings and last few runs folded under it; then everything
 * it did. These lived on Settings › Automatic, a page nobody doing the
 * ordering opens; here they sit beside the orders they act on.
 */
export default async function OrderingAutomationPage({ searchParams }: { searchParams: { log?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Ordering automation" forWhom="managers" />;
  const [sw, all, sorted, packs] = await Promise.all([loadSwitches(), loadAutoLog().catch(() => []), loadSorted(), packStatuses(LAYOUT).catch(() => null)]);
  const log = all.filter((e) => ORDER_KINDS.has(e.kind) && Date.now() - Date.parse(e.at) < 14 * 86_400_000);
  const looks = needsLook(log, sorted);
  const admin = can(user, "manage_users");
  const mine = (a: Auto) => log.filter((e) => e.kind === kindOf(a.k));
  const row = (k: AutoKey, more: { settings?: ReactNode; below?: ReactNode } = {}) => {
    const a = act(k);
    return <AutoRow key={k} a={a} on={sw[k]} mine={mine(a)} looks={looks.filter((l) => l.kind === kindOf(k)).length} admin={admin} {...more} />;
  };
  // Drafting can't be turned off, so it's always one of the "on".
  const keys: AutoKey[] = ["factoryMin", "workOrderSend", "orderMoves", "orderTags", "installPack"];
  const on = 1 + keys.filter((k) => sw[k]).length;
  const shown = searchParams.log && ORDER_KINDS.has(searchParams.log) ? searchParams.log : null;
  const shownTitle = shown ? ORDER_ACTS.find((a) => kindOf(a.k) === shown)?.title : null;

  return (
    <PortalShell user={user}>
      <div className="ar-page">
        <div className="pk">
          <Head
            title="Automation"
            sub={<>What ordering does by itself: {on} on, {keys.length + 1 - on} off{looks.length ? <>, <Bad>{looks.length} {looks.length === 1 ? "needs" : "need"} a look</Bad></> : null}.</>}
            action={<span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="pk-btn g ar-donebtn" href="/portal/supply/emails"><Icon name="send" size={14} />What the emails say</a>
              <a className="pk-btn g ar-donebtn" href="#done"><Icon name="clock" size={14} />What it&rsquo;s done</a>
            </span>}
          />
        </div>

        <NeedsLook looks={looks} />

        <section className="pk-card ar-card" aria-label="Ordering's automations">
          <AutoGroup title="Orders" on={1 + (sw.factoryMin ? 1 : 0)} of={2}>
            <AutoRow a={DRAFT} on mine={[]} looks={0} admin={admin} always />
            {row("factoryMin")}
          </AutoGroup>
          <AutoGroup title="Work orders" on={(sw.workOrderSend ? 1 : 0) + (sw.orderMoves ? 1 : 0)} of={2}>
            {row("workOrderSend", {
              settings: (
                <>
                  {WO_RULES.map((r) => <RuleSwitch key={r.k} a={r} on={sw[r.k as AutoKey]} admin={admin} />)}
                  <SetRow title="Tell me when it’s emailed someone" line="Each time a work order or a moved day goes out. Several with commas.">
                    <NotifyTo value={sw.notifyTo ?? NOTIFY_DEFAULT} canEdit={admin} />
                  </SetRow>
                </>
              ),
            })}
            {row("orderMoves", { settings: <p className="ar-note">Tells the same people as sending work orders: {sw.notifyTo ?? NOTIFY_DEFAULT}.</p> })}
          </AutoGroup>
          <AutoGroup title="In ServiceTitan" on={(sw.orderTags ? 1 : 0) + (sw.installPack ? 1 : 0)} of={2}>
            {row("orderTags")}
            {row("installPack", { below: packs && <><h3>Upcoming installs</h3><PackList packs={packs} /></> })}
          </AutoGroup>
        </section>

        <section id="done" className="pk-card pk-pad" aria-labelledby="ar-done-h">
          <div className="au-sideh">
            <h2 className="rv-h2" id="ar-done-h">What it&rsquo;s done</h2>
            <span>{shownTitle ? <>{shownTitle} only · <a href="?#done">show all</a></> : "last 14 days"}</span>
          </div>
          <AutoLog log={(shown ? log.filter((e) => e.kind === shown) : log).slice(0, 120)} empty="Nothing in the last fortnight." />
        </section>
      </div>
    </PortalShell>
  );
}
