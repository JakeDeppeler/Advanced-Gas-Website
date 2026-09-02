"use client";

import { useEffect, useRef } from "react";
import { publishedSuburbs } from "@/lib/suburbs";
import { PAKENHAM, RADIUS_KM, suburbCoords } from "@/lib/suburbCoords";

/**
 * Real Leaflet + OSM tile map showing every published suburb we install
 * in, plotted around our Pakenham HQ. Optional `highlight` slug renders
 * that suburb as a larger, brighter marker so the same component can
 * anchor both /service-areas (no highlight) and every /areas/[slug]
 * page (their own suburb highlighted).
 *
 * Client-only — Leaflet needs `window`. Rendered via next/dynamic with
 * ssr: false from the pages that use it so tiles/CSS never sit in the
 * initial critical path. Skeleton in the parent keeps layout stable.
 */
const RADIUS_M = RADIUS_KM * 1000;

export function LeafletCoverageMap({ highlight }: { highlight?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      const [L] = await Promise.all([
        import("leaflet").then((m) => m.default),
        import("leaflet/dist/leaflet.css" as string),
      ]);
      if (cancelled || !el) return;

      map = L.map(el, {
        center: [PAKENHAM[0], PAKENHAM[1]] as [number, number],
        zoom: 10,
        minZoom: 8,
        maxZoom: 14,
        dragging: false,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Distance rings at 25, 50 and 75 km. The outer one is the service
      // boundary and carries the fill; the inner two are gauges, so you
      // can see roughly how far out a suburb sits at a glance.
      for (const km of [25, 50, 75]) {
        const outer = km === 75;
        L.circle([PAKENHAM[0], PAKENHAM[1]], {
          radius: km * 1000,
          color: "#f36722",
          weight: outer ? 2.5 : 1.5,
          opacity: outer ? 0.95 : 0.5,
          dashArray: outer ? "8 6" : "4 6",
          fill: outer,
          fillColor: "#f36722",
          fillOpacity: outer ? 0.06 : 0,
          interactive: false,
        }).addTo(map!);

        // Label each ring on its northern edge so the scale is readable
        // without hovering anything.
        L.marker([PAKENHAM[0] + km / 111, PAKENHAM[1]], {
          icon: L.divIcon({
            className: "covmap__ringlbl",
            html: `<span>${km} km</span>`,
            iconSize: [46, 18],
            iconAnchor: [23, 9],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(map!);
      }

      // Pakenham HQ marker — orange, prominent.
      L.circleMarker([PAKENHAM[0], PAKENHAM[1]], {
        radius: 9,
        color: "#f36722",
        weight: 3,
        fillColor: "#fff",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Pakenham HQ · 3810", { permanent: false, direction: "top" });

      // A pin for every published suburb (excluding Pakenham itself,
      // which already has its HQ marker). Highlighted suburb (if any)
      // renders bigger and in orange so it stands out.
      publishedSuburbs
        .filter((s) => suburbCoords[s.slug] && s.slug !== "pakenham")
        .forEach((s) => {
          const coords = suburbCoords[s.slug];
          const isHi = s.slug === highlight;
          const marker = L.circleMarker([coords[0], coords[1]], {
            radius: isHi ? 9 : 5,
            color: isHi ? "#f36722" : "#050a30",
            weight: isHi ? 3 : 2,
            fillColor: isHi ? "#fff" : "#00b0ed",
            fillOpacity: 1,
          }).addTo(map!);
          marker.bindTooltip(`${s.name} · ${s.postcode}`, {
            permanent: isHi,
            direction: "top",
            offset: [0, isHi ? -10 : -6],
          });
          // Clicking a suburb pin navigates to its page.
          marker.on("click", () => {
            window.location.href = `/areas/${s.slug}`;
          });
        });

      // Frame the map on the 75 km ring, not just HQ.
      //
      // invalidateSize() FIRST. L.map() measures the container at
      // construction, and in a grid the final width often isn't resolved
      // yet — Leaflet then fits to a box smaller than the one you end up
      // looking at, and you get half of Victoria instead of the service
      // area. Re-measure, then fit.
      const frame = () => {
        if (!map) return;
        map.invalidateSize({ animate: false });
        map.fitBounds(L.latLng(PAKENHAM[0], PAKENHAM[1]).toBounds(RADIUS_M * 2.2), {
          padding: [16, 16],
          animate: false,
        });
      };
      requestAnimationFrame(frame);

      // And again whenever the container changes size — a sidebar
      // collapsing or an orientation change leaves Leaflet with a stale
      // measurement otherwise.
      ro = new ResizeObserver(() => frame());
      ro.observe(el);
    })();

    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
      if (map) map.remove();
    };
  }, [highlight]);

  return (
    <div
      className="covmap__leaflet"
      ref={ref}
      role="img"
      aria-label={`Coverage map, every suburb we install in within 75 km of Pakenham${highlight ? `, with ${highlight} highlighted` : ""}`}
    />
  );
}
