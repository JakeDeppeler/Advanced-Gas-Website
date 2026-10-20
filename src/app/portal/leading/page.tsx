import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead } from "@/components/portal/kit/Kit";
import { LeadingView } from "@/components/portal/leading/LeadingView";
import { loadDecisions, loadLeading } from "@/lib/portal/leading/store";
import { loadRoles } from "@/lib/portal/roles/store";
import { canEditStandards } from "@/lib/portal/standards";
import { dbConfigured, listUsers } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leading · Team portal" };

/**
 * How we work › Leading: which calls each leadership seat makes without an
 * owner, how to bring the ones it doesn't, and a log of calls made that the
 * owner goes over weekly. The log is how a seat's band grows: calls that keep
 * coming back good move up a rung.
 *
 * A draft until the owner publishes it, because these are the business's
 * rules. Everyone sees their own logged calls; the owner sees everyone's.
 */
export default async function LeadingPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const owner = canEditStandards(user);
  const [lead, roles, log, users] = await Promise.all([
    loadLeading(), loadRoles(), loadDecisions(), dbConfigured() ? listUsers().catch(() => []) : Promise.resolve([]),
  ]);
  const people = users.filter((u) => u.active && u.id).map((u) => ({ id: u.id as string, name: u.name }));
  const inSeat: Record<string, string[]> = {};
  for (const p of people) {
    const r = roles.assign[p.id];
    if (r) (inSeat[r] ??= []).push(p.name);
  }
  const me = user.email.toLowerCase();
  const mine = log.filter((d) => owner || d.byEmail === me);
  const month = mine.filter((d) => Date.now() - Date.parse(d.at) < 30 * 86_400_000);
  const waiting = mine.filter((d) => !d.review).length;
  const mySeat = user.id ? lead.seats.find((s) => s.roleId && s.roleId === roles.assign[user.id!])?.name ?? null : null;
  const roleOpts = roles.roles.map((r) => ({ id: r.id, name: r.name }));

  return (
    <PortalShell user={user}>
      <KpiHead title={<>Leading</>} kpis={[
        { icon: "people", fig: String(lead.seats.length), label: "Seats that make calls" },
        { icon: "check", fig: String(month.length), label: owner ? "Calls logged, last 30 days" : "Your calls, last 30 days" },
        { icon: "alert", fig: String(waiting), label: owner ? "Waiting on your review" : "Yours waiting on review" },
      ]} />
      <LeadingView lead={lead} inSeat={inSeat} roles={roleOpts} canEdit={owner} log={mine} mySeat={mySeat} me={me} />
    </PortalShell>
  );
}
