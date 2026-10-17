import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listUsers, dbConfigured } from "@/lib/portal/db";
import type { CrewLevel } from "@/lib/portal/crew";
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

/** Crew & vans › Team: everyone by level, the licence running out soonest, and who can't sign in. */
export default async function TeamDirectory({ searchParams }: { searchParams: { add?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "reports_read")) return <Locked user={user} what="Team" forWhom="managers" />;

  const ready = dbConfigured();
  const [users, licences] = ready ? await Promise.all([listUsers(), listLicences()]) : [[], []];
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

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Team" sub="Everyone, by level · open a person for their file" info={[
          ["Levels", "Operations, Tradesman, Hybrid and Apprentice. The level sets what each person sees in the portal and which standard applies to them."],
          ["Login email", "Without one, that person can’t use the trade iPad or see their own file."],
          ["Open", "Their file: what’s expected, goals, commission, reviews, private notes, leave and pay, and licences."],
        ]} />
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
    </PortalShell>
  );
}
