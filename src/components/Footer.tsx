import Link from "next/link";
import { site, services, suburbs } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-navy-900 text-navy-100">
      <div className="absolute inset-0 bg-hero-glow opacity-50" aria-hidden />
      <div className="relative container grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo variant="white" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-200">
            Licensed aircon, heat pump and gas plumbing specialists serving
            South-East Victoria and Gippsland. Same-week installs with a 6-year
            workmanship warranty.
          </p>
          <div className="mt-6 space-y-1 text-xs text-navy-300">
            <p>ABN {site.abn}</p>
            <p>{site.licences.plumbing}</p>
            <p>{site.licences.refrigeration}</p>
          </div>
        </div>

        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Services</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="text-navy-200 hover:text-cyan-300 transition">
                  {s.short}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/rebates" className="inline-flex items-center gap-1.5 font-semibold text-flame-400 hover:text-flame-300 transition">
                VEU Rebates
                <span className="rounded bg-flame-500 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white">$$$</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Service Areas</h3>
          <ul className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            {suburbs.slice(0, 10).map((sub) => (
              <li key={sub.slug}>
                <Link href={`/areas/${sub.slug}`} className="text-navy-200 hover:text-cyan-300 transition">
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/service-areas" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:text-cyan-300">
            View all areas <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="md:col-span-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href={`tel:${site.phoneE164}`} className="font-display text-2xl font-bold text-white hover:text-cyan-300 transition">
                {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="text-navy-200 hover:text-cyan-300 transition break-all">
                {site.email}
              </a>
            </li>
            <li className="pt-1 text-navy-200">
              {site.primaryRegion}
            </li>
            <li className="pt-3">
              <Link href="/quote" className="btn-accent">Get a Free Quote</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container flex flex-col gap-2 py-5 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.legalName}. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
