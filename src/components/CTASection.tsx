import Link from "next/link";
import { site } from "@/lib/site";

export function CTASection({
  title = "Ready for a fixed-price quote?",
  subtitle = "Free, no-obligation, replied to within 1 business hour.",
}: { title?: string; subtitle?: string }) {
  return (
    <section className="section">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 text-white md:px-12 md:py-16">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="relative grid items-center gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">{title}</h2>
              <p className="mt-3 text-brand-50">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link href="/quote" className="btn-accent">Get my free quote</Link>
              <a href={`tel:${site.phoneE164}`} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
                📞 {site.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
