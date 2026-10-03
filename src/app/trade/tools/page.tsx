import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, Ic } from "@/components/portal/TradeShell";
import { TRADE_TOOLS } from "@/lib/portal/tradeNav";
import { SOP_CHANGES } from "@/lib/portal/sops";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tools — Trade portal" };

/** Everything you look up on site, one tap down. */
export default async function TradeTools() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  // The procedures changed in the latest version — C6 says a change is told to everyone.
  const changed = SOP_CHANGES[0]?.items.length ?? 0;

  return (
    <TradeShell user={user} active="tools" title="Tools" sub="Everything you look up on site">
      <form action="/trade/search" className="tr-search">
        <Ic n="search" size={20} />
        <input type="search" name="q" placeholder="Search fault codes, processes, prices…" aria-label="Search" />
      </form>
      <div className="tr-grid tr-grid--3">
        {TRADE_TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="tr-tile" style={{ minHeight: 196 }}>
            <span className={`tr-tile__ic${t.tint ? " tr-tile__ic--warn" : ""}`} style={{ width: 54, height: 54 }}><Ic n={t.icon} /></span>
            {t.href === "/trade/processes" && changed > 0 && (
              <span className="tr-tile__badge"><span className="tr-chip tr-chip--warn">{changed} changed</span></span>
            )}
            <span>
              <span className="tr-tile__t" style={{ fontSize: 22 }}>{t.label}</span>
              <span className="tr-tile__s">{t.sub}</span>
            </span>
          </Link>
        ))}
      </div>
      <Link href="/trade/calc" className="tr-card tr-row" style={{ padding: "12px 22px" }}>
        <span className="tr-row__ic tr-row__ic--grey"><Ic n="calc" /></span>
        <span className="tr-row__k"><strong>Does the job pay?</strong><span>Check a job covers your time before you quote it</span></span>
        <span className="tr-row__go"><Ic n="chevron" size={18} /></span>
      </Link>
    </TradeShell>
  );
}
