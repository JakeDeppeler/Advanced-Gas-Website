"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/app/portal/notifications/actions";

/** Clears the dot, not the list: a notice stays until the thing it's about is done. */
export function MarkRead() {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <button type="button" className="tr-btn tr-btn--sm" disabled={busy} onClick={() => start(async () => { await markAllRead(); router.refresh(); })}>
      {busy ? "…" : "Mark all read"}
    </button>
  );
}
