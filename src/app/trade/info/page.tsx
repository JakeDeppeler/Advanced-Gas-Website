import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { INFO_SECTIONS, type InfoContentBlock } from "@/lib/portal/content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prices & info — Trade portal" };

function Block({ b }: { b: InfoContentBlock }) {
  return (
    <section className="tr-card tr-stack" style={{ gap: 12 }}>
      <h2>{b.title}</h2>
      {b.body?.map((p) => <p className="tr-prose" style={{ margin: 0 }} key={p}>{p}</p>)}
      {b.list && <ul className="tr-prose" style={{ margin: 0 }}>{b.list.map((i) => <li key={i}>{i}</li>)}</ul>}
      {b.rows && (
        <div className="tr-rows">
          {b.rows.map((r) => (
            <div className="tr-row" key={r.k}>
              <span className="tr-row__k"><strong>{r.k}</strong></span>
              <span className="tr-row__v">{r.v}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Prices, licences and who to ring — so every quote and every answer at a
 * front door lines up.
 *
 * The same INFO_SECTIONS the office portal reads. The licence numbers in
 * particular have exactly one home: a second copy of an ARC number is a second
 * chance to quote a wrong one at a customer.
 */
export default async function TradeInfo({ searchParams }: { searchParams: { section?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const section = INFO_SECTIONS.find((s) => s.slug === searchParams.section) ?? INFO_SECTIONS[0];

  return (
    <TradeShell user={user} active="/trade/info" title="Prices & info" sub="So every quote and every answer lines up">
      <div className="tr-stack">
        <nav className="tr-pills" aria-label="Information">
          {INFO_SECTIONS.map((s) => (
            <Link key={s.slug} href={`/trade/info?section=${s.slug}`} aria-current={s.slug === section.slug ? "page" : undefined} className={`tr-pill${s.slug === section.slug ? " is-on" : ""}`}>
              {s.label}
            </Link>
          ))}
        </nav>

        <div>
          <h2 style={{ fontSize: 24, lineHeight: "30px" }}>{section.title}</h2>
          {section.intro && <p className="tr-sub" style={{ margin: "4px 0 0" }}>{section.intro}</p>}
        </div>

        <div className="tr-infogrid">
          {section.blocks.map((b) => <Block key={b.title} b={b} />)}
        </div>

        <span className="tr-foot">
          Installed prices for a whole system are in <Link href="/trade/pricebook">the pricebook</Link>.
        </span>
      </div>
    </TradeShell>
  );
}
