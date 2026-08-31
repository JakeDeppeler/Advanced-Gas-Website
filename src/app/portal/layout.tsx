import type { Metadata } from "next";
import "./portal.css";

export const metadata: Metadata = {
  title: "Team portal",
  // The portal is internal — never let it into the index.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
