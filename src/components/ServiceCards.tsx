import Link from "next/link";
import { services } from "@/lib/site";

export function ServiceCards() {
  return (
    <section className="section">
      <div className="container">
        <div className="max-w-2xl">
          <span className="eyebrow">Services</span>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Heating, cooling and hot water — all under one licensed roof
          </h2>
          <p className="mt-3 text-slate-600">
            One Melbourne team for your aircon, heat pump hot water and gas plumbing.
            No third-party contractors, no finger-pointing, no surprise add-ons.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="card group transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-xl text-brand-700">
                ⚙
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.short}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.blurb}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-700 group-hover:underline">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
