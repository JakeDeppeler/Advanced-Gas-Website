"use client";

import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

/**
 * Workshop location map for /find-us.
 *
 * Leaflet on OpenStreetMap, same as every other map on the site. Google
 * Maps would need an API key, a billing account and a key restriction to
 * stop it being scraped — for dropping one pin on one address, that's a
 * running cost and a liability for no gain.
 *
 * Zoomed close, because this map answers "which building" rather than
 * "how far away" — the coverage map on /service-areas already does the
 * second job.
 */
export function LeafletFindUsMap() {
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

      const here: [number, number] = [site.geo.lat, site.geo.lng];

      map = L.map(el, {
        center: here,
        zoom: 16,
        minZoom: 11,
        maxZoom: 19,
        scrollWheelZoom: false, // don't hijack the page scroll
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      L.circleMarker(here, {
        radius: 11,
        color: "#f36722",
        weight: 4,
        fillColor: "#fff",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(
          `${site.address.street}, ${site.address.suburb} ${site.address.postcode}`,
          { permanent: false, direction: "top" },
        );

      // Measure before framing — see LeafletCoverageMap. L.map() reads the
      // container at construction, which in a grid is often before the
      // final width resolves.
      const frame = () => {
        if (!map) return;
        map.invalidateSize({ animate: false });
        map.setView(here, 16, { animate: false });
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
  }, []);

  return (
    <div
      className="findus__map"
      ref={ref}
      role="img"
      aria-label={`Map showing our workshop at ${site.address.street}, ${site.address.suburb}`}
    />
  );
}
