import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get a Free Quote — Aircon & Heat Pump Installation Melbourne",
  description:
    "Free, no-obligation quote in 60 seconds. Licensed Melbourne aircon and heat pump specialists reply within 1 business hour.",
  alternates: { canonical: "/quote" },
  robots: { index: true, follow: true },
};

export default function QuotePage() {
  return (
    <div className="bg-slate-50">
      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Free quote</span>
            <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">
              Tell us what you need.<br />Get a fixed price.
            </h1>
            <p className="mt-4 max-w-xl text-slate-600">
              60 seconds, no obligation, no spam. We reply with a written quote within
              <strong> 1 business hour</strong> — or you can call us now on{" "}
              <a className="font-semibold text-brand-700 underline" href={`tel:${site.phoneE164}`}>{site.phone}</a>.
            </p>

            <ul className="mt-8 space-y-3">
              <Bullet t="Licensed plumbing & refrigeration team" d="Compliance certificate provided on completion." />
              <Bullet t="VEU rebate handled for you" d="Eligible Victorian homes — heat pump installs from $33." />
              <Bullet t="6-year workmanship warranty" d="Triple the industry standard." />
              <Bullet t="Same-week installation" d="Most jobs scheduled within 5-7 days of approval." />
            </ul>
          </div>

          <div>
            <QuoteForm />
            <p className="mt-4 text-center text-xs text-slate-500">
              Prefer to talk? Call <a className="font-semibold text-brand-700" href={`tel:${site.phoneE164}`}>{site.phone}</a> — Mon-Sat.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Bullet({ t, d }: { t: string; d: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white text-xs font-black">✓</span>
      <div>
        <div className="font-semibold text-slate-900">{t}</div>
        <div className="text-sm text-slate-600">{d}</div>
      </div>
    </li>
  );
}
