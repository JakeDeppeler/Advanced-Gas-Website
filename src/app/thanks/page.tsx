import type { Metadata } from "next";
import Link from "next/link";
import { openingHours, site } from "@/lib/site";
import { BkMotion } from "@/components/homepage/brand/BkMotion";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/brand/blocks.css";
import "@/components/homepage/page/category.css";
import "@/components/homepage/tools/tools.css";

export const metadata: Metadata = {
  title: "Thanks, your quote request is in",
  description: "We've received your request and will be in touch within 12 business hours.",
  robots: { index: false, follow: false },
};

/** The same steps the quote page promises, picked up from step two: the form is done. */
const NEXT = [
  { when: "Within 12 business hours", t: "We call you back", d: "To ask anything the form didn't and book a time that suits you." },
  { when: "At your place", t: "A free site check", d: "We look at the space, confirm the size and check for anything that changes the price, before we price it." },
  { when: "After the visit", t: "Your written quote", d: "One fixed price, with the model, the work and the warranty spelled out. Take your time with it." },
];

/**
 * After the quote form. In the redesign's block layout (Nov 2026): what
 * happens next, in the quote page's own words, and the way to call now.
 * Not indexed. Conversion tags fire from the form's own submit handler,
 * not from anything printed here.
 */
export default function ThanksPage() {
  return (
    <div className="ag ag--flat" data-no-reveal><div className="bx bk cx tl" style={{ ["--acc" as string]: "#C2521A" }}>
      <BkMotion />
      <section className="bxh tl__hero">
        <div className="wrap tl__hin">
          <div className="bxh__copy">
            <span className="lk2__eye cx__eye">Request received</span>
            <h1 className="bxh__h1 cx__h1">Got it, <span>we&apos;re on it</span>.</h1>
            <p className="bxh__sub">Your quote request is in. One of our licensed team will call or text you within 12 business hours to book a free site check, then you get one fixed price in writing.</p>
            <div className="bxh__ctas">
              <a href={`tel:${site.phoneE164}`} className="abtn abtn--or abtn--flat" data-call-from="thanks">Or call now, {site.phone}</a>
              <Link href="/" className="abtn abtn--line">Back to home</Link>
            </div>
          </div>
          <aside className="tl__what" aria-label="While you wait">
            <small>While you wait</small>
            <ul>
              <li><span aria-hidden="true">✓</span>A photo of the room, or of the old unit and its label, helps us price it faster. Reply to our text with it.</li>
              <li><span aria-hidden="true">✓</span>Office hours are {openingHours()}. After hours goes to someone on the tools.</li>
            </ul>
            <p><b>No obligation</b> · The quote is free</p>
          </aside>
        </div>
      </section>

      <section className="bk__sec bk__sec--white">
        <div className="wrap"><div className="bk__blk bk__col">
          <header className="bk__head">
            <h2 className="h2">What happens <span>next</span>.</h2>
            <p>No call centre. Three steps from here to a price you can hold us to.</p>
          </header>
          <ol className="qpg__steps qpg__steps--3" data-anim="stagger">
            {NEXT.map((x, i) => (
              <li key={x.t}>
                <span className="qpg__n" aria-hidden="true">{String(i + 2).padStart(2, "0")}</span>
                <small className="qpg__when">{x.when}</small>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </li>
            ))}
          </ol>
          <p className="qpg__more">In the meantime: <Link href="/about">meet the team</Link>, read <Link href="/reviews">what locals say</Link>, or <Link href="/rebates">check the rebate</Link>.</p>
        </div></div>
      </section>
    </div></div>
  );
}
