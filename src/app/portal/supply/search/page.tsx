import { redirect } from "next/navigation";
import { PriceFileUpload } from "@/components/portal/PriceFileUpload";
import { sbCount } from "@/lib/dashboard/db";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { searchCatalogue } from "@/lib/pricebook/supply";
import { reeceConnection, reeceSearch } from "@/lib/pricebook/reece";
import { money2 } from "@/lib/portal/format";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { Locked } from "@/components/portal/Locked";

export const dynamic = "force-dynamic";
export const metadata = { title: "Item search — Team portal" };

const MEL = "Australia/Melbourne";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: MEL, day: "numeric", month: "short" });

type Hit = { code: string; description: string | null; cost: number | null; uom: string | null; seenAt: string | null };

export default async function SupplySearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  const term = (searchParams?.q ?? "").trim();
  // Whether there is anything to search at all: an empty catalogue and no
  // live link means the page's job is to say how to fill it.
  const [itemCount, conn0] = await Promise.all([
    sbCount("supplier_items", "", "code").catch(() => null),
    reeceConnection().catch(() => ({ status: "not-configured" }) as const),
  ]);
  const nothingToSearch = itemCount === 0 && conn0.status !== "ready";

  // Live maX search when Reece is connected, our own replica otherwise. The
  // page says which answered, because the two can disagree: the replica is
  // only as fresh as the last price file.
  let hits: Hit[] = [];
  let source: "live" | "replica" | null = null;
  let failure: string | null = null;

  if (term) {
    const conn = conn0;
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
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Item search</h1>
        <p>Look up a Reece product and what it costs us, for quoting.</p>
      </div>

      <PortalTabs set="supply" />

      <form method="get" className="pt-sbox pt-sbox--lg" role="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        <input type="search" name="q" defaultValue={term} placeholder="Reece product code or name" aria-label="Find a Reece product" autoComplete="off" />
      </form>

      {failure && (
        <div className="pt-note">
          <strong>Search failed.</strong> {failure}
        </div>
      )}

      {!term && nothingToSearch && (
        <section className="pt-emptycard">
          <strong>Load a price file to search</strong>
          <span>Upload a maX price file and every product shows here with what it costs us and what it goes into the pricebook at.</span>
          <PriceFileUpload />
        </section>
      )}

      {term && !failure && (
        <section className="pt-panel">
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
        </section>
      )}
    </PortalShell>
  );
}
