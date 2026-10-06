import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { EmailListEditor } from "@/components/portal/EmailListEditor";
import { SendAgainButton } from "@/components/portal/ReportButtons";
import { dbConfigured } from "@/lib/portal/db";
import { listReports, reportRecipients } from "@/lib/reports/store";
import { KIND_LABEL, type Report, type ReportKind } from "@/lib/reports/types";
import { changeReportRecipient } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — Team portal" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * The board's reports: the day, the week and the month, each kept here and
 * emailed to the list at the foot. The list of what went, to whom, and when;
 * any one opens as the email showed it, and can be sent again.
 */
export default async function ReportsPage({ searchParams }: { searchParams: { k?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Reports" forWhom="managers" />;

  const ready = dbConfigured();
  const [all, recipients] = ready ? await Promise.all([listReports().catch(() => [] as Report[]), reportRecipients()]) : [[] as Report[], [] as string[]];
  const kind = (["daily", "weekly", "monthly"] as const).find((k) => k === searchParams.k) ?? null;
  const reports = kind ? all.filter((r) => r.kind === kind) : all;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/board" label="Wall board" />
      <div className="pt-head pt-head--split">
        <div>
          <h1>Reports</h1>
          <p>
            The board&rsquo;s figures, put together and emailed at half past five: the day on every working day, the week on its
            last working day, and the month on its last. Each one is kept here as it was sent.
          </p>
        </div>
        <div className="pt-vhead__acts">
          <Link href="/portal/board/reports/preview" className="pt-btn pt-btn--orange">Preview the reports</Link>
        </div>
      </div>

      {!ready && <div className="pt-note pt-note--warn"><strong>The database isn&rsquo;t connected,</strong> so nothing can be kept or sent yet.</div>}

      <section className="pt-panel">
        <div className="pt-rpt__head">
          <h2 className="pt-panel__h">Sent</h2>
          <nav className="pt-seg" aria-label="Which reports">
            <Link href="/portal/board/reports" className={`pt-seg__b${!kind ? " is-on" : ""}`}>All</Link>
            {(["daily", "weekly", "monthly"] as ReportKind[]).map((k) => (
              <Link key={k} href={`/portal/board/reports?k=${k}`} className={`pt-seg__b${kind === k ? " is-on" : ""}`}>{KIND_LABEL[k]}</Link>
            ))}
          </nav>
        </div>
        {reports.length === 0 ? (
          <p className="pt-rep__empty">
            {all.length === 0 ? "None yet. The first goes at half past five on the next working day — or send one now, below." : "None of these yet."}
          </p>
        ) : (
          <div className="pt-fleet__wrap">
            <table className="pt-fleet pt-otab">
              <thead><tr><th>Report</th><th>What it said</th><th>Sent</th><th /></tr></thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <Link href={`/portal/board/reports/${encodeURIComponent(r.key)}`}><strong>{r.title}</strong></Link>
                      <span className="pt-fleet__sub">{KIND_LABEL[r.kind]}</span>
                    </td>
                    <td>{r.headline}</td>
                    <td>
                      {r.status === "sent" && r.sentAt
                        ? <><span className="pt-vstat pt-vstat--ok">Sent</span><span className="pt-fleet__sub">{when(r.sentAt)} · {r.sentTo.length} {r.sentTo.length === 1 ? "person" : "people"}</span></>
                        : r.status === "failed"
                          ? <><span className="pt-vstat pt-vstat--bad">Didn&rsquo;t send</span><span className="pt-fleet__sub">{r.error}</span></>
                          : <span className="pt-vstat pt-vstat--none">Kept, not sent</span>}
                    </td>
                    <td className="pt-otab__num"><SendAgainButton reportKey={r.key} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="pt-panel">
        <h2 className="pt-panel__h">Preview, or send one now</h2>
        <p className="pt-panel__sub">
          Each one as it will land in the inbox, from the figures as they are right now. From there you can send a copy to
          yourself, or send it to everyone early.
        </p>
        <div className="pt-rpt__kinds">
          {(["daily", "weekly", "monthly"] as ReportKind[]).map((k) => (
            <Link key={k} href={`/portal/board/reports/preview?k=${k}`} className="pt-rpt__kind">
              <strong>{KIND_LABEL[k]}</strong>
              <span>{k === "daily" ? "Every working day, half past five" : k === "weekly" ? "Last working day of the week" : "Last working day of the month"}</span>
              <em>Preview →</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="pt-panel" id="emails">
        <h2 className="pt-panel__h">Who gets them</h2>
        <p className="pt-panel__sub">Every report goes to everyone on this list.</p>
        <EmailListEditor id="report" initial={recipients} change={changeReportRecipient} empty="Nobody is on the list, so the reports are kept here but not emailed." />
      </section>
    </PortalShell>
  );
}
