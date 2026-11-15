import { permanentRedirect } from "next/navigation";

/** Folded into the Reclaim brand page and its product pages (Nov 2026); the old page is in git history. */
export default function Page() {
  permanentRedirect("/brands/reclaim");
}
