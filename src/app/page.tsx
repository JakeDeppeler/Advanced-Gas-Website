import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { ServiceCards } from "@/components/ServiceCards";
import { WhyUs } from "@/components/WhyUs";
import { ProcessSteps } from "@/components/ProcessSteps";
import { FAQ } from "@/components/FAQ";
import { CTASection } from "@/components/CTASection";

export const metadata: Metadata = {
  title: "Aircon & Heat Pump Installation Melbourne | Same-Week Installs",
  description:
    "Licensed Melbourne aircon and heat pump installation specialists. Fixed-price quotes, VEU rebates from $33, 6-year workmanship warranty. Get your free quote.",
  alternates: { canonical: "/" },
};

const faqs = [
  {
    q: "How much does air conditioning installation cost in Melbourne?",
    a: "Most split-system installs range from $1,800–$3,500 supplied and installed, depending on the unit size and complexity. Ducted systems start around $7,500. We give you a fixed written quote upfront, with no surprises.",
  },
  {
    q: "Can I really get a heat pump hot water system for $33?",
    a: "Yes — under the Victorian Energy Upgrades (VEU) program, eligible Victorian homes can have a heat pump hot water system installed from as little as $33 after rebates. We handle the entire VEU application for you.",
  },
  {
    q: "How fast can you install?",
    a: "Most aircon and heat pump jobs are scheduled within 5–7 days of accepting your quote. We also offer same-day emergency call-outs for hot water and gas issues across Melbourne.",
  },
  {
    q: "Are you licensed?",
    a: "Yes. We hold a Victorian Plumbing Licence and ARCtick Refrigerant Handling Licence. All work is certified and compliant — and we provide a compliance certificate on completion.",
  },
  {
    q: "What suburbs do you service?",
    a: "We service all Melbourne metro suburbs and regional Victoria including Geelong, Ballarat and the Mornington Peninsula. Visit our Service Areas page for a full list.",
  },
  {
    q: "What's covered by the 6-year workmanship warranty?",
    a: "Anything related to our installation work — fittings, brackets, refrigerant lines, condensate drains, electrical connections. The unit itself is covered by the manufacturer warranty (typically 5–7 years on parts and compressor).",
  },
];

export default function Home() {
  return (
    <>
      <Hero
        title="Aircon & heat pump installation Melbourne homeowners trust"
        subtitle="Same-week installs, fixed-price quotes, and VEU rebates that make heat pump hot water systems as cheap as $33. One licensed team — plumbing, gas and refrigeration."
        highlights={[
          "Free fixed-price quote within 1 business hour",
          "VEU rebate paperwork handled for you",
          "6-year workmanship warranty on every install",
          "Licensed plumbers + ARCtick refrigeration techs",
        ]}
      />
      <TrustBar />
      <ServiceCards />
      <WhyUs />
      <ProcessSteps />
      <FAQ items={faqs} />
      <CTASection />
    </>
  );
}
