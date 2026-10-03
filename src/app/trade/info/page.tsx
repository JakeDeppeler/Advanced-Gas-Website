import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { INFO_SECTIONS, type InfoContentBlock } from "@/lib/portal/content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prices & info — Trade portal" };

/**
 * The tabs, in the design's order. The office keeps prices and call-outs as
 * one section; on the iPad they're two tabs, because "what's a split service"
 * and "what do we charge after hours" are asked at different doors.
 */
const pricing = INFO_SECTIONS.find((s) => s.slug === "pricing");
const TABS: { slug: string; label: string; blocks: InfoContentBlock[] }[] = [
  { slug: "pricing", label: "Service prices", blocks: pricing ? pricing.blocks.slice(0, 1) : [] },
  { slug: "hours", label: "Hours & call-outs", blocks: pricing ? pricing.blocks.slice(1) : [] },
  ...["licences", "contact", "business", "roles", "history"].flatMap((slug) => {
    const s = INFO_SECTIONS.find((x) => x.slug === slug);
    return s ? [{ slug, label: slug === "contact" ? "Head office" : s.label, blocks: s.blocks }] : [];
  }),
];

function Block({ b }: { b: InfoContentBlock }) {
  const navy = b.tone === "navy";
  const big = b.as === "price" || b.as === "copy" || b.as === "stat";
  return (
    <section className={`tr-card${navy ? " tr-card--navy" : ""}`} style={b.span === "full" || b.as === "price" ? { gridColumn: "1 / -1" } : undefined}>
      {b.title && b.as !== "stat" && <h2 style={{ paddingBottom: 6, color: navy ? "#fff" : undefined }}>{b.title}</h2>}
      {b.as === "facts" && b.rows ? (
        <div className="tr-grid tr-grid--3">
          {b.rows.map((r) => <div key={r.k} className="tr-fig"><span>{r.k}</span><strong>{r.v}</strong></div>)}
        </div>
      ) : b.rows ? (
        <div className="tr-rows">
          {b.rows.map((r) => (
            <div key={r.k} className="tr-row" style={{ minHeight: 64, borderColor: navy ? "rgba(255,255,255,.14)" : undefined }}>
              <span className="tr-row__k">
                <strong style={{ fontSize: 17 }}>{b.as === "stat" ? r.v : r.k}</strong>
                {r.note && <span className={navy ? "tr-muted" : undefined}>{r.note}</span>}
              </span>
              {b.as !== "stat" && (
                <span className="tr-row__v" style={big ? { fontFamily: "var(--f-display)", fontWeight: 900, fontSize: 19, userSelect: "all" } : { fontWeight: 700, fontSize: 16 }}>{r.v}</span>
              )}
              {b.as === "stat" && r.href && <a href={r.href} className="tr-btn tr-btn--go">Call</a>}
            </div>
          ))}
        </div>
      ) : null}
      {b.people && (
        <div className="tr-rows">
          {b.people.map((p) => (
            <div key={p.name} className="tr-row">
              <span className="tr-row__k"><strong>{p.name}</strong><span>{p.role} · {p.detail}</span></span>
            </div>
          ))}
        </div>
      )}
      {b.chips && <div className="tr-pills" style={{ margin: "6px 0 10px" }}>{b.chips.map((c) => <span key={c} className="tr-chip" style={{ fontSize: 15, minHeight: 36 }}>{c}</span>)}</div>}
      {b.body?.map((p) => <p key={p} className="tr-prose" style={{ fontSize: 16, color: navy ? "rgba(255,255,255,.85)" : undefined }}>{p}</p>)}
      {b.list && <ul className="tr-prose" style={{ margin: 0, paddingLeft: 20, fontSize: 16 }}>{b.list.map((i) => <li key={i}>{i}</li>)}</ul>}
    </section>
  );
}

/**
 * Prices, licences and who to ring — so every quote and every answer at a
 * front door lines up. The same INFO_SECTIONS the office reads: a licence
 * number has exactly one home, because a second copy is a second chance to
 * read a wrong one to a customer.
 */
export default async function TradeInfo({ searchParams }: { searchParams: { section?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const tab = TABS.find((t) => t.slug === searchParams.section) ?? TABS[0];

  return (
    <TradeShell user={user} active="tools" title="Prices & info" sub="So every quote and every answer lines up">
      <nav className="tr-pills" aria-label="Information">
        {TABS.map((t) => (
          <Link key={t.slug} href={`/trade/info?section=${t.slug}`} aria-current={t.slug === tab.slug ? "page" : undefined} className={`tr-pill${t.slug === tab.slug ? " is-on" : ""}`}>{t.label}</Link>
        ))}
      </nav>
      <div className="tr-grid tr-grid--2">
        {tab.blocks.map((b, i) => <Block key={b.title ?? i} b={b} />)}
      </div>
      {tab.slug === "pricing" && (
        <p className="tr-small">Quote from these. Anything different, check with Jake first. Installed prices are in <Link href="/trade/pricebook" className="tr-link">the pricebook</Link>.</p>
      )}
    </TradeShell>
  );
}
