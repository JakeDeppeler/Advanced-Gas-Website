import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get a Free Quote — Aircon & Heat Pump Installation | Advanced Gas & Aircon",
  description:
    "Free, no-obligation quote in 60 seconds. Licensed South-East Vic & Gippsland aircon and heat pump specialists reply within 1 business hour.",
  alternates: { canonical: "/quote" },
  robots: { index: true, follow: true },
};

export default function QuotePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-hero-glow" aria-hidden />
        <div className="container relative py-20 md:py-24">
          <span className="eyebrow-dark">Free quote</span>
          <h1 className="mt-5 font-display text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Tell us what you need.<br />
            Get a <span className="bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">fixed price</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-navy-100">
            60 seconds, no obligation, no spam. We reply with a written quote within
            <strong className="text-white"> 1 business hour</strong> — or call us now on{" "}
            <a className="font-semibold text-cyan-300 underline-offset-4 hover:underline" href={`tel:${site.phoneE164}`}>{site.phone}</a>.
          </p>
        </div>
        <div className="relative -mb-px">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-12 w-full text-white" aria-hidden>
            <path d="M0 80V40c240 30 480 30 720 0s480-30 720 0v40H0z" fill="currentColor" />
          </svg>
        </div>
      </section>

      <section className="section bg-gradient-to-b from-cyan-50/30 to-white">
        <div className="container grid gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">What you get</span>
            <h2 className="mt-4 text-balance text-4xl font-extrabold leading-[1.1] md:text-5xl">
              No tricks. Just a real price.
            </h2>
            <ul className="mt-8 space-y-5">
              <Bullet t="Licensed plumbing & refrigeration team" d="Compliance certificate provided on completion." />
              <Bullet t="VEU rebate handled for you" d="Eligible Victorian homes — heat pump installs from $33." />
              <Bullet t="6-year workmanship warranty" d="Triple the industry standard." />
              <Bullet t="Same-week installation" d="Most jobs scheduled within 5-7 days of approval." />
            </ul>
          </div>

          <div>
            <QuoteForm />
            <p className="mt-4 text-center text-xs text-navy-500">
              Prefer to talk? Call <a className="font-semibold text-cyan-700" href={`tel:${site.phoneE164}`}>{site.phone}</a> — Mon-Sat.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Bullet({ t, d }: { t: string; d: string }) {
  return (
    <li className="flex gap-4">
      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 text-white">
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <div>
        <div className="font-display text-lg font-bold text-navy-900">{t}</div>
        <div className="text-sm text-navy-600">{d}</div>
      </div>
    </li>
  );
}
