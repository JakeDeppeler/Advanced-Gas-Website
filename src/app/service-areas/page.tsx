import type { Metadata } from "next";
import Link from "next/link";
import { site, suburbs, services } from "@/lib/site";
import { CTASection } from "@/components/CTASection";

export const metadata: Metadata = {
  title: "Service Areas — Aircon & Heat Pump Melbourne | Advanced Gas",
  description:
    "Advanced Gas services Melbourne metro and regional Victoria for aircon, heat pump and gas plumbing installation. Find your suburb.",
  alternates: { canonical: "/service-areas" },
};

export default function ServiceAreasPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 to-brand-600 text-white">
        <div className="container py-14 md:py-20">
          <h1 className="text-4xl font-extrabold md:text-5xl">Melbourne Service Areas</h1>
          <p className="mt-4 max-w-3xl text-lg text-brand-50">
            Licensed aircon, heat pump and gas plumbing installation across Melbourne metro and regional Victoria.
            Choose your suburb below or call <a className="font-semibold underline" href={`tel:${site.phoneE164}`}>{site.phone}</a> for a fast quote.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="text-2xl font-bold">Suburbs we service</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {suburbs.map((s) => (
              <Link key={s.slug} href={`/melbourne/${s.slug}`} className="card hover:bg-brand-50">
                <div className="font-bold text-slate-900">{s.name}</div>
                <div className="text-xs text-slate-500">VIC {s.postcode}</div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {services.slice(0, 2).map((svc) => (
                    <span key={svc.slug} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
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
