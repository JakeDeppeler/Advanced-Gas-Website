import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { EmailFrame } from "@/components/portal/EmailFrame";
import { PreviewSendButtons } from "@/components/portal/ReportButtons";
import { dashboardDbConfigured } from "@/lib/dashboard/db";
import { previewReport } from "@/lib/reports/run";
import { reportEmail } from "@/lib/reports/send";
import { reportRecipients } from "@/lib/reports/store";
import { KIND_LABEL, type ReportKind } from "@/lib/reports/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Preview a report — Team portal" };

const WHEN: Record<ReportKind, string> = {
  daily: "Goes at half past five every working day.",
  weekly: "Goes at half past five on the last working day of the week.",
  monthly: "Goes at half past five on the last working day of the month.",
};

/**
 * A report as it will land in the inbox, from the board's figures right now.
 * Built, shown, and thrown away: nothing is kept or sent until a button says so.
 */
export default async function ReportPreviewPage({ searchParams }: { searchParams: { k?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Reports" forWhom="managers" />;

  const kind: ReportKind = (["daily", "weekly", "monthly"] as const).find((k) => k === searchParams.k) ?? "daily";
  const ready = dashboardDbConfigured();
  const [report, recipients] = ready
    ? await Promise.all([previewReport(kind).catch(() => null), reportRecipients().catch(() => [] as string[])])
    : [null, [] as string[]];
  const mail = report ? reportEmail(report) : null;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/board/reports" label="Reports" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>Preview a report</h1>
          <p>
            Exactly what lands in the inbox, built from the board&rsquo;s figures as they are right now. Nothing is kept or
            sent until you press a button. {WHEN[kind]}
          </p>
        </div>
        <nav className="pt-seg" aria-label="Which report">
          {(["daily", "weekly", "monthly"] as ReportKind[]).map((k) => (
            <Link key={k} href={`/portal/board/reports/preview?k=${k}`} className={`pt-seg__b${kind === k ? " is-on" : ""}`} aria-current={kind === k ? "page" : undefined}>
              {KIND_LABEL[k]}
            </Link>
          ))}
        </nav>
      </div>

      {!mail ? (
        <div className="pt-note pt-note--warn">
          <strong>The board has no figures to build it from yet.</strong> It needs one snapshot, which the TV or the next sync makes.
        </div>
      ) : (
        <>
          <section className="pt-panel">
            <div className="pt-mail__subject">
              <span>Subject</span>
              <strong>{mail.subject}</strong>
            </div>
            <PreviewSendButtons kind={kind} everyone={recipients.length} />
            <p className="pt-panel__sub" style={{ margin: "10px 0 0" }}>
              &ldquo;Send it to me&rdquo; goes to {user.email} only and isn&rsquo;t kept. &ldquo;Send to everyone now&rdquo; goes
              to the {recipients.length} on <Link href="/portal/board/reports#emails">the list</Link> and counts as this
              period&rsquo;s report, so it won&rsquo;t go again at half past five.
            </p>
          </section>
          <EmailFrame html={mail.html} title={`${KIND_LABEL[kind]} report preview`} />
        </>
      )}
    </PortalShell>
  );
}
