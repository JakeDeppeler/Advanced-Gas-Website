"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NUM = /\d[\d,]*(?:\.\d+)?/;
const SELECTOR = ".pn .pk-fig, .pn .pk-hf";
const MS = 1000;

/** The first text inside an element that holds a number. */
function numberNode(el: Element): Text | null {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (NUM.test(n.nodeValue ?? "")) return n as Text;
  return null;
}

/**
 * Counts the kit's big figures up from nothing when a page opens, as Home's
 * do, without every page having to hand its numbers to a component: it finds
 * them by class once the page is drawn and counts each to the figure that's
 * already there, keeping its format ($, K, M, %, decimals).
 *
 * The figure in the HTML is always the real one, so a screenshot, a slow
 * browser or reduced motion shows it as it is. If React redraws a figure
 * while it's counting, the count stops and React's figure stands.
 */
export function FigureCount() {
  const path = usePathname();
  const query = useSearchParams()?.toString();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const runs: { node: Text; final: string; before: string; after: string; to: number; dp: number; comma: boolean; last: string }[] = [];
    for (const el of document.querySelectorAll(SELECTOR)) {
      const node = numberNode(el);
      const text = node?.nodeValue ?? "";
      const m = text.match(NUM);
      if (!node || !m || m.index == null) continue;
      const to = Number(m[0].replace(/,/g, ""));
      if (!Number.isFinite(to) || to === 0) continue;
      runs.push({
        node, final: text, before: text.slice(0, m.index), after: text.slice(m.index + m[0].length), to,
        dp: m[0].split(".")[1]?.length ?? 0, comma: m[0].includes(","), last: text,
      });
    }
    if (!runs.length) return;
    const fmt = (r: (typeof runs)[number], v: number) => {
      const s = r.comma ? v.toLocaleString("en-AU", { minimumFractionDigits: r.dp, maximumFractionDigits: r.dp }) : v.toFixed(r.dp);
      return `${r.before}${s}${r.after}`;
    };
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const f = Math.min(1, (t - t0) / MS);
      const ease = 1 - Math.pow(1 - f, 3);
      let live = false;
      for (const r of runs) {
        if (r.node.nodeValue !== r.last) continue; // React has drawn it again: leave it.
        r.last = f < 1 ? fmt(r, r.to * ease) : r.final;
        r.node.nodeValue = r.last;
        live = true;
      }
      if (live && f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      for (const r of runs) if (r.node.nodeValue === r.last) r.node.nodeValue = r.final;
    };
  }, [path, query]);
  return null;
}
