import type { Metadata } from "next";
import { CTASection } from "@/components/CTASection";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Advanced Gas | Melbourne Aircon & Heat Pump Specialists",
  description:
    "Family-run Melbourne aircon, heat pump and gas plumbing specialists. Licensed plumbing & refrigeration, 6-year warranty, VEU rebate approved.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 text-white">
        <div className="container py-16 md:py-20">
          <span className="eyebrow bg-white/15 text-white">About us</span>
          <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">
            One licensed Melbourne team. Aircon, heat pumps and gas plumbing — done right.
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-brand-50">
            Advanced Gas is a Melbourne-based plumbing and refrigeration team. We install
            aircon, heat pump hot water systems and handle gas plumbing across Victoria,
            with a focus on doing the job once and doing it properly.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Why we exist</h2>
            <p className="mt-4 text-slate-700">
              Most aircon and hot water installs in Melbourne involve three different sub-contractors,
              two miscommunications and one nasty surprise on the final invoice. We built Advanced Gas
              to make it simple — one licensed team, one fixed price, one phone number when something
              needs sorting.
            </p>
            <p className="mt-4 text-slate-700">
              We're licensed across plumbing and refrigeration, ARCtick certified for refrigerant work,
              and approved under the Victorian Energy Upgrades program — so we can pass on rebates that
              make heat pump hot water systems as cheap as $33 installed.
            </p>
          </div>
          <div className="card">
            <h3 className="text-xl font-bold">What we promise</h3>
            <ul className="mt-4 space-y-3 text-slate-700">
              <li>✓ Fixed-price written quote before any work starts</li>
              <li>✓ Same-week install for most aircon and heat pump jobs</li>
              <li>✓ 6-year workmanship warranty — triple the industry standard</li>
              <li>✓ Licensed, insured and ARCtick certified</li>
              <li>✓ Clean-up guarantee — you won't know we were there</li>
              <li>✓ Compliance certificate provided on every job</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="container">
          <h2 className="text-3xl font-bold">Our licences & credentials</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="card">
              <h3 className="font-bold">{site.licences.plumbing}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Victorian Plumbing Industry Commission licensed for all plumbing and gas-fitting work.
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold">{site.licences.refrigeration}</h3>
              <p className="mt-2 text-sm text-slate-600">
                Australian Refrigeration Council certification — required by federal law for refrigerant handling.
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold">VEU Approved Provider</h3>
              <p className="mt-2 text-sm text-slate-600">
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
