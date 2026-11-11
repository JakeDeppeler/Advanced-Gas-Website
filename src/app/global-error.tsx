"use client";

import { useEffect } from "react";
import { reloadOnceIfStale } from "@/lib/portal/reloadOnStale";

/**
 * The last resort, when the root layout itself fails: Next's default is a
 * white page with one line of grey text. A stale build after a deploy reloads
 * itself; anything else gets a way back.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reloadOnceIfStale(error);
  }, [error]);

  return (
    <html lang="en-AU">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f7", color: "#1d1d1f" }}>
        <div style={{ maxWidth: 520, margin: "15vh auto", padding: "0 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong loading this page</h1>
          <p style={{ color: "#555", margin: "0 0 20px", lineHeight: 1.5 }}>Reloading usually fixes it.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ font: "inherit", padding: "10px 18px", borderRadius: 999, border: 0, background: "#1d1d1f", color: "#fff", cursor: "pointer" }}>
            Reload the page
          </button>
        </div>
      </body>
    </html>
  );
}
