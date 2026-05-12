import type { Metadata } from "next";
import Link from "next/link";
import { site, suburbs, services } from "@/lib/site";
import { CTASection } from "@/components/CTASection";

export const metadata: Metadata = {
  title: "Service Areas — South-East Vic & Gippsland | Advanced Gas & Aircon",
  description:
    "Aircon, heat pump and gas plumbing installation across South-East Victoria and Gippsland. Pakenham, Warragul, Korumburra, Wonthaggi, Phillip Island and more.",
  alternates: { canonical: "/service-areas" },
};

export default function ServiceAreasPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 md:py-24">
          <span className="eyebrow-dark">Service areas</span>
          <h1 className="mt-5 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
            South-East Victoria &amp; <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">Gippsland</span>.
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-navy-100">
            Licensed aircon, heat pump and gas plumbing installation across the south-east corridor.
            Choose your suburb below or call <a className="font-semibold text-cyan-300 underline-offset-4 hover:underline" href={`tel:${site.phoneE164}`}>{site.phone}</a> for a fast quote.
          </p>
        </div>
        <div className="relative -mb-px">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-12 w-full text-white" aria-hidden>
            <path d="M0 80V40c240 30 480 30 720 0s480-30 720 0v40H0z" fill="currentColor" />
          </svg>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="text-2xl font-bold">Suburbs we service</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {suburbs.map((s) => (
              <Link key={s.slug} href={`/areas/${s.slug}`} className="card card-hover">
                <div className="font-display text-lg font-bold text-navy-900">{s.name}</div>
                <div className="text-xs text-navy-500">VIC {s.postcode}</div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {services.slice(0, 2).map((svc) => (
                    <span key={svc.slug} className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                      {svc.short}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
