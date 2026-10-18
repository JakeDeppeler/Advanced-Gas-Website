import { PageHead } from "@/components/portal/kit/PageHead";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { barSections, PortalShell } from "@/components/portal/PortalShell";
import { getBusiness } from "@/lib/portal/business";
import { BAR_COOKIE, readBar, readTheme, START_COOKIE, START_PAGES, THEME_COOKIE } from "@/lib/portal/businessTypes";
import { BusinessSettings, DeviceSettings, TopBarSettings } from "@/components/portal/shell/SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Team portal" };

/**
 * How the portal is set up: how it looks on this device and where it opens,
 * then the business — its name, and what it has, which decides what the side
 * bar shows everyone.
 */
export default async function SettingsPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const biz = await getBusiness();
  const admin = can(user, "manage_users");
  const office = can(user, "overhead");
  const starts = START_PAGES.filter((p) => !p.needs || (p.needs === "office" ? office : biz.has.wall && office));
  const saved = cookies().get(START_COOKIE)?.value;

  return (
    <PortalShell user={user}>
      <div className="sx">
      <PageHead title="Settings" line="How the portal looks on this device, what sits on the top bar, and what the business has." />
      <div className="ps">
        <DeviceSettings theme={readTheme(cookies().get(THEME_COOKIE)?.value)} start={starts.some((s) => s.key === saved) ? (saved as string) : "home"} starts={starts} />
        <TopBarSettings sections={barSections(user, biz).map((s) => ({ id: s.id, label: s.label }))} more={readBar(cookies().get(BAR_COOKIE)?.value)} />
        <BusinessSettings initial={biz} canEdit={admin} />
        {admin && (
          <div className="ps-card">
            <div className="ps-h"><b>The old portal</b><span>admins only, until it’s removed</span></div>
            <div className="ps-kv">
              <span className="t"><b>Home and side bar as they were</b><span>Kept for two weeks after the switch, to check nothing’s been lost. The pages themselves are the same.</span></span>
              <Link href="/portal/classic" className="ps-btn" style={{ textDecoration: "none" }}>Open</Link>
            </div>
          </div>
        )}
      </div>
    </div>
    </PortalShell>
  );
}
