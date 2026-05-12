import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { ServiceCards } from "@/components/ServiceCards";
import { WhyUs } from "@/components/WhyUs";
import { ProcessSteps } from "@/components/ProcessSteps";
import { FAQ } from "@/components/FAQ";
import { CTASection } from "@/components/CTASection";
import { BrandStrip } from "@/components/BrandStrip";
import { StatsBar } from "@/components/StatsBar";

export const metadata: Metadata = {
  title: "Aircon & Heat Pump Installation South-East Vic & Gippsland",
  description:
    "Licensed aircon and heat pump specialists across Pakenham, Warragul and Gippsland. Fixed-price quotes, VEU rebates from $33, 6-year workmanship warranty.",
  alternates: { canonical: "/" },
};

const faqs = [
  {
    q: "How much does air conditioning installation cost?",
    a: "Most split-system installs range from $1,800–$3,500 supplied and installed, depending on the unit size and complexity. Ducted systems start around $7,500. We give you a fixed written quote upfront with no surprises.",
  },
  {
    q: "Can I really get a heat pump hot water system for $33?",
    a: "Yes — under the Victorian Energy Upgrades (VEU) program, eligible Victorian homes can have a heat pump hot water system installed from as little as $33 after rebates. We handle the entire VEU application for you.",
  },
  {
    q: "How fast can you install?",
    a: "Most aircon and heat pump jobs are scheduled within 5–7 days of accepting your quote. We also offer same-day emergency call-outs for hot water and gas issues across our service area.",
  },
  {
    q: "Are you licensed?",
    a: "Yes — VBA Plumbing Licence #46828 and ARCtick AU59557. All work is certified and compliant, and we provide a compliance certificate on completion.",
  },
  {
    q: "What areas do you service?",
    a: "We service South-East Victoria and Gippsland, including Pakenham, Berwick, Cranbourne, Warragul, Drouin, Korumburra, Leongatha, Wonthaggi, Phillip Island and Inverloch. Visit our Service Areas page for the full list.",
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
        title="Aircon and heat pumps,"
        titleAccent="done properly."
        subtitle="Same-week installs, fixed-price quotes and VEU rebates that make heat pump hot water as cheap as $33. One licensed team across South-East Victoria and Gippsland — plumbing, gas and refrigeration."
        highlights={[
          "Free fixed-price quote within 1 hour",
          "VEU rebate paperwork handled for you",
          "6-year workmanship warranty",
          "Licensed plumbing + ARCtick refrigeration",
        ]}
      />
      <TrustBar />
      <ServiceCards />
      <StatsBar />
      <WhyUs />
      <ProcessSteps />
      <BrandStrip />
      <FAQ items={faqs} />
      <CTASection />
    </>
  );
}
