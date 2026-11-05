import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { KpiHead } from "@/components/portal/kit/Kit";
import { BrandAssets } from "@/components/portal/BrandAssets";
import { listFiles, listFolders } from "@/lib/portal/brandFiles";
import { dbConfigured } from "@/lib/portal/db";
import { PB_CATEGORIES } from "@/lib/portal/installPrices";
import { OurPrices, SupplierLinks } from "@/components/portal/ResourceLinks";
import { loadLinks } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resources · Team portal" };

/**
 * Team › Resources: price lists, product information, tech and install
 * sheets, manuals, in folders, with a search across all of them. Everyone
 * can open and download, crew included, since they need the manual on site;
 * the office adds, moves and retires. The same library as Marketing ›
 * Materials, its own shelf (0102).
 */
export default async function ResourcesPage({ searchParams }: { searchParams: { f?: string; v?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const canEdit = can(user, "overhead");
  const [folders, files, links] = dbConfigured()
    ? await Promise.all([listFolders("resources").catch(() => []), listFiles("resources").catch(() => []), loadLinks()])
    : [[], [], []];
  const open = searchParams.f && folders.some((f) => f.id === searchParams.f) ? searchParams.f : null;
  const current = files.filter((f) => !f.archivedAt).length;
  const priceLists = folders.find((f) => !f.parentId && /price/i.test(f.name));
  const inPrice = (id: string): boolean => {
    for (let f = folders.find((x) => x.id === id); f; f = f.parentId ? folders.find((x) => x.id === f!.parentId) : undefined) if (f.id === priceLists?.id) return true;
    return false;
  };
  return (
    <PortalShell user={user}>
      <KpiHead title="Resources" kpis={[
        { icon: "doc", fig: String(current), label: "Files in use" },
        { icon: "tag", fig: String(files.filter((f) => !f.archivedAt && f.folderId && inPrice(f.folderId)).length), label: "Price lists" },
        { icon: "bars", fig: String(folders.filter((f) => !f.archivedAt).length), label: "Folders" },
      ]} />
      <p className="pk-note td-intro">
        Price lists, product information, tech and install sheets, and manuals, by brand. Search finds a file in any folder.
        {canEdit ? " Mark an old price list no longer used when the new one comes in, so nobody quotes from it." : ""}
      </p>
      {searchParams.v !== "archived" && (!open || open === priceLists?.id) && <OurPrices shelves={PB_CATEGORIES.map(({ key, label }) => ({ key, label }))} />}
      <BrandAssets library="resources" folders={folders} files={files} folderId={open} archived={searchParams.v === "archived"} canEdit={canEdit} />
      {!open && searchParams.v !== "archived" && <SupplierLinks links={links} canEdit={canEdit} />}
    </PortalShell>
  );
}
