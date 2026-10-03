import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { SearchResults } from "@/components/portal/SearchResults";
import type { SearchRow } from "@/components/portal/PortalSearch";
import { buildSearchIndex } from "@/lib/portal/searchIndex";
import { portalNav } from "@/lib/portal/nav";
import { dbConfigured, handbookBodies, listVideos } from "@/lib/portal/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search — Team portal" };

/**
 * The full search, to Search.dc.html.
 *
 * Deeper than the bar's dropdown: it reads the words inside procedures,
 * handbook topics written in the portal and the videos' descriptions, and
 * shows the line that matched — which is what makes "drain" find the
 * procedure that tells you to clear one.
 */
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const [bodies, videos] = dbConfigured()
    ? await Promise.all([handbookBodies().catch(() => new Map()), listVideos().catch(() => [])])
    : [new Map(), []];

  const rows: SearchRow[] = [
    ...buildSearchIndex(portalNav(user), true),
    ...[...bodies.values()].map((b) => ({
      href: `/portal/handbook/${String(b.shelf).toLowerCase()}`,
      label: b.title as string,
      where: `Handbook · Shelf ${b.shelf}`,
      body: b.body as string,
    })),
    ...videos.map((v) => ({
      href: `/portal/learning/${v.track}/${v.id}`,
      label: v.title,
      where: "Learning · video",
      body: v.description ?? undefined,
      snip: v.description ?? undefined,
    })),
  ];

  return (
    <PortalShell user={user}>
      <div className="pt-narrow">
        <PortalBack href="/portal" label="Home" />
        <SearchResults rows={rows} initial={searchParams.q ?? ""} />
      </div>
    </PortalShell>
  );
}
