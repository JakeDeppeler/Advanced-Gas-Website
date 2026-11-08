import { notFound, redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { EmailTemplateEditor } from "@/components/portal/emails/EmailTemplateEditor";
import { listEmailPhotos, listVersions, loadTemplate, loadTemplates } from "@/lib/email/templates/store";
import { KEY } from "@/lib/email/templates/defaults";
import "../emails.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit email · Team portal" };

/** One customer email in the editor (components/portal/emails/EmailTemplateEditor.tsx). */
export default async function EmailEditPage({ params, searchParams }: { params: { key: string }; searchParams: { new?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Customer emails" forWhom="managers" />;
  const key = decodeURIComponent(params.key);
  if (!KEY.test(key)) notFound();

  const [t, versions, uploads, all] = await Promise.all([loadTemplate(key), listVersions(key), listEmailPhotos(), loadTemplates()]);
  if (!t) notFound();
  const siblings = t.series ? all.templates.filter((x) => x.series === t.series && x.key !== t.key) : [];

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/emails" label="Customer emails" />
      {/* Remounted with the saved copy after a save, a reset or a restore, so what's on screen is what's stored. */}
      <EmailTemplateEditor key={`${t.editedAt ?? "standard"}:${versions[0]?.id ?? ""}`} initial={t} versions={versions} uploads={uploads} siblings={siblings} isNew={searchParams.new === "1"} />
    </PortalShell>
  );
}
