import type { Metadata } from "next";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { HeroQuote } from "@/components/homepage/HeroQuote";
import { Crumbs, Tiles } from "@/components/homepage/page/kit";
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
 *
 * The form sits in the header, beside the promise, so it's the first thing on
 * the screen. Everyone here has already decided to ask for a price; a full
 * screen of headline before the form only pushed it below the fold.
 */
const PROMISES: [string, string][] = [
  ["VEU rebate handled for you.", "For eligible homes we apply it at the quote, so you never chase it."],
  ["Licensed plumbing & refrigeration.", "Compliance certificate on completion."],
  ["6-year workmanship warranty", "on every install."],
  ["Same-week installation.", "Most jobs scheduled within 5–7 days of approval."],
];

export default function QuotePage() {
  return (
    // data-no-reveal: the redesign pages opt out of the old site's scroll reveal.
    <div className="ag ag--flat" data-no-reveal>
      <Crumbs trail={[{ name: "Get a quote" }]} />
      <section className="qpg" data-hide-sticky-cta>
        <div className="wrap qpg__in">
          <div className="qpg__copy">
            <span className="lk2__eye">Free quote · usually back within 12 hrs</span>
            <h1 className="qpg__h1">Tell us what you need. Get a <em>written price.</em></h1>
            <p className="qpg__sub">A few quick taps, no obligation and no spam. We reply with a written quote within 12 business hours.</p>
            <ul className="qpg__list">
              {PROMISES.map(([b, t]) => <li key={b}><span aria-hidden="true">✓</span><p><strong>{b}</strong> {t}</p></li>)}
            </ul>
            <p className="qpg__call">Prefer to talk? <a href="tel:+61359478000" data-call-from="quote-page">Call (03) 5947 8000</a>, {openingHours()}. After hours goes to someone on the tools.</p>
          </div>
          <div className="qpg__form"><HeroQuote /></div>
        </div>
      </section>
      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <div className="pp__lead">
            <span className="aeye"><i /> What happens next</span>
            <h2 className="h2 h2--sm">From your request to a fixed price.</h2>
          </div>
          <Tiles items={[
            { t: "We call you back", d: "Within 12 business hours, to ask anything the form didn't and book a time." },
            { t: "Free site check", d: "We look at the space, confirm the size and check for anything that changes the price." },
            { t: "A written quote", d: "One fixed price, with the model, the work and the warranty spelled out." },
            { t: "Install day", d: "Done by our own crew, with the compliance certificate emailed within 24 hours." },
          ]} />
          <p className="qpg__more">Not sure what you need yet? <Link href="/#find">Find your system</Link> or <Link href="/tools/sizing-calculator">work out the size</Link>.</p>
        </div>
      </section>
    </div>
  );
}
