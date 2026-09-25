import Image from "next/image";
import { CAPABILITY_TICKS } from "@/lib/commercialSite";

/**
 * The prequal, filling itself in.
 *
 * Six rows, each value fading in and its tick popping a beat behind, .55s
 * apart, and at 40% of the ten-second loop a "Ready to send" stamp lands on
 * the corner. It is the page's whole promise acted out: the thing
 * procurement is about to ask for is already assembled.
 *
 * Pure CSS on one 10s clock, which is what lets the reduced-motion block
 * stop it with every row filled and the stamp on — the finished document
 * rather than a blank form.
 */

export function CapabilityDoc() {
  return (
    <div className="cx-cdoc" aria-hidden="true">
      <div className="cx-cdoc__h">
        <Image src="/advanced-gas-logo.webp" alt="" width={140} height={28} />
        <span className="cx-mono">Capability · 2026</span>
      </div>
      {CAPABILITY_TICKS.map((r, i) => (
        <div className="cx-cdoc__r" key={r.k} style={{ ["--i" as string]: String(i) }}>
          <span>{r.k}</span>
          <b>{r.v}</b>
          <i />
        </div>
      ))}
      <div className="cx-cdoc__stamp">Ready to send</div>
    </div>
  );
}
