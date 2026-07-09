"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Leaflet map centred on Pakenham (-38.078, 145.487) with a fixed 50 km
 * service radius. Position is locked (no drag, no keyboard pan, no touch
 * drag) but scroll-wheel zoom and the +/- buttons work, the radius circle
 * is drawn in Earth metres so it stays at 50 km at every zoom level.
 */
const PAKENHAM: [number, number] = [-38.078, 145.487];
const RADIUS_M = 50_000;

export function ServiceAreaMap() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el) return;

      map = L.map(el, {
        center: PAKENHAM,
        zoom: 9,
        minZoom: 8,
        maxZoom: 13,
        // Lock the pan, user can still zoom.
        dragging: false,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
        zoomControl: true,
        attributionControl: true,
      });

      // Also lock the visible bounds so the map can't scroll past the radius.
      map.setMaxBounds(L.latLng(PAKENHAM).toBounds(RADIUS_M * 3));

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      L.circle(PAKENHAM, {
        radius: RADIUS_M,
        color: "#f36722",
        weight: 2,
        dashArray: "6 6",
        fillColor: "#f36722",
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(map);

      L.circleMarker(PAKENHAM, {
        radius: 7,
        color: "#f36722",
        weight: 3,
        fillColor: "#fff",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);

      map.fitBounds(L.latLng(PAKENHAM).toBounds(RADIUS_M * 2.4), {
        padding: [8, 8],
        animate: false,
      });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, []);

  return (
    <div className="map__leaflet" ref={ref} role="img" aria-label="Service area map, 50 km radius from Pakenham" />
  );
}
