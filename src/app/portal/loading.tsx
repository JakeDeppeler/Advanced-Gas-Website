import { LoadingChrome } from "@/components/portal/shell/LoadingChrome";

/**
 * What a portal page looks like while the server is still working on it.
 *
 * Without this a click did nothing visible until the whole next page had been
 * rendered. It used to draw a stand-in of the old top bar, so every click
 * flashed the previous design; now it keeps the menu the last page drew and
 * outlines the page area in the new look.
 */
export default function PortalLoading() {
  return (
    <>
      <p className="pt-sr" role="status">Loading…</p>
      <LoadingChrome />
    </>
  );
}
