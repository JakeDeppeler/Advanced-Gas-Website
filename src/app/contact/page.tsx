import type { Metadata } from "next";
import { site } from "@/lib/site";
import { QuoteForm } from "@/components/QuoteForm";

export const metadata: Metadata = {
  title: "Contact Advanced Gas | Aircon & Heat Pump Melbourne",
  description:
    "Call Advanced Gas Melbourne on 1300 000 000 or request a free fixed-price quote online. Licensed plumbing & refrigeration team across Victoria.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 text-white">
        <div className="container py-16 md:py-20">
          <h1 className="text-4xl font-extrabold md:text-5xl">Contact Advanced Gas</h1>
          <p className="mt-4 max-w-3xl text-lg text-brand-50">
            We respond to quotes within 1 business hour and offer same-day call-outs across Melbourne.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Get in touch</h2>
            <ul className="mt-6 space-y-4 text-slate-700">
              <li>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</div>
                <a href={`tel:${site.phoneE164}`} className="text-2xl font-bold text-brand-700">{site.phone}</a>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</div>
                <a href={`mailto:${site.email}`} className="text-lg font-semibold text-brand-700">{site.email}</a>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Service area</div>
                <div>Melbourne metro & regional Victoria</div>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hours</div>
                {site.hours.map((h) => (
                  <div key={h.day}>{h.day}: {h.open} – {h.close}</div>
                ))}
                <div>Sun: Emergency call-outs only</div>
              </li>
              <li>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Licences</div>
                <div className="text-sm">{site.licences.plumbing}</div>
                <div className="text-sm">{site.licences.refrigeration}</div>
                <div className="text-sm">ABN {site.abn}</div>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Request a quote</h2>
            <p className="mt-2 text-slate-600">60 seconds. No obligation.</p>
            <div className="mt-4"><QuoteForm /></div>
          </div>
        </div>
      </section>
    </>
  );
}
