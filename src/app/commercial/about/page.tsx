import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/lib/site";
import { COMM_STANDARD, COMM_FACTS, COMM_CLIENTS } from "@/lib/commercial";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { CxClose } from "@/components/commercial/CxClose";
import { DuctDivider } from "@/components/commercial/DuctDivider";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "About Our Commercial Division",
  description:
    "Directly employed crews, a written standard, one line of accountability. Commercial mechanical from Pakenham across Melbourne's south-east.",
  alternates: { canonical: "/commercial/about" },
};

/**
 * Who you would be dealing with.
 *
 * The front page answers this with two faces; this page answers it with the
 * company around them — the four figures a procurement team writes down, how
 * it got here, the six things done the same way every time, and the names of
 * the people who already let us on site. A page about ourselves that never
 * names a client is a page of claims.
 */
export default function CommercialAboutPage() {
  return (
    <div className="page-cx" data-no-reveal>
      <CxSubHero
        eyebrow="Who you'd be dealing with"
        title={<>The easy contractor to have <em>on site.</em></>}
        lede={
          <>
            Twelve years out of {site.address.suburb}, working across Melbourne&rsquo;s south-east and Gippsland. What
            makes a contractor easy to work with isn&rsquo;t size. It&rsquo;s whether they do the same thing every
            time, and whether the paperwork turns up without being chased.
          </>
        }
        photo="/comm/ewp-unit.jpg"
      />

      {/* The four figures as the plinth under the hero: on a page about us,
          these are the four things a procurement team writes down. */}
      <div className="cx-shelf">
        <div className="wrap">
          <div className="cx-shelf__card">
            <ul className="cx-figs">
              {COMM_FACTS.map((f, i) => (
                <li className="cx-fig cx-rv" key={f.k} style={{ ["--i" as string]: String(i) }}>
                  <strong>{f.n}</strong>
                  <span className="cx-fig__k">{f.k}</span>
                  <p>{f.p}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="cx-sec" id="who">
        <div className="wrap">
          <div className="cx-who">
            <figure className="cx-rv">
              <Image
                src="/team-photo.webp"
                alt="The Advanced Gas &amp; Aircon crew with the vans at the Pakenham depot"
                width={900}
                height={675}
                sizes="(max-width: 900px) 100vw, 460px"
              />
            </figure>
            <div className="cx-rv" style={{ ["--i" as string]: "1" }}>
              <span className="cx-eye">Since 2014</span>
              <h2>A family business that got good at the boring part.</h2>
              <p>
                We started in a Pakenham garage in 2014 and the same family still answers the phone. What changed is
                everything around the work: the procedures got written down, the paperwork stopped being an
                afterthought, and the crews became people we employ rather than people we book.
              </p>
              <p>
                That is the whole difference on a commercial site. A builder does not need a contractor who is big.
                They need one who turns up when the program says, sends the documents before anyone asks, and does the
                job the same way on the last floor as on the first.
              </p>
            </div>
          </div>
        </div>
      </section>

      <DuctDivider on="cream" label="return air" />

      <section className="cx-sec" id="standard" style={{ paddingTop: "clamp(48px, 6vw, 80px)" }}>
        <div className="wrap">
          <header className="cx-sec__head cx-sec__head--c cx-rv">
            <span className="cx-eye">Why we get asked back</span>
            <h2>Six things we do the same way every time.</h2>
          </header>
          <ul className="cx-why">
            {COMM_STANDARD.map((st, i) => (
              <li className="cx-why__item cx-rv" key={st.n} style={{ ["--i" as string]: String(i % 3) }}>
                <span className="cx-why__n">{st.n}</span>
                <h3>{st.h}</h3>
                <p>{st.p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cx-sec cx-sec--cream2" id="work">
        <div className="wrap">
          <header className="cx-sec__head cx-sec__head--c cx-rv">
            <span className="cx-eye">Some of the work</span>
            <h2>Sites we&rsquo;ve been trusted with.</h2>
            <p className="cx-sec__lede">
              Named, with the job and the location against each. A reference you can ring is worth more than a logo
              you can&rsquo;t.
            </p>
          </header>
          <ol className="cx-clients">
            {COMM_CLIENTS.map((c, i) => (
              <li className="cx-client cx-rv" key={c.name} style={{ ["--i" as string]: String(i % 5) }}>
                <span className="cx-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{c.name}</h3>
                <p>{c.what}</p>
                <div className="cx-client__foot">
                  <span className={`cx-tag cx-tag--${c.tone}`}>{c.sector}</span>
                  <span className="cx-client__loc">{c.where}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CxClose
        title="Submit a scope for pricing."
        alt={{ href: "/commercial/capability", label: <>or read the <strong>capability statement</strong></> }}
      >
        Drawings, a mechanical schedule or a site address is sufficient to begin. Licences, insurances and
        certificates are on the capability statement, and they go out the same day you ask.
      </CxClose>

      <CommReveal />
    </div>
  );
}
