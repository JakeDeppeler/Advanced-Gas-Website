import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Locked } from "@/components/portal/Locked";
import { KpiHead } from "@/components/portal/kit/Kit";
import { BrandAssets } from "@/components/portal/BrandAssets";
import { listFiles, listFolders } from "@/lib/portal/brandFiles";
import { dbConfigured } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing materials · Team portal" };

/**
 * Marketing › Materials, its own line rather than a tab of Campaigns: the
 * flyers, logos and artwork, in folders, each marked current or no longer used.
 */
export default async function MaterialsPage({ searchParams }: { searchParams: { f?: string; v?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Marketing materials" forWhom="managers" />;
  const [folders, files] = dbConfigured()
    ? await Promise.all([listFolders().catch(() => []), listFiles().catch(() => [])])
    : [[], []];
  const open = searchParams.f && folders.some((f) => f.id === searchParams.f) ? searchParams.f : null;
  const current = files.filter((f) => !f.archivedAt).length;
  const old = files.length - current;
  return (
    <PortalShell user={user}>
      <KpiHead title={<>Marketing<br />materials</>} kpis={[
        { icon: "doc", fig: String(current), label: "Current, in use" },
        { icon: "clock", fig: String(old), label: "No longer used" },
        { icon: "bars", fig: String(folders.filter((f) => !f.archivedAt).length), label: "Folders" },
      ]} />
      <p className="pk-note td-intro">Flyers, logos, artwork, PDFs and photos. Upload and download PNG and PDF; mark what&rsquo;s no longer used so nobody sends the old one.</p>
      <BrandAssets folders={folders} files={files} folderId={open} archived={searchParams.v === "archived"} canEdit />
    </PortalShell>
  );
}
