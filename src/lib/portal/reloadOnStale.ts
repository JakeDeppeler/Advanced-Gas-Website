/**
 * A tab left open across a deploy asks for the old build's code chunks, which
 * no longer exist, and Next shows a bare "Application error" (Jake, 11 Nov,
 * minutes after a deploy). A reload fetches the new build and is all it
 * needs. Done once per tab per minute, so a page that is genuinely broken
 * shows its error instead of reloading forever.
 */
export function isStaleBuild(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  const text = `${e?.name ?? ""} ${e?.message ?? ""}`;
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(text);
}

export function reloadOnceIfStale(error: unknown): boolean {
  if (typeof window === "undefined" || !isStaleBuild(error)) return false;
  const key = "ag-stale-reload";
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // No storage (private mode): still reload; the browser stops a true loop.
  }
  window.location.reload();
  return true;
}
