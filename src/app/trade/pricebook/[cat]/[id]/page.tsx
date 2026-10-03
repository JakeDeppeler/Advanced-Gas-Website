import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { TradeShell } from "@/components/portal/TradeShell";
import { ProductArt } from "@/components/portal/ProductArt";
import { AddToQuote } from "@/components/portal/QuoteBits";
import { findProduct } from "@/lib/portal/pricebook";
import { PB_CATEGORIES } from "@/lib/portal/installPrices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricebook — Trade portal" };

/** One model: the picture, the price and what's in it, the specs. */
export default async function TradeProduct({ params }: { params: { cat: string; id: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  const cat = PB_CATEGORIES.find((c) => c.key === params.cat);
  const p = cat ? findProduct(cat.key, decodeURIComponent(params.id)) : null;
  if (!cat || !p) notFound();

  return (
    <TradeShell user={user} active="pricebook" title="Pricebook" sub="Photos, specs and the installed price">
      <Link href={`/trade/pricebook/${cat.key}`} className="tr-back">← {cat.label}</Link>

      <div className="tr-split" style={{ ["--tr-side" as string]: "520px" }}>
        <section className="tr-card" style={{ padding: 14 }}>
          <div className="tr-art tr-art--hero"><ProductArt kind={p.art} label={`${p.brand} ${p.name}`} /></div>
        </section>
        <section className="tr-card tr-stack" style={{ gap: 10 }}>
          {p.tag && <span className="tr-chip" style={{ alignSelf: "flex-start" }}>{p.tag}</span>}
          <span className="tr-prod__brand" style={{ fontSize: 16 }}>{p.brand}</span>
          <h2 style={{ fontSize: 30, lineHeight: "36px", fontWeight: 900 }}>{p.name}</h2>
          <p className="tr-muted">{p.blurb}</p>
          <span className="tr-big" style={{ fontSize: 44, lineHeight: "50px" }}>{p.priceLabel ?? "Priced on site"}</span>
          <p className="tr-small">{p.price == null ? "No published price matches this exact model. We measure up and price it." : p.priceNote}</p>
          {p.veu && <p className="tr-note tr-note--good">Eligible for the VEU rebate.</p>}
          <div className="tr-grid tr-grid--2" style={{ gap: 10 }}>
            <AddToQuote big option={{ id: p.id, cat: p.cat, brand: p.brand, name: p.name, price: p.price, priceLabel: p.priceLabel, priceNote: p.priceNote, art: p.art }} />
            <a href={p.href} target="_blank" rel="noopener" className="tr-btn">Show the customer ↗</a>
          </div>
        </section>
      </div>

      <div className="tr-grid tr-grid--2">
        <section className="tr-card">
          <h2 style={{ paddingBottom: 6 }}>Specs</h2>
          <dl className="tr-specs" style={{ margin: 0 }}>
            {p.specs.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
          </dl>
        </section>
        <section className="tr-card">
          <h2 style={{ paddingBottom: 6 }}>What&rsquo;s included</h2>
          {p.includes.length ? (
            <ul className="tr-prose" style={{ margin: 0, paddingLeft: 20, fontSize: 16 }}>
              {p.includes.map((x) => <li key={x}>{x}</li>)}
            </ul>
          ) : (
            <p className="tr-empty">Priced on site, so what&rsquo;s in it is written on the quote.</p>
          )}
        </section>
      </div>
    </TradeShell>
  );
}
