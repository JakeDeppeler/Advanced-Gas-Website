import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { getSettings } from "@/lib/portal/db";
import { latestBoard } from "@/lib/portal/office";
import { bonusFor, normaliseCommission } from "@/lib/portal/commissionTypes";
import { money } from "@/lib/portal/run/month";
import { Card, Empty, Head, Pill, Say } from "@/components/portal/kit/Kit";
import { NumbersForm } from "@/components/portal/numbers/NumbersForm";
import { saveCommission } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commission · Team portal" };

/**
 * Pricing & costs › Commission: the month target and the bonus, and where each
 * person is against it this month. Commission dollars are pay, so the page is
 * the office's and the setting an admin's.
 */
export default async function CommissionPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  // Commission dollars are pay: admins only, as the brief has it.
  if (!can(user, "manage_users")) return <Locked user={user} what="Commission" forWhom="admins" />;
  const [raw, board] = await Promise.all([getSettings<unknown>("commission").catch(() => null), latestBoard()]);
  const c = normaliseCommission(raw);
  const people = (board?.metrics?.salesLeaderboard ?? []).filter((p) => p.sold > 0 || p.quoted > 0);
  const hit = people.filter((p) => p.sold >= c.monthTarget);
  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Commission" sub="The numbers the whole portal is built on · change one here and every page updates" info={[
          ["The rule", `Sell ${money(c.monthTarget)} in a month and the bonus is ${c.ratePct}% of everything sold that month, not just the part over.`],
          ["Credit", "Goes to whoever wrote the quote. A re-sold quote counts once, on the day it first sold."],
          ["The wall board", "Still shows its own bonus bands until they’re switched over to this rule."],
        ]} />
        <Say>{hit.length ? <><b>{hit.map((p) => p.name.split(" ")[0]).join(" and ")} {hit.length > 1 ? "have" : "has"} hit</b> the {money(c.monthTarget)} month target.</> : <>Nobody has hit the {money(c.monthTarget)} month target yet.</>} Hit it and the bonus is {c.ratePct}% of everything sold that month.</Say>
        <NumbersForm title="Commission" aside="one rule for everyone on the tools" save={saveCommission} canSave={can(user, "manage_users")} rows={[
          { key: "monthTarget", label: "Month target each", sub: "sold in the month before any bonus", unit: "$ sold", value: c.monthTarget },
          { key: "ratePct", label: "Bonus", sub: "of everything sold that month, once the target is hit", unit: "% of the month", value: c.ratePct },
        ]} />
        <Card title="Each person this month" aside={`${c.ratePct}% of the month once they pass ${money(c.monthTarget)}`}>
          {people.length ? people.map((p) => {
            const b = bonusFor(p.sold, c);
            return (
              <div className="pk-kv" key={p.name}>
                <span className="t"><b>{p.name}</b><span>{money(p.sold)} of {money(c.monthTarget)}</span>
                  <span className={`pk-bar ${b.hit ? "good" : "mid"}`} style={{ display: "block", margin: "6px 0 0", maxWidth: 420 }}><i style={{ width: `${Math.max(2, Math.min(100, (p.sold / c.monthTarget) * 100))}%` }} /></span>
                </span>
                <Pill st={b.hit ? { k: "good", w: "Hit" } : { k: "mid", w: `${money(b.toGo)} to go` }} />
                <span className="v">{b.hit ? money(b.bonus) : ""}</span>
              </div>
            );
          }) : <Empty>No sales this month yet.</Empty>}
          <p className="pk-note" style={{ marginTop: 10 }}>Bonuses are worked out from this month’s sales so far. Saving each month’s result to the person’s file comes with Crew &amp; vans.</p>
        </Card>
      </div>
    </PortalShell>
  );
}
