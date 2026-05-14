import Link from "next/link";
import { site } from "@/lib/site";

type Variant = "default" | "white" | "mark";

export function Logo({
  variant = "default",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const wordTop = variant === "white" ? "text-white" : "text-navy-900";
  const wordBot = variant === "white" ? "text-cyan-300" : "text-cyan-500";

  return (
    <Link
      href="/"
      aria-label={`${site.name} home`}
      className={`group inline-flex items-center gap-3 ${className}`}
    >
      <LogoMark className="h-10 w-10 transition-transform duration-300 group-hover:rotate-[-6deg]" />
      {variant !== "mark" && (
        <span className="leading-[0.95]">
          <span className={`block font-display text-lg font-extrabold tracking-tightest ${wordTop}`}>
            Advanced
          </span>
          <span className={`block font-display text-[13px] font-semibold tracking-[0.02em] ${wordBot}`}>
            Gas &amp; Aircon
          </span>
        </span>
      )}
    </Link>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d="M110 18 L60 122 L160 122 Z" fill="#ED5C25" />
      <path d="M60 122 a50 50 0 1 0 100 0 Z" fill="#1AAEE6" />
      <path
        d="M110 80 a32 32 0 1 0 0 64 h22 v-32 h-22 v8 h12 v16 h-12 a24 24 0 1 1 0 -48 a24 24 0 0 1 22 14 l8 -4 a32 32 0 0 0 -30 -18 z"
        fill="#FFFFFF"
      />
      <circle cx="138" cy="158" r="9" fill="#E1373F" />
    </svg>
  );
}
