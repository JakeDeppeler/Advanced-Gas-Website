"use client";

import { useEffect, useRef } from "react";

/**
 * Leaflet map centred on Pakenham (-38.078, 145.487) with a fixed 75 km
 * service radius. Position is locked (no drag, no keyboard pan, no touch
 * drag) but scroll-wheel zoom and the +/- buttons work, the radius circle
 * is drawn in Earth metres so it stays at 75 km at every zoom level.
 */
const PAKENHAM: [number, number] = [-38.078, 145.487];
const RADIUS_M = 50_000;

/**
 * `view` decides what the map is arguing.
 *
 * "radius" is the residential frame: the circle fills the picture, because on
 * that side of the business 75 km is the limit and the page says so.
 *
 * "victoria" is the commercial one, added because the heading above it says
 * "on site anywhere in Victoria" and a map cropped to a 75 km circle said the
 * opposite. The circle is still drawn — it is where the vans are every day —
 * but the state is in the frame around it, so the picture and the sentence
 * agree.
 */
export function ServiceAreaMap({ view = "radius" }: { view?: "radius" | "victoria" } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      // Load Leaflet's JS and CSS lazily so neither sits in the home page's
      // initial critical path — the map is below the fold.
      const [L] = await Promise.all([
        import("leaflet").then((m) => m.default),
        import("leaflet/dist/leaflet.css" as string),
      ]);
      if (cancelled || !el) return;

      map = L.map(el, {
        center: PAKENHAM,
        zoom: view === "victoria" ? 6 : 9,
        minZoom: view === "victoria" ? 5 : 8,
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

      // Roughly the state, corner to corner, for the commercial frame.
      const VICTORIA = L.latLngBounds([-39.25, 140.8], [-33.9, 150.15]);

      // Lock the visible bounds so the map can't be scrolled off what it is
      // meant to be showing.
      map.setMaxBounds(view === "victoria" ? VICTORIA.pad(0.35) : L.latLng(PAKENHAM).toBounds(RADIUS_M * 3));

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

      const frame = () => {
        if (!map) return;
        // See LeafletCoverageMap — measure before you fit, or Leaflet
        // frames a container size that no longer exists.
        map.invalidateSize({ animate: false });
        map.fitBounds(view === "victoria" ? VICTORIA : L.latLng(PAKENHAM).toBounds(RADIUS_M * 2.4), {
          padding: [8, 8],
          animate: false,
        });
      };
      requestAnimationFrame(frame);
      ro = new ResizeObserver(() => frame());
      ro.observe(el);
    })();

    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
      if (map) map.remove();
    };
  }, [view]);

  return (
    <div
      className="map__leaflet"
      ref={ref}
      role="img"
      aria-label={
        view === "victoria"
          ? "Map of Victoria, with the 75 km daily service radius marked around Pakenham"
          : "Service area map, 75 km radius from Pakenham"
      }
    />
  );
}
