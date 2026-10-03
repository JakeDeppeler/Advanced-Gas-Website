import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { TimesheetWeek } from "@/components/portal/TimesheetWeek";
import { getTimesheet } from "@/lib/portal/people";
import { dbConfigured, getUser } from "@/lib/portal/db";
import { mondayOf } from "@/components/portal/fleetStatus";
import { localToday } from "@/lib/portal/xero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Timesheet — Trade portal" };

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Your week, Monday to Friday, sent to the office as paid hours. */
export default async function TradeTimesheet({ searchParams }: { searchParams: { week?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const thisMonday = mondayOf(localToday());
  const asked = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week ?? "") ? mondayOf(new Date(`${searchParams.week}T00:00:00Z`)) : thisMonday;
  const monday = asked > thisMonday ? thisMonday : asked;
  const weekOf = iso(monday);
  const dates = [0, 1, 2, 3, 4].map((i) => iso(new Date(monday.getTime() + i * DAY)));
  const [sheet, record] = await Promise.all([
    user.id ? getTimesheet(user.id, weekOf) : null,
    dbConfigured() ? getUser(user.email).catch(() => null) : null,
  ]);
  const prev = iso(new Date(monday.getTime() - 7 * DAY));
  const next = iso(new Date(monday.getTime() + 7 * DAY));

  return (
    <TradeShell user={user} active="home" title="Timesheet" sub={`Week of ${monday.toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "long" })}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <Link href={`/trade/me/timesheet?week=${prev}`} className="tr-btn tr-btn--sm">← Last week</Link>
        {monday < thisMonday && <Link href={`/trade/me/timesheet?week=${next}`} className="tr-btn tr-btn--sm">Next week →</Link>}
      </div>
      {user.id ? (
        <TimesheetWeek
          key={weekOf}
          weekOf={weekOf}
          dates={dates}
          initial={sheet?.days ?? {}}
          submittedAt={sheet?.submittedAt ?? null}
          otMult={record?.costing?.otMult ?? null}
        />
      ) : <p className="tr-card tr-empty">Your file isn&rsquo;t set up yet, so there&rsquo;s nowhere to save a timesheet.</p>}
      <p className="tr-small">A half-hour lunch comes off any day over five hours. Jobs per day aren&rsquo;t shown yet — ServiceTitan&rsquo;s job assignments aren&rsquo;t synced into the portal.</p>
    </TradeShell>
  );
}
