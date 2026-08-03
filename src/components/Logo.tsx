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
          <rect width="220" height="220" fill="#000" />
          <path d="M110 44 L68 124 L152 124 Z" fill="#fff" />
          <path d="M68 124 A42 42 0 1 0 152 124 Z" fill="#fff" />
          <path d="M110 68 L90 118 L130 118 Z" fill="#000" />
          <path d="M90 118 A20 20 0 1 0 130 118 Z" fill="#000" />
          <rect x="110" y="102" width="52" height="30" fill="#000" />
          <rect x="128" y="114" width="28" height="8" fill="#fff" />
        </mask>
      </defs>
      <path d="M110 22 L52 128 L168 128 Z" fill="#ED5C25" />
      <path d="M52 128 A58 58 0 1 0 168 128 Z" fill="#1AAEE6" />
      <rect width="220" height="220" fill="#fff" mask={`url(#${maskId})`} />
      <circle cx="140" cy="146" r="7.5" fill="#E1373F" />
    </svg>
  );
}
