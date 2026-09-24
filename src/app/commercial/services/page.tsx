import type { Metadata } from "next";
import { site } from "@/lib/site";
import { COMM_SCOPES } from "@/lib/commercial";
import { CxSubHero } from "@/components/commercial/CxSubHero";
import { CxClose } from "@/components/commercial/CxClose";
import { DuctDivider } from "@/components/commercial/DuctDivider";
import { ProcessTimeline } from "@/components/commercial/ProcessTimeline";
import { CommReveal } from "@/components/commercial/CommReveal";
import "../cx.css";

export const metadata: Metadata = {
  title: "Commercial Fit-outs, Plant & Maintenance",
  description:
    "Ten mechanical packages across Melbourne's south-east: tenancy fit-outs, base build, plant replacement on live sites, maintenance and breakdown response.",
  alternates: { canonical: "/commercial/services" },
};

/**
 * What we do, at length.
 *
 * The front page sets the ten packages out as cards, which is the right
 * shape for picking one. This is the shape for reading one: the claim on the
 * left, what is actually in the package on the right, and a rule between
 * each — so somebody who followed "What's included →" lands on the detail
 * rather than on the same card one size larger.
 *
 * The jump list over the seam is not decoration. Ten anchors is a lot of
 * scrolling to reach the one you came for, and most readers arrive here
 * wanting exactly one of them.
 */
export default function CommercialServicesPage() {
  return (
    <div className="page-cx" data-no-reveal>
      <CxSubHero
        eyebrow="What we do"
        title={<>Ten packages, and the detail behind <em>each one.</em></>}
        lede={
          <>
            We&rsquo;re a specialist mechanical, gas and hot water contractor, not a builder. Every one of these is a
            package we own from the drawings through to handover, with our own crew on it. If a scope needs something
            that isn&rsquo;t on this page, the honest answer is usually that we&rsquo;re not the right outfit for it.
          </>
        }
        photo="/comm/duct-install.jpg"
      />

      <div className="cx-shelf">
        <div className="wrap">
          <div className="cx-shelf__card">
            <span className="cx-eye">Go straight to</span>
            <nav className="cx-jump" aria-label="Jump to a package">
              {COMM_SCOPES.map((sc) => (
                <a key={sc.slug} href={`#${sc.slug}`}>{sc.title}</a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <section className="cx-sec">
        <div className="wrap">
          <ol className="cx-full">
            {COMM_SCOPES.map((sc) => (
              <li
                key={sc.slug}
                id={sc.slug}
                className={`cx-fullitem cx-rv${sc.slug === "breakdowns" ? " cx-fullitem--urgent" : ""}`}
              >
                <div>
                  <span className="cx-fullitem__n">{sc.n}</span>
                  <h2>{sc.title}</h2>
                  <p className="cx-fullitem__lede">{sc.lede}</p>
                  {sc.slug === "breakdowns" && (
                    <a className="cx-fullitem__call" href={`tel:${site.phoneE164}`}>
                      Call {site.phone} →
                    </a>
                  )}
                </div>
                <div>
                  <ul className="cx-fullitem__list">
                    {sc.detail.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                  <p className="cx-fullitem__suits">
                    <b>Suits</b>
                    {sc.suits}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <DuctDivider on="navy" label="supply air" />

      {/* The same six stages as the front page. A reader who has come this far
          is about to ask how it actually runs, and the answer does not change
          with the package. */}
      <section className="cx-sec cx-sec--navy" id="process">
        <div className="wrap">
          <header className="cx-sec__head cx-rv">
            <span className="cx-eye cx-eye--sky">However it is packaged</span>
            <h2>From your plans to a proper handover.</h2>
            <p className="cx-sec__lede">
              Whichever one of the ten it is, it goes the same way: we read the drawings, build the scope with you in
              writing, price against that, and hand over with the paperwork in one place.
            </p>
          </header>
          <ProcessTimeline />
        </div>
      </section>

      <CxClose
        title="Not sure it's one of ours?"
        alt={{ href: `tel:${site.phoneE164}`, label: <>or call <strong>{site.phone}</strong></>, external: true }}
      >
        Send it anyway. If it isn&rsquo;t something we&rsquo;re set up to do properly we&rsquo;ll say so, and usually
        point you at someone who is. That&rsquo;s cheaper for both of us than finding out halfway through.
      </CxClose>

      <CommReveal />
    </div>
  );
}
