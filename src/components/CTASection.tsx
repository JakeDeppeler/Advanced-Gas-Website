import Link from "next/link";
import { site } from "@/lib/site";

export function CTASection({
  title = "Ready for a fixed-price quote?",
  subtitle = "Free, no-obligation, replied to within 1 business hour.",
}: { title?: string; subtitle?: string }) {
  return (
    <section className="section">
      <div className="container">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-navy-900 px-7 py-14 text-white md:px-14 md:py-20">
          {/* Layered glows */}
          <div className="absolute inset-0 bg-hero-glow" aria-hidden />
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
          <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-flame-500/15 blur-3xl" aria-hidden />

          <div className="relative grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="eyebrow-dark">Free quote</span>
              <h2 className="mt-4 font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
                {title}
              </h2>
              <p className="mt-4 max-w-md text-navy-100">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link href="/quote" className="btn-accent">
                Get my free quote
                <span aria-hidden>→</span>
              </Link>
              <a href={`tel:${site.phoneE164}`} className="btn-outline">
                ☎ {site.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
