import type { Metadata } from "next";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { HeroQuote } from "@/components/homepage/HeroQuote";
import { Crumbs, Hero } from "@/components/homepage/page/kit";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

export const metadata: Metadata = {
  title: "Get a Free Quote, Pakenham VEU-applied",
  description:
    "Free, no-obligation quote in 60 seconds. Licensed Pakenham aircon and heat pump specialists. We apply the VEU rebate at quote stage.",
  alternates: { canonical: "/quote" },
  robots: { index: true, follow: true },
};

/**
 * The quote page: the homepage's quote form, so every quote on the site goes
 * through the same steps and lands in the same place (/api/quote).
 */
export default function QuotePage() {
  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Get a quote" }]} />
      <Hero
        eye="Free quote · usually back within 12 hrs"
        title={<>Tell us what you need. Get a <em>written price.</em></>}
        sub="A few quick taps, no obligation and no spam. We reply with a written quote within 12 business hours."
        ctas={false}
      />
      <section className="pxs" data-hide-sticky-cta>
        <div className="wrap kx2 kxq2">
          <div className="kx__prose">
            <span className="aeye"><i /> What you get</span>
            <h2 className="h2 h2--sm">No tricks. Just a real price.</h2>
            <ul className="pp__hl">
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>VEU rebate handled for you.</strong> For eligible homes we apply it at the quote, so you never chase it.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Licensed plumbing &amp; refrigeration.</strong> Compliance certificate on completion.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>6-year workmanship warranty</strong> on every install.</p></li>
              <li><span aria-hidden="true">✓</span><p className="kx__li"><strong>Same-week installation.</strong> Most jobs scheduled within 5–7 days of approval.</p></li>
            </ul>
            <p>Prefer to talk? Call <a href="tel:+61359478000">(03) 5947 8000</a>, {openingHours()}. After hours goes to someone on the tools.</p>
            <p>Not sure what you need yet? <Link href="/#find">Find your system</Link> or <Link href="/tools/sizing-calculator">work out the size</Link>.</p>
          </div>
          <HeroQuote />
        </div>
      </section>
    </div>
  );
}
