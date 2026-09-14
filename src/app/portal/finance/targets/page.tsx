import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, getCapSettings, getSettings, listQuotes, dbConfigured } from "@/lib/portal/db";
import { computeCapacity, DEFAULT_SETTINGS, type CrewLevel } from "@/lib/portal/crew";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { RevenuePlanner } from "@/components/portal/RevenuePlanner";
import type { Targets, Capacity } from "@/lib/portal/targets";
import { xeroStatus, getProfitAndLoss, localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Targets — Team portal" };

export default async function TargetsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const targets = ready ? await getSettings<Targets>("targets") : null;

  // The crew's capacity, so the target can be measured against the week rather
  // than only divided up into it.
  let capacity: Capacity | null = null;
  if (ready) {
    const [users, settings] = await Promise.all([listUsers(), getCapSettings()]);
    const s = settings ?? DEFAULT_SETTINGS;
    const people = users
      .filter((u) => u.active && u.id && u.level)
      .map((u) => ({ id: u.id as string, name: u.name, level: u.level as CrewLevel, costing: u.costing }));
    const cap = computeCapacity(people, s);
    capacity = {
      billHrs: cap.totalBillHrs,
      chargePerHr: cap.costPerHr * (1 + s.margin / 100),
      weeksYear: s.weeksYear,
      vans: cap.vanCount,
    };
  }

  // What has actually happened: the quote book for the win rate and the average
  // won job, and the last twelve weeks of it for the quoting pace.
  let actual = { winRate: null as number | null, avgJob: null as number | null, won: 0, quotesPerWeek: null as number | null };
  if (ready) {
    const quotes = await listQuotes();
    const won = quotes.filter((q) => q.status === "won");
    const won$ = won.reduce((a, q) => a + q.amount, 0);
    const decided$ = won$ + quotes.filter((q) => q.status === "lost").reduce((a, q) => a + q.amount, 0);
    const cutoff = Date.now() - 84 * 86_400_000;
    const recent = quotes.filter((q) => new Date(q.quotedOn).getTime() >= cutoff);
    actual = {
      winRate: decided$ > 0 ? Math.round((won$ / decided$) * 100) : null,
      avgJob: won.length > 0 ? Math.round(won$ / won.length) : null,
      won: won.length,
      quotesPerWeek: recent.length > 0 ? recent.length / 12 : null,
    };
  }

  // Revenue banked so far this calendar year, from the filed accounts.
  const { status } = await xeroStatus();
  const t = localToday();
  const ytd = status === "connected"
    ? (await getProfitAndLoss(
        new Date(Date.UTC(t.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10),
        t.toISOString().slice(0, 10),
      ))?.income ?? null
    : null;

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/finance" label="Finance" />
        <div className="pt-head__eyebrow">Finance · Targets</div>
        <h1>What has to happen to hit the year.</h1>
        <p>
          Set the year&rsquo;s revenue and everything else works backwards from it: the work that has to be finished,
          the hours that takes out of the crew&rsquo;s week, the quoting it takes to win it, and whether the crew has
          the week for it at all. Where the accounts and the quote book know the answer already, they are used instead
          of an assumption.
        </p>
      </div>
      <RevenuePlanner initial={targets} cap={capacity} actual={actual} ytd={ytd} canSave={ready} />
    </PortalShell>
  );
}
