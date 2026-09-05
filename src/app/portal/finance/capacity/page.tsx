import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getCapSettings, dbConfigured } from "@/lib/portal/db";
import { DEFAULT_SETTINGS } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { CapacityEditor } from "@/components/portal/CapacityEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Costs & capacity — Team portal" };

const TABS = ["crew", "overheads", "rates"] as const;

export default async function CapacityPage({ searchParams }: { searchParams: { t?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const [users, settings] = ready ? await Promise.all([listUsers(), getCapSettings()]) : [[], null];
  const people = users
    .filter((u) => u.active && u.id)
    .sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.name.localeCompare(b.name))
    .map((u) => ({ id: u.id as string, name: u.name, email: u.email, level: u.level, costing: u.costing }));

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Costs &amp; capacity</div>
        <h1>What an hour has to cover.</h1>
        <p>The crew, every overhead the business carries, and the charge-out rates that fall out of the two. Change anything and the numbers at the top move with it.</p>
      </div>
      <CapacityEditor
        people={people}
        settings={settings ?? DEFAULT_SETTINGS}
        dbReady={ready}
        canManage={can(user, "manage_users")}
        initialTab={TABS.includes(searchParams?.t as typeof TABS[number]) ? (searchParams!.t as typeof TABS[number]) : undefined}
      />
    </PortalShell>
  );
}
