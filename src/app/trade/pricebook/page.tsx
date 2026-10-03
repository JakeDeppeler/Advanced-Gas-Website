import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell, Ic } from "@/components/portal/TradeShell";
import { ProductArt } from "@/components/portal/ProductArt";
import { QuotingFor } from "@/components/portal/QuoteBits";
import { money, productHref, shelfCards, shelfProducts } from "@/lib/portal/pricebook";
import { PB_CATEGORIES } from "@/lib/portal/installPrices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricebook — Trade portal" };

/**
 * The pricebook's front: who you're quoting, and the shelves. A search lists
 * matching models across every shelf instead.
 */
export default async function TradePricebook({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");

  const needle = (searchParams.q ?? "").trim().toLowerCase();
  const found = needle
    ? PB_CATEGORIES.flatMap((c) => shelfProducts(c.key)).filter((p) => `${p.brand} ${p.name} ${p.chips.map((c) => c.v).join(" ")} ${p.cat}`.toLowerCase().includes(needle)).slice(0, 30)
    : [];

  return (
    <TradeShell user={user} active="pricebook" title="Pricebook" sub="Installed prices, as published · inc GST">
      <QuotingFor />

      <form action="/trade/pricebook" className="tr-search">
        <Ic n="search" size={20} />
        <input type="search" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search systems, brands, sizes…" aria-label="Search the pricebook" />
      </form>

      {needle ? (
        <section className="tr-card">
          <h2 style={{ paddingBottom: 4 }}>{found.length ? `${found.length} ${found.length === 1 ? "match" : "matches"}` : "Nothing matches"}</h2>
          <div className="tr-rows">
            {found.map((p) => (
              <Link key={`${p.cat}/${p.id}`} href={productHref(p)} className="tr-row">
                <span className="tr-row__k">
                  <strong>{p.brand} {p.name}</strong>
                  <span>{PB_CATEGORIES.find((c) => c.key === p.cat)?.label}{p.chips.length ? ` · ${p.chips.map((c) => c.v).join(" · ")}` : ""}</span>
                </span>
                <span className="tr-row__v">{p.priceLabel ?? "On site"}</span>
                <span className="tr-row__go"><Ic n="chevron" size={18} /></span>
              </Link>
            ))}
          </div>
          {!found.length && <p className="tr-empty">Try a brand, a size like 7.1 kW, or a tank like 315 L.</p>}
        </section>
      ) : (
        <div className="tr-grid tr-grid--3">
          {shelfCards().map((s) => (
            <Link key={s.cat.key} href={`/trade/pricebook/${s.cat.key}`} className="tr-card tr-cat">
              <span className="tr-art"><ProductArt kind={s.art} label="" /></span>
              <span className="tr-cat__b">
                <span>
                  <strong>{s.cat.label}</strong>
                  <span className="tr-muted">{s.from != null ? `from ${money(s.from)}` : "Priced on site"}</span>
                </span>
                {s.veu && <span className="tr-chip tr-chip--good">VEU rebate</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </TradeShell>
  );
}
