"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/app/portal/notifications/actions";

export function MarkAllRead({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="pt-markread"
      disabled={disabled || pending}
      onClick={() => start(async () => { await markAllRead(); router.refresh(); })}
    >
      {pending ? "Marking…" : "Mark all read"}
    </button>
  );
}
