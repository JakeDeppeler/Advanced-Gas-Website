import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import type { Notice } from "@/lib/portal/notices";
import { tradeNotices } from "@/lib/portal/tradeNotices";
import { MarkRead } from "@/components/portal/MarkRead";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages — Trade portal" };

/** The office's notices point at office pages; on the iPad they open the trade one. */
function tradeHref(n: Notice, myVanId: string | null): string | null {
  if (n.href.startsWith("/portal/vehicles/")) return myVanId && n.href.endsWith(myVanId) ? "/trade/van" : null;
  if (n.href.startsWith("/portal/learning")) return "/trade/videos";
  if (n.href.startsWith("/portal/handbook")) return "/trade/handbook";
  return null;
}

/**
 * Messages: what the office has for you.
 *
 * The design draws customer conversations here too, copied to ServiceTitan job
 * notes. Nothing in the business sends or receives a customer text yet — there
 * is no SMS service connected — so that half is said plainly rather than drawn
 * as an inbox that never fills. What the office has for you is real: van checks
 * lapsing, new videos, handbook changes.
 */
export default async function TradeMessages() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const { notices: mine, unread, vanId } = await tradeNotices(user);

  return (
    <TradeShell user={user} active="messages" title="Messages" sub="From the office · customer texting isn't connected yet">
      <div className="tr-split tr-split--left" style={{ ["--tr-side" as string]: "320px" }}>
        <aside className="tr-card tr-stack" style={{ gap: 6, padding: 8 }}>
          <span className="tr-convo is-on">
            <strong>The office <span style={{ fontFamily: "var(--f-body)", fontSize: 14, fontWeight: 600 }}>{unread ? `${unread} new` : ""}</span></strong>
            <span>Your van, new videos, handbook changes</span>
          </span>
          <span className="tr-convo">
            <strong>Customers</strong>
            <span>Not connected yet. Customer messages still go through ServiceTitan.</span>
          </span>
        </aside>

        <section className="tr-card tr-thread">
          <div className="tr-thread__h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span>
              <strong style={{ fontFamily: "var(--f-display)", fontSize: 20, fontWeight: 800, display: "block" }}>The office</strong>
              <span className="tr-small">Clears when the thing it&rsquo;s about is done</span>
            </span>
            {unread > 0 && <MarkRead />}
          </div>
          <div className="tr-thread__body">
            {mine.length ? mine.map((n) => {
              const href = tradeHref(n, vanId);
              const body = (
                <>
                  <strong>{n.unread ? "● " : ""}{n.title}</strong>
                  {n.detail}
                  {n.when && <small>{n.when}</small>}
                </>
              );
              return href
                ? <Link key={`${n.title}|${n.detail}`} href={href} className="tr-bubble">{body}</Link>
                : <div key={`${n.title}|${n.detail}`} className="tr-bubble">{body}</div>;
            }) : (
              <p className="tr-empty">Nothing from the office. Your van&rsquo;s up to date.</p>
            )}
          </div>
        </section>
      </div>
    </TradeShell>
  );
}
