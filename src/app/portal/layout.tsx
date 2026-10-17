import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./portal.css";
import "./shell.css";

export const metadata: Metadata = {
  title: "Team portal",
  // The portal is internal, so never let it into the index.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

// The portal's own face, after the Rapport dashboard it's modelled on: a
// tighter grotesque than the public site's Manrope, so the figures and the
// tables sit closer. The public site keeps its fonts.
const portalFont = Inter_Tight({ subsets: ["latin"], variable: "--font-portal", display: "swap" });

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className={portalFont.variable} style={{ display: "contents" }}>{children}</div>;
}
