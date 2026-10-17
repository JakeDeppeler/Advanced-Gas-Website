import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./portal.css";
import "./shell.css";

export const metadata: Metadata = {
  title: "Team portal",
  // The portal is internal, so never let it into the index.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

// The portal's own face, after the Rapport dashboard it's modelled on: Inter,
// set at medium weights, which sits closer to Rapport than Inter Tight did.
// Only 400 to 600 are loaded, on purpose: the older pages ask for 800 and 900
// in a hundred places, and Rapport never goes past semi-bold, so capping the
// face brings every page's figures into line at once. The public site keeps
// its fonts.
const portalFont = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-portal", display: "swap" });

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className={portalFont.variable} style={{ display: "contents" }}>{children}</div>;
}
