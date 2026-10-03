"use client";

import { useEffect, useRef } from "react";

export type HeatPlace = { suburb: string; count: number; lat: number; lng: number };

/**
 * The corridor, with the work drawn on it.
 *
 * Real tiles, because the alternative was blobs floating on a blank rectangle
 * that only looked like a map to somebody who already knew the shape of the
 * run. The one thing a map earns its place for is showing where the work is
 * relative to everywhere else, and that needs roads under it.
 *
 * Tiles are CARTO's light basemap rather than standard OpenStreetMap: this sits
 * under an orange heat layer, and a full-colour basemap fights it. It is loaded
 * at runtime by the browser on the wall, not baked in — and if it never
 * arrives, the heat and the labels still draw on the cream, so the page
 * degrades to what it was rather than to nothing.
 *
 * `map.remove()` on teardown, because this mounts and unmounts every two
 * minutes on a panel that runs for months.
 */
export function BoardSuburbMap({ places }: { places: HeatPlace[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = places.map((p) => `${p.suburb}:${p.count}`).join("|");

  useEffect(() => {
    const el = ref.current;
    if (!el || places.length === 0) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const [L] = await Promise.all([
        import("leaflet").then((m) => m.default),
        import("leaflet/dist/leaflet.css" as string),
      ]);
      if (cancelled || !el) return;

      // A wall panel has no pointer and no keyboard, so every interaction is
      // off: a map that can be dragged out of position by a cleaner's elbow and
      // left that way for a week is worse than no map.
      map = L.map(el, {
        zoomControl: false,
        attributionControl: true,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        // The board redraws on its own schedule; Leaflet's inertia and fade
        // animations only add work on a long-running kiosk.
        fadeAnimation: false,
        zoomAnimation: false,
      });

      // NEXT_PUBLIC_BOARD_TILES exists so the board can be rendered and looked
      // at from an environment with no route to a tile CDN. Unset everywhere
      // but a dev box, where it points at a local stand-in.
      const tiles = process.env.NEXT_PUBLIC_BOARD_TILES || "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      L.tileLayer(tiles, {
        attribution: "© OpenStreetMap · © CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      const max = Math.max(1, ...places.map((p) => p.count));
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));

      for (const p of places) {
        const t = p.count / max;
        // Area tracks the count, so the radius goes as its square root: four
        // times the jobs should look four times the place, not sixteen.
        L.circle([p.lat, p.lng], {
          radius: 1200 + Math.sqrt(t) * 4200,
          stroke: false,
          fillColor: "#f36722",
          fillOpacity: 0.16 + t * 0.4,
          interactive: false,
        }).addTo(map);
      }

      // Fit first, so labels can be laid out against where the suburbs
      // actually land on screen rather than against their latitudes.
      map.fitBounds(bounds, { padding: [70, 90], animate: false });

      /**
       * Lay the labels out so they don't sit on top of each other.
       *
       * Busiest first, because when two labels cannot both fit the one worth
       * keeping is the one with more work behind it. Each label tries its
       * preferred side, then the others; anything with nowhere to go keeps its
       * dot and loses its tag, which is honest — the suburb is still on the
       * map, it just has no room to be named.
       */
      type Box = { x: number; y: number; w: number; h: number };
      const hits = (a: Box, b: Box) =>
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

      const size = map.getSize();
      const taken: Box[] = [];
      const ordered = [...places].sort((a, b) => b.count - a.count);

      for (const p of ordered) {
        const pt = map.latLngToContainerPoint([p.lat, p.lng]);
        const label = `${p.suburb} ${p.count}`;
        // Measured against the rendered font below; this is the estimate used
        // to choose a side, and it only has to be close.
        const w = 26 + label.length * 8.6;
        const h = 26;
        const gap = 10;

        const tries: { dx: number; dy: number; side: "r" | "l" }[] = [
          { dx: gap, dy: -h / 2, side: "r" },
          { dx: -w - gap, dy: -h / 2, side: "l" },
          { dx: gap, dy: -h - gap, side: "r" },
          { dx: -w - gap, dy: -h - gap, side: "l" },
          { dx: gap, dy: gap, side: "r" },
          { dx: -w - gap, dy: gap, side: "l" },
          { dx: -w / 2, dy: -h - gap * 1.6, side: "r" },
          { dx: -w / 2, dy: gap * 1.6, side: "r" },
        ];

        let placed: { dx: number; dy: number; side: "r" | "l" } | null = null;
        for (const t of tries) {
          const box = { x: pt.x + t.dx, y: pt.y + t.dy, w, h };
          // Off the edge of the card is as bad as on top of a neighbour.
          if (box.x < 4 || box.y < 4 || box.x + box.w > size.x - 4 || box.y + box.h > size.y - 4) continue;
          if (taken.some((b) => hits(box, b))) continue;
          taken.push(box);
          placed = t;
          break;
        }

        const lead = p.count === max;
        const cls = `bmap__pin${lead ? " is-lead" : ""}${placed?.side === "l" ? " is-left" : ""}`;
        const tag = placed
          ? `<b>${escapeHtml(p.suburb)}</b><em>${p.count}</em>`
          : "";
        L.marker([p.lat, p.lng], {
          interactive: false,
          keyboard: false,
          // Above the heat, and the busiest above its neighbours.
          zIndexOffset: lead ? 1000 : p.count,
          icon: L.divIcon({
            className: "",
            html: `<span class="${cls}" style="--dx:${placed ? placed.dx : 0}px;--dy:${placed ? placed.dy : -11}px">${tag ? `<i></i>${tag}` : '<i class="bmap__bare"></i>'}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
        }).addTo(map);
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
      map = null;
    };
    // Rebuilt when the figures change, which on this board is every sync.
  }, [key, places]);

  return <div className="bmap" ref={ref} role="img" aria-label="Jobs by suburb across the service area" />;
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
