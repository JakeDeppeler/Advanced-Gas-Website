import type { Metadata } from "next";
import { site } from "@/lib/site";
import { QuoteForm } from "@/components/QuoteForm";

export const metadata: Metadata = {
  title: "Contact Advanced Gas & Aircon | South-East Vic & Gippsland",
  description:
    "Call Advanced Gas & Aircon on (03) 5947 8000 or request a free fixed-price quote online. Licensed plumbing & refrigeration team across Victoria.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 md:py-24">
          <span className="eyebrow-dark">Contact</span>
          <h1 className="mt-5 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Let's get you a <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">fixed-price quote</span>.
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-navy-100">
            We respond to quotes within 1 business hour and offer same-day call-outs across our service area.
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
            <h2 className="text-2xl font-bold">Get in touch.</h2>
            <ul className="mt-8 space-y-6 text-navy-700">
              <li>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-500">Phone</div>
                <a href={`tel:${site.phoneE164}`} className="mt-1 inline-block font-display text-3xl font-extrabold text-navy-900 hover:text-cyan-600 transition">{site.phone}</a>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-500">Email</div>
                <a href={`mailto:${site.email}`} className="mt-1 inline-block text-lg font-semibold text-cyan-700 hover:text-cyan-500 transition">{site.email}</a>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-500">Service area</div>
                <div className="mt-1">{site.primaryRegion}</div>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-500">Hours</div>
                <div className="mt-1 space-y-0.5">
                  {site.hours.map((h) => (
                    <div key={h.day}>{h.day}: {h.open} – {h.close}</div>
                  ))}
                  <div>Sun: Emergency call-outs only</div>
                </div>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-navy-500">Licences</div>
                <div className="mt-1 space-y-0.5 text-sm">
                  <div>{site.licences.plumbing}</div>
                  <div>{site.licences.refrigeration}</div>
                  <div>ABN {site.abn}</div>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Request a quote.</h2>
            <p className="mt-2 text-navy-600">60 seconds. No obligation.</p>
            <div className="mt-6"><QuoteForm /></div>
          </div>
        </div>
      </section>
    </>
  );
}
