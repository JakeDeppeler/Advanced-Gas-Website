import Link from "next/link";
import type { ReactNode } from "react";
import { Empty } from "@/components/portal/kit/Kit";

/**
 * What a Profit & finance page says when it has nothing from Xero. Not
 * connected and didn't answer are different problems with different fixes,
 * so they say different things, and neither shows a zero.
 */
export function XeroOff({ state, what }: { state: "not-configured" | "not-connected" | "no-answer"; what: ReactNode }) {
  if (state === "no-answer") return <Empty>Xero didn’t answer for {what} just now. That isn’t the same as nothing, reload in a minute.</Empty>;
  return <Empty>Xero isn’t connected, so there’s no {what} to show. <Link href="/portal/finance">Connect it on the Overview ›</Link></Empty>;
}

/** "▲ $4,900" / "▼ $300" — a difference, with its direction as a sign as well as a colour. */
export function Diff({ d, lowerIsBetter }: { d: number; lowerIsBetter?: boolean }) {
  if (Math.abs(d) < 0.5) return <span style={{ color: "var(--ink3)" }}>same</span>;
  const worse = lowerIsBetter ? d > 0 : d < 0;
  return (
    <span style={{ color: worse ? "var(--bad)" : "var(--good)", fontWeight: 700, whiteSpace: "nowrap" }}>
      {/* The arrow says which way; a plus or minus beside it said it twice. */}
      {d > 0 ? "▲ " : "▼ "}${Math.round(Math.abs(d)).toLocaleString("en-AU")}
    </span>
  );
}
