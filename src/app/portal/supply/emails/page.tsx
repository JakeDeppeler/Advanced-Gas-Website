import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PortalTabs } from "@/components/portal/PortalTabs";
import { Locked } from "@/components/portal/Locked";
import { SupplierEmails } from "@/components/portal/SupplierEmails";
import { loadOrderingSettings, loadSuppliers } from "@/lib/ordering/db";
import { DEFAULT_ORDER_INTRO, DEFAULT_ORDER_SIGNOFF, DEFAULT_WORK_INTRO, type Supplier } from "@/lib/ordering/plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier emails — Team portal" };

export default async function SupplierEmailsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Supply" forWhom="managers" />;

  let suppliers: Supplier[] = [];
  let replyTo = "";
  let dbReady = true;
  try {
    const [s, settings] = await Promise.all([loadSuppliers(), loadOrderingSettings()]);
    suppliers = s.filter((x) => x.active);
    replyTo = settings.replyTo;
  } catch {
    dbReady = false;
  }

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/supply" label="Supply" />
      <div className="pt-head">
        <h1>Supplier emails</h1>
        <p>
          Who each order goes to and how the email reads. Change the wording, then send yourself a sample to see it.
          Orders come from orders@advancedgas.com.au and replies go to {replyTo || "the office"}.
        </p>
      </div>
      <PortalTabs set="supply" />
      <SupplierEmails
        dbReady={dbReady}
        suppliers={suppliers}
        sampleTo={user.email}
        alwaysCc={replyTo || "The office"}
        defaults={{ orderIntro: DEFAULT_ORDER_INTRO, orderSignoff: DEFAULT_ORDER_SIGNOFF, workIntro: DEFAULT_WORK_INTRO }}
      />
    </PortalShell>
  );
}
