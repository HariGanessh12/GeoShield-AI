"use client";

import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

type RiskRegion = {
  id: string;
  name: string;
  score: number;
  color: string;
  coordinates: [number, number][];
};

type GeoRiskMapProps = {
  regions: RiskRegion[];
  selectedRegionId?: string;
  onRegionSelect?: (region: RiskRegion) => void;
  compact?: boolean;
};

function getInitialBounds(regions: RiskRegion[]) {
  const points = regions.flatMap((region) => region.coordinates);
  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ] as [[number, number], [number, number]];
}

export default function GeoRiskMap({ regions, selectedRegionId, onRegionSelect, compact = false }: GeoRiskMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    let cancelled = false;

    async function bootMap() {
      if (!containerRef.current || mapRef.current) return;

      const leafletModule = await import("leaflet");
      const L = leafletModule.default ?? leafletModule;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerRef.current = layerGroup;

      map.fitBounds(getInitialBounds(regions), { padding: compact ? [24, 24] : [36, 36] });

      regions.forEach((region) => {
        const polygon = L.polygon(region.coordinates, {
          color: region.color,
          fillColor: region.color,
          fillOpacity: selectedRegionId === region.id ? 0.38 : 0.22,
          weight: selectedRegionId === region.id ? 4 : 2,
        });

        polygon.on("click", () => onRegionSelect?.(region));
        polygon.bindPopup(`<strong>${region.name}</strong><br />Risk score: ${region.score}`);
        polygon.addTo(layerGroup);
      });
    }

    void bootMap();

    return () => {
      cancelled = true;
      layerRef.current?.clearLayers?.();
      mapRef.current?.remove?.();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const layerGroup = layerRef.current;
    if (!mapRef.current || !layerGroup) return;
    layerGroup.clearLayers();

    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default ?? leafletModule;
      regions.forEach((region) => {
        const polygon = L.polygon(region.coordinates, {
          color: region.color,
          fillColor: region.color,
          fillOpacity: selectedRegionId === region.id ? 0.38 : 0.22,
          weight: selectedRegionId === region.id ? 4 : 2,
        });
        polygon.on("click", () => onRegionSelect?.(region));
        polygon.bindPopup(`<strong>${region.name}</strong><br />Risk score: ${region.score}`);
        polygon.addTo(layerGroup);
      });
    });
  }, [onRegionSelect, regions, selectedRegionId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return <div ref={containerRef} className="h-full w-full" aria-label="Interactive geospatial risk map" />;
}
