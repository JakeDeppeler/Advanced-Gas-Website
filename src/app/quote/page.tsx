import type { Metadata } from "next";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { HeroQuote } from "@/components/homepage/HeroQuote";
import { Crumbs } from "@/components/homepage/page/kit";
import { REVIEWS, RATING_SUMMARY, RATING_TEXT } from "@/lib/reviews";
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

const STEPS = [
  { t: "We call you back", d: "Within 12 business hours, to ask anything the form didn't and book a time." },
  { t: "Free site check", d: "We look at the space, confirm the size and check for anything that changes the price." },
  { t: "A written quote", d: "One fixed price, with the model, the work and the warranty spelled out." },
  { t: "Install day", d: "Done by our own crew, with the compliance certificate emailed within 24 hours." },
];

/** Answers drawn from what the rest of the site already promises, nothing new. */
const FAQS = [
  { q: "Is the quote really free?", a: "Yes. The quote and the site check are free, and there's no obligation to go ahead." },
  { q: "How quickly will I hear back?", a: "Within 12 business hours. If it's urgent, call (03) 5947 8000: after hours goes to someone on the tools." },
  { q: "Will the price change after the site check?", a: "The site check is where we confirm the size and anything that affects the work. The written quote that follows is one fixed price, with the model, the work and the warranty spelled out." },
  { q: "Do you handle the VEU rebate?", a: "Yes. For eligible homes we apply it at the quote, so it comes straight off the price and you never chase it." },
  { q: "How soon can you install?", a: "Most jobs are scheduled within 5 to 7 days of the quote being approved." },
  { q: "What warranty do I get?", a: "The manufacturer's warranty on the unit, plus 6 years on our workmanship, and a compliance certificate on completion." },
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
      {/* What happens next: four steps in a row, on white */}
      <section className="pxs">
        <div className="wrap pp__col">
          <div className="pp__lead">
            <span className="aeye"><i /> What happens next</span>
            <h2 className="h2 h2--sm">From your request to a <span className="qpg__hl">fixed price</span>.</h2>
          </div>
          <ol className="qpg__steps">
            {STEPS.map((x, i) => (
              <li key={x.t}>
                <span className="qpg__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </li>
            ))}
          </ol>
          <p className="qpg__more">Not sure what you need yet? <Link href="/#find">Find your system</Link> or <Link href="/tools/sizing-calculator">work out the size</Link>.</p>
        </div>
      </section>

      <section className="pxs pxs--cream">
        <div className="wrap pp__col">
          <div className="pp__revhead">
            <div className="pp__lead">
              <span className="aeye"><i /> {RATING_TEXT} from {RATING_SUMMARY.count} Google reviews</span>
              <h2 className="h2 h2--sm">From local households.</h2>
            </div>
            <Link href="/reviews">Read every review →</Link>
          </div>
          <div className="pp__revs">
            {REVIEWS.slice(0, 3).map((r) => (
              <article key={r.who + r.title} className="rev">
                <span className="stars stars--ink" aria-hidden="true">★★★★★</span>
                <h3>{r.title}</h3>
                <p>&ldquo;{r.txt}&rdquo;</p>
                <div className="rev__who">
                  <span aria-hidden="true">{r.a}</span>
                  <span className="rev__whot"><strong>{r.who}</strong><small>{r.what}</small></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pxs" id="faqs">
        <div className="wrap pp__two">
          <div className="pp__lead">
            <span className="aeye"><i /> Before you ask</span>
            <h2 className="h2 h2--sm">Questions about the quote.</h2>
            <p>Still want a human? <a href="tel:+61359478000" data-call-from="quote-faq">Call (03) 5947 8000</a>.</p>
          </div>
          <div className="afaqs">
            {FAQS.map((f) => <details key={f.q} className="afaq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </div>
        </div>
      </section>
    </div>
  );
}
