import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { Head, Say } from "@/components/portal/kit/Kit";
import { portalNav } from "@/lib/portal/nav";
import { getBusiness } from "@/lib/portal/business";
import { buildSections, flatPages } from "@/lib/portal/sections";
import { Icon } from "@/components/portal/shell/Menu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily tools · Team portal" };

/**
 * Daily tools opens here: a box for each tool, and you pick the one you want.
 * Jake, 25 Nov: "when you click the daily tools [it] should show the box and
 * you click what tool you want to use". The boxes are the area's own pages
 * (sections.ts) that this person can open, each with the line portalNav
 * writes for it, so a tool added to the area gets its box without touching
 * this page, and nobody sees a box that would turn them away.
 */
export default async function DailyToolsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const items = portalNav(user);
  const office = can(user, "overhead") || can(user, "manage_users");
  const area = buildSections(items, await getBusiness(), office).find((s) => s.id === "tools");
  const blurb = new Map(items.map((i) => [i.href, i.blurb]));
  const tools = flatPages(area?.pages ?? []).filter((p) => p.href !== "/portal/daily");

  return (
    <PortalShell user={user}>
      <div className="pk">
        <Head title="Daily tools" sub="Pick the tool you want." />
        {tools.length ? (
          <nav className="pk-toolgrid" aria-label="Daily tools">
            {tools.map((t) => (
              <Link key={t.href} href={t.href} className="pk-toolbox">
                <span className="pk-toolbox-ic" aria-hidden="true"><Icon name={t.icon ?? "wrench"} size={22} /></span>
                <b>{t.label}</b>
                {blurb.get(t.href) && <span>{blurb.get(t.href)}</span>}
              </Link>
            ))}
          </nav>
        ) : (
          <Say>None of the daily tools are open to you yet. Ask the office.</Say>
        )}
      </div>
    </PortalShell>
  );
}
