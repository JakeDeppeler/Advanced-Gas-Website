import Link from "next/link";
import { site, services, suburbs } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-20 bg-brand-900 text-slate-200">
      <div className="container grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white font-black text-brand-700">
              AG
            </span>
            <span className="text-lg font-bold text-white">{site.name}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Licensed Melbourne aircon, heat pump and gas plumbing specialists.
            Same-week installs across Victoria with a 6-year workmanship warranty.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            ABN {site.abn}<br />
            {site.licences.plumbing}<br />
            {site.licences.refrigeration}
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold">Services</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="hover:text-white">
                  {s.short}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold">Service Areas</h3>
          <ul className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            {suburbs.slice(0, 10).map((sub) => (
              <li key={sub.slug}>
                <Link href={`/melbourne/${sub.slug}`} className="hover:text-white">
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/service-areas" className="mt-3 inline-block text-sm font-semibold text-accent-500">
            View all areas →
          </Link>
        </div>

        <div>
          <h3 className="text-white font-semibold">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`tel:${site.phoneE164}`} className="hover:text-white">
                📞 {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-white">
                ✉ {site.email}
              </a>
            </li>
            <li className="text-slate-300">
              {site.address.suburb}, {site.address.state} {site.address.postcode}
            </li>
            <li className="pt-2">
              <Link href="/quote" className="btn-accent">Get a Free Quote</Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 py-5 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {site.legalName}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
