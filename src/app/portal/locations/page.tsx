import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { savedLists } from "@/lib/locations/stLocations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site locations — Team portal" };

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Villages and blocks with a location per unit: load the list into
 * ServiceTitan, keep each unit's service status, fix doubled-up units.
 * Admins only.
 */
export default async function LocationsPage({ searchParams }: { searchParams: { customer?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) return <Locked user={user} what="Site locations" forWhom="admins" />;

  const typed = (searchParams?.customer ?? "").trim().replace(/^#/, "");
  if (/^\d+$/.test(typed)) redirect(`/portal/locations/${typed}`);

  const lists = dashboardDbConfigured() ? await savedLists().catch(() => []) : [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Site locations</h1>
        <p>A location per unit for villages and blocks: load the list into ServiceTitan, mark units serviced, fix doubles.</p>
      </div>

      <form method="get" className="pt-sbox pt-sbox--lg" role="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        <input type="search" name="customer" defaultValue={typed} inputMode="numeric" placeholder="ServiceTitan customer number" aria-label="ServiceTitan customer number" autoComplete="off" />
      </form>
      {typed && <div className="pt-note">That isn&rsquo;t a customer number. It&rsquo;s the number on the customer in ServiceTitan, digits only.</div>}

      <section className="pt-panel">
        <h2 className="pt-panel__h">Saved lists</h2>
        {lists.length === 0 ? (
          <p className="pt-rep__empty">None yet. Enter a customer number above to start one.</p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>Customer</th><th className="pt-otab__num">Locations</th><th>Saved</th></tr></thead>
              <tbody>
                {lists.map((l) => (
                  <tr key={l.customerId}>
                    <td><Link href={`/portal/locations/${l.customerId}`}><strong>{l.customerName}</strong></Link><span className="pt-fleet__sub">#{l.customerId}</span></td>
                    <td className="pt-otab__num">{l.count}</td>
                    <td>{day(l.savedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
