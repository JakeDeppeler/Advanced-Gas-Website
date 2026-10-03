"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** /portal/sops/x#slug → /portal/sops/x/slug, for links written before procedures had pages. */
export function SopHashRedirect({ base, slugs }: { base: string; slugs: string[] }) {
  const router = useRouter();
  useEffect(() => {
    const h = window.location.hash.replace(/^#/, "");
    if (h && slugs.includes(h)) router.replace(`${base}/${h}`);
  }, [base, slugs, router]);
  return null;
}
