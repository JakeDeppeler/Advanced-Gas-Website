import type { Metadata } from "next";
import { CTASection } from "@/components/CTASection";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Advanced Gas & Aircon | South-East Vic & Gippsland Specialists",
  description:
    "Family-run aircon, heat pump and gas plumbing specialists serving South-East Vic and Gippsland. Licensed plumbing & refrigeration, 6-year warranty, VEU rebate approved.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 md:py-24">
          <span className="eyebrow-dark">About us</span>
          <h1 className="mt-5 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
            One licensed team. <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">Done right.</span>
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-navy-100">
            Advanced Gas &amp; Aircon is a South-East Victoria-based plumbing and refrigeration team.
            We install aircon, heat pump hot water systems and handle gas plumbing across the
            south-east corridor and Gippsland, with a focus on doing the job once and doing it properly.
          </p>
        </div>
        <div className="relative -mb-px">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-12 w-full text-white" aria-hidden>
            <path d="M0 80V40c240 30 480 30 720 0s480-30 720 0v40H0z" fill="currentColor" />
          </svg>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Our story</span>
            <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">Why we exist.</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-navy-700">
              Most aircon and hot water installs involve three different sub-contractors,
              two miscommunications and one nasty surprise on the final invoice. We built
              Advanced Gas &amp; Aircon to make it simple — one licensed team, one fixed price,
              one phone number when something needs sorting.
            </p>
            <p className="mt-4 text-[17px] leading-relaxed text-navy-700">
              We're licensed across plumbing and refrigeration, ARCtick certified for refrigerant
              work, and approved under the Victorian Energy Upgrades program — so we can pass on
              rebates that make heat pump hot water systems as cheap as $33 installed.
            </p>
          </div>
          <div className="card">
            <h3 className="text-xl font-bold">What we promise.</h3>
            <ul className="mt-6 space-y-4 text-navy-700">
              {[
                "Fixed-price written quote before any work starts",
                "Same-week install for most aircon and heat pump jobs",
                "6-year workmanship warranty — triple the industry standard",
                "Licensed, insured and ARCtick certified",
                "Clean-up guarantee — you won't know we were there",
                "Compliance certificate provided on every job",
              ].map((l) => (
                <li key={l} className="flex items-start gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-400 text-white">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section bg-gradient-to-b from-cyan-50/30 to-white">
        <div className="container">
          <span className="eyebrow">Credentials</span>
          <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">Licences &amp; approvals.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="card">
              <h3 className="font-display text-lg font-bold">{site.licences.plumbing}</h3>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">
                Victorian Building Authority licensed for all plumbing and gas-fitting work.
              </p>
            </div>
            <div className="card">
              <h3 className="font-display text-lg font-bold">{site.licences.refrigeration}</h3>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">
                Australian Refrigeration Council certification — required by federal law for refrigerant handling.
              </p>
            </div>
            <div className="card">
              <h3 className="font-display text-lg font-bold">VEU Approved Provider</h3>
              <p className="mt-3 text-sm leading-relaxed text-navy-600">
                Approved under the Victorian Energy Upgrades program to deliver rebated heat pump installs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
