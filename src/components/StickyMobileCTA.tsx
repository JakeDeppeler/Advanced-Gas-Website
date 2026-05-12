import Link from "next/link";
import { site } from "@/lib/site";

export function StickyMobileCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-2 shadow-lg">
        <a
          href={`tel:${site.phoneE164}`}
          className="btn bg-brand-700 text-white text-sm"
          aria-label={`Call ${site.phone}`}
        >
          📞 Call now
        </a>
        <Link
          href="/quote"
          className="btn bg-accent-500 text-slate-900 text-sm font-semibold"
        >
          Free Quote
        </Link>
      </div>
    </div>
  );
}
