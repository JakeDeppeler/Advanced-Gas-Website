import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { Bad, Card, Head, Note, Say, Tabs } from "@/components/portal/kit/Kit";
import { KitPrint } from "@/components/portal/KitPrint";
import { KIT_LISTS, lastCounts, type KitList } from "@/lib/portal/fleet/kitLists";
import { itemKey } from "@/lib/portal/vanChecks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kit lists · Team portal" };

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });
const unitOf = (u: string) => (u === "ea" ? "each" : u);

const BLURB: Record<KitList, string> = {
  starter: "The minimum every tradesman and apprentice carries in their bag. Give a new starter this list on day one, and check it back in at the end of each job.",
  van: "What lives in every van: the tools, the servicing gear, fixings, what goes in the cannons, and drill bits. The same list in every van.",
  stock: "The minimum every van keeps on the shelf. Counted every Monday; anything at or under the minimum gets ordered that day, order at the minimum, not when it runs out.",
};

/**
 * Crew & vans › Kit lists. Three lists, each beside what the vans last counted
 * against it, so "what should be there" and "what is there" are one look.
 *
 * Stock is short at or under its minimum (that's the reorder point the Monday
 * count uses); a tool is short below the number the van should have.
 */
export default async function KitLists({ searchParams }: { searchParams: { list?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "vehicles")) return <Locked user={user} what="Kit lists" forWhom="whoever looks after the vans" />;

  const def = KIT_LISTS.find((l) => l.k === searchParams.list) ?? KIT_LISTS[0];
  const vans = await lastCounts(def.k);
  const counted = vans.filter((v) => v.checkedOn);
  const isStock = def.k === "stock";
  const short = (qty: number | null, min: number) => qty != null && (isStock ? qty <= min : qty < min);
  const lines = def.lists.reduce((n, g) => n + g.items.length, 0);
  const shortBy = counted.map((v) => ({
    van: v.van,
    n: def.lists.reduce((n, g) => n + g.items.filter((it) => short(v.qty[itemKey(g.group, it.item)], it.min)).length, 0),
  }));
  const shortVans = shortBy.filter((s) => s.n > 0);
  const what = isStock ? "at or under minimum" : "short";

  return (
    <PortalShell user={user}>
      <div className="pk pt-kit">
        <Head title="Kit lists" eyebrow="What a new starter carries, what every van carries, and the stock every van keeps" info={[
          ["Where the lists come from", "Advanced Gas's own van sheets, the same lists the Monday checks count against, so a change to one is a change to both."],
          ["Last count", "Each van's most recent sheet of this kind. A dash is a line nobody counted on it; “Not counted yet” means the van has never done one."],
          ["Tool register", <>Test-and-tag and calibration dates for each tool are on <Link href="/portal/vehicles/tools">Tools</Link>.</>],
        ]} />
        <div className="pt-kit__bar">
          <Tabs on={def.k} label="Which list" items={KIT_LISTS.map((l) => ({ key: l.k, label: l.label, href: `/portal/vehicles/kit?list=${l.k}` }))} />
          <KitPrint />
        </div>
        <p className="pt-kit__blurb">{BLURB[def.k]}</p>
        <Say>
          {lines} {lines === 1 ? "line" : "lines"}{def.lists.length > 1 ? ` in ${def.lists.length} groups` : ""}.{" "}
          {vans.length === 0 ? "No vans to compare against yet."
            : counted.length === 0 ? "No van has counted this list yet."
            : shortVans.length === 0 ? <>Every van that&rsquo;s counted it has the lot.</>
            : <><Bad>{shortVans.map((s) => `${s.van}: ${s.n} ${what}`).join(" · ")}</Bad>.</>}
          {counted.length > 0 && counted.length < vans.length ? ` ${vans.length - counted.length} ${vans.length - counted.length === 1 ? "van hasn't" : "vans haven't"} counted it yet.` : ""}
        </Say>

        {def.lists.map((g) => (
          <Card key={g.group} title={g.group} aside={`${g.items.length} ${g.items.length === 1 ? "line" : "lines"}`}>
            <div className="pk-tbl-wrap">
              {/* Fixed widths, the same in every group, so each column runs straight down the page. */}
              <table className="pk-tbl pt-kit__tbl">
                <colgroup>
                  <col className="pt-kit__c-item" />
                  <col className="pt-kit__c-min" />
                  {vans.map((v) => <col key={v.vanId} />)}
                  <col className="pt-kit__c-tick" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Minimum</th>
                    {vans.map((v) => (
                      <th key={v.vanId} className="pt-kit__van">
                        {v.van}
                        <span>{v.checkedOn ? day(v.checkedOn) : "Not counted yet"}</span>
                      </th>
                    ))}
                    <th className="pt-kit__tick" aria-label="Tick when checked" />
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((it) => {
                    const k = itemKey(g.group, it.item);
                    return (
                      <tr key={k}>
                        <td>{it.item}</td>
                        <td>{it.min} <span className="ks">{unitOf(it.unit)}</span></td>
                        {vans.map((v) => {
                          const qty = v.checkedOn ? v.qty[k] : null;
                          const s = short(qty, it.min);
                          return (
                            <td key={v.vanId} className={`pt-kit__van${s ? " pt-kit__short" : ""}`}>
                              {qty == null ? <span className="ks"></span> : <>{qty}{s ? <b> {isStock ? "low" : "short"}</b> : null}</>}
                            </td>
                          );
                        })}
                        <td className="pt-kit__tick"><span aria-hidden="true" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
        <Note>
          {def.k === "starter" ? <>What lives in the van rather than the bag is on <Link href="/portal/vehicles/kit?list=van">Tools for vans</Link>. </> : null}
          Printing gives a sheet with a tick column, for a new starter&rsquo;s first day or the shed wall.
        </Note>
      </div>
    </PortalShell>
  );
}
