import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { searchCatalogue } from "@/lib/pricebook/supply";
import { reeceConnection, reeceSearch } from "@/lib/pricebook/reece";
import { money2 } from "@/lib/portal/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Item search — Team portal" };

const MEL = "Australia/Melbourne";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: MEL, day: "numeric", month: "short" });

type Hit = { code: string; description: string | null; cost: number | null; uom: string | null; seenAt: string | null };

export default async function SupplySearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const term = (searchParams?.q ?? "").trim();

  // Live maX search when Reece is connected, our own replica otherwise. The
  // page says which answered, because the two can disagree: the replica is
  // only as fresh as the last price file.
  let hits: Hit[] = [];
  let source: "live" | "replica" | null = null;
  let failure: string | null = null;

  if (term) {
    const conn = await reeceConnection().catch(() => ({ status: "not-configured" }) as const);
    // Reece's search endpoint rejects anything under three characters, so a
    // two-letter term goes straight to the replica rather than to an error.
    if (conn.status === "ready" && term.length >= 3) {
      try {
        const live = await reeceSearch(term, 40);
        hits = live.items.map((i) => ({
          code: i.code, description: i.description ?? null, cost: i.cost ?? null, uom: i.uom ?? null, seenAt: null,
        }));
        source = "live";
      } catch (e) {
        failure = e instanceof Error ? e.message : "maX search failed.";
      }
    }
    if (source == null) {
      try {
        hits = await searchCatalogue(term, 40);
        source = "replica";
      } catch (e) {
        failure = e instanceof Error ? e.message : "Couldn’t read the catalogue.";
      }
    }
  }

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/supply" label="Supply" />
      <div className="pt-head">
        <div className="pt-head__eyebrow">Item search</div>
        <h1>What does Reece charge us?</h1>
        <p>
          Our contractor price, ex GST, for quoting. Search by product code or by what the thing is called — both work
          in the same box.
        </p>
      </div>

      <section className="pt-panel">
        <form className="pt-sup__searchform" method="get">
          <label className="pt-field pt-sup__search">
            <span className="pt-sr">Search Reece</span>
            <input type="search" name="q" defaultValue={term} placeholder="20mm copper, REH250, isolation valve…" autoComplete="off" />
          </label>
          <button type="submit" className="pt-btn pt-btn--navy">
            Search
          </button>
        </form>

        {failure && (
          <div className="pt-note">
            <strong>Search failed.</strong> {failure}
          </div>
        )}

        {term && !failure && (
          <>
            <p className="pt-panel__sub pt-sup__srcnote">
              {hits.length === 0
                ? `Nothing matches “${term}”.`
                : `${hits.length}${hits.length === 40 ? "+" : ""} match${hits.length === 1 ? "" : "es"} · `}
              {hits.length > 0 &&
                (source === "live"
                  ? "live from maX"
                  : "from our copy of the price file — as fresh as the last import")}
            </p>
            {hits.length > 0 && (
              <div className="pt-tgt__tablewrap">
                <table className="pt-tgt__table pt-sup__hits">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Unit</th>
                      <th>Our cost</th>
                      {source === "replica" && <th>Last seen</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {hits.map((h) => (
                      <tr key={h.code}>
                        <th scope="row">
                          <strong>{h.code}</strong>
                          <span>{h.description ?? "No description"}</span>
                        </th>
                        <td>{h.uom ?? "—"}</td>
                        <td>{h.cost == null ? "—" : money2(h.cost)}</td>
                        {source === "replica" && <td>{h.seenAt ? day(h.seenAt) : "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!term && (
          <p className="pt-sup__none">Type a code or a description above.</p>
        )}
      </section>
    </PortalShell>
  );
}
