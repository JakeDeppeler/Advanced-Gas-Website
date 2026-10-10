import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getCapSettings, listVehicles, dbConfigured } from "@/lib/portal/db";
import { fleetDepreciation, withFleet } from "@/lib/portal/costSettings";
import { xeroStatus, getPLDetail, lastTwelveMonths } from "@/lib/portal/xero";
import { PortalShell } from "@/components/portal/PortalShell";
import { FinanceHead } from "@/components/portal/FinanceHead";
import { PortalBack } from "@/components/portal/PortalBack";
import { CapacityEditor } from "@/components/portal/CapacityEditor";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { XeroLine } from "@/components/portal/XeroLine";
import { Locked } from "@/components/portal/Locked";
import { VanLoans } from "@/components/portal/VanLoans";
import { MarkupEditor } from "@/components/portal/MarkupEditor";
import { getGrowth } from "@/lib/portal/growth";
import { EMPTY_GROWTH } from "@/lib/portal/growthTypes";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Our numbers — Team portal" };

const TABS = ["crew", "overheads", "rates"] as const;

/**
 * The three parts of Our numbers. Every figure the hourly rate, the Job
 * calculator and Planning work from is set in one of them, and nowhere else.
 */
const PARTS = [
  { k: "costs", label: "Crew, costs & rates" },
  { k: "vans", label: "Vans & loans" },
  { k: "markup", label: "Materials & units" },
] as const;
type Part = (typeof PARTS)[number]["k"];

export default async function CapacityPage({ searchParams }: { searchParams: { t?: string; part?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Finance" forWhom="managers" />;

  // Last twelve months of expense accounts, so overhead lines can be fed from
  // what was actually spent rather than typed from memory. When this comes back
  // empty the panel has to say why — a silent absence is indistinguishable from
  // a bug, which is exactly how it read the first time round.
  const { status, tenantName } = await xeroStatus();
  const span = lastTwelveMonths();
  let xeroExpenses: { label: string; section: string; amount: number }[] = [];
  let xeroBought: number | null = null;
  let xeroAccount: string | null = null;
  let xero: { state: "off" | "failed" | "empty" | "ok"; sections: string[]; span: string } = {
    state: "off", sections: [], span: `${span.from} to ${span.to}`,
  };

  if (status === "connected") {
    const detail = await getPLDetail(span.from, span.to);
    if (!detail) {
      xero.state = "failed";
    } else {
      // Materials and units bought: Xero files both under a cost-of-sales
      // materials account, which Materials & units offers as a starting point.
      const mats = detail.sections
        .filter((sec) => sec.kind === "out" && /cost of (sales|goods)|direct cost/i.test(sec.title))
        .flatMap((sec) => sec.lines)
        .filter((l) => /material|equipment|parts|purchases|stock/i.test(l.label) && !/hire|wage|contract/i.test(l.label) && l.amount > 0);
      if (mats.length) {
        xeroBought = mats.reduce((a, l) => a + l.amount, 0);
        xeroAccount = mats.sort((a, b) => b.amount - a.amount)[0].label;
      }
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
  const part: Part = PARTS.some((p) => p.k === searchParams?.part) ? (searchParams!.part as Part) : "costs";
  const [users, settings, vehicles, growth] = ready
    ? await Promise.all([listUsers(), getCapSettings(), listVehicles(), getGrowth()])
    : [[], null, [], EMPTY_GROWTH];

  // Depreciation belongs in the overhead and belongs to the vans, so it comes
  // from the fleet rather than being typed in twice.
  const fleetDep = fleetDepreciation(vehicles);
  const people = users
    .filter((u) => u.active && u.id)
    .sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.name.localeCompare(b.name))
    .map((u) => ({ id: u.id as string, name: u.name, email: u.email, level: u.level, costing: u.costing }));

  return (
    <PortalShell user={user}>
      <FinanceHead title="Our numbers" lede="Every figure the hourly rate, the Job calculator and Planning work from — the crew, the costs, the vans and the markups. This is the one place they're changed." xero={{ state: status, org: tenantName }} />
      <nav className="pt-seg pt-nums__parts" aria-label="Our numbers">
        {PARTS.map((p) => (
          <Link key={p.k} href={p.k === "costs" ? "/portal/finance/capacity" : `/portal/finance/capacity?part=${p.k}`} className={`pt-seg__b${part === p.k ? " is-on" : ""}`} aria-current={part === p.k ? "page" : undefined}>{p.label}</Link>
        ))}
      </nav>
      {part === "costs" && (
        <CapacityEditor
          people={people}
          settings={withFleet(settings, vehicles)}
          dbReady={ready}
          canManage={can(user, "manage_users")}
          initialTab={TABS.includes(searchParams?.t as typeof TABS[number]) ? (searchParams!.t as typeof TABS[number]) : undefined}
          xeroExpenses={xeroExpenses}
          xero={xero}
          fleetDep={fleetDep}
          vanCount={vehicles.filter((v) => v.status !== "off").length}
        />
      )}
      {part === "vans" && (
        <VanLoans
          growth={growth}
          vans={vehicles.map((v) => ({
            id: v.id, name: v.name, onRoad: v.status !== "off", purchasePrice: v.purchasePrice, amountOwing: v.amountOwing,
            monthlyRepayment: v.monthlyRepayment, resaleValue: v.resaleValue, lifespanYears: v.lifespanYears,
          }))}
        />
      )}
      {part === "markup" && (
        <MarkupEditor growth={growth} xeroBought={xeroBought} xeroAccount={xeroAccount} vans={Math.max(1, vehicles.filter((v) => v.status !== "off").length)} />
      )}
    </PortalShell>
  );
}
