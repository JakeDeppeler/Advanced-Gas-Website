import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { listVehicles } from "@/lib/portal/db";
import { allTools } from "@/lib/portal/van";
import { TOOL_KINDS, TOOL_REQUEST } from "@/lib/portal/vanParts";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { Bad, Card, Empty, Head, Pill, Say, Tabs, type Status } from "@/components/portal/kit/Kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tools · Team portal" };

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const daysTo = (iso: string, today: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

/**
 * Crew & vans › Tools: every tool on every van in one register, soonest test,
 * tag or calibration due first. Each van's own list (Vans › a van › Tools &
 * plant) is where tools are added and marked done; this is the fleet's view.
 */
export default async function ToolRegister({ searchParams }: { searchParams: { van?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "vehicles")) return <Locked user={user} what="Tools" forWhom="whoever looks after the vans" />;

  const [tools, vans] = await Promise.all([allTools(), listVehicles().catch(() => [])]);
  const today = isoDateMelbourne(new Date());
  const vanName = new Map(vans.map((v) => [v.id, v.name]));
  const on = searchParams.van && vans.some((v) => v.id === searchParams.van) ? searchParams.van : "all";
  const list = (tools ?? []).filter((t) => on === "all" || t.vehicleId === on);
  const due = (tools ?? []).filter((t) => t.nextDueOn && daysTo(t.nextDueOn, today) <= 14);
  const st = (next: string | null): Status => {
    if (!next) return { k: "none", w: "No date" };
    const n = daysTo(next, today);
    return n < 0 ? { k: "bad", w: `${-n} days over` } : n <= 14 ? { k: "mid", w: `Due in ${n} days` } : n <= 30 ? { k: "good", w: `${n} days` } : { k: "good", w: "In date" };
  };

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Tools" eyebrow="Every tool on every van · soonest due first" info={[
          ["Test & tag", "Electrical tools that go on site get checked and tagged on a cycle (every 3 months in construction under AS/NZS 3760). Check your own cycle with your safety adviser."],
          ["Calibration", "Gas analysers and leak detectors read wrong if they drift. Once a year, or as the maker says."],
          ["Adding a tool", "On the van: Vans › the van › Tools & plant. That’s also where a test is marked done."],
        ]} />
        {tools == null ? <Empty>The tool register can’t be read right now. That isn’t the same as no tools.</Empty> : (tools.length === 0 ? (
          <Empty>No tools on the register yet. Add them on each van, under <Link href="/portal/vehicles">Vehicles</Link> › the van › Tools &amp; plant, with when each was last tested and when it’s next due.</Empty>
        ) : (
          <>
            <Say>{due.length ? <Bad>{due.length} {due.length === 1 ? "tool is" : "tools are"} due for testing in the next two weeks or already over.</Bad> : <b>Every tool is tested and in date.</b>}</Say>
            {vans.length > 1 && (
              <Tabs on={on} label="Which van" items={[{ key: "all", label: "Every van", href: "/portal/vehicles/tools" }, ...vans.map((v) => ({ key: v.id, label: v.name, href: `/portal/vehicles/tools?van=${v.id}` }))]} />
            )}
            <Card title="Tool register" aside={`${list.length} tools`}>
              <div className="pk-tbl-wrap">
                <table className="pk-tbl">
                  <thead><tr><th>Tool</th><th className="l">Van</th><th>Last done</th><th>Next due</th><th className="l">Status</th></tr></thead>
                  <tbody>
                    {list.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <b>{t.name}</b>
                          <div className="ks">{[TOOL_KINDS.find((k) => k.k === t.kind)?.label, t.model, t.request ? TOOL_REQUEST.find((r) => r.k === t.request)?.label : null].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td className="l"><Link href={`/portal/vehicles/${t.vehicleId}`}>{vanName.get(t.vehicleId) ?? "A van"}</Link></td>
                        <td>{t.lastDoneOn ? day(t.lastDoneOn) : ""}{t.lastDone && <div className="ks">{t.lastDone}</div>}</td>
                        <td>{t.nextDueOn ? day(t.nextDueOn) : ""}{t.nextDue && <div className="ks">{t.nextDue}</div>}</td>
                        <td className="l"><Pill st={st(t.nextDueOn)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ))}
      </div>
    </PortalShell>
  );
}
