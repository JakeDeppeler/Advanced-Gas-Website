import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { ProductArt } from "@/components/portal/ProductArt";
import { AddToQuote, QuotePill } from "@/components/portal/QuoteBits";
import { productHref, shelfProducts } from "@/lib/portal/pricebook";
import { PB_CATEGORIES, shelf } from "@/lib/portal/installPrices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricebook — Trade portal" };

/** One shelf: every model on it, priced ones first, to compare and add to the quote. */
export default async function TradeShelf({ params }: { params: { cat: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const cat = PB_CATEGORIES.find((c) => c.key === params.cat);
  if (!cat) notFound();

  const items = shelfProducts(cat.key);
  const tiers = shelf(cat.key).tiers;

  return (
    <TradeShell user={user} active="pricebook" title="Pricebook" sub="Compare and add to the quote · prices installed, inc GST">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <nav className="tr-pills" aria-label="Shelves" style={{ flex: "1 1 600px" }}>
          {PB_CATEGORIES.map((c) => (
            <Link key={c.key} href={`/trade/pricebook/${c.key}`} aria-current={c.key === cat.key ? "page" : undefined} className={`tr-pill${c.key === cat.key ? " is-on" : ""}`}>{c.label}</Link>
          ))}
        </nav>
        <QuotePill />
      </div>

      {tiers.length > 0 && items.every((i) => i.price == null) && (
        <p className="tr-note">
          No model on this shelf matches a published tier exactly, so each is priced on site. What we quote from:{" "}
          {tiers.map((t) => `${t.tier} ${t.price}`).join(" · ")}.
        </p>
      )}

      <div className="tr-grid tr-grid--3">
        {items.map((p) => (
          <article key={p.id} className="tr-card tr-prod">
            <Link href={productHref(p)} className="tr-art tr-art--tall" style={{ textDecoration: "none" }}>
              {p.tag && <span className="tr-art__tag tr-chip tr-chip--navy">{p.tag}</span>}
              <ProductArt kind={p.art} label="" />
            </Link>
            <div className="tr-prod__b">
              <span className="tr-prod__brand">{p.brand}</span>
              <Link href={productHref(p)} className="tr-prod__name" style={{ textDecoration: "none" }}>{p.name}</Link>
              <span className="tr-small">{p.blurb}</span>
              {p.chips.length > 0 && (
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                  {p.chips.map((c) => <span key={c.k} className="tr-chip tr-chip--plain">{c.k}: {c.v}</span>)}
                </span>
              )}
              <span className={`tr-prod__price${p.price == null ? " tr-prod__price--none" : ""}`} style={{ marginTop: 8 }}>{p.priceLabel ?? "Priced on site"}</span>
              <span className="tr-small">{p.price == null ? (tiers.length ? "No tier is written for this exact model" : "We measure up and price it") : p.priceNote}</span>
            </div>
            <div className="tr-prod__foot">
              <Link href={productHref(p)} className="tr-btn">Details</Link>
              <AddToQuote option={{ id: p.id, cat: p.cat, brand: p.brand, name: p.name, price: p.price, priceLabel: p.priceLabel, priceNote: p.priceNote, art: p.art }} />
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && <p className="tr-card tr-empty">Nothing on this shelf in the catalogue yet.</p>}
    </TradeShell>
  );
}
