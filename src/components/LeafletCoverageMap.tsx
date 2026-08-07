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

      // 50 km service radius, centred on Pakenham.
      L.circle([PAKENHAM[0], PAKENHAM[1]], {
        radius: RADIUS_M,
        color: "#f36722",
        weight: 2,
        dashArray: "6 6",
        fillColor: "#f36722",
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(map);

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

      // Frame the map around the 50 km circle, not just HQ.
      map.fitBounds(L.latLng(PAKENHAM[0], PAKENHAM[1]).toBounds(RADIUS_M * 2.2), {
        padding: [12, 12],
        animate: false,
      });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [highlight]);

  return (
    <div
      className="covmap__leaflet"
      ref={ref}
      role="img"
      aria-label={`Coverage map — every suburb we install in within 50 km of Pakenham${highlight ? `, with ${highlight} highlighted` : ""}`}
    />
  );
}
