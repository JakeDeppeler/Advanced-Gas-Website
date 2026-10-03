import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Needs } from "@/components/portal/marketingParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer chats — Team portal" };

/**
 * Every quote conversation in one inbox. There isn't a conversation anywhere
 * the portal can read yet: quotes go out through ServiceTitan by email, and
 * replies land in people's own inboxes and phones.
 */
export default async function ChatsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Customer chats" forWhom="managers" />;

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <div className="pt-head">
        <h1>Customer chats</h1>
        <p>Every quote conversation in one place — who&rsquo;s waiting on us, and who we&rsquo;re waiting on.</p>
      </div>
      <Needs
        title="What this needs"
        body="The conversations happen by text and email outside the portal, so there is nothing here to list yet. Any one of these gives this page something to read."
        bullets={[
          "The customer quote link from the design — the customer picks an option and messages us on the same page, and every message lands here",
          "Or an SMS number the office texts from, connected so its messages come in here",
          "Or ServiceTitan's customer messaging, if it's switched on for the account",
        ]}
      />
    </PortalShell>
  );
}
