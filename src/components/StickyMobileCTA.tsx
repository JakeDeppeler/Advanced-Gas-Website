import Link from "next/link";
import { site } from "@/lib/site";

export function StickyMobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="grid grid-cols-2 gap-2 border-t border-navy-100 bg-white/95 p-2 shadow-[0_-8px_24px_-8px_rgb(14_22_56_/_0.15)] backdrop-blur">
        <a
          href={`tel:${site.phoneE164}`}
          className="btn bg-navy-900 text-white text-sm"
          aria-label={`Call ${site.phone}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call now
        </a>
        <Link href="/quote" className="btn-accent text-sm">
          Free Quote
        </Link>
      </div>
    </div>
  );
}
