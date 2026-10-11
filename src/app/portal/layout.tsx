import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./portal.css";
import "./neutral.css";

// For the neutral look only. Self-hosted by next/font, so nothing is fetched
// from Google at runtime and the face is there on the first paint.
const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Team portal",
  // The portal is internal — never let it into the index.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // display: contents, so the wrapper only carries the font variable and the
  // portal's own layout sees its children as before.
  return <div className={inter.variable} style={{ display: "contents" }}>{children}</div>;
}
