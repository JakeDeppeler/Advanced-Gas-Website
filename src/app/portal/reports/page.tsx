import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { listReports, listUsers, dbConfigured } from "@/lib/portal/db";
import { PortalShell } from "@/components/portal/PortalShell";
import { ReportsBoard, type ReportView } from "@/components/portal/ReportsBoard";

export const metadata = { title: "Reports — Team portal" };
export const dynamic = "force-dynamic";

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ReportsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "reports_read")) redirect("/portal?denied=1");

  const ready = dbConfigured();
  const [reportsRaw, users] = ready ? await Promise.all([listReports({ limit: 200 }), listUsers()]) : [[], []];

  const reports: ReportView[] = reportsRaw.map((r) => ({
    id: r.id,
    subjectId: r.subjectId,
    subjectName: r.subjectName,
    authorName: r.authorName,
    authorEmail: r.authorEmail,
    category: r.category,
    title: r.title,
    body: r.body,
    when: when(r.createdAt),
  }));

  const members = users
    .filter((u) => u.active && u.id)
    .map((u) => ({ id: u.id as string, name: u.name }));

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <div className="pt-head__eyebrow">Reports</div>
        <h1>The crew, on the record.</h1>
        <p>Coaching, performance, handovers and incidents — written down so the right people know without a meeting. Visible to lead hands and admins.</p>
      </div>

      <ReportsBoard
        reports={reports}
        members={members}
        canWrite={can(user, "reports_write")}
        canDelete={can(user, "manage_users")}
        dbReady={ready}
      />
    </PortalShell>
  );
}
