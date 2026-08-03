import Link from "next/link";
import { useId } from "react";
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
  const maskId = `aga-g-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <mask id={maskId}>
          <rect width="220" height="220" fill="#fff" />
          <circle cx="110" cy="124" r="25" fill="#000" />
          <rect x="110" y="107" width="60" height="34" fill="#000" />
          <rect x="128" y="120" width="42" height="12" fill="#fff" />
        </mask>
      </defs>
      <path d="M110 20 L58 124 L162 124 Z" fill="#ED5C25" />
      <path d="M58 124 A52 52 0 1 0 162 124 Z" fill="#1AAEE6" />
      <circle cx="110" cy="124" r="42" fill="#fff" mask={`url(#${maskId})`} />
      <circle cx="141" cy="151" r="8" fill="#E1373F" />
    </svg>
  );
}
