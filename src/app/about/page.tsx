import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { openingHours } from "@/lib/site";
import { RATING_TEXT } from "@/lib/reviews";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";
import "@/components/homepage/page/about.css";

export const metadata: Metadata = {
  title: "About us, a family business from Pakenham",
  description:
    "A family-owned heating, cooling, gas and hot water business in Pakenham. Run by its two directors, Dean and Jake, with our own crew on every job and six years on our workmanship.",
  alternates: { canonical: "/about" },
};

/**
 * About us, rebuilt at Jake's request (Nov 2026): shorter, led by real
 * photos rather than the card-and-list blocks every other page uses, and in
 * plain words. Two directors side by side (Jake joined Dean as a director),
 * then the office and the crew, a few reasons to pick us, and a quote.
 *
 * Everything is written about the people, never as a quote from them.
 */
const DIRECTORS = [
  {
    name: "Dean Winbanks", role: "Director", photo: "/dean.webp",
    about: "Dean has been on the tools for more than 20 years, on homes, shops and big commercial sites. He holds our plumbing licence, trains every one of the crew, and signs off the work.",
  },
  {
    name: "Jake Deppeler", role: "Director", photo: "/jake.webp",
    about: "Jake looks after the quotes and the numbers. He's usually the one who comes out to look at your place, and the one who makes sure the price you're given is the price you pay.",
  },
];

const REASONS: [string, string][] = [
  ["Our own crew", "Everyone who works on your home works for us. We don't hand jobs to subcontractors."],
  ["A price in writing", "You get one fixed price before we start. It only changes if the job does, and we ask you first."],
  ["We look after the house", "Drop sheets down, the old unit taken away, and every gas job checked for carbon monoxide before we leave."],
  ["Six years on our work", "On top of the maker's warranty. If something we did isn't right, we come back and fix it."],
];

export default function AboutPage() {
  return (
    // data-no-reveal: the old site's scroll reveal hides sections until they animate in; the redesign pages opt out.
    <div className="ag ag--flat" data-no-reveal>
      {/* The crew photo on its own, then the words under it: over the photo they covered the people. */}
      <section className="abx">
        <div className="abx__pic">
          <Image src="/team-photo.webp" alt="The Advanced Gas & Aircon crew with their vans outside the Pakenham workshop" fill priority sizes="100vw" className="abx__bg" />
        </div>
        <div className="wrap abx__in">
          <div>
            <span className="lk2__eye">About us</span>
            <h1 className="abx__h1">A family business from <em>Pakenham.</em></h1>
          </div>
          <div className="abx__side">
            <p className="abx__sub">We heat, cool and fix hot water for homes across the south-east. Our own crew, our own vans, and our names on every job.</p>
            <div className="bxh__ctas">
              <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
              <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="about-hero">Call (03) 5947 8000</a>
            </div>
          </div>
        </div>
      </section>

      <section className="pxs">
        <div className="wrap abd">
          <div className="abd__head">
            <span className="aeye"><i /> Who runs it</span>
            <h2 className="h2 h2--sm">Two directors, both on the end of the phone.</h2>
            <p>Ring the office and you can ask for either of them by name. That&apos;s the point of a family business.</p>
          </div>
          <div className="abd__pair">
            {DIRECTORS.map((d) => (
              <article key={d.name} className="abd__card">
                <span className="abd__photo"><Image src={d.photo} alt={`${d.name}, ${d.role}`} fill sizes="(max-width: 900px) 100vw, 600px" /></span>
                <div className="abd__t">
                  <h3>{d.name}</h3>
                  <small>{d.role}</small>
                  <p>{d.about}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="abk">
        <div className="wrap abk__in">
          <span className="abk__photo"><Image src="/kellie.webp" alt="Kellie, who runs the office" fill sizes="(max-width: 900px) 60vw, 280px" /></span>
          <div className="abk__t">
            <h2 className="h2 h2--sm">Kellie runs the office.</h2>
            <p>She books the jobs, sends out the paperwork and keeps everything moving, so you&apos;re never left chasing us. Behind her is the rest of the crew: installers and apprentices who all work for us, trained to the same standard.</p>
          </div>
        </div>
      </section>

      <section className="pxs abr">
        <div className="wrap abr__in">
          <div className="abr__photo">
            <Image src="/kaden-team-with-chaz.jpg" alt="One of our installers with new units ready to fit" fill sizes="(max-width: 900px) 100vw, 520px" />
          </div>
          <div className="abr__t">
            <span className="aeye"><i /> Why people pick us</span>
            <h2 className="h2 h2--sm">What you can count on.</h2>
            <ul className="abr__list">
              {REASONS.map(([h, p]) => <li key={h}><strong>{h}</strong><span>{p}</span></li>)}
            </ul>
            <p className="abr__fine">
              Rated {RATING_TEXT} out of 5 on Google. <Link href="/reviews">Read the reviews →</Link><br />
              Plumbing licence 46828 · Refrigerant licence ARC AU59557 · $20M public liability
            </p>
          </div>
        </div>
      </section>

      <section className="abc">
        <div className="wrap abc__in">
          <h2 className="h2 h2--sm">Want a price?</h2>
          <p>Tell us what you need and we&apos;ll get back to you within 12 business hours. {openingHours()}.</p>
          <div className="bxh__ctas">
            <Link href="/#quote" className="abtn abtn--or abtn--flat">Get a free quote →</Link>
            <a href="tel:+61359478000" className="abtn abtn--line" data-call-from="about-cta">Call (03) 5947 8000</a>
          </div>
        </div>
      </section>
    </div>
  );
}
