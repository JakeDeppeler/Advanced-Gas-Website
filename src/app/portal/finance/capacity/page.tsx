import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getCapSettings, dbConfigured } from "@/lib/portal/db";
import { DEFAULT_SETTINGS } from "@/lib/portal/crew";
import { xeroStatus, getPLDetail, lastTwelveMonths } from "@/lib/portal/xero";
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

  // Last twelve months of expense accounts, so overhead lines can be fed from
  // what was actually spent rather than typed from memory. When this comes back
  // empty the panel has to say why — a silent absence is indistinguishable from
  // a bug, which is exactly how it read the first time round.
  const { status } = await xeroStatus();
  const span = lastTwelveMonths();
  let xeroExpenses: { label: string; section: string; amount: number }[] = [];
  let xero: { state: "off" | "failed" | "empty" | "ok"; sections: string[]; span: string } = {
    state: "off", sections: [], span: `${span.from} to ${span.to}`,
  };

  if (status === "connected") {
    const detail = await getPLDetail(span.from, span.to);
    if (!detail) {
      xero.state = "failed";
    } else {
      xeroExpenses = detail.sections
        .filter((sec) => sec.kind === "out")
        .flatMap((sec) => sec.lines.map((l) => ({ label: l.label, section: sec.title, amount: l.amount })))
        .filter((l) => l.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      xero = {
        ...xero,
        state: xeroExpenses.length ? "ok" : "empty",
        sections: detail.sections.map((sec) => sec.title),
      };
    }
  }

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
        xeroExpenses={xeroExpenses}
        xero={xero}
      />
    </PortalShell>
  );
}
