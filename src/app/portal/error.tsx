"use client";

import { useEffect, useState } from "react";
import { reloadOnceIfStale } from "@/lib/portal/reloadOnStale";

/**
 * Any portal page that throws lands here instead of Next's bare white
 * "Application error". A stale build reloads itself; anything else says so
 * and offers a retry, which is usually all a slow database needed.
 */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    if (reloadOnceIfStale(error)) setReloading(true);
  }, [error]);

  return (
    <div style={{ maxWidth: 520, margin: "12vh auto", padding: "0 16px", textAlign: "center" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>{reloading ? "Loading the latest version…" : "This page didn’t load"}</h1>
      {!reloading && (
        <>
          <p style={{ color: "var(--ink2, #555)", margin: "0 0 20px", lineHeight: 1.5 }}>
            Usually the database was slow to answer. Trying again normally works.
            {error.digest ? <><br /><span style={{ fontSize: 12 }}>Reference {error.digest}</span></> : null}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button type="button" className="pt-btn pt-btn--navy" onClick={() => reset()}>Try again</button>
            <button type="button" className="pt-btn pt-btn--ghost" onClick={() => window.location.reload()}>Reload the page</button>
          </div>
        </>
      )}
    </div>
  );
}
