import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { SearchResults } from "@/components/portal/SearchResults";
import { buildSearchIndex } from "@/lib/portal/searchIndex";
import { portalNav } from "@/lib/portal/nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search — Team portal" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal" label="Home" />
      <SearchResults rows={buildSearchIndex(portalNav(user))} initial={searchParams.q ?? ""} />
    </PortalShell>
  );
}
