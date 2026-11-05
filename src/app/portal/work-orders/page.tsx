import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { dbConfigured } from "@/lib/portal/db";
import { Card, Head, Say } from "@/components/portal/kit/Kit";
import { WorkOrderList } from "@/components/portal/WorkOrderList";
import { WorkOrderSettingsForm } from "@/components/portal/WorkOrderSettingsForm";
import { getWorkOrderSettings, listWorkOrders } from "@/lib/outlook/workOrderList";
import "../chats/chats.css";
import "./work-orders.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work orders · Team portal" };

/**
 * Work orders from email (lib/outlook/workOrders.ts): what came in, what went
 * into ServiceTitan, whether the tenant was emailed, and the wording they're
 * sent. The office's view, as the chat inbox is; the wording is managers'.
 */
export default async function WorkOrdersPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead") && !can(user, "quotes")) return <Locked user={user} what="Work orders" forWhom="the office" />;

  const [rows, settings] = dbConfigured() ? await Promise.all([listWorkOrders().catch(() => []), getWorkOrderSettings()]) : [[], await getWorkOrderSettings()];
  const booked = rows.filter((r) => r.status === "booked").length;
  const waiting = rows.filter((r) => r.status === "failed").length;
  const emailed = rows.filter((r) => r.tenant_emailed_at).length;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/chats" label="Messages" />
      <div className="pk">
        <Head
          title="Work orders"
          sub="From admin@ and jake@ into ServiceTitan's Bookings"
          info={[
            ["What's read", "Every email in admin@ and jake@ that looks like a work order: a new job, a request to quote, or a quote accepted. Progress updates, invoices and statements aren't."],
            ["By hand", "Forward one to admin@ from an @advancedgas.com.au address, or give it the Outlook category “Work order”. Either books it, even one the automatic read turned down."],
            ["In Bookings", "It's in ServiceTitan's Bookings for the office to turn into a job. Once it is, the work order and the email go on the job's attachments."],
            ["Already booked", "A reminder or resend of a work order booked from an earlier email: same number, or same address and kind. Not booked twice."],
          ]}
        />
        <Say>
          Last 30 days: <b>{booked}</b> booked into ServiceTitan, <b>{emailed}</b> tenants emailed
          {waiting ? (
            <>
              , <b>{waiting}</b> not booked yet
            </>
          ) : null}
          .
        </Say>
        <WorkOrderList rows={rows} />
        <Card title="The email to the tenant">
          <WorkOrderSettingsForm initial={settings} canEdit={can(user, "overhead")} />
        </Card>
      </div>
    </PortalShell>
  );
}
