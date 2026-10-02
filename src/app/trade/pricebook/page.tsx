import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { PB_CATEGORIES, shelf, sizeOf } from "@/lib/portal/installPrices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricebook — Trade portal" };

/**
 * The pricebook, for quoting in a kitchen.
 *
 * Every figure on this screen is one the website already quotes, from the
 * service pages' published tiers. The catalogue holds no per-model installed
 * price — `installedPriceFrom` is empty on all 100 models — so a card shows a
 * price only where a tier identifies that exact model, and the shelf's tiers
 * sit above the cards as what we quote from. Nothing here is a figure somebody
 * would have to defend in a driveway without having agreed to it first.
 */
export default async function TradePricebook({ searchParams }: { searchParams: { cat?: string; size?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const s = shelf(searchParams.cat ?? PB_CATEGORIES[0].key);
  const size = searchParams.size && s.sizes.includes(searchParams.size) ? searchParams.size : null;
  const items = size ? s.items.filter((i) => sizeOf(i) === size) : s.items;

  return (
    <TradeShell
      user={user} active="/trade/pricebook"
      title="Pricebook"
      sub="Installs · compare options side by side"
      action={<Link href="/trade/calc" className="tr-btn">Does it pay?</Link>}
    >
      <div className="tr-stack">
        <nav className="tr-pills" aria-label="Product types">
          {PB_CATEGORIES.map((c) => (
            <Link key={c.key} href={`/trade/pricebook?cat=${c.key}`} aria-current={c.key === s.cat.key ? "page" : undefined} className={`tr-pill${c.key === s.cat.key ? " is-on" : ""}`}>
              {c.label}
            </Link>
          ))}
        </nav>

        <span className="tr-sub">{s.cat.blurb}</span>

        {s.tiers.length > 0 ? (
          <section className="tr-quotes">
            {s.tiers.map((t) => (
              <article className="tr-quote" key={t.tier}>
                <span className="tr-quote__k">{t.priceKey}</span>
                <strong className="tr-quote__p">{t.price}</strong>
                <span className="tr-quote__t">{t.tier}</span>
                <ul className="tr-quote__in">
                  {t.includes.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </article>
            ))}
          </section>
        ) : (
          <div className="tr-note">
            {/* Said plainly rather than drawn as an empty price. The heat pumps
                are the gap that matters: they are the biggest job on the board
                and the only figures anywhere are the ones on a quote. */}
            <strong>No published price for this shelf yet.</strong> We measure up and price these on site. The specs
            below are the catalogue&rsquo;s, and the rebate column is what the VEU allows.
          </div>
        )}

        {s.sizes.length > 1 && (
          <nav className="tr-pills" aria-label="Size">
            <Link href={`/trade/pricebook?cat=${s.cat.key}`} aria-current={size ? undefined : "page"} className={`tr-pill${size ? "" : " is-on"}`}>
              All sizes
            </Link>
            {s.sizes.map((z) => (
              <Link key={z} href={`/trade/pricebook?cat=${s.cat.key}&size=${encodeURIComponent(z)}`} aria-current={z === size ? "page" : undefined} className={`tr-pill${z === size ? " is-on" : ""}`}>
                {z}
              </Link>
            ))}
          </nav>
        )}

        <div className="tr-models">
          {items.map((i) => (
            <article className="tr-model" key={`${i.brandSlug}/${i.slug}`}>
              <div className="tr-model__head">
                <span className="tr-model__brand">{i.brand}</span>
                <h3>{i.name}</h3>
                <span className="tr-sub">{i.bestFor}</span>
              </div>

              <dl className="tr-model__specs">
                {i.specs.slice(0, 5).map((sp) => (
                  <div key={sp.label}>
                    <dt>{sp.label}</dt>
                    <dd>{sp.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="tr-model__foot">
                {i.tier ? (
                  <>
                    <strong className="tr-model__p">{i.tier.price}</strong>
                    <span className="tr-foot">{i.tier.priceKey.toLowerCase()} · {i.tier.tier}</span>
                  </>
                ) : (
                  <>
                    <strong className="tr-model__p tr-model__p--none">Priced on site</strong>
                    <span className="tr-foot">
                      {s.tiers.length ? "No tier covers this model — quote it from the ones above." : "We measure up and price it."}
                    </span>
                  </>
                )}
                {i.veu && <span className="tr-veu">VEU rebate comes off this</span>}
                <Link href={i.href} className="tr-btn" target="_blank" rel="noopener">The full spec ↗</Link>
              </div>
            </article>
          ))}
        </div>

        {items.length === 0 && <p className="tr-empty">Nothing on this shelf at that size.</p>}

        <span className="tr-foot">
          Service and call-out prices are in <Link href="/trade/info?section=pricing">Prices &amp; info</Link>.
          Sending a customer their own copy of a quote isn&rsquo;t built yet — quotes still go out of ServiceTitan.
        </span>
      </div>
    </TradeShell>
  );
}
