import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, listVehicles, dbConfigured } from "@/lib/portal/db";
import { CREW_LEVELS, LEVEL_BILLABLE, type CrewLevel } from "@/lib/portal/crew";
import { crewNow, type CrewNow } from "@/lib/portal/home/crewNow";
import { hoursThisWeek } from "@/lib/portal/hours/compare";
import { CrewList, type CrewRow } from "@/components/portal/team/CrewList";
import { PortalShell } from "@/components/portal/PortalShell";
import { AddTeamPerson } from "@/components/portal/AddTeamPerson";
import { TeamBoard, type TeamPerson } from "@/components/portal/TeamBoard";
import { Locked } from "@/components/portal/Locked";
import { Bad, Btn, Empty, Head, Say } from "@/components/portal/kit/Kit";
import { listLicences, licenceState } from "@/lib/portal/crewFile/licences";
import { isoDateMelbourne } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team · Team portal" };

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });

/**
 * Team: the crew as a list, where each of them is right now, today's
 * visits and this week's hours, then the team itself to manage (levels,
 * order, logins, licences) folded under it. The list is what's looked at
 * every day; the management is for the day someone starts or leaves.
 */
export default async function TeamDirectory({ searchParams }: { searchParams: { add?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "reports_read")) return <Locked user={user} what="Team" forWhom="managers" />;

  const ready = dbConfigured();
  const [users, licences, vans, crew, week] = ready
    ? await Promise.all([listUsers(), listLicences(), listVehicles().catch(() => []), crewNow().catch(() => null), hoursThisWeek().catch(() => null)])
    : [[], [], [], null, null];
  const active = users
    .filter((u) => u.active && u.id)
    .sort((a, b) => (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.name.localeCompare(b.name));
  const today = isoDateMelbourne(new Date());
  const states = licences.map((l) => ({ l, st: licenceState(l.expiresOn, today) }));
  const worstFor = (id: string) => {
    const mine = states.filter((x) => x.l.userId === id);
    return mine.some((x) => x.st.k === "bad") ? "bad" as const : mine.some((x) => x.st.k === "mid") ? "mid" as const : null;
  };

  const people: TeamPerson[] = active.map((u) => ({
    id: u.id as string, name: u.name, email: u.email, level: (u.level as CrewLevel | null) ?? "", role: u.role, licence: worstFor(u.id as string),
  }));
  const soon = states.filter((x) => x.st.days != null && x.st.days <= 60 && active.some((u) => u.id === x.l.userId))[0];
  const soonName = soon ? active.find((u) => u.id === soon.l.userId)?.name.split(" ")[0] : null;
  const noLogin = people.filter((p) => !p.email).length;
  const canManage = can(user, "manage_users");

  // ServiceTitan spells some names differently from the portal ("Winbanks"),
  // so a person is matched on their whole name, then their first.
  const match = <T extends { name: string }>(list: T[], name: string): T | null => {
    const whole = name.trim().toLowerCase(), first = whole.split(/\s+/)[0];
    return list.find((x) => x.name.trim().toLowerCase() === whole) ?? list.filter((x) => x.name.trim().toLowerCase().split(/\s+/)[0] === first).at(0) ?? null;
  };
  const levelLabel = (l: string | null) => CREW_LEVELS.find((x) => x.key === l)?.label ?? "";
  const crewRows: CrewRow[] = active.map((u) => {
    const field = u.level ? LEVEL_BILLABLE[u.level as CrewLevel] : true;
    const on: CrewNow | null = crew ? match(crew, u.name) : null;
    const hrs = week ? match(week.people, u.name) : null;
    return {
      id: u.id as string, name: u.name, level: levelLabel(u.level), field,
      van: vans.find((v) => v.active && v.assignedTo === u.id)?.name ?? null,
      now: on,
      week: hrs || field ? { on: hrs?.on ?? 0, of: u.costing?.hrsWeek || null } : null,
    };
  });
  const fieldN = crewRows.filter((r) => r.field).length;
  const officeN = crewRows.length - fieldN;
  const count = (st: CrewNow["state"]) => crewRows.filter((r) => r.now?.state === st).length;

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="The crew" sub={
          <>
            {fieldN} on the tools, {officeN} in the office.{crew ? <> Right now {count("working")} {count("working") === 1 ? "is" : "are"} on a job and {count("dispatched")} driving.</> : null}
            {/* Kept up here, not only under Manage: a licence running out shouldn't need a click to find. */}
            {soon && soonName ? <> <Bad>{soonName}’s {soon.l.name.toLowerCase()} {soon.st.k === "bad" ? "ran out" : "runs out"} on {day(soon.l.expiresOn!)}.</Bad></> : null}
          </>
        } info={[
          ["Right now", "From today's appointments in ServiceTitan: on a job once they've marked themselves working, driving once dispatched. Only as fresh as the last sync."],
          ["This week on site", "Arrived to done on each visit this week, from ServiceTitan's clock-ins, against the rostered week on their card. Hours has the detail."],
          ["Levels", "Operations, Tradesman, Hybrid and Apprentice. The level sets what each person sees in the portal and which standard applies to them."],
        ]} />
      </div>
      {crewRows.length ? <CrewList rows={crewRows} synced={crew != null} /> : null}

      <details className="pk-card cl-manage" open={searchParams?.add === "1" || crewRows.length === 0 || undefined}>
        <summary><b>Manage the team</b><span>levels, order, logins, licences{canManage ? ", add someone" : ""}</span></summary>
        <div className="pk">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <Say>
                {soon && soonName ? <><Bad>{soonName}’s {soon.l.name.toLowerCase()} {soon.st.k === "bad" ? "ran out" : "runs out"} on {day(soon.l.expiresOn!)}.</Bad>{" "}</> : null}
                {noLogin ? `${noLogin} of ${people.length} people can’t log in yet.` : "Everyone can log in."}
              </Say>
            </div>
            {canManage && <Btn href="/portal/team?add=1">+ Add a person</Btn>}
          </div>
          {canManage && searchParams?.add === "1" && <AddTeamPerson doneHref="/portal/team" />}
          {people.length === 0 ? (
            <Empty>{ready ? "No team members yet, add them above." : "The team can’t be read right now, so this is empty rather than the team being empty."}</Empty>
          ) : <TeamBoard initial={people} canManage={canManage} />}
        </div>
      </details>
    </PortalShell>
  );
}
