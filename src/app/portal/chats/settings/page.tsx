import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { getChatSettings } from "@/lib/chat/store";
import { ChatSettingsForm } from "@/components/portal/ChatSettingsForm";
import "../chats.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chat settings · Team portal" };

export default async function ChatSettingsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Chat settings" forWhom="managers" />;
  const settings = await getChatSettings();

  return (
    <PortalShell user={user}>
      <div className="pt-head">
        <PortalBack href="/portal/chats" label="Customer chats" />
        <h1>Chat settings</h1>
        <p>
          Whether the website shows the chat, and what the assistant works from. It already knows everything on the website: services, published
          prices, the FAQs, suburbs and hours. Add here only what the website doesn&rsquo;t say.
        </p>
      </div>
      <ChatSettingsForm initial={settings} />
    </PortalShell>
  );
}
