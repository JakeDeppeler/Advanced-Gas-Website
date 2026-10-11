import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Figs, ago } from "@/components/portal/Figs";
import { latestBoard } from "@/lib/portal/office";
import { money } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Not billed — Team portal" };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));

/**
 * Jobs finished in ServiceTitan with no invoice yet, oldest first — the
 * office's list for getting money out the door. From the wall board's own
 * snapshot, so the count here is the count on the TV. Billing happens in
 * ServiceTitan; each row opens the job there.
 */
export default async function NotBilledPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!(can(user, "overhead") || can(user, "quotes"))) return <Locked user={user} what="Not billed" forWhom="the office" />;

  const board = await latestBoard();
  const m = board?.metrics ?? null;
  const rows = [...(m?.toBill ?? [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const ages = m?.toBillAges ?? null;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Not billed</h1>
        <p>
          Jobs finished in ServiceTitan that haven&rsquo;t been invoiced, oldest first. Every one is money we&rsquo;ve
          earned and can&rsquo;t be paid for yet{board ? ` · as of ${ago(board.computedAt)}` : ""}.
        </p>
      </div>

      <Figs
        cols={3}
        items={[
          {
            label: "Waiting to be billed", feature: true, value: m ? String(m.toBillCount) : null,
            sub: ages ? `${ages.d0_14} in the last fortnight · ${ages.d15_30 + ages.d31_60 + ages.d60plus} older` : undefined,
            from: "ServiceTitan · finished, invoice still at $0", needs: "Waiting on the board's first snapshot",
          },
          {
            label: "What we can put a price on", value: m ? money(m.toBillValue) : null,
            sub: "the ones sold before the visit; service jobs are priced after it", from: "ServiceTitan · inc GST",
            needs: "Waiting on the board's first snapshot",
          },
          {
            label: "Oldest", value: m?.toBillOldestDays != null ? `${m.toBillOldestDays} days` : null,
            sub: "start here", from: "ServiceTitan", needs: "Nothing waiting",
          },
        ]}
      />

      <section className="pt-panel" aria-labelledby="nb-h">
        <h2 id="nb-h" className="pt-panel__h">Oldest first</h2>
        {rows.length ? (
          <div className="pt-fleet__wrap">
            <table className="pt-rev__pl">
              <thead><tr><th scope="col">Job</th><th scope="col">Finished</th><th scope="col">Waiting</th><th scope="col">Sold for</th><th scope="col"><span className="pt-sr">Open</span></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.jobNumber ? `#${r.jobNumber}` : `Job ${r.id}`}<em> {[r.jobType, r.suburb].filter(Boolean).join(" · ")}</em></th>
                    <td>{day(r.at)}</td>
                    <td className={daysSince(r.at) > 14 ? "is-bad" : undefined}>{daysSince(r.at)} days</td>
                    <td>{r.value != null ? money(r.value) : "priced on the day"}</td>
                    <td><a className="pt-btn pt-btn--ghost pt-btn--sm" href={`https://go.servicetitan.com/#/Job/Index/${r.id}`} target="_blank" rel="noreferrer">Open in ServiceTitan ›</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="pt-rep__empty">{m ? "Nothing waiting — every finished job has an invoice." : "The board hasn't made its first snapshot yet."}</p>}
        {m && m.toBillCount > rows.length && <p className="pt-panel__sub">The {rows.length} oldest of {m.toBillCount} are listed; the rest are in ServiceTitan.</p>}
      </section>
    </PortalShell>
  );
}
