import { site } from "@/lib/site";

export function UtilityBar() {
  return (
    <div className="utilbar">
      <div className="wrap utilbar__row">
        <div className="utilbar__left">
          <span className="util-pill">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v3M4.93 4.93l2.12 2.12M2 12h3M4.93 19.07l2.12-2.12M12 19v3M16.95 16.95l2.12 2.12M19 12h3M16.95 7.05l2.12-2.12" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            Pakenham, VIC, servicing within 50 km
          </span>
          <span className="util-pill util-pill--quiet">Open Mon–Fri · 8:00 am – 4:00 pm</span>
          <span className="util-pill util-pill--quiet">ABN {site.abn} · Plumbing Lic. 46828</span>
        </div>
        <div className="utilbar__right">
          <a className="util-link" href="/contact#emergency">
            <span className="util-dot util-dot--red" />
            24/7 emergency gas &amp; hot-water
          </a>
          <a className="util-tel" href={`tel:${site.phoneE164}`}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
            </svg>
            {site.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
