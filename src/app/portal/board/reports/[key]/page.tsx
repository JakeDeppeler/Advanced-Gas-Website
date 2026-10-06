import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { ReportView } from "@/components/portal/ReportView";
import { SendAgainButton } from "@/components/portal/ReportButtons";
import { getReport } from "@/lib/reports/store";
import { KIND_LABEL } from "@/lib/reports/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report — Team portal" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

/** One report, as it was sent. */
export default async function ReportPage({ params }: { params: { key: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Reports" forWhom="managers" />;
  const r = await getReport(decodeURIComponent(params.key)).catch(() => null);
  if (!r) notFound();

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/board/reports" label="Reports" />
      <div className="pt-head pt-head--split">
        <div>
          <div className="pt-head__eyebrow">{KIND_LABEL[r.kind]} report</div>
          <h1>{r.title}</h1>
          <p>
            {r.headline}.{" "}
            {r.status === "sent" && r.sentAt ? `Sent ${when(r.sentAt)} to ${r.sentTo.join(", ")}.` : r.status === "failed" ? `It didn't send: ${r.error}.` : "Kept, not sent."}
            {r.figuresAt ? ` The board's figures as they stood at ${new Date(r.figuresAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Melbourne" })}.` : ""}
          </p>
        </div>
        <SendAgainButton reportKey={r.key} />
      </div>
      <ReportView r={r} />
    </PortalShell>
  );
}
