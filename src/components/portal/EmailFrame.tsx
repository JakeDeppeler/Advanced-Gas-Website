"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * An email shown exactly as it arrives: its own HTML in a frame, so the
 * portal's styles can't dress it up and its styles can't leak out.
 *
 * Sandboxed with no scripts. Same-origin only so the frame can be sized to the
 * email rather than scrolling inside the page; links open in a new tab.
 */
export function EmailFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState<"wide" | "phone">("wide");
  const [height, setHeight] = useState(900);

  const doc = html.replace("<head>", '<head><base target="_blank">');

  const measure = useCallback(() => {
    const d = ref.current?.contentDocument;
    if (d?.documentElement) setHeight(d.documentElement.scrollHeight);
  }, []);

  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    let ro: ResizeObserver | null = null;
    const onLoad = () => {
      measure();
      const body = f.contentDocument?.body;
      if (body && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(measure);
        ro.observe(body);
      }
    };
    f.addEventListener("load", onLoad);
    return () => { f.removeEventListener("load", onLoad); ro?.disconnect(); };
  }, [measure, doc]);

  useEffect(() => { const t = setTimeout(measure, 60); return () => clearTimeout(t); }, [width, measure]);

  return (
    <div className="pt-mail">
      <div className="pt-mail__bar">
        <div className="pt-seg" role="group" aria-label="How wide">
          <button type="button" className={`pt-seg__b${width === "wide" ? " is-on" : ""}`} aria-pressed={width === "wide"} onClick={() => setWidth("wide")}>Computer</button>
          <button type="button" className={`pt-seg__b${width === "phone" ? " is-on" : ""}`} aria-pressed={width === "phone"} onClick={() => setWidth("phone")}>Phone</button>
        </div>
      </div>
      <div className={`pt-mail__stage is-${width}`}>
        <iframe
          ref={ref}
          title={title}
          srcDoc={doc}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          style={{ height }}
          className="pt-mail__frame"
        />
      </div>
    </div>
  );
}
