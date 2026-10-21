import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { dbConfigured } from "@/lib/portal/db";
import { listTrouble } from "@/lib/email/read";
import { EmailTrouble } from "@/components/portal/EmailTrouble";
import { Head, Say } from "@/components/portal/kit/Kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email that didn't arrive — Team portal" };

/**
 * The list behind the wall board's email alert.
 *
 * Every email the business sends is recorded now — the enquiry notifications,
 * the sign-in links, the supplier orders, the reports — and this is the two
 * ways one can fail: refused on the way out, or bounced back afterwards.
 * Marking one sorted is what takes the alert off the board, and the only
 * thing that does.
 */
export default async function EmailPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Email" forWhom="managers" />;

  const rows = dbConfigured() ? await listTrouble().catch(() => []) : [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/section/settings" label="Settings" />
      <div className="pk">
        <Head
          title="Email that didn’t arrive"
          sub="Refused on the way out, or bounced back after"
          info={[
            ["Didn’t send", "Resend refused it when we tried — a key that has expired, a domain that isn’t verified, a rate limit. Nobody was ever going to get it, and it can usually be sent again once the cause is fixed."],
            ["Bounced", "Resend accepted it and the other end refused it: a mistyped address, a mailbox that is full or closed. The message is gone and the only fix is a person."],
            ["Sorted", "Takes it off the wall board. It does not resend anything — it means somebody has dealt with it."],
          ]}
        />
        {rows.length > 0 && (
          <Say>
            <b>{rows.length}</b> {rows.length === 1 ? "email" : "emails"} never reached anybody. The wall board says so until each one is marked sorted.
          </Say>
        )}
        <EmailTrouble rows={rows} />
      </div>
    </PortalShell>
  );
}
