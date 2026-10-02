import type { Metadata } from "next";
import "./trade.css";

export const metadata: Metadata = {
  title: "Trade portal",
  // Internal, like the office portal — never let it into the index.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
