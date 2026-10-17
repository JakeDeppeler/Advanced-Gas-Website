"use client";

import { useState } from "react";
import { SKELETON } from "./ChromeMemo";

/**
 * The loading screen: the menu exactly as the last page drew it, with the
 * page area as an outline. On a first visit there is no menu to copy yet, so
 * it draws the outline on the wash alone.
 */
export function LoadingChrome() {
  // Read once, at mount: on the server and on a cold load there's nothing, and both draw the same.
  const [memo] = useState(() => (typeof window === "undefined" ? undefined : window.__ptChrome));
  if (memo) return <div className="ld-wrap" aria-busy="true" dangerouslySetInnerHTML={{ __html: memo.html }} />;
  return (
    <div className="pt pn ld-cold" aria-busy="true">
      <div className="pn-main">
        <main className="pt__content pn-content" dangerouslySetInnerHTML={{ __html: SKELETON }} />
      </div>
    </div>
  );
}
