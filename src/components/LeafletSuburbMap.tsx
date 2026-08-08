"use client";

import { useEffect, useRef } from "react";
import { PAKENHAM, RADIUS_KM, suburbCoords } from "@/lib/suburbCoords";

/**
 * Real OpenStreetMap tile map for suburb pages.
 *
 * The suburb dot sits inside a 75 km circle centred on our Pakenham base,
 * so the customer sees both their suburb and how it fits inside our
 * service radius on a genuine street map — not an abstract circle.
 *
 * Client-only (Leaflet needs `window`), rendered via next/dynamic with
 * ssr: false from the suburb page. Same lazy-loading pattern as the
 * home-page ServiceAreaMap so tiles + CSS never sit in the initial
 * critical path.
 */
const RADIUS_M = RADIUS_KM * 1000;

export function LeafletSuburbMap({ slug, name }: { slug: string; name: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const coords = suburbCoords[slug];
    if (!coords) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const [L] = await Promise.all([
        import("leaflet").then((m) => m.default),
        import("leaflet/dist/leaflet.css" as string),
      ]);
      if (cancelled || !el) return;

      const suburbLatLng: [number, number] = [coords[0], coords[1]];
      const isBase = slug === "pakenham";

      map = L.map(el, {
        // Frame the view so BOTH the suburb dot and our Pakenham base are
        // comfortably visible — mid-point of the two, and let fitBounds
        // handle the zoom.
        center: isBase
          ? ([PAKENHAM[0], PAKENHAM[1]] as [number, number])
          : ([(suburbLatLng[0] + PAKENHAM[0]) / 2, (suburbLatLng[1] + PAKENHAM[1]) / 2] as [number, number]),
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

      // 75 km service-radius ring, centred on Pakenham.
      L.circle([PAKENHAM[0], PAKENHAM[1]], {
        radius: RADIUS_M,
        color: "#f36722",
        weight: 2,
        dashArray: "6 6",
        fillColor: "#f36722",
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(map);

      // Pakenham base pin (orange, prominent).
      L.circleMarker([PAKENHAM[0], PAKENHAM[1]], {
        radius: 8,
        color: "#f36722",
        weight: 3,
        fillColor: "#fff",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Pakenham HQ", { permanent: false, direction: "top" });

      // The suburb pin (navy, larger).
      if (!isBase) {
        L.circleMarker(suburbLatLng, {
          radius: 10,
          color: "#050a30",
          weight: 3,
          fillColor: "#00b0ed",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(name, { permanent: true, direction: "top", offset: [0, -8] });

        // Dashed line from HQ → suburb, so the drive-line is visible on the map.
        L.polyline([[PAKENHAM[0], PAKENHAM[1]], suburbLatLng], {
          color: "#050a30",
          weight: 1.5,
          dashArray: "6 4",
          opacity: 0.6,
          interactive: false,
        }).addTo(map);

        // Frame to include both points comfortably.
        const bounds = L.latLngBounds([[PAKENHAM[0], PAKENHAM[1]], suburbLatLng]).pad(0.35);
        map.fitBounds(bounds, { padding: [16, 16], animate: false });
      } else {
        map.fitBounds(L.latLng(PAKENHAM[0], PAKENHAM[1]).toBounds(RADIUS_M * 2.2), {
          padding: [8, 8],
          animate: false,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [slug, name]);

  return (
    <div
      className="submap__leaflet"
      ref={ref}
      role="img"
      aria-label={`Map showing ${name} within our 75 km service radius from Pakenham`}
    />
  );
}
